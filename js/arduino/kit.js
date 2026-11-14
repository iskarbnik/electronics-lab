// The Arduino on the breadboard and the glue between a running sketch and the circuit simulator.
// The Uno plugs into the bottom half: pin k of UNO_PINS is hole j<UNO_COL0 + k>. Wire from any hole
// of that column (f to i) to your circuit.

import { newCircuit, addComp, getComp, simulate } from '../sim/circuit.js';
import { Sketch } from './interp.js';

export const UNO_PINS = ['5V', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
export const UNO_COL0 = 6;
export const unoHole = name => 'j' + (UNO_COL0 + UNO_PINS.indexOf(name));
export const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
export const PWM_PERIOD = 1 / 490;       // seconds, as on an Uno (pins 5 and 6 are 980 Hz on the real board)

// An Uno alone on the board, or the Uno with the starter kit already wired (3 LEDs, a button, a pot).
export function newLabCircuit(withKit = true) {
  const c = newCircuit();
  c.comps = c.comps.filter(x => x.id !== 'BAT');          // the Uno is powered over USB
  const add = (id, type, pins, props) => addComp(c, { id, type, pins, props });
  add('UNO', 'uno', UNO_PINS.map(unoHole), { names: [...UNO_PINS], io: {} });
  if (!withKit) return c;
  const jump = (name, to, color) => add('J' + name, 'wire', [unoHole(name).replace('j', 'i'), to], { color });
  jump('5V', 'p+6', 'red'); jump('GND', 'p-7', 'black');
  // D13: red LED L1 through R1
  jump('D13', 'a8', 'green');
  add('R1', 'resistor', ['c8', 'c10'], { r: 220 }); add('L1', 'led', ['d10', 'd11'], { color: 'red' }); add('W1', 'wire', ['a11', 'p-11'], { color: 'black' });
  // D8: yellow LED L2 through R2
  jump('D8', 'a13', 'blue');
  add('R2', 'resistor', ['c13', 'c15'], { r: 220 }); add('L2', 'led', ['d15', 'd16'], { color: 'yellow' }); add('W2', 'wire', ['a16', 'p-16'], { color: 'black' });
  // D9 (PWM): green LED L3 through R3
  jump('D9', 'a17', 'yellow');
  add('R3', 'resistor', ['c17', 'c19'], { r: 220 }); add('L3', 'led', ['d19', 'd20'], { color: 'green' }); add('W3', 'wire', ['a20', 'p-20'], { color: 'black' });
  // D2: push button to ground (use INPUT_PULLUP)
  jump('D2', 'a22', 'orange');
  add('S1', 'button', ['c22', 'd24'], {}); add('W4', 'wire', ['a24', 'p-24'], { color: 'black' });
  // A0: potentiometer between 5 V and ground
  jump('A0', 'a27', 'purple');
  add('P1', 'pot', ['e26', 'e27', 'e28'], { r: 10000, pos: 0.5 });
  add('W5', 'wire', ['a26', 'p+26'], { color: 'red' }); add('W6', 'wire', ['a28', 'p-28'], { color: 'black' });
  return c;
}
export const newKit = () => newLabCircuit(true);

export const pinName = n => (Number.isInteger(n) && n >= 0 && n <= 13 ? 'D' + n : Number.isInteger(n) && n >= 14 && n <= 19 ? 'A' + (n - 14) : null);

const MIX = ['v', 'i', 'p', 'brightness', 'charge'];
const emptyAcc = s => {
  const acc = { ...s, comps: {}, events: [] };
  for (const [id, r] of Object.entries(s.comps)) {
    acc.comps[id] = { ...r };
    for (const f of MIX) if (f in r) acc.comps[id][f] = 0;
    if (r.pins) acc.comps[id].pins = Object.fromEntries(Object.entries(r.pins).map(([k, v]) => [k, { ...v, v: 0, i: 0, over: false }]));
  }
  return acc;
};
function addInto(acc, s, w) {
  for (const [id, r] of Object.entries(s.comps)) {
    const a = acc.comps[id];
    if (!a) continue;
    for (const f of MIX) if (f in r) a[f] += w * r[f];
    if (r.pins) for (const [k, v] of Object.entries(r.pins)) { a.pins[k].v += w * v.v; a.pins[k].i += w * v.i; a.pins[k].over ||= !!v.over; }
  }
  acc.events.push(...s.events);
}

// Owns the circuit while a sketch runs. The sketch talks to it through host().
export class KitBoard {
  constructor(circuit = newKit()) {
    this.circuit = circuit;
    this.uno = getComp(circuit, 'UNO');
    this.dirty = true;
    this.sim = null;
    this.clock = 0;          // sketch clock in ms
    this.time = 0;           // simulated seconds (drives PWM phase and capacitors)
    this.out = '';
    this.inbuf = '';
    this.stats = this.freshStats();
    this.refresh();
  }

  freshStats() { return { toggles: {}, wasLit: {}, litWhilePressed: false, darkWhileReleased: false, analog: new Set(), brightness: new Set(), ms: 0 }; }
  get hasCap() { return this.circuit.comps.some(c => c.type === 'capacitor'); }
  io(name) { return (this.uno.props.io[name] ||= { mode: 0, level: 0, duty: null }); }
  send(text) { this.inbuf += text; }

  // A fresh start for a sketch: pins back to inputs, serial and stats cleared.
  resetPins() {
    this.uno.props.io = {};
    this.out = ''; this.inbuf = ''; this.time = 0; this.stats = this.freshStats();
    this.dirty = true; this.refresh();
  }

  // Everything back to start: also capacitors emptied and burnt LEDs replaced.
  reset() {
    for (const c of this.circuit.comps) { if (c.type === 'led') c.burned = false; if (c.type === 'capacitor') c.props.vc = 0; }
    this.resetPins();
  }

  pwmPins() { const io = this.uno.props.io; return Object.keys(io).filter(n => io[n].mode === 1 && io[n].duty != null); }

  // Present state. Without capacitors, PWM is exact: the average of the high and low circuits weighted by duty.
  refresh() {
    const io = this.uno.props.io, pwm = this.pwmPins().slice(0, 4);
    this.dirty = false;
    if (!pwm.length) { this.sim = simulate(this.circuit); return this.sim; }
    const saved = pwm.map(n => io[n].level);
    let acc = null;
    for (let mask = 0; mask < 1 << pwm.length; mask++) {
      let w = 1;
      pwm.forEach((n, k) => { const hi = (mask >> k) & 1; io[n].level = hi ? 5 : 0; w *= hi ? io[n].duty : 1 - io[n].duty; });
      if (w < 1e-9) continue;
      const s = simulate(this.circuit);
      acc ||= emptyAcc(s);
      addInto(acc, s, w);
    }
    pwm.forEach((n, k) => { io[n].level = saved[k]; });
    this.markLit(acc);
    return (this.sim = acc);
  }

  markLit(acc) { for (const c of this.circuit.comps) if (c.type === 'led') { const r = acc.comps[c.id]; r.lit = r.i > 3e-4; } }

  // Real time passes: capacitors charge and PWM pins switch at 490 Hz. Results are averaged over the step.
  timeStep(dt) {
    const io = this.uno.props.io, pwm = this.pwmPins();
    const N = pwm.length ? 32 : 1, sub = dt / N, saved = pwm.map(n => io[n].level);
    let acc = null;
    for (let k = 0; k < N; k++) {
      const t = this.time + (k + 0.5) * sub;
      pwm.forEach(n => { io[n].level = ((t / PWM_PERIOD) % 1) < io[n].duty ? 5 : 0; });
      const s = simulate(this.circuit, { dt: sub, advance: true });
      acc ||= emptyAcc(s);
      addInto(acc, s, 1 / N);
    }
    pwm.forEach((n, k) => { io[n].level = saved[k]; });
    this.time += dt;
    this.markLit(acc);
    this.dirty = false;
    return (this.sim = acc);
  }

  // One screen frame.
  advance(dt) { return this.timeStep(Math.min(0.05, Math.max(0.001, dt))); }

  // Counts for the guided lessons: LED changes, whether the LED follows the button, values the sketch read.
  observe(dtMs) {
    const st = this.stats, sim = this.sim;
    st.ms += dtMs;
    for (const c of this.circuit.comps) if (c.type === 'led') {
      const lit = !!sim.comps[c.id].lit;
      if (st.wasLit[c.id] !== undefined && st.wasLit[c.id] !== lit) st.toggles[c.id] = (st.toggles[c.id] || 0) + 1;
      st.wasLit[c.id] = lit;
      const b = sim.comps[c.id].brightness; if (b > 0.04 && b < 0.9) st.brightness.add(c.id);
    }
    const btn = getComp(this.circuit, 'S1'), l2 = sim.comps.L2;
    if (btn && l2) { if (btn.props.pressed && l2.lit) st.litWhilePressed = true; if (!btn.props.pressed && !l2.lit && st.litWhilePressed) st.darkWhileReleased = true; }
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
        if (!PWM_PINS.has(n)) { p.duty = null; p.level = v >= 128 ? 5 : 0; }      // only ~ pins have PWM, the others just go high or low
        else { p.duty = v <= 0 || v >= 255 ? null : v / 255; p.level = v <= 0 ? 0 : 5; }
        self.dirty = true;
      },
      digitalRead(n) { const name = pinName(n); return name && self.read(name).v > 2.5 ? 1 : 0; },
      analogRead(n) { const name = pinName(n); const v = name ? Math.max(0, Math.min(1023, Math.round(self.read(name).v / 5 * 1023))) : 0; self.stats.analog.add(v); return v; },
      print(s) { self.out += s; },
      now() { return self.clock; },
      available() { return self.inbuf.length; },
      readChar() { if (!self.inbuf) return -1; const c = self.inbuf.charCodeAt(0); self.inbuf = self.inbuf.slice(1); return c; },
      peekChar() { return self.inbuf ? self.inbuf.charCodeAt(0) : -1; },
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
