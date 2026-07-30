/* El Pacto Roto — service worker.
   Código (HTML/JS/JSON): RED PRIMERO, con cache de respaldo → siempre te llega
   lo más nuevo con señal, y offline usa lo último que se guardó.
   Arte (imágenes) y librerías: CACHE PRIMERO → cargan al instante y pesan una vez. */
const CACHE = 'pactoroto-v3';
const CORE = [
  './', './index.html', './manifest.webmanifest', './arte/catalog.json',
  './js/vendor/anime.min.js', './js/data.js', './js/engine.js', './js/narrador.js',
  './js/magia.js', './js/combate.js', './js/crafting.js', './js/vida.js',
  './js/mundo.js', './js/ui.js', './js/main.js',
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // nunca tocar las APIs de IA
  if (url.hostname.includes('groq.com') || url.hostname.includes('anthropic.com')) return;
  const esCodigo = /\.(html|js|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
  const esArteOLib = url.pathname.includes('/arte/') || url.pathname.includes('/vendor/');
  if (esCodigo && !esArteOLib) {
    // RED PRIMERO
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // CACHE PRIMERO (arte, librerías)
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit))
    );
  }
});
