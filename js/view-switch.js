/* View switch — Flat map ⇄ 3D relief ⇄ Network. The 3D relief is isolated in an
   iframe; the Network view is a lazily-initialised second Leaflet map. Both load
   on first activation only. */
(function () {
  var seg = document.getElementById('viewseg');
  var wrap = document.getElementById('mapwrap');
  var frame = document.getElementById('view3d');
  var net = document.getElementById('viewnet');
  if (!seg || !wrap) return;
  var loaded3d = false;

  function setView(view) {
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
  }
  seg.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  window.__atlasView = setView; // cross-view (network node → flat)
})();
