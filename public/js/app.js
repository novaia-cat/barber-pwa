const N8N_BASE = 'https://n8n.novaia.cat';
const WEBHOOK_CHAT = N8N_BASE + '/webhook/barber-chat';
const WEBHOOK_CONFIG = N8N_BASE + '/webhook/barber-get-config';

// Extraer barber_id del hostname: barber.novaia.cat → "barber"
function getBarberId() {
  const host = window.location.hostname;
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : 'barber';
}

const barberId = getBarberId();

// Sesion en localStorage
let session = JSON.parse(localStorage.getItem('barber_session_' + barberId) || 'null');

// DOM
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const registerModal = document.getElementById('register-modal');
const regNombre = document.getElementById('reg-nombre');
const regTelefono = document.getElementById('reg-telefono');
const regBtn = document.getElementById('reg-btn');
const barberName = document.getElementById('barber-name');
const logo = document.getElementById('logo');
const novaiaBadge = document.getElementById('novaia-badge');

// --- Config desde n8n ---
async function loadConfig() {
  try {
    const res = await fetch(WEBHOOK_CONFIG + '?barber_id=' + barberId);
    if (!res.ok) throw new Error('config error');
    const cfg = await res.json();
    applyConfig(cfg);
  } catch {
    // Usa defaults de CSS si falla
    barberName.textContent = 'Barberia';
  }
}

function applyConfig(cfg) {
  if (cfg.nombre) barberName.textContent = cfg.nombre;
  if (cfg.logo_url) { logo.src = cfg.logo_url; logo.alt = cfg.nombre || 'Logo'; }
  if (cfg.color_primary) document.documentElement.style.setProperty('--color-primary', cfg.color_primary);
  if (cfg.color_secondary) {
    document.documentElement.style.setProperty('--color-secondary', cfg.color_secondary);
    document.documentElement.style.setProperty('--color-bubble-user', cfg.color_secondary);
  }
  if (cfg.novaia_badge) novaiaBadge.style.display = 'block';
  // Actualizar theme-color del meta
  const themeColor = document.querySelector('meta[name=theme-color]');
  if (themeColor && cfg.color_primary) themeColor.content = cfg.color_primary;
}

// --- Burbujas ---
function addBubble(text, type) {
  const div = document.createElement('div');
  div.className = 'bubble ' + type;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function showTyping() {
  return addBubble('Escribiendo...', 'typing');
}

// --- Enviar mensaje a n8n ---
async function sendMessage(text) {
  addBubble(text, 'user');
  chatInput.value = '';
  chatInput.disabled = true;
  sendBtn.disabled = true;

  const typing = showTyping();

  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barberId,
        telefono: session.telefono,
        nombre: session.nombre,
        mensaje: text
      })
    });

    const data = await res.json();
    typing.remove();
    addBubble(data.respuesta || 'No entendi eso. Prueba con "reservar" o "ayuda".', 'bot');
  } catch {
    typing.remove();
    addBubble('Error de conexion. Intentalo de nuevo.', 'bot');
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// --- Registro ---
function showRegisterModal() {
  registerModal.classList.add('active');
  regNombre.focus();
}

function hideRegisterModal() {
  registerModal.classList.remove('active');
}

regBtn.addEventListener('click', async () => {
  const nombre = regNombre.value.trim();
  const telefono = regTelefono.value.trim().replace(/\s/g, '');

  if (!nombre || nombre.length < 2) { regNombre.focus(); return; }
  if (!telefono.match(/^\d{9,15}$/)) { regTelefono.focus(); return; }

  regBtn.disabled = true;
  regBtn.textContent = 'Registrando...';

  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: barberId, telefono, nombre, mensaje: 'hola' })
    });
    const data = await res.json();

    session = { nombre, telefono };
    localStorage.setItem('barber_session_' + barberId, JSON.stringify(session));

    hideRegisterModal();
    enableChat();
    addBubble(data.respuesta || 'Hola ' + nombre + ', en que puedo ayudarte?', 'bot');
    subscribePush();
  } catch {
    addBubble('Error al registrar. Intentalo de nuevo.', 'bot');
  } finally {
    regBtn.disabled = false;
    regBtn.textContent = 'Empezar';
  }
});

// Enter en inputs del modal
[regNombre, regTelefono].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });
});

// --- Chat activo ---
function enableChat() {
  chatInput.disabled = false;
  sendBtn.disabled = false;
  chatInput.focus();
}

sendBtn.addEventListener('click', () => {
  const text = chatInput.value.trim();
  if (text) sendMessage(text);
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const text = chatInput.value.trim();
    if (text) sendMessage(text);
  }
});

// --- Web Push ---
async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    // VAPID public key — reemplazar con la real de .env cuando este lista
    const vapidKey = 'VAPID_PUBLIC_KEY_PLACEHOLDER';
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barberId,
        telefono: session.telefono,
        nombre: session.nombre,
        push_token: JSON.stringify(sub),
        mensaje: '__push_subscribe__'
      })
    });
  } catch (e) {
    console.warn('Push subscribe fallido:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

// --- Init ---
(async function init() {
  await loadConfig();

  if (session) {
    enableChat();
    addBubble('Hola ' + session.nombre + ', en que puedo ayudarte?', 'bot');
  } else {
    showRegisterModal();
  }
})();
