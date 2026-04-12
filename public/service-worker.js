const CACHE_NAME = 'barber-pwa-v12.5b';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

// Instalar: cachear assets estaticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // Activar inmediatamente sin esperar confirmación
});

// Activar: limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first para HTML, cache first para assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Dev local: nunca cachear
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;

  // API n8n y Supabase: siempre red
  if (url.hostname.includes('n8n.novaia.cat')) return;
  if (url.hostname.includes('supabase.co')) return;

  // HTML (navigate): network first → siempre version fresca
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // CSS, JS, iconos: cache first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notifications
self.addEventListener('push', event => {
  let data = { title: 'Barberia', body: 'Tienes un mensaje nuevo' };
  try { data = event.data.json(); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'Barberia', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200]
    })
  );
});

// Mensaje desde la app: activar nuevo SW inmediatamente
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Click en notificacion: abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
