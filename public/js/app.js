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

// ── Header menu ───────────────────────────────────────────────────────
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
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const vh = window.visualViewport.height;
    document.getElementById('app').style.height = vh + 'px';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ── Config desde n8n ─────────────────────────────────────────────────
let servicesCache = [];

async function loadConfig() {
  try {
    const res = await fetch(WEBHOOK_CONFIG + '?barber_id=' + barberId);
    if (!res.ok) throw new Error('config error');
    const cfg = await res.json();
    applyConfig(cfg);
    if (cfg.servicios && cfg.servicios.length) servicesCache = cfg.servicios;
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

// ── Markdown básico ───────────────────────────────────────────────────
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

// ── Fechas (zona Europe/Madrid) ───────────────────────────────────────
function getDateISO(offsetDays) {
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' });
  const today = fmt.format(new Date());
  const d = new Date(today + 'T12:00:00');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(iso) {
  const [, m, d] = iso.split('-').map(Number);
  const date = new Date(iso + 'T12:00:00');
  const dias  = ['dom','lun','mar','mie','jue','vie','sab'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return dias[date.getDay()] + ' ' + d + ' de ' + meses[m - 1];
}

// ── Booking state machine ─────────────────────────────────────────────
// booking = null (idle) | { step, service, fecha, fechaDisplay, hora }
// steps: 'service' | 'date' | 'date_picker' | 'slots' | 'confirm'
let booking = null;

const INITIAL_REPLIES = ['Reservar cita', 'Cancelar cita', 'Ver mis citas'];

function serviceLabel(svc) {
  return svc.nombre + ' (' + svc.duracion_min + 'min - ' + svc.precio + 'EUR)';
}

function startBooking() {
  booking = { step: 'service' };
  const services = servicesCache.length
    ? servicesCache.map(serviceLabel)
    : ['Corte (30min - 15EUR)', 'Barba (20min - 10EUR)', 'Corte+Barba (45min - 22EUR)', 'Tinte (90min - 45EUR)'];
  addBubble('Que servicio quieres?', 'bot');
  renderQuickReplies(services);
}

function cancelBooking(msg) {
  booking = null;
  addBubble(msg || 'De acuerdo, empezamos de nuevo.', 'bot');
  renderQuickReplies(INITIAL_REPLIES);
}

async function handleBookingStep(text) {
  if (!booking) return false;

  // ── PASO 1: elegir servicio ──────────────────────────────────────────
  if (booking.step === 'service') {
    const svc = servicesCache.find(s => text.toLowerCase().includes(s.nombre.toLowerCase()))
      || servicesCache.find(s => serviceLabel(s) === text);
    if (!svc) return false; // texto libre no reconocido → AI Agent
    booking.service = svc;
    booking.step = 'date';
    addBubble('Para cuando?', 'bot');
    renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
    return true;
  }

  // ── PASO 2: elegir fecha ─────────────────────────────────────────────
  if (booking.step === 'date') {
    const dateMap = { 'Hoy': 0, 'Manana': 1, 'Pasado manana': 2 };
    if (text in dateMap) {
      const iso = getDateISO(dateMap[text]);
      booking.fecha = iso;
      booking.fechaDisplay = text.toLowerCase() + ' (' + formatDateDisplay(iso) + ')';
      booking.step = 'slots';
      await fetchAndShowSlots(iso);
      return true;
    }
    if (text === 'Otro dia') {
      booking.step = 'date_picker';
      // Generar los próximos 7 días (excluyendo hoy/mañana/pasado)
      const options = [];
      for (let i = 3; i <= 9; i++) {
        const iso = getDateISO(i);
        const date = new Date(iso + 'T12:00:00');
        if (date.getDay() === 0) continue; // sin domingos
        options.push({ iso, label: formatDateDisplay(iso) });
      }
      addBubble('Que dia te viene bien?', 'bot');
      renderQuickReplies(options.map(o => o.label));
      // Guardar el mapa para poder resolver el label al ISO
      booking.datePicker = options;
      return true;
    }
    return false;
  }

  // ── PASO 2b: selector de dias ────────────────────────────────────────
  if (booking.step === 'date_picker') {
    const option = (booking.datePicker || []).find(o => o.label === text);
    if (!option) return false;
    booking.fecha = option.iso;
    booking.fechaDisplay = option.label;
    booking.step = 'slots';
    await fetchAndShowSlots(option.iso);
    return true;
  }

  // ── PASO 3: elegir hora ──────────────────────────────────────────────
  if (booking.step === 'slots') {
    if (!/^\d{2}:\d{2}$/.test(text)) return false;
    booking.hora = text;
    booking.step = 'confirm';
    const msg = 'Confirmo: **' + booking.service.nombre + '** el ' + booking.fechaDisplay + ' a las **' + text + '**. Es correcto?';
    addBubble(msg, 'bot');
    renderQuickReplies(['Si, confirmar', 'No, cambiar algo']);
    return true;
  }

  // ── PASO 4: confirmar ────────────────────────────────────────────────
  if (booking.step === 'confirm') {
    if (text === 'Si, confirmar') {
      await executeBooking();
      return true;
    }
    if (text === 'No, cambiar algo') {
      cancelBooking('Sin problema, empezamos de nuevo.');
      return true;
    }
    return false;
  }

  return false;
}

async function fetchAndShowSlots(fecha) {
  const typing = showTyping();
  chatInput.disabled = true;
  sendBtn.disabled = true;
  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id:  barberId,
        telefono:   session.telefono,
        nombre:     session.nombre,
        apellido:   session.apellido,
        action:     'get_slots',
        mensaje:    ''
      })
    });
    const data = await res.json();
    typing.remove();

    const slotsDelDia = (data.slots || [])
      .filter(s => s.fecha === fecha)
      .map(s => s.hora);

    if (!slotsDelDia.length) {
      addBubble('No hay horas disponibles ese dia. Elige otro.', 'bot');
      booking.step = 'date';
      renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
    } else {
      addBubble('Horas disponibles:', 'bot');
      renderQuickReplies(slotsDelDia);
    }
  } catch {
    typing.remove();
    addBubble('Error al consultar disponibilidad. Intentalo de nuevo.', 'bot');
    booking.step = 'date';
    renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

async function executeBooking() {
  const typing = showTyping();
  chatInput.disabled = true;
  sendBtn.disabled = true;
  const svc  = booking.service;
  const fecha_hora = booking.fecha + 'T' + booking.hora + ':00';
  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id:   barberId,
        telefono:    session.telefono,
        nombre:      session.nombre,
        apellido:    session.apellido,
        action:      'book',
        servicio_id: svc.id,
        fecha_hora:  fecha_hora,
        mensaje:     ''
      })
    });
    const data = await res.json();
    typing.remove();
    booking = null;
    addBubble(data.respuesta || 'Cita reservada! Hasta pronto.', 'bot');
    renderQuickReplies(INITIAL_REPLIES);
  } catch {
    typing.remove();
    addBubble('Error al reservar. Intentalo de nuevo.', 'bot');
    renderQuickReplies(['Si, confirmar', 'No, cambiar algo']);
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

// ── Enviar mensaje ────────────────────────────────────────────────────
async function sendMessage(text) {
  removeActiveQuickReplies();
  addBubble(text, 'user');
  chatInput.value = '';

  // Opciones del menú principal — gestionadas por la PWA
  if (text === 'Reservar cita') {
    startBooking();
    return;
  }
  if (text === 'Cancelar cita') {
    addBubble('La cancelacion aun no esta disponible online. Por favor, llama al local.', 'bot');
    renderQuickReplies(INITIAL_REPLIES);
    return;
  }
  if (text === 'Ver mis citas') {
    addBubble('La consulta de citas propias estara disponible pronto.', 'bot');
    renderQuickReplies(INITIAL_REPLIES);
    return;
  }

  // Flujo de reserva guiado — gestionado por la PWA
  if (booking) {
    const handled = await handleBookingStep(text);
    if (handled) return;
    // Texto no reconocido en el flujo → salir y dejar al AI Agent
    booking = null;
  }

  // Texto libre → AI Agent
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

    const rawText = data.respuesta || data.output || 'No entendi eso. Prueba con "reservar" o "ayuda".';
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
    await res.json();

    session = { nombre, apellido, telefono };
    localStorage.setItem('barber_session_' + barberId, JSON.stringify(session));

    hideRegisterModal();
    enableChat();
    updateHeaderUser();

    addBubble('Hola ' + nombre + ', en que puedo ayudarte?', 'bot');
    renderQuickReplies(INITIAL_REPLIES);

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
    renderQuickReplies(INITIAL_REPLIES);
  } else {
    showRegisterModal();
  }
})();
