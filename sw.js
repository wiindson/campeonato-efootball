const CACHE = 'ef-cup-v10-security';
const ASSETS = [
  './',
  './index.html',
  './online.html',
  './styles.css',
  './app2.js',
  './online.js',
  './config.js',
  './visuals.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/teams/portugal.svg',
  './assets/teams/franca.svg',
  './assets/teams/inglaterra.svg',
  './assets/teams/brasil.svg',
  './assets/teams/japao.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./online.html') : Response.error()))
  );
});
