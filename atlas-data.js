/* window.ATLAS for the 3D relief view (relief-3d.html). Loads the same canonical
   JSON the flat map uses — no duplicated data, no drift. The relief view polls
   for window.ATLAS, so async population is fine.
   HOME is null by design: the rider's home address is private and never ships;
   the relief view skips the home marker when HOME is null. */
(function () {
  var json = function (u) { return fetch(u).then(function (r) { return r.json(); }); };
  Promise.all([json('data/trails.json'), json('data/stations.json')])
    .then(function (res) {
      var trails = res[0], stations = res[1];
      window.ATLAS = {
        HOME: null,
        STATIONS: stations.map(function (s) { return [s.name, s.lat, s.lng, s.note]; }),
        TRAILS: trails,
      };
    })
    .catch(function (e) { console.error('[atlas-data] load failed:', e); });
})();
