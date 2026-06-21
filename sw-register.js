/* Register the service worker (offline support). Scope = the page directory, so
   it works whether the Atlas is served at the domain root or under /ebikemap/. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('[atlas] SW registration failed:', e); });
  });
}
