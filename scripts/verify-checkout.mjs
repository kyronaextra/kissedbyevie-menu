import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
function check(name, ok, detail = '') {
  if (!ok) failures.push(name + (detail ? ': ' + detail : ''));
  else console.log('ok', name);
}

const catalogContext = {window: {}};
vm.createContext(catalogContext);
vm.runInContext(read('checkout-catalog.js'), catalogContext);
const catalog = catalogContext.window.EVIE_CHECKOUT_CATALOG;
check('catalog loads', catalog && catalog.items.length === 10);
check('paypal link stored', catalog.paypalUrl === 'https://www.paypal.com/qrcodes/p2pqrc/DTBWZFQXN6494');

const fn = read('supabase/functions/evie-order-request/index.ts');
const serverItems = [...fn.matchAll(/\{id: "([^"]+)", name: "(.*)", cents: (\d+)\}/g)].map((match) => ({
  id: match[1],
  name: JSON.parse('"' + match[2] + '"'),
  cents: Number(match[3])
}));
const serverExtras = [...fn.matchAll(/\{name: "(.*)", cents: (\d+)/g)]
  .filter((match) => !match[1].startsWith('id:'))
  .map((match) => ({name: JSON.parse('"' + match[1] + '"'), cents: Number(match[2])}));
check('server item count', serverItems.length === catalog.items.length, String(serverItems.length));
catalog.items.forEach((item) => {
  const server = serverItems.find((row) => row.id === item.id);
  check('price ' + item.id, server && server.cents === item.price * 100 && server.name === item.name, JSON.stringify(server));
});
catalog.extras.forEach((extra) => {
  const server = serverExtras.find((row) => row.name === extra.name);
  check('extra ' + extra.name, server && server.cents === extra.price * 100, JSON.stringify(server));
});

const menu = read('menu-catalog.js');
const menuNames = [...menu.matchAll(/name:'([^']*)'/g)].map((match) => match[1]);
menuNames.forEach((name) => {
  const known = catalog.aliases[name] || catalog.extras.some((extra) => extra.name === name);
  check('menu maps ' + name, !!known);
});
check('menu VIP 3 is 350', menu.includes("name:'VIP 3 Months',price:350"));
check('menu VIP 1 is 150', menu.includes("name:'VIP 1 Month',price:150"));
check('menu has no old $300 VIP', !menu.includes('price:300') && !menu.includes('$300'));
check('menu dropbox is 900+', menu.includes('Deluxe Dropbox (900+ vault)') && !menu.includes('800+'));
check('checkout VIP 3 is 350', catalog.items.find((item) => item.id === 'vip3').price === 350);
check('checkout VIP 3 matches the menu price', catalog.items.find((item) => item.id === 'vip3').storefrontPrice === 350);
check('no copy-order button', !read('index.html').includes('id="copyOrder"') && !read('index.html').includes('Dick rate add-on'));
check('homepage lists PayPal checkout', read('index.html').includes('Venmo, Cash App, PayPal, and Amazon e-gift go through checkout') && read('index.html').includes('>PayPal</span>'));

const page = read('checkout.html');
const script = read('checkout.js');
[
  'Your order',
  'Add one',
  '>Amount<',
  'Payment method:',
  '@Barfiesfunds',
  '$taylorgann90',
  'Friends and Family',
  'Never Goods',
  'https://www.paypal.com/qrcodes/p2pqrc/DTBWZFQXN6494',
  'data-method="paypal"',
  'data-select="paypal"',
  'Copy memo',
  'Copy Memo',
  'Snapchat username',
  'Telegram username',
  'X username',
  'accept="image/*"',
  'So I can keep track of who’s paid',
  'Return to chat',
  'https://x.com/kissedbyevie?s=11',
  'https://t.me/eviesquirts',
  'checkout.js',
  'order-config.js'
].forEach((needle) => check('page has ' + needle, page.includes(needle)));
['venmo://paycharge?txn=pay&recipients=', 'twitter://user?screen_name=', 'tg://resolve?domain=', 'cash.app/$'].forEach((needle) => {
  check('script has ' + needle, script.includes(needle));
});
check('paypal url matches the catalog', page.includes(catalog.paypalUrl));
check('amazon product link has no prefilled params', page.includes(catalog.amazonUrl) && !page.includes(catalog.amazonUrl + '?') && page.includes('Pay By Amazon E-gift') && page.includes('Copy email') && page.includes('Gift amount'));
check('script accepts paypal preselect', script.includes("method === 'paypal'") && script.includes("if (state.method === 'paypal') return 'paypal'"));
check('open amazon copies the recipient email', script.includes('Email copied, paste it in the To field') && script.includes('catalog.amazonEmail'));
check('amazon fee $20 becomes $30', catalog.amazonFeeCents(2000, 'amazon_egift') === 1000);
check('amazon fee $34.99 becomes $44.99', catalog.amazonFeeCents(3499, 'amazon_egift') === 1000);
check('amazon fee $35 stays $35', catalog.amazonFeeCents(3500, 'amazon_egift') === 0);
check('amazon fee $60 stays $60', catalog.amazonFeeCents(6000, 'amazon_egift') === 0);
check('amazon fee stays off PayPal', catalog.amazonFeeCents(2000, 'paypal') === 0 && catalog.amazonFeeCents(2000, 'venmo') === 0 && catalog.amazonFeeCents(2000, 'cashapp') === 0);
check('server accepts paypal and amazon', fn.includes('if (raw === "paypal") return "paypal"') && fn.includes('amazon_egift') && fn.includes('Choose Venmo, Cash App, PayPal, or Amazon e-gift'));
check('server recomputes the amazon fee', fn.includes('function amazonGiftFeeCents') && fn.includes('subtotalCents < 3500') && fn.includes('return 1000') && fn.includes('name: "Amazon gift card fee"'));
check('paypal memo is still required', fn.includes('if (!isKnownMemo(memo))') && fn.includes('payment_memo: memo'));
check('no service role in checkout client', !/service_role|SUPABASE_SERVICE_ROLE/.test(page + script + read('order-config.js') + read('checkout-catalog.js')));
check('order api url set', read('order-config.js').includes('functions/v1/evie-order-request'));
check('storefront continues to checkout', read('index.html').includes('Continue to checkout') && read('app.js').includes("location.assign('/checkout')"));
const paypalMigration = read('supabase/migrations/20261120211500_evie_paypal_payment_method.sql');
check('paypal migration allows the method', paypalMigration.includes("'paypal'") && paypalMigration.includes("'amazon_egift'") && paypalMigration.includes('evie_order_requests_payment_method_check'));
check('admin labels PayPal', read('admin.js').includes("paypal:'PayPal'") && read('admin.js').includes("amazon_egift:'Amazon e-gift'"));
check('admin orders view', read('admin.html').includes('panel-orders') && read('admin.js').includes("request('orders')"));
check('private bucket migration', read('supabase/migrations/20261120153000_evie_checkout_payment_proof.sql').includes("'evie-payment-proofs', false") || read('supabase/migrations/20261120153000_evie_checkout_payment_proof.sql').includes("false"));

const migration = read('supabase/migrations/20261120153000_evie_checkout_payment_proof.sql');
check('bucket is private', /values \('evie-payment-proofs', 'evie-payment-proofs', false\)/.test(migration));
check('admin signs proofs', read('supabase/functions/evie-admin-api/index.ts').includes('createSignedUrl'));

if (failures.length) {
  console.error('\nFAILED');
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}
console.log('\nstatic checks passed');
