// Small SVG helpers shared by the board and schematic views.

export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c) n.append(c);
  return n;
}

export const clear = node => { while (node.firstChild) node.removeChild(node.firstChild); };

export const LED_COLORS = { red: '#ff4136', yellow: '#ffd23f', green: '#35d46a', blue: '#3b82ff', white: '#f4f4f4' };
export const WIRE_COLORS = { red: '#e0473b', black: '#2b2f36', blue: '#3b82f6', green: '#34b26a', yellow: '#e8c030', white: '#e8e8e8', orange: '#f08a24', brown: '#8a5a2b', purple: '#8b5cf6', gray: '#8c8c8c' };

export const FLOW_MIN_A = 50e-6;
const DASH_PERIOD = 14;

// Animated current dots. Elements are kept between updates (keyed) so that animations do not restart
// every time the circuit is redrawn.
export class FlowLayer {
  constructor(group) { this.g = group; this.map = new Map(); }
  // items: [{ key, d (path data), i (signed amps, direction already applied) }]
  update(items) {
    const seen = new Set();
    for (const it of items) {
      const a = Math.abs(it.i);
      if (a <= FLOW_MIN_A) continue;
      seen.add(it.key);
      let p = this.map.get(it.key);
      if (!p) { p = el('path', { class: 'flow' }); this.g.append(p); this.map.set(it.key, p); }
      if (p.getAttribute('d') !== it.d) p.setAttribute('d', it.d);
      const u = Math.log(Math.min(0.03, Math.max(0.0005, a)) / 0.0005) / Math.log(60);
      const speed = 18 + u * 80;
      const dur = (DASH_PERIOD / speed).toFixed(2) + 's';
      if (p.style.animationDuration !== dur) p.style.animationDuration = dur;
      p.classList.toggle('rev', it.i < 0);
    }
    for (const [k, p] of this.map) if (!seen.has(k)) { p.remove(); this.map.delete(k); }
  }
  clear() { this.update([]); }
}

export const distToSegment = (px, py, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a.x) * dx + (py - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
};
