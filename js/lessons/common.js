// Helpers shared by all lesson files.
import { getComp, removeComp, advance } from '../sim/circuit.js';

export const T = (he, en) => ({ he, en });
export const SETUP = T('הכנה', 'Setup');
export const near = (a, b, tol) => Math.abs(a - b) <= tol;

const mk = (base, extra) => Object.assign(base, extra || {});

export const info = (text, extra) => mk({ type: 'info', text }, extra);
export const explore = (want, text, extra) => mk({ type: 'explore', want, text }, extra);
export const wire = (id, pins, color, text, extra) => mk({ type: 'wire', id, pins, color, text }, extra);
export const place = (id, kind, pins, props, text, extra) => mk({ type: 'place', id, kind, pins, props: props || {}, text }, extra);
export const measure = (red, black, text, extra) => mk({ type: 'measure', red, black, text }, extra);
export const quiz = (text, options, answer, why, extra) => mk({ type: 'quiz', text, options, answer, why }, extra);

const doStep = (comp, act, text, auto, until, extra) => mk({ type: 'do', comp, act, text, auto, until }, extra);

export const select = (comp, text, extra) =>
  doStep(comp, 'select', text, () => {}, (sim, c, ui) => !!ui && ui.selected.has(comp), extra);

export const press = (comp, text, extra) =>
  doStep(comp, 'press', text, () => {}, (sim, c, ui) => !!ui && ui.pressed.has(comp), extra);

// Flips a part's legs. `extra.watch` names the LED that must light (or not) as a result, default the part itself.
export const flip = (comp, wantLit, text, extra) => doStep(comp, 'flip', text,
  c => { const x = getComp(c, comp); if (x) x.pins = [x.pins[1], x.pins[0]]; },
  sim => { const w = (extra && extra.watch) || comp; return !!sim.comps[w] && !!sim.comps[w].lit === !!wantLit; }, extra);

// Lets time pass until `done(comp)` holds. `auto` jumps five seconds ahead.
export const wait = (comp, done, text, extra) => doStep(comp, 'wait', text,
  c => { advance(c, 5); },
  (sim, c) => { const x = getComp(c, comp); return !!x && done(x); }, extra);

export const remove = (comp, text, extra) =>
  doStep(comp, 'remove', text, c => removeComp(c, comp), (sim, c) => !getComp(c, comp), extra);

export const replace = (comp, text, extra) => doStep(comp, 'replace', text,
  c => { const x = getComp(c, comp); if (x) x.burned = false; },
  (sim, c) => { const x = getComp(c, comp); return !!x && !x.burned; }, extra);

export const toggle = (comp, on, text, extra) => doStep(comp, 'toggle', text,
  c => { const x = getComp(c, comp); if (x) x.props.on = on; },
  (sim, c) => { const x = getComp(c, comp); return !!x && !!x.props.on === on; }, extra);

export const setFn = (comp, fn, text, extra) => doStep(comp, 'setfn', text,
  c => { const x = getComp(c, comp); if (x) x.props.fn = fn; },
  (sim, c) => { const x = getComp(c, comp); return !!x && x.props.fn === fn; }, extra);

export const setR = (comp, ohms, text, extra) => doStep(comp, 'set', text,
  c => { const x = getComp(c, comp); if (x) x.props.r = ohms; },
  (sim, c) => { const x = getComp(c, comp); return !!x && x.props.r === ohms; }, extra);

export const turn = (comp, { min, max, value }, text, extra) => doStep(comp, 'turn', text,
  c => { const x = getComp(c, comp); if (x) x.props.pos = value; },
  (sim, c) => { const x = getComp(c, comp); return !!x && x.props.pos >= (min ?? 0) && x.props.pos <= (max ?? 1); },
  mk({ range: { min: min ?? 0, max: max ?? 1, value } }, extra));

// Battery wires: BAT+ to the top + rail, BAT- to the top - rail.
export const WP = wire('WP', ['BAT+', 'p+1'], 'red', SETUP);
export const WN = wire('WN', ['BAT-', 'p-1'], 'black', SETUP);
export const WP_TEXT = T('חברו את הקוטב + של הסוללה לפס ה-+ העליון.', 'Connect the battery + terminal to the top + rail.');
export const WN_TEXT = T('חברו את הקוטב - של הסוללה לפס ה-- העליון.', 'Connect the battery - terminal to the top - rail.');
export const batterySetup = () => [
  wire('WP', ['BAT+', 'p+1'], 'red', WP_TEXT),
  wire('WN', ['BAT-', 'p-1'], 'black', WN_TEXT),
];
export const baseSetup = () => [
  ...batterySetup(),
  wire('W1', ['p+5', 'a5'], 'red', SETUP),
  place('R1', 'resistor', ['c5', 'c9'], { r: 470 }, SETUP),
  place('D1', 'led', ['d9', 'd10'], { color: 'red' }, SETUP),
  wire('W2', ['a10', 'p-10'], 'black', SETUP),
];

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

// Standard loop: battery, resistor R1, LED D1.
export const loopSchematic = () => ({
  parts: [
    { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
    { id: 'R1', type: 'resistor', x: 8, y: 2, rot: 0 },
    { id: 'D1', type: 'led', x: 14, y: 6, rot: 90 },
  ],
  wires: [
    bw([[2, 4], [2, 2], [6, 2]]),
    bw([[10, 2], [14, 2], [14, 4]]),
    bw([[14, 8], [14, 10], [2, 10], [2, 8]]),
  ],
  dots: [],
});
