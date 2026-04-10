// En localhost: eliminar service workers automáticamente
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

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
const aboutBtn      = document.getElementById('about-btn');
const aboutModal    = document.getElementById('about-modal');
const aboutCloseBtn = document.getElementById('about-close-btn');
const viewLoading      = document.getElementById('view-loading');
const viewLogin        = document.getElementById('view-login');
const viewRegister     = document.getElementById('view-register');
const viewLanding      = document.getElementById('view-landing');
const viewSlots        = document.getElementById('view-slots');
const viewSummary      = document.getElementById('view-summary');
const viewConfirmation = document.getElementById('view-confirmation');
const viewCitas        = document.getElementById('view-citas');
const viewChat         = document.getElementById('view-chat');
const citasLoading  = document.getElementById('citas-loading');
const citasContainer= document.getElementById('citas-container');
const appHeader     = document.getElementById('app-header');
const chatHeader    = document.getElementById('chat-header');
const backBtn       = document.getElementById('back-btn');
const headerTitle   = document.getElementById('header-title');
const servicesList  = document.getElementById('services-list');
const misCitasBtn   = document.getElementById('mis-citas-btn');
const bottomNav     = document.getElementById('bottom-nav');
const slotsLoading      = document.getElementById('slots-loading');
const slotsContainer    = document.getElementById('slots-container');
const dateTabs          = document.getElementById('date-tabs');
const slotsSelectedText = document.getElementById('slots-selected-text');
const slotsSelectedPrice= document.getElementById('slots-selected-price');
const selectSlotBtn     = document.getElementById('select-slot-btn');
const confirmBtn    = document.getElementById('confirm-booking-btn');
const changeSlotBtn = document.getElementById('change-slot-btn');

// ── Vista switching ───────────────────────────────────────────────
function hideAllViews() {
  viewLogin.classList.remove('active');
  viewRegister.classList.remove('active');
  viewLanding.style.display = 'none';
  viewSlots.classList.remove('active');
  viewSummary.classList.remove('active');
  viewConfirmation.classList.remove('active');
  viewCitas.classList.remove('active');
  viewChat.classList.remove('active');
  appHeader.style.display = 'none';
  bottomNav.style.display = 'none';
  closeProfilePanel();
}

function closeProfilePanel() {
  const pp  = document.getElementById('profile-panel');
  const ppb = document.getElementById('profile-panel-backdrop');
  if (pp)  pp.style.display  = 'none';
  if (ppb) ppb.style.display = 'none';
}

function showLoginView() {
  hideAllViews();
  viewLogin.classList.add('active');
}

function showRegisterView() {
  hideAllViews();
  viewRegister.classList.add('active');
}

function showLandingView() {
  hideAllViews();
  viewLanding.style.display = 'flex';
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('services');
  booking = null;
}

function showSlotsView(title) {
  hideAllViews();
  viewSlots.classList.add('active');
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('bookings');
}

function setNavActive(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('nav-tab--active'));
  const map = { services: 'nav-services', bookings: 'mis-citas-btn', profile: 'nav-profile' };
  const el = document.getElementById(map[tab]);
  if (el) el.classList.add('nav-tab--active');
}

function showSummaryView() {
  hideAllViews();
  viewSummary.classList.add('active');
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('bookings');
}

let confirmOkAction = null;

function showConfirmationView(type = 'booking', onOk = showLandingView, details = null) {
  hideAllViews();
  viewConfirmation.classList.add('active');
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('bookings');
  confirmOkAction = onOk;

  const circle    = document.getElementById('confirm-circle');
  const symbol    = document.getElementById('confirm-icon-symbol');
  const badge     = document.getElementById('confirm-badge');
  const title     = document.getElementById('confirm-title');
  const detCard   = document.getElementById('confirm-details-card');
  const fechaLbl  = document.getElementById('confirm-fecha-label');
  const msgEl     = document.getElementById('confirm-message');
  const okBtn     = document.getElementById('confirm-ok-btn');

  if (type === 'cancel') {
    circle.style.background  = 'var(--color-surface-high)';
    symbol.style.color       = 'var(--color-on-surface)';
    symbol.textContent       = 'close';
    badge.className          = 'confirm-step-label confirm-step-label--cancel';
    badge.textContent        = 'CANCELACIÓN CONFIRMADA';
    title.textContent        = 'Cita cancelada';
    fechaLbl.textContent     = 'FECHA CANCELADA';
    detCard.style.display    = details ? '' : 'none';
    msgEl.textContent        = 'Tu cita ha sido liberada. Puedes volver a reservar cuando lo necesites.';
    okBtn.childNodes[0].textContent = 'Entendido  ';
  } else {
    circle.style.background  = 'var(--color-secondary)';
    symbol.style.color       = '#fff';
    symbol.textContent       = 'check';
    badge.className          = 'confirm-step-label';
    badge.textContent        = 'RESERVA CONFIRMADA';
    title.textContent        = '¡Perfecto!';
    fechaLbl.textContent     = 'FECHA';
    detCard.style.display    = '';
    msgEl.textContent        = '';
    okBtn.childNodes[0].textContent = 'Vale, ¡perfecto!  ';
  }

  if (details) {
    document.getElementById('confirm-fecha').textContent    = details.fecha || '';
    document.getElementById('confirm-hora').textContent     = details.hora  || '';
    document.getElementById('confirm-servicio').textContent = details.servicio || '';
  }
}

function showCitasView() {
  hideAllViews();
  viewCitas.classList.add('active');
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('bookings');
}

function showChatView(title) {
  hideAllViews();
  viewChat.classList.add('active');
  if (chatHeader) chatHeader.classList.remove('landing-mode');
  if (backBtn) backBtn.style.display = 'flex';
  if (headerTitle) headerTitle.style.display = 'block';
  if (title && barberNameHdr) barberNameHdr.textContent = title;
  clearChat();
}

function clearChat() {
  chatMessages.innerHTML = '';
}

// ── Back button ───────────────────────────────────────────────────
backBtn.addEventListener('click', handleBack);

function handleBack() {
  if (viewSummary.classList.contains('active')) {
    showSlotsView('¿Cuando te va bien?');
    return;
  }
  showLandingView();
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
    console.log('[config]', cfg);
    applyConfig(cfg);
    if (cfg.servicios && cfg.servicios.length) {
      servicesCache = cfg.servicios.map(s => ({ ...s, precio: s.precio ?? s.precio_eur ?? 0 }));
    }
  } catch {
    barberName.textContent = 'Barberia';
  }
}

function applyConfig(cfg) {
  if (cfg.nombre) {
    barberName.textContent = cfg.nombre;
    if (barberNameHdr) barberNameHdr.textContent = cfg.nombre;
    barberNameText = cfg.nombre;
  }
  if (cfg.logo_url && logo) {
    const placeholder = document.getElementById('logo-placeholder');
    logo.alt = cfg.nombre || 'Logo';
    logo.onload  = () => { logo.style.display = 'block'; if (placeholder) placeholder.style.display = 'none'; };
    logo.onerror = () => { logo.style.display = 'none'; };
    logo.src = cfg.logo_url;
  }
  if (cfg.color_primary) {
    const primary = '#' + cfg.color_primary.replace(/^#+/, '');
    document.documentElement.style.setProperty('--color-primary', primary);
  }
  // color_secondary ignorado — fijado al bronze del design system Artisan Cut
  document.documentElement.style.setProperty('--color-secondary', '#725b3f');
  document.documentElement.style.setProperty('--color-bubble-user', '#725b3f');
  if (cfg.novaia_badge) novaiaBadge.style.display = 'block';
  const themeColor = document.querySelector('meta[name=theme-color]');
  if (themeColor && cfg.color_primary) themeColor.content = cfg.color_primary;
}

// ── Service cards (landing) ───────────────────────────────────────
const SERVICE_ICONS = {
  default: 'content_cut',
  corte: 'content_cut',
  barba: 'face',
  tinte: 'palette',
  color: 'palette',
  ritual: 'spa',
  premium: 'spa',
};

function getServiceIcon(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('ritual') || n.includes('premium')) return SERVICE_ICONS.ritual;
  if (n.includes('barba')) return SERVICE_ICONS.barba;
  if (n.includes('tinte') || n.includes('color')) return SERVICE_ICONS.color;
  return SERVICE_ICONS.corte;
}

function renderServiceCards() {
  servicesList.innerHTML = '';
  const services = servicesCache.length
    ? servicesCache
    : [
        { id: 'SRV001', nombre: 'Corte',        duracion_min: 30, precio: 25 },
        { id: 'SRV002', nombre: 'Barba',         duracion_min: 20, precio: 18 },
        { id: 'SRV003', nombre: 'Tinte',         duracion_min: 45, precio: 35 },
        { id: 'SRV004', nombre: 'Ritual',        duracion_min: 60, precio: 55 },
      ];

  services.forEach(svc => {
    const isPremium = svc.nombre.toLowerCase().includes('ritual') || svc.nombre.toLowerCase().includes('premium');

    const card = document.createElement('div');
    card.className = 'service-card';

    const icon = document.createElement('div');
    icon.className = 'service-icon' + (isPremium ? ' icon-premium' : '');
    icon.innerHTML = `<span class="material-symbols-outlined">${getServiceIcon(svc.nombre)}</span>`;

    const info = document.createElement('div');
    info.className = 'service-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'service-name';
    nameEl.textContent = svc.nombre;

    const meta = document.createElement('div');
    meta.className = 'service-meta';
    meta.textContent = svc.duracion_min + ' MIN' + (isPremium ? ' · PREMIUM' : '');

    info.appendChild(nameEl);
    info.appendChild(meta);

    const price = document.createElement('div');
    price.className = 'service-price';
    price.textContent = svc.precio + '€';

    const btn = document.createElement('button');
    btn.className = 'service-book-btn';
    btn.textContent = 'Reservar';
    btn.addEventListener('click', e => { e.stopPropagation(); startBookingWithService(svc); });

    card.addEventListener('click', () => startBookingWithService(svc));
    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(price);
    card.appendChild(btn);
    servicesList.appendChild(card);
  });
}

// ── Bottom nav ────────────────────────────────────────────────────
document.getElementById('nav-services').addEventListener('click', () => {
  showLandingView();
});

misCitasBtn.addEventListener('click', async () => {
  showCitasView();
  await fetchAndRenderCitas();
});

// Profile panel
const profilePanel         = document.getElementById('profile-panel');
const profilePanelBackdrop = document.getElementById('profile-panel-backdrop');
const profilePanelName     = document.getElementById('profile-panel-name');
const profilePanelPhone    = document.getElementById('profile-panel-phone');
const profileLogoutBtn     = document.getElementById('profile-logout-btn');

function openProfilePanel() {
  if (session) {
    const fullName = (session.nombre + ' ' + (session.apellido || '')).trim();
    profilePanelName.textContent  = fullName || '-';
    profilePanelPhone.textContent = session.telefono || '-';
  }
  profilePanel.style.display         = 'block';
  profilePanelBackdrop.style.display = 'block';
}

document.getElementById('nav-profile').addEventListener('click', openProfilePanel);
profilePanelBackdrop.addEventListener('click', closeProfilePanel);

profileLogoutBtn.addEventListener('click', () => {
  if (confirm('Cerrar sesion?')) {
    localStorage.removeItem('barber_session_' + barberId);
    session = null;
    closeProfilePanel();
    showLoginView();
  }
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

const MONTH_ABBR = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const DAY_ABBR   = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

function getDayInfo(fecha) {
  const todayISO    = getDateISO(0);
  const tomorrowISO = getDateISO(1);
  const d = new Date(fecha + 'T12:00:00');
  let label;
  if (fecha === todayISO)    label = 'HOY';
  else if (fecha === tomorrowISO) label = 'MÑN';
  else label = DAY_ABBR[d.getDay()];
  return { label, num: d.getDate(), month: MONTH_ABBR[d.getMonth()] };
}

// ── Booking ───────────────────────────────────────────────────────
// booking = null | { service, fecha, hora, fechaDisplay }
let booking = null;

const DAY_LABELS = ['Hoy', 'Manana', 'Pasado manana'];

async function startBookingWithService(svc) {
  booking = { service: svc };
  selectSlotBtn.disabled = true;
  showSlotsView('¿Cuando te va bien?');
  await fetchAllSlots();
}

async function fetchAllSlots() {
  slotsLoading.style.display = 'flex';
  slotsContainer.innerHTML = '';
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
    slotsLoading.style.display = 'none';
    renderSlotsGrouped(data.slots || []);
  } catch {
    slotsLoading.style.display = 'none';
    slotsContainer.innerHTML = '<p class="no-slots">Error al cargar disponibilidad. Vuelve a intentarlo.</p>';
  }
}

// Slots state
let _slotsByDate = {};
let _slotDates   = [];

function renderSlotsGrouped(slots) {
  slotsContainer.innerHTML = '';
  dateTabs.innerHTML = '';
  selectSlotBtn.disabled = true;
  slotsSelectedText.textContent  = 'Selecciona un horario';
  slotsSelectedPrice.textContent = '';

  // Agrupar por fecha — guardar precios también
  _slotsByDate = {};
  const svcPrecio = booking?.service?.precio;
  slots.forEach(s => {
    if (!_slotsByDate[s.fecha]) _slotsByDate[s.fecha] = [];
    _slotsByDate[s.fecha].push({ hora: s.hora, precio: s.precio ?? svcPrecio });
  });

  _slotDates = Object.keys(_slotsByDate).sort();

  if (!_slotDates.length) {
    slotsContainer.innerHTML = '<p class="no-slots">No hay disponibilidad proxima. Contacta con la barberia.</p>';
    return;
  }

  const todayISO    = getDateISO(0);
  const tomorrowISO = getDateISO(1);
  const dayAfterISO = getDateISO(2);

  function getLabel(fecha) {
    if (fecha === todayISO)    return 'Hoy';
    if (fecha === tomorrowISO) return 'Mañana';
    if (fecha === dayAfterISO) return 'Pasado';
    return formatDateDisplay(fecha);
  }

  // Build date-tabs (3 líneas: día corto | número | mes abrev)
  _slotDates.forEach((fecha, idx) => {
    const { label, num, month } = getDayInfo(fecha);
    const tab = document.createElement('button');
    tab.className = 'date-tab' + (idx === 0 ? ' active' : '');
    tab.dataset.fecha = fecha;
    tab.innerHTML = `<span class="date-tab-day">${label}</span><span class="date-tab-num">${num}</span><span class="date-tab-month">${month}</span>`;
    tab.addEventListener('click', () => {
      document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDaySlots(fecha, label);
    });
    dateTabs.appendChild(tab);
  });

  // Show first day
  renderDaySlots(_slotDates[0], getLabel(_slotDates[0]));
}

function renderDaySlots(fecha, label) {
  slotsContainer.innerHTML = '';
  const daySlots = _slotsByDate[fecha] || [];

  const morning   = daySlots.filter(s => parseInt(s.hora) < 14);
  const afternoon = daySlots.filter(s => parseInt(s.hora) >= 14);

  function buildGroup(title, items) {
    if (!items.length) return;
    const group = document.createElement('div');
    group.className = 'time-group';
    const lbl = document.createElement('div');
    lbl.className = 'time-group-label';
    lbl.textContent = '✦ HORARIOS DE ' + title.toUpperCase();
    group.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'slots-grid';
    items.forEach(({ hora, precio }) => {
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.textContent = hora;
      btn.addEventListener('click', () => highlightSlot(btn, fecha, hora, label, precio));
      grid.appendChild(btn);
    });
    group.appendChild(grid);
    slotsContainer.appendChild(group);
  }

  buildGroup('Mañana', morning);
  buildGroup('Tarde', afternoon);
}

function highlightSlot(btn, fecha, hora, fechaLabel, precio) {
  document.querySelectorAll('.slot-btn.selected').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  booking.fecha = fecha;
  booking.hora  = hora;
  booking.fechaDisplay = fechaLabel + ', ' + formatDateDisplay(fecha);
  const { num, month } = getDayInfo(fecha);
  slotsSelectedText.textContent  = fechaLabel + ', ' + num + ' ' + month + ' • ' + hora;
  slotsSelectedPrice.textContent = precio ? formatPrecio(precio) : '';
  selectSlotBtn.disabled = false;
}

function formatPrecio(precio) {
  const n = parseFloat(precio);
  if (isNaN(n)) return '';
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

selectSlotBtn.addEventListener('click', () => {
  if (!booking.fecha || !booking.hora) return;
  renderSummary();
  showSummaryView();
});

function renderSummary() {
  const svc = booking.service;
  document.getElementById('summary-svc-icon').textContent = getServiceIcon(svc.nombre);
  document.getElementById('summary-service-name').textContent = svc.nombre;
  document.getElementById('summary-fecha').textContent = booking.fechaDisplay;
  document.getElementById('summary-hora').textContent = booking.hora;
}

confirmBtn.addEventListener('click', executeBooking);
changeSlotBtn.addEventListener('click', () => showSlotsView('¿Cuando te va bien?'));
document.getElementById('confirm-ok-btn').addEventListener('click', () => {
  if (confirmOkAction) confirmOkAction();
});

async function executeBooking() {
  const svc = booking.service;
  const fecha_hora = booking.fecha + 'T' + booking.hora + ':00';

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Reservando...';

  try {
    await fetch(WEBHOOK_CHAT, {
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

    // Poblar detalles en la pantalla de confirmación
    document.getElementById('confirm-fecha').textContent    = booking.fechaDisplay;
    document.getElementById('confirm-hora').textContent     = booking.hora;
    document.getElementById('confirm-servicio').textContent = svc.nombre;

    showConfirmationView('booking', showLandingView);
  } catch {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar reserva';
    showToast('Error al reservar. Intentalo de nuevo.');
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 18px;border-radius:50px;font-size:0.84rem;z-index:999;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// ── Mis citas (vista nativa) ──────────────────────────────────────
async function fetchAndRenderCitas() {
  citasLoading.style.display = 'flex';
  citasContainer.innerHTML = '';
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
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw[0] : raw;
    console.log('[mis-citas]', data);
    citasLoading.style.display = 'none';

    if (data.citas && data.citas.length) {
      renderCitaCards(data.citas);
    } else {
      citasContainer.innerHTML = '<div class="citas-empty">No tienes citas proximas.<br>Reserva cuando quieras.</div>';
    }
  } catch {
    citasLoading.style.display = 'none';
    citasContainer.innerHTML = '<div class="citas-empty">Error de conexion. Intentalo de nuevo.</div>';
  }
}

function parseCitaDisplay(display) {
  const parts = display.split(' — ');
  return { servicio: parts[0] || display, fecha: parts[1] || '' };
}

const MONTH_ABBR_ES_SHORT = { ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11 };
const MONTH_ABBR_ES_LONG  = { enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11 };

function parseCitaDateTime(cita) {
  // 1) Campo ISO fecha_hora
  if (cita.fecha_hora) {
    const d = new Date(cita.fecha_hora);
    return { num: d.getDate(), month: MONTH_ABBR[d.getMonth()],
             timeStr: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
  }
  const str = cita.display || '';

  // 2) Formato corto: "jue, 9 abr a las 12:30"
  const m1 = str.match(/,\s*(\d{1,2})\s+(\w{3})\s+a\s+las\s+(\d{1,2}:\d{2})/i);
  if (m1) {
    const mIdx = MONTH_ABBR_ES_SHORT[m1[2].toLowerCase()];
    return { num: +m1[1], month: mIdx !== undefined ? MONTH_ABBR[mIdx] : m1[2].toUpperCase(), timeStr: m1[3] };
  }

  // 3) Formato largo: "lunes 24 de octubre a las 10:30"
  const m2 = str.match(/(\d{1,2}) de (\w+).*?(\d{1,2}:\d{2})/i);
  if (m2) {
    const mIdx = MONTH_ABBR_ES_LONG[m2[2].toLowerCase()];
    return { num: +m2[1], month: mIdx !== undefined ? MONTH_ABBR[mIdx] : '?', timeStr: m2[3] };
  }

  return { num: '?', month: '?', timeStr: str };
}

function renderCitaCards(citas) {
  citasContainer.innerHTML = '';
  citas.forEach(cita => {
    // API devuelve: { id, servicio, display }
    const servicio = cita.servicio || 'Cita';
    const { num, month, timeStr } = parseCitaDateTime(cita);

    // Duración desde servicesCache si disponible
    const svcMatch = servicesCache.find(s => s.nombre.toLowerCase() === servicio.toLowerCase());
    const durStr = svcMatch ? ' · ' + svcMatch.duracion_min + ' min' : '';

    const card = document.createElement('div');
    card.className = 'cita-card-new';

    // Bloque fecha
    const dateBlock = document.createElement('div');
    dateBlock.className = 'cita-date-block';
    dateBlock.innerHTML = `<span class="cita-date-month">${month}</span><span class="cita-date-num">${num}</span>`;

    // Info
    const info = document.createElement('div');
    info.className = 'cita-info-block';

    const nameEl = document.createElement('div');
    nameEl.className = 'cita-servicio-name';
    nameEl.textContent = servicio;

    const metaEl = document.createElement('div');
    metaEl.className = 'cita-time-meta';
    metaEl.innerHTML = `<span class="material-symbols-outlined">schedule</span>${timeStr}${durStr}`;

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    const btn = document.createElement('button');
    btn.className = 'cita-cancel-btn';
    btn.textContent = 'Cancelar';
    btn.addEventListener('click', () => cancelCitaNativa(cita, card));

    card.appendChild(dateBlock);
    card.appendChild(info);
    card.appendChild(btn);
    citasContainer.appendChild(card);
  });
}

function cancelCitaNativa(cita, cardEl) {
  const cancelModal   = document.getElementById('cancel-modal');
  const modalConfirm  = document.getElementById('cancel-modal-confirm');
  const modalDismiss  = document.getElementById('cancel-modal-dismiss');

  cancelModal.style.display = 'flex';

  const cleanup = () => { cancelModal.style.display = 'none'; };

  modalDismiss.onclick = cleanup;
  cancelModal.onclick  = e => { if (e.target === cancelModal) cleanup(); };

  modalConfirm.onclick = async () => {
    // Loading en el botón del modal
    modalConfirm.textContent = 'Cancelando...';
    modalConfirm.disabled = true;

    try {
      await fetch(WEBHOOK_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: barberId,
          telefono:  session.telefono,
          nombre:    session.nombre,
          apellido:  session.apellido,
          action:    'cancel_appointment',
          cita_id:   cita.id,
          mensaje:   ''
        })
      });

      cleanup();

      const { num, month, timeStr } = parseCitaDateTime(cita);
      const details = {
        fecha:    num + ' ' + month,
        hora:     timeStr,
        servicio: cita.servicio || ''
      };

      const volverACitas = async () => {
        showCitasView();
        await fetchAndRenderCitas();
      };
      showConfirmationView('cancel', volverACitas, details);
    } catch {
      modalConfirm.textContent = 'Aceptar';
      modalConfirm.disabled = false;
      cleanup();
      showToast('Error al cancelar. Intentalo de nuevo.');
    }
  };
}

// ── Enviar mensaje (texto libre → AI Agent, solo en vista chat) ───
async function sendMessage(text) {
  removeActiveQuickReplies();
  addBubble(text, 'user');
  chatInput.value = '';

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

// ── Navegación auth ───────────────────────────────────────────────
document.getElementById('go-register-btn').addEventListener('click', e => { e.preventDefault(); showRegisterView(); });
document.getElementById('go-login-btn').addEventListener('click',    e => { e.preventDefault(); showLoginView(); });
document.getElementById('login-btn').addEventListener('click', () => {
  // Sin PocketBase aún: si hay sesión entra, si no va a registro
  if (session) { showLandingView(); } else { showRegisterView(); }
});

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

    if (chatHeader) { chatHeader.style.display = 'none'; }

    renderServiceCards();
    showLandingView();
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

// ── Service Worker + auto-update (solo en produccion) ─────────────
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if ('serviceWorker' in navigator && !isLocalhost) {
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

  // Ocultar pantalla de carga con fade-out
  viewLoading.classList.add('hidden');
  setTimeout(() => { viewLoading.style.display = 'none'; }, 320);

  if (session) {
    if (chatHeader) { chatHeader.style.display = 'none'; }

    renderServiceCards();
    showLandingView();
  } else {
    showLoginView();
  }
})();
