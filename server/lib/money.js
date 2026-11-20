export const MIN_CENTS = 500;
export const MAX_CENTS = 500_000;

const DECIMAL = /^\d+(\.\d{1,2})?$/;

function fail(error, code) {
  return { ok: false, error, code };
}

/**
 * Parse a USD amount into integer cents.
 * Accepts a string ("$1,250.50", "25", "10.5") or a finite number.
 * Numbers are converted with their decimal string so 19.99 cannot become 1998.
 * Values with more than 2 decimal places, or binary leftovers such as 0.30000000000000004, are rejected.
 */
export function parseUsdToCents(input) {
  let raw;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return fail('Enter a dollar amount.', 'invalid');
    raw = String(input);
    if (/e/i.test(raw)) return fail('Enter a dollar amount with at most 2 decimal places.', 'decimals');
  } else if (typeof input === 'string') {
    raw = input.trim().replace(/[$,\s]/g, '');
    if (!raw) return fail('Enter a dollar amount.', 'invalid');
  } else {
    return fail('Enter a dollar amount.', 'invalid');
  }

  if (!DECIMAL.test(raw)) {
    return fail('Use up to 2 decimal places, like 25 or 25.50.', 'decimals');
  }

  const [whole, frac = ''] = raw.split('.');
  if (whole.length > 7) return fail('Maximum is $5,000.00.', 'max');

  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents)) return fail('Enter a dollar amount.', 'invalid');
  if (cents < MIN_CENTS) return fail('Minimum is $5.00.', 'min');
  if (cents > MAX_CENTS) return fail('Maximum is $5,000.00.', 'max');
  return { ok: true, cents };
}
