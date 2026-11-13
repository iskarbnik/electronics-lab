// Number formatting with SI prefixes, and resistor colour bands.

const PREFIX = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ']];
const PREFIX_FARAD = [[1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];

export function fmt(value, unit) {
  const a = Math.abs(value);
  const list = unit === 'F' ? PREFIX_FARAD : PREFIX;
  const last = list[list.length - 1][0];
  if (a < last * 0.5) return `0 ${unit}`;
  for (const [mul, pre] of list) {
    if (a >= mul * 0.9995 || mul === last) {
      const n = value / mul;
      const digits = Math.abs(n) >= 99.95 ? 0 : Math.abs(n) >= 9.995 ? 1 : 2;
      return `${parseFloat(n.toFixed(digits))} ${pre}${unit}`;
    }
  }
}

export const BAND_COLORS = ['#1b1b1b', '#7a4a21', '#d93a2b', '#f08a24', '#f2d024', '#3f9b47', '#2f6fd0', '#8b4fc1', '#8c8c8c', '#f5f5f5'];
export const BAND_GOLD = '#c9a227';

// Returns the three colour bands (two digits and a multiplier) of a resistor value.
export function bands(r) {
  let exp = 0, n = r;
  while (n >= 100) { n /= 10; exp++; }
  while (n < 10) { n *= 10; exp--; }
  n = Math.round(n);
  const mult = exp >= 0 ? BAND_COLORS[exp] : exp === -1 ? BAND_GOLD : '#c0c0c0';
  return [BAND_COLORS[Math.floor(n / 10)], BAND_COLORS[n % 10], mult];
}
