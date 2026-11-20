(function () {
  'use strict';

  var DRAFT_KEY = 'kbe-custom-pay-draft';
  var MIN_CENTS = 500;
  var MAX_CENTS = 500000;
  var form = document.getElementById('payForm');
  var amountInput = document.getElementById('amountInput');
  var purpose = document.getElementById('purpose');
  var note = document.getElementById('note');
  var handle = document.getElementById('handle');
  var payButton = document.getElementById('payButton');
  var formError = document.getElementById('formError');
  var cancelBanner = document.getElementById('cancelBanner');
  var successView = document.getElementById('successView');
  var presets = document.querySelector('.presets');
  if (!form || !amountInput || !payButton) return;

  var busy = false;
  var touched = false;

  function apiBase() {
    var configured = window.EVIE_PAY_API_BASE;
    if (typeof configured === 'string' && configured.trim()) {
      return configured.trim().replace(/\/$/, '');
    }
    return '';
  }

  function parseAmount(value) {
    var raw = String(value == null ? '' : value).trim().replace(/[$,\s]/g, '');
    if (!raw) return { ok: false, error: 'Enter a dollar amount.', code: 'invalid' };
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      return { ok: false, error: 'Use up to 2 decimal places, like 25 or 25.50.', code: 'decimals' };
    }
    var parts = raw.split('.');
    var cents = Number(parts[0]) * 100 + Number(((parts[1] || '') + '00').slice(0, 2));
    if (!Number.isSafeInteger(cents)) return { ok: false, error: 'Enter a dollar amount.', code: 'invalid' };
    if (cents < MIN_CENTS) return { ok: false, error: 'Minimum is $5.00.', code: 'min' };
    if (cents > MAX_CENTS) return { ok: false, error: 'Maximum is $5,000.00.', code: 'max' };
    return { ok: true, cents: cents };
  }

  function formatUsd(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }

  function showError(message) {
    formError.hidden = !message;
    formError.textContent = message || '';
    amountInput.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function readDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        amount: amountInput.value,
        purpose: purpose.value,
        note: note.value,
        handle: handle.value
      }));
    } catch (err) { /* private mode */ }
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (err) { /* private mode */ }
  }

  function syncPresets(cents) {
    presets.querySelectorAll('.preset').forEach(function (button) {
      var parsed = parseAmount(button.getAttribute('data-amount'));
      var on = parsed.ok && parsed.cents === cents;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncButton() {
    var parsed = parseAmount(amountInput.value);
    if (parsed.ok) {
      payButton.disabled = busy;
      payButton.textContent = busy ? 'Opening Stripe…' : ('Pay ' + formatUsd(parsed.cents) + ' with Stripe');
      syncPresets(parsed.cents);
      if (touched) showError('');
      return parsed;
    }
    payButton.disabled = true;
    payButton.textContent = busy ? 'Opening Stripe…' : 'Pay with Stripe';
    syncPresets(null);
    if (touched && amountInput.value.trim()) showError(parsed.error);
    else if (!amountInput.value.trim()) showError('');
    return parsed;
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== 'object') return;
    if (typeof draft.amount === 'string') amountInput.value = draft.amount.slice(0, 12);
    if (typeof draft.purpose === 'string' && purpose.querySelector('option[value="' + CSS.escape(draft.purpose) + '"]')) {
      purpose.value = draft.purpose;
    }
    if (typeof draft.note === 'string') note.value = draft.note.slice(0, 200);
    if (typeof draft.handle === 'string') handle.value = draft.handle.slice(0, 40);
    syncButton();
  }

  presets.addEventListener('click', function (event) {
    var button = event.target.closest('.preset');
    if (!button) return;
    amountInput.value = button.getAttribute('data-amount');
    touched = true;
    syncButton();
    showError('');
    saveDraft();
  });

  presets.addEventListener('keydown', function (event) {
    var buttons = Array.prototype.slice.call(presets.querySelectorAll('.preset'));
    var index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    var next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next].focus();
  });

  amountInput.addEventListener('input', function () {
    syncButton();
    saveDraft();
  });
  amountInput.addEventListener('blur', function () {
    touched = true;
    var parsed = syncButton();
    if (parsed.ok) amountInput.value = (parsed.cents / 100).toFixed(2);
    saveDraft();
  });
  [purpose, note, handle].forEach(function (field) {
    field.addEventListener('input', saveDraft);
    field.addEventListener('change', saveDraft);
  });

  function safeCheckoutUrl(url) {
    try {
      var parsed = new URL(url, window.location.href);
      if (parsed.origin === 'https://checkout.stripe.com') return parsed.href;
      if (parsed.origin === window.location.origin && parsed.pathname === '/pay.html') return parsed.href;
    } catch (err) { /* reject */ }
    return '';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    touched = true;
    var parsed = syncButton();
    if (!parsed.ok) {
      showError(parsed.error);
      amountInput.focus();
      return;
    }
    if (busy) return;
    busy = true;
    syncButton();
    showError('');
    saveDraft();
    var idempotency = 'kbe' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    fetch(apiBase() + '/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotency
      },
      body: JSON.stringify({
        amount: amountInput.value.trim(),
        purpose: purpose.value,
        note: note.value,
        handle: handle.value
      })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { ok: response.ok, data: data };
      });
    }).then(function (result) {
      var url = safeCheckoutUrl(result.data && result.data.url);
      if (!result.ok || !url) {
        busy = false;
        syncButton();
        showError((result.data && result.data.error) || 'Payment could not be started.');
        return;
      }
      window.location.assign(url);
    }).catch(function () {
      busy = false;
      syncButton();
      showError('Couldn’t reach the payment server. If this site is static, the payment API address in order-config.js may still need to be set.');
    });
  });

  function showSuccess(sessionId) {
    document.body.dataset.payState = 'success';
    form.hidden = true;
    successView.hidden = false;
    clearDraft();
    var title = document.getElementById('successTitle');
    var lead = document.getElementById('successLead');
    var receipt = document.getElementById('receipt');
    if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]{8,}$/.test(sessionId)) {
      title.textContent = 'Payment reference missing';
      lead.textContent = 'Stripe sent you back without a payment reference. If you were charged, message me on Telegram and I will look it up.';
      return;
    }
    title.textContent = 'Checking your payment…';
    lead.textContent = 'Confirming the amount with Stripe.';
    fetch(apiBase() + '/api/checkout-session/' + encodeURIComponent(sessionId))
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          title.textContent = 'I couldn’t verify it yet';
          lead.textContent = (result.data && result.data.error) || 'If you were charged, message me on Telegram and I will match the payment.';
          return;
        }
        var data = result.data || {};
        var paid = data.payment_status === 'paid' || data.payment_status === 'no_payment_required';
        title.textContent = paid ? 'Payment received.' : 'Payment is still processing.';
        lead.textContent = paid
          ? 'Thank you. I can see this payment. If it was for a custom, message me on Telegram so I can match it to you.'
          : 'Stripe has the checkout, and the money is not marked paid yet. Bank payments can take a little while. I fulfill from the paid webhook, not this page.';
        var amount = Number.isInteger(data.amount_total)
          ? formatUsd(data.amount_total)
          : 'Unavailable';
        document.getElementById('successAmount').textContent = amount;
        var statusLabel = {
          paid: 'Paid',
          unpaid: 'Unpaid',
          no_payment_required: 'No payment required'
        };
        document.getElementById('successStatus').textContent = statusLabel[data.payment_status] || (data.payment_status || 'Unknown');
        var purposeRow = document.getElementById('purposeRow');
        if (data.purpose) {
          document.getElementById('successPurpose').textContent = data.purpose;
          purposeRow.hidden = false;
        } else {
          purposeRow.hidden = true;
        }
        receipt.hidden = false;
        document.body.dataset.payVerified = paid ? 'paid' : 'processing';
      })
      .catch(function () {
        title.textContent = 'I couldn’t reach the payment check';
        lead.textContent = 'The confirmation page is open, but the payment server did not answer. Message me on Telegram if you finished checkout.';
      });
  }

  function showCancel(draft) {
    document.body.dataset.payState = 'cancel';
    var amount = draft && typeof draft.amount === 'string' ? draft.amount : '';
    var parsed = parseAmount(amount);
    cancelBanner.hidden = false;
    cancelBanner.textContent = parsed.ok
      ? ('Checkout canceled. Nothing was charged. Your ' + formatUsd(parsed.cents) + ' is still here if you want to adjust it or try again.')
      : 'Checkout canceled. Nothing was charged. You can choose an amount and try again.';
  }

  var params = new URLSearchParams(window.location.search);
  var status = params.get('status');
  if (status === 'success') {
    showSuccess(params.get('session_id'));
    return;
  }
  applyDraft(readDraft());
  if (status === 'cancel') showCancel(readDraft());
  else document.body.dataset.payState = 'form';
  syncButton();
})();
