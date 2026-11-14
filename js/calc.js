// Pure calculator helpers for the tools page.

export const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const BAND_NAMES = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray', 'white'];

// Ohm's law: give any two of v (V), i (A), r (Ω); returns all three and the power, or null.
export function ohm({ v, i, r }) {
  const has = x => Number.isFinite(x);
  let out;
  if (has(v) && has(i) && !has(r)) out = { v, i, r: i === 0 ? Infinity : v / i };
  else if (has(v) && has(r) && !has(i)) out = { v, r, i: r === 0 ? Infinity : v / r };
  else if (has(i) && has(r) && !has(v)) out = { i, r, v: i * r };
  else return null;
  out.p = out.v * out.i;
  return out;
}

// Smallest E12 value at or above r.
export function e12Up(r) {
  if (!(r > 0)) return 0;
  const exp = Math.floor(Math.log10(r)), base = r / 10 ** exp;
  const hit = E12.find(x => x >= base - 1e-9);
  return hit === undefined ? 10 ** (exp + 1) : hit * 10 ** exp;
}

// Series resistor for an LED: supply vs (V), LED drop vf (V), wanted current i (A).
export function ledResistor(vs, vf, i) {
  if (!(vs > vf) || !(i > 0)) return null;
  const exact = (vs - vf) / i, std = e12Up(exact), actual = (vs - vf) / std;
  return { exact, std, actual, power: actual * actual * std };
}

export const divider = (vin, r1, r2) => (r1 + r2 > 0 ? vin * r2 / (r1 + r2) : 0);

export function rc(r, c) {
  const tau = r * c;
  return { tau, full: 5 * tau, fc: tau > 0 ? 1 / (2 * Math.PI * tau) : Infinity };
}

// Colour band indexes of a resistor value: [digit1, digit2, multiplier exponent], and the colour names.
export function bandCodes(r) {
  if (!(r > 0)) return null;
  let exp = 0, n = r;
  while (n >= 100) { n /= 10; exp++; }
  while (n < 10) { n *= 10; exp--; }
  n = Math.round(n);
  if (n === 100) { n = 10; exp++; }
  return { d1: Math.floor(n / 10), d2: n % 10, exp, names: [BAND_NAMES[Math.floor(n / 10)], BAND_NAMES[n % 10], exp >= 0 && exp <= 9 ? BAND_NAMES[exp] : exp === -1 ? 'gold' : exp === -2 ? 'silver' : null] };
}
