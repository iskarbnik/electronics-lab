// Breadboard view: static board drawn once, dynamic layer redrawn on every update, geometry-based input.
import { COLS, ROW_Y, BOARD, BATTERY, TERMINALS, VIEW, holePos, holesOfStrip, nearestHole, ALL_HOLES, stripOf } from '../sim/board.js';
import { bands, BAND_GOLD, fmt } from '../sim/format.js';
import { el, clear, LED_COLORS, WIRE_COLORS, FlowLayer, distToSegment } from './svg.js';

const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------- geometry helpers (also used by the player) ----------
const pinPos = c => c.pins.map(holePos);
export const THREE_PIN = new Set(['pot', 'npn']);
export function potBody(c) {
  const [a, w, b] = pinPos(c);
  return { x: a.x - 14, y: w.y - 48, w: b.x - a.x + 28, h: 34 };
}

export function stripBox(strip) {
  if (strip === 'BAT+' || strip === 'BAT-') { const p = TERMINALS[strip]; return { x: p.x - 13, y: p.y - 13, w: 26, h: 26, round: true }; }
  const hs = holesOfStrip(strip).map(holePos);
  const xs = hs.map(p => p.x), ys = hs.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x: x0 - 11, y: y0 - 11, w: x1 - x0 + 22, h: y1 - y0 + 22 };
}

// Bounding box of what a comp looks like, for guides and focusing.
export function compBox(c) {
  if (c.type === 'battery') return { ...BATTERY };
  if (THREE_PIN.has(c.type)) { const b = potBody(c); const [a, , p2] = pinPos(c); return { x: b.x, y: b.y, w: b.w, h: a.y - b.y + 12 }; }
  const ps = pinPos(c);
  const x0 = Math.min(...ps.map(p => p.x)), x1 = Math.max(...ps.map(p => p.x));
  const y0 = Math.min(...ps.map(p => p.y)), y1 = Math.max(...ps.map(p => p.y));
  return { x: x0 - 14, y: y0 - 14, w: x1 - x0 + 28, h: y1 - y0 + 28 };
}

// The component under a point: non-wires first, wires after. Battery by its rectangle, pot by its body.
export function hitComp(circuit, x, y, max = 10) {
  let best = null, bd = Infinity;
  for (const pass of [false, true]) {
    for (const c of circuit.comps) {
      if ((c.type === 'wire') !== pass) continue;
      let d = Infinity;
      if (c.type === 'battery') d = x >= BATTERY.x && x <= BATTERY.x + BATTERY.w && y >= BATTERY.y && y <= BATTERY.y + BATTERY.h ? 0 : Infinity;
      else if (THREE_PIN.has(c.type)) { const b = potBody(c); d = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h ? 0 : Infinity; }
      else if (c.type === 'button' || c.type === 'gen') { const [a, b] = pinPos(c); d = Math.min(Math.hypot(x - (a.x + b.x) / 2, y - (a.y + b.y) / 2) - 8, distToSegment(x, y, a, b)); }
      else { const [a, b] = pinPos(c); d = distToSegment(x, y, a, b); }
      if (d <= max && d < bd) { bd = d; best = c.id; }
    }
    if (best) return best;
  }
  return null;
}
const hitButtonBody = (circuit, x, y) => {
  for (const c of circuit.comps) if (c.type === 'button') {
    const [a, b] = pinPos(c);
    if (Math.hypot(x - (a.x + b.x) / 2, y - (a.y + b.y) / 2) <= 15) return c.id;
  }
  return null;
};

// ---------- static layer ----------
function buildStatic(g) {
  const hole = (x, y) => el('rect', { x: x - 4, y: y - 4, width: 8, height: 8, rx: 1.5, class: 'hole' });
  g.append(el('rect', { x: BOARD.x, y: BOARD.y, width: BOARD.w, height: BOARD.h, rx: 12, class: 'board' }));
  g.append(el('rect', { x: 12, y: 176, width: BOARD.w - 24, height: 8, rx: 3, class: 'groove' }));
  const lines = [[9, 'red'], [51, 'blue'], [309, 'red'], [351, 'blue']];
  for (const [y, c] of lines) g.append(el('line', { x1: 14, x2: BOARD.w - 14, y1: y, y2: y, class: 'railline ' + c }));
  for (const id of ALL_HOLES) { if (id.startsWith('BAT')) continue; const p = holePos(id); g.append(hole(p.x, p.y)); }
  const lab = (x, y, text, cls = 'lbl', anchor = 'middle') => g.append(el('text', { x, y, text, class: cls, 'text-anchor': anchor }));
  for (const [row, sign] of [['p+', '+'], ['p-', '-'], ['q+', '+'], ['q-', '-']]) {
    lab(18, ROW_Y[row] + 4, sign === '-' ? '−' : '+', 'lbl rail ' + (sign === '+' ? 'pos' : 'neg'));
  }
  for (const r of 'abcdefghij') { lab(18, ROW_Y[r] + 3.5, r); lab(BOARD.w - 18, ROW_Y[r] + 3.5, r); }
  for (let c = 1; c <= COLS; c++) if (c === 1 || c % 5 === 0) {
    const x = holePos('a' + c).x;
    lab(x, 68, c); lab(x, 300, c);
  }
  // battery
  const B = BATTERY;
  g.append(el('path', { d: `M-125 ${B.y} V10 H-40`, class: 'lead red' }));
  g.append(el('path', { d: `M-85 ${B.y} V50 H-40`, class: 'lead black' }));
  g.append(el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, rx: 8, class: 'battery' }));
  g.append(el('rect', { x: B.x + 8, y: B.y + 14, width: B.w - 16, height: 46, rx: 4, class: 'batlabel' }));
  g.append(el('text', { x: B.x + B.w / 2, y: B.y + 45, text: '9 V', class: 'battext', 'text-anchor': 'middle' }));
  g.append(el('circle', { cx: -125, cy: B.y, r: 8, class: 'snap' }));
  g.append(el('circle', { cx: -85, cy: B.y, r: 8, class: 'snap' }));
  g.append(el('text', { x: -125, y: B.y + 30 + 40, text: '+', class: 'bsign pos', 'text-anchor': 'middle' }));
  g.append(el('text', { x: -85, y: B.y + 30 + 40, text: '−', class: 'bsign neg', 'text-anchor': 'middle' }));
  for (const [id, cls, sign] of [['BAT+', 'pos', '+'], ['BAT-', 'neg', '−']]) {
    const p = TERMINALS[id];
    g.append(el('circle', { cx: p.x, cy: p.y, r: 9, class: 'post' }));
    g.append(el('circle', { cx: p.x, cy: p.y, r: 4, class: 'postin' }));
    g.append(el('text', { x: p.x + 16, y: p.y + 4, text: sign, class: 'bsign ' + cls }));
  }
}

// ---------- the view ----------
export function createBoardView(host, cb = {}) {
  const svg = el('svg', { class: 'boardsvg', viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Breadboard' });
  const defs = el('defs');
  for (const [name, col] of Object.entries(LED_COLORS)) {
    defs.append(el('radialGradient', { id: 'glow-' + name }, [
      el('stop', { offset: '0', 'stop-color': col, 'stop-opacity': '0.95' }),
      el('stop', { offset: '0.45', 'stop-color': col, 'stop-opacity': '0.35' }),
      el('stop', { offset: '1', 'stop-color': col, 'stop-opacity': '0' })]));
  }
  defs.append(el('radialGradient', { id: 'glow-hot' }, [
    el('stop', { offset: '0', 'stop-color': '#ff3b1f', 'stop-opacity': '0.9' }),
    el('stop', { offset: '1', 'stop-color': '#ff3b1f', 'stop-opacity': '0' })]));
  svg.append(defs);
  const gStatic = el('g'), gBelow = el('g'), gComps = el('g'), gFlowG = el('g'), gTop = el('g');
  svg.append(gStatic, gBelow, gComps, gFlowG, gTop);
  buildStatic(gStatic);
  host.append(svg);
  const flow = new FlowLayer(gFlowG);
  let model = null;
  const burnedAt = new Map();

  // ----- view box -----
  let view = { ...VIEW }, target = null, userMoved = false, anim = null;
  const size = () => { const r = svg.getBoundingClientRect(); return { w: r.width || 1, h: r.height || 1 }; };
  const norm = rect => {
    const { w: cw, h: ch } = size(), ar = cw / ch;
    let { x, y, w, h } = rect;
    const cx = x + w / 2, cy = y + h / 2;
    if (w / h < ar) w = h * ar; else h = w / ar;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };
  const clampView = v => {
    const full = norm(VIEW);
    const w = Math.max(90, Math.min(full.w, v.w)), h = w * v.h / v.w;
    let cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    cx = Math.max(VIEW.x, Math.min(VIEW.x + VIEW.w, cx)); cy = Math.max(VIEW.y, Math.min(VIEW.y + VIEW.h, cy));
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };
  const put = v => { view = v; svg.setAttribute('viewBox', `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`); };
  const goto = (rect, animate = true) => {
    const to = clampView(norm(rect));
    cancelAnimationFrame(anim);
    if (!animate || reduceMotion()) return put(to);
    const from = { ...view }, t0 = performance.now(), D = 320;
    const step = now => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      put({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const narrow = () => host.clientWidth < 640;
  const apply = animate => goto(narrow() && target ? target : VIEW, animate);
  const ro = new ResizeObserver(() => { if (userMoved) put(clampView(norm(view))); else apply(false); });
  ro.observe(host);

  const toSvg = (cx, cy) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const zoomAt = (cx, cy, f) => {
    const r = svg.getBoundingClientRect();
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    const px = view.x + fx * view.w, py = view.y + fy * view.h;
    const w = view.w * f, h = view.h * f;
    userMoved = true;
    put(clampView({ x: px - fx * w, y: py - fy * h, w, h }));
  };
  const panBy = (dx, dy) => {
    const r = svg.getBoundingClientRect(), k = view.w / r.width;
    userMoved = true;
    put(clampView({ x: view.x - dx * k, y: view.y - dy * k, w: view.w, h: view.h }));
  };

  // ----- input -----
  const ptrs = new Map();
  let g = null, pinch = null;
  const rubber = el('line', { class: 'rubber', visibility: 'hidden' });
  gTop.append(rubber);
  const endPress = () => { if (g?.mode === 'press') cb.onPress?.(g.comp, false); };
  svg.addEventListener('pointerdown', e => {
    cancelAnimationFrame(anim);
    try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      endPress(); g = { mode: 'pinch', moved: true };
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    if (ptrs.size > 2) return;
    const p = toSvg(e.clientX, e.clientY);
    g = { mode: 'pending', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, pointerType: e.pointerType, button: e.button };
    const bc = model && e.button === 0 ? hitButtonBody(model.circuit, p.x, p.y) : null;
    if (bc) { g.mode = 'press'; g.comp = bc; cb.onPress?.(bc, true); }
    else if (e.pointerType === 'mouse' && e.button === 0) g.startHole = nearestHole(p.x, p.y, 8);
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !g) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.mode === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      panBy(mx - pinch.mx, my - pinch.my);
      if (d > 0 && pinch.d > 0) zoomAt(mx, my, pinch.d / d);
      pinch = { d, mx, my };
      return;
    }
    if (g.mode === 'press') return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 8) {
      g.moved = true;
      g.mode = g.startHole ? 'dragwire' : 'pan';
    }
    if (g.mode === 'pan') { panBy(e.clientX - g.lx, e.clientY - g.ly); g.lx = e.clientX; g.ly = e.clientY; }
    else if (g.mode === 'dragwire') {
      const a = holePos(g.startHole), p = toSvg(e.clientX, e.clientY);
      rubber.setAttribute('x1', a.x); rubber.setAttribute('y1', a.y); rubber.setAttribute('x2', p.x); rubber.setAttribute('y2', p.y);
      rubber.setAttribute('visibility', 'visible');
    }
  });
  const finish = (e, cancelled) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    rubber.setAttribute('visibility', 'hidden');
    if (!g) return;
    if (g.mode === 'pinch') { if (ptrs.size === 0) g = null; return; }
    const cur = g; g = null;
    if (cur.mode === 'press') { cb.onPress?.(cur.comp, false); if (!cancelled && !cur.moved) cb.onTap?.({ ...toSvg(e.clientX, e.clientY), comp: cur.comp }); return; }
    if (cancelled) return;
    if (!cur.moved) cb.onTap?.(toSvg(e.clientX, e.clientY));
    else if (cur.mode === 'dragwire') {
      const p = toSvg(e.clientX, e.clientY), h2 = nearestHole(p.x, p.y, 8);
      if (h2 && h2 !== cur.startHole) { cb.onTap?.({ hole: cur.startHole }); cb.onTap?.({ hole: h2 }); }
    }
  };
  svg.addEventListener('pointerup', e => finish(e, false));
  svg.addEventListener('pointercancel', e => finish(e, true));
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  svg.addEventListener('contextmenu', e => e.preventDefault());

  // ----- dynamic drawing -----
  const ringEl = (strip, kind) => {
    const b = stripBox(strip);
    return b.round ? el('circle', { cx: b.x + 13, cy: b.y + 13, r: 14, class: 'ring ' + kind }) : el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 9, class: 'ring ' + kind });
  };
  const halo = (c, cls) => {
    if (c.type === 'battery') return el('rect', { x: BATTERY.x - 5, y: BATTERY.y - 5, width: BATTERY.w + 10, height: BATTERY.h + 10, rx: 12, class: cls });
    if (THREE_PIN.has(c.type)) { const b = potBody(c); const [a] = pinPos(c); return el('rect', { x: b.x - 5, y: b.y - 5, width: b.w + 10, height: a.y - b.y + 16, rx: 10, class: cls }); }
    const [a, b] = pinPos(c);
    return el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls + ' line' });
  };
  const plug = (p, cls = 'plug') => el('circle', { cx: p.x, cy: p.y, r: 3.6, class: cls });

  function drawComp(c, st) {
    const ps = pinPos(c);
    const grp = el('g', { 'data-id': c.id });
    if (c.type === 'wire') {
      const [a, b] = ps, col = WIRE_COLORS[c.props.color] || WIRE_COLORS.red;
      grp.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 7.5, 'stroke-linecap': 'round' }));
      grp.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: col, 'stroke-width': 5.5, 'stroke-linecap': 'round' }));
      grp.append(el('line', { x1: a.x, y1: a.y - 1.2, x2: b.x, y2: b.y - 1.2, stroke: '#fff', 'stroke-opacity': 0.25, 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
      grp.append(plug(a, 'plug dark'), plug(b, 'plug dark'));
    } else if (c.type === 'resistor') {
      const [a, b] = ps, d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const L = Math.min(34, d - 10), bd = bands(c.props.r), r = el('g', { transform: `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${ang})` });
      r.append(el('line', { x1: -d / 2, y1: 0, x2: d / 2, y2: 0, class: 'leg' }));
      if (st.hot) r.append(el('rect', { x: -L / 2 - 3, y: -9, width: L + 6, height: 18, rx: 8, fill: '#ff3b1f', opacity: 0.55, class: 'hotpulse' }));
      r.append(el('rect', { x: -L / 2, y: -6, width: L, height: 12, rx: 5, class: 'resbody' + (st.hot ? ' hot' : '') }));
      const xs = [-L / 2 + 8, -L / 2 + 14, -L / 2 + 20], cols = [...bd];
      xs.forEach((x, k) => r.append(el('rect', { x: x - 1.5, y: -6, width: 3, height: 12, fill: cols[k] })));
      r.append(el('rect', { x: L / 2 - 6.5, y: -6, width: 3, height: 12, fill: BAND_GOLD }));
      grp.append(r, plug(a), plug(b));
    } else if (c.type === 'led') {
      const [a, b] = ps, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const col = c.props.color in LED_COLORS ? c.props.color : 'red', hex = LED_COLORS[col];
      const s = st.sim || {}, br = c.burned ? 0 : (s.brightness || 0);
      grp.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'leg' }));
      if (br > 0.02) grp.append(el('circle', { cx: m.x, cy: m.y, r: 38, fill: `url(#glow-${col})`, opacity: Math.min(1, 0.25 + br * 0.75), class: 'ledglow' }));
      const dx = b.x - a.x, dy = b.y - a.y, dl = Math.hypot(dx, dy) || 1;
      const ux = dx / dl, uy = dy / dl;
      grp.append(el('circle', { cx: m.x, cy: m.y, r: 11, fill: c.burned ? '#2a2522' : hex, 'fill-opacity': c.burned ? 1 : 0.38 + 0.62 * br, stroke: c.burned ? '#6b5d52' : hex, 'stroke-width': 2, 'stroke-opacity': 0.9 }));
      if (!c.burned) grp.append(el('ellipse', { cx: m.x - 3, cy: m.y - 4, rx: 3.5, ry: 2.2, fill: '#fff', opacity: 0.35 + 0.4 * br }));
      grp.append(plug(a), plug(b));
      grp.append(el('text', { x: a.x + ux * 17 - uy * 0 + (Math.abs(uy) > 0.5 ? 11 : 0), y: a.y + uy * 17 + (Math.abs(uy) > 0.5 ? 4 : -9), text: '+', class: 'anode' }));
      if (c.burned) {
        grp.append(el('path', { d: `M${m.x - 6} ${m.y - 6}L${m.x + 6} ${m.y + 6}M${m.x + 6} ${m.y - 6}L${m.x - 6} ${m.y + 6}`, stroke: '#ff6b5e', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
        if (!burnedAt.has(c.id)) burnedAt.set(c.id, performance.now());
        const age = (performance.now() - burnedAt.get(c.id)) / 1000;
        if (age < 3) for (let k = 0; k < 3; k++) grp.append(el('circle', { cx: m.x + (k - 1) * 5, cy: m.y - 12, r: 5, class: 'smoke', style: `animation-delay:${(k * 0.45 - age).toFixed(2)}s` }));
      }
    } else if (c.type === 'button') {
      const [a, b] = ps, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, pr = !!c.props.pressed;
      grp.append(el('line', { x1: a.x, y1: a.y, x2: m.x, y2: m.y, class: 'leg' }), el('line', { x1: b.x, y1: b.y, x2: m.x, y2: m.y, class: 'leg' }));
      grp.append(el('rect', { x: m.x - 14, y: m.y - 14, width: 28, height: 28, rx: 5, class: 'btnbody' }));
      for (const [sx, sy] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) grp.append(el('circle', { cx: m.x + sx, cy: m.y + sy, r: 1.6, class: 'btnscrew' }));
      if (!pr) grp.append(el('circle', { cx: m.x + 1, cy: m.y + 2.5, r: 10, fill: '#000', opacity: 0.45 }));
      grp.append(el('circle', { cx: m.x, cy: m.y + (pr ? 1.5 : 0), r: pr ? 7 : 9.5, class: 'btncap' + (pr ? ' down' : '') }));
      grp.append(plug(a), plug(b));
    } else if (c.type === 'capacitor') {
      const [a, b] = ps, d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const L = Math.min(30, d - 8), s = st.sim || {}, lvl = Math.max(-1, Math.min(1, (s.v || 0) / 9));
      const r = el('g', { transform: `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${ang})` });
      r.append(el('line', { x1: -d / 2, y1: 0, x2: d / 2, y2: 0, class: 'leg' }));
      r.append(el('rect', { x: -L / 2, y: -10, width: L, height: 20, rx: 4, class: 'capbody' }));
      r.append(el('rect', { x: -L / 2 + 2, y: 6.5, width: Math.max(0, (L - 4) * Math.abs(lvl)), height: 2.6, rx: 1.3, class: 'capcharge' + (lvl < 0 ? ' neg' : '') }));
      r.append(el('rect', { x: L / 2 - 6, y: -10, width: 6, height: 20, rx: 2, class: 'capstripe' }));
      r.append(el('text', { x: -L / 2 + 3, y: -2, text: fmt(c.props.c, 'F'), class: 'captext' }));
      grp.append(r, plug(a), plug(b));
    } else if (c.type === 'diode') {
      const [a, b] = ps, d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const L = Math.min(24, d - 8), on = !!(st.sim && st.sim.conducting);
      const r = el('g', { transform: `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${ang})` });
      r.append(el('line', { x1: -d / 2, y1: 0, x2: d / 2, y2: 0, class: 'leg' }));
      r.append(el('rect', { x: -L / 2, y: -5.5, width: L, height: 11, rx: 3, class: 'diodebody' + (c.burned ? ' burnt' : '') }));
      r.append(el('rect', { x: L / 2 - 6, y: -5.5, width: 4, height: 11, class: 'diodeband' + (on ? ' on' : '') }));
      grp.append(r, plug(a), plug(b));
      if (c.burned) grp.append(el('path', { d: `M${(a.x + b.x) / 2 - 6} ${(a.y + b.y) / 2 - 6}l12 12m0 -12l-12 12`, stroke: '#ff6b5e', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    } else if (c.type === 'npn') {
      const body = potBody(c), [pb, pc, pe] = ps, s = st.sim || {};
      for (const p of ps) grp.append(el('line', { x1: p.x, y1: p.y, x2: p.x, y2: body.y + body.h, class: 'leg' }));
      const x0 = body.x + 4, x1 = body.x + body.w - 4, yb = body.y + body.h, w = x1 - x0, cx = (x0 + x1) / 2;
      grp.append(el('path', { d: `M${x0} ${yb}V${yb - 12}A${w / 2} ${w / 2} 0 0 1 ${x1} ${yb - 12}V${yb}Z`, class: 'npnbody' + (c.burned ? ' burnt' : '') }));
      grp.append(el('text', { x: cx, y: yb - 5, text: 'NPN', class: 'npntext', 'text-anchor': 'middle' }));
      if (s.state === 'active' || s.state === 'sat') grp.append(el('circle', { cx, cy: yb - 22, r: 3, class: 'npnon' + (s.state === 'sat' ? ' sat' : '') }));
      for (const [p, ch] of [[pb, 'B'], [pc, 'C'], [pe, 'E']]) grp.append(el('text', { x: p.x, y: p.y - 16 + (yb - body.y > 0 ? 0 : 0), text: ch, class: 'pinlab', 'text-anchor': 'middle' }));
      for (const p of ps) grp.append(plug(p));
      if (c.burned) grp.append(el('path', { d: `M${cx - 7} ${yb - 20}l14 14m0 -14l-14 14`, stroke: '#ff6b5e', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    } else if (c.type === 'gen') {
      const [a, b] = ps, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      grp.append(el('line', { x1: a.x, y1: a.y, x2: m.x, y2: m.y, class: 'leg' }), el('line', { x1: b.x, y1: b.y, x2: m.x, y2: m.y, class: 'leg' }));
      grp.append(el('rect', { x: m.x - 14, y: m.y - 14, width: 28, height: 28, rx: 5, class: 'genbody' }));
      grp.append(el('path', { d: c.props.wave === 'sine' ? `M${m.x - 9} ${m.y}q4.5 -10 9 0t9 0` : `M${m.x - 9} ${m.y + 5}V${m.y - 5}H${m.x}V${m.y + 5}H${m.x + 9}V${m.y - 5}`, class: 'genwave' }));
      grp.append(plug(a), plug(b));
      grp.append(el('text', { x: a.x, y: a.y - 9, text: '+', class: 'anode', 'text-anchor': 'middle' }));
    } else if (c.type === 'pot') {
      const body = potBody(c), [pa, pw, pb] = ps;
      for (const p of ps) grp.append(el('line', { x1: p.x, y1: p.y, x2: p.x, y2: body.y + body.h, class: 'leg' }));
      grp.append(el('rect', { x: body.x, y: body.y, width: body.w, height: body.h, rx: 6, class: 'potbody' }));
      grp.append(el('text', { x: body.x + 8, y: body.y + body.h - 6, text: fmt(c.props.r, 'Ω'), class: 'pottext' }));
      const kx = pw.x, ky = body.y + body.h / 2, ang = -135 + 270 * c.props.pos;
      grp.append(el('circle', { cx: kx, cy: ky, r: 12.5, class: 'knob' }));
      grp.append(el('line', { x1: kx, y1: ky, x2: kx, y2: ky - 10, class: 'knobptr', transform: `rotate(${ang} ${kx} ${ky})` }));
      for (const p of [pa, pw, pb]) grp.append(plug(p));
    }
    return grp;
  }

  function update(m) {
    model = m;
    const { circuit, sim } = m;
    clear(gBelow); clear(gComps); clear(gTop.parentNode === svg ? gTop : gTop);
    gTop.append(rubber);
    const gd = m.guides || {};
    for (const r of gd.rings || []) gBelow.append(ringEl(r.strip, r.kind || 'target'));
    for (const s of m.tapped || []) {
      gBelow.append(ringEl(s, 'tapped'));
      for (const h of holesOfStrip(s)) { const p = holePos(h); gBelow.append(el('circle', { cx: p.x, cy: p.y, r: 5.2, class: 'tapdot' })); }
    }
    if (gd.compRing) { const c = circuit.comps.find(x => x.id === gd.compRing); if (c) gBelow.append(halo(c, 'compring')); }
    const sel = m.selected;
    for (const c of circuit.comps) {
      if (c.type === 'battery') { if (sel === c.id) gBelow.append(halo(c, 'selhalo')); continue; }
      if (sel === c.id) gBelow.append(halo(c, 'selhalo'));
      const s = sim?.comps[c.id];
      gComps.append(drawComp(c, { sim: s, hot: !!s?.hot }));
    }
    for (const id of [...burnedAt.keys()]) if (!circuit.comps.some(c => c.id === id && c.burned)) burnedAt.delete(id);
    // current flow
    const items = [];
    for (const c of circuit.comps) {
      const s = sim?.comps[c.id];
      if (!s || !['wire', 'resistor', 'led', 'button', 'capacitor', 'diode'].includes(c.type)) continue;
      if (c.type === 'button' && !c.props.pressed) continue;
      const [a, b] = pinPos(c);
      items.push({ key: c.id, d: `M${a.x} ${a.y}L${b.x} ${b.y}`, i: s.i });
    }
    flow.update(items);
    // guides on top
    if (gd.pulse) { const p = holePos(gd.pulse); gTop.append(el('circle', { cx: p.x, cy: p.y, r: 7, class: 'pulse' })); }
    if (gd.pending) { const p = holePos(gd.pending); gTop.append(el('circle', { cx: p.x, cy: p.y, r: 7.5, class: 'pending' })); }
    if (m.probes) for (const [k, hole] of Object.entries(m.probes)) {
      if (!hole) continue;
      const p = holePos(hole);
      gTop.append(el('g', { class: 'probe ' + k }, [
        el('path', { d: `M${p.x} ${p.y} l6 -14`, class: 'probestem' }),
        el('circle', { cx: p.x, cy: p.y, r: 6.5, class: 'probedot' }),
        el('text', { x: p.x + 9, y: p.y - 14, text: k === 'red' ? 'V+' : 'COM', class: 'probetext' })]));
    }
  }

  return {
    svg, update, toSvg,
    fit() { userMoved = false; target = null; goto(VIEW); },
    setTarget(rect) { userMoved = false; target = rect; apply(true); },
    reset() { userMoved = false; apply(false); },
    destroy() { ro.disconnect(); cancelAnimationFrame(anim); svg.remove(); },
  };
}

// A focus rectangle around some boxes, at least ~260 units wide, with padding.
export function focusRect(boxes) {
  if (!boxes.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  const pad = 36;
  let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  w = Math.max(w, 260); h = Math.max(h, 150);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
