import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../js/parts.js';

test('parts encyclopedia: unique ids, both languages, no dashes, a symbol each', () => {
  assert.ok(PARTS.length >= 15);
  assert.equal(new Set(PARTS.map(p => p.id)).size, PARTS.length);
  for (const p of PARTS) {
    for (const k of ['name', 'what', 'facts', 'tip']) {
      assert.ok(p[k]?.he?.trim() && p[k]?.en?.trim(), `${p.id}.${k}`);
      assert.ok(!/[—–]/.test(p[k].he + p[k].en), `${p.id}.${k} has a dash`);
    }
    assert.ok(p.symbol.includes('<path'), p.id);
  }
});
