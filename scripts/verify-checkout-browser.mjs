import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = '/opt/cursor/artifacts';
fs.mkdirSync(artifacts, {recursive: true});
fs.writeFileSync('/tmp/proof.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
fs.writeFileSync('/tmp/not-image.txt', 'hello');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4'
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1:4173');
  const pathname = decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(root, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});
const failures = [];
function check(name, ok, detail = '') {
  if (!ok) {
    const line = name + (detail ? ': ' + detail : '');
    failures.push(line);
    console.error('FAIL', line);
  } else console.log('ok', name);
}
function originHeaders() {
  return {
    'access-control-allow-origin': 'http://127.0.0.1:4173',
    'access-control-allow-headers': 'content-type, apikey, authorization, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json'
  };
}

const page = await browser.newPage();
await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
page.on('pageerror', (err) => failures.push('page error: ' + err.message));
let mode = 'fail';
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (!req.url().includes('evie-order-request')) return req.continue();
  if (req.method() === 'OPTIONS') return req.respond({status: 204, headers: originHeaders(), body: ''});
  if (mode === 'fail') {
    return req.respond({status: 503, contentType: 'application/json', headers: originHeaders(), body: JSON.stringify({ok: false, error: 'Backend not configured'})});
  }
  return req.respond({
    status: 201,
    contentType: 'application/json',
    headers: originHeaders(),
    body: JSON.stringify({ok: true, order_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', stored: true})
  });
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('evie-age-confirmed-v2', 'yes');
  sessionStorage.setItem('evie-bag-v4', JSON.stringify([
    {name: '20 Pics + Videos', price: 20, qty: 2, exclusive: null},
    {name: 'VIP · 3 Months GFE', price: 300, qty: 1, exclusive: 'membership'},
    {name: '<img src=x onerror=alert(1)>', price: 5, qty: 1, exclusive: null}
  ]));
});
await page.goto('http://127.0.0.1:4173/checkout.html', {waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => window.EvieCheckout);
const gateHidden = await page.$eval('#ageGate', (el) => el.hidden);
check('age gate skipped when already confirmed', gateHidden);
const synced = await page.evaluate(() => window.EvieCheckout.state());
check('bag syncs 20 pack', synced.qty.bundle20 === 2, JSON.stringify(synced.qty));
check('bag syncs VIP 3', synced.qty.vip3 === 1);
check('unrecognized bag line kept', synced.extras.some((extra) => extra.unrecognized));
check('VIP uses payment price', (await page.evaluate(() => window.EvieCheckout.total())) === 390);
check('menu price note visible', (await page.$eval('#itemList', (el) => el.textContent)).includes('Menu lists $300'));
check('bag name is escaped', await page.$eval('#itemList', (el) => !el.querySelector('img') && el.textContent.includes('<img')));
check('recommendation present', (await page.$eval('#recs', (el) => el.textContent)).includes('Deluxe Dropbox Today Promo'));

await page.click('[data-rec="deluxe55"]');
await page.waitForFunction(() => window.EvieCheckout.total() === 445);
check('add recommendation updates total', true);
const urls = await page.evaluate(() => ({venmo: window.EvieCheckout.venmoUrls(), cash: window.EvieCheckout.cashUrls()}));
check('venmo deep link', urls.venmo.app.startsWith('venmo://paycharge?txn=pay&recipients=Barfiesfunds&amount=445&note='), urls.venmo.app);
check('venmo web fallback', urls.venmo.web === 'https://venmo.com/Barfiesfunds');
check('cash app amount link', urls.cash.web === 'https://cash.app/$taylorgann90/445', urls.cash.web);
await page.click('[data-select="cashapp"]');
check('cash app selected', await page.$eval('[data-method="cashapp"]', (el) => el.classList.contains('is-on')));

await page.click('[data-dec-extra="0"]');
await page.waitForFunction(() => window.EvieCheckout.state().extras.length === 0);
await page.click('#submitCheckout');
check('handle required', (await page.$eval('#formErr', (el) => el.textContent)).includes('at least one username'));
await page.type('#tgUser', '@evie_test');
await page.click('#submitCheckout');
check('adult confirmation required', (await page.$eval('#formErr', (el) => el.textContent)).toLowerCase().includes('18'));
await page.click('#checkoutAdult');
const fileInput = await page.$('#proofInput');
await fileInput.uploadFile('/tmp/not-image.txt');
await page.waitForFunction(() => {
  const text = document.getElementById('formErr').textContent.toLowerCase();
  return text.includes('image') || text.includes('screenshot');
});
check('rejects non-image', true);
await fileInput.uploadFile('/tmp/proof.png');
await page.waitForSelector('#uploadBox.has-file');
check('shows screenshot preview', true);
await page.evaluate(() => {
  const orig = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    if (opts.body instanceof FormData) {
      const proof = opts.body.get('proof');
      window.__checkoutPost = {
        proof: proof ? {size: proof.size, type: proof.type, name: proof.name} : null,
        order: String(opts.body.get('order') || '')
      };
    }
    return orig(url, opts);
  };
});

await page.click('#submitCheckout');
await page.waitForFunction(() => !document.getElementById('formErr').hidden && document.getElementById('formErr').textContent.includes('not saved'));
check('failed save stays honest', true);
const posted = await page.evaluate(() => window.__checkoutPost);
check('proof file is included in the upload', posted && posted.proof && posted.proof.size > 0 && posted.proof.type === 'image/png', JSON.stringify(posted && posted.proof));
check('order payload includes the telegram handle', posted && posted.order.includes('@evie_test'));
mode = 'ok';
await page.click('#submitCheckout');
await page.waitForSelector('#confirmCard:not([hidden])');
const lead = await page.$eval('#confirmLead', (el) => el.textContent);
check('success shows reference', lead.includes('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee') && lead.includes('cannot see whether'));
check('success does not claim the money arrived', !/payment confirmed|paid successfully|money received/i.test(lead));
await page.screenshot({path: path.join(artifacts, 'checkout-confirmation-mobile.png'), fullPage: true});

await page.click('#editOrder');
await page.waitForSelector('#checkoutForm:not([hidden])');
await page.evaluate(() => { window.EVIE_ORDER_API_URL = ''; });
await page.click('#submitCheckout');
check('blank api url is honest', (await page.$eval('#formErr', (el) => el.textContent)).includes('isn’t connected'));

await page.setViewport({width: 1280, height: 900});
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({path: path.join(artifacts, 'checkout-desktop.png'), fullPage: false});
await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
await page.evaluate(() => window.scrollTo(0, 280));
await page.screenshot({path: path.join(artifacts, 'checkout-items-mobile.png'), fullPage: false});

const store = await browser.newPage();
await store.setViewport({width: 390, height: 844, isMobile: true});
store.on('pageerror', (err) => failures.push('store error: ' + err.message));
await store.evaluateOnNewDocument(() => {
  localStorage.setItem('evie-age-confirmed-v2', 'yes');
  sessionStorage.setItem('evie-fulfillment-agreement-accepted-2026-10-30', 'yes');
});
await store.goto('http://127.0.0.1:4173/index.html', {waitUntil: 'domcontentloaded'});
await store.waitForSelector('.add-product');
const menuOk = await store.evaluate(() => {
  const vip3 = [...document.querySelectorAll('.product-card')].find((card) => card.textContent.includes('VIP · 3 Months GFE'));
  const vip1 = [...document.querySelectorAll('.product-card')].find((card) => card.textContent.includes('VIP · 1 Month GFE'));
  const pack = [...document.querySelectorAll('.product-card')].find((card) => card.textContent.includes('20 Pics + Videos'));
  return {
    vip3: vip3 ? vip3.textContent.includes('$300') && !vip3.textContent.includes('$350') : false,
    vip1: vip1 ? vip1.textContent.includes('$150') : false,
    pack: pack ? pack.textContent.includes('$20') : false
  };
});
check('storefront VIP 3 card stays $300', menuOk.vip3, JSON.stringify(menuOk));
check('storefront VIP 1 card stays $150', menuOk.vip1);
check('storefront 20 pack stays $20', menuOk.pack);
await store.evaluate(() => {
  [...document.querySelectorAll('.add-product')].find((el) => el.dataset.name === '20 Pics + Videos').click();
});
await store.waitForSelector('#bagPill.visible');
await store.evaluate(() => document.getElementById('reviewOrder').click());
await store.waitForFunction(() => document.getElementById('bagDrawer').open);
await Promise.all([
  store.waitForNavigation({waitUntil: 'domcontentloaded'}),
  store.evaluate(() => document.getElementById('confirmOrder').click())
]);
check('bag opens checkout', store.url().includes('checkout.html'));
await store.waitForFunction(() => window.EvieCheckout && window.EvieCheckout.state().qty.bundle20 === 1);
check('checkout received the bag', true);
await store.screenshot({path: path.join(artifacts, 'checkout-from-bag-mobile.png'), fullPage: true});

const admin = await browser.newPage();
const adminErrors = [];
admin.on('pageerror', (err) => adminErrors.push(err.message));
await admin.goto('http://127.0.0.1:4173/admin.html', {waitUntil: 'domcontentloaded'});
await admin.waitForSelector('#panel-orders');
check('admin orders panel exists', await admin.$eval('#ordersList', (el) => el.textContent.includes('Open this section')));
check('admin script did not crash', adminErrors.length === 0, adminErrors.join('; '));

await browser.close();
server.close();
if (failures.length) {
  console.error('\nFAILED');
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}
console.log('\nbrowser checks passed');
