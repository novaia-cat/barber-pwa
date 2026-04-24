// En localhost: eliminar service workers automáticamente
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

const N8N_BASE = 'https://n8n.novaia.cat';
const WEBHOOK_CHAT = N8N_BASE + '/webhook/barber-chat';
const WEBHOOK_CONFIG = N8N_BASE + '/webhook/barber-get-config';
const WEBHOOK_PUSH_SUBSCRIBE = N8N_BASE + '/webhook/barber-push-subscribe';

// ── Supabase ──────────────────────────────────────────────────────
// TODO: reemplazar con los valores de tu proyecto Supabase Cloud
const SUPABASE_URL      = 'https://cynnuucihcniqusomgol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bm51dWNpaGNuaXF1c29tZ29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQ5MTIsImV4cCI6MjA5MTQxMDkxMn0.xwH3ZDjcmtTwyrJZ5lyoyr8nsHKb8gWPEscJQaAJNmo';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth state listener (Supabase v2 — PKCE e implicit flow) ─────
let recoveryHandled = false;
sb.auth.onAuthStateChange((event, _session) => {
  if (event === 'PASSWORD_RECOVERY') {
    recoveryHandled = true;
    showNewPasswordView();
  }
});

// Normaliza teléfono: quita +34/0034, espacios, guiones → solo dígitos
function normalizeTelefono(tel) {
  let t = tel.trim().replace(/[\s\-\.]/g, '');
  if (t.startsWith('+34'))   t = t.slice(3);
  else if (t.startsWith('0034')) t = t.slice(4);
  t = t.replace(/^\+/, '');
  return t;
}

function getBarberId() {
  // En multi-pelu: el usuario puede seleccionar y guardar su peluquería en localStorage
  const stored = localStorage.getItem('selected_barber_id');
  if (stored) return stored;
  const host = window.location.hostname;
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : 'barber';
}

let barberId = getBarberId();
let session = null; // populated from Supabase on init

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
const viewHome         = document.getElementById('view-home');
const viewLogin        = document.getElementById('view-login');
const viewRegister     = document.getElementById('view-register');
const viewLanding      = document.getElementById('view-landing');
const viewSlots        = document.getElementById('view-slots');
const viewSummary      = document.getElementById('view-summary');
const viewConfirmation    = document.getElementById('view-confirmation');
const viewCitas           = document.getElementById('view-citas');
const viewChat            = document.getElementById('view-chat');
const viewForgotPassword  = document.getElementById('view-forgot-password');
const viewNewPassword     = document.getElementById('view-new-password');
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
  viewForgotPassword.classList.remove('active');
  viewNewPassword.classList.remove('active');
  viewHome.style.display = 'none';
  viewLanding.style.display = 'none';
  viewSlots.classList.remove('active');
  viewSummary.classList.remove('active');
  viewConfirmation.classList.remove('active');
  viewCitas.classList.remove('active');
  viewChat.classList.remove('active');
  const vsb = document.getElementById('view-select-barber');
  if (vsb) vsb.classList.remove('active');
  appHeader.style.display = 'none';
  bottomNav.style.display = 'none';
  closeProfilePanel();
}

function showForgotPasswordView() {
  hideAllViews();
  viewForgotPassword.classList.add('active');
}

function showNewPasswordView() {
  hideAllViews();
  viewNewPassword.classList.add('active');
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

function showHomeView() {
  hideAllViews();
  viewHome.style.display = 'flex';
  appHeader.style.display = 'flex';
  bottomNav.style.display = 'flex';
  setNavActive('home');
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
  const map = { home: 'nav-home', services: 'nav-services', bookings: 'mis-citas-btn', profile: 'nav-profile' };
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

// ── Header height → CSS var (multiresolucion) ─────────────────────
function updateHeaderHeight() {
  const h = appHeader.offsetHeight;
  if (h > 0) document.documentElement.style.setProperty('--header-h', h + 'px');
}
window.addEventListener('resize', updateHeaderHeight);

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
const homeInstallBtn = document.getElementById('home-install-btn');
const installModal   = document.getElementById('install-modal');
const installModalSteps = document.getElementById('install-modal-steps');

// No mostrar nada si ya está instalada (modo standalone)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone === true;

function getInstallInstructions() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'En Safari, toca el botón compartir (□↑)\ny selecciona "Añadir a pantalla de inicio".';
  }
  if (/EdgA|EdgW/.test(ua)) {
    return 'Toca el menú ··· (abajo a la derecha)\ny selecciona "Añadir a pantalla de inicio".';
  }
  // Chrome Android y resto
  return 'Toca el menú ⋮ (arriba a la derecha)\ny selecciona "Añadir a pantalla de inicio".';
}

function showHomeInstallBtn() {
  if (!isStandalone && homeInstallBtn) homeInstallBtn.style.display = 'flex';
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showHomeInstallBtn();
});

// Si no llega beforeinstallprompt en 2s y no está instalada, mostrar botón manual
setTimeout(() => {
  if (!deferredInstallPrompt && !isStandalone) showHomeInstallBtn();
}, 2000);

homeInstallBtn.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (outcome === 'accepted') homeInstallBtn.style.display = 'none';
  } else {
    // Mostrar instrucciones manuales
    installModalSteps.textContent = getInstallInstructions();
    installModal.classList.add('active');
  }
});

document.getElementById('install-modal-close').addEventListener('click', () => {
  installModal.classList.remove('active');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (homeInstallBtn) homeInstallBtn.style.display = 'none';
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

  // ── Home view ──────────────────────────────────────────────────
  const homeBarberName = document.getElementById('home-barber-name');
  if (homeBarberName && cfg.nombre) homeBarberName.textContent = cfg.nombre;

  if (cfg.logo_url) {
    const homeLogo = document.getElementById('home-logo');
    const homeLogoPlaceholder = document.getElementById('home-logo-placeholder');
    if (homeLogo) {
      homeLogo.onload  = () => { homeLogo.style.display = 'block'; if (homeLogoPlaceholder) homeLogoPlaceholder.style.display = 'none'; };
      homeLogo.onerror = () => {};
      homeLogo.src = cfg.logo_url;
    }
  }
  if (cfg.imagen_url) {
    const homeHeroImg = document.getElementById('home-hero-img');
    if (homeHeroImg) {
      homeHeroImg.onload  = () => { homeHeroImg.style.display = 'block'; };
      homeHeroImg.onerror = () => {};
      homeHeroImg.src = cfg.imagen_url;
    }
  }
  if (cfg.direccion) {
    const el = document.getElementById('home-direccion');
    const txt = document.getElementById('home-direccion-text');
    if (el) el.style.display = 'flex';
    if (txt) txt.textContent = cfg.direccion;
  }
  if (cfg.telefono) {
    const el = document.getElementById('home-telefono');
    const txt = document.getElementById('home-telefono-text');
    if (el) el.style.display = 'flex';
    if (txt) txt.textContent = cfg.telefono;
  }

  // ── Auth hero (Login) — nombre barbería ─────────────────────────
  const loginBarberName = document.getElementById('login-barber-name');
  if (loginBarberName && cfg.nombre) loginBarberName.textContent = cfg.nombre;

  // ── Auth hero (Login) — imagen + logo ───────────────────────────
  if (cfg.imagen_url) {
    document.querySelectorAll('.auth-hero-img').forEach(img => {
      img.onload  = () => { img.style.display = 'block'; };
      img.onerror = () => {};
      img.src = cfg.imagen_url;
    });
  }
  if (cfg.logo_url) {
    document.querySelectorAll('.auth-hero-logo').forEach(img => {
      img.onload  = () => {
        img.style.display = 'block';
        const placeholder = img.previousElementSibling;
        if (placeholder && placeholder.classList.contains('auth-hero-logo-placeholder')) {
          placeholder.style.display = 'none';
        }
      };
      img.onerror = () => {};
      img.src = cfg.logo_url;
      img.alt = cfg.nombre || '';
    });
  }
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

// ── Home CTA + nav ────────────────────────────────────────────────
document.getElementById('home-cta-btn').addEventListener('click', () => {
  renderServiceCards();
  showLandingView();
});

document.getElementById('nav-home').addEventListener('click', () => {
  showHomeView();
});

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

profileLogoutBtn.addEventListener('click', async () => {
  if (confirm('Cerrar sesion?')) {
    await sb.auth.signOut();
    session = null;
    closeProfilePanel();
    showLoginView();
  }
});

document.getElementById('profile-change-barber-btn').addEventListener('click', () => {
  closeProfilePanel();
  showSelectBarberView();
});

document.getElementById('profile-push-btn').addEventListener('click', async () => {
  const label = document.getElementById('profile-push-label');
  label.textContent = 'Activando...';
  const ok = await subscribePush(true);
  if (!ok) label.textContent = 'Activar notificaciones';
});


// ── Seleccionar peluquería ────────────────────────────────────────
function showSelectBarberView() {
  hideAllViews();
  document.getElementById('view-select-barber').classList.add('active');
  loadBarberList();
}

async function loadBarberList() {
  const list = document.getElementById('barber-list');
  list.innerHTML = '<div class="barber-list-loading"><div class="spinner"></div></div>';

  try {
    const { data: barberias, error } = await sb
      .from('barberias')
      .select('id, nombre, logo_url, imagen_url, direccion')
      .order('nombre');

    if (error || !barberias || !barberias.length) {
      list.innerHTML = '<p class="barber-list-empty">No hay peluquerías disponibles.</p>';
      return;
    }

    list.innerHTML = '';
    barberias.forEach(b => {
      const card = document.createElement('button');
      card.className = 'barber-option-card' + (b.id === barberId ? ' active' : '');

      const bgStyle = b.imagen_url
        ? `style="background-image:url('${b.imagen_url}')"`
        : '';

      const logoHtml = b.logo_url
        ? `<img src="${b.logo_url}" alt="${b.nombre || b.id}" loading="lazy">`
        : `<span class="material-symbols-outlined">content_cut</span>`;

      const checkHtml = b.id === barberId
        ? `<span class="material-symbols-outlined barber-option-check">check_circle</span>`
        : '';

      const addressHtml = b.direccion
        ? `<p class="barber-option-address"><span class="material-symbols-outlined">location_on</span>${b.direccion}</p>`
        : '';

      card.innerHTML = `
        <div class="barber-option-bg" ${bgStyle}></div>
        <div class="barber-option-gradient"></div>
        <div class="barber-option-content">
          <div class="barber-option-logo">${logoHtml}</div>
          <div class="barber-option-info">
            <span class="barber-option-name">${b.nombre || b.id}</span>
            ${addressHtml}
          </div>
          ${checkHtml}
        </div>
      `;
      card.addEventListener('click', async () => {
        localStorage.setItem('selected_barber_id', b.id);
        barberId = b.id;
        servicesCache = [];
        await loadConfig();
        renderServiceCards();
        showHomeView();
      });
      list.appendChild(card);
    });
  } catch {
    list.innerHTML = '<p class="barber-list-empty">Error al cargar peluquerías.</p>';
  }
}

document.getElementById('select-barber-back-btn').addEventListener('click', () => {
  if (session) {
    showHomeView();
  } else {
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

    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar reserva';
    showConfirmationView('booking', showLandingView);
  } catch (err) {
    console.error('[booking-error]', err);
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
    if (cita.barberia) {
      const barberiaEl = document.createElement('div');
      barberiaEl.className = 'cita-barberia-name';
      barberiaEl.innerHTML = `<span class="material-symbols-outlined">storefront</span>${cita.barberia}`;
      info.appendChild(barberiaEl);
    }
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
  const defaultConfirmText = 'Cancelar cita';

  const resetModalState = () => {
    modalConfirm.textContent = defaultConfirmText;
    modalConfirm.disabled = false;
    modalConfirm.onclick = null;
    modalDismiss.onclick = null;
    cancelModal.onclick = null;
  };

  const cleanup = () => {
    cancelModal.style.display = 'none';
    resetModalState();
  };

  resetModalState();
  cancelModal.style.display = 'flex';

  modalDismiss.onclick = cleanup;
  cancelModal.onclick  = e => { if (e.target === cancelModal) cleanup(); };

  modalConfirm.onclick = async () => {
    // Loading en el botón del modal
    modalConfirm.textContent = 'Cancelando...';
    modalConfirm.disabled = true;

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
          cita_id:   cita.id,
          mensaje:   ''
        })
      });
      if (!res.ok) throw new Error('cancel error');

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

// ── Menú About en pantallas auth ─────────────────────────────────
['login-menu-btn', 'register-menu-btn'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => aboutModal.classList.add('active'));
});

// ── Navegación auth ───────────────────────────────────────────────
document.getElementById('go-register-btn').addEventListener('click', () => showRegisterView());
document.getElementById('go-login-btn').addEventListener('click',    e => { e.preventDefault(); showLoginView(); });
document.getElementById('email-sent-login-btn').addEventListener('click', () => {
  // Resetear estado del registro antes de ir al login
  document.querySelector('#view-register .auth-welcome').style.display = '';
  document.querySelector('#view-register .auth-form').style.display = '';
  document.getElementById('reg-email-sent').style.display = 'none';
  showLoginView();
});
document.getElementById('forgot-password-btn').addEventListener('click', () => showForgotPasswordView());
document.getElementById('go-login-from-forgot-btn').addEventListener('click', e => { e.preventDefault(); showLoginView(); });

// ── Toggles mostrar/ocultar contraseña ───────────────────────────
document.querySelectorAll('.auth-pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const show = target.type === 'password';
    target.type = show ? 'text' : 'password';
    btn.querySelector('.material-symbols-outlined').textContent = show ? 'visibility_off' : 'visibility';
  });
});

// ── Login con Supabase ────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl    = document.getElementById('login-msg');
  msgEl.textContent = ''; msgEl.className = 'auth-msg';

  if (!email)    { document.getElementById('login-email').focus();    return; }
  if (!password) { document.getElementById('login-password').focus(); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const meta = data.user?.user_metadata || {};
    session = { nombre: meta.nombre || '', apellido: meta.apellido || '', telefono: meta.telefono || '', email };
    renderServiceCards();
    showHomeView();
    setTimeout(subscribePush, 1000);
  } catch {
    msgEl.textContent = 'Email o contraseña incorrectos.';
    msgEl.classList.add('auth-msg--error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

[document.getElementById('login-email'), document.getElementById('login-password')].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });
});

// ── Registro con Supabase ─────────────────────────────────────────
regBtn.addEventListener('click', async () => {
  const nombre   = regNombre.value.trim();
  const apellido = regApellido.value.trim();
  const telefono = normalizeTelefono(regTelefono.value);
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const passConf = document.getElementById('reg-password-confirm').value;
  const msgEl    = document.getElementById('reg-msg');
  msgEl.textContent = ''; msgEl.className = 'auth-msg';

  if (!nombre   || nombre.length < 2)    { regNombre.focus();   return; }
  if (!apellido || apellido.length < 2)  { regApellido.focus(); return; }
  if (!telefono.match(/^\d{9,15}$/))     { regTelefono.focus(); return; }
  if (!email.match(/.+@.+\..+/))        { document.getElementById('reg-email').focus(); return; }
  if (password.length < 6)              { document.getElementById('reg-password').focus(); return; }
  if (password !== passConf) {
    msgEl.textContent = 'Las contraseñas no coinciden.';
    msgEl.classList.add('auth-msg--error');
    document.getElementById('reg-password-confirm').focus();
    return;
  }
  if (!regRgpd.checked) { rgpdLink.click(); return; }

  regBtn.disabled = true;
  regBtn.textContent = 'Creando cuenta...';

  // Verificar si el teléfono ya existe globalmente via RPC function.
  try {
    const { data: phoneExists, error: rpcErr } = await sb
      .rpc('check_phone_exists', { p_telefono: telefono });
    if (!rpcErr && phoneExists === true) {
      msgEl.textContent = 'Este número de teléfono ya está registrado. Inicia sesión o usa otro número.';
      msgEl.classList.add('auth-msg--error');
      regTelefono.focus();
      regBtn.disabled = false;
      regBtn.textContent = 'Crear cuenta';
      return;
    }
  } catch { /* Si la función no existe aún, continuamos */ }

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellido, telefono } }
    });
    if (error) throw error;

    // clientes se inserta automáticamente via trigger on_auth_user_created

    if (data.session) {
      // Verificación desactivada en Supabase → sesión activa de inmediato
      session = { nombre, apellido, telefono, email };
      renderServiceCards();
      showHomeView();
      setTimeout(subscribePush, 1000);
    } else {
      // Verificación activa → mostrar pantalla "revisa tu correo"
      document.querySelector('#view-register .auth-welcome').style.display = 'none';
      document.querySelector('#view-register .auth-form').style.display = 'none';
      document.getElementById('email-sent-address').textContent = email;
      document.getElementById('reg-email-sent').style.display = 'flex';
      regBtn.disabled = false;
      regBtn.textContent = 'Crear cuenta';
    }
  } catch (err) {
    const isAlreadyRegistered = err.message?.toLowerCase().includes('already');
    msgEl.textContent = isAlreadyRegistered
      ? 'Este email ya tiene una cuenta. Inicia sesión.'
      : 'Error al crear la cuenta. Inténtalo de nuevo.';
    msgEl.classList.add('auth-msg--error');
    regBtn.disabled = false;
    regBtn.textContent = 'Crear cuenta';
  }
});

[regNombre, regApellido, regTelefono,
 document.getElementById('reg-email'),
 document.getElementById('reg-password'),
 document.getElementById('reg-password-confirm')].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });
});

// ── Recuperar contraseña ──────────────────────────────────────────
document.getElementById('forgot-send-btn').addEventListener('click', async () => {
  const email = document.getElementById('forgot-email').value.trim();
  const msgEl = document.getElementById('forgot-msg');
  msgEl.textContent = ''; msgEl.className = 'auth-msg';

  if (!email) { document.getElementById('forgot-email').focus(); return; }

  const btn = document.getElementById('forgot-send-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  if (error) {
    const msg = error.status === 429
      ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
      : 'Error al enviar. Comprueba el email.';
    msgEl.textContent = msg;
    msgEl.classList.add('auth-msg--error');
  } else {
    msgEl.textContent = '¡Enlace enviado! Revisa tu bandeja de entrada.';
    msgEl.classList.add('auth-msg--success');
  }
  btn.disabled = false;
  btn.textContent = 'Enviar enlace';
});

// ── Nueva contraseña (recovery flow) ─────────────────────────────
document.getElementById('new-password-btn').addEventListener('click', async () => {
  const password = document.getElementById('new-password').value;
  const passConf = document.getElementById('new-password-confirm').value;
  const msgEl    = document.getElementById('new-password-msg');
  msgEl.textContent = ''; msgEl.className = 'auth-msg';

  if (password.length < 6) { document.getElementById('new-password').focus(); return; }
  if (password !== passConf) {
    msgEl.textContent = 'Las contraseñas no coinciden.';
    msgEl.classList.add('auth-msg--error');
    return;
  }

  const btn = document.getElementById('new-password-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const { error } = await sb.auth.updateUser({ password });

  if (error) {
    msgEl.textContent = 'Error al guardar. Solicita un nuevo enlace.';
    msgEl.classList.add('auth-msg--error');
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
    return;
  }

  msgEl.textContent = '¡Contraseña actualizada! Iniciando sesión...';
  msgEl.classList.add('auth-msg--success');

  setTimeout(async () => {
    const { data: { session: sbSess } } = await sb.auth.getSession();
    if (sbSess) {
      const meta = sbSess.user?.user_metadata || {};
      session = { nombre: meta.nombre || '', apellido: meta.apellido || '', telefono: meta.telefono || '', email: sbSess.user.email };
      renderServiceCards();
      showHomeView();
    } else {
      showLoginView();
    }
  }, 1500);
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
const VAPID_PUBLIC_KEY = 'BNPQ6uu96qGByYyOMdQTSTnjtcK2G9z89tNsiTCOSu8KBect8A5zq1r-cbJhqWBFvX6F9kiOEw_n3Md57Q25m5w';

async function subscribePush(manual = false) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (manual) alert('Tu navegador no soporta notificaciones push.');
    return false;
  }
  if (!session) return false;

  try {
    if (Notification.permission === 'denied') {
      if (manual) alert('Las notificaciones están bloqueadas. Actívalas desde los ajustes del navegador.');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;

    // Si hay suscripción con clave vieja (inválida), limpiarla
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const subKey = sub.options?.applicationServerKey;
      const newKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      // Comparar claves — si distinta, rehacer
      if (subKey && subKey.byteLength !== newKey.byteLength) {
        await sub.unsubscribe();
        sub = null;
      }
    }

    if (!sub) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Buscar cliente_id por auth_user_id
    const { data: { user } } = await sb.auth.getUser();
    const { data: cliente } = await sb
      .from('clientes')
      .select('id')
      .eq('auth_user_id', user?.id)
      .maybeSingle();

    // Serializar suscripción (PushSubscription no expone .keys directamente)
    const subJson = sub.toJSON();

    // Guardar suscripción directamente en Supabase
    const { error: upsertErr } = await sb
      .from('push_subscriptions')
      .upsert({
        barberia_id: barberId,
        cliente_id:  cliente?.id ?? null,
        endpoint:    subJson.endpoint,
        p256dh:      subJson.keys?.p256dh,
        auth:        subJson.keys?.auth,
        is_admin:    false
      }, { onConflict: 'endpoint' });

    if (upsertErr) throw new Error(upsertErr.message);

    if (manual) {
      const label = document.getElementById('profile-push-label');
      if (label) label.textContent = 'Notificaciones activas ✓';
    }
    return true;
  } catch (e) {
    console.error('Push subscribe fallido:', e);
    if (manual) alert('Error al activar notificaciones: ' + e.message);
    return false;
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
  const [,] = await Promise.all([loadConfig(), new Promise(r => setTimeout(r, 2000))]);

  // Ocultar pantalla de carga con fade-out
  viewLoading.classList.add('hidden');
  setTimeout(() => { viewLoading.style.display = 'none'; }, 320);

  // Leer params ANTES de limpiar la URL
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const hashType = hashParams.get('type');

  // Implicit flow recovery: hash contiene type=recovery → limpiar y mostrar nueva contraseña
  if (hashType === 'recovery') {
    recoveryHandled = true;
    history.replaceState(null, '', window.location.pathname);
    showNewPasswordView();
    return;
  }

  // Restaurar sesión Supabase existente.
  // IMPORTANTE: history.replaceState va DESPUÉS de getSession() para que Supabase
  // pueda intercambiar el code PKCE del query param (flujo recovery / signup).
  const { data: { session: sbSess } } = await sb.auth.getSession();
  history.replaceState(null, '', window.location.pathname);

  // Ceder el event loop para que onAuthStateChange (PASSWORD_RECOVERY en PKCE)
  // pueda dispararse y setear recoveryHandled antes de continuar.
  await Promise.resolve();

  // Si onAuthStateChange ya gestionó PASSWORD_RECOVERY, no navegar
  if (recoveryHandled) return;

  if (sbSess) {
    const meta = sbSess.user?.user_metadata || {};
    session = { nombre: meta.nombre || '', apellido: meta.apellido || '', telefono: meta.telefono || '', email: sbSess.user.email };
    renderServiceCards();
    showHomeView();
    setTimeout(subscribePush, 1500);
  } else {
    if (hashType === 'signup') {
      // Email confirmado pero sesión no activa → ir al login con mensaje
      showLoginView();
      const msgEl = document.getElementById('login-msg');
      msgEl.textContent = '✓ Email verificado. Ya puedes iniciar sesión.';
      msgEl.className = 'auth-msg auth-msg--success';
    } else {
      showLoginView();
    }
  }
})();
