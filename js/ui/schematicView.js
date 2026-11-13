// Schematic view: standard symbols from the lesson's schematic description (grid unit = 20 px).
import { fmt } from '../sim/format.js';
import { el, clear, LED_COLORS, FlowLayer } from './svg.js';

const U = 20;

function valueText(type, comp, plan) {
  const p = comp?.props || plan?.props || {};
  if (type === 'battery') return fmt(p.v ?? 9, 'V');
  if (type === 'resistor') return fmt(p.r ?? 470, 'Ω');
  if (type === 'pot') return fmt(p.r ?? 10000, 'Ω');
  if (type === 'capacitor') return fmt(p.c ?? 100e-6, 'F');
  return '';
}

// Symbols in local coordinates: pin0 at (-40, 0), pin1 at (40, 0).
export function symbol(part, comp, plan, sim) {
  const g = el('g', { class: 'sym' });
  const line = (d, cls = '') => g.append(el('path', { d, class: 'wirep ' + cls }));
  const t = part.type;
  if (t === 'wire') {
    line('M-40 0H40');
  } else if (t === 'battery') {
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
  } else if (t === 'button') {
    const pr = !!comp?.props.pressed;
    line('M-40 0H-14'); line('M14 0H40');
    g.append(el('circle', { cx: -14, cy: 0, r: 3, class: 'contact' }), el('circle', { cx: 14, cy: 0, r: 3, class: 'contact' }));
    g.append(el('path', { d: pr ? 'M-14 0H14' : 'M-14 -2L12 -16', class: 'wirep bridge' + (pr ? ' on' : '') }));
  } else if (t === 'capacitor') {
    const s = sim?.comps[part.id], v = s?.v || 0;
    line('M-40 0H-5'); line('M5 0H40');
    g.append(el('path', { d: 'M-5 -16V16', class: 'plate long' }), el('path', { d: 'M5 -16V16', class: 'plate long' }));
    if (Math.abs(v) > 0.05) g.append(el('rect', { x: -4, y: -15, width: 8, height: 30, class: 'capfill', opacity: Math.min(0.7, Math.abs(v) / 9 * 0.7) }));
    g.append(el('text', { x: -16, y: -10, text: '+', class: 'sch-plus', 'text-anchor': 'middle' }));
  } else if (t === 'diode') {
    const on = !!sim?.comps[part.id]?.conducting;
    line('M-40 0H-10'); line('M10 0H40');
    g.append(el('path', { d: 'M-10 -12V12L10 0Z', class: 'ledtri', fill: on ? '#ffb224' : 'none', 'fill-opacity': on ? 0.5 : 0, stroke: 'currentColor' }));
    g.append(el('path', { d: 'M10 -12V12', class: 'plate' }));
    if (comp?.burned) g.append(el('path', { d: 'M-8 -8L8 8M8 -8L-8 8', class: 'burnx' }));
  } else if (t === 'npn') {
    // terminals: base (-40, 0), collector (20, -40), emitter (20, 40)
    const st = sim?.comps[part.id]?.state;
    g.append(el('circle', { cx: 4, cy: 0, r: 27, class: 'npncircle' + (st === 'active' || st === 'sat' ? ' on' : '') }));
    line('M-40 0H-6'); line('M20 -40V-22L-6 -8'); line('M-6 8L20 22V40');
    g.append(el('path', { d: 'M-6 -16V16', class: 'plate long' }));
    g.append(el('path', { d: 'M8 16.5L20 22L13 12Z', class: 'arrowhead' }));
    for (const [x, y, ch] of [[-44, 12, 'B'], [26, -34, 'C'], [26, 40, 'E']]) g.append(el('text', { x, y, text: ch, class: 'pinlab', 'text-anchor': 'middle' }));
  } else if (t === 'gen') {
    const sine = (comp?.props.wave ?? plan?.props?.wave) === 'sine';
    line('M-40 0H-18'); line('M18 0H40');
    g.append(el('circle', { cx: 0, cy: 0, r: 18, class: 'gencircle' }));
    g.append(el('path', { d: sine ? 'M-11 0q5.5 -12 11 0t11 0' : 'M-11 6V-6H0V6H11V-6', class: 'genwave' }));
    g.append(el('text', { x: -28, y: -8, text: '+', class: 'sch-plus', 'text-anchor': 'middle' }));
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
  for (const p of schematic.parts) { const h = p.rot === 90 ? [0, 2] : [2, 0]; xs.push((p.x - h[0]) * U, (p.x + h[0]) * U); ys.push((p.y - h[1]) * U, (p.y + h[1]) * U); if (p.type === 'pot') ys.push((p.y - 2) * U); if (p.type === 'npn') ys.push((p.y - 2) * U, (p.y + 2) * U); }
  for (const w of schematic.wires) for (const [x, y] of w.pts) { xs.push(x * U); ys.push(y * U); }
  const pad = 48;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad + 56, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);

  for (const w of schematic.wires) gStatic.append(el('polyline', { points: w.pts.map(([x, y]) => `${x * U},${y * U}`).join(' '), class: 'swire' }));
  for (const [x, y] of schematic.dots || []) gStatic.append(el('circle', { cx: x * U, cy: y * U, r: 4, class: 'sdot' }));

  function update(m) {
    const { circuit, sim } = m;
    clear(gParts);
    for (const part of schematic.parts) {
      const comp = circuit.comps.find(c => c.id === part.id);
      const plan = m.plan?.[part.id];
      const ghost = !comp;
      const s = comp ? sim?.comps[comp.id] : null;
      const g = el('g', { class: 'spart' + (ghost ? ' ghost' : '') + (m.selected === part.id ? ' sel' : ''), transform: `translate(${part.x * U} ${part.y * U}) rotate(${part.rot || 0})` });
      const tall = part.type === 'npn';
      if (m.selected === part.id) g.append(el('rect', { x: -48, y: part.type === 'pot' ? -46 : tall ? -46 : -24, width: 96, height: part.type === 'pot' ? 70 : tall ? 92 : 48, rx: 10, class: 'selbox' }));
      g.append(symbol({ ...part }, comp, plan, sim));
      const hit = el('rect', { x: -44, y: part.type === 'pot' ? -44 : tall ? -44 : -26, width: 88, height: part.type === 'pot' ? 68 : tall ? 88 : 52, fill: 'transparent', class: 'hit' });
      g.append(hit);
      gParts.append(g);
      if (!ghost) hit.addEventListener('click', () => cb.onSelect?.(part.id));
      // labels, unrotated
      const rot90 = part.rot === 90;
      const lx = part.x * U + (rot90 ? 28 : part.type === 'npn' ? -26 : 0), anchor = rot90 ? 'start' : 'middle';
      const isN = part.type === 'npn';
      const ly = part.y * U + (rot90 ? -2 : part.type === 'pot' ? 28 : isN ? -30 : -22);
      const lab = el('g', { class: 'slabel' + (ghost ? ' ghost' : '') });
      const val = valueText(part.type, comp, plan);
      lab.append(el('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'sid' }, [el('tspan', { text: part.id }), val ? el('tspan', { text: '  ' + val, class: 'sval' }) : null]));
      if (s && Math.abs(s.i) > 50e-6 && !ghost) lab.append(el('text', { x: lx, y: ly + (rot90 ? 16 : (part.type === 'pot' || isN ? 16 : 40)), 'text-anchor': anchor, class: 'scur', text: fmt(Math.abs(s.i), 'A') }));
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
