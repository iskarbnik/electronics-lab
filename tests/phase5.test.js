import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../js/lessons/index.js';
import { ARDUINO_LESSONS, ESP32_LESSONS } from '../js/arduino/lessons.js';
import { buildBank, pick, shuffleOptions, percent } from '../js/quizbank.js';
import { BADGES, makeCtx, earned } from '../js/badges.js';
import { CHALLENGES } from '../js/challenges.js';
import { diagnose, answer, GLOSSARY } from '../js/tutor.js';
import { newCircuit, addComp, simulate, getComp } from '../js/sim/circuit.js';

const isT = x => x && x.he?.trim() && x.en?.trim();
const noDash = x => !/[—–]/.test(x.he + x.en);

test('quiz bank is built from every lesson quiz, and picking and shuffling keep answers right', () => {
  const bank = buildBank([LESSONS, ARDUINO_LESSONS, ESP32_LESSONS]);
  assert.ok(bank.length >= 40, `${bank.length} questions`);
  assert.equal(new Set(bank.map(q => q.id)).size, bank.length);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ten = pick(bank, 10, rand);
  assert.equal(ten.length, 10); assert.equal(new Set(ten.map(q => q.id)).size, 10);
  for (const q of bank.slice(0, 30)) {
    const sh = shuffleOptions(q, rand);
    assert.deepEqual(sh.options[sh.answer], q.options[q.answer]);
    assert.equal(sh.options.length, q.options.length);
  }
  assert.equal(percent(8, 10), 80); assert.equal(percent(0, 0), 0);
});

test('badges: unique, bilingual, and computed from progress', () => {
  assert.equal(new Set(BADGES.map(b => b.id)).size, BADGES.length);
  for (const b of BADGES) assert.ok(isT(b.title) && isT(b.desc) && noDash(b.title) && noDash(b.desc), b.id);
  const done = new Set(), ard = new Set(), flags = {};
  const ctx = () => makeCtx({ lessons: LESSONS, ardLessons: ARDUINO_LESSONS, espLessons: ESP32_LESSONS, challengeIds: CHALLENGES.map(c => c.id), isDone: id => done.has(id), ardDone: id => ard.has(id), getFlag: k => flags[k] ?? null });
  assert.equal(earned(ctx()).length, 0);
  LESSONS.slice(0, 5).forEach(l => done.add(l.id));
  assert.deepEqual(earned(ctx()).map(b => b.id), ['first', 'basics']);
  LESSONS.forEach(l => done.add(l.id)); flags.quizBest = 100; flags.sandbox = true;
  ARDUINO_LESSONS.forEach(l => ard.add(l.id)); ESP32_LESSONS.forEach(l => ard.add(l.id));
  CHALLENGES.forEach(c => { flags['ch:' + c.id] = true; });
  const ids = earned(ctx()).map(b => b.id);
  for (const id of ['unit1', 'logician', 'sketch', 'esp', 'champion', 'perfect', 'builder', 'quiz80']) assert.ok(ids.includes(id), id);
});

test('tutor: diagnoses common mistakes in both languages', () => {
  const base = () => { const c = newCircuit(9); addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'] }); addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'] }); return c; };
  const run = c => { const s = simulate(c); return diagnose(c, s); };
  assert.equal(diagnose(newCircuit(9), simulate(newCircuit(9)))[0].sev, 'info');
  // LED backwards
  let c = base();
  addComp(c, { id: 'W1', type: 'wire', pins: ['p+3', 'a3'] }); addComp(c, { id: 'R1', type: 'resistor', pins: ['c3', 'c6'], props: { r: 470 } });
  addComp(c, { id: 'D1', type: 'led', pins: ['d7', 'd6'] }); addComp(c, { id: 'W2', type: 'wire', pins: ['a7', 'p-7'] });
  let d = run(c);
  assert.ok(d.some(x => x.id === 'D1' && /wrong way/.test(x.text.en)), JSON.stringify(d));
  // fixed and fine
  getComp(c, 'D1').pins.reverse();
  assert.equal(run(c)[0].sev, 'ok');
  // no resistor: burns
  const b = base();
  addComp(b, { id: 'W1', type: 'wire', pins: ['p+3', 'a3'] }); addComp(b, { id: 'D1', type: 'led', pins: ['c3', 'c6'] }); addComp(b, { id: 'W2', type: 'wire', pins: ['a6', 'p-6'] });
  d = run(b);
  assert.ok(d.some(x => x.sev === 'warn' && /burned/.test(x.text.en)));
  // floating gate input
  const g = base();
  addComp(g, { id: 'G1', type: 'gate', pins: ['e8', 'e9', 'e10'], props: { fn: 'and' } });
  d = run(g);
  assert.equal(d.filter(x => /floats/.test(x.text.en)).length, 2);
  for (const x of d) assert.ok(isT(x.text) && noDash(x.text));
});

test('tutor: answers questions from the glossary and the parts list', () => {
  for (const e of GLOSSARY) assert.ok(isT(e.text) && noDash(e.text) && e.keys.length);
  assert.ok(answer('what is ohm law?')[0].en.includes('V = I × R'));
  assert.ok(answer('למה צריך נגד לנורית').length >= 1);
  assert.ok(answer('tell me about the transistor')[0].en.toLowerCase().includes('transistor'));
  assert.deepEqual(answer('zzzz qqqq'), []);
});

test('challenges: bilingual, unique, start circuits simulate, and none is solved by doing nothing', () => {
  assert.equal(new Set(CHALLENGES.map(c => c.id)).size, CHALLENGES.length);
  for (const ch of CHALLENGES) {
    for (const k of ['title', 'text', 'hint']) assert.ok(isT(ch[k]) && noDash(ch[k]), `${ch.id}.${k}`);
    const start = ch.start();
    simulate(start);
    const r = ch.check(start);
    assert.equal(r.ok, false, `${ch.id} is already solved at the start`);
    assert.ok(isT(r.note), ch.id);
  }
});

function build(circuit, parts) { for (const [id, type, pins, props] of parts) addComp(circuit, { id, type, pins, props }); return circuit; }
const byId = id => CHALLENGES.find(c => c.id === id);

test('challenges: reference solutions pass', () => {
  // c01
  assert.ok(byId('c01').check(build(byId('c01').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 470 }], ['D1', 'led', ['d6', 'd7']], ['W2', 'wire', ['a7', 'p-7']]])).ok);
  // c02 series pair
  assert.ok(byId('c02').check(build(byId('c02').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 330 }], ['D1', 'led', ['d6', 'd7']], ['D2', 'led', ['c7', 'c8']], ['W2', 'wire', ['a8', 'p-8']]])).ok);
  // c03 divider 6k + 3k
  assert.ok(byId('c03').check(build(byId('c03').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 2000 }], ['R2', 'resistor', ['b6', 'b9'], { r: 1000 }], ['W2', 'wire', ['a9', 'p-9']]])).ok);
  // c04 transistor switch
  assert.ok(byId('c04').check(build(byId('c04').start(), [
    ['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['b3', 'b6'], { r: 470 }], ['D1', 'led', ['a6', 'a8']], ['Q1', 'transistor', ['e8', 'e9', 'e10']], ['W2', 'wire', ['a10', 'p-10']],
    ['R2', 'resistor', ['b9', 'b13'], { r: 10000 }], ['S1', 'button', ['c13', 'd15']], ['W3', 'wire', ['p+15', 'a15']]])).ok);
  // c05 RC: 1k and 2200 uF
  assert.ok(byId('c05').check(build(byId('c05').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 1000 }], ['C1', 'capacitor', ['d6', 'd7'], { c: 0.0022 }], ['W2', 'wire', ['a7', 'p-7']]])).ok);
  // c05 too fast
  assert.equal(byId('c05').check(build(byId('c05').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 100 }], ['C1', 'capacitor', ['d6', 'd7'], { c: 0.0001 }], ['W2', 'wire', ['a7', 'p-7']]])).ok, false);
  // c06 / c07 / c08 / c09
  const gate = fn => build(byId(fn === 'xor' ? 'c07' : 'c06').start(), [['G1', 'gate', ['e12', 'e13', 'e14'], { fn }]]);
  assert.ok(byId('c06').check(gate('and')).ok); assert.equal(byId('c06').check(gate('or')).ok, false);
  assert.ok(byId('c07').check(gate('xor')).ok);
  assert.ok(byId('c08').check(build(byId('c08').start(), [['G1', 'gate', ['e8', 'e9', 'e10'], { fn: 'nor' }], ['G2', 'gate', ['e14', 'e15', 'e16'], { fn: 'nor' }], ['W7', 'wire', ['a10', 'a15']], ['W8', 'wire', ['b16', 'b9']]])).ok);
  assert.equal(byId('c08').check(build(byId('c08').start(), [['G1', 'gate', ['e8', 'e9', 'e10'], { fn: 'nor' }], ['G2', 'gate', ['e14', 'e15', 'e16'], { fn: 'nor' }]])).ok, false);
  assert.ok(byId('c09').check(build(byId('c09').start(), [['W1', 'wire', ['p+3', 'a3']], ['R1', 'resistor', ['c3', 'c6'], { r: 560 }], ['D1', 'led', ['d6', 'd7']], ['W2', 'wire', ['a7', 'p-7']]])).ok);
});
