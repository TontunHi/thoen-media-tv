var CACHE_NAME = 'thoen-tv-cache-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'PRECACHE_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function (cache) {
        return Promise.all(
          data.urls.map(function (url) {
            return cache.match(url).then(function (existing) {
              if (existing) return null;
              return fetch(url, { credentials: 'same-origin' })
                .then(function (res) {
                  if (res && res.status === 200) {
                    return cache.put(url, res.clone());
                  }
                  return null;
                })
                .catch(function () {
                  return null;
                });
            });
          })
        );
      })
    );
  }
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf('/uploads/') === 0 || url.pathname === '/vendor/hls.min.js') {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (res) {
            if (res && res.status === 200) {
              cache.put(req, res.clone());
            }
            return res;
          });
        });
      })
    );
    return;
  }

  if (url.pathname.indexOf('/api/tvs/public/') === 0 || url.pathname.indexOf('/tv/') === 0) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return caches.match(req);
        })
    );
  }
});
