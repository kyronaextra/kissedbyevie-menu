import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { parseUsdToCents } from './lib/money.js';
import { normalizePublicBaseUrl } from './lib/public-url.js';
import {
  API_VERSION,
  SESSION_ID_PATTERN,
  buildCheckoutSessionParams,
  interpretCheckoutEvent,
  publicSessionView,
  sanitizeHandle,
  sanitizeNote,
  sanitizePurpose,
} from './lib/checkout.js';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSiteRoot = path.resolve(serverDir, '..');

const KEY_PATTERN = /^(sk|rk)_(test|live)_/;

function createPreviewStripe() {
  const sessions = new Map();
  const calls = [];
  return {
    calls,
    checkout: {
      sessions: {
        async create(params) {
          calls.push(params);
          const id = `cs_test_mock${calls.length}preview`;
          const amount = params.line_items[0].price_data.unit_amount;
          const session = {
            id,
            object: 'checkout.session',
            status: 'complete',
            payment_status: 'paid',
            amount_total: amount,
            currency: 'usd',
            metadata: { ...(params.metadata || {}) },
          };
          sessions.set(id, session);
          const url = String(params.success_url).replace('{CHECKOUT_SESSION_ID}', id);
          return { id, url };
        },
        async retrieve(id) {
          if (sessions.has(id)) return sessions.get(id);
          if (id === 'cs_test_previewok') {
            return {
              id,
              object: 'checkout.session',
              status: 'complete',
              payment_status: 'paid',
              amount_total: 5000,
              currency: 'usd',
              metadata: { purpose: 'tip' },
              customer_email: 'should-not-leak@example.com',
              client_secret: 'cs_test_secret_should_not_leak',
            };
          }
          const error = new Error('No such checkout.session');
          error.statusCode = 404;
          throw error;
        },
      },
    },
    webhooks: {
      constructEvent() {
        const error = new Error('Preview mode does not verify live webhooks.');
        error.code = 'preview_webhook';
        throw error;
      },
    },
  };
}

function resolveStripe(env, injected) {
  if (injected) return { stripe: injected, mode: 'injected' };
  if (env.STRIPE_MOCK === '1') {
    if (env.NODE_ENV === 'production') {
      throw new Error('STRIPE_MOCK cannot be used when NODE_ENV is production.');
    }
    return { stripe: createPreviewStripe(), mode: 'mock' };
  }
  const key = typeof env.STRIPE_SECRET_KEY === 'string' ? env.STRIPE_SECRET_KEY.trim() : '';
  if (!key) return { stripe: null, mode: 'unconfigured' };
  if (!KEY_PATTERN.test(key)) {
    console.error(JSON.stringify({ msg: 'stripe_key_rejected', reason: 'unrecognized_prefix' }));
    return { stripe: null, mode: 'unconfigured' };
  }
  return {
    stripe: new Stripe(key, { apiVersion: API_VERSION }),
    mode: 'live',
  };
}

function allowedOrigins(env) {
  const origins = new Set();
  const extras = typeof env.EXTRA_CORS_ORIGINS === 'string' ? env.EXTRA_CORS_ORIGINS.split(',') : [];
  for (const candidate of [env.PUBLIC_BASE_URL, ...extras]) {
    if (!candidate || !String(candidate).trim()) continue;
    try {
      origins.add(normalizePublicBaseUrl(String(candidate)));
    } catch {
      console.error(JSON.stringify({ msg: 'cors_origin_ignored' }));
    }
  }
  for (const port of [3000, 4173, 8080, 10000]) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }
  return origins;
}

function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return function limit(req, res, next) {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const recent = (hits.get(key) || []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= max) {
      res.status(429).json({ error: 'Too many payment attempts. Wait a minute and try again.' });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [bucketKey, stamps] of hits) {
        if (stamps.every((stamp) => now - stamp >= windowMs)) hits.delete(bucketKey);
      }
    }
    next();
  };
}

function securityHeaders(env) {
  let httpsPublic = false;
  try {
    httpsPublic = new URL(env.PUBLIC_BASE_URL || '').protocol === 'https:';
  } catch {
    httpsPublic = false;
  }
  return function headers(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (httpsPublic) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    const secure = req.secure || httpsPublic;
    if (!req.path.startsWith('/api')) {
      const upgrade = secure ? ' upgrade-insecure-requests;' : '';
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self'",
        "style-src 'self' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-src 'none'",
      ].join('; ') + ';' + upgrade);
    }
    next();
  };
}

function isBlockedPath(urlPath) {
  let decoded = urlPath;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return true;
  }
  const lower = decoded.toLowerCase();
  if (lower.includes('\0')) return true;
  if (lower === '/server' || lower.startsWith('/server/')) return true;
  if (lower.includes('/.') || lower.startsWith('/.')) return true;
  if (lower.includes('.env')) return true;
  return false;
}

function ledgerEntry(action, eventType, session) {
  return {
    action,
    eventType,
    sessionId: typeof session.id === 'string' ? session.id : '',
    paymentStatus: typeof session.payment_status === 'string' ? session.payment_status : '',
    amountTotal: Number.isInteger(session.amount_total) ? session.amount_total : null,
    currency: typeof session.currency === 'string' ? session.currency : '',
    purpose: session.metadata && typeof session.metadata.purpose === 'string' ? session.metadata.purpose : '',
  };
}

export function createApp(options = {}) {
  const env = options.env || process.env;
  const { stripe, mode } = resolveStripe(env, options.stripe);
  const ledger = options.ledger || [];
  const siteRoot = options.siteRoot === undefined ? defaultSiteRoot : options.siteRoot;
  const origins = allowedOrigins(env);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.locals.paymentsMode = mode;
  app.locals.stripe = stripe;
  app.locals.ledger = ledger;

  app.use(securityHeaders(env));
  app.use((req, res, next) => {
    if (isBlockedPath(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const secret = typeof env.STRIPE_WEBHOOK_SECRET === 'string' ? env.STRIPE_WEBHOOK_SECRET.trim() : '';
    if (!secret || !stripe || mode === 'mock') {
      res.status(503).json({ error: 'Webhooks are not configured.' });
      return;
    }
    const signature = req.get('stripe-signature');
    if (!signature || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'Missing Stripe signature.' });
      return;
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch {
      res.status(400).json({ error: 'Invalid Stripe signature.' });
      return;
    }
    const decision = interpretCheckoutEvent(event);
    if (decision.action === 'fulfill' || decision.action === 'fail' || decision.action === 'defer') {
      const entry = ledgerEntry(decision.action, event.type, decision.session);
      ledger.push(entry);
      console.log(JSON.stringify({ msg: 'checkout_event', ...entry }));
    } else {
      console.log(JSON.stringify({ msg: 'checkout_event_ignored', type: event.type || '' }));
    }
    res.json({ received: true });
  });

  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      service: 'kissedbyevie-pay',
      payments: mode === 'live' || mode === 'injected' || mode === 'mock',
      webhooks: Boolean(env.STRIPE_WEBHOOK_SECRET) && mode !== 'mock' && mode !== 'unconfigured',
    });
  });

  app.post('/api/create-checkout-session', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
    if (!stripe) {
      res.status(503).json({ error: 'Card payments are not configured yet.' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const parsed = parseUsdToCents(body.amount);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const purpose = sanitizePurpose(body.purpose);
    if (!purpose.ok) {
      res.status(400).json({ error: purpose.error });
      return;
    }
    const note = sanitizeNote(body.note);
    if (!note.ok) {
      res.status(400).json({ error: note.error });
      return;
    }
    const handle = sanitizeHandle(body.handle);
    if (!handle.ok) {
      res.status(400).json({ error: handle.error });
      return;
    }
    let params;
    try {
      params = buildCheckoutSessionParams({
        amountCents: parsed.cents,
        purpose: purpose.value,
        note: note.value,
        handle: handle.value,
        publicBaseUrl: env.PUBLIC_BASE_URL,
      });
    } catch (error) {
      const message = error.code === 'public_base_url'
        ? 'Payments are not configured yet.'
        : 'Payment could not be started.';
      res.status(503).json({ error: message });
      return;
    }
    const idempotencyKey = req.get('idempotency-key');
    const requestOptions = {};
    if (typeof idempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(idempotencyKey)) {
      requestOptions.idempotencyKey = idempotencyKey;
    }
    try {
      const session = await stripe.checkout.sessions.create(params, requestOptions);
      if (!session || typeof session.url !== 'string' || typeof session.id !== 'string') {
        res.status(502).json({ error: 'Stripe did not return a checkout link.' });
        return;
      }
      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error(JSON.stringify({
        msg: 'checkout_session_create_failed',
        type: error && error.type ? error.type : 'error',
        code: error && error.code ? error.code : '',
      }));
      res.status(502).json({ error: 'Stripe could not start checkout. Try again in a moment.' });
    }
  });

  app.get('/api/checkout-session/:id', async (req, res) => {
    if (!SESSION_ID_PATTERN.test(req.params.id)) {
      res.status(400).json({ error: 'That payment reference is not valid.' });
      return;
    }
    if (!stripe) {
      res.status(503).json({ error: 'Card payments are not configured yet.' });
      return;
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(req.params.id);
      res.json(publicSessionView(session));
    } catch (error) {
      if (error && error.statusCode === 404) {
        res.status(404).json({ error: 'Payment not found.' });
        return;
      }
      console.error(JSON.stringify({
        msg: 'checkout_session_retrieve_failed',
        type: error && error.type ? error.type : 'error',
        code: error && error.code ? error.code : '',
      }));
      res.status(502).json({ error: 'Could not verify that payment.' });
    }
  });

  app.get(/^\/pay\/?$/, (req, res) => {
    if (!siteRoot) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(siteRoot, 'pay.html'));
  });

  if (siteRoot) {
    app.use(express.static(siteRoot, {
      dotfiles: 'deny',
      index: ['index.html'],
      redirect: false,
    }));
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error && (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')) {
      res.status(400).json({ error: 'Request body must be JSON.' });
      return;
    }
    console.error(JSON.stringify({ msg: 'request_error', type: error && error.type ? error.type : 'error' }));
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
