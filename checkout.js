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
    promoNotice: ''
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
    if (method === 'venmo') return 'venmo';
    if (method === 'cashapp') return 'cashapp';
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
    readBag().forEach((line) => {
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
      if (id === 'deluxe55' && !state.promoUnlocked) return;
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
      if (savedMethod === 'venmo' || savedMethod === 'cashapp') state.method = savedMethod;
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
    state.extras.forEach((extra) => {
      if (extra.unrecognized || extra.qty <= 0) return;
      lines.push({
        name: extra.name,
        qty: extra.qty,
        price: extra.price,
        total: extra.price * extra.qty,
        note: Number(extra.bagPrice) !== extra.price ? 'Menu bag had ' + money(extra.bagPrice) + '. This payment link uses ' + money(extra.price) + '.' : ''
      });
    });
    return lines;
  }
  function total() {
    const itemsTotal = payableLines().reduce((sum, line) => sum + line.total, 0);
    return Math.round((itemsTotal + (Number(state.tip) || 0)) * 100) / 100;
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

  function renderItems() {
    const rows = items.filter((item) => item.id !== 'deluxe55' || state.promoUnlocked).map((item) => {
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
    });
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

  function recommendations() {
    const recs = [];
    if (state.promoUnlocked && !state.qty.deluxe && !state.qty.deluxe55) {
      recs.push({
        id: 'deluxe55',
        name: 'Deluxe Dropbox Today Promo',
        price: 55,
        blurb: '900+ vault, today’s price',
        action: () => { setQty('deluxe55', 1); toast('Added Deluxe Dropbox'); }
      });
    }
    if (!state.qty.vip1 && !state.qty.vip3) {
      recs.push({
        id: 'vip1',
        name: 'VIP 1 Month',
        price: 150,
        blurb: 'Unlocks FaceTime eligibility',
        action: () => { addItem('vip1'); toast('Added VIP 1 Month'); }
      });
    }
    if (state.qty.bundle10 > 0) {
      recs.push({
        id: 'bundle20',
        name: '20 pics/vids',
        price: 20,
        blurb: '20-for-$20 upgrade',
        action: () => {
          if (state.qty.bundle10 > 0) state.qty.bundle10 -= 1;
          if (state.qty.bundle10 === 0) delete state.origin.bundle10;
          state.qty.bundle20 = Math.min(catalog.maxQty, state.qty.bundle20 + 1);
          persistBag();
          render();
          toast('Upgraded to 20 pics/vids');
        }
      });
    }
    return recs;
  }
  function renderRecs() {
    const recs = recommendations();
    const box = $('recs');
    if (!recs.length) {
      box.innerHTML = '<p class="recs-empty">You’re all set — nothing else to add right now.</p>';
      return;
    }
    box.innerHTML = recs.map((rec) => (
      '<div class="rec"><div><strong>' + escapeHtml(rec.name) + '</strong>' +
      '<span class="price">' + money(rec.price) + '</span><em>' + escapeHtml(rec.blurb) + '</em></div>' +
      '<button type="button" class="add-btn" data-rec="' + rec.id + '">+ Add</button></div>'
    )).join('');
    box.querySelectorAll('[data-rec]').forEach((btn) => {
      const rec = recs.find((row) => row.id === btn.getAttribute('data-rec'));
      btn.addEventListener('click', rec.action);
    });
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
  }
  function render() {
    renderItems();
    renderRecs();
    renderAmount();
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1600);
  }
  async function copyText(value) {
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
      toast('Copied');
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
  function selectMethod(next) {
    state.method = next === 'cashapp' ? 'cashapp' : 'venmo';
    try { sessionStorage.setItem(METHOD_KEY, state.method); } catch (err) { /* private mode */ }
    document.querySelectorAll('.pay-card').forEach((card) => {
      const on = card.getAttribute('data-method') === state.method;
      card.classList.toggle('is-on', on);
      const head = card.querySelector('[data-select]');
      if (head) head.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function venmoUrls() {
    const amount = total();
    let pay = 'venmo://paycharge?txn=pay&recipients=' + encodeURIComponent(catalog.venmoRecipient);
    if (amount > 0) pay += '&amount=' + encodeURIComponent(amountParam(amount));
    pay += '&note=' + encodeURIComponent(catalog.memo);
    return {app: pay, web: catalog.venmoWeb};
  }
  function cashUrls() {
    const amount = total();
    const web = amount > 0
      ? 'https://cash.app/$' + catalog.cashAppSlug + '/' + encodeURIComponent(amountParam(amount))
      : 'https://cash.app/$' + catalog.cashAppSlug;
    return {app: web, web: web};
  }
  function cleanHandle(value) {
    return String(value || '').trim();
  }
  function handles() {
    return {
      snap: cleanHandle($('snapUser').value),
      telegram: cleanHandle($('tgUser').value),
      x: cleanHandle($('xUser').value)
    };
  }
  function showError(message) {
    const el = $('formErr');
    el.hidden = !message;
    el.textContent = message || '';
    $('copySummary').hidden = !message;
  }
  function summaryText() {
    const users = handles();
    const lines = payableLines().map((line) => (line.qty > 1 ? line.qty + ' × ' : '') + line.name + ' — ' + money(line.total));
    if (state.tip) lines.push('Custom amount / tip — ' + money(state.tip));
    const who = [];
    if (users.snap) who.push('Snapchat: ' + users.snap);
    if (users.telegram) who.push('Telegram: ' + users.telegram);
    if (users.x) who.push('X: ' + users.x);
    const note = notesText().trim();
    return [
      'Kissed by Evie checkout',
      lines.join('\n') || 'No priced items',
      'Amount: ' + money(total()),
      'Payment: ' + (state.method === 'cashapp' ? 'Cash App ' + catalog.cashAppHandle : 'Venmo ' + catalog.venmoHandle),
      'Memo: ' + catalog.memo,
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
    list.innerHTML = rows.join('');
    $('confirmTotal').textContent = money(amount);
    $('confirmPay').textContent = state.method === 'cashapp'
      ? 'Payment method: Cash App  ' + catalog.cashAppHandle
      : 'Payment method: Venmo  ' + catalog.venmoHandle;
    const bits = [];
    if (users.snap) bits.push('Snapchat: ' + users.snap);
    if (users.telegram) bits.push('Telegram: ' + users.telegram);
    if (users.x) bits.push('X: ' + users.x);
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
    badge.classList.toggle('is-warn', !saved);
    badge.textContent = saved ? 'Saved for Evie' : 'Not saved';
    $('confirmHeading').textContent = saved ? 'Order summary' : 'Not sent';
    $('confirmLead').textContent = detail;
    $('checkoutForm').hidden = true;
    $('returnChat').hidden = true;
    $('confirmCard').hidden = false;
    $('confirmCard').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
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
    const entered = [users.snap, users.telegram, users.x].filter(Boolean);
    if (!entered.length) {
      showError('Enter at least one username so I can keep track of who’s paid.');
      return;
    }
    if (entered.some((value) => !HANDLE_RE.test(value))) {
      showError('Usernames can use letters, numbers, @, periods, underscores, and hyphens.');
      return;
    }
    if (!$('checkoutAdult').checked) {
      showError('Confirm you are 18 or older and agree to the Fulfillment Agreement.');
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
      payment_method: state.method === 'cashapp' ? 'cash_app' : 'venmo',
      snapchat_handle: users.snap,
      telegram_handle: users.telegram,
      x_handle: users.x,
      notes: note,
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
      if (!response.ok || !data || data.ok !== true || !data.order_id) {
        const reason = data && data.error ? data.error : (response.status === 404
          ? 'The payment server isn’t deployed yet.'
          : 'The payment server did not accept this order.');
        showError(reason + ' This order was not saved. Nothing was marked as paid.');
        return;
      }
      state.submitted = true;
      try { sessionStorage.setItem(TERMS_KEY, 'yes'); } catch (err) { /* private mode */ }
      showConfirm(true, 'Reference: ' + data.order_id + '. Evie still confirms payment from your screenshot. This page cannot see whether Venmo or Cash App received the money.');
    } catch (err) {
      showError('The payment server didn’t respond, so this order was not saved. Nothing was marked as paid. Copy the summary and message Evie if you already sent the money.');
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = 'Submit';
    }
  }

  $('itemList').addEventListener('click', (event) => {
    const inc = event.target.closest('[data-inc]');
    const dec = event.target.closest('[data-dec]');
    const incExtra = event.target.closest('[data-inc-extra]');
    const decExtra = event.target.closest('[data-dec-extra]');
    if (inc) addItem(inc.getAttribute('data-inc'));
    if (dec) setQty(dec.getAttribute('data-dec'), state.qty[dec.getAttribute('data-dec')] - 1);
    if (incExtra) setExtra(Number(incExtra.getAttribute('data-inc-extra')), state.extras[Number(incExtra.getAttribute('data-inc-extra'))].qty + 1);
    if (decExtra) setExtra(Number(decExtra.getAttribute('data-dec-extra')), state.extras[Number(decExtra.getAttribute('data-dec-extra'))].qty - 1);
  });
  $('tipInput').addEventListener('input', (event) => {
    const raw = event.target.value;
    state.tip = raw === '' ? 0 : Math.max(0, Number(raw) || 0);
    persistTip();
    renderAmount();
  });
  ['snapUser', 'tgUser', 'xUser'].forEach((id) => {
    $(id).addEventListener('change', () => {
      try { sessionStorage.setItem(HANDLES_KEY, JSON.stringify(handles())); } catch (err) { /* private mode */ }
    });
  });
  document.querySelectorAll('[data-select]').forEach((btn) => {
    btn.addEventListener('click', () => selectMethod(btn.getAttribute('data-select')));
  });
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.getAttribute('data-copy')));
  });
  document.querySelectorAll('[data-copy-memo]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(catalog.memo));
  });
  $('openVenmo').addEventListener('click', () => {
    const urls = venmoUrls();
    openApp(urls.app, urls.web);
  });
  $('openCash').addEventListener('click', () => {
    const urls = cashUrls();
    openApp(urls.app, urls.web);
  });
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
  $('applyPromo').addEventListener('click', () => applyPromo($('promoCode').value));
  $('promoCode').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyPromo($('promoCode').value);
  });
  $('proofInput').addEventListener('change', async (event) => {
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
  $('editOrder').addEventListener('click', () => {
    if (state.submitted) rotateRequest();
    $('confirmCard').hidden = true;
    $('checkoutForm').hidden = false;
    $('returnChat').hidden = false;
    window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });

  hydrate();
  persistBag();
  const savedHandles = readJson(HANDLES_KEY, null);
  if (savedHandles && typeof savedHandles === 'object') {
    if (savedHandles.snap) $('snapUser').value = String(savedHandles.snap);
    if (savedHandles.telegram) $('tgUser').value = String(savedHandles.telegram);
    if (savedHandles.x) $('xUser').value = String(savedHandles.x);
  }
  try {
    const savedNotes = sessionStorage.getItem(NOTES_KEY);
    if (savedNotes) $('orderNotes').value = String(savedNotes).slice(0, 500);
  } catch (err) { /* private mode */ }
  renderNotesCount();
  showPromoStatus();
  try {
    if (sessionStorage.getItem(TERMS_KEY) === 'yes') $('checkoutAdult').checked = true;
  } catch (err) { /* private mode */ }
  if (state.tip) $('tipInput').value = String(state.tip);
  selectMethod(state.method);
  render();

  window.EvieCheckout = {
    total: total,
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
      extras: state.extras.map((extra) => Object.assign({}, extra))
    })
  };
})();
