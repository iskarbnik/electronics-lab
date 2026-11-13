import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), raw: m };
}

test('store keeps lang, done and step under elab.v1', async () => {
  globalThis.localStorage = fakeStorage();
  const s = await import('../js/store.js?a');
  s.setLang('he');
  s.setStep('l01', 3);
  s.markDone('l02');
  const saved = JSON.parse(globalThis.localStorage.raw.get('elab.v1'));
  assert.equal(saved.lang, 'he');
  assert.equal(saved.step.l01, 3);
  assert.equal(saved.done.l02, true);
  assert.equal(s.doneCount(['l01', 'l02']), 1);
  s.resetProgress();
  assert.equal(s.isDone('l02'), false);
  assert.equal(s.getLang(), 'he');
});

test('store survives blocked storage', async () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const s = await import('../js/store.js?b');
  s.setStep('x', 2);
  assert.equal(s.getStep('x'), 2);
  s.markDone('x');
  assert.equal(s.isDone('x'), true);
});

test('store ignores corrupt data', async () => {
  globalThis.localStorage = { getItem: () => '{"lang":"fr","done":5,"step":{"a":-1,"b":2}}', setItem() {} };
  const s = await import('../js/store.js?c');
  assert.equal(s.getLang(), null);
  assert.equal(s.getStep('a'), 0);
  assert.equal(s.getStep('b'), 2);
});
