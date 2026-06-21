/* View switch — Flat map ⇄ 3D relief. The 3D relief is the bespoke three.js
   "cinematic" mode, isolated in an iframe so its React/Babel/three.js runtime
   never touches the main page. Lazy: the iframe only loads on first activation. */
(function () {
  var seg = document.getElementById('viewseg');
  var wrap = document.getElementById('mapwrap');
  var frame = document.getElementById('view3d');
  if (!seg || !wrap || !frame) return;
  var loaded = false;

  function setView(view) {
    var is3d = view === '3d';
    if (is3d && !loaded) { frame.src = 'relief-3d.html'; loaded = true; }
    frame.classList.toggle('on', is3d);
    wrap.classList.toggle('show3d', is3d);
    seg.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.view === view);
    });
    // Leaflet needs a size recalc when its container becomes visible again.
    if (!is3d && window.__atlasFlat) setTimeout(window.__atlasFlat.fixSize, 60);
  }

  seg.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
  });
})();
