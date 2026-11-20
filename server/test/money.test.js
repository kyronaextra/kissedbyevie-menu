import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_CENTS, MIN_CENTS, parseUsdToCents } from '../lib/money.js';

test('converts decimal strings to integer cents without float drift', () => {
  assert.deepEqual(parseUsdToCents('19.99'), { ok: true, cents: 1999 });
  assert.deepEqual(parseUsdToCents('10.10'), { ok: true, cents: 1010 });
  assert.deepEqual(parseUsdToCents('10.1'), { ok: true, cents: 1010 });
  assert.deepEqual(parseUsdToCents('5'), { ok: true, cents: 500 });
  assert.deepEqual(parseUsdToCents('5.00'), { ok: true, cents: 500 });
  assert.deepEqual(parseUsdToCents('$1,000.50'), { ok: true, cents: 100050 });
  assert.deepEqual(parseUsdToCents('5,000.00'), { ok: true, cents: MAX_CENTS });
  assert.deepEqual(parseUsdToCents(19.99), { ok: true, cents: 1999 });
  assert.deepEqual(parseUsdToCents(10.1), { ok: true, cents: 1010 });
  assert.deepEqual(parseUsdToCents(2500), { ok: true, cents: 250000 });
});

test('rejects amounts outside $5.00 to $5,000.00 and extra decimals', () => {
  assert.equal(parseUsdToCents('4.99').ok, false);
  assert.equal(parseUsdToCents('4.99').code, 'min');
  assert.equal(parseUsdToCents(4.99).cents, undefined);
  assert.equal(parseUsdToCents('0').code, 'min');
  assert.equal(parseUsdToCents('5000.01').code, 'max');
  assert.equal(parseUsdToCents(5000.01).code, 'max');
  assert.equal(parseUsdToCents('10.999').code, 'decimals');
  assert.equal(parseUsdToCents('1.005').code, 'decimals');
  assert.equal(parseUsdToCents(0.1 + 0.2).code, 'decimals');
  assert.equal(parseUsdToCents('').code, 'invalid');
  assert.equal(parseUsdToCents('  ').code, 'invalid');
  assert.equal(parseUsdToCents('5.').code, 'decimals');
  assert.equal(parseUsdToCents('.50').code, 'decimals');
  assert.equal(parseUsdToCents('abc').code, 'decimals');
  assert.equal(parseUsdToCents(null).code, 'invalid');
  assert.equal(parseUsdToCents(undefined).code, 'invalid');
  assert.equal(parseUsdToCents(Number.NaN).code, 'invalid');
  assert.equal(parseUsdToCents(MIN_CENTS).cents, 50000);
});
