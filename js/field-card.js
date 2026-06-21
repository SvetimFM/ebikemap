/* Field card (WORK_DEFINITION §8.7) — a one-page, print-first, offline single-
   trail card: name, locator map, elevation ribbon, key stats, e-bike rule,
   surface, manager, status, trailhead coordinates, live link. Opens as an
   overlay; the print stylesheet (app.css @media print) isolates the card. */
(function () {
  var EBHEAD = { ok: 'E-bikes allowed', restricted: 'E-bikes limited', banned: 'E-bikes prohibited' };
  function locatorSvg(t) {
    // mini locator: the trail path (or point) over the metro bbox
    var BB = [-122.46, 47.30, -121.95, 47.88]; // w,s,e,n metro
    var W = 220, H = 240, pad = 10;
    var sx = function (lo) { return pad + (lo - BB[0]) / (BB[2] - BB[0]) * (W - 2 * pad); };
    var sy = function (la) { return H - pad - (la - BB[1]) / (BB[3] - BB[1]) * (H - 2 * pad); };
    var pts = t.geom === 'line' && t.path ? t.path : (t.pt ? [t.pt] : []);
    var path = pts.length > 1 ? '<polyline fill="none" stroke="#c8893a" stroke-width="2.5" points="' + pts.map(function (p) { return sx(p[1]).toFixed(1) + ',' + sy(p[0]).toFixed(1); }).join(' ') + '"/>' : '';
    var dot = pts.length ? '<circle cx="' + sx(pts[Math.floor(pts.length / 2)][1]).toFixed(1) + '" cy="' + sy(pts[Math.floor(pts.length / 2)][0]).toFixed(1) + '" r="4" fill="#c8893a"/>' : '';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fc-loc"><rect width="' + W + '" height="' + H + '" fill="#eee7d6"/>' + path + dot + '</svg>';
  }
  function stat(k, v) { return '<div class="fc-stat"><div class="fc-sv">' + v + '</div><div class="fc-sk">' + k + '</div></div>'; }

  function render(id) {
    var t = (window.ATLAS && window.ATLAS.TRAILS || []).find(function (x) { return x.id === id; });
    if (!t) return;
    var el = t.elevation;
    var ph = t.photos && t.photos[0];
    var coord = (t.coord || (t.pt ? t.pt[0].toFixed(4) + ', ' + t.pt[1].toFixed(4) : ''));
    var card = document.getElementById('fieldcard') || (function () { var d = document.createElement('div'); d.id = 'fieldcard'; document.body.appendChild(d); return d; })();
    var elevHtml = el && window.AtlasElevation ? window.AtlasElevation.profileHTML(el) : '';
    card.innerHTML =
      '<div class="fc-toolbar no-print"><button class="fc-btn" id="fcPrint">⎙ Print / Save PDF</button><button class="fc-btn ghost" id="fcClose">✕ Close</button></div>' +
      '<div class="fc-page" role="document">' +
      '<div class="fc-head"><div><div class="fc-kicker">Seattle Metro Bike &amp; E-Bike Atlas · Field Card</div>' +
      '<div class="fc-name">' + t.name + '</div><div class="fc-area">' + t.area + ' · ' + (t.manager || '') + '</div></div>' +
      '<div class="fc-eb fc-eb-' + t.eb + '">' + EBHEAD[t.eb] + '</div></div>' +
      '<div class="fc-grid">' +
      '<div class="fc-col">' +
      (ph ? '<img class="fc-photo" src="' + ph.url + '" alt="' + t.name + '"><div class="fc-credit">' + (ph.credit || '') + (ph.license ? ' · ' + ph.license : '') + '</div>' : '') +
      '<div class="fc-stats">' + stat('Length', t.len || (el ? el.distanceMi + ' mi' : '—')) + stat('Surface', t.surface || '—') + stat('Character', t.diff || '—') +
      (el ? stat('Climb', '↑' + el.gainFt + ' ft') + stat('Max grade', el.maxGradePct + '%') + stat('High · Low', el.highFt + ' · ' + el.lowFt + ' ft') : '') + '</div>' +
      elevHtml +
      '</div>' +
      '<div class="fc-col fc-side">' + locatorSvg(t) +
      '<div class="fc-block"><div class="fc-bk">E-bike rule</div><div class="fc-bv">' + (t.ebrule || '') + '</div></div>' +
      (t.status ? '<div class="fc-block"><div class="fc-bk">2025–26 status</div><div class="fc-bv">' + t.status + '</div></div>' : '') +
      '<div class="fc-block"><div class="fc-bk">Trailhead</div><div class="fc-bv mono">⌖ ' + coord + '</div></div>' +
      '<div class="fc-block"><div class="fc-bk">Full entry</div><div class="fc-bv mono">svetimfm.github.io/ebikemap</div></div>' +
      '</div></div>' +
      '<div class="fc-foot">Geometry © OpenStreetMap (ODbL) · elevation USGS 3DEP / OpenTopoData · ' + (t.geomSource && t.geomSource.indexOf('OpenStreetMap') === 0 ? 'OSM centerline' : 'approximate route') + ' · printed from the Atlas, works offline.</div>' +
      '</div>';
    card.classList.add('on');
    document.getElementById('fcClose').addEventListener('click', function () { card.classList.remove('on'); });
    document.getElementById('fcPrint').addEventListener('click', function () { window.print(); });
    function esc(e) { if (e.key === 'Escape') { card.classList.remove('on'); document.removeEventListener('keydown', esc); } }
    document.addEventListener('keydown', esc);
  }
  window.__atlasFieldCard = render;
})();
