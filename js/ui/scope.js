// Oscilloscope: a scrolling voltage-against-time trace for up to a few channels.
// config: { span: seconds on screen, vmax: volts at the top, ch: [{ hole, ref?, label, color }] }
import { fmt } from '../sim/format.js';
import { el, clear } from './svg.js';

const W = 400, H = 200, PAD = { l: 34, r: 8, t: 10, b: 20 };
const COLORS = ['#ffd23f', '#35d4ff', '#ff6bd6'];

export function createScope(host, config) {
  const span = config.span || 4, vmax = config.vmax || 10, vmin = config.vmin || 0;
  const chans = config.ch.map((c, k) => ({ ...c, color: c.color || COLORS[k % COLORS.length] }));
  const bufs = chans.map(() => []);
  const svg = el('svg', { class: 'scopesvg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Oscilloscope' });
  const gGrid = el('g'), gTrace = el('g'), gTxt = el('g');
  svg.append(gGrid, gTrace, gTxt);
  const x0 = PAD.l, x1 = W - PAD.r, y0 = PAD.t, y1 = H - PAD.b;
  const yOf = v => y1 - Math.max(-0.05, Math.min(1.05, (v - vmin) / (vmax - vmin))) * (y1 - y0);
  const DIV = vmin < 0 ? 6 : 5;
  for (let k = 0; k <= DIV; k++) {
    const v = vmin + (vmax - vmin) * k / DIV, y = yOf(v);
    gGrid.append(el('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'sgrid' + (Math.abs(v) < 1e-9 ? ' axis' : '') }));
    gGrid.append(el('text', { x: x0 - 4, y: y + 3, text: String(parseFloat(v.toFixed(1))), class: 'sticks', 'text-anchor': 'end' }));
  }
  const legend = el('div', { class: 'scopelegend' });
  host.append(svg, legend);
  const legendRefs = chans.map(c => {
    const b = el('span', { class: 'scopech' });
    b.style.setProperty('--ch', c.color);
    const name = el('i'), val = el('bdi', { dir: 'ltr', class: 'num' });
    b.append(name, val); legend.append(b);
    return { name, val, label: c.label };
  });
  let lastT = 0;

  return {
    // read(ch) returns the voltage of that channel right now
    push(t, read) {
      lastT = t;
      chans.forEach((c, k) => {
        const b = bufs[k];
        b.push([t, read(c)]);
        while (b.length > 2 && b[1][0] < t - span) b.shift();
      });
    },
    clear() { bufs.forEach(b => { b.length = 0; }); lastT = 0; this.draw(0); },
    draw(t = lastT) {
      clear(gTrace); clear(gTxt);
      const tEnd = Math.max(t, span), tStart = tEnd - span;
      const xOf = tt => x0 + (tt - tStart) / span * (x1 - x0);
      for (let k = 0; k <= span; k++) {
        const tt = Math.ceil(tStart) + k;
        if (tt > tEnd) break;
        gTrace.append(el('line', { x1: xOf(tt), y1: y0, x2: xOf(tt), y2: y1, class: 'sgrid' }));
        gTxt.append(el('text', { x: xOf(tt), y: H - 6, text: tt + ' s', class: 'sticks', 'text-anchor': 'middle' }));
      }
      bufs.forEach((b, k) => {
        if (b.length < 2) return;
        const d = b.map(([tt, v], j) => `${j ? 'L' : 'M'}${xOf(tt).toFixed(1)} ${yOf(v).toFixed(1)}`).join('');
        gTrace.append(el('path', { d, class: 'strace', stroke: chans[k].color }));
        const last = b[b.length - 1][1];
        legendRefs[k].val.textContent = fmt(Math.abs(last) < 5e-4 ? 0 : last, 'V');
      });
      legendRefs.forEach((r, k) => { r.name.textContent = r.label[document.documentElement.lang === 'he' ? 'he' : 'en'] || ''; });
    },
    destroy() { svg.remove(); legend.remove(); },
  };
}
