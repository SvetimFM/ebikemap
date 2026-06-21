/* Network view (WORK_DEFINITION §8.5) — the trails as a routable system.
   Geographic node-link over a dim basemap: nodes = trails at their centroids
   (size ∝ length, colour by e-bike status), edges = connections (solid
   "continues as" / dashed "links via"), Link light rail drawn underneath.
   Clicking a node opens that trail in the flat map. Lazy-initialised on first
   activation. */
(function () {
  var inited = false, map = null;
  function centroid(t) {
    if (t.geom === 'line' && t.path && t.path.length) return t.path[Math.floor(t.path.length / 2)];
    if (t.pt) return t.pt;
    if (t.path && t.path[0]) return t.path[0];
    return null;
  }
  function lengthMi(t) {
    if (t.elevation && t.elevation.distanceMi) return t.elevation.distanceMi;
    if (t.geom !== 'line' || !t.path) return 0;
    var R = Math.PI / 180, s = 0;
    for (var i = 1; i < t.path.length; i++) { var a = t.path[i - 1], b = t.path[i]; var x = Math.sin((b[0] - a[0]) * R / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin((b[1] - a[1]) * R / 2) ** 2; s += 6371 * 2 * Math.asin(Math.sqrt(x)); }
    return s * 0.621;
  }
  var EBC = { ok: '#6cc06f', restricted: '#e8a33d', banned: '#d96b53' };

  function init() {
    if (inited) return; inited = true;
    var A = window.ATLAS;
    map = L.map('netmap', { zoomControl: true, attributionControl: true, minZoom: 9, maxZoom: 15 }).setView([47.6, -122.2], 10);
    map.attributionControl.setPrefix('Network · OSM');
    // dim basemap
    L.geoJSON(A.BASEMAP.ocean, { interactive: false, style: { fillColor: '#0c2026', fillOpacity: 1, color: '#13343c', weight: .5 } }).addTo(map);
    L.geoJSON(A.BASEMAP.lakes, { interactive: false, style: { fillColor: '#0c2026', fillOpacity: 1, color: '#16414a', weight: .5 } }).addTo(map);
    L.geoJSON(A.BASEMAP.parks, { interactive: false, style: { fillColor: '#16291d', fillOpacity: 1, color: 'transparent', weight: 0 } }).addTo(map);

    // transit underneath
    if (A.TRANSIT && A.TRANSIT.lines) A.TRANSIT.lines.forEach(function (ln) {
      L.polyline(ln.path, { color: '#b58ce0', weight: 1.6, opacity: .5, dashArray: '1,5', interactive: false }).addTo(map);
    });

    // centroids
    var cen = {};
    A.TRAILS.forEach(function (t) { var c = centroid(t); if (c) cen[t.id] = c; });

    // edges (dedup undirected)
    var seen = {};
    (Object.keys(A.CONNECTIONS || {})).forEach(function (id) {
      (A.CONNECTIONS[id] || []).forEach(function (e) {
        var k = id < e.to ? id + '|' + e.to : e.to + '|' + id;
        if (seen[k]) return; seen[k] = 1;
        var a = cen[id], b = cen[e.to]; if (!a || !b) return;
        var solid = e.label === 'continues as';
        L.polyline([a, b], { color: solid ? '#f2c879' : '#9aa89c', weight: solid ? 2.2 : 1.5, opacity: solid ? .8 : .55, dashArray: solid ? null : '4,5', interactive: false }).addTo(map);
      });
    });

    // nodes
    A.TRAILS.forEach(function (t) {
      var c = cen[t.id]; if (!c) return;
      var mi = lengthMi(t);
      var r = t.geom === 'line' ? Math.max(6, Math.min(17, 5 + Math.sqrt(mi) * 2.6)) : 6;
      var col = t.type === 'park' ? '#4fae6a' : (EBC[t.eb] || '#6cc06f');
      var icon = L.divIcon({ className: '', html: '<div class="net-node" style="width:' + (r * 2) + 'px;height:' + (r * 2) + 'px;background:' + col + '"></div>', iconSize: [r * 2, r * 2], iconAnchor: [r, r] });
      var m = L.marker(c, { icon: icon }).addTo(map);
      m.bindTooltip(t.name + (mi ? ' · ' + mi.toFixed(1) + ' mi' : ''), { direction: 'top' });
      m.on('click', function () { if (window.__atlasView) window.__atlasView('flat'); if (window.__atlasSelect) setTimeout(function () { window.__atlasSelect(t.id); }, 80); });
    });
  }
  window.__atlasNet = { init: init, fixSize: function () { if (map) map.invalidateSize(true); } };
})();
