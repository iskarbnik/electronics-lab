import test from 'node:test';
import assert from 'node:assert/strict';
import { newCircuit, addComp, simulate, advance, restart, genVoltage, isDynamic } from '../js/sim/circuit.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

function rails(c) {
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  return c;
}
function rc(r = 1000, cap = 1e-3, v = 9) {
  const c = rails(newCircuit(v));
  addComp(c, { id: 'W1', type: 'wire', pins: ['p+5', 'a5'] });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['c5', 'c9'], props: { r } });
  addComp(c, { id: 'C1', type: 'capacitor', pins: ['d9', 'd10'], props: { c: cap } });
  addComp(c, { id: 'W2', type: 'wire', pins: ['a10', 'p-10'] });
  return c;
}

test('capacitor charges along 1 - exp(-t/RC)', () => {
  const c = rc();
  assert.ok(isDynamic(c));
  const s0 = simulate(c);
  near(s0.comps.C1.v, 0, 0.01);
  near(s0.comps.C1.i, 9 / 1000, 2e-4);          // inrush limited by the resistor
  let s = advance(c, 1, 0.0005);                  // one time constant
  near(s.comps.C1.v, 9 * (1 - Math.exp(-1)), 0.05);
  s = advance(c, 4, 0.0005);                      // five time constants
  near(s.comps.C1.v, 9 * (1 - Math.exp(-5)), 0.06);
  near(s.comps.C1.i, 9 / 1000 * Math.exp(-5), 2e-5);
  near(c.t, 5, 1e-6);
});

test('restart discharges and rewinds', () => {
  const c = rc();
  advance(c, 2, 0.001);
  restart(c);
  assert.equal(c.t, 0);
  near(simulate(c).comps.C1.v, 0, 1e-6);
});

test('charged capacitor discharges through a resistor', () => {
  const c = rails(newCircuit());
  addComp(c, { id: 'C1', type: 'capacitor', pins: ['a5', 'p-3'], props: { c: 1e-3 }, vc: 5 });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['b5', 'p-4'], props: { r: 1000 } });
  const s = advance(c, 1, 0.0005);
  near(s.comps.C1.v, 5 * Math.exp(-1), 0.05);
});

test('generator square wave', () => {
  const p = { wave: 'square', f: 2, v: 5 };
  assert.equal(genVoltage(p, 0.1), 5);
  assert.equal(genVoltage(p, 0.3), 0);
  assert.equal(genVoltage(p, 0.6), 5);
  near(genVoltage({ wave: 'sine', f: 1, v: 4 }, 0.25), 4, 1e-9);
});

test('static simulate does not move time', () => {
  const c = rc();
  simulate(c); simulate(c);
  assert.equal(c.t, 0);
});

test('silicon diode drops 0.7 V forward and blocks in reverse', () => {
  const c = rails(newCircuit(5));
  addComp(c, { id: 'W1', type: 'wire', pins: ['p+5', 'a5'] });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['c5', 'c9'], props: { r: 430 } });
  addComp(c, { id: 'D1', type: 'diode', pins: ['d9', 'd10'] });
  addComp(c, { id: 'W2', type: 'wire', pins: ['a10', 'p-10'] });
  let s = simulate(c);
  near(s.comps.D1.v, 0.7, 0.02);
  near(s.comps.D1.i, (5 - 0.7) / 430, 3e-4);
  assert.ok(s.comps.D1.conducting);
  c.comps.find(x => x.id === 'D1').pins.reverse();
  s = simulate(c);
  near(s.comps.D1.i, 0, 1e-6);
  assert.ok(!s.comps.D1.conducting);
  near(s.comps.D1.v, -5, 0.01);
});

test('diode over 1 A burns', () => {
  const c = rails(newCircuit(5));
  addComp(c, { id: 'W1', type: 'wire', pins: ['p+5', 'a5'] });
  addComp(c, { id: 'D1', type: 'diode', pins: ['c5', 'c9'] });
  addComp(c, { id: 'W2', type: 'wire', pins: ['a9', 'p-10'] });
  const s = simulate(c);
  assert.ok(s.events.some(e => e.id === 'D1'));
  assert.ok(c.comps.find(x => x.id === 'D1').burned);
});


// Q1: base column 5, collector column 6, emitter column 7 (pins on f row).
function npnCircuit({ rb, rl = 330, vcc = 9, withLed = false }) {
  const c = rails(newCircuit(vcc));
  addComp(c, { id: 'Q1', type: 'npn', pins: ['f5', 'f6', 'f7'] });
  addComp(c, { id: 'WE', type: 'wire', pins: ['g7', 'q-7'] });
  addComp(c, { id: 'WQ', type: 'wire', pins: ['q-1', 'p-20'] });
  addComp(c, { id: 'WS', type: 'wire', pins: ['p+20', 'q+20'] });
  addComp(c, { id: 'RL', type: 'resistor', pins: ['g6', 'q+6'], props: { r: rl } });
  addComp(c, { id: 'RB', type: 'resistor', pins: ['g5', 'q+5'], props: { r: rb } });
  return c;
}

test('npn is off with no base current', () => {
  const c = npnCircuit({ rb: 1e9 });
  const s = simulate(c);
  assert.equal(s.comps.Q1.state, 'off');
  near(s.comps.Q1.i, 0, 1e-6);
  near(s.comps.RL.i, 0, 1e-6);
});

test('npn saturates as a switch with a base resistor', () => {
  const c = npnCircuit({ rb: 10000 });
  const s = simulate(c);
  near(s.comps.Q1.vbe, 0.7, 0.05);
  assert.equal(s.comps.Q1.state, 'sat');
  near(s.comps.Q1.vce, 0.2, 0.1);
  near(-s.comps.RL.i, (9 - 0.2) / 330, 2e-3);
  assert.ok(s.comps.Q1.ib > 0);
});

test('npn amplifies in the active region', () => {
  // 1 MOhm base resistor, 9 V: Ib about 8 uA, Ic = 100 Ib, drop across 330 Ohm is small, so it stays active.
  const c = npnCircuit({ rb: 1e6 });
  const s = simulate(c);
  assert.equal(s.comps.Q1.state, 'active');
  near(s.comps.Q1.ib, (9 - 0.7) / 1e6, 1e-6);
  near(s.comps.Q1.i, 100 * s.comps.Q1.ib, 1e-5);
  near(-s.comps.RL.i, s.comps.Q1.i, 1e-5);
  assert.ok(s.comps.Q1.vce > 0.2);
});

test('npn with a heavy load current is limited by the load, not beta', () => {
  const c = npnCircuit({ rb: 1000 });
  assert.equal(simulate(c).comps.Q1.state, 'sat');
});

test('npn burns when the base is driven straight from the supply', () => {
  const c = npnCircuit({ rb: 0.01 });
  const s = simulate(c);
  assert.ok(s.events.some(e => e.id === 'Q1'), 'Q1 should burn');
  assert.ok(c.comps.find(x => x.id === 'Q1').burned);
  assert.equal(simulate(c).comps.Q1.state, 'off');
});

test('sine generator alternates around zero', () => {
  near(genVoltage({ wave: 'sine', f: 1, v: 5 }, 0.75), -5, 1e-9);
});
