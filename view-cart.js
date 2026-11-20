/* Sticky View Cart. Opens the bag on the menu, or the order on checkout. */
(function () {
  'use strict';

  function countFromStorage() {
    try {
      var cart = JSON.parse(sessionStorage.getItem('evie-bag-v4') || '[]');
      if (!Array.isArray(cart)) return 0;
      return cart.reduce(function (sum, item) {
        return sum + (Number(item && item.qty) || 0);
      }, 0);
    } catch (err) {
      return 0;
    }
  }

  function paint() {
    var count = countFromStorage();
    document.querySelectorAll('[data-view-cart-count]').forEach(function (node) {
      node.textContent = String(count);
    });
    var button = document.getElementById('viewCart');
    if (button) {
      button.setAttribute('aria-label', 'View cart, ' + count + (count === 1 ? ' item' : ' items'));
    }
  }

  document.addEventListener('evie-bag-updated', paint);

  var button = document.getElementById('viewCart');
  if (button) {
    button.addEventListener('click', function () {
      if (window.EvieCart && typeof window.EvieCart.open === 'function') {
        window.EvieCart.open();
        return;
      }
      var items = document.getElementById('itemsCard');
      if (items) {
        items.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      window.location.href = '/checkout';
    });
  }

  paint();
})();
