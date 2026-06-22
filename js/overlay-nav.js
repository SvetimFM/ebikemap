/* Mobile back-button / overlay history (WORK_DEFINITION §3 a11y + mobile).
   Opening an overlay (trail detail panel, field card) pushes a history entry so the
   device / browser BACK button closes the TOP overlay instead of leaving the site.
   UI close buttons call dismiss() to keep history in sync. A LIFO stack supports
   stacked overlays — the field card opens over the detail panel, so back closes the
   field card first, then the detail panel, then (finally) navigates away. */
(function () {
  var stack = [];      // [{ name, close }]
  var suppress = false; // set while WE unwind history, so our own popstate is a no-op

  window.addEventListener('popstate', function () {
    if (suppress) { suppress = false; return; }
    var top = stack.pop();
    if (top && typeof top.close === 'function') { try { top.close(); } catch (e) {} }
  });

  window.AtlasOverlay = {
    // Call right AFTER the overlay is shown. Re-opening an already-tracked overlay
    // (e.g. re-rendering the detail panel for another trail) just refreshes its
    // closer — it does NOT push a duplicate history entry.
    push: function (name, closeFn) {
      for (var i = 0; i < stack.length; i++) if (stack[i].name === name) { stack[i].close = closeFn; return; }
      stack.push({ name: name, close: closeFn });
      try { history.pushState({ atlasOverlay: name }, ''); } catch (e) {}
    },
    // Call when the overlay is closed by its own UI (button / Esc). Unwinds the
    // matching history entries so a subsequent BACK goes to the real previous page.
    dismiss: function (name) {
      var idx = -1;
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { idx = i; break; }
      if (idx === -1) return;
      var n = stack.length - idx; stack.splice(idx);
      suppress = true;
      try { history.go(-n); } catch (e) { suppress = false; }
    }
  };
})();
