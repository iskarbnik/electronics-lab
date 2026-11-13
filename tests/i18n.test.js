import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, t, L, setLang, getLang, ltr } from '../js/i18n.js';

test('every string has both languages and no em dash', () => {
  for (const [k, [en, he]] of Object.entries(STRINGS)) {
    assert.ok(en && he, k);
    assert.ok(!/[—–]/.test(en + he), `dash in ${k}`);
    const vars = s => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(vars(en), vars(he), `placeholders differ in ${k}`);
  }
});

test('t, L and setLang', () => {
  setLang('en', false);
  assert.equal(t('lesson.step', { n: 2, m: 9 }), 'Step 2 of 9');
  assert.equal(L({ he: 'א', en: 'a' }), 'a');
  setLang('he', false);
  assert.equal(getLang(), 'he');
  assert.equal(t('nav.next'), 'הבא');
  assert.equal(L({ he: 'א', en: 'a' }), 'א');
  assert.equal(t('missing.key'), 'missing.key');
  assert.equal(ltr('9 V'), '<bdi dir="ltr">9 V</bdi>');
});
