/* Lazy Ko-fi panel. The floating control is ours, shown after the 18+ gate. */
(function () {
  'use strict';

  var PANEL_SRC = 'https://ko-fi.com/eviesquirts/?hidefeed=true&widget=true&embed=true';
  var AGE_KEY = 'evie-age-confirmed-v2';

  function menuPath() {
    var path = location.pathname || '/';
    try { path = decodeURI(path); } catch (err) { /* keep raw */ }
    path = path.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
  }

  function syncTipLink() {
    var path = menuPath();
    if (path !== '/' && path !== '/menu') return;
    var hash = location.hash;
    document.querySelectorAll('.route-nav a[data-route]').forEach(function (link) {
      var route = link.getAttribute('data-route');
      var active = (hash === '#tip' && route === 'tip')
        || (hash === '#pay' && route === 'pay')
        || (hash !== '#tip' && hash !== '#pay' && route === 'menu');
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function setFloatCovered(covered) {
    document.body.classList.toggle('kofi-float-hidden', covered);
    var button = document.getElementById('kofiFloat');
    if (!button || button.hidden) return;
    if (covered) {
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    } else {
      button.removeAttribute('aria-hidden');
      button.removeAttribute('tabindex');
    }
  }

  function watchSectionCover() {
    if (!('IntersectionObserver' in window)) return;
    var zones = ['pay', 'tip', 'work-order', 'boutique', 'boutiqueCatalog'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!zones.length) return;
    var covering = new Set();
    var cover = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) covering.add(entry.target);
        else covering.delete(entry.target);
      });
      setFloatCovered(covering.size > 0);
    }, { threshold: 0.02 });
    zones.forEach(function (zone) { cover.observe(zone); });
  }

  function loadPanel() {
    var frame = document.getElementById('kofiPanel');
    var shell = document.getElementById('kofiFrame');
    if (!frame || !shell || frame.getAttribute('src')) return;
    var src = frame.getAttribute('data-src') || PANEL_SRC;
    function reveal() {
      if (frame.getAttribute('src')) return;
      frame.setAttribute('src', src);
      shell.classList.add('is-ready');
    }
    if (!('IntersectionObserver' in window)) {
      reveal();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal();
        observer.disconnect();
      });
    }, { rootMargin: '280px 0px' });
    observer.observe(shell);
  }

  function showFloat() {
    var button = document.getElementById('kofiFloat');
    if (!button) return;
    button.hidden = false;
    setFloatCovered(document.body.classList.contains('kofi-float-hidden'));
  }

  function whenAdult(callback) {
    var confirmed = false;
    try { confirmed = localStorage.getItem(AGE_KEY) === 'yes'; } catch (err) { confirmed = false; }
    if (confirmed || !document.getElementById('ageGateConfirm')) {
      callback();
      return;
    }
    document.getElementById('ageGateConfirm').addEventListener('click', function () {
      callback();
    });
  }

  syncTipLink();
  window.addEventListener('hashchange', syncTipLink);
  if (location.hash === '#tip' || location.hash === '#pay') {
    document.body.classList.add('kofi-float-hidden');
  }
  watchSectionCover();
  loadPanel();
  whenAdult(showFloat);
})();
