/* Atlas data loader. Fetches the canonical JSON (the single source of truth a
   human edits) and exposes window.ATLAS once. Consumers await window.ATLAS_READY.
   STATIONS are kept as [name,lat,lng,note] tuples for back-compat with both views.
   HOME is null by design — the rider's home address is private and never ships. */
window.ATLAS_READY = (async function () {
  const json = (u) => fetch(u).then((r) => {
    if (!r.ok) throw new Error(u + ' → HTTP ' + r.status);
    return r.json();
  });
  const [trails, stations, ocean, lakes, parks, roads] = await Promise.all([
    json('data/trails.json'),
    json('data/stations.json'),
    json('data/basemap/ocean.geojson'),
    json('data/basemap/lakes.geojson'),
    json('data/basemap/parks.geojson'),
    json('data/basemap/roads.geojson'),
  ]);
  window.ATLAS = {
    HOME: null,
    STATIONS: stations.map((s) => [s.name, s.lat, s.lng, s.note]),
    TRAILS: trails,
    BASEMAP: { ocean, lakes, parks, roads },
    IMAGES: window.ATLAS_IMAGES || {},
  };
  return window.ATLAS;
})();
