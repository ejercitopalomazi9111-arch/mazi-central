/* El Pacto Roto — service worker: cachea todo para jugar offline. */
const CACHE = 'pactoroto-v1';
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
  // no cachear llamadas a las APIs de IA
  if (url.hostname.includes('groq.com') || url.hostname.includes('anthropic.com')) return;
  // cache-first, con relleno perezoso (arte incluido)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.status === 200 && (url.origin === location.origin)) {
        const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => hit))
  );
});
