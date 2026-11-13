import test from 'node:test';
import assert from 'node:assert/strict';
import { bidi } from '../js/i18n.js';

const w = s => `<bdi dir="ltr">${s}</bdi>`;

test('wraps number+unit runs for all units', () => {
  for (const u of ['mA', 'A', 'µA', 'V', 'mV', 'Ω', 'kΩ', 'MΩ', 'W', 'mW', 'µF', 'mF', 'F', 's']) {
    assert.equal(bidi(`כ-20 ${u} כאן`), `כ-${w(`20 ${u}`)} כאן`);
  }
  assert.equal(bidi('819 mA'), w('819 mA'));
  assert.equal(bidi('4.7 kΩ, 9 V'), `${w('4.7 kΩ')}, ${w('9 V')}`);
  assert.equal(bidi('1/4 W'), w('1/4 W'));
  assert.equal(bidi('9V'), w('9V'));
});

test('leaves code, tags, existing bdi and non-units alone', () => {
  const code = '<code>R = 9 V / 20 mA</code>';
  assert.equal(bidi(code), code);
  assert.equal(bidi(`<b class="a5 V">x</b> 5 V`), `<b class="a5 V">x</b> ${w('5 V')}`);
  assert.equal(bidi(w('5 V')), w('5 V'));
  assert.equal(bidi('column 5 and A5, 10 Amps, 3 Wires'), 'column 5 and A5, 10 Amps, 3 Wires');
  assert.equal(bidi(''), '');
});
