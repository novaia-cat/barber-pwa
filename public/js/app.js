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
const viewLanding      = document.getElementById('view-landing');
const viewSlots        = document.getElementById('view-slots');
const viewSummary      = document.getElementById('view-summary');
const viewConfirmation = document.getElementById('view-confirmation');
const viewCitas        = document.getElementById('view-citas');
const viewChat         = document.getElementById('view-chat');
const citasLoading  = document.getElementById('citas-loading');
const citasContainer= document.getElementById('citas-container');
const chatHeader    = document.getElementById('chat-header');
const backBtn       = document.getElementById('back-btn');
const headerTitle   = document.getElementById('header-title');
const servicesList  = document.getElementById('services-list');
const misCitasBtn   = document.getElementById('mis-citas-btn');
const cancelarBtn   = document.getElementById('cancelar-btn');
const slotsLoading  = document.getElementById('slots-loading');
const slotsContainer= document.getElementById('slots-container');
const selectSlotBtn = document.getElementById('select-slot-btn');
const confirmBtn    = document.getElementById('confirm-booking-btn');
const changeSlotBtn = document.getElementById('change-slot-btn');

// ── Vista switching ───────────────────────────────────────────────
function hideAllViews() {
  viewLanding.style.display = 'none';
  viewSlots.classList.remove('active');
  viewSummary.classList.remove('active');
  viewConfirmation.classList.remove('active');
  viewCitas.classList.remove('active');
  viewChat.classList.remove('active');
}

function showLandingView() {
  hideAllViews();
  viewLanding.style.display = 'flex';
  chatHeader.classList.add('landing-mode');
  backBtn.style.display = 'none';
  headerTitle.style.display = 'none';
  booking = null;
}

function showSlotsView(title) {
  hideAllViews();
  viewSlots.classList.add('active');
  chatHeader.classList.remove('landing-mode');
  backBtn.style.display = 'flex';
  headerTitle.style.display = 'block';
  barberNameHdr.textContent = barberNameText;
}

function showSummaryView() {
  hideAllViews();
  viewSummary.classList.add('active');
  chatHeader.classList.remove('landing-mode');
  backBtn.style.display = 'flex';
  headerTitle.style.display = 'block';
  barberNameHdr.textContent = 'Resumen';
}

let confirmOkAction = null;

function showConfirmationView(type = 'booking', onOk = showLandingView) {
  hideAllViews();
  viewConfirmation.classList.add('active');
  chatHeader.classList.remove('landing-mode');
  backBtn.style.display = 'none';
  headerTitle.style.display = 'none';
  confirmOkAction = onOk;

  const iconCheck  = document.getElementById('icon-check');
  const iconCancel = document.getElementById('icon-cancel');
  const okBtn      = document.getElementById('confirm-ok-btn');

  if (type === 'cancel') {
    iconCheck.style.display  = 'none';
    iconCancel.style.display = 'block';
    document.getElementById('confirm-title').textContent = 'Cita cancelada';
    okBtn.textContent = 'Entendido';
  } else {
    iconCheck.style.display  = 'block';
    iconCancel.style.display = 'none';
    document.getElementById('confirm-title').textContent = 'Perfecto!';
    okBtn.textContent = 'Vale, perfecto!';
  }

  // Resetear animaciones
  viewConfirmation.querySelectorAll('[class*="checkmark-"],[class*="cancel-"]').forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
  });
}

function showCitasView() {
  hideAllViews();
  viewCitas.classList.add('active');
  chatHeader.classList.remove('landing-mode');
  backBtn.style.display = 'flex';
  headerTitle.style.display = 'block';
  barberNameHdr.textContent = barberNameText;
}

function showChatView(title) {
  hideAllViews();
  viewChat.classList.add('active');
  chatHeader.classList.remove('landing-mode');
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
    const placeholder = document.getElementById('logo-placeholder');
    logo.alt = cfg.nombre || 'Logo';
    logo.onload  = () => { logo.style.display = 'block'; if (placeholder) placeholder.style.display = 'none'; };
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

// ── Bottom bar (desde landing) ────────────────────────────────────
misCitasBtn.addEventListener('click', async () => {
  showCitasView();
  await fetchAndRenderCitas();
});

cancelarBtn.addEventListener('click', async () => {
  showCitasView();
  await fetchAndRenderCitas();
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

function renderSlotsGrouped(slots) {
  slotsContainer.innerHTML = '';

  // Agrupar por fecha
  const byDate = {};
  slots.forEach(s => {
    if (!byDate[s.fecha]) byDate[s.fecha] = [];
    byDate[s.fecha].push(s.hora);
  });

  const sortedDates = Object.keys(byDate).sort();

  if (!sortedDates.length) {
    slotsContainer.innerHTML = '<p class="no-slots">No hay disponibilidad proxima. Contacta con la barberia.</p>';
    return;
  }

  // Mostrar primeros 3 dias con etiqueta Hoy/Manana/Pasado + el resto con fecha
  const todayISO = getDateISO(0);
  const tomorrowISO = getDateISO(1);
  const dayAfterISO = getDateISO(2);

  sortedDates.forEach((fecha, idx) => {
    let label;
    if (fecha === todayISO)     label = 'Hoy';
    else if (fecha === tomorrowISO) label = 'Manana';
    else if (fecha === dayAfterISO) label = 'Pasado manana';
    else label = formatDateDisplay(fecha);

    const section = document.createElement('div');
    section.className = 'day-section';

    const titleEl = document.createElement('div');
    titleEl.className = 'day-label';
    titleEl.textContent = label;

    const dateEl = document.createElement('div');
    dateEl.className = 'day-date';
    dateEl.textContent = formatDateDisplay(fecha);

    const grid = document.createElement('div');
    grid.className = 'slots-grid';

    byDate[fecha].forEach(hora => {
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.textContent = hora;
      btn.addEventListener('click', () => highlightSlot(btn, fecha, hora, label));
      grid.appendChild(btn);
    });

    section.appendChild(titleEl);
    if (label !== formatDateDisplay(fecha)) section.appendChild(dateEl);
    section.appendChild(grid);
    slotsContainer.appendChild(section);
  });
}

function highlightSlot(btn, fecha, hora, fechaLabel) {
  // Quitar selección anterior
  document.querySelectorAll('.slot-btn.selected').forEach(b => b.classList.remove('selected'));
  // Marcar el nuevo
  btn.classList.add('selected');
  // Guardar en booking pero no navegar aún
  booking.fecha = fecha;
  booking.hora = hora;
  booking.fechaDisplay = fechaLabel + ', ' + formatDateDisplay(fecha);
  // Habilitar botón
  selectSlotBtn.disabled = false;
}

selectSlotBtn.addEventListener('click', () => {
  if (!booking.fecha || !booking.hora) return;
  renderSummary();
  showSummaryView();
});

function renderSummary() {
  const svc = booking.service;
  document.getElementById('summary-icon').textContent = getServiceIcon(svc.nombre);
  document.getElementById('summary-service-name').textContent = svc.nombre;
  document.getElementById('summary-service-meta').textContent = svc.duracion_min + ' min · ' + svc.precio + '€';
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

    // Montar mensaje de confirmación
    const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = new Date(booking.fecha + 'T12:00:00');
    const fechaTexto = dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];

    document.getElementById('confirm-message').innerHTML =
      'Nos vemos el proximo <strong>' + fechaTexto + ' a las ' + booking.hora + '</strong>'
      + ' para tu <strong>' + svc.nombre + '</strong>. Te esperamos!';

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
    const data = await res.json();
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

function renderCitaCards(citas) {
  citasContainer.innerHTML = '';
  citas.forEach(cita => {
    const { servicio, fecha } = parseCitaDisplay(cita.display);

    const card = document.createElement('div');
    card.className = 'cita-card-new';

    const iconBox = document.createElement('div');
    iconBox.className = 'cita-icon-box';
    iconBox.textContent = getServiceIcon(servicio);

    const info = document.createElement('div');
    info.className = 'cita-info-block';

    const nameEl = document.createElement('div');
    nameEl.className = 'cita-servicio-name';
    nameEl.textContent = servicio;

    const fechaEl = document.createElement('div');
    fechaEl.className = 'cita-datetime';
    fechaEl.textContent = fecha || cita.display;

    info.appendChild(nameEl);
    info.appendChild(fechaEl);

    const btn = document.createElement('button');
    btn.className = 'cita-cancel-btn';
    btn.textContent = 'Cancelar';
    btn.addEventListener('click', () => cancelCitaNativa(cita.id, cita.display, card));

    card.appendChild(iconBox);
    card.appendChild(info);
    card.appendChild(btn);
    citasContainer.appendChild(card);
  });
}

async function cancelCitaNativa(citaId, display, cardEl) {
  if (!confirm('Cancelar esta cita?')) return;
  cardEl.style.opacity = '0.4';
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
        cita_id:   citaId,
        mensaje:   ''
      })
    });
    cardEl.remove();
    const { servicio, fecha } = parseCitaDisplay(display);
    document.getElementById('confirm-message').innerHTML =
      'Tu cita de <strong>' + servicio + '</strong>' +
      (fecha ? ' del <strong>' + fecha + '</strong>' : '') +
      ' ha sido cancelada. Cuando quieras puedes reservar de nuevo.';

    const volverACitas = async () => {
      showCitasView();
      await fetchAndRenderCitas();
    };
    showConfirmationView('cancel', volverACitas);
  } catch {
    cardEl.style.opacity = '1';
    showToast('Error al cancelar. Intentalo de nuevo.');
  }
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

  chatHeader.classList.add('landing-mode');
  if (session) {
    updateHeaderUser();
    renderServiceCards();
    showLandingView();
  } else {
    showRegisterModal();
  }
})();
