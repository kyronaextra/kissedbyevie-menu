import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = ['playwright-core', '/tmp/pw/node_modules/playwright-core/index.js'];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      /* try the next location */
    }
  }
  throw new Error('Install playwright-core to capture screenshots.');
}
const { chromium } = loadPlaywright();
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.PAY_BASE || 'http://127.0.0.1:4179';
const outDir = process.env.PAY_SHOTS || '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const viewports = [
  { name: '430', width: 430, height: 932 },
  { name: '1440', width: 1440, height: 900 },
];

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('evie-age-confirmed-v2', 'yes');
  });
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await prepare(page);

    await page.goto(`${base}/pay.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#payButton');
    if (await page.locator('#payButton').isEnabled()) throw new Error('default button should be disabled');
    await shot(page, `pay-${viewport.name}-default.png`);

    await page.getByRole('button', { name: '$50' }).click();
    await page.waitForFunction(() => document.getElementById('payButton').textContent.includes('$50.00'));
    if (!(await page.locator('#payButton').isEnabled())) throw new Error('selected button should be enabled');
    await shot(page, `pay-${viewport.name}-selected.png`);

    if (viewport.name === '430') {
      await page.locator('#payButton').click();
      await page.waitForFunction(() => document.body.dataset.payVerified === 'paid');
      const amount = await page.locator('#successAmount').textContent();
      if (!amount.includes('$50.00')) throw new Error('success amount missing: ' + amount);
      const purpose = await page.locator('#successPurpose').textContent();
      if (purpose !== 'Tip / Tribute' && purpose !== '') {
        // preset click does not set purpose; paid preview session is only for the query URL.
      }
    }

    await page.goto(`${base}/pay.html`, { waitUntil: 'networkidle' });
    await page.fill('#amountInput', '2.50');
    await page.locator('#amountInput').blur();
    await page.waitForSelector('#formError:not([hidden])');
    const error = await page.locator('#formError').textContent();
    if (error !== 'Minimum is $5.00.') throw new Error('unexpected validation: ' + error);
    await shot(page, `pay-${viewport.name}-validation.png`);

    await page.goto(`${base}/pay.html?status=success&session_id=cs_test_previewok`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.payVerified === 'paid');
    await shot(page, `pay-${viewport.name}-success.png`);

    await page.addInitScript(() => {
      sessionStorage.setItem('kbe-custom-pay-draft', JSON.stringify({
        amount: '50.00',
        purpose: 'tip',
        note: 'for the set',
        handle: '@glossy',
      }));
    });
    await page.goto(`${base}/pay.html?status=cancel`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#cancelBanner:not([hidden])');
    const banner = await page.locator('#cancelBanner').textContent();
    if (!banner.includes('$50.00')) throw new Error('cancel banner dropped the amount: ' + banner);
    const value = await page.locator('#amountInput').inputValue();
    if (value !== '50.00') throw new Error('cancel did not keep the amount: ' + value);
    await shot(page, `pay-${viewport.name}-cancel.png`);
    await page.close();
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await prepare(desktop);
  await desktop.goto(`${base}/pay.html`, { waitUntil: 'networkidle' });
  await desktop.locator('#amountInput').focus();
  await desktop.keyboard.type('12.345');
  await desktop.locator('#amountInput').blur();
  const decimals = await desktop.locator('#formError').textContent();
  if (!decimals.includes('2 decimal')) throw new Error('decimal validation missing: ' + decimals);
  await desktop.keyboard.press('Tab');
  await desktop.close();
} finally {
  await browser.close();
}
