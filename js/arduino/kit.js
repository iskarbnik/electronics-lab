// The Arduino on the breadboard and the glue between a running sketch and the circuit simulator.
// The Uno plugs into the bottom half: pin k of UNO_PINS is hole j<UNO_COL0 + k>. Wire from any hole
// of that column (f to i) to your circuit.

import { newCircuit, addComp, getComp, simulate } from '../sim/circuit.js';
import { Sketch } from './interp.js';

export const UNO_PINS = ['5V', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
export const ESP_PINS = ['3V3', 'GND', 'G2', 'G4', 'G5', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G21', 'G22', 'G23', 'G25', 'G26', 'G27', 'G32', 'G33', 'G34', 'G35'];
export const UNO_COL0 = 6;
export const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
export const PWM_PERIOD = 1 / 490;       // seconds, as on an Uno (pins 5 and 6 are 980 Hz on the real board)

// Board profiles. pinName maps a sketch pin number to a pin name on the board (or null).
export const BOARDS = {
  uno: {
    id: 'uno', names: UNO_PINS, supply: '5V', vcc: 5, adcBits: 10, defaultPwm: 1 / 490,
    pinName: n => (Number.isInteger(n) && n >= 0 && n <= 13 ? 'D' + n : Number.isInteger(n) && n >= 14 && n <= 19 ? 'A' + (n - 14) : null),
    hasPwm: n => PWM_PINS.has(n), consts: { LED_BUILTIN: 13 },
  },
  esp32: {
    id: 'esp32', names: ESP_PINS, supply: '3V3', vcc: 3.3, adcBits: 12, defaultPwm: 1 / 5000,
    pinName: n => (Number.isInteger(n) && ESP_PINS.includes('G' + n) ? 'G' + n : null),
    hasPwm: () => true, consts: { LED_BUILTIN: 2 },
  },
};
export const unoHole = (name, board = 'uno') => 'j' + (UNO_COL0 + BOARDS[board].names.indexOf(name));

// A board alone on the breadboard, or with the starter kit already wired (3 LEDs, a button, a pot).
// Kit pins: Uno D13, D8, D9 (PWM), D2, A0 / ESP32 GPIO 18, 19, 21, 4, 34.
export function newLabCircuit(withKit = true, board = 'uno') {
  const prof = BOARDS[board];
  const c = newCircuit();
  c.comps = c.comps.filter(x => x.id !== 'BAT');          // the board is powered over USB
  const add = (id, type, pins, props) => addComp(c, { id, type, pins, props });
  add('UNO', 'uno', prof.names.map(n => unoHole(n, board)), { names: [...prof.names], io: {}, board, supply: prof.supply, vcc: prof.vcc });
  if (!withKit) return c;
  const pins = board === 'esp32' ? { led1: 'G18', led2: 'G19', led3: 'G21', btn: 'G4', pot: 'G34' } : { led1: 'D13', led2: 'D8', led3: 'D9', btn: 'D2', pot: 'A0' };
  const rr = board === 'esp32' ? 100 : 220;
  const jump = (name, to, color) => add('J' + name, 'wire', [unoHole(name, board).replace('j', 'i'), to], { color });
  jump(prof.supply, 'p+6', 'red'); jump('GND', 'p-7', 'black');
  jump(pins.led1, 'a8', 'green');
  add('R1', 'resistor', ['c8', 'c10'], { r: rr }); add('L1', 'led', ['d10', 'd11'], { color: 'red' }); add('W1', 'wire', ['a11', 'p-11'], { color: 'black' });
  jump(pins.led2, 'a13', 'blue');
  add('R2', 'resistor', ['c13', 'c15'], { r: rr }); add('L2', 'led', ['d15', 'd16'], { color: 'yellow' }); add('W2', 'wire', ['a16', 'p-16'], { color: 'black' });
  jump(pins.led3, 'a17', 'yellow');
  add('R3', 'resistor', ['c17', 'c19'], { r: rr }); add('L3', 'led', ['d19', 'd20'], { color: 'green' }); add('W3', 'wire', ['a20', 'p-20'], { color: 'black' });
  jump(pins.btn, 'a22', 'orange');
  add('S1', 'button', ['c22', 'd24'], {}); add('W4', 'wire', ['a24', 'p-24'], { color: 'black' });
  jump(pins.pot, 'a27', 'purple');
  add('P1', 'pot', ['e26', 'e27', 'e28'], { r: 10000, pos: 0.5 });
  add('W5', 'wire', ['a26', 'p+26'], { color: 'red' }); add('W6', 'wire', ['a28', 'p-28'], { color: 'black' });
  return c;
}
export const newKit = (board = 'uno') => newLabCircuit(true, board);
export const pinName = n => BOARDS.uno.pinName(n);

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
    this.prof = BOARDS[this.uno.props.board || 'uno'];
    this.vcc = this.uno.props.vcc ?? 5;
    this.adcBits = this.prof.adcBits;
    this.ledcBits = {};
    this.dirty = true;
    this.sim = null;
    this.clock = 0;          // sketch clock in ms
    this.time = 0;           // simulated seconds (drives PWM phase and capacitors)
    this.out = '';
    this.inbuf = '';
    this.stats = this.freshStats();
    this.startIo = {};
    this.frameStart = {};
    this.log = [];           // pin changes this frame: { at (sketch ms), name, state }, replayed across sub-steps
    this.lastClock = 0;
    this.scope = null;      // set to { pins: [name, name], t: [], a: [], b: [] } to record pin voltages
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
    this.lastClock = 0; this.clock = 0; this.frameEnd = 0; this.log = []; this.startIo = {}; this.frameStart = {};
    if (this.scope) { this.scope.t.length = 0; this.scope.a.length = 0; this.scope.b.length = 0; }
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
      pwm.forEach((n, k) => { const hi = (mask >> k) & 1; io[n].level = hi ? this.vcc : 0; w *= hi ? io[n].duty : 1 - io[n].duty; });
      if (w < 1e-9) continue;
      const s = simulate(this.circuit);
      acc ||= emptyAcc(s);
      addInto(acc, s, w);
    }
    pwm.forEach((n, k) => { io[n].level = saved[k]; });
    this.markLit(acc);
    return (this.sim = acc);
  }

  // Scope samples: pin voltage against simulated time, newest last, 10 s at most.
  record(t, s) {
    const sc = this.scope, pins = s.comps.UNO.pins;
    sc.t.push(t); sc.a.push(sc.pins[0] ? pins[sc.pins[0]]?.v ?? 0 : null); sc.b.push(sc.pins[1] ? pins[sc.pins[1]]?.v ?? 0 : null);
    while (sc.t.length > 1 && t - sc.t[0] > 10) { sc.t.shift(); sc.a.shift(); sc.b.shift(); }
  }

  markLit(acc) { for (const c of this.circuit.comps) if (c.type === 'led') { const r = acc.comps[c.id]; r.lit = r.i > 3e-4; } }

  // Real time passes: capacitors charge and PWM pins switch at 490 Hz. Results are averaged over the step.
  timeStep(dt) {
    const io = this.uno.props.io, log = this.log.splice(0);
    const pwmNow = this.pwmPins();
    const N = log.length || this.scope ? 64 : pwmNow.length ? 32 : 1;
    const sub = dt / N, final = JSON.parse(JSON.stringify(io));
    // start of the frame: pins as they were before this frame's changes
    for (const e of log) if (!(e.name in this.startIo)) this.startIo[e.name] = this.frameStart[e.name] ?? { mode: 0, level: 0, duty: null };
    for (const name of Object.keys(this.startIo)) io[name] = { ...this.startIo[name] };
    const t0 = this.lastClock, t1 = this.frameEnd ?? this.clock, span = Math.max(1e-6, t1 - t0);
    let acc = null, next = 0;
    for (let k = 0; k < N; k++) {
      const t = this.time + (k + 0.5) * sub;
      while (next < log.length && ((log[next].at - t0) / span) <= (k + 0.5) / N + 1e-9) { io[log[next].name] = { ...log[next].state }; next++; }
      const pwm = this.pwmPins(), saved = pwm.map(n => io[n].level);
      pwm.forEach(n => { io[n].level = ((t / this.prof.defaultPwm) % 1) < io[n].duty ? this.vcc : 0; });
      const s = simulate(this.circuit, { dt: sub, advance: true });
      pwm.forEach((n, j) => { io[n].level = saved[j]; });
      if (this.scope) this.record(t, s);
      acc ||= emptyAcc(s);
      addInto(acc, s, 1 / N);
    }
    for (const name of Object.keys(final)) io[name] = final[name];
    this.startIo = {}; this.frameStart = JSON.parse(JSON.stringify(final)); this.lastClock = t1;
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

  // Remember a pin change with its time, so a frame that contains several changes can replay them.
  note(name) { if (this.hasCap || this.scope) this.log.push({ at: this.clock, name, state: { ...this.uno.props.io[name] } }); }

  read(name) {
    if (this.dirty) this.refresh();
    return this.sim.comps.UNO.pins[name] || { v: 0, i: 0 };
  }

  // ----- host interface for the interpreter -----
  host() {
    const self = this, prof = this.prof, vcc = this.vcc, pn = prof.pinName;
    const setPwm = (n, frac) => {
      const name = pn(n); if (!name) return;
      const p = self.io(name); p.mode = 1;
      if (!prof.hasPwm(n)) { p.duty = null; p.level = frac >= 0.5 ? vcc : 0; }       // only ~ pins have PWM, the others just go high or low
      else { p.duty = frac <= 0 || frac >= 1 ? null : frac; p.level = frac <= 0 ? 0 : vcc; }
      self.dirty = true; self.note(name);
    };
    return {
      consts: prof.consts,
      pinMode(n, mode) { const name = pn(n); if (!name) return; const p = self.io(name); p.mode = mode; p.duty = null; p.level = 0; self.dirty = true; self.note(name); },
      digitalWrite(n, v) {
        const name = pn(n); if (!name) return;
        const p = self.io(name); p.duty = null;
        if (p.mode === 1) p.level = v ? vcc : 0; else p.mode = v ? 2 : 0;   // writing HIGH to an input turns its pull-up on
        self.dirty = true; self.note(name);
      },
      analogWrite(n, v) { setPwm(n, v / 255); },
      ledcAttach(n, freq, bits) { self.ledcBits[n] = bits; const name = pn(n); if (name) { const p = self.io(name); p.mode = 1; p.level = 0; self.dirty = true; self.note(name); } return freq; },
      ledcWrite(n, duty) { setPwm(n, duty / ((2 ** (self.ledcBits[n] ?? 8)) - 1)); },
      setAdcBits(b) { self.adcBits = Math.max(9, Math.min(12, b | 0)); },
      digitalRead(n) { const name = pn(n); return name && self.read(name).v > vcc / 2 ? 1 : 0; },
      analogRead(n) {
        const name = pn(n), max = 2 ** self.adcBits - 1;
        const v = name ? Math.max(0, Math.min(max, Math.round(self.read(name).v / vcc * max))) : 0;
        self.stats.analog.add(v); return v;
      },
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
    this.board.frameEnd = now;
    const began = performance.now();                       // a frame gets 8 ms of sketch time, then the screen gets a turn
    try {
      for (let guard = 0; guard < 100000; guard++) {
        this.board.clock = Math.min(this.wake, now);          // the sketch resumes at the moment its delay ended
        const r = this.gen.next();
        if (r.done) { this.finished = true; return; }
        if (r.value.delay !== undefined) {
          this.wake = this.wake + r.value.delay;
          if (now - this.wake > 100) this.wake = now;       // fell behind (a slow frame): do not catch up in a burst
          if (this.wake > now) return;
          continue;
        }
        if (performance.now() - began < 8) continue;        // a tick: keep going while there is time in this frame
        return;
      }
    } catch (e) {
      if (e && e.code) this.error = { code: e.code, line: e.line, name: e.name === 'Error' ? '' : e.name };
      else throw e;
    }
  }
}
