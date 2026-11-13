import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStandard, solveOhm, ledResistor, rcTau, bandsToOhms, parseNum } from '../js/sim/calc.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test('standard values round up within E12', () => {
  assert.equal(nextStandard(350), 390);
  assert.equal(nextStandard(390), 390);
  assert.equal(nextStandard(391), 470);
  assert.equal(nextStandard(1000), 1000);
  assert.equal(nextStandard(8300), 10000);
  assert.equal(nextStandard(83), 100);
  assert.equal(nextStandard(0.5), 0.56);
  assert.ok(Number.isNaN(nextStandard(-1)));
});

test('Ohm law solves for whichever is missing', () => {
  let r = solveOhm({ v: 9, i: 0.02, r: NaN });
  near(r.r, 450); near(r.p, 0.18); assert.equal(r.solved, 'r');
  r = solveOhm({ v: 9, i: NaN, r: 470 }); near(r.i, 9 / 470); assert.equal(r.solved, 'i');
  r = solveOhm({ v: NaN, i: 0.01, r: 1000 }); near(r.v, 10); assert.equal(r.solved, 'v');
  assert.equal(solveOhm({ v: 9, i: NaN, r: NaN }), null);
  assert.equal(solveOhm({ v: 9, i: 1, r: 9 }), null);
  assert.equal(solveOhm({ v: 9, i: NaN, r: 0 }), null);
});

test('LED resistor matches the lesson example', () => {
  const r = ledResistor(9, 2, 0.02);
  near(r.r, 350); assert.equal(r.std, 390);
  near(r.actual, 7 / 390); assert.ok(r.actual < 0.02);
  assert.equal(ledResistor(2, 3, 0.02), null);
  assert.equal(ledResistor(5, 2, 0), null);
});

test('RC time constant', () => {
  const r = rcTau(1000, 470e-6);
  near(r.tau, 0.47); near(r.full, 2.35); near(r.fc, 1 / (2 * Math.PI * 0.47));
  assert.equal(rcTau(0, 1), null);
});

test('colour bands to ohms and number parsing', () => {
  assert.equal(bandsToOhms(4, 7, 1), 470);
  assert.equal(bandsToOhms(1, 0, 3), 10000);
  near(bandsToOhms(2, 2, -1), 2.2);
  near(parseNum('4,7'), 4.7); near(parseNum(' 10 '), 10);
  assert.ok(Number.isNaN(parseNum('abc'))); assert.ok(Number.isNaN(parseNum('')));
});
