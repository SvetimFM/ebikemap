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

  // Real-DEM topographic contour lines (optional layer). Inserted UNDER 'roads' so
  // trails / transit / roads always read on top. Zoom-gated + opacity-faded so the
  // metro overview stays clean and the terrain mesh reveals as you zoom in.
  if (A.BASEMAP.contours) {
    style.sources.contours = { type: 'geojson', data: A.BASEMAP.contours, attribution: 'Contours: Mapzen/Terrarium DEM (public domain)' };
    var contourLayers = [
      { id: 'contour', type: 'line', source: 'contours', filter: ['==', ['get', 'idx'], 0], minzoom: 11.5, layout: { 'line-join': 'round' },
        paint: { 'line-color': '#8a7a58', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 12.3, 0.32, 16, 0.36], 'line-width': ['interpolate', ['linear'], ['zoom'], 11.5, 0.4, 16, 0.9] } },
      { id: 'contour-index', type: 'line', source: 'contours', filter: ['==', ['get', 'idx'], 1], minzoom: 10.5, layout: { 'line-join': 'round' },
        paint: { 'line-color': '#d8c79e', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, 0, 11.2, 0.46, 16, 0.52], 'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 0.7, 16, 1.7] } },
    ];
    var roadsIdx = style.layers.findIndex(function (l) { return l.id === 'roads'; });
    style.layers.splice(roadsIdx, 0, contourLayers[0], contourLayers[1]);
  }

  var map = new maplibregl.Map({ container: 'map', style: style, center: [-122.235, 47.62], zoom: 9.25, minZoom: 8, maxZoom: 16, attributionControl: false, dragRotate: false, pitchWithRotate: false });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'MapLibre · © OpenStreetMap · Natural Earth' }), 'bottom-right');

  var stnMarkers = [], parkMarkers = [], labelMarkers = [];
  // Place labels — coordinates audited against real downtown/centre positions (2026-06-22).
  var LABELS = [
    ['water', 'PUGET SOUND', 47.635, -122.445], ['water', 'ELLIOTT BAY', 47.600, -122.360], ['water', 'LAKE WASHINGTON', 47.630, -122.255],
    ['water', 'LAKE UNION', 47.640, -122.337], ['water', 'LAKE SAMMAMISH', 47.585, -122.087], ['water', 'GREEN LK', 47.681, -122.330],
    ['city', 'SEATTLE', 47.606, -122.332], ['city', 'BALLARD', 47.668, -122.384], ['city', 'BEACON HILL', 47.578, -122.311],
    ['city', 'WEST SEATTLE', 47.576, -122.387], ['city', 'MERCER ISLAND', 47.570, -122.230], ['city', 'BELLEVUE', 47.610, -122.200],
    ['city', 'KIRKLAND', 47.678, -122.207], ['city', 'REDMOND', 47.674, -122.122], ['city', 'RENTON', 47.482, -122.210],
    ['city', 'KENT', 47.382, -122.234], ['city', 'TUKWILA', 47.465, -122.260], ['city', 'BOTHELL', 47.760, -122.205],
    ['city', 'SHORELINE', 47.756, -122.341], ['city', 'SAMMAMISH', 47.616, -122.036], ['city', 'ISSAQUAH', 47.531, -122.033],
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
  var PINICO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  /* ---------- "Open in maps" deep links — universal https forms (work on iOS app,
     Android app, and desktop web). PII-safe: the home-coord guard references the
     (null in production) window.ATLAS.HOME rather than embedding any literal home
     coordinate, so no private location ever appears in shipped code; it self-arms
     only if a private home is ever configured. Inputs are public trail fields. */
  function _distM(a, b, c, d) { var R = 6371000, k = Math.PI / 180, x = (d - b) * k * Math.cos(((a + c) / 2) * k), y = (c - a) * k; return R * Math.sqrt(x * x + y * y); }
  function _isPrivate(lat, lng) { var H = window.ATLAS && window.ATLAS.HOME; return H ? _distM(lat, lng, H[0], H[1]) <= 80 : false; }
  function _parseCoord(s) { if (typeof s !== 'string') return null; var bare = s.replace(/\(.*?\)\s*$/, '').trim(); var m = bare.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); if (!m) return null; var la = parseFloat(m[1]), lo = parseFloat(m[2]); if (isNaN(la) || isNaN(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) return null; return [la, lo]; }
  function trailLatLng(tr) {
    if (!tr) return null;
    var p = _parseCoord(tr.coord); // the named trailhead in coord is the best target for a line trail
    if (!p && tr.pt && tr.pt.length >= 2) p = [+tr.pt[0], +tr.pt[1]];
    if (!p && tr.path && tr.path[0] && tr.path[0].length >= 2) p = [+tr.path[0][0], +tr.path[0][1]];
    if (!p || isNaN(p[0]) || isNaN(p[1])) return null;
    var lat = Math.round(p[0] * 1e5) / 1e5, lng = Math.round(p[1] * 1e5) / 1e5;
    if (lat < 46.5 || lat > 48.5 || lng < -123.5 || lng > -120.5) return null; // sanity: Puget Sound region
    if (_isPrivate(lat, lng)) return null;
    return [lat, lng];
  }
  function buildMapButtons(tr) {
    var p = trailLatLng(tr); if (!p) return '';
    var lat = p[0], lng = p[1], q = encodeURIComponent(tr.name || 'Trailhead'), cq = encodeURIComponent(lat + ',' + lng);
    var apple = 'https://maps.apple.com/?q=' + q + '&ll=' + lat + ',' + lng;
    var goog = 'https://www.google.com/maps/search/?api=1&query=' + cq;
    var bike = 'https://www.google.com/maps/dir/?api=1&destination=' + cq + '&travelmode=bicycling';
    function a(href, ico, lbl, cls) { return '<a class="map-btn ' + cls + '" href="' + href + '" target="_blank" rel="noopener noreferrer">' + ico + '<span>' + lbl + '</span></a>'; }
    return '<div class="map-btns">' + a(apple, PINICO, 'Apple Maps', 'apl') + a(goog, PINICO, 'Google Maps', 'ggl') + a(bike, BIKEICO, 'Bike directions', 'bike') + '</div>';
  }

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
    var mapBtns = buildMapButtons(tr);
    if (mapBtns) h += '<div class="sec-label">Open in maps</div>' + mapBtns;
    // drop the data file's generic "Google Maps" link when we render the dedicated buttons (no dupes)
    var srcLinks = mapBtns ? tr.links.filter(function (l) { return !/^google\s*maps$/i.test(l[0]); }) : tr.links;
    if (srcLinks.length) {
      h += '<div class="sec-label">More &amp; sources</div><div class="links">';
      srcLinks.forEach(function (l) { h += '<a class="link" href="' + l[1] + '" target="_blank" rel="noopener">' + EXTICO + l[0] + '</a>'; });
      h += '</div>';
    }
    D.body.innerHTML = h; D.body.scrollTop = 0; D.panel.classList.add('open');
    if (window.AtlasOverlay) AtlasOverlay.push('detail', closeDetail); // back button closes the panel
    if (tr.elevation && window.AtlasElevation) window.AtlasElevation.attachScrubber(D.body, tr.elevation);
    D.body.querySelectorAll('a[data-goto]').forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); select(a.dataset.goto); }); });
    var fc = D.body.querySelector('[data-fieldcard]'); if (fc) fc.addEventListener('click', function () { if (window.__atlasFieldCard) window.__atlasFieldCard(fc.dataset.fieldcard); });
    var fl = D.body.querySelector('[data-fly]'); if (fl) fl.addEventListener('click', function () { if (window.__atlasView) window.__atlasView('3d'); });
  }
  function closeDetail() { D.panel.classList.remove('open'); clearHighlight(); activeId = null; document.querySelectorAll('.card').forEach(function (c) { c.classList.remove('active'); }); }
  document.getElementById('dClose').addEventListener('click', function () { closeDetail(); if (window.AtlasOverlay) AtlasOverlay.dismiss('detail'); });

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
    // station markers (the .pin element IS the marker — MapLibre owns its transform).
    // Each is hover- and tap-interactive: a styled popup with the station name + note.
    var stnPop = new maplibregl.Popup({ closeButton: false, closeOnClick: true, className: 'trail-pop stn-pop', offset: 12 });
    STATIONS.forEach(function (s) {
      var el = mk('<div class="body"></div>', 'pin stn'); el.style.cursor = 'pointer';
      var html = '<b>🚆 ' + s[0] + '</b>' + (s[3] ? '<div class="sub">' + s[3] + '</div>' : '');
      function show() { stnPop.setLngLat([s[2], s[1]]).setHTML(html).addTo(map); }
      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', function () { stnPop.remove(); });
      el.addEventListener('click', function (ev) { ev.stopPropagation(); show(); }); // tap (touch) reveals it
      var m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s[2], s[1]]).addTo(map);
      el.setAttribute('aria-label', 'Link station: ' + s[0] + (s[3] ? ' — ' + s[3] : '')); // after addTo so it isn't overwritten by MapLibre's default
      stnMarkers.push(m);
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
  var contourBtn = document.getElementById('contourBtn');
  if (contourBtn) {
    if (!A.BASEMAP.contours) { contourBtn.style.display = 'none'; }
    else {
      var contourOn = true;
      contourBtn.addEventListener('click', function () { contourOn = !contourOn; this.classList.toggle('on', contourOn); ['contour', 'contour-index'].forEach(function (lyr) { if (map.getLayer(lyr)) map.setLayoutProperty(lyr, 'visibility', contourOn ? 'visible' : 'none'); }); });
    }
  }

  document.getElementById('sheetHandle').addEventListener('click', function () {
    var sb = document.getElementById('sidebar'); var willExpand = !sb.classList.contains('expanded');
    sb.classList.toggle('expanded');
    if (window.AtlasOverlay) { // mobile bottom sheet → back button collapses it
      if (willExpand) AtlasOverlay.push('sidebar', function () { sb.classList.remove('expanded'); });
      else AtlasOverlay.dismiss('sidebar');
    }
  });

  function fixSize() { map.resize(); }
  window.addEventListener('load', function () { setTimeout(fixSize, 150); }); setTimeout(fixSize, 400); setTimeout(fixSize, 1000);
  if (window.ResizeObserver) new ResizeObserver(fixSize).observe(document.getElementById('mapwrap'));
  window.__atlasFlat = { map: map, fixSize: fixSize };
  window.__atlasMapButtons = buildMapButtons; // reused by the field card (shared PII guard)

  renderList();
}).catch(function (e) {
  console.error('[atlas] data load failed:', e);
  var l = document.getElementById('list'); if (l) l.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px;line-height:1.6">Could not load atlas data.<br>' + (e && e.message ? e.message : e) + '</div>';
});
