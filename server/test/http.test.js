import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { createApp } from '../app.js';
import { API_VERSION } from '../lib/checkout.js';

const WEBHOOK_SECRET = 'whsec_test_secret_for_local_tests';

function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  return new Promise((resolve, reject) => {
    server.once('listening', () => {
      const { port } = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
      });
    });
    server.once('error', reject);
  });
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function mockStripe() {
  const calls = [];
  return {
    calls,
    checkout: {
      sessions: {
        async create(params, options) {
          calls.push({ params, options });
          return { id: 'cs_test_created1', url: 'https://checkout.stripe.com/c/pay/cs_test_created1' };
        },
        async retrieve(id) {
          return {
            id,
            object: 'checkout.session',
            status: 'complete',
            payment_status: 'paid',
            amount_total: 2500,
            currency: 'usd',
            metadata: { purpose: 'priority' },
            customer_email: 'hidden@example.com',
            client_secret: 'cs_secret_value',
          };
        },
      },
    },
    webhooks: Stripe.webhooks,
  };
}

test('create checkout session posts integer cents and ignores caller redirect URLs', async () => {
  const stripe = mockStripe();
  const app = createApp({
    stripe,
    env: {
      PUBLIC_BASE_URL: 'http://127.0.0.1:3000/',
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    },
  });
  const { server, base } = await listen(app);
  try {
    const response = await fetch(`${base}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
        'idempotency-key': 'idem_key_123',
      },
      body: JSON.stringify({
        amount: '25.50',
        purpose: 'tip',
        note: 'hello\u0000there',
        handle: '@kissed',
        success_url: 'https://evil.example/steal',
        cancel_url: 'https://evil.example/cancel',
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.url, 'https://checkout.stripe.com/c/pay/cs_test_created1');
    const params = stripe.calls[0].params;
    assert.equal(params.line_items[0].price_data.unit_amount, 2550);
    assert.equal(Number.isInteger(params.line_items[0].price_data.unit_amount), true);
    assert.equal(Object.hasOwn(params, 'payment_method_types'), false);
    assert.equal(params.success_url.startsWith('http://127.0.0.1:3000/pay.html?status=success'), true);
    assert.equal(params.success_url.includes('evil.example'), false);
    assert.equal(params.cancel_url, 'http://127.0.0.1:3000/pay.html?status=cancel');
    assert.equal(params.metadata.note, 'hello there');
    assert.equal(stripe.calls[0].options.idempotencyKey, 'idem_key_123');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  } finally {
    await close(server);
  }
});

test('amount validation and safe session lookup', async () => {
  const stripe = mockStripe();
  const app = createApp({
    stripe,
    env: { PUBLIC_BASE_URL: 'https://kissedbyevie-menu.onrender.com' },
  });
  const { server, base } = await listen(app);
  try {
    const tooSmall = await fetch(`${base}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 4.99 }),
    });
    assert.equal(tooSmall.status, 400);
    assert.equal((await tooSmall.json()).error, 'Minimum is $5.00.');

    const numberAmount = await fetch(`${base}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 19.99 }),
    });
    assert.equal(numberAmount.status, 200);
    assert.equal(stripe.calls.at(-1).params.line_items[0].price_data.unit_amount, 1999);

    const lookup = await fetch(`${base}/api/checkout-session/cs_test_abc12345`);
    const view = await lookup.json();
    assert.equal(lookup.status, 200);
    assert.deepEqual(Object.keys(view).sort(), ['amount_total', 'currency', 'payment_status', 'purpose', 'status']);
    assert.equal(view.purpose, 'Priority / Spoil');
    assert.equal(JSON.stringify(view).includes('hidden@example.com'), false);

    const badId = await fetch(`${base}/api/checkout-session/pi_12345678`);
    assert.equal(badId.status, 400);
  } finally {
    await close(server);
  }
});

test('webhook signature verification and payment status recording', async () => {
  const stripe = new Stripe('dummy', { apiVersion: API_VERSION });
  const ledger = [];
  const app = createApp({
    stripe,
    ledger,
    env: {
      PUBLIC_BASE_URL: 'http://localhost:3000',
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    },
  });
  const { server, base } = await listen(app);
  try {
    async function postEvent(event, { signature } = {}) {
      const payload = JSON.stringify(event);
      const header = signature === undefined
        ? Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })
        : signature;
      const headers = { 'content-type': 'application/json' };
      if (header !== null) headers['stripe-signature'] = header;
      const response = await fetch(`${base}/api/webhook`, { method: 'POST', headers, body: payload });
      return response;
    }

    const session = (paymentStatus) => ({
      id: 'cs_test_webhook1',
      object: 'checkout.session',
      payment_status: paymentStatus,
      amount_total: 10000,
      currency: 'usd',
      metadata: { purpose: 'tip' },
    });

    const unpaid = await postEvent({
      id: 'evt_unpaid',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session('unpaid') },
    });
    assert.equal(unpaid.status, 200);
    assert.equal(ledger.at(-1).action, 'defer');

    const paid = await postEvent({
      id: 'evt_paid',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session('paid') },
    });
    assert.equal(paid.status, 200);
    assert.equal(ledger.at(-1).action, 'fulfill');

    const asyncPaid = await postEvent({
      id: 'evt_async',
      object: 'event',
      type: 'checkout.session.async_payment_succeeded',
      data: { object: session('paid') },
    });
    assert.equal(asyncPaid.status, 200);
    assert.equal(ledger.at(-1).action, 'fulfill');

    const asyncFailed = await postEvent({
      id: 'evt_failed',
      object: 'event',
      type: 'checkout.session.async_payment_failed',
      data: { object: session('unpaid') },
    });
    assert.equal(asyncFailed.status, 200);
    assert.equal(ledger.at(-1).action, 'fail');

    const forged = await postEvent({
      id: 'evt_forged',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session('paid') },
    }, { signature: 't=1,v1=deadbeef' });
    assert.equal(forged.status, 400);
    assert.equal(ledger.length, 4);

    const missing = await postEvent({
      id: 'evt_missing',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session('paid') },
    }, { signature: null });
    assert.equal(missing.status, 400);
    assert.equal(ledger.filter((entry) => entry.action === 'fulfill').length, 2);
  } finally {
    await close(server);
  }
});

test('unconfigured server and preview mode', async () => {
  const unconfigured = createApp({
    env: { PUBLIC_BASE_URL: 'http://localhost:3000' },
    siteRoot: null,
  });
  const { server, base } = await listen(unconfigured);
  try {
    const response = await fetch(`${base}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'Card payments are not configured yet.');
  } finally {
    await close(server);
  }

  assert.throws(
    () => createApp({ env: { STRIPE_MOCK: '1', NODE_ENV: 'production' } }),
    /STRIPE_MOCK/,
  );

  const preview = createApp({
    env: {
      STRIPE_MOCK: '1',
      NODE_ENV: 'test',
      PUBLIC_BASE_URL: 'http://127.0.0.1:4179',
    },
    siteRoot: null,
  });
  const started = await listen(preview);
  try {
    const created = await fetch(`${started.base}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: '50' }),
    });
    const body = await created.json();
    assert.equal(created.status, 200);
    assert.equal(body.url.includes('{CHECKOUT_SESSION_ID}'), false);
    assert.match(body.url, /^http:\/\/127\.0\.0\.1:4179\/pay\.html\?status=success&session_id=cs_test_mock/);
    const params = preview.locals.stripe.calls[0];
    assert.equal(params.line_items[0].price_data.unit_amount, 5000);
    assert.equal(Object.hasOwn(params, 'payment_method_types'), false);
    const confirmed = await fetch(`${started.base}/api/checkout-session/cs_test_previewok`);
    const view = await confirmed.json();
    assert.equal(view.amount_total, 5000);
    assert.equal(view.purpose, 'Tip / Tribute');
    assert.equal(JSON.stringify(view).includes('should-not-leak'), false);
  } finally {
    await close(started.server);
  }
});
