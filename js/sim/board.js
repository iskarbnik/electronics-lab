// Breadboard geometry and internal connections.
// Hole ids: 'a1'..'j30' (terminal strips), 'p+1', 'p-1' (top rails), 'q+1', 'q-1' (bottom rails),
// and the two battery terminals 'BAT+' and 'BAT-'.

export const COLS = 30;
export const PITCH = 20;
const X0 = 40;

export const ROW_Y = {
  'p+': 20, 'p-': 40,
  a: 80, b: 100, c: 120, d: 140, e: 160,
  f: 200, g: 220, h: 240, i: 260, j: 280,
  'q+': 320, 'q-': 340,
};
export const ROWS = Object.keys(ROW_Y);

export const BOARD = { x: 0, y: 0, w: X0 * 2 + (COLS - 1) * PITCH, h: 360 };
export const BATTERY = { x: -150, y: 100, w: 90, h: 170 };
export const TERMINALS = { 'BAT+': { x: -40, y: 10 }, 'BAT-': { x: -40, y: 50 } };
export const VIEW = { x: -170, y: -20, w: BOARD.w + 190, h: 400 };

export function parseHole(id) {
  const m = /^([a-j]|[pq][+-])(\d+)$/.exec(id);
  if (!m) return null;
  const col = +m[2];
  if (col < 1 || col > COLS) return null;
  return { row: m[1], col };
}

export function holePos(id) {
  if (TERMINALS[id]) return TERMINALS[id];
  const h = parseHole(id);
  return h ? { x: X0 + (h.col - 1) * PITCH, y: ROW_Y[h.row] } : null;
}

// The strip is the piece of metal inside the board that a hole belongs to.
// Holes on the same strip are electrically one point.
export function stripOf(id) {
  if (TERMINALS[id]) return id;
  const h = parseHole(id);
  if (!h) return null;
  if (h.row.length === 2) return h.row;
  return ('abcde'.includes(h.row) ? 'T' : 'B') + h.col;
}

export const ALL_HOLES = [];
for (const row of ROWS) for (let c = 1; c <= COLS; c++) ALL_HOLES.push(row + c);
ALL_HOLES.push('BAT+', 'BAT-');

export function holesOfStrip(strip) {
  return ALL_HOLES.filter(h => stripOf(h) === strip);
}

export function nearestHole(x, y, max = 12) {
  let best = null, bd = max * max;
  for (const id of ALL_HOLES) {
    const p = holePos(id);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d <= bd) { bd = d; best = id; }
  }
  return best;
}
