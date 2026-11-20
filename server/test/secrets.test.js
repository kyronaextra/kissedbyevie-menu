import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (/\.(js|mjs|html|css|md|json|yml|yaml|example|toml)$/.test(entry.name)) found.push(full);
  }
  return found;
}

test('tracked source does not contain live Stripe keys or webhook secrets', () => {
  const files = walk(root).filter((file) => !file.includes(`${path.sep}server${path.sep}test${path.sep}`));
  const forbidden = /sk_live_[A-Za-z0-9]|rk_live_[A-Za-z0-9]|sk_test_[A-Za-z0-9]{8,}|rk_test_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}/;
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (forbidden.test(text)) hits.push(path.relative(root, file));
  }
  assert.deepEqual(hits, []);
});
