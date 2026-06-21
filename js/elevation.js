/* Shared elevation-profile component (WORK_DEFINITION §8.1).
   Renders a real DEM profile: gain/grade/high-low tiles + a gradient ribbon with
   a hover scrubber. Used by the detail panel; reusable by the field card (P5).
   Honest by construction — only called when a trail has a measured elevation. */
(function () {
  var M2FT = 3.28084;

  function climbClass(g) { return g <= 3 ? 'easy' : g <= 6 ? 'moderate' : g <= 9 ? 'steep' : 'very steep'; }

  // Build the SVG profile paths from samples [{d(m), ele(m)}] in a 1000x140 box.
  function buildSvg(el) {
    var s = el.samples; if (!s || s.length < 2) return '';
    var W = 1000, H = 140, pad = 12;
    var total = s[s.length - 1].d || 1;
    var loFt = el.lowFt, hiFt = el.highFt;
    var eMin = Math.min(loFt, hiFt) - 6, eMax = Math.max(hiFt, eMin + 30);
    var X = function (d) { return (d / total) * W; };
    var Y = function (ft) { return H - pad - ((ft - eMin) / (eMax - eMin)) * (H - pad * 2); };
    var line = '', area = 'M0 ' + H + ' ';
    s.forEach(function (p, i) {
      var x = X(p.d).toFixed(1), y = Y(p.ele * M2FT).toFixed(1);
      line += (i ? 'L' : 'M') + x + ' ' + y + ' ';
      area += 'L' + x + ' ' + y + ' ';
    });
    area += 'L' + W + ' ' + H + ' Z';
    return '<svg class="elev-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#e9a93c" stop-opacity="0.45"/><stop offset="1" stop-color="#e9a93c" stop-opacity="0.02"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#elevg)"/>' +
      '<path d="' + line + '" fill="none" stroke="#f2c879" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '<line class="elev-cursor" x1="0" y1="0" x2="0" y2="' + H + '" stroke="#ece4d4" stroke-width="1" stroke-opacity="0" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }

  function tile(k, v, su) { return '<div class="elev-tile"><div class="ev">' + v + (su ? '<span class="su"> ' + su + '</span>' : '') + '</div><div class="ek">' + k + '</div></div>'; }

  function profileHTML(el) {
    if (!el || !el.samples) return '';
    var tiles = '<div class="elev-tiles">' +
      tile('Distance', el.distanceMi, 'mi') +
      tile('Climb', '↑' + el.gainFt, 'ft') +
      tile('Max grade', el.maxGradePct + '<span class="su">%</span> <span class="grade-' + climbClass(el.maxGradePct).replace(' ', '') + '">' + climbClass(el.maxGradePct) + '</span>', '') +
      tile('High · Low', el.highFt + ' · ' + el.lowFt, 'ft') +
      '</div>';
    var src = el.source + (el.note ? ' · ' + el.note : '');
    return '<div class="sec-label">Elevation</div>' +
      '<div class="elev" data-total="' + (el.samples[el.samples.length - 1].d || 1) + '" data-lo="' + el.lowFt + '" data-hi="' + el.highFt + '">' +
      tiles +
      '<div class="elev-plot">' + buildSvg(el) +
      '<div class="elev-read" style="opacity:0"></div></div>' +
      '<div class="elev-src">' + src + '</div>' +
      '</div>';
  }

  // elevation (ft) at fractional distance f∈[0,1] by linear interpolation of samples
  function eleAt(el, f) {
    var s = el.samples, total = s[s.length - 1].d || 1, d = f * total;
    var i = 1; while (i < s.length - 1 && s[i].d < d) i++;
    var seg = s[i].d - s[i - 1].d || 1, t = (d - s[i - 1].d) / seg;
    return (s[i - 1].ele + (s[i].ele - s[i - 1].ele) * t) * M2FT;
  }

  // Wire the hover scrubber after the HTML is in the DOM.
  function attachScrubber(root, el) {
    var box = root.querySelector('.elev');
    if (!box || !el) return;
    var plot = box.querySelector('.elev-plot');
    var cursor = box.querySelector('.elev-cursor');
    var read = box.querySelector('.elev-read');
    var total = el.samples[el.samples.length - 1].d || 1;
    function move(clientX) {
      var r = plot.getBoundingClientRect();
      var f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      cursor.setAttribute('x1', f * 1000); cursor.setAttribute('x2', f * 1000); cursor.setAttribute('stroke-opacity', 0.85);
      var miles = (f * total / 1609.34).toFixed(1);
      read.style.opacity = 1; read.style.left = (f * 100) + '%';
      read.innerHTML = '<b>' + Math.round(eleAt(el, f)) + ' ft</b> · ' + miles + ' mi';
    }
    plot.addEventListener('mousemove', function (e) { move(e.clientX); });
    plot.addEventListener('touchmove', function (e) { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    plot.addEventListener('mouseleave', function () { cursor.setAttribute('stroke-opacity', 0); read.style.opacity = 0; });
  }

  window.AtlasElevation = { profileHTML: profileHTML, attachScrubber: attachScrubber, climbClass: climbClass };
})();
