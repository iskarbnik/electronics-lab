// Pure maths behind the calculators page.

// The twelve standard resistor values per decade that starter kits use.
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

// The closest standard value. With `up`, the closest one that is not smaller than r.
export function nearestE12(r, up = false) {
  if (!(r > 0)) return 0;
  let best = 0;
  for (let exp = -1; exp <= 7; exp++) {
    for (const base of E12) {
      const v = +(base * 10 ** (exp - 1)).toPrecision(2);
      if (up) { if (v >= r * (1 - 1e-9) && (!best || v < best)) best = v; }
      else if (!best || Math.abs(v - r) < Math.abs(best - r)) best = v;
    }
  }
  return best;
}

// Ohm's law: give any two of v, i, r and get all three plus the power.
export function ohm({ v, i, r }) {
  const has = x => Number.isFinite(x);
  if (has(v) && has(r) && r > 0) i = v / r;
  else if (has(i) && has(r)) v = i * r;
  else if (has(v) && has(i) && i !== 0) r = v / i;
  else return null;
  return { v, i, r, p: v * i };
}

// Resistor for an LED: supply volts, LED forward volts, wanted amps.
export function ledResistor(vs, vf, i) {
  if (!(vs > vf) || !(i > 0)) return null;
  const r = (vs - vf) / i, std = nearestE12(r, true), real = (vs - vf) / std;
  return { r, std, i: real, p: real * real * std };
}

// Time constant of a resistor and a capacitor, and the time to charge almost fully.
export function rcTime(r, c) {
  if (!(r > 0) || !(c > 0)) return null;
  return { tau: r * c, full: 5 * r * c };
}
