/* Flat cartographic map — MapLibre GL JS over the hand-built offline vector
   basemap, with a real hillshade layer rendered from Terrarium raster-DEM tiles
   (NW 315° light, low exaggeration — matches the 3D relief). The network view
   stays on Leaflet; this view is GPU-rendered with data-driven styling.
   Detail panel, list, filters, color-by, transit, connections — all preserved. */
window.ATLAS_READY.then(function (A) {
  var TRAILS = A.TRAILS, STATIONS = A.STATIONS;
  var EBC = { ok: '#6cc06f', restricted: '#e8a33d', banned: '#d96b53' };
  var ll = function (p) { return [p[1], p[0]]; }; // [lat,lng] -> [lng,lat]

  /* ---------- GeoJSON sources ---------- */
  var lineTrails = TRAILS.filter(function (t) { return t.geom === 'line'; });
  var trailsGeo = { type: 'FeatureCollection', features: lineTrails.map(function (t) {
    return { type: 'Feature', id: t.id, properties: { id: t.id, eb: t.eb, type: t.type, grade: t.elevation ? t.elevation.maxGradePct : -1 }, geometry: { type: 'LineString', coordinates: t.path.map(ll) } };
  }) };
  var transitGeo = { type: 'FeatureCollection', features: (A.TRANSIT && A.TRANSIT.lines || []).map(function (lnn) {
    return { type: 'Feature', properties: { ref: lnn.ref }, geometry: { type: 'LineString', coordinates: lnn.path.map(ll) } };
  }) };

  var ebExpr = ['match', ['get', 'eb'], 'ok', EBC.ok, 'restricted', EBC.restricted, 'banned', EBC.banned, EBC.ok];
  var slopeExpr = ['case', ['<', ['get', 'grade'], 0], '#5b6b5f', ['<=', ['get', 'grade'], 3], '#6cc06f', ['<=', ['get', 'grade'], 7], '#e9a93c', '#d96b53'];
  var surfExpr = ['match', ['get', 'type'], 'gravel', '#e9a93c', 'mtb', '#d96b53', '#6cc06f'];
  function colorExpr(mode) { return mode === 'slope' ? slopeExpr : mode === 'surface' ? surfExpr : ebExpr; }
  var colorMode = 'eb';

  var style = {
    version: 8,
    sources: {
      dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Elevation: Mapzen/Terrarium (public domain)' },
      ocean: { type: 'geojson', data: A.BASEMAP.ocean }, lakes: { type: 'geojson', data: A.BASEMAP.lakes },
      parksrc: { type: 'geojson', data: A.BASEMAP.parks }, roads: { type: 'geojson', data: A.BASEMAP.roads },
      trails: { type: 'geojson', data: trailsGeo, promoteId: 'id' }, transit: { type: 'geojson', data: transitGeo },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#13241a' } },
      { id: 'hillshade', type: 'hillshade', source: 'dem', paint: { 'hillshade-illumination-direction': 315, 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#050f0a', 'hillshade-highlight-color': '#3c5e47', 'hillshade-accent-color': '#0a1c13' } },
      { id: 'ocean', type: 'fill', source: 'ocean', paint: { 'fill-color': '#11313a', 'fill-opacity': 0.9 } },
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': '#11313a', 'fill-opacity': 0.9 } },
      { id: 'parks', type: 'fill', source: 'parksrc', paint: { 'fill-color': '#21402c', 'fill-opacity': 0.5 } },
      { id: 'roads', type: 'line', source: 'roads', paint: { 'line-color': '#3c4d41', 'line-opacity': 0.45, 'line-width': 1 } },
      { id: 'transit-casing', type: 'line', source: 'transit', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#0b150f', 'line-width': 5, 'line-opacity': 0.5 } },
      { id: 'transit', type: 'line', source: 'transit', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#b58ce0', 'line-width': 2.2, 'line-opacity': 0.9, 'line-dasharray': [1, 2.4] } },
      { id: 'trail-casing', type: 'line', source: 'trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0b150f', 'line-width': ['case', ['boolean', ['feature-state', 'active'], false], 9, 6], 'line-opacity': 0.6 } },
      { id: 'trail-line', type: 'line', source: 'trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': colorExpr('eb'), 'line-width': ['case', ['boolean', ['feature-state', 'active'], false], 5.4, 3.4], 'line-opacity': 0.96 } },
    ],
  };

  var map = new maplibregl.Map({ container: 'map', style: style, center: [-122.235, 47.62], zoom: 9.25, minZoom: 8, maxZoom: 16, attributionControl: false, dragRotate: false, pitchWithRotate: false });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'MapLibre · © OpenStreetMap · Natural Earth' }), 'bottom-right');

  var stnMarkers = [], parkMarkers = [], labelMarkers = [];
  var LABELS = [
    ['water', 'PUGET SOUND', 47.640, -122.430], ['water', 'ELLIOTT BAY', 47.598, -122.372], ['water', 'LAKE WASHINGTON', 47.630, -122.255],
    ['water', 'LAKE UNION', 47.637, -122.333], ['water', 'LAKE SAMMAMISH', 47.585, -122.088], ['water', 'GREEN LK', 47.681, -122.329],
    ['city', 'SEATTLE', 47.607, -122.335], ['city', 'BALLARD', 47.668, -122.384], ['city', 'BEACON HILL', 47.578, -122.310],
    ['city', 'WEST SEATTLE', 47.576, -122.388], ['city', 'MERCER ISLAND', 47.567, -122.232], ['city', 'BELLEVUE', 47.610, -122.165],
    ['city', 'KIRKLAND', 47.685, -122.209], ['city', 'REDMOND', 47.673, -122.124], ['city', 'RENTON', 47.483, -122.197],
    ['city', 'KENT', 47.382, -122.215], ['city', 'TUKWILA', 47.462, -122.290], ['city', 'BOTHELL', 47.760, -122.205],
    ['city', 'SHORELINE', 47.756, -122.341], ['city', 'SAMMAMISH', 47.616, -122.040], ['city', 'ISSAQUAH', 47.530, -122.040],
    ['hood', 'KENMORE', 47.757, -122.244], ['hood', 'WOODINVILLE', 47.754, -122.163], ['hood', 'BURIEN', 47.470, -122.347], ['hood', 'DES MOINES', 47.402, -122.324],
  ];
  function mk(html, cls) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }

  var activeId = null;
  function clearHighlight() {
    if (activeId) { try { map.setFeatureState({ source: 'trails', id: activeId }, { active: false }); } catch (e) {} }
    document.querySelectorAll('.pin').forEach(function (p) { p.classList.remove('sel'); });
  }
  function select(id) {
    var tr = TRAILS.find(function (t) { return t.id === id; }); if (!tr) return; activeId = id;
    clearHighlight(); activeId = id;
    if (tr.geom === 'line') {
      try { map.setFeatureState({ source: 'trails', id: id }, { active: true }); } catch (e) {}
      var b = new maplibregl.LngLatBounds(); tr.path.forEach(function (p) { b.extend(ll(p)); });
      map.fitBounds(b, { padding: 70, duration: 700, maxZoom: 14 });
    } else {
      var pin = document.querySelector('.pin[data-id="' + id + '"]'); if (pin) pin.classList.add('sel');
      map.flyTo({ center: ll(tr.pt), zoom: Math.max(map.getZoom(), 13.2), duration: 700 });
    }
    document.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('active', c.dataset.id === id); });
    renderDetail(tr);
  }
  window.__atlasSelect = function (id) { try { select(id); } catch (e) {} };

  /* ---------- detail panel (DOM, engine-agnostic) ---------- */
  var D = { panel: document.getElementById('detail'), hero: document.getElementById('dHeroImg'), credit: document.getElementById('dCredit'), kicker: document.getElementById('dKicker'), name: document.getElementById('dName'), loc: document.getElementById('dLoc'), body: document.getElementById('dBody') };
  var TYPELBL = { paved: 'Paved trail', gravel: 'Gravel / unpaved', mtb: 'Dirt / MTB park', park: 'Park / destination' };
  var EBLBL = { ok: 'E-bike OK', restricted: 'E-bike limited', banned: 'E-bike banned' };
  var EBHEAD = { ok: 'E-bikes allowed', restricted: 'E-bikes limited', banned: 'E-bikes prohibited' };
  var BIKEICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5L9 9l3-1 2 3h3"/></svg>';
  var EXTICO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3M14 4h6v6M10 14L20 4"/></svg>';
  function renderDetail(tr) {
    var ph = tr.photos && tr.photos[0] ? tr.photos[0] : null;
    if (ph) {
      D.hero.innerHTML = '<img src="' + ph.url + '" alt="' + tr.name + '" loading="lazy">';
      D.credit.href = ph.sourceUrl || (ph.licenseUrl || '#');
      D.credit.innerHTML = '📷 ' + (ph.credit || 'source') + (ph.license ? ' · ' + ph.license : '');
      D.credit.title = (ph.credit || '') + (ph.license ? ' · ' + ph.license : ''); D.credit.style.display = 'block';
    } else { D.hero.innerHTML = '<div class="ph">' + (tr.icon || '◆') + '</div>'; D.credit.style.display = 'none'; }
    D.kicker.innerHTML = '<span style="color:' + (tr.type === 'park' ? '#4fae6a' : EBC[tr.eb]) + '">◆ ' + TYPELBL[tr.type] + '</span>' + (tr.hidden ? '<span class="hidden-flag">★ hidden gem</span>' : '');
    D.name.textContent = tr.name; D.loc.textContent = tr.area + ' · ' + tr.manager;
    var h = '';
    h += '<div class="ebike-banner ' + tr.eb + '"><div class="ico">' + BIKEICO + '</div><div><div class="et">' + EBHEAD[tr.eb] + '</div><div class="ev">' + tr.ebrule + '</div></div></div>';
    h += '<div class="d-actions"><button class="d-action" type="button" data-fieldcard="' + tr.id + '">⎙ Field card</button>' + (tr.geom === 'line' ? '<button class="d-action ghost" type="button" data-fly="' + tr.id + '">▶ Take this trail (3D)</button>' : '') + '</div>';
    h += '<div class="sec-label">At a glance</div><div class="stats"><div class="stat"><div class="v">' + tr.len + '</div><div class="k">Size / length</div></div><div class="stat"><div class="v" style="font-size:12.5px">' + tr.surface + '</div><div class="k">Surface</div></div><div class="stat"><div class="v" style="font-size:12.5px">' + tr.diff + '</div><div class="k">Character</div></div></div>';
    if (tr.elevation && window.AtlasElevation) h += window.AtlasElevation.profileHTML(tr.elevation);
    h += '<div class="sec-label">' + (tr.type === 'park' ? 'The spot' : 'The ride') + '</div><div class="prose">' + tr.blurb + '</div>';
    h += '<div class="sec-label">Connections</div><div class="kv"><div class="k">Links to</div><div class="v">' + tr.conn + '</div></div>';
    if (tr.connections && tr.connections.length) {
      h += '<div class="links">';
      tr.connections.forEach(function (cn) { var o = TRAILS.find(function (t) { return t.id === cn.to; }); if (!o) return; h += '<a class="link" data-goto="' + cn.to + '" href="#" title="' + cn.label + '">↳ ' + o.name + '</a>'; });
      h += '</div>';
    }
    if (tr.status) h += '<div class="callout info"><b>2025–26 status:</b> ' + tr.status + '</div>';
    h += '<div class="coordbox">⌖ <b>' + tr.coord + '</b></div>';
    h += '<div class="sec-label">Maps &amp; sources</div><div class="links">';
    tr.links.forEach(function (l) { h += '<a class="link" href="' + l[1] + '" target="_blank" rel="noopener">' + EXTICO + l[0] + '</a>'; });
    h += '</div>';
    D.body.innerHTML = h; D.body.scrollTop = 0; D.panel.classList.add('open');
    if (tr.elevation && window.AtlasElevation) window.AtlasElevation.attachScrubber(D.body, tr.elevation);
    D.body.querySelectorAll('a[data-goto]').forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); select(a.dataset.goto); }); });
    var fc = D.body.querySelector('[data-fieldcard]'); if (fc) fc.addEventListener('click', function () { if (window.__atlasFieldCard) window.__atlasFieldCard(fc.dataset.fieldcard); });
    var fl = D.body.querySelector('[data-fly]'); if (fl) fl.addEventListener('click', function () { if (window.__atlasView) window.__atlasView('3d'); });
  }
  document.getElementById('dClose').addEventListener('click', function () { D.panel.classList.remove('open'); clearHighlight(); activeId = null; document.querySelectorAll('.card').forEach(function (c) { c.classList.remove('active'); }); });

  /* ---------- list (DOM) ---------- */
  var fType = 'all', fEb = 'all';
  function visible(t) { if (fType !== 'all' && t.type !== fType) return false; if (fEb !== 'all' && t.eb !== fEb) return false; return true; }
  function renderList() {
    var list = document.getElementById('list'); list.innerHTML = '';
    var shown = TRAILS.filter(visible);
    document.getElementById('resultCount').textContent = shown.length + ' routes, parks & spots';
    document.getElementById('sheetLbl').textContent = '▲ ' + shown.length + ' routes, parks & spots';
    [['paved', 'Paved & interurban', 'g-paved'], ['gravel', 'Gravel & unpaved', 'g-gravel'], ['mtb', 'Dirt & MTB parks', 'g-mtb'], ['park', 'Parks & destinations', 'g-park']].forEach(function (g) {
      var items = shown.filter(function (t) { return t.type === g[0]; }); if (!items.length) return;
      var gh = document.createElement('div'); gh.className = 'grouphead ' + g[2]; gh.textContent = g[1] + ' · ' + items.length; list.appendChild(gh);
      items.forEach(function (tr) {
        var c = document.createElement('div'); c.className = 'card eb-' + tr.eb + (tr.id === activeId ? ' active' : ''); c.dataset.id = tr.id;
        c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', tr.name + ' — ' + EBLBL[tr.eb] + (tr.elevation ? ', ' + tr.elevation.distanceMi + ' miles' : ''));
        c.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(tr.id); } });
        var flag = tr.hidden ? '<span class="hidden-flag">★ hidden</span>' : '';
        var su = tr.geom === 'line' ? (tr.type === 'gravel' ? 'gravel' : 'paved') : (tr.type === 'park' ? 'park' : 'dirt');
        var ph = tr.photos && tr.photos[0] ? tr.photos[0] : null;
        var html = '<div class="card-strip"></div>';
        if (ph) html += '<img class="card-thumb" src="' + ph.url + '" alt="' + tr.name + '" loading="lazy">';
        html += '<div class="card-pad"><div class="card-top"><div><div class="card-name">' + tr.name + '</div><div class="card-loc">' + tr.area + '</div></div>' +
          '<div class="card-len"><b>' + tr.len + '</b><br><span class="su">' + su + '</span></div></div>' +
          '<div class="card-meta"><span class="ebadge ' + tr.eb + '"><span class="d"></span>' + EBLBL[tr.eb] + '</span>' + flag + '</div></div>';
        c.innerHTML = html;
        c.addEventListener('click', function () { select(tr.id); if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('expanded'); });
        list.appendChild(c);
      });
    });
  }

  /* ---------- map-load: markers, interactions, controls ---------- */
  map.on('load', function () {
    // station markers (the .pin element IS the marker — MapLibre owns its transform)
    STATIONS.forEach(function (s) {
      var el = mk('<div class="body"></div>', 'pin stn'); el.title = '🚆 ' + s[0] + ' — ' + s[3];
      stnMarkers.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s[2], s[1]]).addTo(map));
    });
    // point trails (parks/mtb) markers
    TRAILS.filter(function (t) { return t.geom !== 'line'; }).forEach(function (tr) {
      var el = mk('<div class="body"><span class="ic">' + (tr.icon || '') + '</span></div>', tr.type === 'park' ? 'pin park' : 'pin ' + tr.eb);
      el.dataset.id = tr.id; el.style.cursor = 'pointer'; el.title = tr.name;
      el.addEventListener('click', function () { select(tr.id); });
      parkMarkers.push({ marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(ll(tr.pt)).addTo(map), trail: tr });
    });
    // place labels (non-interactive)
    LABELS.forEach(function (a) {
      var el = mk(a[1], a[0] === 'water' ? 'lbl water' : a[0] === 'hood' ? 'lbl hood' : 'lbl');
      labelMarkers.push({ m: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([a[3], a[2]]).addTo(map), type: a[0] });
    });
    function updateLabels() { var z = map.getZoom(); labelMarkers.forEach(function (o) { var el = o.m.getElement(); var show = o.type === 'water' ? z >= 8.5 : o.type === 'hood' ? z >= 11.5 : z >= 9.5; el.style.display = show ? 'block' : 'none'; }); }
    map.on('zoom', updateLabels); updateLabels();

    // trail interactions
    var hoverPop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'trail-pop', offset: 8 });
    map.on('mousemove', 'trail-line', function (e) {
      map.getCanvas().style.cursor = 'pointer';
      var f = e.features[0]; var tr = TRAILS.find(function (t) { return t.id === f.properties.id; });
      if (tr) hoverPop.setLngLat(e.lngLat).setHTML('<b>' + tr.name + '</b>').addTo(map);
    });
    map.on('mouseleave', 'trail-line', function () { map.getCanvas().style.cursor = ''; hoverPop.remove(); });
    map.on('click', 'trail-line', function (e) { select(e.features[0].properties.id); });

    applyMapFilter();
    fixSize();
  });

  /* ---------- filters / color / toggles ---------- */
  function applyMapFilter() {
    var f = ['all'];
    if (fType !== 'all') f.push(['==', ['get', 'type'], fType]);
    if (fEb !== 'all') f.push(['==', ['get', 'eb'], fEb]);
    if (map.getLayer('trail-line')) { map.setFilter('trail-line', f); map.setFilter('trail-casing', f); }
    parkMarkers.forEach(function (o) { o.marker.getElement().style.display = visible(o.trail) ? '' : 'none'; });
  }
  function recolor() { if (map.getLayer('trail-line')) map.setPaintProperty('trail-line', 'line-color', colorExpr(colorMode)); }

  document.querySelectorAll('#colorseg button').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#colorseg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); colorMode = b.dataset.color; recolor(); }); });
  document.querySelectorAll('#typeseg button').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#typeseg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); fType = b.dataset.type; renderList(); applyMapFilter(); }); });
  document.querySelectorAll('#ebseg button').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#ebseg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); fEb = b.dataset.eb; renderList(); applyMapFilter(); }); });

  var parksOn = true;
  document.getElementById('parkBtn').addEventListener('click', function () { parksOn = !parksOn; this.classList.toggle('on', parksOn); if (map.getLayer('parks')) map.setLayoutProperty('parks', 'visibility', parksOn ? 'visible' : 'none'); });
  var stnOn = true;
  document.getElementById('stnBtn').addEventListener('click', function () { stnOn = !stnOn; this.classList.toggle('on', stnOn); stnMarkers.forEach(function (m) { m.getElement().style.display = stnOn ? '' : 'none'; }); });
  var railOn = true;
  document.getElementById('railBtn').addEventListener('click', function () { railOn = !railOn; this.classList.toggle('on', railOn); ['transit', 'transit-casing'].forEach(function (lyr) { if (map.getLayer(lyr)) map.setLayoutProperty(lyr, 'visibility', railOn ? 'visible' : 'none'); }); });
  var hillOn = true;
  document.getElementById('hillBtn').addEventListener('click', function () { hillOn = !hillOn; this.classList.toggle('on', hillOn); if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', hillOn ? 'visible' : 'none'); });

  document.getElementById('sheetHandle').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('expanded'); });

  function fixSize() { map.resize(); }
  window.addEventListener('load', function () { setTimeout(fixSize, 150); }); setTimeout(fixSize, 400); setTimeout(fixSize, 1000);
  if (window.ResizeObserver) new ResizeObserver(fixSize).observe(document.getElementById('mapwrap'));
  window.__atlasFlat = { map: map, fixSize: fixSize };

  renderList();
}).catch(function (e) {
  console.error('[atlas] data load failed:', e);
  var l = document.getElementById('list'); if (l) l.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px;line-height:1.6">Could not load atlas data.<br>' + (e && e.message ? e.message : e) + '</div>';
});
