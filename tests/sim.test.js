import test from 'node:test';
import assert from 'node:assert/strict';
import { newCircuit, addComp, getComp, simulate, voltageBetween } from '../js/sim/circuit.js';
import { stripOf, holesOfStrip, nearestHole, holePos } from '../js/sim/board.js';
import { fmt, bands } from '../js/sim/format.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

function base(r = 470) {
  const c = newCircuit();
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  addComp(c, { id: 'W1', type: 'wire', pins: ['p+5', 'a5'] });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['c5', 'c9'], props: { r } });
  addComp(c, { id: 'D1', type: 'led', pins: ['d9', 'd10'] });
  addComp(c, { id: 'W2', type: 'wire', pins: ['a10', 'p-10'] });
  return c;
}

test('board strips', () => {
  assert.equal(stripOf('a5'), 'T5');
  assert.equal(stripOf('e5'), 'T5');
  assert.equal(stripOf('f5'), 'B5');
  assert.equal(stripOf('p+7'), 'p+');
  assert.equal(stripOf('BAT+'), 'BAT+');
  assert.equal(stripOf('k5'), null);
  assert.deepEqual(holesOfStrip('T3'), ['a3', 'b3', 'c3', 'd3', 'e3']);
  assert.equal(holesOfStrip('q-').length, 30);
  const p = holePos('c9');
  assert.equal(nearestHole(p.x + 3, p.y - 4), 'c9');
  assert.equal(nearestHole(-100, 200), null);
});

test('LED circuit obeys Ohm\'s law', () => {
  const s = simulate(base());
  near(s.comps.R1.i, 0.01463, 0.0002);
  near(s.comps.R1.v, 6.87, 0.03);
  near(s.comps.D1.v, 2.12, 0.02);
  near(s.comps.BAT.i, s.comps.R1.i, 1e-6);
  assert.ok(s.comps.D1.lit);
  assert.ok(!s.short);
  near(voltageBetween(s, 'p+9', 'p-20'), 8.99, 0.01);
  near(voltageBetween(s, 'a5', 'p+3'), 0, 0.001);
  // energy is conserved
  near(s.comps.BAT.p, s.comps.R1.p + s.comps.D1.p, 0.001);
});

test('open circuit carries no current', () => {
  const c = base();
  c.comps = c.comps.filter(x => x.id !== 'W2');
  const s = simulate(c);
  near(s.comps.R1.i, 0, 1e-6);
  assert.ok(!s.comps.D1.lit);
});

test('reversed LED blocks', () => {
  const c = base();
  getComp(c, 'D1').pins.reverse();
  const s = simulate(c);
  assert.ok(!s.comps.D1.lit);
  near(s.comps.R1.i, 0, 1e-6);
  assert.ok(!getComp(c, 'D1').burned);
});

test('LED without a resistor burns out and stays dead', () => {
  const c = base();
  c.comps = c.comps.filter(x => x.id !== 'R1');
  addComp(c, { id: 'WX', type: 'wire', pins: ['c5', 'c9'] });
  const s = simulate(c);
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].id, 'D1');
  assert.ok(s.events[0].i > 0.5);
  assert.ok(getComp(c, 'D1').burned);
  assert.ok(!s.comps.D1.lit);
  assert.equal(simulate(c).events.length, 0);
});

test('series resistors share the voltage, parallel branches add current', () => {
  const c = newCircuit();
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['p+5', 'a5'], props: { r: 1000 } });
  addComp(c, { id: 'R2', type: 'resistor', pins: ['b5', 'p-5'], props: { r: 2000 } });
  let s = simulate(c);
  near(s.comps.R1.i, 0.003, 1e-5);
  near(s.comps.R2.v, 6, 0.01);
  addComp(c, { id: 'R3', type: 'resistor', pins: ['p+9', 'p-9'], props: { r: 1000 } });
  s = simulate(c);
  near(s.comps.BAT.i, 0.003 + 0.009, 1e-4);
});

test('short circuit is detected', () => {
  const c = newCircuit();
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  addComp(c, { id: 'WX', type: 'wire', pins: ['p+4', 'p-4'] });
  assert.ok(simulate(c).short);
});

test('button and potentiometer', () => {
  const c = newCircuit();
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  addComp(c, { id: 'S1', type: 'button', pins: ['p+3', 'a3'] });
  addComp(c, { id: 'P1', type: 'pot', pins: ['e3', 'e4', 'e5'] });
  addComp(c, { id: 'W2', type: 'wire', pins: ['a5', 'p-5'] });
  near(simulate(c).comps.P1.i, 0, 1e-6);
  getComp(c, 'S1').props.pressed = true;
  let s = simulate(c);
  near(s.comps.P1.i, 0.0009, 1e-5);
  near(voltageBetween(s, 'a4', 'p-1'), 4.5, 0.01);
  getComp(c, 'P1').props.pos = 0.25;
  s = simulate(c);
  near(voltageBetween(s, 'a4', 'p-1'), 6.75, 0.01);
});

test('overloaded resistor is flagged hot', () => {
  const c = newCircuit();
  addComp(c, { id: 'R1', type: 'resistor', pins: ['BAT+', 'BAT-'], props: { r: 100 } });
  assert.ok(simulate(c).comps.R1.hot);
});

test('formatting', () => {
  assert.equal(fmt(0.01463, 'A'), '14.6 mA');
  assert.equal(fmt(8.993, 'V'), '8.99 V');
  assert.equal(fmt(470, 'Ω'), '470 Ω');
  assert.equal(fmt(1000, 'Ω'), '1 kΩ');
  assert.equal(fmt(4700, 'Ω'), '4.7 kΩ');
  assert.equal(fmt(0.1005, 'W'), '101 mW');
  assert.equal(fmt(0, 'A'), '0 A');
  assert.equal(fmt(-2.1, 'V'), '-2.1 V');
  assert.equal(bands(470).length, 3);
  assert.deepEqual(bands(470), bands(47).slice(0, 2).concat(bands(100)[2]));
});

// ---------- logic gates ----------
import { truthTable, gateEval } from '../js/sim/logic.js';

function gateBoard(fn, two = true) {
  const c = newCircuit();
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] });
  for (const [n, a, b, sw, rp] of [['A', 'p+2', 'c4', 'c2', 'p-4'], ['B', 'p+8', 'c10', 'c8', 'p-10']]) {
    if (!two && n === 'B') continue;
    addComp(c, { id: 'W' + n, type: 'wire', pins: [a, 'a' + (n === 'A' ? 2 : 8)] });
    addComp(c, { id: 'S' + n, type: 'switch', pins: [sw, b] });
    addComp(c, { id: 'R' + n, type: 'resistor', pins: [rp, 'a' + (n === 'A' ? 4 : 10)], props: { r: 10000 } });
  }
  addComp(c, { id: 'G1', type: 'gate', pins: two ? ['j13', 'j14', 'j15'] : ['j13', 'j14'], props: { fn } });
  addComp(c, { id: 'XA', type: 'wire', pins: ['e4', 'f13'] });
  if (two) addComp(c, { id: 'XB', type: 'wire', pins: ['e10', 'f14'] });
  addComp(c, { id: 'XY', type: 'wire', pins: [two ? 'f15' : 'f14', 'e18'] });
  addComp(c, { id: 'R1', type: 'resistor', pins: ['a18', 'a21'], props: { r: 470 } });
  addComp(c, { id: 'D1', type: 'led', pins: ['b21', 'b22'], props: { color: 'green' } });
  addComp(c, { id: 'W3', type: 'wire', pins: ['a22', 'p-22'] });
  return c;
}
const setSw = (c, id, on) => { getComp(c, id).props.on = on; };

test('every gate matches its truth table through the whole circuit', () => {
  for (const fn of ['and', 'or', 'nand', 'nor', 'xor']) {
    for (const [[a, b], out] of truthTable(fn)) {
      const c = gateBoard(fn);
      setSw(c, 'SA', a); setSw(c, 'SB', b);
      const s = simulate(c);
      assert.equal(s.comps.G1.out, out, `${fn}(${+a},${+b})`);
      assert.equal(s.comps.D1.lit, out, `${fn}(${+a},${+b}) LED`);
      assert.deepEqual(s.comps.G1.inputs, [a, b]);
    }
  }
});

test('NOT gate inverts, and the battery supplies the LED current', () => {
  const c = gateBoard('not', false);
  let s = simulate(c);
  assert.equal(s.comps.G1.out, true);
  assert.ok(s.comps.D1.lit);
  near(s.comps.D1.i, 0.0135, 0.001);
  assert.ok(s.comps.BAT.i > s.comps.D1.i, 'battery supplies the LED and the pull-down');
  near(s.comps.G1.v, 8.65, 0.1);
  setSw(c, 'SA', true);
  s = simulate(c);
  assert.equal(s.comps.G1.out, false);
  assert.ok(!s.comps.D1.lit);
  near(s.comps.G1.v, 0, 0.01);
});

test('pull-down gives a low level, and a gate output drives an LED without a resistor into a burn', () => {
  const c = gateBoard('and');
  const s = simulate(c);
  near(voltageBetween(s, 'b4', 'p-12'), 0, 0.01);
  setSw(c, 'SA', true);
  near(voltageBetween(simulate(c), 'b4', 'p-12'), 9, 0.05);
  const d = gateBoard('not', false);
  getComp(d, 'R1').props.r = 0.01;
  const r = simulate(d);
  assert.ok(getComp(d, 'D1').burned);
  assert.equal(r.events[0].type, 'burn');
});

test('gate truth tables and evaluation', () => {
  assert.equal(truthTable('and').length, 4);
  assert.equal(truthTable('not').length, 2);
  assert.equal(gateEval('xor', [true, false]), true);
  assert.equal(gateEval('nor', [false, false]), true);
});
