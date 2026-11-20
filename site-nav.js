/* Marks the current clean route and sends old homepage hashes to their pages. */
(function () {
  'use strict';
  function normalize(pathname) {
    var path = pathname || '/';
    try { path = decodeURI(path); } catch (err) { /* keep raw */ }
    path = path.replace(/\/index\.html$/i, '/');
    path = path.replace(/\.html$/i, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
  }
  var path = normalize(window.location.pathname);
  var hash = window.location.hash;
  if ((path === '/' || path === '/menu') && (hash === '#about' || hash === '#blog')) {
    window.location.replace('/about' + window.location.search + hash);
    return;
  }
  var routes = {
    '/': 'menu',
    '/menu': 'menu',
    '/checkout': 'checkout',
    '/gallery': 'gallery',
    '/photos': 'gallery',
    '/about': 'about',
    '/account': 'account'
  };
  var current = routes[path] || '';
  if ((path === '/' || path === '/menu') && hash === '#pay') current = 'pay';
  document.querySelectorAll('.route-nav a[data-route]').forEach(function (link) {
    if (link.getAttribute('data-route') === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
})();
