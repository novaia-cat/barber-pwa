const N8N_BASE = 'https://n8n.novaia.cat';
const WEBHOOK_CHAT = N8N_BASE + '/webhook/barber-chat';
const WEBHOOK_CONFIG = N8N_BASE + '/webhook/barber-get-config';

function getBarberId() {
  const host = window.location.hostname;
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : 'barber';
}

const barberId = getBarberId();
let session = JSON.parse(localStorage.getItem('barber_session_' + barberId) || 'null');

// DOM
const chatMessages = document.getElementById('chat-messages');
const chatInput    = document.getElementById('chat-input');
const sendBtn      = document.getElementById('send-btn');
const registerModal = document.getElementById('register-modal');
const regNombre    = document.getElementById('reg-nombre');
const regApellido  = document.getElementById('reg-apellido');
const regTelefono  = document.getElementById('reg-telefono');
const regRgpd      = document.getElementById('reg-rgpd');
const regBtn       = document.getElementById('reg-btn');
const rgpdModal    = document.getElementById('rgpd-modal');
const rgpdLink     = document.getElementById('rgpd-link');
const rgpdCloseBtn = document.getElementById('rgpd-close-btn');
const barberName   = document.getElementById('barber-name');
const headerStatus = document.getElementById('header-status');
const logo         = document.getElementById('logo');
const novaiaBadge  = document.getElementById('novaia-badge');
const installBtn   = document.getElementById('install-btn');
const menuBtn      = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const menuUserName = document.getElementById('menu-user-name');
const menuUserPhone= document.getElementById('menu-user-phone');
const logoutBtn    = document.getElementById('logout-btn');

// ── RGPD modal ────────────────────────────────────────────────────────
rgpdLink.addEventListener('click', e => { e.preventDefault(); rgpdModal.classList.add('active'); });
rgpdCloseBtn.addEventListener('click', () => { rgpdModal.classList.remove('active'); regRgpd.checked = true; });

// ── PWA Install ───────────────────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  installBtn.style.display = 'none';
  deferredInstallPrompt = null;
});

// ── Header menu (logout + user info) ─────────────────────────────────
menuBtn.addEventListener('click', e => {
  e.stopPropagation();
  menuDropdown.classList.toggle('open');
});

document.addEventListener('click', e => {
  if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
    menuDropdown.classList.remove('open');
  }
});

logoutBtn.addEventListener('click', () => {
  if (confirm('Cerrar sesion?')) {
    localStorage.removeItem('barber_session_' + barberId);
    location.reload();
  }
});

function updateHeaderUser() {
  if (!session) return;
  const fullName = (session.nombre + ' ' + (session.apellido || '')).trim();
  headerStatus.textContent = 'Hola, ' + session.nombre;
  menuUserName.textContent = fullName;
  menuUserPhone.textContent = session.telefono;
}

// ── Keyboard / viewport fix ───────────────────────────────────────────
// Cuando el teclado virtual aparece en movil, ajusta la altura del app
// para que el footer siempre sea visible.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const vh = window.visualViewport.height;
    document.getElementById('app').style.height = vh + 'px';
    // Scroll al ultimo mensaje
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ── Config desde n8n ─────────────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch(WEBHOOK_CONFIG + '?barber_id=' + barberId);
    if (!res.ok) throw new Error('config error');
    const cfg = await res.json();
    applyConfig(cfg);
  } catch {
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
  const themeColor = document.querySelector('meta[name=theme-color]');
  if (themeColor && cfg.color_primary) themeColor.content = cfg.color_primary;
}

// ── Quick replies ─────────────────────────────────────────────────────
// El bot puede incluir al final de su respuesta:
// [QUICK_REPLIES: opcion1 | opcion2 | opcion3]
// La PWA extrae esas opciones, limpia el texto y renderiza botones.

function parseQuickReplies(text) {
  const match = text.match(/\[QUICK_REPLIES:\s*([^\]]+)\]/i);
  if (!match) return { text: text.trim(), replies: [] };
  const replies = match[1].split('|').map(s => s.trim()).filter(Boolean);
  const cleanText = text.replace(/\[QUICK_REPLIES:[^\]]*\]/i, '').trim();
  return { text: cleanText, replies };
}

function removeActiveQuickReplies() {
  document.querySelectorAll('.quick-replies').forEach(el => el.remove());
}

function renderQuickReplies(replies) {
  if (!replies.length) return;
  const container = document.createElement('div');
  container.className = 'quick-replies' + (replies.length <= 5 ? ' column' : '');
  replies.forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'qr-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      removeActiveQuickReplies();
      sendMessage(label);
    });
    container.appendChild(btn);
  });
  chatMessages.appendChild(container);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Markdown básico (negritas + saltos de línea) ──────────────────────
function markdownToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ── Burbujas ──────────────────────────────────────────────────────────
function addBubble(text, type) {
  const div = document.createElement('div');
  div.className = 'bubble ' + type;
  if (type === 'bot') {
    div.innerHTML = markdownToHtml(text);
  } else {
    div.textContent = text;
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function showTyping() {
  return addBubble('Escribiendo...', 'typing');
}

// ── Enviar mensaje a n8n ──────────────────────────────────────────────
async function sendMessage(text) {
  removeActiveQuickReplies();
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
        telefono:  session.telefono,
        nombre:    session.nombre,
        apellido:  session.apellido,
        mensaje:   text
      })
    });

    const data = await res.json();
    typing.remove();

    const rawText = data.respuesta || 'No entendi eso. Prueba con "reservar" o "ayuda".';
    const { text: cleanText, replies } = parseQuickReplies(rawText);
    addBubble(cleanText, 'bot');
    renderQuickReplies(replies);
  } catch {
    typing.remove();
    addBubble('Error de conexion. Intentalo de nuevo.', 'bot');
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ── Registro ──────────────────────────────────────────────────────────
function showRegisterModal() {
  registerModal.classList.add('active');
  regNombre.focus();
}

function hideRegisterModal() {
  registerModal.classList.remove('active');
}

regBtn.addEventListener('click', async () => {
  const nombre   = regNombre.value.trim();
  const apellido = regApellido.value.trim();
  const telefono = regTelefono.value.trim().replace(/\s/g, '');

  if (!nombre   || nombre.length < 2)          { regNombre.focus();   return; }
  if (!apellido || apellido.length < 2)         { regApellido.focus(); return; }
  if (!telefono.match(/^\d{9,15}$/))            { regTelefono.focus(); return; }
  if (!regRgpd.checked)                         { rgpdLink.click();    return; }

  regBtn.disabled = true;
  regBtn.textContent = 'Registrando...';

  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: barberId, telefono, nombre, apellido, mensaje: 'hola' })
    });
    const data = await res.json();

    session = { nombre, apellido, telefono };
    localStorage.setItem('barber_session_' + barberId, JSON.stringify(session));

    hideRegisterModal();
    enableChat();
    updateHeaderUser();

    const rawText = data.respuesta || ('Hola ' + nombre + ', en que puedo ayudarte?');
    const { text: cleanText, replies } = parseQuickReplies(rawText);
    addBubble(cleanText, 'bot');
    renderQuickReplies(replies.length ? replies : ['Reservar cita', 'Ver disponibilidad', 'Cancelar cita', 'Ver mis citas']);

    subscribePush();
  } catch {
    addBubble('Error al registrar. Intentalo de nuevo.', 'bot');
  } finally {
    regBtn.disabled = false;
    regBtn.textContent = 'Empezar';
  }
});

[regNombre, regApellido, regTelefono].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });
});

// ── Chat activo ───────────────────────────────────────────────────────
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

// ── Web Push ──────────────────────────────────────────────────────────
async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = 'VAPID_PUBLIC_KEY_PLACEHOLDER';
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id:   barberId,
        telefono:    session.telefono,
        nombre:      session.nombre,
        push_token:  JSON.stringify(sub),
        mensaje:     '__push_subscribe__'
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

// ── Service Worker ────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

// ── Init ──────────────────────────────────────────────────────────────
(async function init() {
  await loadConfig();

  if (session) {
    enableChat();
    updateHeaderUser();
    addBubble('Hola ' + session.nombre + ', en que puedo ayudarte?', 'bot');
    renderQuickReplies(['Reservar cita', 'Ver disponibilidad', 'Cancelar cita', 'Ver mis citas']);
  } else {
    showRegisterModal();
  }
})();
