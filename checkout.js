(function () {
  'use strict';
  const root = document.getElementById('checkoutApp');
  const catalog = window.EVIE_CHECKOUT_CATALOG;
  if (!root || !catalog) return;

  const BAG_KEY = 'evie-bag-v4';
  const TIP_KEY = 'evie-checkout-tip';
  const METHOD_KEY = 'evie-checkout-method';
  const HANDLES_KEY = 'evie-checkout-handles';
  const NOTES_KEY = 'evie-checkout-notes';
  const REQUEST_KEY = 'evie-checkout-request';
  const TERMS_KEY = 'evie-fulfillment-agreement-accepted-2026-10-30';
  const HANDLE_RE = /^[A-Za-z0-9_.@-]{2,80}$/;
  const MAX_BYTES = 5 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  const items = catalog.items;
  const itemById = (id) => items.find((item) => item.id === id);

  const state = {
    qty: Object.fromEntries(items.map((item) => [item.id, 0])),
    origin: {},
    extras: [],
    tip: 0,
    method: 'venmo',
    proofUrl: '',
    proofName: '',
    proofFile: null,
    requestId: '',
    submitted: false,
    syncNotes: [],
    promoUnlocked: false,
    promoCode: '',
    promoNotice: '',
    memo: ''
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function money(n) {
    const value = Math.round((Number(n) || 0) * 100) / 100;
    if (value === 0) return '$0.00';
    return Number.isInteger(value) ? '$' + value : '$' + value.toFixed(2);
  }
  function amountParam(n) {
    const value = Math.round((Number(n) || 0) * 100) / 100;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = Math.random() * 16 | 0;
      return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || '');
      return parsed == null ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }
  function referencePrice(item) {
    const origin = state.origin[item.id];
    if (origin && Number.isFinite(Number(origin.price))) return Number(origin.price);
    if (item.storefrontPrice != null) return Number(item.storefrontPrice);
    return item.price;
  }
  function priceNote(item) {
    const listed = referencePrice(item);
    if (listed === item.price) return '';
    return 'Menu lists ' + money(listed) + '. This payment link uses ' + money(item.price) + '.';
  }
  function itemIdsFromParams(params) {
    const ids = [];
    params.getAll('item').forEach((raw) => {
      String(raw || '').split(',').forEach((part) => {
        const id = part.trim();
        if (id) ids.push(id);
      });
    });
    return ids;
  }
  function acceptedPromoCode(value) {
    const token = String(value || '').trim().toLowerCase();
    if (token === 'today55' || token === 'evie55') return token;
    return '';
  }
  function urlRequestsPromo(params, itemIds) {
    return String(params.get('promo') || '').trim() === '55' || itemIds.indexOf('deluxe55') !== -1;
  }
  function methodFromParam(value) {
    const method = String(value || '').trim().toLowerCase();
    if (method === 'venmo' || method === 'cashapp' || method === 'paypal') return method;
    if (method === 'amazon' || method === 'amazon_egift') return 'amazon_egift';
    return '';
  }
  function notesText() {
    const field = $('orderNotes');
    return field ? String(field.value || '').slice(0, 500) : '';
  }
  function promoCodeForOrder() {
    const field = $('promoCode');
    const typed = acceptedPromoCode(field && field.value);
    if (typed) return typed;
    if (state.promoCode) return state.promoCode;
    if (state.promoUnlocked && state.qty.deluxe55) return '55';
    return '';
  }
  function showPromoStatus() {
    const status = $('promoStatus');
    if (!status) return;
    if (!state.promoNotice) {
      status.hidden = true;
      status.textContent = '';
      return;
    }
    status.hidden = false;
    status.textContent = state.promoNotice;
  }

  function readBag() {
    const parsed = readJson(BAG_KEY, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.name === 'string' && Number(item.qty) > 0 && Number.isFinite(Number(item.price)));
  }

  function hydrate() {
    state.syncNotes = [];
    const params = new URLSearchParams(window.location.search);
    const urlItems = itemIdsFromParams(params);
    state.promoUnlocked = urlRequestsPromo(params, urlItems);
    state.promoCode = '';
    state.promoNotice = '';
    let vaultId = '';
    const bagLines = readBag();
    if (bagLines.some((line) => catalog.aliases[line.name] === 'deluxe55')) {
      state.promoUnlocked = true;
      if (!state.promoCode) state.promoCode = '55';
    }
    bagLines.forEach((line) => {
      const qty = Math.max(0, Math.min(catalog.maxQty, Math.round(Number(line.qty))));
      const sku = catalog.aliases[line.name] || '';
      if (sku === 'deluxe55' && !state.promoUnlocked) {
        if (!state.syncNotes.some((note) => note.indexOf('$55') !== -1)) {
          state.syncNotes.push('The $55 Dropbox promo isn’t on this page. Use today’s link or code, or choose the $75 vault.');
        }
        return;
      }
      if (sku && itemById(sku)) {
        if ((sku === 'deluxe' || sku === 'deluxe55') && vaultId && vaultId !== sku) {
          state.syncNotes.push('Deluxe Dropbox and today’s promo are one choice. I kept a single Dropbox on this page.');
          return;
        }
        if (sku === 'deluxe' || sku === 'deluxe55') vaultId = sku;
        state.qty[sku] = Math.min(catalog.maxQty, state.qty[sku] + qty);
        if (!state.origin[sku]) {
          state.origin[sku] = {
            name: line.name,
            price: Number(line.price),
            exclusive: line.exclusive || itemById(sku).exclusive || null
          };
        }
        return;
      }
      const known = catalog.extras.find((extra) => extra.name === line.name);
      if (known) {
        const nextQty = known.single ? 1 : qty;
        const existing = state.extras.find((extra) => extra.name === known.name);
        if (existing) existing.qty = Math.min(catalog.maxQty, existing.qty + nextQty);
        else state.extras.push({
          name: known.name,
          price: known.price,
          bagPrice: Number(line.price),
          qty: nextQty,
          exclusive: known.exclusive || null,
          single: !!known.single,
          unrecognized: false
        });
        return;
      }
      state.extras.push({
        name: line.name,
        price: Number(line.price),
        bagPrice: Number(line.price),
        qty: qty,
        exclusive: line.exclusive || null,
        single: false,
        unrecognized: true
      });
    });
    if (state.extras.some((extra) => extra.unrecognized)) {
      state.syncNotes.push('Something in your bag is not on this payment link. Remove it here, or message Evie to price it.');
    }
    const vaultAsks = urlItems.filter((id) => id === 'deluxe' || id === 'deluxe55');
    if (vaultAsks.indexOf('deluxe') !== -1 && vaultAsks.indexOf('deluxe55') !== -1) {
      state.syncNotes.push('Deluxe Dropbox and today’s promo are one choice. I kept a single Dropbox on this page.');
    }
    let urlVault = '';
    urlItems.forEach((id) => {
      if (!itemById(id)) return;
      if (id === 'deluxe55' && !state.promoUnlocked) {
      if (!(next > 0)) return;
      state.promoUnlocked = true;
    }
      if (id === 'deluxe' || id === 'deluxe55') {
        urlVault = id;
        return;
      }
      if (state.qty[id] > 0) return;
      state.qty[id] = 1;
    });
    if (urlVault) {
      const already = state.qty[urlVault];
      if ((state.qty.deluxe || state.qty.deluxe55) && !already) {
        state.syncNotes.push('This link picks one Dropbox. I used the Dropbox from the link.');
      }
      state.qty.deluxe = 0;
      state.qty.deluxe55 = 0;
      delete state.origin.deluxe;
      delete state.origin.deluxe55;
      state.qty[urlVault] = Math.max(1, already);
    } else if (String(params.get('promo') || '').trim() === '55' && !state.qty.deluxe && !state.qty.deluxe55) {
      state.qty.deluxe55 = 1;
    }
    const urlMethod = methodFromParam(params.get('method'));
    if (urlMethod) state.method = urlMethod;
    else {
      const savedMethod = sessionStorage.getItem(METHOD_KEY);
      if (savedMethod === 'venmo' || savedMethod === 'cashapp' || savedMethod === 'paypal' || savedMethod === 'amazon_egift') state.method = savedMethod;
    }
    const savedTip = Number(sessionStorage.getItem(TIP_KEY));
    if (Number.isFinite(savedTip) && savedTip > 0) state.tip = Math.min(catalog.maxTip, savedTip);
    state.requestId = sessionStorage.getItem(REQUEST_KEY) || uuid();
    sessionStorage.setItem(REQUEST_KEY, state.requestId);
    if (state.promoUnlocked) {
      state.promoNotice = state.qty.deluxe55
        ? 'Today’s Dropbox promo is unlocked at $55.'
        : 'Today’s Dropbox promo is unlocked. Add it if you want the $55 vault.';
    }
  }

  function bagLineForSku(item) {
    const qty = state.qty[item.id];
    if (!qty) return null;
    const origin = state.origin[item.id];
    if (origin) return {name: origin.name, price: Number(origin.price), qty: qty, exclusive: origin.exclusive || null};
    if (item.storefrontName) {
      return {name: item.storefrontName, price: Number(item.storefrontPrice), qty: qty, exclusive: item.exclusive || null};
    }
    return {name: item.name, price: item.price, qty: qty, exclusive: item.exclusive || null};
  }

  function persistBag() {
    const lines = [];
    items.forEach((item) => {
      const line = bagLineForSku(item);
      if (line) lines.push(line);
    });
    state.extras.forEach((extra) => {
      if (extra.qty > 0) lines.push({
        name: extra.name,
        price: extra.unrecognized ? extra.price : extra.price,
        qty: extra.qty,
        exclusive: extra.exclusive || null
      });
    });
    try { sessionStorage.setItem(BAG_KEY, JSON.stringify(lines)); } catch (err) { /* private mode */ }
    try { window.dispatchEvent(new CustomEvent('evie-bag-change')); } catch (err) { /* older browsers */ }
  }
  function persistTip() {
    try { sessionStorage.setItem(TIP_KEY, String(state.tip || '')); } catch (err) { /* private mode */ }
  }

  function payableLines() {
    const lines = items.filter((item) => state.qty[item.id] > 0).map((item) => ({
      id: item.id,
      name: item.name,
      qty: state.qty[item.id],
      price: item.price,
      total: item.price * state.qty[item.id],
      note: priceNote(item)
    }));
    state.extras.forEach((extra, index) => {
      if (extra.unrecognized || extra.qty <= 0) return;
      lines.push({
        name: extra.name,
        qty: extra.qty,
        price: extra.price,
        total: extra.price * extra.qty,
        extraIndex: index,
        note: Number(extra.bagPrice) !== extra.price ? 'Menu bag had ' + money(extra.bagPrice) + '. This payment link uses ' + money(extra.price) + '.' : ''
      });
    });
    return lines;
  }
  function merchandiseTotal() {
    const itemsTotal = payableLines().reduce((sum, line) => sum + line.total, 0);
    return Math.round((itemsTotal + (Number(state.tip) || 0)) * 100) / 100;
  }
  function amazonFee() {
    if (!catalog.amazonFeeCents) return 0;
    return catalog.amazonFeeCents(Math.round(merchandiseTotal() * 100), state.method) / 100;
  }
  function total() {
    return Math.round((merchandiseTotal() + amazonFee()) * 100) / 100;
  }
  function unrecognizedCount() {
    return state.extras.reduce((sum, extra) => sum + (extra.unrecognized ? extra.qty : 0), 0);
  }

  function setQty(id, next) {
    const item = itemById(id);
    if (!item) return;
    if (id === 'deluxe55' && !state.promoUnlocked) return;
    const value = Math.max(0, Math.min(catalog.maxQty, next));
    if ((id === 'deluxe' || id === 'deluxe55') && value > 0) {
      state.qty.deluxe = 0;
      state.qty.deluxe55 = 0;
      delete state.origin.deluxe;
      delete state.origin.deluxe55;
    }
    if (value === 0) delete state.origin[id];
    state.qty[id] = value;
    persistBag();
    render();
  }
  function addItem(id) {
    if ((id === 'deluxe' || id === 'deluxe55') && (state.qty.deluxe || state.qty.deluxe55)) {
      setQty(id, 1);
      return;
    }
    setQty(id, state.qty[id] + 1);
  }
  function setExtra(index, next) {
    const extra = state.extras[index];
    if (!extra) return;
    const cap = extra.single ? 1 : catalog.maxQty;
    extra.qty = Math.max(0, Math.min(cap, next));
    if (extra.qty === 0) state.extras.splice(index, 1);
    persistBag();
    render();
  }

  let catalogExpanded = false;
  function featuredCatalogItems() {
    const featured = [];
    ['deluxe55', 'vip1', 'bundle20'].forEach((id) => {
      const item = items.find((row) => row.id === id);
      if (item) featured.push(item);
    });
    return featured;
  }
  function catalogItemRow(item) {
    const note = priceNote(item);
    return '<div class="item-row' + (state.qty[item.id] ? ' is-on' : '') + '">' +
      '<div><div class="item-name">' + escapeHtml(item.name) + '</div>' +
      '<span class="item-price">' + money(item.price) + '</span>' +
      (note ? '<span class="item-note">' + escapeHtml(note) + '</span>' : '') +
      '</div><div class="stepper">' +
      '<button type="button" data-dec="' + item.id + '"' + (state.qty[item.id] === 0 ? ' disabled' : '') + ' aria-label="Remove one ' + escapeHtml(item.name) + '">−</button>' +
      '<span class="qty">' + state.qty[item.id] + '</span>' +
      '<button type="button" data-inc="' + item.id + '"' + (state.qty[item.id] >= catalog.maxQty ? ' disabled' : '') + ' aria-label="Add one ' + escapeHtml(item.name) + '">+</button>' +
      '</div></div>';
  }
  function renderItems() {
    const featured = featuredCatalogItems();
    const featuredIds = {};
    featured.forEach((item) => { featuredIds[item.id] = true; });
    const rest = items.filter((item) => !featuredIds[item.id] && (item.id !== 'deluxe55' || state.promoUnlocked));
    const shown = catalogExpanded ? featured.concat(rest) : featured;
    const rows = shown.map(catalogItemRow);
    if (rest.length) {
      rows.push('<button type="button" class="see-more" id="seeMoreCatalog" aria-expanded="' + (catalogExpanded ? 'true' : 'false') + '">' + (catalogExpanded ? 'SEE LESS' : 'SEE MORE >>>') + '</button>');
    }
    if (state.extras.length) {
      rows.push('<p class="extra-label">Also in your bag</p>');
      state.extras.forEach((extra, index) => {
        const note = extra.unrecognized
          ? 'Not on this payment link. Remove it, or message Evie to price it.'
          : (Number(extra.bagPrice) !== extra.price ? 'Menu bag had ' + money(extra.bagPrice) + '. This payment link uses ' + money(extra.price) + '.' : '');
        rows.push('<div class="item-row' + (extra.unrecognized ? ' is-unrecognized' : '') + '">' +
          '<div><div class="item-name">' + escapeHtml(extra.name) + '</div>' +
          '<span class="item-price">' + (extra.unrecognized ? 'Price not on this page' : money(extra.price)) + '</span>' +
          (note ? '<span class="item-note">' + escapeHtml(note) + '</span>' : '') +
          '</div><div class="stepper">' +
          '<button type="button" data-dec-extra="' + index + '" aria-label="Remove one ' + escapeHtml(extra.name) + '">−</button>' +
          '<span class="qty">' + extra.qty + '</span>' +
          '<button type="button" data-inc-extra="' + index + '"' + (extra.single || extra.qty >= catalog.maxQty ? ' disabled' : '') + ' aria-label="Add one ' + escapeHtml(extra.name) + '">+</button>' +
          '</div></div>');
      });
    }
    $('itemList').innerHTML = rows.join('');
    const note = $('syncNote');
    note.hidden = state.syncNotes.length === 0;
    note.textContent = state.syncNotes[0] || '';
  }

  function catalogPrice(id) {
    const item = items.find((row) => row.id === id);
    return item ? Number(item.price) || 0 : 0;
  }
  function hasDeluxe() { return !!(state.qty.deluxe || state.qty.deluxe55); }
  function hasVip() { return !!(state.qty.vip1 || state.qty.vip3); }
  function currentUpsell() {
    if (!hasDeluxe() && (state.qty.bundle20 > 0 || state.qty.bundle10 > 0)) {
      const fromId = state.qty.bundle20 > 0 ? 'bundle20' : 'bundle10';
      const fromPrice = catalogPrice(fromId);
      const deluxePrice = catalogPrice('deluxe55') || 55;
      const delta = Math.round((deluxePrice - fromPrice) * 100) / 100;
      if (!(delta > 0)) return null;
      return {
        kind: 'deluxe',
        fromId,
        label: 'Upgrade to Deluxe 900+, ' + money(delta) + ' more today',
        apply: function () {
          state.promoUnlocked = true;
          setQty(fromId, 0);
          setQty('deluxe55', 1);
          toast('Upgraded to Deluxe 900+');
        }
      };
    }
    if (hasDeluxe() && !hasVip()) {
      const vipPrice = catalogPrice('vip1') || 150;
      return {
        kind: 'vip',
        label: 'Add VIP 1 Month, ' + money(vipPrice) + ' more',
        apply: function () {
          addItem('vip1');
          toast('Added VIP 1 Month');
        }
      };
    }
    return null;
  }
  function recommendations() {
    const offer = currentUpsell();
    return offer ? [offer] : [];
  }
  function renderRecs() {
    /* Upsell now lives inside the order summary. */
  }
  function upsellMarkup() {
    const offer = currentUpsell();
    if (!offer) return '';
    return '<div class="order-upsell"><button type="button" class="order-upsell-btn" data-upsell="' + offer.kind + '">' + escapeHtml(offer.label) + '</button></div>';
  }

  function renderAmount() {
    const amount = total();
    $('amountValue').textContent = money(amount);
    $('stickyAmount').textContent = money(amount);
    const lines = payableLines();
    if (!lines.length && !state.tip) $('amountNote').textContent = 'Add an item to see your total';
    else {
      const count = lines.reduce((sum, line) => sum + line.qty, 0) + (state.tip ? 1 : 0);
      $('amountNote').textContent = count + (count === 1 ? ' item' : ' items') + ' in your order';
    }
    const paypalAmount = $('paypalAmount');
    if (paypalAmount) paypalAmount.textContent = money(amount);
    const amazonAmount = $('amazonAmount');
    if (amazonAmount) amazonAmount.textContent = money(amount);
    document.querySelectorAll('.live-total').forEach((node) => { node.textContent = money(amount); });
    const feeLine = $('amazonFeeLine');
    if (feeLine) feeLine.hidden = amazonFee() <= 0;
    const aside = $('summaryAside');
    if (aside && $('selectedSummary')) aside.innerHTML = $('selectedSummary').innerHTML;
    const summaryTotal = $('summaryTotal');
    if (summaryTotal) summaryTotal.textContent = money(amount);
    updateSubmitState();
  }
  let catalogReady = false;
  let catalogOpen = true;
  function charmMarkup(line) {
    const name = String((line && (line.name || line.id)) || '').toLowerCase();
    let kind = 'heart';
    if (name.indexOf('deluxe') !== -1 || name.indexOf('dropbox') !== -1 || name.indexOf('vault') !== -1) kind = 'lock';
    else if (name.indexOf('vip') !== -1) kind = 'crown';
    else if (name.indexOf('custom') !== -1) kind = 'phone';
    else if (name.indexOf('tip') !== -1) kind = 'bow';
    const icons = {
      heart: '<path fill="#FF8FC5" d="M12 21S3 13.4 3 8.4C3 5.9 4.9 4 7.4 4c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2C19.1 4 21 5.9 21 8.4 21 13.4 12 21 12 21z"/>',
      lock: '<path fill="none" stroke="#C0C0C0" stroke-width="1.6" d="M8 11V8a4 4 0 0 1 8 0v3"/><rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1.6"/>',
      crown: '<path fill="#FF8FC5" d="M4 16h16l-1.2-8-4.2 3.2L12 6l-2.6 5.2L5.2 8z"/><path fill="#C0C0C0" d="M4 17h16v2H4z"/>',
      phone: '<rect x="8" y="3" width="8" height="18" rx="2" fill="none" stroke="#FF8FC5" stroke-width="1.6"/><circle cx="12" cy="18.2" r="0.8" fill="#FF8FC5"/>',
      bow: '<path fill="#C0C0C0" d="M12 13c-3-3-7-3-7 0 2.2 0 4.2.7 7 2.5 2.8-1.8 4.8-2.5 7-2.5 0-3-4-3-7 0z"/>'
    };
    return '<svg class="charm" viewBox="0 0 24 24" aria-hidden="true">' + (icons[kind] || icons.heart) + '</svg>';
  }
  function hasPricedSelection() {
    return payableLines().length > 0 || state.extras.some((extra) => extra.qty > 0);
  }
  function renderSelected() {
    const box = $('selectedSummary');
    if (!box) return;
    const rows = payableLines().map((line) => haulCard(line));
    state.extras.forEach((extra) => {
      if (!extra.unrecognized || extra.qty <= 0) return;
      rows.push('<div class="picked"><span>' + escapeHtml(extra.name) + '</span><strong>Ask Evie</strong></div>');
    });
    if (state.tip) rows.push('<div class="picked"><span>Custom amount / tip</span><strong>' + money(state.tip) + '</strong></div>');
    if (amazonFee()) rows.push('<div class="picked"><span>Amazon gift card fee</span><strong>+$10</strong></div>');
    box.hidden = rows.length === 0;
    box.innerHTML = rows.join('');
    renderStickyUpsell();
  }
  function renderStickyUpsell() {
    const slot = $('stickyUpsell');
    if (!slot) return;
    const onOrder = document.querySelector('.wizard-shell') && document.querySelector('.wizard-shell').getAttribute('data-step') === 'order';
    const html = onOrder ? upsellMarkup() : '';
    slot.innerHTML = html;
    slot.hidden = !html;
  }
  function applyCatalog() {
    if (!catalogReady) {
      catalogOpen = !hasPricedSelection();
      catalogReady = true;
    }
    const panel = $('catalogPanel');
    const button = $('toggleCatalog');
    if (!panel || !button) return;
    catalogOpen = true;
    panel.hidden = false;
    if (button) {
      button.hidden = true;
      button.setAttribute('aria-expanded', 'true');
    }
  }
  function syncStickyJump() { updateWizardChrome(); }
  function render() {
    renderItems();
    renderRecs();
    renderAmount();
    renderSelected();
    applyCatalog();
    updateWizardChrome();
  }

  function toast(message, ms) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms || 1600);
  }
  async function copyText(value, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const temp = document.createElement('textarea');
        temp.value = value;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        const ok = document.execCommand('copy');
        temp.remove();
        if (!ok) throw new Error('copy failed');
      }
      toast(message || 'Copied', message ? 2800 : 1600);
    } catch (err) {
      toast('Copy unavailable');
    }
  }
  function openApp(appUrl, webUrl) {
    const started = Date.now();
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - started >= 800) window.location.href = webUrl;
    }, 1200);
    const cancel = () => clearTimeout(timer);
    document.addEventListener('visibilitychange', cancel, {once: true});
    window.addEventListener('pagehide', cancel, {once: true});
    window.location.href = appUrl;
  }
  function isMobilePay() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  }
  function openPayInNewTab(url) {
    if (!url) return;
    markPayOpened();
    let win = null;
    try { win = window.open(url, '_blank'); } catch (err) { win = null; }
    if (win) {
      try { win.opener = null; } catch (err) { /* ignore */ }
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.referrerPolicy = 'no-referrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function markPayOpened() {
    state.payOpenedAt = Date.now();
    state.payReturnArmed = true;
    persistProgress();
  }
  function contactReady() {
    const users = handles();
    return !!users.platform && ['telegram','snapchat','x','onlyfans','stripchat'].indexOf(users.platform) !== -1 && !!users.user && HANDLE_RE.test(users.user);
  }
  function showPaidReturnPrompt() {
    const prompt = $('paidReturnPrompt');
    if (prompt) {
      prompt.hidden = false;
      prompt.classList.add('is-on');
    }
    document.querySelectorAll('#wizardProgress .seg[data-step="proof"]').forEach((seg) => {
      seg.classList.add('is-nudge');
    });
  }
  function hidePaidReturnPrompt() {
    const prompt = $('paidReturnPrompt');
    if (prompt) {
      prompt.hidden = true;
      prompt.classList.remove('is-on');
    }
    document.querySelectorAll('#wizardProgress .seg[data-step="proof"]').forEach((seg) => {
      seg.classList.remove('is-nudge');
    });
  }
  function onReturnedFromPay() {
    if (state.submitted) return;
    if (!state.payReturnArmed) return;
    if (!state.payOpenedAt || Date.now() - state.payOpenedAt < 800) return;
    state.payReturnArmed = false;
    showPaidReturnPrompt();
    if (contactReady() && state.step !== 'confirm') goToStep('proof');
  }
  function knownMethod(next) {
    if (next === 'cashapp' || next === 'paypal' || next === 'venmo' || next === 'amazon_egift') return next;
    if (next === 'amazon') return 'amazon_egift';
    return 'venmo';
  }
  function selectMethod(next) {
    state.method = knownMethod(next);
    try { sessionStorage.setItem(METHOD_KEY, state.method); } catch (err) { /* private mode */ }
    document.querySelectorAll('.payment-tile, .payment-row, .pay-tile, .pay-card, .pay-panel, .payment-detail').forEach((card) => {
      const method = card.getAttribute('data-method');
      if (!method) return;
      const on = method === state.method;
      card.classList.toggle('is-on', on);
      card.classList.toggle('active', on);
      if (card.classList.contains('pay-panel') || card.classList.contains('payment-detail')) card.hidden = !on;
      if (card.hasAttribute('aria-pressed')) card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderAmount();
    renderSelected();
    persistProgress();
    updateWizardChrome();
  }
  function venmoUrls() {
    const amount = merchandiseTotal();
    let pay = 'venmo://paycharge?txn=pay&recipients=' + encodeURIComponent(catalog.venmoRecipient);
    if (amount > 0) pay += '&amount=' + encodeURIComponent(amountParam(amount));
    pay += '&note=' + encodeURIComponent(state.memo || 'Food');
    return {app: pay, web: catalog.venmoWeb};
  }
  function cashUrls() {
    const amount = merchandiseTotal();
    const web = amount > 0
      ? 'https://cash.app/$' + catalog.cashAppSlug + '/' + encodeURIComponent(amountParam(amount))
      : 'https://cash.app/$' + catalog.cashAppSlug;
    return {app: web, web: web};
  }
  function cleanHandle(value) {
    return String(value || '').trim();
  }
  function contactPlatform() {
    const on = document.querySelector('.contact-chip.active, .contact-chip[aria-pressed="true"]');
    if (on) return on.getAttribute('data-contact') || '';
    const checked = document.querySelector('input[name="contactPlatform"]:checked');
    if (checked) return checked.value;
    const field = $('contactPlatform');
    return field ? String(field.value || '').trim() : '';
  }
  function setContact(platform) {
    const next = String(platform || '');
    document.querySelectorAll('.contact-chip').forEach((chip) => {
      const on = chip.getAttribute('data-contact') === next;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    handles();
    persistHandles();
    updateWizardChrome();
  }
  function handles() {
    const platform = contactPlatform();
    let raw = ($('contactUser') && $('contactUser').value) || '';
    raw = String(raw).replace(/^@+/, '');
    if ($('contactUser') && $('contactUser').value !== raw && document.activeElement !== $('contactUser')) {
      $('contactUser').value = raw;
    }
    const user = cleanHandle(raw);
    const out = { snap: '', telegram: '', x: '', platform: platform, user: user, stripchat: '', onlyfans: '' };
    if (platform === 'telegram') out.telegram = user;
    if (platform === 'x') out.x = user;
    if (platform === 'snapchat') out.snap = user;
    if (platform === 'stripchat') out.stripchat = user;
    if (platform === 'onlyfans') out.onlyfans = user;
    if ($('tgUser')) $('tgUser').value = out.telegram;
    if ($('xUser')) $('xUser').value = out.x;
    if ($('snapUser')) $('snapUser').value = out.snap;
    return out;
  }
  function showError(message) {
    const el = $('formErr');
    el.hidden = !message;
    el.textContent = message || '';
    $('copySummary').hidden = !message;
  }
  function paymentMethodCode() {
    if (state.method === 'cashapp') return 'cash_app';
    if (state.method === 'paypal') return 'paypal';
    if (state.method === 'amazon_egift') return 'amazon_egift';
    return 'venmo';
  }
  function paymentBlurb() {
    if (state.method === 'cashapp') return 'Cash App ' + catalog.cashAppHandle;
    if (state.method === 'paypal') return 'PayPal';
    if (state.method === 'amazon_egift') return 'Pay By Amazon E-gift';
    return 'Venmo ' + catalog.venmoHandle;
  }
  function summaryText() {
    const users = handles();
    const lines = payableLines().map((line) => (line.qty > 1 ? line.qty + ' × ' : '') + line.name + ' — ' + money(line.total));
    if (state.tip) lines.push('Custom amount / tip — ' + money(state.tip));
    if (amazonFee()) lines.push('Amazon gift card fee +$10');
    const who = [];
    if (users.snap) who.push('Snapchat: ' + users.snap);
    if (users.telegram) who.push('Telegram: ' + users.telegram);
    if (users.x) who.push('X: ' + users.x);
    const note = notesText().trim();
    return [
      'Kissed by Evie checkout',
      lines.join('\n') || 'No priced items',
      'Amount: ' + money(total()),
      'Payment: ' + paymentBlurb(),
      'Memo: ' + (state.memo || 'Food'),
      who.join('\n'),
      note ? 'Notes: ' + note : '',
      'This note is not a payment confirmation.'
    ].filter(Boolean).join('\n');
  }
  function applyPromo(raw) {
    const code = acceptedPromoCode(raw);
    if (!code) {
      const status = $('promoStatus');
      status.hidden = false;
      status.textContent = 'That code doesn’t unlock a promo.';
      return false;
    }
    state.promoUnlocked = true;
    state.promoCode = code;
    if (!state.qty.deluxe && !state.qty.deluxe55) {
      state.qty.deluxe55 = 1;
      state.promoNotice = 'Code applied. Deluxe Dropbox Today Promo is added at $55.';
    } else if (state.qty.deluxe && !state.qty.deluxe55) {
      state.promoNotice = 'Code applied. The $55 vault is unlocked. Adding it replaces the $75 Dropbox.';
    } else {
      state.promoNotice = 'Code applied. Deluxe Dropbox Today Promo stays at $55.';
    }
    persistBag();
    render();
    showPromoStatus();
    return true;
  }
  function rotateRequest() {
    state.requestId = uuid();
    state.submitted = false;
    try { sessionStorage.setItem(REQUEST_KEY, state.requestId); } catch (err) { /* private mode */ }
  }

  function validateImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      if (file.size <= 0 || file.size > MAX_BYTES) {
        reject(new Error('Screenshots need to be 5 MB or smaller.'));
        return;
      }
      const type = String(file.type || '').toLowerCase();
      if (type === 'image/svg+xml' || type.startsWith('text/') || type === 'application/xhtml+xml') {
        reject(new Error('Please upload a photo of your payment screenshot, not an SVG or text file.'));
        return;
      }
      if (type && type.indexOf('image/') !== 0) {
        reject(new Error('Please upload an image of your payment screenshot.'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(file); };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const name = String(file.name || '').toLowerCase();
        if (type === 'image/heic' || type === 'image/heif' || /\.(heic|heif)$/.test(name)) resolve(file);
        else reject(new Error('That file isn’t a readable image.'));
      };
      img.src = url;
    });
  }

  function showConfirm(saved, detail) {
    $('toast').classList.remove('show');
    const amount = total();
    const users = handles();
    const list = $('confirmItems');
    const rows = payableLines().map((line) => {
      const label = line.qty > 1 ? line.name + ' × ' + line.qty : line.name;
      return '<li><span>' + escapeHtml(label) + '</span><span>' + money(line.total) + '</span></li>';
    });
    if (state.tip) rows.push('<li><span>Custom amount / tip</span><span>' + money(state.tip) + '</span></li>');
    if (amazonFee()) rows.push('<li><span>Amazon gift card fee</span><span>+$10</span></li>');
    list.innerHTML = rows.join('');
    $('confirmTotal').textContent = money(amount);
    $('confirmPay').textContent = state.method === 'cashapp'
      ? 'Payment: Cash App'
      : state.method === 'paypal'
        ? 'Payment: PayPal'
        : state.method === 'amazon_egift'
          ? 'Payment: Amazon E-gift'
          : 'Payment: Venmo';
    const memoEl = $('confirmMemo');
    memoEl.hidden = !state.memo;
    memoEl.textContent = state.memo ? 'Memo: ' + state.memo : '';
    const bits = [];
    if (users.platform && users.user) {
      const labels = {telegram:'Telegram',stripchat:'Stripchat',onlyfans:'OnlyFans',x:'X'};
      bits.push((labels[users.platform] || users.platform) + ': ' + users.user);
    }
    $('confirmUsers').textContent = bits.join(' · ');
    const note = notesText().trim();
    const noteEl = $('confirmNotes');
    noteEl.hidden = !note;
    noteEl.textContent = note ? 'Notes: ' + note : '';
    const shot = $('confirmShot');
    if (state.proofUrl) {
      shot.src = state.proofUrl;
      shot.hidden = false;
      $('confirmProof').textContent = 'Proof of payment attached: ' + state.proofName;
    } else {
      shot.removeAttribute('src');
      shot.hidden = true;
      $('confirmProof').textContent = 'No payment screenshot attached.';
    }
    const badge = $('confirmBadge');
    if (badge) {
      badge.classList.toggle('is-warn', !saved);
      badge.textContent = saved ? 'Saved for review' : 'Not saved';
    }
    $('confirmHeading').innerHTML = saved ? 'Mwah. Got it <span aria-hidden="true">♡</span>' : 'Not sent';
    $('confirmLead').textContent = saved
      ? 'Your order has been received for review!'
      : (detail || 'This order was not saved.');
    const ref = $('confirmRef');
    if (ref) {
      if (saved && state.lastOrderId) {
        ref.hidden = false;
        ref.textContent = 'Order #' + state.lastOrderId;
      } else {
        ref.hidden = true;
        ref.textContent = '';
      }
    }
    if ($('returnChat')) $('returnChat').hidden = true;
    if (saved) clearWizardProgress();
    goToStep('confirm');
  }

  async function submitOrder(event) {
    event.preventDefault();
    showError('');
    const amount = total();
    const users = handles();
    if ($('checkoutWebsite').value) {
      showError('This order was not saved.');
      return;
    }
    if (Math.round(amount * 100) <= 0) {
      showError('Add an item or a custom amount first.');
      return;
    }
    if (state.tip > catalog.maxTip) {
      showError('Custom amount can’t be more than ' + money(catalog.maxTip) + ' on this page.');
      return;
    }
    if (Math.round(amount * 100) > 250000) {
      showError('This page can submit up to $2,500. Split the order or message Evie. Nothing was saved.');
      return;
    }
    if (unrecognizedCount() > 0) {
      showError('Remove bag items that are not on this payment link before submitting.');
      return;
    }
    if (!users.platform || ['telegram','stripchat','onlyfans','x'].indexOf(users.platform) === -1) {
      showError('Choose where I should find you.');
      return;
    }
    if (!users.user) {
      showError('Enter your username so I can keep track of who’s paid.');
      return;
    }
    if (!HANDLE_RE.test(users.user)) {
      showError('Usernames can use letters, numbers, @, periods, underscores, and hyphens.');
      return;
    }
    if (!$('checkoutAdult') || !$('checkoutAdult').checked) {
      showError('Confirm you are 18 or older.');
      goToStep('proof');
      return;
    }
    if (!$('checkoutFulfillment') || !$('checkoutFulfillment').checked) {
      showError('Agree to the fulfillment terms before sending.');
      goToStep('proof');
      return;
    }
    const note = notesText().trim();
    if (note.length > 500) {
      showError('Notes need to be 500 characters or fewer.');
      return;
    }
    if (!state.proofFile) {
      showError('Upload a payment screenshot before submitting.');
      return;
    }
    const api = String(window.EVIE_ORDER_API_URL || '').trim();
    if (!api) {
      showError('Checkout saving isn’t connected yet, so this order was not saved. Copy the summary and send it to Evie. Nothing was marked as paid.');
      return;
    }
    const payload = {
      request_id: state.requestId,
      items: payableLines().map((line) => line.id ? {id: line.id, qty: line.qty} : {name: line.name, qty: line.qty}),
      tip_cents: Math.round((Number(state.tip) || 0) * 100),
      payment_method: paymentMethodCode(),
      contact_platform: users.platform,
      contact_handle: users.user,
      snapchat_handle: users.snap,
      telegram_handle: users.telegram,
      x_handle: users.x,
      notes: note,
      payment_memo: state.memo,
      promo_code: promoCodeForOrder(),
      adult_confirmed: true,
      website: ''
    };
    const body = new FormData();
    body.append('order', JSON.stringify(payload));
    body.append('proof', state.proofFile, state.proofFile.name || 'payment-proof');
    const button = $('submitCheckout');
    button.disabled = true;
    button.textContent = 'Sending…';
    const headers = {};
    if (window.EVIE_SUPABASE_PUBLISHABLE_KEY) headers.apikey = window.EVIE_SUPABASE_PUBLISHABLE_KEY;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(api, {method: 'POST', headers: headers, body: body, signal: controller.signal});
      const data = await response.json().catch(() => null);
      if (response.status === 409 && data && data.memo) {
        applyMemo(data.memo, true);
        showError(data.error || 'That memo was just used. Copy the new one into Venmo, Cash App, or PayPal.');
        return;
      }
      if (!response.ok || !data || data.ok !== true || !data.order_id) {
        const reason = data && data.error ? data.error : (response.status === 404
          ? 'The payment server isn’t deployed yet.'
          : 'The payment server did not accept this order.');
        showError(reason + ' This order was not saved. Nothing was marked as paid.');
        return;
      }
      state.submitted = true;
      state.lastOrderId = data.order_id;
      try { sessionStorage.setItem(TERMS_KEY, 'yes'); } catch (err) { /* private mode */ }
      showConfirm(true, 'Evie still confirms payment from your screenshot. This page cannot see whether Venmo, Cash App, PayPal, or Amazon received the money.');
    } catch (err) {
      showError('The payment server didn’t respond, so this order was not saved. Nothing was marked as paid. Copy the summary and message Evie if you already sent the money.');
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = 'Send my order ♡';
    }
  }


  const STEPS = ['order', 'pay', 'contact', 'proof', 'confirm'];
  const STEP_NAMES = {order:'Your bag', pay:'Payment', contact:'Your info', proof:'Payment proof', confirm:'All finished'};
  const STEP_HINTS = {order:'Your treat is waiting', pay:'One payment option', contact:'Just one username', proof:'Almost finished', confirm:'Saved for review'};
  const STEP_LABELS = {order:'Looks good, next ♡', pay:'Continue to payment ♡', contact:'Next: payment proof →', proof:'Send my order ♡', confirm:''};
  const PROGRESS_KEY = 'evie-checkout-wizard-v1';
  const PROOF_KEY = 'evie-checkout-proof-v1';
  state.step = state.step || 'order';
  state.lastOrderId = state.lastOrderId || '';

  function charmSrc(line) {
    const name = String((line && (line.name || line.id)) || '').toLowerCase();
    if (name.indexOf('deluxe') !== -1 || name.indexOf('dropbox') !== -1 || name.indexOf('vault') !== -1) return '/assets/brand/dropbox-mark.webp';
    let file = 'gift.webp';
    if (name.indexOf('vip') !== -1) file = 'crown.webp';
    else if (name.indexOf('custom') !== -1) file = 'phone.webp';
    else if (name.indexOf('20 pics') !== -1 || name.indexOf('20 for') !== -1) file = 'cherries.webp';
    return '/assets/charms/' + file;
  }
  function haulCard(line) {
    const listed = line.id && itemById(line.id) ? referencePrice(itemById(line.id)) : line.price;
    const old = listed > line.price ? '<span class="old-price">' + money(listed * (line.qty || 1)) + '</span>' : '';
    const inc = line.id ? 'data-inc="' + escapeHtml(line.id) + '"' : 'data-inc-extra="' + line.extraIndex + '"';
    const dec = line.id ? 'data-dec="' + escapeHtml(line.id) + '"' : 'data-dec-extra="' + line.extraIndex + '"';
    const remove = line.id ? 'data-remove="' + escapeHtml(line.id) + '"' : 'data-remove-extra="' + line.extraIndex + '"';
    return '<div class="item-card">' +
      '<div class="item-art"><img class="charm-img" src="' + charmSrc(line) + '" alt=""></div>' +
      '<div class="item-copy"><h3>' + escapeHtml(line.name) + '</h3>' +
      '<div class="stepper"><button type="button" ' + dec + ' aria-label="Decrease">−</button><span class="qty">' + line.qty + '</span><button type="button" ' + inc + ' aria-label="Increase">+</button></div></div>' +
      '<div class="item-price">' + old + '<strong>' + money(line.total) + '</strong>' +
      '<button type="button" class="trash" ' + remove + ' aria-label="Remove">Remove</button></div></div>';
  }
  function fillConfiguredHandles() {
    document.querySelectorAll('[data-handle]').forEach((node) => {
      const key = node.getAttribute('data-handle');
      if (key && catalog[key]) node.textContent = catalog[key];
    });
  }
  function persistProgress() {
    try {
      const users = handles();
      const data = {
        step: state.step === 'confirm' ? 'confirm' : state.step,
        method: state.method,
        platform: users.platform,
        user: users.user,
        note: notesText(),
        adult: !!(!($('checkoutAdult')) || $('checkoutAdult').checked),
        fulfillment: !!(!($('checkoutFulfillment')) || $('checkoutFulfillment').checked),
        promo: state.promoCode || ($('promoCode') && $('promoCode').value) || ''
      };
      if (state.submitted) return;
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    } catch (err) { /* private mode */ }
  }
  function clearWizardProgress() {
    try {
      sessionStorage.removeItem(PROGRESS_KEY);
      sessionStorage.removeItem(PROOF_KEY);
    } catch (err) { /* private mode */ }
  }
  function formatBytes(n) {
    if (!n) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function setProof(file, input) {
    if (state.proofUrl) URL.revokeObjectURL(state.proofUrl);
    state.proofUrl = '';
    state.proofName = '';
    state.proofFile = null;
    const box = $('uploadBox');
    const chip = $('fileChip');
    const preview = $('proofPreview');
    const nameEl = $('fileName');
    const sizeEl = $('fileSize');
    const remove = $('removeProof');
    const label = $('fileLabel');
    const help = $('fileHelp');
    if (!file) {
      if (box) box.classList.remove('has-file');
      if (chip) chip.hidden = true;
      if (preview) preview.removeAttribute('src');
      if (nameEl) nameEl.textContent = '';
      if (remove) remove.hidden = true;
      if (label) label.textContent = 'Add your payment screenshot';
      if (help) help.textContent = 'Tap to upload or drag & drop · image files only · required';
      try { sessionStorage.removeItem(PROOF_KEY); } catch (err) {}
      updateWizardChrome();
      return Promise.resolve();
    }
    return validateImage(file).then(() => {
      showError('');
      state.proofFile = file;
      state.proofName = file.name || 'payment-screenshot';
      const type = String(file.type || '').toLowerCase();
      if (chip) chip.hidden = false;
      if (nameEl) nameEl.textContent = state.proofName;
      if (sizeEl) sizeEl.textContent = formatBytes(file.size);
      if (remove) remove.hidden = false;
      if (label) label.textContent = state.proofName;
      if (type === 'image/heic' || type === 'image/heif') {
        if (preview) preview.removeAttribute('src');
        if (help) help.textContent = 'Preview isn’t available for this format, and it will still be uploaded.';
      } else {
        state.proofUrl = URL.createObjectURL(file);
        if (preview) { preview.src = state.proofUrl; preview.hidden = false; }
        if (help) help.textContent = formatBytes(file.size);
      }
      if (file.size <= 2.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          try { sessionStorage.setItem(PROOF_KEY, JSON.stringify({name: state.proofName, type: file.type, dataUrl: reader.result})); } catch (err) {}
        };
        reader.readAsDataURL(file);
      }
      updateWizardChrome();
    }).catch((err) => {
      if (input) input.value = '';
      if (chip) chip.hidden = true;
      showError(err.message || 'Please upload an image of your payment screenshot.');
      updateWizardChrome();
    });
  }
  function restoreProof() {
    const saved = readJson(PROOF_KEY, null);
    if (!saved || !saved.dataUrl) return;
    fetch(saved.dataUrl).then((res) => res.blob()).then((blob) => {
      const file = new File([blob], saved.name || 'payment-screenshot', {type: saved.type || blob.type || 'image/jpeg'});
      return setProof(file);
    }).catch(() => {});
  }
  function listedMerchandise() {
    return payableLines().reduce((sum, line) => {
      const listed = line.id && itemById(line.id) ? referencePrice(itemById(line.id)) : line.price;
      return sum + listed * (line.qty || 1);
    }, 0) + (Number(state.tip) || 0);
  }
  function updateWizardChrome() {
    const step = state.step || 'order';
    const form = $('checkoutForm');
    if (form) form.setAttribute('data-step', step);
    document.querySelectorAll('.wizard-step').forEach((el) => {
      const on = el.getAttribute('data-step') === step;
      el.classList.toggle('is-on', on);
      el.hidden = !on;
    });
    const idx = STEPS.indexOf(step);
    document.querySelectorAll('#wizardProgress .seg').forEach((seg, i) => {
      seg.classList.toggle('on', i <= idx && step !== 'confirm' ? i <= Math.min(idx, 3) : step === 'confirm' || i <= idx);
      if (step === 'confirm') seg.classList.add('on');
    });
    if ($('stepCount')) $('stepCount').textContent = step === 'confirm' ? 'Done' : 'Step ' + Math.min(idx + 1, 4) + ' of 4';
    if ($('stepName')) $('stepName').textContent = STEP_NAMES[step] || '';
    if ($('bottomHint')) $('bottomHint').textContent = STEP_HINTS[step] || '';
    const back = $('wizardBack');
    if (back) back.hidden = step === 'order' || step === 'confirm';
    const totalBox = document.querySelector('.wizard-bottom .total');
    if (totalBox) totalBox.style.visibility = step === 'confirm' ? 'hidden' : 'visible';
    const amount = total();
    if ($('nextLabel')) {
      if (step === 'order' || step === 'pay') $('nextLabel').textContent = 'Pay ' + money(amount);
      else $('nextLabel').textContent = STEP_LABELS[step] || '';
    }
    const nextArrow = document.querySelector('#nextBtn [aria-hidden="true"]');
    if (nextArrow) nextArrow.hidden = (step === 'order' || step === 'pay');
    const payAgreeWrap = $('payAgreementWrap');
    const deliveryPromise = $('deliveryPromise');
    if (payAgreeWrap) payAgreeWrap.hidden = step !== 'pay';
    if (deliveryPromise) deliveryPromise.hidden = step !== 'pay';
    if ($('stickyAmount')) $('stickyAmount').textContent = money(amount);
    if ($('haulTotal')) $('haulTotal').textContent = money(amount);
    if ($('summaryTotal')) $('summaryTotal').textContent = money(amount);
    const listed = listedMerchandise() + amazonFee();
    const payable = amount;
    if ($('summarySubtotal')) $('summarySubtotal').textContent = money(Math.max(listed, payable));
    const disc = Math.round((listed - payable) * 100) / 100;
    if ($('discountRow')) {
      $('discountRow').hidden = !(disc > 0);
      if ($('discountValue') && disc > 0) $('discountValue').textContent = '−' + money(disc);
    }
    if ($('amountBreakdown')) $('amountBreakdown').hidden = !(payableLines().length || state.tip);
    document.querySelectorAll('.live-total').forEach((node) => { node.textContent = money(amount); });
    if (typeof renderStickyUpsell === 'function') renderStickyUpsell();
    const next = $('nextBtn');
    const submit = $('submitCheckout');
    const users = handles();
    const bagOk = (payableLines().length > 0 || state.tip > 0) && unrecognizedCount() === 0;
    const contactOk = !!users.platform && ['telegram','snapchat','x','onlyfans','stripchat'].indexOf(users.platform) !== -1 && !!users.user && HANDLE_RE.test(users.user);
    const proofOk = !!state.proofFile && !!($('checkoutAdult') && $('checkoutAdult').checked) && !!($('checkoutFulfillment') && $('checkoutFulfillment').checked);
    if (next) {
      next.hidden = step === 'proof' || step === 'confirm';
      let enabled = true;
      if (step === 'order') enabled = bagOk;
      if (step === 'pay') enabled = bagOk && !($('payAgreement') && !$('payAgreement').checked);
      if (step === 'contact') enabled = contactOk;
      next.disabled = !enabled || state.submitted;
    }
    if (submit) {
      submit.hidden = step !== 'proof';
      submit.disabled = !proofOk || state.submitted;
    }
    persistProgress();
  }
  function goToStep(name, opts) {
    const next = STEPS.indexOf(name) === -1 ? 'order' : name;
    if (state.submitted && next !== 'confirm' && !(opts && opts.edit)) return;
    state.step = next;
    showError('');
    updateWizardChrome();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const on = document.querySelector('.wizard-step.is-on');
    if (on && !(opts && opts.silent)) {
      const title = on.querySelector('h2, h1');
      if (title) title.focus({preventScroll: true});
      if (!(opts && opts.noscroll)) on.scrollIntoView({behavior: 'auto', block: 'start'});
    }
  }
  function restoreProgress() {
    const saved = readJson(PROGRESS_KEY, null);
    if (!saved || typeof saved !== 'object') return;
    if (saved.method) state.method = knownMethod(saved.method);
    if (saved.platform) setContact(saved.platform);
    if (saved.user && $('contactUser')) $('contactUser').value = String(saved.user).replace(/^@+/, '');
    if (saved.note && $('orderNotes')) $('orderNotes').value = String(saved.note).slice(0, 500);
    if (saved.promo && $('promoCode')) $('promoCode').value = String(saved.promo);
    if ($('checkoutAdult')) $('checkoutAdult').checked = !!saved.adult;
    if ($('checkoutFulfillment')) $('checkoutFulfillment').checked = !!saved.fulfillment;
    const step = saved.step && STEPS.indexOf(saved.step) !== -1 ? saved.step : 'order';
    if (step !== 'confirm') state.step = step;
  }
  function openVenmoPay() {
    state.memoLocked = true;
    const urls = venmoUrls();
    openPayInNewTab(isMobilePay() ? urls.app : urls.web);
  }
  function openCashPay() {
    const urls = cashUrls();
    openPayInNewTab(urls.app || urls.web);
  }
  function openPaypalPay() {
    state.memoLocked = true;
    openPayInNewTab(catalog.paypalUrl);
  }
  function openAmazonPay() {
    copyText(catalog.amazonEmail, 'Email copied, paste it in the To field');
    openPayInNewTab(catalog.amazonUrl);
  }
  function openSelectedProvider() {
    if (state.method === 'venmo') { openVenmoPay(); return; }
    if (state.method === 'cashapp') { openCashPay(); return; }
    if (state.method === 'paypal') { openPaypalPay(); return; }
    if (state.method === 'amazon_egift') { openAmazonPay(); }
  }
  function stepError(step, message) {
    goToStep(step);
    showError(message);
  }
  function advanceFrom(step) {
    if (step === 'order') {
      if (!(payableLines().length > 0 || state.tip > 0)) return stepError('order', 'Add an item or a custom amount first.');
      if (unrecognizedCount() > 0) return stepError('order', 'Remove bag items that are not on this payment link before continuing.');
      goToStep('pay');
      return;
    }
    if (step === 'pay') {
      const agreed = $('payAgreement');
      if (agreed && !agreed.checked) return stepError('pay', 'Check the box so I know you saw that nothing is charged until I confirm your total.');
      openSelectedProvider();
      goToStep('contact');
      return;
    }
    if (step === 'contact') {
      const users = handles();
      if (!users.platform || ['telegram','snapchat','x','onlyfans','stripchat'].indexOf(users.platform) === -1) return stepError('contact', 'Choose where I should find you.');
      if (!users.user) return stepError('contact', 'Enter your username so I can keep track of who’s paid.');
      if (!HANDLE_RE.test(users.user)) return stepError('contact', 'Usernames can use letters, numbers, @, periods, underscores, and hyphens.');
      goToStep('proof');
    }
  }


  function updateSubmitState() { updateWizardChrome(); }
  function onBagClick(event) {
    const inc = event.target.closest('[data-inc]');
    const dec = event.target.closest('[data-dec]');
    const incExtra = event.target.closest('[data-inc-extra]');
    const decExtra = event.target.closest('[data-dec-extra]');
    if (inc) addItem(inc.getAttribute('data-inc'));
    if (dec) setQty(dec.getAttribute('data-dec'), state.qty[dec.getAttribute('data-dec')] - 1);
    if (incExtra) setExtra(Number(incExtra.getAttribute('data-inc-extra')), state.extras[Number(incExtra.getAttribute('data-inc-extra'))].qty + 1);
    if (decExtra) setExtra(Number(decExtra.getAttribute('data-dec-extra')), state.extras[Number(decExtra.getAttribute('data-dec-extra'))].qty - 1);
    const remove = event.target.closest('[data-remove]');
    const removeExtra = event.target.closest('[data-remove-extra]');
    if (remove) setQty(remove.getAttribute('data-remove'), 0);
    if (removeExtra) setExtra(Number(removeExtra.getAttribute('data-remove-extra')), 0);
  }
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-upsell]');
    if (!btn) return;
    const offer = currentUpsell();
    if (offer) offer.apply();
  });
  $('itemList').addEventListener('click', onBagClick);
  if ($('selectedSummary')) $('selectedSummary').addEventListener('click', onBagClick);
    if ($('itemList')) $('itemList').addEventListener('click', (event) => {
      const more = event.target.closest('#seeMoreCatalog');
      if (!more) return;
      catalogExpanded = !catalogExpanded;
      renderItems();
    });
    if ($('stickyUpsell')) $('stickyUpsell').addEventListener('click', onBagClick);
  $('tipInput').addEventListener('input', (event) => {
    const raw = event.target.value;
    state.tip = raw === '' ? 0 : Math.max(0, Number(raw) || 0);
    persistTip();
    renderAmount();
    renderSelected();
  });
  function persistHandles() {
    try { sessionStorage.setItem(HANDLES_KEY, JSON.stringify(handles())); } catch (err) { /* private mode */ }
    updateSubmitState();
  }
  ['contactPlatform', 'contactUser'].forEach((id) => {
    if ($(id)) $(id).addEventListener('change', persistHandles);
    if ($(id)) $(id).addEventListener('input', persistHandles);
  });
  document.querySelectorAll('[data-select]').forEach((btn) => {
    btn.addEventListener('click', () => selectMethod(btn.getAttribute('data-select')));
  });
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.getAttribute('data-copy')));
  });
  document.querySelectorAll('[data-copy-memo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.memoLocked = true;
      copyText(state.memo || 'Food');
    });
  });
  $('openVenmo').addEventListener('click', (event) => {
    event.preventDefault();
    openVenmoPay();
  });
  $('openCash').addEventListener('click', (event) => {
    event.preventDefault();
    openCashPay();
  });
  const openPaypal = $('openPaypal');
  if (openPaypal) {
    if (catalog.paypalUrl) openPaypal.href = catalog.paypalUrl;
    openPaypal.setAttribute('target', '_blank');
    openPaypal.setAttribute('rel', 'noopener noreferrer');
    openPaypal.addEventListener('click', (event) => {
      event.preventDefault();
      openPaypalPay();
    });
  }
  const copyPaypalAmount = $('copyPaypalAmount');
  if (copyPaypalAmount) copyPaypalAmount.addEventListener('click', () => copyText(money(total())));
  const amazonEmail = $('amazonEmail');
  if (amazonEmail && catalog.amazonEmail) amazonEmail.textContent = catalog.amazonEmail;
  const copyAmazonEmail = $('copyAmazonEmail');
  if (copyAmazonEmail) copyAmazonEmail.addEventListener('click', () => copyText(catalog.amazonEmail));
  const copyAmazonAmount = $('copyAmazonAmount');
  if (copyAmazonAmount) copyAmazonAmount.addEventListener('click', () => copyText(money(total())));
  const openAmazon = $('openAmazon');
  if (openAmazon) {
    if (catalog.amazonUrl) openAmazon.href = catalog.amazonUrl;
    openAmazon.setAttribute('target', '_blank');
    openAmazon.setAttribute('rel', 'noopener noreferrer');
    openAmazon.addEventListener('click', (event) => {
      event.preventDefault();
      openAmazonPay();
    });
  }
  const payAgreement = $('payAgreement');
  if (payAgreement) payAgreement.addEventListener('change', updateWizardChrome);
  const openAgreement = $('openAgreement');
  const agreementSheet = $('agreementSheet');
  const closeAgreement = $('closeAgreement');
  if (openAgreement && agreementSheet) {
    openAgreement.addEventListener('click', (event) => {
      event.preventDefault();
      if (agreementSheet.showModal) agreementSheet.showModal();
      else agreementSheet.hidden = false;
    });
  }
  if (closeAgreement && agreementSheet) {
    closeAgreement.addEventListener('click', () => {
      if (agreementSheet.close) agreementSheet.close();
      else agreementSheet.hidden = true;
    });
  }
  window.addEventListener('focus', onReturnedFromPay);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onReturnedFromPay();
  });
  const paidGo = $('paidReturnGo');
  if (paidGo) paidGo.addEventListener('click', () => {
    hidePaidReturnPrompt();
    goToStep('proof');
  });
  const paidDismiss = $('paidReturnDismiss');
  if (paidDismiss) paidDismiss.addEventListener('click', hidePaidReturnPrompt);
  function bindChat(id, kind) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', (event) => {
      event.preventDefault();
      if (kind === 'x') openApp('twitter://user?screen_name=' + catalog.xUser, catalog.xWeb);
      if (kind === 'tg') openApp('tg://resolve?domain=' + catalog.telegramUser, catalog.telegramWeb);
      if (kind === 'channel') openApp('tg://resolve?domain=' + catalog.telegramChannelUser, catalog.telegramChannelWeb);
    });
  }
  bindChat('openX', 'x');
  bindChat('openX2', 'x');
  bindChat('openTg', 'tg');
  bindChat('openTg2', 'tg');
  bindChat('openTgChannel', 'channel');
  bindChat('openTgChannel2', 'channel');
  function renderNotesCount() {
    $('notesCount').textContent = notesText().length + ' / 500';
  }
  $('orderNotes').addEventListener('input', () => {
    if ($('orderNotes').value.length > 500) $('orderNotes').value = $('orderNotes').value.slice(0, 500);
    try { sessionStorage.setItem(NOTES_KEY, notesText()); } catch (err) { /* private mode */ }
    renderNotesCount();
  });
  $('toggleCatalog').addEventListener('click', () => {
    catalogReady = true;
    catalogOpen = !catalogOpen;
    applyCatalog();
  });
  $('applyPromo').addEventListener('click', () => applyPromo($('promoCode').value));
  $('promoCode').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyPromo($('promoCode').value);
  });
  if ($('proofInput')) $('proofInput').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    setProof(file || null, event.target);
  });
  if (false && $('proofInput')) $('proofInput').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (state.proofUrl) URL.revokeObjectURL(state.proofUrl);
    state.proofUrl = '';
    state.proofName = '';
    state.proofFile = null;
    if (!file) {
      $('uploadBox').classList.remove('has-file');
      $('proofPreview').removeAttribute('src');
      $('fileName').hidden = true;
      return;
    }
    try {
      await validateImage(file);
    } catch (err) {
      event.target.value = '';
      $('uploadBox').classList.remove('has-file');
      $('proofPreview').removeAttribute('src');
      $('fileName').hidden = true;
      showError(err.message || 'Please upload an image of your payment screenshot.');
      return;
    }
    showError('');
    state.proofFile = file;
    state.proofName = file.name || 'payment-screenshot';
    const type = String(file.type || '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif') {
      $('uploadBox').classList.remove('has-file');
      $('fileName').hidden = false;
      $('fileName').textContent = state.proofName + ' · preview isn’t available for this format, and it will still be uploaded.';
      return;
    }
    state.proofUrl = URL.createObjectURL(file);
    $('proofPreview').src = state.proofUrl;
    $('uploadBox').classList.add('has-file');
    $('fileName').hidden = false;
    $('fileName').textContent = state.proofName;
  });
  $('checkoutForm').addEventListener('submit', submitOrder);
  $('copySummary').addEventListener('click', () => copyText(summaryText()));
  if ($('editOrder')) $('editOrder').addEventListener('click', () => {
    if (state.submitted) rotateRequest();
    state.submitted = false;
    state.lastOrderId = '';
    goToStep('order', {edit: true});
    window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });


  fillConfiguredHandles();
  document.querySelectorAll('[data-copy-handle]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(catalog[btn.getAttribute('data-copy-handle')] || ''));
  });
  document.querySelectorAll('[data-copy-total]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(money(total())));
  });
  document.querySelectorAll('[data-contact]').forEach((btn) => {
    btn.addEventListener('click', () => setContact(btn.getAttribute('data-contact')));
  });
  if ($('wizardBack')) $('wizardBack').addEventListener('click', () => {
    const idx = STEPS.indexOf(state.step);
    if (idx > 0) goToStep(STEPS[idx - 1]);
  });
  if ($('nextBtn')) $('nextBtn').addEventListener('click', () => advanceFrom(state.step));
  if ($('removeProof')) $('removeProof').addEventListener('click', () => {
    if ($('proofInput')) $('proofInput').value = '';
    setProof(null);
  });
  const uploadBox = $('uploadBox');
  if (uploadBox) {
    ['dragenter','dragover'].forEach((name) => uploadBox.addEventListener(name, (event) => {
      event.preventDefault();
      uploadBox.classList.add('is-drop');
    }));
    ['dragleave','drop'].forEach((name) => uploadBox.addEventListener(name, (event) => {
      event.preventDefault();
      uploadBox.classList.remove('is-drop');
    }));
    uploadBox.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) setProof(file, $('proofInput'));
    });
  }
  if ($('checkoutAdult')) $('checkoutAdult').addEventListener('change', updateWizardChrome);
  if ($('checkoutFulfillment')) $('checkoutFulfillment').addEventListener('change', updateWizardChrome);
  if ($('contactUser')) {
    $('contactUser').addEventListener('input', () => { persistHandles(); persistProgress(); updateWizardChrome(); });
  }

  hydrate();
  persistBag();
  const savedHandles = readJson(HANDLES_KEY, null);
  if (savedHandles && typeof savedHandles === 'object') {
    const platform = savedHandles.platform || (savedHandles.telegram ? 'telegram' : savedHandles.x ? 'x' : savedHandles.snap ? 'snapchat' : '');
    const user = savedHandles.user || savedHandles.telegram || savedHandles.x || savedHandles.snap || '';
    if (platform) setContact(platform);
    if ($('contactUser') && user) $('contactUser').value = String(user).replace(/^@+/, '');
    handles();
  }
  try {
    const savedNotes = sessionStorage.getItem(NOTES_KEY);
    if (savedNotes) $('orderNotes').value = String(savedNotes).slice(0, 500);
  } catch (err) { /* private mode */ }
  renderNotesCount();
  showPromoStatus();
  /* Do not auto-check 18+ / fulfillment from a prior order. Progress restore handles mid-flow. */
  if (state.tip) $('tipInput').value = String(state.tip);
  restoreProgress();
  restoreProof();
  selectMethod(state.method);
  render();
  goToStep(state.step || 'order', {silent: true, noscroll: true});
  updateWizardChrome();

  window.EvieCheckout = {
    goToStep: goToStep,
    total: total,
    merchandiseTotal: merchandiseTotal,
    amazonFee: amazonFee,
    money: money,
    venmoUrls: venmoUrls,
    cashUrls: cashUrls,
    setQty: setQty,
    addItem: addItem,
    summaryText: summaryText,
    state: () => ({
      qty: Object.assign({}, state.qty),
      tip: state.tip,
      method: state.method,
      promoUnlocked: state.promoUnlocked,
      promoCode: promoCodeForOrder(),
      notes: notesText().trim(),
      memo: state.memo,
      extras: state.extras.map((extra) => Object.assign({}, extra))
    })
  };

  const SHOWN_KEY = 'evie-shown-memos';
  function readShown() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(-120) : [];
    } catch (err) {
      return [];
    }
  }
  function rememberMemo(memo) {
    const shown = readShown().filter((item) => item !== memo);
    shown.push(memo);
    try { localStorage.setItem(SHOWN_KEY, JSON.stringify(shown.slice(-120))); } catch (err) { /* private mode */ }
  }
  function applyMemo(memo, lock) {
    const text = String(memo || '').trim();
    if (!text) return;
    state.memo = text;
    if (lock) state.memoLocked = true;
    document.querySelectorAll('.memo-text').forEach((node) => { node.textContent = text; });
    rememberMemo(text);
  }
  function localMemo(exclude) {
    if (window.EVIE_MEMOS && window.EVIE_MEMOS.pickMemo) return window.EVIE_MEMOS.pickMemo([], exclude);
    return 'Food';
  }
  async function loadMemo() {
    const first = localMemo(readShown());
    applyMemo(first, false);
    const api = String(window.EVIE_ORDER_API_URL || '').trim();
    if (!api || !window.EVIE_MEMOS) return;
    const url = new URL(api);
    url.searchParams.set('action', 'memo');
    readShown().forEach((memo) => url.searchParams.append('exclude', memo));
    const headers = {};
    if (window.EVIE_SUPABASE_PUBLISHABLE_KEY) headers.apikey = window.EVIE_SUPABASE_PUBLISHABLE_KEY;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {method: 'GET', headers: headers, signal: controller.signal});
      const data = await response.json().catch(() => null);
      if (response.ok && data && window.EVIE_MEMOS.isKnownMemo(data.memo) && !state.memoLocked && data.memo !== state.memo) {
        applyMemo(data.memo, false);
      }
    } catch (err) { /* keep the memo already on the page */ }
    finally { clearTimeout(timer); }
  }
  if (window.EVIE_MEMOS) loadMemo();
  else window.addEventListener('evie-memos-ready', function () { loadMemo(); }, {once: true});
})();
