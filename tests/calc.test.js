import test from 'node:test';
import assert from 'node:assert/strict';
import { ohm, ledResistor, rcTime, nearestE12 } from '../js/sim/calc.js';
import { PARTS } from '../js/parts.js';
import { LESSONS } from '../js/lessons/index.js';
import { STRINGS } from '../js/i18n.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test("Ohm's law solves for the missing value", () => {
  near(ohm({ v: 9, r: 470, i: NaN }).i, 0.01915, 1e-4);
  near(ohm({ i: 0.02, r: 330, v: NaN }).v, 6.6, 1e-9);
  near(ohm({ v: 5, i: 0.01, r: NaN }).r, 500, 1e-9);
  near(ohm({ v: 9, r: 470, i: NaN }).p, 0.1723, 1e-3);
  assert.equal(ohm({ v: 9, i: NaN, r: NaN }), null);
});

test('standard resistor values', () => {
  assert.equal(nearestE12(460), 470);
  assert.equal(nearestE12(4800), 4700);
  assert.equal(nearestE12(471, true), 560);
  assert.equal(nearestE12(470, true), 470);
  assert.equal(nearestE12(1000000), 1000000);
});

test('LED resistor rounds up to a safe standard value', () => {
  const o = ledResistor(9, 2, 0.015);
  near(o.r, 466.7, 0.1);
  assert.equal(o.std, 470);
  assert.ok(o.i <= 0.015);
  assert.equal(ledResistor(2, 3, 0.02), null);
});

test('RC time', () => {
  const o = rcTime(470, 0.001);
  near(o.tau, 0.47, 1e-9);
  near(o.full, 2.35, 1e-9);
  assert.equal(rcTime(0, 1), null);
});

test('every part entry has both languages, a name and a real lesson', () => {
  for (const p of PARTS) {
    assert.ok(STRINGS['part.' + p.type], p.type);
    assert.ok(LESSONS.some(l => l.id === p.lesson), `${p.type}: lesson ${p.lesson}`);
    for (const x of [p.what, p.tip]) {
      assert.ok(x.he.trim() && x.en.trim(), p.type);
      assert.ok(!/[—–]/.test(x.he + x.en), `dash in ${p.type}`);
    }
  }
});
