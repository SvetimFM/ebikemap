/* Atlas service worker (WORK_DEFINITION §3.3) — offline-capable.
   Precaches the app shell + data + heightfield so the core experience opens with
   no network after first load. Photos and CDN assets are cached-first at runtime.
   The map's vector basemap needs no tile server, so the flat map is fully offline. */
var VERSION = 'atlas-v17-2026-06-22';
var CORE = [
  './', 'index.html', 'styles/tokens.css', 'styles/app.css',
  'js/data.js', 'js/map-flat.js', 'js/view-switch.js', 'js/view-network.js',
  'js/elevation.js', 'js/about.js', 'js/field-card.js', 'js/overlay-nav.js', 'sw-register.js',
  'atlas-data.js', 'relief-3d.html', 'support.js', 'vendor/three.min.js', 'vendor/OrbitControls.js',
  'data/relief/satellite.jpg',
  'data/trails.json', 'data/stations.json', 'data/connections.json', 'data/transit.json',
  'data/basemap/ocean.geojson', 'data/basemap/lakes.geojson', 'data/basemap/parks.geojson', 'data/basemap/roads.geojson', 'data/basemap/contours.geojson',
  'data/relief/heightfield.json', 'data/relief/heightfield.png',
  'favicon.ico', 'favicon-32.png', 'icon-512.png', 'apple-touch-icon.png', 'og.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // add individually so one 404 doesn't abort the whole precache
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isPhoto = sameOrigin && /\/data\/photos\//.test(url.pathname);
  var isHeavy = sameOrigin && /\/data\/(relief|photos)\//.test(url.pathname);

  // Cache-first: photos, heightfield, and cross-origin CDN (leaflet/fonts/react/three).
  if (isHeavy || !sameOrigin) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return hit; });
    }));
    return;
  }
  // Same-origin app/data: stale-while-revalidate.
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
