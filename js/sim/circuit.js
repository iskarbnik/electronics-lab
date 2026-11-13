// Circuit model and DC simulation.
// A circuit is { comps: [{ id, type, pins: [hole...], props, burned }] }.
// Every part is turned into a conductance with an optional current source (Norton form),
// so plain nodal analysis is enough. LEDs are piecewise linear: off, or Vf in series with a small resistance.

import { stripOf } from './board.js';
import { solveLinear } from './solver.js';

export const LED_VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.0 };
export const LED_NOMINAL_A = 0.02;   // comfortable LED current
export const LED_BURN_A = 0.05;      // above this the LED dies
export const DIODE_VF = 0.7;         // silicon diode and transistor base-emitter drop
export const DIODE_BURN_A = 1;       // a 1N4007 is rated 1 A
export const NPN_BURN_A = 0.8;       // a 2N2222 is rated about 0.8 A collector current
export const NPN_BASE_BURN_A = 0.1;  // and takes about 0.1 A into the base
export const NPN_BETA = 100;
export const VCE_SAT = 0.2;
export const RESISTOR_MAX_W = 0.25;  // quarter watt resistors, as in starter kits
export const SHORT_A = 1;            // battery current that counts as a short circuit
const LED_RS = 8;
const DIODE_RS = 1;
const RBE = 2;
const RCE = 2;
const WIRE_R = 0.01;
const BATTERY_R = 0.5;
const GEN_R = 0.1;
const CAP_STATIC_G = 1e4;            // without a time step a capacitor holds its voltage like a tiny battery
const GMIN = 1e-9;
const GMIN_DIODE = 1e-12;            // a reversed diode leaks even less than an idle LED

const DEFAULTS = {
  battery: () => ({ v: 9 }),
  wire: () => ({ color: 'red' }),
  resistor: () => ({ r: 470 }),
  led: p => ({ color: 'red', vf: LED_VF[p?.color || 'red'] }),
  button: () => ({ pressed: false }),
  pot: () => ({ r: 10000, pos: 0.5 }),
  capacitor: () => ({ c: 100e-6 }),
  diode: () => ({ vf: DIODE_VF }),
  npn: () => ({ beta: NPN_BETA }),
  gen: () => ({ wave: 'square', f: 1, v: 5 }),
};
export const BURN_A = { led: LED_BURN_A, diode: DIODE_BURN_A, npn: NPN_BURN_A };
export const PIN_COUNT = { battery: 2, wire: 2, resistor: 2, led: 2, button: 2, pot: 3, capacitor: 2, diode: 2, npn: 3, gen: 2 };
export const isDynamic = c => c.comps.some(x => x.type === 'capacitor' || x.type === 'gen');

export function newCircuit(v = 9) {
  return { t: 0, comps: [{ id: 'BAT', type: 'battery', pins: ['BAT+', 'BAT-'], props: { v }, burned: false }] };
}
export const clone = c => JSON.parse(JSON.stringify(c));
export const getComp = (c, id) => c.comps.find(x => x.id === id);
export function removeComp(c, id) { c.comps = c.comps.filter(x => x.id !== id); }
export function addComp(c, comp) {
  removeComp(c, comp.id);
  const x = { id: comp.id, type: comp.type, pins: [...comp.pins], props: { ...DEFAULTS[comp.type](comp.props), ...comp.props }, burned: false };
  if (comp.type === 'capacitor') x.vc = comp.vc || 0;
  c.comps.push(x);
}
export function usedHoles(c) {
  const s = new Set();
  for (const comp of c.comps) for (const p of comp.pins) s.add(p);
  return s;
}

// Output voltage of a generator at time t.
export function genVoltage(props, t) {
  const ph = (((t * props.f) % 1) + 1) % 1;
  if (props.wave === 'sine') return props.v * Math.sin(2 * Math.PI * ph);   // alternating, peak = v
  return ph < 0.5 ? props.v : 0;
}

// One nodal solve. With dt > 0, capacitors use the backward Euler companion model; with dt = 0 they hold their voltage.
// Pure: it does not change the circuit (see simulate for time stepping and burning).
function solveOnce(circuit, dt) {
  const nodes = new Map();
  const node = hole => {
    const s = stripOf(hole);
    if (!nodes.has(s)) nodes.set(s, nodes.size);
    return nodes.get(s);
  };
  const ground = node('BAT-');
  const els = [];
  const trans = [];
  for (const c of circuit.comps) {
    const n = c.pins.map(node);
    const add = (a, b, g, is = 0, extra = {}) => els.push({ c, a, b, g, is, ...extra });
    if (c.type === 'battery') add(n[0], n[1], 1 / BATTERY_R, c.props.v / BATTERY_R);
    else if (c.type === 'gen') add(n[0], n[1], 1 / GEN_R, genVoltage(c.props, circuit.t || 0) / GEN_R);
    else if (c.type === 'wire') add(n[0], n[1], 1 / WIRE_R);
    else if (c.type === 'resistor') add(n[0], n[1], 1 / Math.max(c.props.r, 0.01));
    else if (c.type === 'button') { if (c.props.pressed) add(n[0], n[1], 1 / WIRE_R); }
    else if (c.type === 'capacitor') {
      const g = dt > 0 ? c.props.c / dt : CAP_STATIC_G;
      add(n[0], n[1], g, g * (c.vc || 0), { cap: true });
    }
    else if (c.type === 'led') { if (!c.burned) add(n[0], n[1], 0, 0, { diode: true, on: true, vf: c.props.vf, rs: LED_RS, goff: GMIN }); }
    else if (c.type === 'diode') { if (!c.burned) add(n[0], n[1], 0, 0, { diode: true, on: false, vf: c.props.vf ?? DIODE_VF, rs: DIODE_RS, goff: GMIN_DIODE }); }
    else if (c.type === 'npn') { if (!c.burned) trans.push({ c, b: n[0], k: n[1], e: n[2], st: 'off', beta: c.props.beta ?? NPN_BETA }); }
    else if (c.type === 'pot') {
      add(n[0], n[1], 1 / Math.max(c.props.r * c.props.pos, 1), 0, { part: 0 });
      add(n[1], n[2], 1 / Math.max(c.props.r * (1 - c.props.pos), 1), 0, { part: 1 });
    }
  }

  const N = nodes.size;
  let V = [];
  for (let iter = 0; iter < 80; iter++) {
    const A = Array.from({ length: N }, () => new Array(N).fill(0));
    const b = new Array(N).fill(0);
    for (let k = 0; k < N; k++) A[k][k] = GMIN;
    const stamp = (a, c, g, is) => { A[a][a] += g; A[c][c] += g; A[a][c] -= g; A[c][a] -= g; b[a] += is; b[c] -= is; };
    for (const e of els) {
      if (e.diode) { e.g = e.on ? 1 / e.rs : e.goff; e.is = e.on ? e.vf / e.rs : 0; }
      stamp(e.a, e.b, e.g, e.is);
    }
    for (const q of trans) {
      if (q.st === 'off') continue;
      stamp(q.b, q.e, 1 / RBE, DIODE_VF / RBE);
      if (q.st === 'sat') stamp(q.k, q.e, 1 / RCE, VCE_SAT / RCE);
      else {
        // collector current beta * Ib, with Ib = (Vb - Ve - Vbe) / RBE
        const g = q.beta / RBE, is = q.beta * DIODE_VF / RBE;
        A[q.k][q.b] += g; A[q.k][q.e] -= g; b[q.k] += is;
        A[q.e][q.b] -= g; A[q.e][q.e] += g; b[q.e] -= is;
      }
    }
    A[ground].fill(0); A[ground][ground] = 1; b[ground] = 0;
    V = solveLinear(A, b);
    let changed = false;
    for (const e of els) {
      if (!e.diode) continue;
      const dv = V[e.a] - V[e.b];
      if (e.on && dv < e.vf - 1e-9) { e.on = false; changed = true; }
      else if (!e.on && dv > e.vf + 1e-9) { e.on = true; changed = true; }
    }
    for (const q of trans) {
      const vbe = V[q.b] - V[q.e], vce = V[q.k] - V[q.e];
      const ib = (vbe - DIODE_VF) / RBE;
      if (q.st === 'off') { if (vbe > DIODE_VF + 1e-9) { q.st = 'active'; changed = true; } }
      else if (ib < -1e-12) { q.st = 'off'; changed = true; }
      else if (q.st === 'active') { if (vce < VCE_SAT - 1e-9) { q.st = 'sat'; changed = true; } }
      else if ((vce - VCE_SAT) / RCE > q.beta * ib + 1e-12) { q.st = 'active'; changed = true; }
    }
    if (!changed) break;
  }

  const comps = {};
  for (const c of circuit.comps) comps[c.id] = { v: 0, i: 0, p: 0 };
  const capV = {};
  for (const e of els) {
    const r = comps[e.c.id];
    const dv = V[e.a] - V[e.b];
    let i = e.g * dv - e.is;
    if (e.diode && !e.on) i = 0;
    if (e.c.type === 'battery' || e.c.type === 'gen') { r.v = dv; r.i = -i; r.p = dv * -i; }
    else if (e.c.type === 'pot') {
      if (e.part === 0) { r.v = dv; r.i = i; }
      r.p += Math.abs(dv * i);
    } else { r.v = dv; r.i = i; r.p = Math.abs(dv * i); }
    if (e.cap) capV[e.c.id] = dv;
  }
  const vOf = hole => V[nodes.get(stripOf(hole))];
  for (const q of trans) {
    const r = comps[q.c.id];
    const vbe = V[q.b] - V[q.e], vce = V[q.k] - V[q.e];
    const ib = q.st === 'off' ? 0 : (vbe - DIODE_VF) / RBE;
    const ic = q.st === 'off' ? 0 : q.st === 'active' ? q.beta * ib : (vce - VCE_SAT) / RCE;
    Object.assign(r, { v: vce, i: ic, ib, ie: ic + ib, vbe, vce, state: ib < 1e-7 ? 'off' : q.st, p: Math.abs(vce * ic + vbe * ib) });
  }
  for (const c of circuit.comps) {
    const r = comps[c.id];
    if (c.type === 'led') {
      r.burned = !!c.burned;
      r.lit = r.i > 3e-4;
      r.brightness = Math.max(0, Math.min(1, r.i / LED_NOMINAL_A));
      if (c.burned) r.v = vOf(c.pins[0]) - vOf(c.pins[1]);
    }
    if (c.type === 'diode') {
      r.burned = !!c.burned;
      r.conducting = r.i > 1e-4;
      if (c.burned) r.v = vOf(c.pins[0]) - vOf(c.pins[1]);
    }
    if (c.type === 'npn') {
      r.burned = !!c.burned;
      if (c.burned) { r.state = 'off'; r.v = vOf(c.pins[1]) - vOf(c.pins[2]); r.vce = r.v; r.vbe = vOf(c.pins[0]) - vOf(c.pins[2]); }
    }
    if (c.type === 'capacitor') r.energy = 0.5 * c.props.c * r.v * r.v;
    if (c.type === 'button' && !c.props.pressed) r.v = vOf(c.pins[0]) - vOf(c.pins[1]);
    if (c.type === 'resistor') r.hot = r.p > RESISTOR_MAX_W;
  }
  const nodeV = {};
  for (const [s, k] of nodes) nodeV[s] = V[k];
  return { comps, nodeV, capV, t: circuit.t || 0, short: comps.BAT ? comps.BAT.i > SHORT_A : false };
}

// Simulates the circuit. Parts that get too much current burn out: this marks them in the circuit
// itself and reports them in `events`. With dt > 0 time advances by dt seconds and capacitors charge.
export function simulate(circuit, dt = 0) {
  const events = [];
  if (dt > 0) circuit.t = (circuit.t || 0) + dt;
  let res;
  for (let guard = 0; guard < 10; guard++) {
    res = solveOnce(circuit, dt);
    const stress = c => { const r = res.comps[c.id]; return c.type === 'npn' ? Math.max(Math.abs(r.i), Math.abs(r.ib) * NPN_BURN_A / NPN_BASE_BURN_A) : Math.abs(r.i); };
    const burnt = circuit.comps.filter(c => BURN_A[c.type] && !c.burned && stress(c) > BURN_A[c.type]);
    if (!burnt.length) break;
    for (const c of burnt) { c.burned = true; events.push({ type: 'burn', id: c.id, kind: c.type, i: c.type === 'npn' && Math.abs(res.comps[c.id].ib) * 8 > Math.abs(res.comps[c.id].i) ? Math.abs(res.comps[c.id].ib) : Math.abs(res.comps[c.id].i) }); }
  }
  if (dt > 0) for (const c of circuit.comps) if (c.type === 'capacitor') c.vc = res.capV[c.id];
  res.events = events;
  return res;
}

// Runs the circuit for `seconds` of simulated time. Returns the last result and every event.
export function advance(circuit, seconds, dt = 0.001) {
  let res = null;
  const events = [];
  const n = Math.max(1, Math.round(seconds / dt)), t0 = circuit.t || 0;
  for (let k = 0; k < n; k++) { res = simulate(circuit, seconds / n); events.push(...res.events); }
  circuit.t = t0 + seconds;   // no floating point drift
  res.events = events;
  return res;
}

// Discharges every capacitor and rewinds the clock.
export function restart(circuit) {
  circuit.t = 0;
  for (const c of circuit.comps) if (c.type === 'capacitor') c.vc = 0;
}

// Voltage of hole a relative to hole b. A hole that is not part of the circuit reads 0.
export function voltageBetween(sim, a, b) {
  return (sim.nodeV[stripOf(a)] ?? 0) - (sim.nodeV[stripOf(b)] ?? 0);
}
