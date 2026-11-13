import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const block = /const FILES = \[([\s\S]*?)\];/.exec(sw)[1];
const listed = new Set([...block.matchAll(/'([^']+)'/g)].map(m => m[1]));

test('service worker precaches every js file and each listed file exists', () => {
  for (const dir of ['js', 'js/sim', 'js/lessons', 'js/ui']) {
    for (const f of readdirSync(new URL(dir + '/', root))) {
      if (f.endsWith('.js')) assert.ok(listed.has(`${dir}/${f}`), `${dir}/${f} missing from sw.js`);
    }
  }
  for (const f of listed) if (f !== './') assert.ok(existsSync(new URL(f, root)), `${f} does not exist`);
});

test('manifest icons exist and urls are relative', () => {
  const m = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, root)), i.src);
});
