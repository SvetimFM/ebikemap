/* View switch — Flat map ⇄ 3D relief ⇄ Network. The 3D relief is isolated in an
   iframe; the Network view is a lazily-initialised second Leaflet map. Both load
   on first activation only. The device/browser BACK button returns a non-flat view
   to the flat map (via AtlasOverlay): setView() is the raw switcher with no history
   side-effects (so the back handler can call it without recursing), applyView()
   wraps it with history management. */
(function () {
  var seg = document.getElementById('viewseg');
  var wrap = document.getElementById('mapwrap');
  var frame = document.getElementById('view3d');
  var net = document.getElementById('viewnet');
  if (!seg || !wrap) return;
  var loaded3d = false, current = 'flat';

  function setView(view) { // raw switch — NO history
    var is3d = view === '3d', isNet = view === 'net';
    if (is3d && !loaded3d) { frame.src = 'relief-3d.html'; loaded3d = true; }
    if (isNet && window.__atlasNet) window.__atlasNet.init();
    if (frame) frame.classList.toggle('on', is3d);
    if (net) net.classList.toggle('on', isNet);
    wrap.classList.toggle('show3d', is3d);
    wrap.classList.toggle('shownet', isNet);
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === view); });
    if (view === 'flat' && window.__atlasFlat) setTimeout(window.__atlasFlat.fixSize, 60);
    if (isNet && window.__atlasNet) setTimeout(window.__atlasNet.fixSize, 60);
    current = view;
  }
  function applyView(view) { // history-aware — BACK from a non-flat view returns to flat
    if (view === current) { if (view !== 'flat') return; }
    setView(view);
    if (window.AtlasOverlay) {
      if (view === 'flat') AtlasOverlay.dismiss('view');
      else AtlasOverlay.push('view', function () { setView('flat'); });
    }
  }
  seg.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { applyView(b.dataset.view); }); });
  window.__atlasView = applyView; // cross-view (network node → flat, "take this trail" → 3d)
})();
