/* View switch — 3D relief (primary/home) ⇄ Flat map ⇄ Network. The 3D relief is
   isolated in an iframe and is the DEFAULT view on load; the Network view is a
   lazily-initialised second Leaflet map. The device/browser BACK button returns a
   non-home view to the 3D relief (via AtlasOverlay): setView() is the raw switcher
   with no history side-effects (so the back handler can call it without recursing),
   applyView() wraps it with history management.
   It also manages the left trail-list sidebar: the list is redundant in the 3D
   relief (which has its own picker), so it auto-hides there and can be toggled
   anywhere via the collapse/reveal controls. */
(function () {
  var HOME_VIEW = '3d';
  var seg = document.getElementById('viewseg');
  var wrap = document.getElementById('mapwrap');
  var frame = document.getElementById('view3d');
  var net = document.getElementById('viewnet');
  if (!seg || !wrap) return;
  var loaded3d = false, current = null;

  /* ---- left sidebar (trail list) show/hide ---- */
  var sidebar = document.getElementById('sidebar');
  var sideCollapse = document.getElementById('sideCollapse');
  var sideReveal = document.getElementById('sideReveal');
  var listHidden = false;
  function applyList() {
    if (sidebar) sidebar.classList.toggle('collapsed', listHidden);
    if (sideReveal) sideReveal.classList.toggle('show', listHidden);
  }
  function setListHidden(v) { listHidden = v; applyList(); }
  if (sideCollapse) sideCollapse.addEventListener('click', function () { setListHidden(true); });
  if (sideReveal) sideReveal.addEventListener('click', function () { setListHidden(false); });

  function setView(view) { // raw switch — NO history
    var is3d = view === '3d', isNet = view === 'net';
    if (is3d && !loaded3d) { frame.src = 'relief-3d.html'; loaded3d = true; }
    if (isNet && window.__atlasNet) window.__atlasNet.init();
    if (frame) frame.classList.toggle('on', is3d);
    if (net) net.classList.toggle('on', isNet);
    wrap.classList.toggle('show3d', is3d);
    wrap.classList.toggle('shownet', isNet);
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === view); });
    setListHidden(is3d); // the trail list is redundant alongside the 3D relief's own picker
    if (view === 'flat' && window.__atlasFlat) setTimeout(window.__atlasFlat.fixSize, 60);
    if (isNet && window.__atlasNet) setTimeout(window.__atlasNet.fixSize, 60);
    current = view;
  }
  function applyView(view) { // history-aware — BACK from a non-home view returns to the 3D relief
    if (view === current) return;
    setView(view);
    if (window.AtlasOverlay) {
      if (view === HOME_VIEW) AtlasOverlay.dismiss('view');
      else AtlasOverlay.push('view', function () { setView(HOME_VIEW); });
    }
  }
  seg.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { applyView(b.dataset.view); }); });
  window.__atlasView = applyView; // cross-view (network node → flat, "take this trail" → 3d)

  setView(HOME_VIEW); // 3D relief is the primary view (home — no history entry)
})();
