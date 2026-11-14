// The Arduino kit on the breadboard: an Uno wired to three LEDs, a button and a potentiometer, plus the
// glue between a running sketch and the circuit simulator.

import { newCircuit, addComp, getComp, simulate } from '../sim/circuit.js';
import { Sketch } from './interp.js';

// Uno pins and the breadboard hole each one is plugged into (row a of the top half).
export const KIT_PINS = [['5V', 'a2'], ['GND', 'a4'], ['D13', 'a7'], ['D8', 'a13'], ['D9', 'a19'], ['D2', 'a24'], ['A0', 'a28']];

export function newKit() {
  const c = newCircuit();
  c.comps = c.comps.filter(x => x.id !== 'BAT');          // the Uno is powered over USB
  const add = (id, type, pins, props) => addComp(c, { id, type, pins, props });
  add('UNO', 'uno', KIT_PINS.map(p => p[1]), { names: KIT_PINS.map(p => p[0]), io: {} });
  add('WV', 'wire', ['b2', 'p+2'], { color: 'red' });
  add('WG', 'wire', ['b4', 'p-4'], { color: 'black' });
  // D13: LED L1 through R1
  add('R1', 'resistor', ['c7', 'c9'], { r: 220 });
  add('L1', 'led', ['d9', 'd10'], { color: 'red' });
  add('W1', 'wire', ['a10', 'p-10'], { color: 'black' });
  // D8: LED L2 through R2
  add('R2', 'resistor', ['c13', 'c15'], { r: 220 });
  add('L2', 'led', ['d15', 'd16'], { color: 'yellow' });
  add('W2', 'wire', ['a16', 'p-16'], { color: 'black' });
  // D9 (PWM): LED L3 through R3
  add('R3', 'resistor', ['c19', 'c21'], { r: 220 });
  add('L3', 'led', ['d21', 'd22'], { color: 'green' });
  add('W3', 'wire', ['a22', 'p-22'], { color: 'black' });
  // D2: push button to ground (use INPUT_PULLUP)
  add('S1', 'button', ['c24', 'd26'], {});
  add('W4', 'wire', ['a26', 'p-26'], { color: 'black' });
  // A0: potentiometer between 5 V and ground
  add('P1', 'pot', ['e27', 'e28', 'e29'], { r: 10000, pos: 0.5 });
  add('W5', 'wire', ['a27', 'p+27'], { color: 'red' });
  add('W6', 'wire', ['a29', 'p-29'], { color: 'black' });
  return c;
}

export const pinName = n => (Number.isInteger(n) && n >= 0 && n <= 13 ? 'D' + n : Number.isInteger(n) && n >= 14 && n <= 19 ? 'A' + (n - 14) : null);

const MIX = ['v', 'i', 'p', 'brightness', 'charge'];

// Owns the circuit while a sketch runs. The sketch talks to it through the host methods below.
export class KitBoard {
  constructor(circuit = newKit()) {
    this.circuit = circuit;
    this.uno = getComp(circuit, 'UNO');
    this.dirty = true;
    this.sim = null;
    this.t0 = 0;
    this.clock = 0;
    this.out = '';
    this.refresh();
  }

  io(name) { return (this.uno.props.io[name] ||= { mode: 0, level: 0, duty: null }); }

  reset() { this.uno.props.io = {}; this.dirty = true; this.out = ''; this.refresh(); }

  // Runs the simulator; pins driven by analogWrite are blended between their high and low states by duty.
  refresh() {
    const io = this.uno.props.io;
    const pwm = Object.keys(io).filter(n => io[n].mode === 1 && io[n].duty != null).slice(0, 4);
    if (!pwm.length) { this.sim = simulate(this.circuit); this.dirty = false; return this.sim; }
    const saved = pwm.map(n => io[n].level);
    let acc = null;
    for (let mask = 0; mask < 1 << pwm.length; mask++) {
      let w = 1;
      pwm.forEach((n, k) => { const hi = (mask >> k) & 1; io[n].level = hi ? 5 : 0; w *= hi ? io[n].duty : 1 - io[n].duty; });
      if (w < 1e-9) continue;
      const s = simulate(this.circuit);
      if (!acc) { acc = { ...s, comps: {} }; for (const [id, r] of Object.entries(s.comps)) acc.comps[id] = { ...r, ...Object.fromEntries(MIX.filter(f => f in r).map(f => [f, 0])), pins: r.pins ? Object.fromEntries(Object.entries(r.pins).map(([k, v]) => [k, { ...v, v: 0, i: 0 }])) : undefined }; }
      for (const [id, r] of Object.entries(s.comps)) {
        const a = acc.comps[id];
        for (const f of MIX) if (f in r) a[f] += w * r[f];
        if (r.pins) for (const [k, v] of Object.entries(r.pins)) { a.pins[k].v += w * v.v; a.pins[k].i += w * v.i; a.pins[k].over ||= v.over; }
      }
    }
    pwm.forEach((n, k) => { io[n].level = saved[k]; });
    for (const c of this.circuit.comps) if (c.type === 'led') { const r = acc.comps[c.id]; r.lit = r.i > 3e-4; }
    this.sim = acc; this.dirty = false;
    return acc;
  }

  read(name) {
    if (this.dirty) this.refresh();
    return this.sim.comps.UNO.pins[name] || { v: 0, i: 0 };
  }

  // ----- host interface for the interpreter -----
  host() {
    const self = this;
    return {
      pinMode(n, mode) { const name = pinName(n); if (!name) return; const p = self.io(name); p.mode = mode; p.duty = null; p.level = 0; self.dirty = true; },
      digitalWrite(n, v) {
        const name = pinName(n); if (!name) return;
        const p = self.io(name); p.duty = null;
        if (p.mode === 1) p.level = v ? 5 : 0; else p.mode = v ? 2 : 0;   // writing HIGH to an input turns its pull-up on
        self.dirty = true;
      },
      analogWrite(n, v) {
        const name = pinName(n); if (!name) return;
        const p = self.io(name); p.mode = 1;
        p.duty = v <= 0 || v >= 255 ? null : v / 255; p.level = v >= 255 ? 5 : v <= 0 ? 0 : 5;
        self.dirty = true;
      },
      digitalRead(n) { const name = pinName(n); return name && self.read(name).v > 2.5 ? 1 : 0; },
      analogRead(n) { const name = pinName(n); return name ? Math.max(0, Math.min(1023, Math.round(self.read(name).v / 5 * 1023))) : 0; },
      print(s) { self.out += s; },
      now() { return self.clock; },
    };
  }
}

// Runs one sketch against a KitBoard in (virtual) time. Call step(nowMs) from a timer.
export class Runner {
  constructor(src, board) {
    this.board = board;
    this.sketch = new Sketch(src, board.host());      // throws on a syntax error
    this.gen = this.sketch.start();
    this.wake = 0;
    this.started = false;
    this.error = null;
    this.finished = false;
  }

  step(now) {
    if (this.error || this.finished) return;
    if (!this.started) { this.started = true; this.wake = now; }
    if (now < this.wake) return;
    this.board.clock = now;
    try {
      for (let guard = 0; guard < 200; guard++) {
        const r = this.gen.next();
        if (r.done) { this.finished = true; return; }
        if (r.value.delay !== undefined) {
          this.wake = this.wake + r.value.delay;
          if (now - this.wake > 100) this.wake = now;       // fell behind (a slow frame): do not catch up in a burst
          if (this.wake > now) return;
          continue;
        }
        return;                                             // tick: give the screen a turn
      }
    } catch (e) {
      if (e && e.code) this.error = { code: e.code, line: e.line, name: e.name === 'Error' ? '' : e.name };
      else throw e;
    }
  }
}
