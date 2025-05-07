const CACHE_NAME = 'mainetti-solution-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon.png',
  '/service-worker.js'
];

// Fase di installazione: precaching dei file essenziali
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Forza l'attivazione immediata del service worker
        return self.skipWaiting();
      })
  );
});

// Fase di attivazione: pulizia cache obsolete
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminazione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prendi il controllo di tutti i client aperti senza reload
      return self.clients.claim();
    })
  );
});

// Strategia cache-first con fallback alla rete
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Ritorna la risposta dalla cache se esiste
        if (response) {
          return response;
        }
        
        // Altrimenti vai in rete
        return fetch(event.request)
          .then((response) => {
            // Controlla se abbiamo ricevuto una risposta valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la risposta perché è uno stream
            // Usa una copia per la cache e una per il browser
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // Se la rete fallisce e la richiesta è per una pagina HTML,
            // ritorna una pagina offline semplice
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Altrimenti ritorna un errore
            return new Response('Connessione offline. Riprova più tardi.');
          });
      })
  );
});
