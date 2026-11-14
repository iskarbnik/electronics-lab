import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../js/arduino/parser.js';
import { Sketch } from '../js/arduino/interp.js';
import { KitBoard, Runner, newKit } from '../js/arduino/kit.js';
import { getComp } from '../js/sim/circuit.js';

// Runs a sketch against a stub host for `ms` of virtual time and returns what it printed and the pin writes.
function run(src, { ms = 5000, reads = {} } = {}) {
  const log = [];
  let now = 0, out = '';
  const host = {
    pinMode: (n, m) => log.push(`m${n}:${m}`), digitalWrite: (n, v) => log.push(`w${n}:${v}@${now}`),
    digitalRead: n => reads[n] ?? 0, analogRead: n => reads[n] ?? 0, analogWrite: (n, v) => log.push(`a${n}:${v}`),
    print: s => { out += s; }, now: () => now,
  };
  const gen = new Sketch(src, host).start();
  let wake = 0;
  for (let guard = 0; guard < 100000 && now <= ms; guard++) {
    if (now < wake) { now = wake; continue; }
    const r = gen.next();
    if (r.done) break;
    if (r.value.delay !== undefined) wake = now + r.value.delay;
  }
  return { out, log };
}

test('Blink writes alternate levels every delay', () => {
  const { log } = run('void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW); delay(1000); }', { ms: 3500 });
  assert.deepEqual(log.slice(0, 5), ['m13:1', 'w13:1@0', 'w13:0@1000', 'w13:1@2000', 'w13:0@3000']);
});

test('Uno integer sizes and integer versus float division', () => {
  const { out } = run(`int a = 30000; byte b = 250; long c = 100000; float f = 7 / 2;
    void setup(){ a = a + 10000; b += 10; Serial.println(a); Serial.println(b); Serial.println(c * 3); Serial.println(f); Serial.println(7 / 2.0); Serial.println(-7 / 2); Serial.println(-7 % 3); }
    void loop(){ while (1) { delay(1000); } }`);
  assert.equal(out, '-25536\n4\n300000\n3.00\n3.50\n-3\n-1\n');
});

test('control flow, arrays, functions, switch, defines, strings', () => {
  const { out } = run(`#define N 4
    int sq(int x) { return x * x; }
    int pins[N] = {2, 3, 5, 7};
    void setup() {
      int sum = 0;
      for (int i = 0; i < N; i++) { if (i == 2) continue; sum += sq(pins[i]); }
      Serial.println(sum);
      int k = 0; do { k += 3; } while (k < 10); Serial.println(k);
      switch (k) { case 12: Serial.print("twelve"); case 13: Serial.println("!"); break; default: Serial.println("no"); }
      Serial.println(String("n=") + N + (k > 5 ? "y" : "n"));
      Serial.println(map(512, 0, 1023, 0, 255)); Serial.println(constrain(300, 0, 255)); Serial.println(255, HEX);
    }
    void loop() { delay(1000); }`);
  assert.equal(out, '62\n12\ntwelve!\nn=4y\n127\n255\nFF\n');
});

test('syntax and runtime errors carry a code and a line', () => {
  assert.throws(() => parse('void setup() { int x = ; } void loop() {}'), e => e.code === 'unexpected' && e.line === 1);
  assert.throws(() => parse('void setup() {}'), e => e.code === 'noloop');
  assert.throws(() => parse('void loop() {} void setup() { x = 1 }'), e => e.code === 'expected');
  const g = new Sketch('void setup() {\n y = 2;\n}\nvoid loop() {}', run.host || { now: () => 0 }).start();
  assert.throws(() => g.next(), e => e.code === 'undef' && e.line === 2 && e.name === 'y');
  const h = new Sketch('int a[2]; void setup() { a[5] = 1; } void loop() {}', { now: () => 0 }).start();
  assert.throws(() => h.next(), e => e.code === 'index');
});

test('a busy loop without delay yields control instead of hanging', () => {
  const g = new Sketch('void setup() { while (1) { } } void loop() {}', { now: () => 0 }).start();
  assert.ok(g.next().value.tick);
});

function kitRun(src, ms, { before } = {}) {
  const board = new KitBoard();
  before?.(board);
  const r = new Runner(src, board);
  const lit = [];
  for (let t = 0; t <= ms; t += 20) { r.step(t); if (board.dirty) board.refresh(); lit.push({ t, ...Object.fromEntries(['L1', 'L2', 'L3'].map(id => [id, board.sim.comps[id].lit])) }); }
  return { board, r, lit };
}

test('kit: Blink lights L1 alternately with a safe current', () => {
  const { lit, r, board } = kitRun('void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(500); digitalWrite(13, LOW); delay(500); }', 2000);
  assert.equal(r.error, null);
  assert.equal(lit.find(x => x.t === 260).L1, true);
  assert.equal(lit.find(x => x.t === 760).L1, false);
  assert.equal(lit.find(x => x.t === 1260).L1, true);
  assert.equal(lit.find(x => x.t === 260).L2, false);
  assert.equal(board.sim.comps.UNO.pins.D13.over, false);
});

test('kit: too small a resistor overloads the pin, and a dead short burns the LED', () => {
  const k = newKit();
  const kit = new KitBoard(k);
  getComp(k, 'R1').props.r = 30;
  kit.host().pinMode(13, 1); kit.host().digitalWrite(13, 1);
  assert.ok(kit.refresh().comps.UNO.pins.D13.over, 'pin above 40 mA');
  getComp(k, 'R1').props.r = 1;
  const s = kit.refresh();
  assert.ok(getComp(k, 'L1').burned, 'LED burned');
  assert.equal(s.events.length, 1);
});

test('kit: button on D2 with INPUT_PULLUP reads LOW only while pressed', () => {
  const src = 'void setup(){ pinMode(2, INPUT_PULLUP); pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, !digitalRead(2)); }';
  const idle = kitRun(src, 200);
  assert.equal(idle.lit.at(-1).L1, false);
  const pressed = kitRun(src, 200, { before: b => { getComp(b.circuit, 'S1').props.pressed = true; b.dirty = true; } });
  assert.equal(pressed.lit.at(-1).L1, true);
});

test('kit: potentiometer on A0 reads 0 to 1023 and prints', () => {
  const src = 'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(100); }';
  const mid = kitRun(src, 150);
  assert.match(mid.board.out, /^51[01]\n/);
  const top = kitRun(src, 150, { before: b => { getComp(b.circuit, 'P1').props.pos = 0; b.dirty = true; } });
  assert.ok(+top.board.out.split('\n')[0] >= 1020 || +top.board.out.split('\n')[0] <= 3, top.board.out);
});

test('kit: analogWrite dims the LED by duty cycle', () => {
  const src = 'void setup(){ analogWrite(9, 64); } void loop(){ delay(1000); }';
  const quarter = kitRun(src, 100).board.sim.comps.L3.brightness;
  const full = kitRun('void setup(){ analogWrite(9, 255); } void loop(){ delay(1000); }', 100).board.sim.comps.L3.brightness;
  assert.ok(quarter > 0.05 && quarter < full * 0.4, `${quarter} vs ${full}`);
});

test('kit: runtime errors stop the sketch with a code', () => {
  const { r } = kitRun('void setup(){ nope(1); } void loop(){}', 100);
  assert.equal(r.error.code, 'undefFn');
  assert.equal(r.error.name, 'nope');
});

import { ARDUINO_LESSONS } from '../js/arduino/lessons.js';
import { newLabCircuit, unoHole } from '../js/arduino/kit.js';
import { addComp } from '../js/sim/circuit.js';

test('serial input: available, read, parseInt, readStringUntil, and chars print as characters', () => {
  const board = new KitBoard();
  const r = new Runner(`char c; int n; String s;
    void setup() { Serial.begin(9600); }
    void loop() {
      if (Serial.available() > 0) {
        c = Serial.read(); Serial.print(c); Serial.print(c + 1); Serial.print(' '); Serial.print((int)c);
        n = Serial.parseInt(); Serial.print(" n="); Serial.print(n);
        s = Serial.readStringUntil('\\n'); Serial.print(" s="); Serial.println(s);
      }
    }`, board);
  board.send('a42xyz\n');
  for (let t = 0; t < 200; t += 20) r.step(t);
  assert.equal(r.error, null);
  assert.equal(board.out, 'a98 97 n=42 s=xyz\n');
  assert.equal(board.inbuf, '');
  // nothing to read: read() is -1 and parseInt() is 0
  const b2 = new KitBoard();
  const r2 = new Runner('void setup() { Serial.println(Serial.read()); Serial.println(Serial.available()); Serial.println(Serial.parseInt()); } void loop() { delay(1000); }', b2);
  r2.step(0);
  assert.equal(b2.out, '-1\n0\n0\n');
});

test('PWM through an RC filter gives the average voltage; without a capacitor the LED gets the duty-weighted current', () => {
  const c = newLabCircuit(false);
  const add = (id, type, pins, props) => addComp(c, { id, type, pins, props });
  add('J', 'wire', ['i12', 'a5'], {});          // D9 is on column 12
  add('R1', 'resistor', ['c5', 'c8'], { r: 1000 });
  add('C1', 'capacitor', ['d8', 'd9'], { c: 0.0001 });   // tau = 0.1 s
  add('G', 'wire', ['a9', 'p-9'], {}); add('G2', 'wire', ['i7', 'p-6'], {});
  const board = new KitBoard(c);
  const r = new Runner('void setup(){ analogWrite(9, 128); } void loop(){ delay(1000); }', board);
  r.step(0);
  for (let k = 0; k < 120; k++) board.advance(1 / 60);       // 2 s, 20 time constants
  near(board.sim.comps.C1.v, 5 * 128 / 255, 0.2);
  function near(a, b, tol) { assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`); }
  // the real board: green LED L3 brightness scales with duty
  const k1 = kitRun('void setup(){ analogWrite(9, 255); } void loop(){ delay(1000); }', 60).board.sim.comps.L3.brightness;
  const k2 = kitRun('void setup(){ analogWrite(9, 64); } void loop(){ delay(1000); }', 60).board.sim.comps.L3.brightness;
  near(k2 / k1, 64 / 255, 0.08);
});

test('pins without PWM only go high or low on analogWrite', () => {
  const { board } = kitRun('void setup(){ analogWrite(8, 200); } void loop(){ delay(1000); }', 60);
  assert.equal(board.sim.comps.L2.lit, true);
  const low = kitRun('void setup(){ analogWrite(8, 100); } void loop(){ delay(1000); }', 60).board;
  assert.equal(low.sim.comps.L2.lit, false);
});

test('Uno pins are on the bottom header and the bare Uno has nothing else', () => {
  const c = newLabCircuit(false);
  assert.deepEqual(c.comps.map(x => x.id), ['UNO']);
  assert.equal(unoHole('5V'), 'j6');
  assert.equal(unoHole('A5'), 'j25');
});

test('guided Arduino lessons are well formed and can be completed', () => {
  const isT = x => x && x.he?.trim() && x.en?.trim();
  assert.ok(ARDUINO_LESSONS.length >= 6);
  assert.equal(new Set(ARDUINO_LESSONS.map(l => l.id)).size, ARDUINO_LESSONS.length);
  for (const lesson of ARDUINO_LESSONS) {
    assert.ok(isT(lesson.title) && isT(lesson.summary), lesson.id);
    const board = new KitBoard(lesson.circuit === 'empty' ? newLabCircuit(false) : newKit());
    let code = '';
    const ctxFor = runner => ({ board, runner, code, out: board.out, running: !!runner && !runner.error && !runner.finished, stats: board.stats });
    lesson.steps.forEach((s, i) => {
      const label = `${lesson.id} step ${i}`;
      assert.ok(isT(s.text), label);
      for (const x of [s.text, s.why, ...(s.options || []), ...(s.code ? [s.code] : [])].filter(Boolean)) assert.ok(!/[—–]/.test(x.he + x.en), `${label} has a dash`);
      if (s.type === 'quiz') { assert.ok(s.answer >= 0 && s.answer < s.options.length && isT(s.why), label); s.options.forEach(o => assert.ok(isT(o), label)); }
      if (s.type === 'build') { s.demo(board); assert.ok(s.goal(ctxFor(null)), label + ' build goal'); }
      if (s.type === 'code') {
        if (s.code) { assert.ok(isT(s.code), label); code = s.code.en; }
        const api = { setCode: v => { code = v; }, code: () => code };
        board.resetPins();
        s.demo?.(board, 0, api);
        const runner = new Runner(code, board);
        assert.equal(s.goal(ctxFor(runner)), false, label + ' goal already true at start');
        let ok = false;
        for (let t = 0; t <= 8000 && !ok; t += 20) {
          if (t > 0) s.demo?.(board, t, api);
          runner.step(t);
          assert.equal(runner.error, null, label);
          if (board.dirty) board.refresh();
          board.observe(20);
          ok = !!s.goal(ctxFor(runner));
        }
        assert.ok(ok, label + ' goal never reached');
      }
    });
  }
});

test('a fast sketch keeps real time across frames and the scope sees every edge', () => {
  const b = new KitBoard();
  b.scope = { pins: ['D13', ''], t: [], a: [], b: [] };
  const r = new Runner('void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(5); digitalWrite(13, LOW); delay(5); }', b);
  for (let f = 1; f <= 10; f++) { r.step(f * 16); b.advance(0.016); }
  const edges = b.scope.a.reduce((n, v, k) => n + (k && (v > 1) !== (b.scope.a[k - 1] > 1) ? 1 : 0), 0);
  assert.ok(edges >= 28 && edges <= 34, `edges ${edges}`);               // 160 ms / 5 ms = 32
  const high = b.scope.a.filter(v => v > 1).length / b.scope.a.length;
  assert.ok(high > 0.4 && high < 0.56, `duty ${high}`);
});
