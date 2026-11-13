// Schematic view: standard symbols from the lesson's schematic description (grid unit = 20 px).
import { fmt } from '../sim/format.js';
import { stripOf } from '../sim/board.js';
import { el, clear, LED_COLORS, FlowLayer } from './svg.js';

const U = 20;
const GATE_BODY = {
  and: 'M-20 -20H0A20 20 0 0 1 0 20H-20Z',
  or: 'M-22 -20Q6 -20 20 0Q6 20 -22 20Q-10 0 -22 -20Z',
  xor: 'M-22 -20Q6 -20 20 0Q6 20 -22 20Q-10 0 -22 -20Z',
  not: 'M-14 -14V14L14 0Z',
};

function valueText(type, comp, plan) {
  const p = comp?.props || plan?.props || {};
  if (type === 'battery') return fmt(p.v ?? 9, 'V');
  if (type === 'resistor') return fmt(p.r ?? 470, 'Ω');
  if (type === 'pot') return fmt(p.r ?? 10000, 'Ω');
  if (type === 'gate') return String(p.fn ?? 'and').toUpperCase();
  return '';
}

// Symbols in local coordinates: pin0 at (-40, 0), pin1 at (40, 0).
function symbol(part, comp, plan, sim) {
  const g = el('g', { class: 'sym' });
  const line = (d, cls = '') => g.append(el('path', { d, class: 'wirep ' + cls }));
  const t = part.type;
  if (t === 'battery') {
    line('M-40 0H-6'); line('M6 0H40');
    g.append(el('path', { d: 'M-6 -17V17', class: 'plate long' }), el('path', { d: 'M6 -9V9', class: 'plate short' }));
    g.append(el('text', { x: -17, y: -10, text: '+', class: 'sch-plus', 'text-anchor': 'middle' }));
  } else if (t === 'resistor') {
    line('M-40 0H-22 L-18 -9 L-10 9 L-2 -9 L6 9 L14 -9 L18 0 H40', 'zig');
  } else if (t === 'led') {
    const col = comp?.props.color in LED_COLORS ? comp.props.color : (plan?.props?.color in LED_COLORS ? plan.props.color : 'red');
    const hex = LED_COLORS[col], s = sim?.comps[part.id];
    line('M-40 0H-10'); line('M10 0H40');
    if (s?.lit) g.append(el('circle', { cx: 0, cy: 0, r: 30, fill: `url(#sglow-${col})`, opacity: Math.min(1, 0.3 + s.brightness * 0.7) }));
    g.append(el('path', { d: 'M-10 -12V12L10 0Z', class: 'ledtri', fill: hex, 'fill-opacity': comp?.burned ? 0.15 : s?.lit ? 0.4 + 0.6 * s.brightness : 0.12, stroke: hex }));
    g.append(el('path', { d: 'M10 -12V12', class: 'plate' }));
    g.append(el('path', { d: 'M-2 -16L6 -24M-2 -16L1 -16M-2 -16L-2 -19 M6 -16L14 -24M6 -16L9 -16M6 -16L6 -19', class: 'arrows', stroke: hex }));
    if (comp?.burned) g.append(el('path', { d: 'M-8 -8L8 8M8 -8L-8 8', class: 'burnx' }));
  } else if (t === 'gate') {
    const fn = comp?.props.fn ?? plan?.props?.fn ?? 'and', s = sim?.comps[part.id];
    const inv = fn === 'nand' || fn === 'nor' || fn === 'not';
    const two = fn !== 'not', base = fn === 'nand' ? 'and' : fn === 'nor' ? 'or' : fn;
    const body = el('path', { d: GATE_BODY[base], class: 'gatesym' + (s?.out ? ' hi' : '') });
    if (two) { line('M-40 -10H-18'); line('M-40 10H-18'); if (fn === 'xor') { line('M-40 -10H-26'); line('M-40 10H-26'); } }
    else line('M-40 0H-14');
    g.append(body);
    if (fn === 'xor') line('M-28 -20Q-16 0-28 20');
    if (inv) { g.append(el('circle', { cx: fn === 'not' ? 18 : 24, cy: 0, r: 4, class: 'gatesym' + (s?.out ? ' hi' : '') })); line(`M${fn === 'not' ? 22 : 28} 0H40`); }
    else line('M20 0H40');
  } else if (t === 'button' || t === 'switch') {
    const pr = !!(comp?.props.pressed || comp?.props.on);
    line('M-40 0H-14'); line('M14 0H40');
    g.append(el('circle', { cx: -14, cy: 0, r: 3, class: 'contact' }), el('circle', { cx: 14, cy: 0, r: 3, class: 'contact' }));
    g.append(el('path', { d: pr ? 'M-14 0H14' : 'M-14 -2L12 -16', class: 'wirep bridge' + (pr ? ' on' : '') }));
  } else if (t === 'pot') {
    line('M-40 0H-24 L-20 -8 L-12 8 L-4 -8 L4 8 L12 -8 L20 8 L24 0 H40', 'zig');
    const pos = comp?.props.pos ?? 0.5;
    g.append(el('path', { d: 'M0 -40V-16', class: 'wirep' }), el('path', { d: 'M-5 -22L0 -14L5 -22', class: 'wirep' }));
  }
  return g;
}

export function createSchematicView(host, schematic, cb = {}) {
  const svg = el('svg', { class: 'schemsvg', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Schematic' });
  const defs = el('defs');
  for (const [name, col] of Object.entries(LED_COLORS)) defs.append(el('radialGradient', { id: 'sglow-' + name }, [
    el('stop', { offset: '0', 'stop-color': col, 'stop-opacity': '0.9' }), el('stop', { offset: '1', 'stop-color': col, 'stop-opacity': '0' })]));
  svg.append(defs);
  const gStatic = el('g'), gParts = el('g'), gFlowG = el('g');
  svg.append(gStatic, gParts, gFlowG);
  host.append(svg);
  const flow = new FlowLayer(gFlowG);

  // viewBox from the drawing
  const xs = [], ys = [];
  for (const p of schematic.parts) { const h = p.rot === 90 ? [0, 2] : [2, 0]; xs.push((p.x - h[0]) * U, (p.x + h[0]) * U); ys.push((p.y - h[1]) * U, (p.y + h[1]) * U); if (p.type === 'pot') ys.push((p.y - 2) * U); }
  for (const w of schematic.wires) for (const [x, y] of w.pts) { xs.push(x * U); ys.push(y * U); }
  const pad = 48;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad + 56, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);

  const polys = schematic.wires.map(w => { const pl = el('polyline', { points: w.pts.map(([x, y]) => `${x * U},${y * U}`).join(' '), class: 'swire' }); gStatic.append(pl); return pl; });
  for (const [x, y] of schematic.dots || []) gStatic.append(el('circle', { cx: x * U, cy: y * U, r: 4, class: 'sdot' }));

  function update(m) {
    const { circuit, sim } = m;
    const vcc = sim?.comps.BAT ? sim.comps.BAT.v : 9;
    schematic.wires.forEach((w, k) => {
      if (!w.net) return;
      const v = sim?.nodeV[stripOf(w.net)];
      polys[k].setAttribute('class', 'swire' + (v === undefined ? '' : v > vcc / 2 ? ' hi' : ' lo'));
    });
    clear(gParts);
    for (const part of schematic.parts) {
      const comp = circuit.comps.find(c => c.id === part.id);
      const plan = m.plan?.[part.id];
      const ghost = !comp;
      const s = comp ? sim?.comps[comp.id] : null;
      const g = el('g', { class: 'spart' + (ghost ? ' ghost' : '') + (m.selected === part.id ? ' sel' : ''), transform: `translate(${part.x * U} ${part.y * U}) rotate(${part.rot || 0})` });
      if (m.selected === part.id) g.append(el('rect', { x: -48, y: part.type === 'pot' ? -46 : -24, width: 96, height: part.type === 'pot' ? 70 : 48, rx: 10, class: 'selbox' }));
      g.append(symbol({ ...part }, comp, plan, sim));
      const hit = el('rect', { x: -44, y: part.type === 'pot' ? -44 : -26, width: 88, height: part.type === 'pot' ? 68 : 52, fill: 'transparent', class: 'hit' });
      g.append(hit);
      gParts.append(g);
      if (!ghost) hit.addEventListener('click', () => cb.onSelect?.(part.id));
      // labels, unrotated
      const rot90 = part.rot === 90;
      const lx = part.x * U + (rot90 ? 28 : 0), anchor = rot90 ? 'start' : 'middle';
      const ly = part.y * U + (rot90 ? -2 : part.type === 'pot' ? 28 : -22);
      const lab = el('g', { class: 'slabel' + (ghost ? ' ghost' : '') });
      const val = valueText(part.type, comp, plan);
      lab.append(el('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'sid' }, [el('tspan', { text: part.id }), val ? el('tspan', { text: '  ' + val, class: 'sval' }) : null]));
      if (s && Math.abs(s.i) > 50e-6 && !ghost) lab.append(el('text', { x: lx, y: ly + (rot90 ? 16 : (part.type === 'pot' ? 16 : 40)), 'text-anchor': anchor, class: 'scur', text: fmt(Math.abs(s.i), 'A') }));
      gParts.append(lab);
    }
    const items = [];
    schematic.wires.forEach((w, k) => {
      const s = sim?.comps[w.of];
      if (!s) return;
      const pts = (s.i * (w.dir ?? 1)) < 0 ? w.pts : w.pts;
      items.push({ key: 'w' + k, d: 'M' + pts.map(([x, y]) => `${x * U} ${y * U}`).join('L'), i: s.i * (w.dir ?? 1) });
    });
    // ghost-only circuits: hide flow for components that are not on the board
    flow.update(items.filter((it, k) => circuit.comps.some(c => c.id === schematic.wires[k].of)));
  }
  return { svg, update, destroy() { svg.remove(); } };
}
