// Circuit model and DC simulation.
// A circuit is { comps: [{ id, type, pins: [hole...], props, burned }] }.
// Every part is turned into a conductance with an optional current source (Norton form),
// so plain nodal analysis is enough. LEDs are piecewise linear: off, or Vf in series with a small resistance.

import { stripOf } from './board.js';
import { solveLinear } from './solver.js';

export const LED_VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.0 };
export const LED_NOMINAL_A = 0.02;   // comfortable LED current
export const LED_BURN_A = 0.05;      // above this the LED dies
export const RESISTOR_MAX_W = 0.25;  // quarter watt resistors, as in starter kits
export const UNO_VCC = 5;
export const UNO_PIN_MAX_A = 0.04;   // an Arduino pin is rated for 40 mA
const UNO_OUT_R = 25;                // output pin drive resistance
const UNO_PULLUP_R = 20000;
export const SHORT_A = 1;            // battery current that counts as a short circuit
const LED_RS = 8;
const DIODE_RS = 1;
const TR_RB = 20;                    // base-emitter junction resistance
const TR_VSAT = 0.2, TR_RSAT = 2;    // collector-emitter when saturated
const GATE_R = 50;                   // logic output resistance
export const GATE_FNS = { and: v => v[0] && v[1], or: v => v[0] || v[1], not: v => !v[0], nand: v => !(v[0] && v[1]), nor: v => !(v[0] || v[1]), xor: v => v[0] !== v[1], xnor: v => v[0] === v[1] };
export const gatePinCount = fn => (fn === 'not' ? 2 : 3);
export const DIODE_VF = 0.7;         // silicon rectifier diode, e.g. 1N4007
export const CAP_DT = 1e-3;          // time step used when a plain DC solve meets a capacitor
const WIRE_R = 0.01;
const BATTERY_R = 0.5;
const GMIN = 1e-9;

const DEFAULTS = {
  battery: () => ({ v: 9 }),
  wire: () => ({ color: 'red' }),
  resistor: () => ({ r: 470 }),
  led: p => ({ color: 'red', vf: LED_VF[p?.color || 'red'] }),
  button: () => ({ pressed: false }),
  pot: () => ({ r: 10000, pos: 0.5 }),
  diode: () => ({ vf: DIODE_VF }),
  switch: () => ({ on: false }),               // SPDT toggle: pins [low, common, high]
  transistor: () => ({ beta: 100, vf: 0.7 }),  // NPN, pins [collector, base, emitter]
  gate: p => ({ fn: p?.fn || 'and' }),         // logic gate, pins [A, B, Y] (NOT: [A, Y]); supply is the battery voltage
  capacitor: () => ({ c: 0.001, vc: 0 }),
  uno: () => ({ names: [], io: {} }),       // pins[k] is the hole of Arduino pin names[k]; io[name] = { mode, level }   // farads and the volts stored right now (pin0 minus pin1)
};

export function newCircuit(v = 9) {
  return { comps: [{ id: 'BAT', type: 'battery', pins: ['BAT+', 'BAT-'], props: { v }, burned: false }] };
}
export const clone = c => JSON.parse(JSON.stringify(c));
export const getComp = (c, id) => c.comps.find(x => x.id === id);
export function removeComp(c, id) { c.comps = c.comps.filter(x => x.id !== id); }
export function addComp(c, comp) {
  removeComp(c, comp.id);
  c.comps.push({ id: comp.id, type: comp.type, pins: [...comp.pins], props: { ...DEFAULTS[comp.type](comp.props), ...comp.props }, burned: false });
}
export function usedHoles(c) {
  const s = new Set();
  for (const comp of c.comps) for (const p of comp.pins) s.add(p);
  return s;
}

function solveOnce(circuit, dt) {
  const nodes = new Map();
  const node = hole => {
    const s = stripOf(hole);
    if (!nodes.has(s)) nodes.set(s, nodes.size);
    return nodes.get(s);
  };
  const ground = node('BAT-');
  const els = [];
  for (const c of circuit.comps) {
    const n = c.pins.map(node);
    const add = (a, b, g, is = 0, extra = {}) => els.push({ c, a, b, g, is, ...extra });
    if (c.type === 'battery') add(n[0], n[1], 1 / BATTERY_R, c.props.v / BATTERY_R);
    else if (c.type === 'wire') add(n[0], n[1], 1 / WIRE_R);
    else if (c.type === 'resistor') add(n[0], n[1], 1 / Math.max(c.props.r, 0.01));
    else if (c.type === 'button') { if (c.props.pressed) add(n[0], n[1], 1 / WIRE_R); }
    else if (c.type === 'led') { if (!c.burned) add(n[0], n[1], 0, 0, { led: true, on: true, rs: LED_RS }); }
    else if (c.type === 'diode') add(n[0], n[1], 0, 0, { led: true, on: true, rs: DIODE_RS });
    else if (c.type === 'switch') add(n[1], c.props.on ? n[2] : n[0], 1 / WIRE_R);
    else if (c.type === 'transistor') {
      const be = { c, a: n[1], b: n[2], g: 0, is: 0, led: true, on: true, rs: TR_RB, tr: 'be' };
      els.push(be, { c, a: n[0], b: n[2], g: GMIN, is: 0, tr: 'ce', mode: 'off', icw: 0, be });
    }
    else if (c.type === 'gate') {
      const f = GATE_FNS[c.props.fn] ? c.props.fn : 'and', k = c.pins.length;
      els.push({ c, a: n[k - 1], b: ground, g: 1 / GATE_R, is: 0, gate: true, ins: n.slice(0, k - 1), fn: f, out: false, vcc: (circuit.comps.find(x => x.type === 'battery')?.props.v) ?? 5 });
    }
    else if (c.type === 'uno') {
      c.pins.forEach((_, k) => {
        const name = c.props.names[k], st = c.props.io[name] || { mode: 0, level: 0 };
        if (name === '5V') add(n[k], ground, 1, UNO_VCC, { pin: name });
        else if (name === 'GND') add(n[k], ground, 100, 0, { pin: name });
        else if (st.mode === 1) add(n[k], ground, 1 / UNO_OUT_R, st.level / UNO_OUT_R, { pin: name });
        else if (st.mode === 2) add(n[k], ground, 1 / UNO_PULLUP_R, UNO_VCC / UNO_PULLUP_R, { pin: name });
      });
    }
    else if (c.type === 'capacitor') { const g = Math.max(c.props.c, 1e-12) / dt; add(n[0], n[1], g, g * (c.props.vc || 0)); }
    else if (c.type === 'pot') {
      add(n[0], n[1], 1 / Math.max(c.props.r * c.props.pos, 1), 0, { part: 0 });
      add(n[1], n[2], 1 / Math.max(c.props.r * (1 - c.props.pos), 1), 0, { part: 1 });
    }
  }

  const N = nodes.size;
  let V = [];
  for (let iter = 0; iter < 40; iter++) {
    const A = Array.from({ length: N }, () => new Array(N).fill(0));
    const b = new Array(N).fill(0);
    for (let k = 0; k < N; k++) A[k][k] = GMIN;
    for (const e of els) {
      if (e.led) { e.g = e.on ? 1 / e.rs : GMIN; e.is = e.on ? e.c.props.vf / e.rs : 0; }
      else if (e.tr === 'ce') { if (e.mode === 'sat') { e.g = 1 / TR_RSAT; e.is = e.g * TR_VSAT; } else { e.g = GMIN; e.is = e.mode === 'act' ? -e.icw : 0; } }
      else if (e.gate) e.is = e.g * (e.out ? e.vcc : 0);
      A[e.a][e.a] += e.g; A[e.b][e.b] += e.g; A[e.a][e.b] -= e.g; A[e.b][e.a] -= e.g;
      b[e.a] += e.is; b[e.b] -= e.is;
    }
    A[ground].fill(0); A[ground][ground] = 1; b[ground] = 0;
    V = solveLinear(A, b);
    let changed = false;
    for (const e of els) {
      if (!e.led) continue;
      const dv = V[e.a] - V[e.b];
      if (e.on && dv < e.c.props.vf - 1e-9) { e.on = false; changed = true; }
      else if (!e.on && dv > e.c.props.vf + 1e-9) { e.on = true; changed = true; }
    }
    for (const e of els) {
      if (e.tr === 'ce') {
        const be = e.be, vf = e.c.props.vf;
        const ib = be.on ? Math.max(0, (V[be.a] - V[be.b] - vf) / be.rs) : 0, want = e.c.props.beta * ib, vce = V[e.a] - V[e.b];
        let mode;
        if (!be.on) mode = 'off';
        else if (e.mode === 'sat') mode = (vce - TR_VSAT) / TR_RSAT > want + 1e-9 ? 'act' : 'sat';
        else mode = vce < TR_VSAT - 1e-9 ? 'sat' : 'act';
        if (mode !== e.mode) { e.mode = mode; changed = true; }
        if (mode === 'act' && Math.abs(want - e.icw) > 1e-9 + 1e-6 * want) { e.icw = want; changed = true; }
      } else if (e.gate) {
        const levels = e.ins.map(k => V[k] > e.vcc * 0.5), out = !!GATE_FNS[e.fn](levels);
        e.levels = levels;
        if (out !== e.out) { e.out = out; changed = true; }
      }
    }
    if (!changed) break;
  }

  const comps = {};
  for (const c of circuit.comps) comps[c.id] = { v: 0, i: 0, p: 0 };
  for (const e of els) {
    const r = comps[e.c.id];
    const dv = V[e.a] - V[e.b];
    let i = e.g * dv - e.is;
    if (e.led && !e.on) i = 0;
    if (e.c.type === 'uno') { (r.pins ||= {})[e.pin] = { v: dv, i }; continue; }
    if (e.c.type === 'transistor') {
      if (e.tr === 'be') { r.vbe = dv; r.ib = i; } else { r.vce = dv; r.ic = i; r.state = e.mode; }
      r.v = r.vce ?? 0; r.i = r.ic ?? 0; r.p = Math.abs((r.vce || 0) * (r.ic || 0)) + Math.abs((r.vbe || 0) * (r.ib || 0));
      continue;
    }
    if (e.c.type === 'gate') { r.v = dv; r.i = -i; r.p = Math.abs(dv * i); r.high = e.out; r.inputs = e.levels || e.ins.map(() => false); continue; }
    if (e.c.type === 'battery') { r.v = dv; r.i = -i; r.p = dv * -i; }
    else if (e.c.type === 'pot') {
      if (e.part === 0) { r.v = dv; r.i = i; }
      r.p += Math.abs(dv * i);
    } else { r.v = dv; r.i = i; r.p = Math.abs(dv * i); }
  }
  for (const c of circuit.comps) {
    const r = comps[c.id];
    if (c.type === 'led') {
      r.burned = !!c.burned;
      r.lit = r.i > 3e-4;
      r.brightness = Math.max(0, Math.min(1, r.i / LED_NOMINAL_A));
      if (c.burned) r.v = V[nodes.get(stripOf(c.pins[0]))] - V[nodes.get(stripOf(c.pins[1]))];
    }
    if (c.type === 'button' && !c.props.pressed) r.v = V[nodes.get(stripOf(c.pins[0]))] - V[nodes.get(stripOf(c.pins[1]))];
    if (c.type === 'resistor') r.hot = r.p > RESISTOR_MAX_W;
    if (c.type === 'uno') {
      r.pins ||= {};
      c.pins.forEach((h, k) => {
        const name = c.props.names[k], v = V[nodes.get(stripOf(h))];
        r.pins[name] = { ...(r.pins[name] || { i: 0 }), v };
        r.pins[name].over = Math.abs(r.pins[name].i) > UNO_PIN_MAX_A && name !== '5V' && name !== 'GND';
      });
    }
    if (c.type === 'switch') r.on = !!c.props.on;
    if (c.type === 'diode') r.conducting = r.i > 1e-4;
    if (c.type === 'capacitor') r.charge = (c.props.c || 0) * r.v;
  }
  const nodeV = {};
  for (const [s, k] of nodes) nodeV[s] = V[k];
  return { comps, nodeV, short: comps.BAT ? comps.BAT.i > SHORT_A : false };
}

// Simulates the circuit. An LED that gets too much current burns out: this marks it in the
// circuit itself and reports it in `events`.
// Capacitors are solved with backward Euler over `dt` seconds. A plain call only looks at the
// present state; with `advance: true` the capacitors also move on by `dt` (time passes).
export function simulate(circuit, { dt = CAP_DT, advance = false } = {}) {
  const events = [];
  let res;
  for (let guard = 0; guard < 10; guard++) {
    res = solveOnce(circuit, dt);
    const burnt = circuit.comps.filter(c => c.type === 'led' && !c.burned && res.comps[c.id].i > LED_BURN_A);
    if (!burnt.length) break;
    for (const c of burnt) { c.burned = true; events.push({ type: 'burn', id: c.id, i: res.comps[c.id].i }); }
  }
  if (advance) for (const c of circuit.comps) if (c.type === 'capacitor') c.props.vc = res.comps[c.id].v;
  res.events = events;
  return res;
}

// Voltage of hole a relative to hole b. A hole that is not part of the circuit reads 0.
export function voltageBetween(sim, a, b) {
  return (sim.nodeV[stripOf(a)] ?? 0) - (sim.nodeV[stripOf(b)] ?? 0);
}
