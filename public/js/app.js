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

// DOM refs
const chatMessages  = document.getElementById('chat-messages');
const chatInput     = document.getElementById('chat-input');
const sendBtn       = document.getElementById('send-btn');
const registerModal = document.getElementById('register-modal');
const regNombre     = document.getElementById('reg-nombre');
const regApellido   = document.getElementById('reg-apellido');
const regTelefono   = document.getElementById('reg-telefono');
const regRgpd       = document.getElementById('reg-rgpd');
const regBtn        = document.getElementById('reg-btn');
const rgpdModal     = document.getElementById('rgpd-modal');
const rgpdLink      = document.getElementById('rgpd-link');
const rgpdCloseBtn  = document.getElementById('rgpd-close-btn');
const barberName    = document.getElementById('barber-name');
const barberNameHdr = document.getElementById('barber-name-header');
const headerStatus  = document.getElementById('header-status');
const logo          = document.getElementById('logo');
const novaiaBadge   = document.getElementById('novaia-badge');
const installBtn    = document.getElementById('install-btn');
const menuBtn       = document.getElementById('menu-btn');
const menuDropdown  = document.getElementById('menu-dropdown');
const menuUserName  = document.getElementById('menu-user-name');
const menuUserPhone = document.getElementById('menu-user-phone');
const logoutBtn     = document.getElementById('logout-btn');
const aboutBtn      = document.getElementById('about-btn');
const aboutModal    = document.getElementById('about-modal');
const aboutCloseBtn = document.getElementById('about-close-btn');
const viewLanding   = document.getElementById('view-landing');
const viewChat      = document.getElementById('view-chat');
const backBtn       = document.getElementById('back-btn');
const headerTitle   = document.getElementById('header-title');
const servicesList  = document.getElementById('services-list');
const misCitasBtn   = document.getElementById('mis-citas-btn');

// ── Vista switching ───────────────────────────────────────────────
function showLandingView() {
  viewLanding.style.display = 'flex';
  viewChat.classList.remove('active');
  backBtn.style.display = 'none';
  headerTitle.style.display = 'none';
  booking = null;
}

function showChatView(title) {
  viewLanding.style.display = 'none';
  viewChat.classList.add('active');
  backBtn.style.display = 'flex';
  headerTitle.style.display = 'block';
  if (title) barberNameHdr.textContent = title;
  clearChat();
}

function clearChat() {
  chatMessages.innerHTML = '';
}

// ── Back button ───────────────────────────────────────────────────
backBtn.addEventListener('click', handleBack);

function handleBack() {
  if (!booking) {
    showLandingView();
    return;
  }
  switch (booking.step) {
    case 'date':
    case 'date_picker':
      showLandingView();
      break;
    case 'slots': {
      booking.step = 'date';
      clearChat();
      addBubble('Para cuando quieres la cita?', 'bot');
      renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
      break;
    }
    case 'confirm': {
      booking.step = 'slots';
      clearChat();
      if (booking.cachedSlots && booking.cachedSlots.length) {
        addBubble('Horas disponibles para ' + booking.fechaDisplay + ':', 'bot');
        renderQuickReplies(booking.cachedSlots);
      } else {
        fetchAndShowSlots(booking.fecha);
      }
      break;
    }
    default:
      showLandingView();
  }
}

// ── RGPD modal ────────────────────────────────────────────────────
rgpdLink.addEventListener('click', e => { e.preventDefault(); rgpdModal.classList.add('active'); });
rgpdCloseBtn.addEventListener('click', () => { rgpdModal.classList.remove('active'); regRgpd.checked = true; });

// ── PWA Install ───────────────────────────────────────────────────
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

// ── Header menu ───────────────────────────────────────────────────
menuBtn.addEventListener('click', e => {
  e.stopPropagation();
  menuDropdown.classList.toggle('open');
});

document.addEventListener('click', e => {
  if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
    menuDropdown.classList.remove('open');
  }
});

aboutBtn.addEventListener('click', () => {
  menuDropdown.classList.remove('open');
  aboutModal.classList.add('active');
});

aboutCloseBtn.addEventListener('click', () => { aboutModal.classList.remove('active'); });

logoutBtn.addEventListener('click', () => {
  if (confirm('Cerrar sesion?')) {
    localStorage.removeItem('barber_session_' + barberId);
    location.reload();
  }
});

function updateHeaderUser() {
  if (!session) return;
  const fullName = (session.nombre + ' ' + (session.apellido || '')).trim();
  menuUserName.textContent = fullName;
  menuUserPhone.textContent = session.telefono;
}

// ── Keyboard / viewport fix ───────────────────────────────────────
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const vh = window.visualViewport.height;
    document.getElementById('app').style.height = vh + 'px';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ── Config desde n8n ─────────────────────────────────────────────
let servicesCache = [];
let barberNameText = 'Barberia';

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
  if (cfg.nombre) {
    barberName.textContent = cfg.nombre;
    barberNameHdr.textContent = cfg.nombre;
    barberNameText = cfg.nombre;
  }
  if (cfg.logo_url) {
    logo.alt = cfg.nombre || 'Logo';
    logo.onload  = () => { logo.style.display = 'block'; };
    logo.onerror = () => { logo.style.display = 'none'; };
    logo.src = cfg.logo_url;
  }
  if (cfg.color_primary) document.documentElement.style.setProperty('--color-primary', cfg.color_primary);
  if (cfg.color_secondary) {
    document.documentElement.style.setProperty('--color-secondary', cfg.color_secondary);
    document.documentElement.style.setProperty('--color-bubble-user', cfg.color_secondary);
  }
  if (cfg.novaia_badge) novaiaBadge.style.display = 'block';
  const themeColor = document.querySelector('meta[name=theme-color]');
  if (themeColor && cfg.color_primary) themeColor.content = cfg.color_primary;
}

// ── Service cards (landing) ───────────────────────────────────────
const SERVICE_ICONS = {
  default: '✂️',
  corte: '✂️',
  barba: '🪒',
  tinte: '🎨',
  color: '🎨',
};

function getServiceIcon(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('barba')) return SERVICE_ICONS.barba;
  if (n.includes('tinte') || n.includes('color')) return SERVICE_ICONS.color;
  return SERVICE_ICONS.corte;
}

function renderServiceCards() {
  servicesList.innerHTML = '';
  const services = servicesCache.length
    ? servicesCache
    : [
        { id: 'SRV001', nombre: 'Corte',        duracion_min: 30, precio: 15 },
        { id: 'SRV002', nombre: 'Barba',         duracion_min: 20, precio: 10 },
        { id: 'SRV003', nombre: 'Corte + Barba', duracion_min: 45, precio: 22 },
        { id: 'SRV004', nombre: 'Tinte',         duracion_min: 90, precio: 45 },
      ];

  services.forEach(svc => {
    const card = document.createElement('div');
    card.className = 'service-card';

    const icon = document.createElement('div');
    icon.className = 'service-icon';
    icon.textContent = getServiceIcon(svc.nombre);

    const info = document.createElement('div');
    info.className = 'service-info';

    const name = document.createElement('div');
    name.className = 'service-name';
    name.textContent = svc.nombre;

    const meta = document.createElement('div');
    meta.className = 'service-meta';
    meta.textContent = svc.duracion_min + ' min';

    info.appendChild(name);
    info.appendChild(meta);

    const price = document.createElement('div');
    price.className = 'service-price';
    price.textContent = svc.precio + '€';

    const btn = document.createElement('button');
    btn.className = 'service-book-btn';
    btn.textContent = 'Reservar';
    btn.addEventListener('click', () => startBookingWithService(svc));

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(price);
    card.appendChild(btn);
    servicesList.appendChild(card);
  });
}

// ── Mis citas (desde landing) ─────────────────────────────────────
misCitasBtn.addEventListener('click', async () => {
  showChatView(barberNameText);
  enableChat();
  await fetchMyCitas();
});

// ── Quick replies ─────────────────────────────────────────────────
function parseQuickReplies(text) {
  const match = text.match(/\[QUICK_REPLIES:\s*([^\]]+)\]/i);
  if (!match) return { text: text.trim(), replies: [] };
  const replies = match[1].split('|').map(s => s.trim()).filter(Boolean);
  const cleanText = text.replace(/\[QUICK_REPLIES:[^\]]*\]/i, '').trim();
  return { text: cleanText, replies };
}

function removeActiveQuickReplies() {
  document.querySelectorAll('.quick-replies, .citas-list, .booking-summary').forEach(el => el.remove());
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

// ── Markdown básico ───────────────────────────────────────────────
function markdownToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ── Burbujas ──────────────────────────────────────────────────────
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

// ── Fechas (zona Europe/Madrid) ───────────────────────────────────
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

// ── Booking state machine ─────────────────────────────────────────
// booking = null | { step, service, fecha, fechaDisplay, hora, cachedSlots, datePicker }
// steps: 'date' | 'date_picker' | 'slots' | 'confirm'
let booking = null;

function startBookingWithService(svc) {
  showChatView(barberNameText);
  enableChat();
  booking = { step: 'date', service: svc };
  addBubble('Has elegido **' + svc.nombre + '**. Para cuando quieres la cita?', 'bot');
  renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
}

async function handleBookingStep(text) {
  if (!booking) return false;

  // ── PASO 1: elegir fecha ─────────────────────────────────────────
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
      const options = [];
      for (let i = 3; i <= 9; i++) {
        const iso = getDateISO(i);
        const date = new Date(iso + 'T12:00:00');
        if (date.getDay() === 0) continue;
        options.push({ iso, label: formatDateDisplay(iso) });
      }
      addBubble('Que dia te viene bien?', 'bot');
      renderQuickReplies(options.map(o => o.label));
      booking.datePicker = options;
      return true;
    }
    return false;
  }

  // ── PASO 1b: selector de dias ────────────────────────────────────
  if (booking.step === 'date_picker') {
    const option = (booking.datePicker || []).find(o => o.label === text);
    if (!option) return false;
    booking.fecha = option.iso;
    booking.fechaDisplay = option.label;
    booking.step = 'slots';
    await fetchAndShowSlots(option.iso);
    return true;
  }

  // ── PASO 2: elegir hora ──────────────────────────────────────────
  if (booking.step === 'slots') {
    if (!/^\d{2}:\d{2}$/.test(text)) return false;
    booking.hora = text;
    booking.step = 'confirm';
    showBookingSummary();
    return true;
  }

  // ── PASO 3: confirmar ────────────────────────────────────────────
  if (booking.step === 'confirm') {
    if (text === 'Confirmar') {
      await executeBooking();
      return true;
    }
    if (text === 'Cambiar algo') {
      handleBack();
      return true;
    }
    return false;
  }

  return false;
}

function showBookingSummary() {
  const svc = booking.service;

  const summary = document.createElement('div');
  summary.className = 'booking-summary';

  function row(label, value, cls) {
    const r = document.createElement('div');
    r.className = 'summary-row';
    const l = document.createElement('span');
    l.className = 'summary-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = cls || 'summary-value';
    v.textContent = value;
    r.appendChild(l);
    r.appendChild(v);
    return r;
  }

  summary.appendChild(row('Servicio', svc.nombre));
  summary.appendChild(row('Fecha', booking.fechaDisplay));
  summary.appendChild(row('Hora', booking.hora));
  summary.appendChild(row('Duracion', svc.duracion_min + ' min'));
  summary.appendChild(row('Precio', svc.precio + '€', 'summary-price'));

  chatMessages.appendChild(summary);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  renderQuickReplies(['Confirmar', 'Cambiar algo']);
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
        barber_id: barberId,
        telefono:  session.telefono,
        nombre:    session.nombre,
        apellido:  session.apellido,
        action:    'get_slots',
        mensaje:   ''
      })
    });
    const data = await res.json();
    typing.remove();

    const slotsDelDia = (data.slots || [])
      .filter(s => s.fecha === fecha)
      .map(s => s.hora);

    booking.cachedSlots = slotsDelDia;

    if (!slotsDelDia.length) {
      addBubble('No hay horas disponibles ese dia. Elige otro.', 'bot');
      booking.step = 'date';
      renderQuickReplies(['Hoy', 'Manana', 'Pasado manana', 'Otro dia']);
    } else {
      addBubble('Horas disponibles para ' + booking.fechaDisplay + ':', 'bot');
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
  const svc = booking.service;
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

    addBubble(data.respuesta || 'Cita reservada! Hasta pronto.', 'bot');

    // Breve pausa y vuelve a la landing
    setTimeout(() => showLandingView(), 2800);
  } catch {
    typing.remove();
    addBubble('Error al reservar. Intentalo de nuevo.', 'bot');
    renderQuickReplies(['Confirmar', 'Cambiar algo']);
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

// ── Ver mis citas ─────────────────────────────────────────────────
async function fetchMyCitas() {
  const typing = showTyping();
  chatInput.disabled = true;
  sendBtn.disabled = true;
  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barberId,
        telefono:  session.telefono,
        nombre:    session.nombre,
        apellido:  session.apellido,
        action:    'my_appointments',
        mensaje:   ''
      })
    });
    const data = await res.json();
    typing.remove();

    if (data.citas && data.citas.length) {
      addBubble('Tus proximas citas:', 'bot');
      renderCitasWithCancel(data.citas);
    } else {
      addBubble('No tienes citas proximas.', 'bot');
      renderCitasBackBtn();
    }
  } catch {
    typing.remove();
    addBubble('Error de conexion. Intentalo de nuevo.', 'bot');
    renderCitasBackBtn();
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

function parseCitaDisplay(display) {
  // display format: "Corte — lun 7 de abril a las 10:00"
  const parts = display.split(' — ');
  return { servicio: parts[0] || display, fecha: parts[1] || '' };
}

function renderCitasWithCancel(citas) {
  const container = document.createElement('div');
  container.className = 'citas-list';

  citas.forEach(cita => {
    const { servicio, fecha } = parseCitaDisplay(cita.display);

    const card = document.createElement('div');
    card.className = 'cita-card';

    const info = document.createElement('div');
    info.className = 'cita-info';

    const svcEl = document.createElement('div');
    svcEl.className = 'cita-servicio';
    svcEl.textContent = servicio;

    const fechaEl = document.createElement('div');
    fechaEl.className = 'cita-fecha';
    fechaEl.textContent = fecha || cita.display;

    info.appendChild(svcEl);
    info.appendChild(fechaEl);

    const btn = document.createElement('button');
    btn.className = 'cancel-cita-btn';
    btn.textContent = 'Cancelar';
    btn.addEventListener('click', () => {
      container.remove();
      cancelCita(cita.id, cita.display);
    });

    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
  });

  const backBtn = document.createElement('button');
  backBtn.className = 'citas-back-btn';
  backBtn.textContent = 'Ver opciones';
  backBtn.addEventListener('click', () => {
    container.remove();
    showLandingView();
  });
  container.appendChild(backBtn);

  chatMessages.appendChild(container);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderCitasBackBtn() {
  const btn = document.createElement('button');
  btn.className = 'citas-back-btn';
  btn.textContent = 'Ver opciones';
  btn.addEventListener('click', () => {
    btn.remove();
    showLandingView();
  });
  chatMessages.appendChild(btn);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function cancelCita(citaId, display) {
  if (!confirm('Cancelar ' + display + '?')) {
    addBubble('De acuerdo, no se cancela nada.', 'bot');
    renderCitasBackBtn();
    return;
  }
  addBubble('Cancelando tu cita...', 'bot');
  chatInput.disabled = true;
  sendBtn.disabled = true;
  try {
    const res = await fetch(WEBHOOK_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barberId,
        telefono:  session.telefono,
        nombre:    session.nombre,
        apellido:  session.apellido,
        action:    'cancel_appointment',
        cita_id:   citaId,
        mensaje:   ''
      })
    });
    const data = await res.json();
    addBubble(data.respuesta || 'Cita cancelada.', 'bot');
    renderCitasBackBtn();
  } catch {
    addBubble('Error al cancelar. Intentalo de nuevo.', 'bot');
    renderCitasBackBtn();
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }
}

// ── Enviar mensaje (texto libre → AI Agent) ───────────────────────
async function sendMessage(text) {
  removeActiveQuickReplies();
  addBubble(text, 'user');
  chatInput.value = '';

  // Flujo de reserva guiado
  if (booking) {
    const handled = await handleBookingStep(text);
    if (handled) return;
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

    const rawText = data.respuesta || data.output || 'No entendi eso.';
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

// ── Registro ──────────────────────────────────────────────────────
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

  if (!nombre   || nombre.length < 2)    { regNombre.focus();   return; }
  if (!apellido || apellido.length < 2)  { regApellido.focus(); return; }
  if (!telefono.match(/^\d{9,15}$/))     { regTelefono.focus(); return; }
  if (!regRgpd.checked)                  { rgpdLink.click();    return; }

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
    updateHeaderUser();
    renderServiceCards();
  } catch {
    // silently fail, user can retry
  } finally {
    regBtn.disabled = false;
    regBtn.textContent = 'Empezar';
  }
});

[regNombre, regApellido, regTelefono].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });
});

// ── Chat activo ───────────────────────────────────────────────────
function enableChat() {
  chatInput.disabled = false;
  sendBtn.disabled = false;
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

// ── Web Push ──────────────────────────────────────────────────────
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
        barber_id:  barberId,
        telefono:   session.telefono,
        nombre:     session.nombre,
        push_token: JSON.stringify(sub),
        mensaje:    '__push_subscribe__'
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

// ── Service Worker + auto-update ──────────────────────────────────
if ('serviceWorker' in navigator) {
  const updateBanner = document.getElementById('update-banner');
  const updateBtn    = document.getElementById('update-btn');
  let pendingSW = null;

  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    reg.onupdatefound = () => {
      const sw = reg.installing;
      sw.onstatechange = () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          pendingSW = sw;
          updateBanner.classList.add('visible');
        }
      };
    };
  }).catch(() => {});

  updateBtn.addEventListener('click', () => {
    if (pendingSW) pendingSW.postMessage('SKIP_WAITING');
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    location.reload();
  });
}

// ── Init ──────────────────────────────────────────────────────────
(async function init() {
  await loadConfig();

  if (session) {
    updateHeaderUser();
    renderServiceCards();
    showLandingView();
  } else {
    showRegisterModal();
  }
})();
