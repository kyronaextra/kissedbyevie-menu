import { normalizePublicBaseUrl } from './public-url.js';

/** Stable Dashboard label. The 8-letter suffix is part of the integration id. */
export const INTEGRATION_IDENTIFIER = 'kbe_custom_pay_qmnxwkrp';

export const API_VERSION = '2026-11-18.endive';

export const PURPOSES = Object.freeze({
  tip: 'Tip / Tribute',
  custom: 'Custom Content',
  priority: 'Priority / Spoil',
  rate: 'Agreed Rate',
});

export const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{8,}$/;

function fail(error) {
  return { ok: false, error };
}

export function sanitizePurpose(value) {
  if (value == null || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(PURPOSES, value)) {
    return fail('Choose a listed purpose or leave it blank.');
  }
  return { ok: true, value };
}

export function sanitizeNote(value) {
  if (value == null || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string') return fail('Note must be text.');
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length > 200) return fail('Note must be 200 characters or less.');
  return { ok: true, value: cleaned };
}

export function sanitizeHandle(value) {
  if (value == null || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string') return fail('Handle must be text.');
  const cleaned = value.replace(/[^A-Za-z0-9@_. \-]/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length > 40) return fail('Handle must be 40 characters or less.');
  return { ok: true, value: cleaned };
}

export function buildCheckoutSessionParams({ amountCents, purpose, note, handle, publicBaseUrl }) {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error('amountCents must be an integer.');
  }
  const origin = normalizePublicBaseUrl(publicBaseUrl);
  const label = purpose ? PURPOSES[purpose] : 'Custom payment';
  const description = purpose
    ? `${PURPOSES[purpose]} for @kissedbyevie. Confirmed separately on Telegram.`
    : 'Custom tip, tribute, or agreed rate for @kissedbyevie. Confirmed separately on Telegram.';
  const metadata = {
    source: 'kbe_custom_pay',
    purpose: purpose || '',
    note: note || '',
    handle: handle || '',
  };
  const params = {
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Kissed by Evie — ${label}`.slice(0, 250),
            description: description.slice(0, 500),
          },
        },
      },
    ],
    success_url: `${origin}/pay.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay.html?status=cancel`,
    metadata,
    payment_intent_data: {
      description: description.slice(0, 1000),
      metadata,
    },
    custom_text: {
      submit: {
        message: 'This pays @kissedbyevie. Custom requests are confirmed separately on Telegram.',
      },
    },
    integration_identifier: INTEGRATION_IDENTIFIER,
  };
  if (handle && /^[\x20-\x7E]{1,200}$/.test(handle)) {
    params.client_reference_id = handle;
  }
  return params;
}

export function publicSessionView(session) {
  const purposeKey = session && session.metadata ? session.metadata.purpose : '';
  return {
    status: session && typeof session.status === 'string' ? session.status : null,
    payment_status: session && typeof session.payment_status === 'string' ? session.payment_status : null,
    amount_total: session && Number.isInteger(session.amount_total) ? session.amount_total : null,
    currency: session && typeof session.currency === 'string' ? session.currency : null,
    purpose: Object.prototype.hasOwnProperty.call(PURPOSES, purposeKey) ? PURPOSES[purposeKey] : null,
  };
}

/**
 * Fulfill only when money is no longer unpaid.
 * checkout.session.completed can arrive early for bank-debit methods.
 */
export function interpretCheckoutEvent(event) {
  const type = event && event.type;
  const session = event && event.data && event.data.object;
  if (!session || session.object !== 'checkout.session') {
    return { action: 'ignore', reason: 'not_checkout_session' };
  }
  if (type === 'checkout.session.async_payment_failed') {
    return { action: 'fail', session };
  }
  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status === 'unpaid') {
      return { action: 'defer', session, reason: 'unpaid' };
    }
    return { action: 'fulfill', session };
  }
  return { action: 'ignore', reason: 'unhandled_type' };
}
