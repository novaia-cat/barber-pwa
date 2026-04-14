// Supabase Edge Function: send-push
// Recibe { subscriptions[], title, body, url?, icon? }
// Firma VAPID y envía Web Push a cada endpoint.
//
// Deploy: supabase functions deploy send-push --project-ref cynnuucihcniqusomgol
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as base64url from 'https://deno.land/std@0.168.0/encoding/base64url.ts';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hola@novaia.cat';

// ── VAPID helpers ─────────────────────────────────────────────────

function b64urlToUint8(b64: string): Uint8Array {
  return base64url.decode(b64);
}

async function importPrivateKey(rawB64: string): Promise<CryptoKey> {
  const raw = b64urlToUint8(rawB64);
  // PKCS8 wrapper for P-256 private key
  const header = new Uint8Array([
    0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,
    0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,
    0x02,0x01,0x01,0x04,0x20
  ]);
  const pkcs8 = new Uint8Array(header.length + raw.length);
  pkcs8.set(header);
  pkcs8.set(raw, header.length);
  return crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
}

async function buildVapidHeader(endpoint: string): Promise<string> {
  const url    = new URL(endpoint);
  const origin = `${url.protocol}//${url.host}`;
  const now    = Math.floor(Date.now() / 1000);
  const exp    = now + 12 * 3600;

  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: origin, exp, sub: VAPID_SUBJECT };

  const enc = (obj: object) =>
    base64url.encode(new TextEncoder().encode(JSON.stringify(obj)));

  const unsigned = `${enc(header)}.${enc(payload)}`;
  const key = await importPrivateKey(VAPID_PRIVATE_KEY);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${base64url.encode(new Uint8Array(sig))}`;
  return `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;
}

// ── Web Push encryption (RFC 8291 / aes128gcm) ───────────────────

async function encryptPayload(
  p256dh: string,
  auth: string,
  payload: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPubRaw = b64urlToUint8(p256dh);
  const authSecret   = b64urlToUint8(auth);
  const plaintext    = new TextEncoder().encode(payload);

  // Generate ephemeral server key pair
  const serverKey = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKey.publicKey)
  );

  // Import client public key
  const clientPub = await crypto.subtle.importKey(
    'raw', clientPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub }, serverKey.privateKey, 256
  );

  // HKDF PRK via HMAC-SHA-256
  const hkdf = async (salt: ArrayBuffer, ikm: ArrayBuffer, info: Uint8Array, len: number) => {
    const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const prk  = await crypto.subtle.sign('HMAC', key, salt);
    const prkK = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const infoBlock = new Uint8Array([...info, 0x01]);
    const okm = await crypto.subtle.sign('HMAC', prkK, infoBlock);
    return new Uint8Array(okm).slice(0, len);
  };

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\x00'),
    ...clientPubRaw, ...serverPubRaw
  ]);
  const prk = await hkdf(authSecret, new Uint8Array(sharedBits), keyInfo, 32);

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const cek = await hkdf(salt, prk, cekInfo, 16);

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  const cryptoKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // Padding: 2 bytes length + 0 bytes pad + plaintext
  const padded = new Uint8Array(2 + plaintext.length);
  padded[0] = 0; padded[1] = 0;
  padded.set(plaintext, 2);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cryptoKey, padded)
  );

  return { ciphertext, salt, serverPublicKey: serverPubRaw };
}

function buildBody(ciphertext: Uint8Array, salt: Uint8Array, serverPub: Uint8Array): Uint8Array {
  // aes128gcm content-encoding header (RFC 8188)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPub.length);
  header.set(salt, 0);
  // rs as big-endian uint32
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >>  8) & 0xff;
  header[19] =  rs        & 0xff;
  header[20] = serverPub.length;
  header.set(serverPub, 21);
  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header);
  body.set(ciphertext, header.length);
  return body;
}

// ── Main handler ─────────────────────────────────────────────────

interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushRequest {
  subscriptions: Subscription[];
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let data: PushRequest;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { subscriptions, title, body, url = '/', icon = '/icons/icon-192.png' } = data;
  if (!subscriptions?.length || !title) {
    return new Response(JSON.stringify({ error: 'subscriptions[] and title required' }), { status: 400 });
  }

  const payload = JSON.stringify({ title, body, url, icon });
  let ok = 0, err = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      const { ciphertext, salt, serverPublicKey } = await encryptPayload(sub.p256dh, sub.auth, payload);
      const bodyBytes = buildBody(ciphertext, salt, serverPublicKey);
      const authHeader = await buildVapidHeader(sub.endpoint);

      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'TTL': '86400',
        },
        body: bodyBytes,
      });

      if (res.status >= 400) {
        err++;
        errors.push(`${res.status} ${sub.endpoint.slice(0, 60)}`);
      } else {
        ok++;
      }
    } catch (e) {
      err++;
      errors.push(String(e).slice(0, 100));
    }
  }

  return new Response(JSON.stringify({ ok, err, errors }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
});
