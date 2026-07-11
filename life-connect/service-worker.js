const CACHE_NAME = 'lifeconnect-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const EMERGENCY_CACHE = 'emergency-data-v2';

// Assets críticos que deben cargar INSTANTÁNEAMENTE
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  // Iconos esenciales
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación: Precachear todo lo crítico
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_ASSETS)),
      caches.open(EMERGENCY_CACHE) // Cache especial para datos de emergencia
    ])
  );
  self.skipWaiting();
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== EMERGENCY_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Estrategia de fetch inteligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API calls (Network First con fallback a cache)
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // 2. Assets estáticos (CSS, JS, Imágenes) - Cache First
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // 3. HTML/Navegación - Stale While Revalidate (rápido + actualizado)
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

// Estrategias de caché optimizadas

// Cache First: Para assets estáticos (instantáneo)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('Fallo carga recurso estático:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First: Para APIs (datos frescos prioritarios)
async function networkFirstStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale While Revalidate: Para HTML (rápido pero actualizado)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Network with cache fallback
async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    return cached || new Response('Recurso no disponible offline');
  }
}

// Background Sync: Para enviar emergencias cuando vuelva la conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emergencias') {
    event.waitUntil(syncPendingEmergencies());
  }
});

async function syncPendingEmergencias() {
  // Aquí se sincronizarían emergencias guardadas en IndexedDB
  console.log('Sincronizando emergencias pendientes...');
}

// Push notifications (opcional, para alertas del centro de comando)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification('LifeConnect Pro', {
      body: data.message || 'Nueva alerta de emergencia',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'emergency-alert',
      requireInteraction: true
    })
  );
});
