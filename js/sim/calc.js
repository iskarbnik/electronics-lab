// Pure calculator maths for the tools screen.
import { BAND_COLORS, BAND_GOLD } from './format.js';

export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
export const COLOR_NAMES = [
  { he: 'שחור', en: 'Black' }, { he: 'חום', en: 'Brown' }, { he: 'אדום', en: 'Red' }, { he: 'כתום', en: 'Orange' }, { he: 'צהוב', en: 'Yellow' },
  { he: 'ירוק', en: 'Green' }, { he: 'כחול', en: 'Blue' }, { he: 'סגול', en: 'Violet' }, { he: 'אפור', en: 'Grey' }, { he: 'לבן', en: 'White' },
];

// Smallest standard (E12) resistor value that is at least r.
export function nextStandard(r) {
  if (!(r > 0)) return NaN;
  let dec = Math.pow(10, Math.floor(Math.log10(r)) - 1);
  for (let k = 0; k < 3; k++) {
    for (const m of E12) if (m * dec >= r * (1 - 1e-9)) return +(m * dec).toPrecision(3);
    dec *= 10;
  }
  return NaN;
}

const ok = x => typeof x === 'number' && Number.isFinite(x);

// Ohm's law. Pass any two of { v, i, r }; returns all three and the power, or null.
export function solveOhm({ v, i, r }) {
  const have = [v, i, r].filter(ok).length;
  if (have !== 2) return null;
  let solved;
  if (!ok(v)) { if (r < 0 || i < 0) return null; v = i * r; solved = 'v'; }
  else if (!ok(i)) { if (!(r > 0)) return null; i = v / r; solved = 'i'; }
  else { if (!(i > 0)) return null; r = v / i; solved = 'r'; }
  return { v, i, r, p: v * i, solved };
}

// Series resistor for an LED: supply vs, LED forward voltage vf, wanted current i (A).
export function ledResistor(vs, vf, i) {
  if (!(ok(vs) && ok(vf) && ok(i)) || vs <= vf || i <= 0) return null;
  const r = (vs - vf) / i, std = nextStandard(r), actual = (vs - vf) / std;
  return { r, std, actual, power: actual * actual * std };
}

// Time constant, "fully charged" time (5 tau) and the RC filter corner frequency.
export function rcTau(r, c) {
  if (!(r > 0 && c > 0)) return null;
  const tau = r * c;
  return { tau, full: 5 * tau, fc: 1 / (2 * Math.PI * tau) };
}

// Colour bands to ohms. d1 and d2 are digit indexes 0..9, exp is the multiplier exponent (-2..7).
export const bandsToOhms = (d1, d2, exp) => (d1 * 10 + d2) * Math.pow(10, exp);

export const multiplierColor = exp => (exp >= 0 && exp <= 9 ? BAND_COLORS[exp] : exp === -1 ? BAND_GOLD : '#c0c0c0');

// Parses "4,7" or "4.7"; returns NaN for anything else.
export function parseNum(s) {
  const t = String(s).trim().replace(',', '.');
  return /^-?\d*\.?\d+(e-?\d+)?$/i.test(t) ? parseFloat(t) : NaN;
}
