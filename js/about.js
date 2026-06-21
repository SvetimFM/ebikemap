/* About / Sources panel (WORK_DEFINITION §10 — attribution is non-negotiable).
   Self-injects a header button + an accessible modal listing every open data,
   imagery, and software source with its licence, plus per-photo credits. */
(function () {
  var tools = document.querySelector('.header-tools');
  if (!tools) return;
  var btn = document.createElement('button');
  btn.id = 'aboutBtn'; btn.className = 'about-btn'; btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = 'ⓘ Sources';
  tools.appendChild(btn);

  var modal = document.createElement('div');
  modal.id = 'aboutModal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'About and sources'); modal.hidden = true;
  modal.innerHTML =
    '<div class="about-backdrop" data-close></div>' +
    '<div class="about-card" role="document">' +
    '<button class="about-close" data-close aria-label="Close">✕</button>' +
    '<div class="about-kicker">Seattle Metro Bike &amp; E-Bike Atlas</div>' +
    '<h2 class="about-title">About &amp; Sources</h2>' +
    '<p class="about-p">A cartographic field instrument for cycling the Puget Sound region — built on open data, with real trail geometry, real elevation, and real terrain. Where a value is estimated rather than measured, it is labelled; trails without verified geometry keep an approximate path and no elevation.</p>' +
    '<div class="about-sec">Open data</div><ul class="about-list">' +
    '<li><b>Trail &amp; transit geometry</b> — © OpenStreetMap contributors, <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener">ODbL</a> (via Overpass).</li>' +
    '<li><b>Elevation &amp; 3D terrain</b> — USGS 3DEP / Mapzen &amp; AWS Open Terrain Tiles (Terrarium), public domain. Profiles via OpenTopoData (NED 10 m).</li>' +
    '<li><b>Transit</b> — Sound Transit Link 1 / 2 Line, from OpenStreetMap.</li>' +
    '<li><b>Basemap</b> — Natural Earth (public domain) + OpenStreetMap derived.</li>' +
    '</ul>' +
    '<div class="about-sec">Software &amp; type</div><ul class="about-list">' +
    '<li>Leaflet (BSD-2) · three.js (MIT) · Fonts: Fraunces, Archivo, JetBrains Mono (OFL).</li>' +
    '</ul>' +
    '<div class="about-sec">Photography</div>' +
    '<div class="about-credits" id="aboutCredits">Loading credits…</div>' +
    '<p class="about-foot">Every image is used under a Creative Commons or public-domain licence with attribution. No un-credited media. Open an issue on the repo to correct any attribution.</p>' +
    '</div>';
  document.body.appendChild(modal);

  function fillCredits() {
    var el = document.getElementById('aboutCredits');
    if (!window.ATLAS || !window.ATLAS.TRAILS) { setTimeout(fillCredits, 300); return; }
    var rows = window.ATLAS.TRAILS.filter(function (t) { return t.photos && t.photos[0]; }).map(function (t) {
      var p = t.photos[0];
      return '<div class="about-credit"><span class="ac-name">' + t.name + '</span><a href="' + (p.sourceUrl || p.licenseUrl || '#') + '" target="_blank" rel="noopener">' + (p.credit || 'source') + (p.license ? ' · ' + p.license : '') + '</a></div>';
    });
    el.innerHTML = rows.join('') || 'No photos loaded.';
  }

  var lastFocus = null;
  function open() { lastFocus = document.activeElement; modal.hidden = false; fillCredits(); modal.querySelector('.about-close').focus(); document.addEventListener('keydown', onKey); }
  function close() { modal.hidden = true; document.removeEventListener('keydown', onKey); if (lastFocus) lastFocus.focus(); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  btn.addEventListener('click', open);
  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
})();
