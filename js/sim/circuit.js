// Circuit model and DC simulation.
// A circuit is { comps: [{ id, type, pins: [hole...], props, burned }] }.
// Every part is turned into a conductance with an optional current source (Norton form),
// so plain nodal analysis is enough. LEDs are piecewise linear: off, or Vf in series with a small resistance.

import { stripOf } from './board.js';
import { solveLinear } from './solver.js';
import { gateEval } from './logic.js';

export const LED_VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.0 };
export const LED_NOMINAL_A = 0.02;   // comfortable LED current
export const LED_BURN_A = 0.05;      // above this the LED dies
export const RESISTOR_MAX_W = 0.25;  // quarter watt resistors, as in starter kits
export const SHORT_A = 1;            // battery current that counts as a short circuit
const LED_RS = 8;
const WIRE_R = 0.01;
const BATTERY_R = 0.5;
const GATE_R = 25;   // output resistance of a gate pin, like a 74HC chip
const GMIN = 1e-9;
const BJT_VBE = 0.7;    // base to emitter drop of a conducting transistor
const BJT_VSAT = 0.2;   // collector to emitter voltage when fully on
const BJT_RSAT = 1;
const HOLD_DT = 1e-6;  // a static solve holds each capacitor at its stored voltage

const DEFAULTS = {
  battery: () => ({ v: 9 }),
  wire: () => ({ color: 'red' }),
  resistor: () => ({ r: 470 }),
  led: p => ({ color: 'red', vf: LED_VF[p?.color || 'red'] }),
  button: () => ({ pressed: false }),
  pot: () => ({ r: 10000, pos: 0.5 }),
  switch: () => ({ on: false }),
  diode: () => ({ vf: 0.7 }),
  transistor: () => ({ beta: 100 }),
  capacitor: () => ({ c: 0.001, vc: 0 }),
  gate: () => ({ fn: 'and' }),
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

function solveOnce(circuit, dt = 0) {
  const nodes = new Map();
  const node = hole => {
    const s = stripOf(hole);
    if (!nodes.has(s)) nodes.set(s, nodes.size);
    return nodes.get(s);
  };
  const ground = node('BAT-');
  const plus = node('BAT+');
  const vcc = circuit.comps.find(c => c.type === 'battery')?.props.v ?? 9;
  const els = [];
  const bjts = [];
  for (const c of circuit.comps) {
    const n = c.pins.map(node);
    const add = (a, b, g, is = 0, extra = {}) => els.push({ c, a, b, g, is, ...extra });
    if (c.type === 'battery') add(n[0], n[1], 1 / BATTERY_R, c.props.v / BATTERY_R);
    else if (c.type === 'wire') add(n[0], n[1], 1 / WIRE_R);
    else if (c.type === 'resistor') add(n[0], n[1], 1 / Math.max(c.props.r, 0.01));
    else if (c.type === 'button') { if (c.props.pressed) add(n[0], n[1], 1 / WIRE_R); }
    else if (c.type === 'capacitor') { const g = c.props.c / (dt || HOLD_DT); add(n[0], n[1], g, g * c.props.vc); }
    else if (c.type === 'diode') add(n[0], n[1], 0, 0, { led: true, on: true });
    else if (c.type === 'transistor') bjts.push({ c, C: n[0], B: n[1], E: n[2], on: true, sat: false });
    else if (c.type === 'switch') { if (c.props.on) add(n[0], n[1], 1 / WIRE_R); }
    else if (c.type === 'gate') {
      // Inputs are high impedance. The output pin is tied through a small resistance to + when the
      // gate says 1 and to - when it says 0, so the battery supplies the current. Power is implicit.
      els.push({ c, a: n[n.length - 1], b: plus, g: 1 / GATE_R, is: 0, gate: true, ins: n.slice(0, -1), out: !!c.out });
    }
    else if (c.type === 'led') { if (!c.burned) add(n[0], n[1], 0, 0, { led: true, on: true }); }
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
      if (e.gate) { e.b = e.out ? plus : ground; }
      if (e.led) { e.g = e.on ? 1 / LED_RS : GMIN; e.is = e.on ? e.c.props.vf / LED_RS : 0; }
      A[e.a][e.a] += e.g; A[e.b][e.b] += e.g; A[e.a][e.b] -= e.g; A[e.b][e.a] -= e.g;
      b[e.a] += e.is; b[e.b] -= e.is;
    }
    // NPN transistor, pins [C, B, E]. The base to emitter path is a diode. While active the collector
    // current is beta times the base current (stamped as a controlled source, so it is exact). When
    // that would pull the collector below about 0.2 V it is saturated: collector tied to emitter.
    for (const q of bjts) {
      const gd = q.on ? 1 / LED_RS : GMIN, isd = q.on ? BJT_VBE / LED_RS : 0;
      A[q.B][q.B] += gd; A[q.E][q.E] += gd; A[q.B][q.E] -= gd; A[q.E][q.B] -= gd;
      b[q.B] += isd; b[q.E] -= isd;
      if (q.on && q.sat) {
        const g = 1 / BJT_RSAT, is = BJT_VSAT * g;
        A[q.C][q.C] += g; A[q.E][q.E] += g; A[q.C][q.E] -= g; A[q.E][q.C] -= g;
        b[q.C] += is; b[q.E] -= is;
      } else if (q.on) {
        const k = q.c.props.beta * gd, ks = q.c.props.beta * isd;
        A[q.C][q.B] += k; A[q.C][q.E] -= k; b[q.C] += ks;
        A[q.E][q.B] -= k; A[q.E][q.E] += k; b[q.E] -= ks;
      }
    }
    A[ground].fill(0); A[ground][ground] = 1; b[ground] = 0;
    V = solveLinear(A, b);
    let changed = false;
    for (const q of bjts) {
      const vbe = V[q.B] - V[q.E], vce = V[q.C] - V[q.E];
      const ib = q.on ? (vbe - BJT_VBE) / LED_RS : 0;
      if (q.on && ib < -1e-12) { q.on = false; q.sat = false; changed = true; }
      else if (!q.on && vbe > BJT_VBE + 1e-9) { q.on = true; q.sat = false; changed = true; }
      else if (q.on && !q.sat && vce < BJT_VSAT - 1e-9) { q.sat = true; changed = true; }
      else if (q.on && q.sat && (vce - BJT_VSAT) / BJT_RSAT > q.c.props.beta * ib + 1e-12) { q.sat = false; changed = true; }
    }
    for (const e of els) {
      if (e.gate) {
        const out = gateEval(e.c.props.fn, e.ins.map(k => V[k] - V[ground] > vcc / 2));
        if (out !== e.out) { e.out = out; changed = true; }
        continue;
      }
      if (!e.led) continue;
      const dv = V[e.a] - V[e.b];
      if (e.on && dv < e.c.props.vf - 1e-9) { e.on = false; changed = true; }
      else if (!e.on && dv > e.c.props.vf + 1e-9) { e.on = true; changed = true; }
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
    if (e.gate) {
      r.v = V[e.a] - V[ground]; r.i = -i; r.p = Math.abs(dv * i); r.out = e.out;
      r.inputs = e.ins.map(k => V[k] - V[ground] > vcc / 2); e.c.out = e.out;
    }
    else if (e.c.type === 'battery') { r.v = dv; r.i = -i; r.p = dv * -i; }
    else if (e.c.type === 'pot') {
      if (e.part === 0) { r.v = dv; r.i = i; }
      r.p += Math.abs(dv * i);
    } else { r.v = dv; r.i = i; r.p = Math.abs(dv * i); }
  }
  for (const q of bjts) {
    const r = comps[q.c.id], vbe = V[q.B] - V[q.E], vce = V[q.C] - V[q.E];
    r.ib = q.on ? Math.max(0, (vbe - BJT_VBE) / LED_RS) : 0;
    r.i = !q.on ? 0 : q.sat ? (vce - BJT_VSAT) / BJT_RSAT : q.c.props.beta * r.ib;
    r.v = vce; r.vbe = vbe; r.p = Math.abs(vce * r.i) + Math.abs(vbe * r.ib);
    r.state = !q.on ? 'off' : q.sat ? 'sat' : 'active';
  }
  for (const c of circuit.comps) {
    const r = comps[c.id];
    if (c.type === 'led') {
      r.burned = !!c.burned;
      r.lit = r.i > 3e-4;
      r.brightness = Math.max(0, Math.min(1, r.i / LED_NOMINAL_A));
      if (c.burned) r.v = V[nodes.get(stripOf(c.pins[0]))] - V[nodes.get(stripOf(c.pins[1]))];
    }
    if ((c.type === 'button' && !c.props.pressed) || (c.type === 'switch' && !c.props.on)) r.v = V[nodes.get(stripOf(c.pins[0]))] - V[nodes.get(stripOf(c.pins[1]))];
    if (c.type === 'resistor') r.hot = r.p > RESISTOR_MAX_W;
  }
  const nodeV = {};
  for (const [s, k] of nodes) nodeV[s] = V[k];
  return { comps, nodeV, short: comps.BAT ? comps.BAT.i > SHORT_A : false };
}

// Simulates the circuit. An LED that gets too much current burns out: this marks it in the
// circuit itself and reports it in `events`.
export function simulate(circuit, dt = 0) {
  if (dt > 0) {
    // Time passes: an auto switch (a square wave source) flips every half period.
    circuit.t = (circuit.t || 0) + dt;
    for (const c of circuit.comps) if (c.type === 'switch' && c.props.period) c.props.on = (circuit.t % c.props.period) < c.props.period / 2;
  }
  const events = [];
  let res;
  for (let guard = 0; guard < 10; guard++) {
    res = solveOnce(circuit, dt);
    const burnt = circuit.comps.filter(c => c.type === 'led' && !c.burned && res.comps[c.id].i > LED_BURN_A);
    if (!burnt.length) break;
    for (const c of burnt) { c.burned = true; events.push({ type: 'burn', id: c.id, i: res.comps[c.id].i }); }
  }
  if (dt > 0) for (const c of circuit.comps) if (c.type === 'capacitor') c.props.vc = res.comps[c.id].v;
  res.events = events;
  return res;
}

// Runs the circuit forward in time, in small backward Euler steps. Returns the last result.
export function advance(circuit, seconds, step = 0.005) {
  const n = Math.max(1, Math.ceil(seconds / step));
  let res;
  for (let k = 0; k < n; k++) res = simulate(circuit, seconds / n);
  return res;
}

// Voltage of hole a relative to hole b. A hole that is not part of the circuit reads 0.
export function voltageBetween(sim, a, b) {
  return (sim.nodeV[stripOf(a)] ?? 0) - (sim.nodeV[stripOf(b)] ?? 0);
}
