/* Marks the current clean route, paints the cart count, and toggles the mobile menu. */
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
  if ((path === '/' || path === '/menu') && hash === '#about') {
    window.location.replace('/about' + window.location.search);
    return;
  }
  if ((path === '/' || path === '/menu') && hash === '#blog') {
    window.location.replace('/blog' + window.location.search);
    return;
  }
  if (path === '/' && hash === '#pay') {
    window.location.replace('/menu#pay');
    return;
  }
  if (path === '/' && (hash === '#boutique' || hash === '#tip')) {
    window.location.replace('/menu' + hash);
    return;
  }
  var routes = {
    '/': 'home',
    '/menu': 'menu',
    '/checkout': 'checkout',
    '/gallery': 'gallery',
    '/photos': 'gallery',
    '/about': 'about',
    '/account': 'account',
    '/tip': 'tip',
    '/blog': 'blog'
  };
  var current = routes[path] || '';
  document.querySelectorAll('.route-nav a[data-route]').forEach(function (link) {
    if (link.getAttribute('data-route') === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  function bagCount() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem('evie-bag-v4') || '[]');
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(function (sum, item) {
        var qty = Number(item && item.qty);
        return sum + (Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0);
      }, 0);
    } catch (err) {
      return 0;
    }
  }
  function paintBagBadge() {
    var count = bagCount();
    document.querySelectorAll('.route-cart-count').forEach(function (badge) {
      badge.textContent = String(count);
      badge.hidden = count < 1;
    });
    document.querySelectorAll('.route-cart').forEach(function (link) {
      link.setAttribute('aria-label', count ? 'Cart, ' + count + ' in your bag' : 'Cart');
    });
  }
  paintBagBadge();
  window.addEventListener('evie-bag-change', paintBagBadge);
  window.addEventListener('storage', paintBagBadge);

  var toggle = document.getElementById('routeToggle');
  var menu = document.getElementById('routeMenu');
  var header = document.querySelector('.route-nav');
  function setOpen(open) {
    document.body.classList.toggle('route-menu-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(!document.body.classList.contains('route-menu-open'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!header) return;
      if (document.body.classList.contains('route-menu-open') && !header.contains(e.target)) setOpen(false);
    });
  }
})();
