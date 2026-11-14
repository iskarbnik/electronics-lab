// A small oscilloscope: 10 divisions across, 0 to 5 V up (1 V per division), two channels.
import { el, clear } from './svg.js';

const W = 400, H = 200, DX = 10, DY = 5;
export const TIME_DIVS = [0.001, 0.002, 0.005, 0.02, 0.1, 0.5];   // seconds per division
const COLORS = ['#ffb224', '#4ad6ff'];

export function createScope(host) {
  const svg = el('svg', { class: 'scopesvg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Oscilloscope' });
  svg.append(el('rect', { x: 0, y: 0, width: W, height: H, class: 'scopebg' }));
  for (let k = 0; k <= DX; k++) svg.append(el('line', { x1: k * W / DX, x2: k * W / DX, y1: 0, y2: H, class: 'scopegrid' + (k === DX / 2 ? ' mid' : '') }));
  for (let k = 0; k <= DY; k++) svg.append(el('line', { x1: 0, x2: W, y1: k * H / DY, y2: k * H / DY, class: 'scopegrid' }));
  const g = el('g');
  svg.append(g);
  host.append(svg);
  // data: { t: [], a: [], b: [] } (seconds, volts), now: newest time. Draws the last 10 divisions.
  function draw(data, tdiv, frozenAt) {
    clear(g);
    const n = data.t.length;
    if (!n) return;
    const end = frozenAt ?? data.t[n - 1], span = tdiv * DX, start = end - span;
    ['a', 'b'].forEach((ch, ci) => {
      if (data[ch][0] === null) return;
      const pts = [];
      let lo = 0;
      while (lo < n && data.t[lo] < start) lo++;
      lo = Math.max(0, lo - 1);
      const step = Math.max(1, Math.floor((n - lo) / 800));
      const y = v => (H - Math.max(0, Math.min(5.5, v)) / 5 * H).toFixed(1), x = tt => ((tt - start) / span * W).toFixed(1);
      let prev = null;
      for (let k = lo; k < n; k += step) {
        if (data.t[k] > end) break;
        if (prev !== null) pts.push(`${x(data.t[k])},${y(prev)}`);       // hold the old value up to the new sample, then step
        pts.push(`${x(data.t[k])},${y(data[ch][k])}`);
        prev = data[ch][k];
      }
      if (pts.length > 1) g.append(el('polyline', { points: pts.join(' '), fill: 'none', stroke: COLORS[ci], 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    });
  }
  return { svg, draw, destroy() { svg.remove(); } };
}
