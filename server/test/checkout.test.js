import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INTEGRATION_IDENTIFIER,
  buildCheckoutSessionParams,
  interpretCheckoutEvent,
  publicSessionView,
} from '../lib/checkout.js';
import { normalizePublicBaseUrl } from '../lib/public-url.js';

test('checkout payload uses integer price_data and omits payment_method_types', () => {
  const params = buildCheckoutSessionParams({
    amountCents: 5000,
    purpose: 'tip',
    note: 'for the set',
    handle: '@glossy',
    publicBaseUrl: 'http://localhost:3000',
  });
  assert.equal(params.mode, 'payment');
  assert.equal(params.line_items.length, 1);
  assert.equal(params.line_items[0].quantity, 1);
  assert.equal(params.line_items[0].price_data.currency, 'usd');
  assert.equal(params.line_items[0].price_data.unit_amount, 5000);
  assert.equal(Number.isInteger(params.line_items[0].price_data.unit_amount), true);
  assert.equal(params.line_items[0].price_data.product_data.name.includes('Tip / Tribute'), true);
  assert.equal(Object.hasOwn(params, 'payment_method_types'), false);
  assert.equal(JSON.stringify(params).includes('payment_method_types'), false);
  assert.equal(params.integration_identifier, INTEGRATION_IDENTIFIER);
  assert.match(params.integration_identifier, /^kbe_custom_pay_[a-z]{8}$/);
  assert.equal(params.success_url, 'http://localhost:3000/pay.html?status=success&session_id={CHECKOUT_SESSION_ID}');
  assert.equal(params.cancel_url, 'http://localhost:3000/pay.html?status=cancel');
  assert.equal(params.metadata.purpose, 'tip');
  assert.equal(params.client_reference_id, '@glossy');
});

test('public base URL rejects paths, credentials, and non-local http', () => {
  assert.equal(normalizePublicBaseUrl('https://kissedbyevie-menu.onrender.com/'), 'https://kissedbyevie-menu.onrender.com');
  assert.throws(() => normalizePublicBaseUrl('https://evil.example/phish'), /no path/);
  assert.throws(() => normalizePublicBaseUrl('http://kissedbyevie-menu.onrender.com'), /https/);
  assert.throws(() => normalizePublicBaseUrl('javascript:alert(1)'), /http or https/);
  assert.throws(() => normalizePublicBaseUrl('https://user:pass@example.com'), /credentials/);
});

test('confirmation view keeps only safe fields', () => {
  const view = publicSessionView({
    status: 'complete',
    payment_status: 'paid',
    amount_total: 2500,
    currency: 'usd',
    metadata: { purpose: 'custom' },
    customer_email: 'payer@example.com',
    client_secret: 'secret',
    payment_intent: 'pi_secret',
  });
  assert.deepEqual(view, {
    status: 'complete',
    payment_status: 'paid',
    amount_total: 2500,
    currency: 'usd',
    purpose: 'Custom Content',
  });
  assert.equal(JSON.stringify(view).includes('payer@example.com'), false);
  assert.equal(JSON.stringify(view).includes('secret'), false);
});

test('webhook status handling defers unpaid completions and fulfills settled ones', () => {
  const session = (paymentStatus) => ({
    id: 'cs_test_abc12345',
    object: 'checkout.session',
    payment_status: paymentStatus,
    amount_total: 5000,
    currency: 'usd',
    metadata: { purpose: 'rate' },
  });
  assert.equal(interpretCheckoutEvent({
    type: 'checkout.session.completed',
    data: { object: session('unpaid') },
  }).action, 'defer');
  assert.equal(interpretCheckoutEvent({
    type: 'checkout.session.completed',
    data: { object: session('paid') },
  }).action, 'fulfill');
  assert.equal(interpretCheckoutEvent({
    type: 'checkout.session.async_payment_succeeded',
    data: { object: session('paid') },
  }).action, 'fulfill');
  assert.equal(interpretCheckoutEvent({
    type: 'checkout.session.async_payment_succeeded',
    data: { object: session('unpaid') },
  }).action, 'defer');
  assert.equal(interpretCheckoutEvent({
    type: 'checkout.session.async_payment_failed',
    data: { object: session('unpaid') },
  }).action, 'fail');
  assert.equal(interpretCheckoutEvent({
    type: 'payment_intent.succeeded',
    data: { object: { object: 'payment_intent' } },
  }).action, 'ignore');
});
