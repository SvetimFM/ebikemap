/* Flat cartographic map — Leaflet over the hand-built offline vector basemap.
   Behaviour identical to the original monolith; data now comes from window.ATLAS
   (see js/data.js) instead of inline globals. */
window.ATLAS_READY.then(function (A) {
  var TRAILS = A.TRAILS, STATIONS = A.STATIONS, IMAGES = A.IMAGES;

  /* ===== map ===== */
  const map = L.map('map', { zoomControl: true, attributionControl: true, minZoom: 9, maxZoom: 17 }).setView([47.605, -122.235], 11);
  map.attributionControl.setPrefix('Leaflet · basemap: Natural Earth + OSM');

  const parksLayer = L.geoJSON(A.BASEMAP.parks, { interactive: false, style: { fillColor: '#21402c', fillOpacity: 1, color: '#2f5a3d', weight: 0.4 } });
  const oceanLayer = L.geoJSON(A.BASEMAP.ocean, { interactive: false, style: { fillColor: '#11313a', fillOpacity: 1, color: '#1d4651', weight: 0.7 } });
  const lakeLayer = L.geoJSON(A.BASEMAP.lakes, { interactive: false, style: { fillColor: '#11313a', fillOpacity: 1, color: '#23535f', weight: 0.7 } });
  const roadLayer = L.geoJSON(A.BASEMAP.roads, { interactive: false, style: { color: '#3c4d41', weight: 1.1, opacity: 0.6 } });
  parksLayer.addTo(map); oceanLayer.addTo(map); lakeLayer.addTo(map); roadLayer.addTo(map);
  parksLayer.bringToBack();

  let parksOn = true;
  document.getElementById('parkBtn').addEventListener('click', function () {
    parksOn = !parksOn; this.classList.toggle('on', parksOn);
    if (parksOn) { parksLayer.addTo(map); parksLayer.bringToBack(); } else map.removeLayer(parksLayer);
  });

  const LABELS = [
    ['water', 'PUGET SOUND', 47.640, -122.430], ['water', 'ELLIOTT BAY', 47.598, -122.372], ['water', 'LAKE WASHINGTON', 47.630, -122.255],
    ['water', 'LAKE UNION', 47.637, -122.333], ['water', 'LAKE SAMMAMISH', 47.585, -122.088], ['water', 'GREEN LK', 47.681, -122.329],
    ['city', 'SEATTLE', 47.607, -122.335], ['city', 'BALLARD', 47.668, -122.384], ['city', 'BEACON HILL', 47.578, -122.310],
    ['city', 'WEST SEATTLE', 47.576, -122.388], ['city', 'MERCER ISLAND', 47.567, -122.232], ['city', 'BELLEVUE', 47.610, -122.165],
    ['city', 'KIRKLAND', 47.685, -122.209], ['city', 'REDMOND', 47.673, -122.124], ['city', 'RENTON', 47.483, -122.197],
    ['city', 'KENT', 47.382, -122.215], ['city', 'TUKWILA', 47.462, -122.290], ['city', 'BOTHELL', 47.760, -122.205],
    ['city', 'SHORELINE', 47.756, -122.341], ['city', 'SAMMAMISH', 47.616, -122.040], ['city', 'ISSAQUAH', 47.530, -122.040],
    ['hood', 'KENMORE', 47.757, -122.244], ['hood', 'WOODINVILLE', 47.754, -122.163], ['hood', 'BURIEN', 47.470, -122.347], ['hood', 'DES MOINES', 47.402, -122.324]
  ];
  const labelMarkers = [];
  LABELS.forEach(function (a) {
    var type = a[0], txt = a[1], lat = a[2], lng = a[3];
    var cls = type === 'water' ? 'lbl water' : type === 'hood' ? 'lbl hood' : 'lbl';
    var m = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="' + cls + '">' + txt + '</div>', iconSize: [1, 1] }), interactive: false, keyboard: false }).addTo(map);
    labelMarkers.push({ m: m, type: type });
  });
  function updateLabels() { var z = map.getZoom(); labelMarkers.forEach(function (o) { var el = o.m.getElement(); if (!el) return; var show = o.type === 'water' ? z >= 9 : o.type === 'hood' ? z >= 12 : z >= 10; el.style.display = show ? 'block' : 'none'; }); }
  map.on('zoomend', updateLabels); updateLabels();

  const EBC = { ok: '#6cc06f', restricted: '#e8a33d', banned: '#d96b53' };

  const stnMarkers = [];
  STATIONS.forEach(function (s) {
    var m = L.marker([s[1], s[2]], { icon: L.divIcon({ className: '', html: '<div class="pin stn"><div class="body"></div></div>', iconSize: [11, 11], iconAnchor: [5, 5] }) }).addTo(map);
    m.bindTooltip("🚆 " + s[0] + " — " + s[3], { direction: 'top' }); stnMarkers.push(m);
  });
  let stnOn = true;
  document.getElementById('stnBtn').addEventListener('click', function () {
    stnOn = !stnOn; this.classList.toggle('on', stnOn);
    stnMarkers.forEach(function (m) { if (stnOn) m.addTo(map); else map.removeLayer(m); });
  });

  const layers = {};
  TRAILS.forEach(function (tr) {
    if (tr.geom === 'line') {
      var casing = L.polyline(tr.path, { color: '#0b150f', weight: 6, opacity: .55, lineCap: 'round', lineJoin: 'round' });
      var line = L.polyline(tr.path, { color: EBC[tr.eb], weight: 3.4, opacity: .95, lineCap: 'round', lineJoin: 'round', dashArray: tr.type === 'gravel' ? '7,7' : null });
      var grp = L.layerGroup([casing, line]).addTo(map);
      line.bindTooltip(tr.name, { sticky: true });
      line.on('click', function () { select(tr.id); }); casing.on('click', function () { select(tr.id); });
      layers[tr.id] = { kind: 'line', grp: grp, casing: casing, line: line };
    } else {
      var pcls = tr.type === 'park' ? 'pin park' : 'pin ' + tr.eb;
      var m = L.marker(tr.pt, { icon: L.divIcon({ className: '', html: '<div class="' + pcls + '" data-id="' + tr.id + '"><div class="body"><span class="ic">' + tr.icon + '</span></div></div>', iconSize: [25, 33], iconAnchor: [12, 33] }) }).addTo(map);
      m.bindTooltip(tr.name, { direction: 'top', offset: [0, -29] });
      m.on('click', function () { select(tr.id); });
      layers[tr.id] = { kind: 'point', marker: m };
    }
  });

  let activeId = null;
  function clearHighlight() {
    TRAILS.forEach(function (tr) {
      var L0 = layers[tr.id]; if (!L0) return;
      if (L0.kind === 'line') { L0.line.setStyle({ weight: 3.4, opacity: .95 }); L0.casing.setStyle({ weight: 6, opacity: .55 }); }
    });
    document.querySelectorAll('.pin').forEach(function (p) { p.classList.remove('sel'); });
  }
  function select(id) {
    var tr = TRAILS.find(function (t) { return t.id === id; }); if (!tr) return; activeId = id;
    clearHighlight();
    var L0 = layers[id];
    if (L0.kind === 'line') {
      L0.line.setStyle({ weight: 5.4, opacity: 1 }); L0.casing.setStyle({ weight: 9, opacity: .7 }); L0.line.bringToFront();
      map.flyToBounds(L.polyline(tr.path).getBounds().pad(0.25), { duration: .6 });
    } else {
      var pin = document.querySelector('.pin[data-id="' + id + '"]'); if (pin) pin.classList.add('sel');
      map.flyTo(tr.pt, Math.max(map.getZoom(), 13), { duration: .6 });
    }
    document.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('active', c.dataset.id === id); });
    renderDetail(tr);
  }

  const D = {
    panel: document.getElementById('detail'), hero: document.getElementById('dHeroImg'), credit: document.getElementById('dCredit'),
    kicker: document.getElementById('dKicker'), name: document.getElementById('dName'), loc: document.getElementById('dLoc'), body: document.getElementById('dBody')
  };
  const TYPELBL = { paved: 'Paved trail', gravel: 'Gravel / unpaved', mtb: 'Dirt / MTB park', park: 'Park / destination' };
  const EBLBL = { ok: 'E-bike OK', restricted: 'E-bike limited', banned: 'E-bike banned' };
  const EBHEAD = { ok: 'E-bikes allowed', restricted: 'E-bikes limited', banned: 'E-bikes prohibited' };
  const BIKEICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5L9 9l3-1 2 3h3"/></svg>';
  const EXTICO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3M14 4h6v6M10 14L20 4"/></svg>';
  function renderDetail(tr) {
    var im = tr.img && IMAGES[tr.img] ? IMAGES[tr.img] : null;
    if (im) {
      D.hero.innerHTML = '<img src="' + im.img + '" alt="' + tr.name + '">';
      if (im.src) { D.credit.href = im.src; D.credit.style.display = 'block'; } else D.credit.style.display = 'none';
    }
    else { D.hero.innerHTML = '<div class="ph">' + (tr.icon || '◆') + '</div>'; D.credit.style.display = 'none'; }
    D.kicker.innerHTML = '<span style="color:' + (tr.type === 'park' ? '#4fae6a' : EBC[tr.eb]) + '">◆ ' + TYPELBL[tr.type] + '</span>' + (tr.hidden ? '<span class="hidden-flag">★ hidden gem</span>' : '');
    D.name.textContent = tr.name; D.loc.textContent = tr.area + ' · ' + tr.manager;
    var h = '';
    h += '<div class="ebike-banner ' + tr.eb + '"><div class="ico">' + BIKEICO + '</div><div><div class="et">' + EBHEAD[tr.eb] + '</div><div class="ev">' + tr.ebrule + '</div></div></div>';
    h += '<div class="sec-label">At a glance</div><div class="stats"><div class="stat"><div class="v">' + tr.len + '</div><div class="k">Size / length</div></div><div class="stat"><div class="v" style="font-size:12.5px">' + tr.surface + '</div><div class="k">Surface</div></div><div class="stat"><div class="v" style="font-size:12.5px">' + tr.diff + '</div><div class="k">Character</div></div></div>';
    if (tr.elevation && window.AtlasElevation) h += window.AtlasElevation.profileHTML(tr.elevation);
    h += '<div class="sec-label">' + (tr.type === 'park' ? 'The spot' : 'The ride') + '</div><div class="prose">' + tr.blurb + '</div>';
    h += '<div class="sec-label">Connections</div><div class="kv"><div class="k">Links to</div><div class="v">' + tr.conn + '</div></div>';
    if (tr.status) h += '<div class="callout info"><b>2025–26 status:</b> ' + tr.status + '</div>';
    h += '<div class="coordbox">⌖ <b>' + tr.coord + '</b></div>';
    h += '<div class="sec-label">Maps &amp; sources</div><div class="links">';
    tr.links.forEach(function (l) { h += '<a class="link" href="' + l[1] + '" target="_blank" rel="noopener">' + EXTICO + l[0] + '</a>'; });
    h += '</div>';
    D.body.innerHTML = h; D.body.scrollTop = 0; D.panel.classList.add('open');
    if (tr.elevation && window.AtlasElevation) window.AtlasElevation.attachScrubber(D.body, tr.elevation);
  }
  document.getElementById('dClose').addEventListener('click', function () { D.panel.classList.remove('open'); clearHighlight(); document.querySelectorAll('.card').forEach(function (c) { c.classList.remove('active'); }); activeId = null; });

  let fType = 'all', fEb = 'all';
  function renderList() {
    var list = document.getElementById('list'); list.innerHTML = '';
    var shown = TRAILS.filter(function (t) {
      if (fType !== 'all' && t.type !== fType) return false;
      if (fEb !== 'all' && t.eb !== fEb) return false;
      return true;
    });
    document.getElementById('resultCount').textContent = shown.length + ' routes, parks & spots';
    document.getElementById('sheetLbl').textContent = '▲ ' + shown.length + ' routes, parks & spots';
    [['paved', 'Paved & interurban', 'g-paved'], ['gravel', 'Gravel & unpaved', 'g-gravel'], ['mtb', 'Dirt & MTB parks', 'g-mtb'], ['park', 'Parks & destinations', 'g-park']].forEach(function (g) {
      var items = shown.filter(function (t) { return t.type === g[0]; }); if (!items.length) return;
      var gh = document.createElement('div'); gh.className = 'grouphead ' + g[2]; gh.textContent = g[1] + ' · ' + items.length; list.appendChild(gh);
      items.forEach(function (tr) {
        var c = document.createElement('div'); c.className = 'card eb-' + tr.eb + (tr.id === activeId ? ' active' : ''); c.dataset.id = tr.id;
        var flag = tr.home ? '<span class="hidden-flag" style="color:var(--rail)">⌂ home</span>' : (tr.hidden ? '<span class="hidden-flag">★ hidden</span>' : '');
        var su = tr.geom === 'line' ? (tr.type === 'gravel' ? 'gravel' : 'paved') : (tr.type === 'park' ? 'park' : 'dirt');
        var im = tr.img && IMAGES[tr.img] ? IMAGES[tr.img] : null;
        var html = '<div class="card-strip"></div>';
        if (im) html += '<img class="card-thumb" src="' + im.img + '" alt="' + tr.name + '" loading="lazy">';
        html += '<div class="card-pad"><div class="card-top"><div><div class="card-name">' + tr.name + '</div><div class="card-loc">' + tr.area + '</div></div>' +
          '<div class="card-len"><b>' + tr.len + '</b><br><span class="su">' + su + '</span></div></div>' +
          '<div class="card-meta"><span class="ebadge ' + tr.eb + '"><span class="d"></span>' + EBLBL[tr.eb] + '</span>' + flag + '</div></div>';
        c.innerHTML = html;
        c.addEventListener('click', function () { select(tr.id); if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('expanded'); });
        list.appendChild(c);
      });
    });
  }
  document.querySelectorAll('#typeseg button').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#typeseg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); fType = b.dataset.type; renderList(); }); });
  document.querySelectorAll('#ebseg button').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#ebseg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); fEb = b.dataset.eb; renderList(); }); });
  document.getElementById('sheetHandle').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('expanded'); });

  function fixSize() { map.invalidateSize(true); }
  window.addEventListener('load', function () { setTimeout(fixSize, 150); }); setTimeout(fixSize, 300); setTimeout(fixSize, 900);
  if (window.ResizeObserver) new ResizeObserver(fixSize).observe(document.getElementById('mapwrap'));
  // expose for the view-switch (invalidate size when returning to the flat map)
  window.__atlasFlat = { map: map, fixSize: fixSize };

  renderList();
}).catch(function (e) {
  console.error('[atlas] data load failed:', e);
  var l = document.getElementById('list');
  if (l) l.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px;line-height:1.6">Could not load atlas data.<br>' + (e && e.message ? e.message : e) + '</div>';
});
