const CACHE_NAME = 'mypet-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // EXCEPCIÓN PARA STRIPE: No cachear peticiones de pagos
  if (event.request.url.includes('stripe.com') || event.request.url.includes('localhost:4242')) {
    return; // Deja que la petición pase directo al internet/servidor
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});