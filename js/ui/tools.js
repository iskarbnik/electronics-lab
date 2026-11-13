// Calculators screen: Ohm's law, LED resistor, resistor colour code, RC time constant.
import { L, ltr, bidi } from '../i18n.js';
import { fmt, bands, BAND_GOLD, BAND_COLORS } from '../sim/format.js';
import { solveOhm, ledResistor, rcTau, bandsToOhms, multiplierColor, parseNum, COLOR_NAMES } from '../sim/calc.js';
import { el } from './svg.js';

const T = (en, he) => ({ en, he });
const TX = {
  title: T('Calculators', 'מחשבונים'),
  ohm: T('Ohm\'s law', 'חוק אוהם'),
  ohmHelp: T('Fill in any two values. The third is calculated.', 'מלאו שני ערכים כלשהם. השלישי יחושב.'),
  led: T('LED resistor', 'נגד לנורית'),
  ledHelp: T('The resistor that gives an LED the current you want.', 'הנגד שנותן לנורית את הזרם הרצוי.'),
  color: T('Resistor colour code', 'צבעי נגד'),
  colorHelp: T('Type a value to see its bands, or pick the bands to read a value.', 'הקלידו ערך וראו את הפסים, או בחרו פסים וקראו את הערך.'),
  rc: T('RC time constant', 'קבוע זמן RC'),
  rcHelp: T('How fast a capacitor charges through a resistor.', 'כמה מהר קבל נטען דרך נגד.'),
  voltage: T('Voltage', 'מתח'), current: T('Current', 'זרם'), resistance: T('Resistance', 'התנגדות'), power: T('Power', 'הספק'),
  supply: T('Supply voltage', 'מתח ספק'), vf: T('LED voltage', 'מתח הנורית'), want: T('Wanted current', 'זרם רצוי'),
  exact: T('Exact value', 'ערך מדויק'), std: T('Nearest standard value up', 'הערך התקני הבא כלפי מעלה'), actual: T('Current with it', 'הזרם איתו'),
  value: T('Value', 'ערך'), bandsOut: T('Bands', 'פסים'), d1: T('First digit', 'ספרה ראשונה'), d2: T('Second digit', 'ספרה שנייה'), mult: T('Multiplier', 'מכפיל'),
  readOut: T('Reads as', 'קוראים כ'), cap: T('Capacitance', 'קיבול'), tau: T('Time constant τ', 'קבוע זמן τ'), full: T('Nearly full (5τ)', 'כמעט מלא (5τ)'), fc: T('Filter corner frequency', 'תדר שבר של מסנן'),
  need2: T('Fill in exactly two values.', 'מלאו בדיוק שני ערכים.'), bad: T('Check the numbers.', 'בדקו את המספרים.'),
  home: T('Back to the lesson list', 'חזרה לרשימת השיעורים'), led2: T('The supply voltage must be higher than the LED voltage.', 'מתח הספק חייב להיות גבוה ממתח הנורית.'),
};
const tx = k => L(TX[k]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const out = v => ltr(esc(v));

function h(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; }

// A number input with a unit prefix selector. units: [[label, multiplier], ...]
function field(label, units, value = '', defUnit = 0) {
  const wrap = h('label', 'fld'), inp = document.createElement('input'), sel = document.createElement('select');
  inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.value = value; inp.dir = 'ltr';
  units.forEach(([u], k) => { const o = document.createElement('option'); o.value = k; o.textContent = u; sel.append(o); });
  sel.value = defUnit; sel.dir = 'ltr';
  const row = h('div', 'row'); row.append(inp, sel);
  wrap.append(h('span', '', esc(label)), row);
  return { wrap, inp, sel, units, get value() { const n = parseNum(inp.value); return Number.isFinite(n) ? n * units[+sel.value][1] : NaN; }, get empty() { return inp.value.trim() === ''; } };
}
const OHM_U = [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]];
const V_U = [['mV', 1e-3], ['V', 1]];
const A_U = [['µA', 1e-6], ['mA', 1e-3], ['A', 1]];
const F_U = [['pF', 1e-12], ['nF', 1e-9], ['µF', 1e-6], ['mF', 1e-3]];

function card(titleKey, helpKey) {
  const c = h('section', 'card2');
  c.append(h('h2', '', esc(tx(titleKey))), h('p', '', esc(tx(helpKey))));
  return c;
}
const result = () => h('div', 'result');
const show = (box, html) => { box.innerHTML = bidi(html); };

function ohmCard() {
  const c = card('ohm', 'ohmHelp');
  const v = field(tx('voltage'), V_U, '9', 1), i = field(tx('current'), A_U, '', 1), r = field(tx('resistance'), OHM_U, '470', 0);
  const res = result();
  const run = () => {
    const given = [v, i, r].filter(f => !f.empty);
    if (given.length !== 2) return show(res, esc(tx('need2')));
    const x = solveOhm({ v: v.empty ? NaN : v.value, i: i.empty ? NaN : i.value, r: r.empty ? NaN : r.value });
    if (!x) return show(res, esc(tx('bad')));
    const unit = { v: 'V', i: 'A', r: 'Ω' }[x.solved];
    show(res, `<div class="big">${out(fmt(x[x.solved], unit))}</div><div>${esc(tx('power'))}: <b>${out(fmt(x.p, 'W'))}</b></div>`);
  };
  for (const f of [v, i, r]) { f.inp.addEventListener('input', run); f.sel.addEventListener('change', run); c.append(f.wrap); }
  c.append(res); run();
  return c;
}

function ledCard() {
  const c = card('led', 'ledHelp');
  const vs = field(tx('supply'), V_U, '9', 1), vf = field(tx('vf'), V_U, '2', 1), i = field(tx('want'), A_U, '20', 1);
  const res = result();
  const run = () => {
    const a = vs.value, b = vf.value;
    if (Number.isFinite(a) && Number.isFinite(b) && a <= b) return show(res, esc(tx('led2')));
    const x = ledResistor(a, b, i.value);
    if (!x) return show(res, esc(tx('bad')));
    show(res, `<div>${esc(tx('exact'))}: <b>${out(fmt(x.r, 'Ω'))}</b></div><div>${esc(tx('std'))}:</div><div class="big">${out(fmt(x.std, 'Ω'))}</div>` +
      `<div>${esc(tx('actual'))}: <b>${out(fmt(x.actual, 'A'))}</b>, ${esc(tx('power'))}: <b>${out(fmt(x.power, 'W'))}</b></div>`);
  };
  for (const f of [vs, vf, i]) { f.inp.addEventListener('input', run); f.sel.addEventListener('change', run); c.append(f.wrap); }
  c.append(res); run();
  return c;
}

function resistorSvg(cols) {
  const svg = el('svg', { viewBox: '0 0 220 64', role: 'img', 'aria-label': 'Resistor' });
  svg.append(el('line', { x1: 4, y1: 32, x2: 216, y2: 32, class: 'leg' }));
  svg.append(el('rect', { x: 40, y: 12, width: 140, height: 40, rx: 16, class: 'resbody' }));
  [64, 86, 108].forEach((x, k) => svg.append(el('rect', { x, y: 12, width: 11, height: 40, fill: cols[k] })));
  svg.append(el('rect', { x: 150, y: 12, width: 11, height: 40, fill: BAND_GOLD }));
  return svg;
}

function colorCard() {
  const c = card('color', 'colorHelp');
  const val = field(tx('value'), OHM_U, '470', 0);
  const view = h('div', 'resview'), res = result();
  const run = () => {
    const r = val.value;
    view.innerHTML = '';
    if (!(r >= 1 && r <= 99e9)) { res.innerHTML = esc(tx('bad')); return; }
    const bd = bands(r);
    view.append(resistorSvg(bd));
    const names = bd.slice(0, 2).map(col => COLOR_NAMES[BAND_COLORS.indexOf(col)]);
    show(res, `${esc(tx('bandsOut'))}: <b>${names.map(n => esc(L(n))).join(', ')}, ${esc(L(multName(Math.floor(Math.log10(r)) - 1)))}, ${esc(L(T('gold', 'זהב')))}</b>`);
  };
  val.inp.addEventListener('input', run); val.sel.addEventListener('change', run);
  c.append(val.wrap, view, res);

  // bands -> value
  const mk = (label, items) => {
    const w = h('label', 'fld'), s = document.createElement('select');
    items.forEach(([text, v], k) => { const o = document.createElement('option'); o.value = v; o.textContent = text; s.append(o); });
    w.append(h('span', '', esc(label)), s); return { w, s };
  };
  const digits = COLOR_NAMES.map((n, k) => [`${k} ${L(n)}`, k]);
  const mults = [...COLOR_NAMES.map((n, k) => [`×10^${k} ${L(n)}`, k]).slice(0, 7), [`×0.1 ${L(T('Gold', 'זהב'))}`, -1], [`×0.01 ${L(T('Silver', 'כסף'))}`, -2]];
  const d1 = mk(tx('d1'), digits.slice(1)), d2 = mk(tx('d2'), digits), m = mk(tx('mult'), mults);
  d1.s.value = 4; d2.s.value = 7; m.s.value = 1;
  const view2 = h('div', 'resview'), res2 = result();
  const run2 = () => {
    const r = bandsToOhms(+d1.s.value, +d2.s.value, +m.s.value);
    view2.innerHTML = ''; view2.append(resistorSvg([BAND_COLORS[+d1.s.value], BAND_COLORS[+d2.s.value], multiplierColor(+m.s.value)]));
    show(res2, `${esc(tx('readOut'))}: <div class="big">${out(fmt(r, 'Ω'))}</div>`);
  };
  const g = h('div', 'bandsel'); for (const f of [d1, d2, m]) { f.s.addEventListener('change', run2); g.append(f.w); }
  c.append(h('hr'), g, view2, res2);
  run(); run2();
  return c;
}
const multName = exp => (exp >= 0 && exp <= 9 ? COLOR_NAMES[exp] : exp === -1 ? T('gold', 'זהב') : T('silver', 'כסף'));

function rcCard() {
  const c = card('rc', 'rcHelp');
  const r = field(tx('resistance'), OHM_U, '1', 1), cap = field(tx('cap'), F_U, '470', 2);
  const res = result();
  const run = () => {
    const x = rcTau(r.value, cap.value);
    if (!x) return show(res, esc(tx('bad')));
    show(res, `<div>${esc(tx('tau'))}:</div><div class="big">${out(fmt(x.tau, 's'))}</div><div>${esc(tx('full'))}: <b>${out(fmt(x.full, 's'))}</b></div><div>${esc(tx('fc'))}: <b>${out(fmt(x.fc, 'Hz'))}</b></div>`);
  };
  for (const f of [r, cap]) { f.inp.addEventListener('input', run); f.sel.addEventListener('change', run); c.append(f.wrap); }
  c.append(res); run();
  return c;
}

export function mountTools(root, opts = {}) {
  const page = h('div', 'page tools');
  const head = h('div', 'phead');
  const back = h('button', 'iconbtn back', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  back.type = 'button'; back.setAttribute('aria-label', tx('home'));
  back.addEventListener('click', () => opts.onHome?.());
  head.append(back, h('h1', '', esc(tx('title'))));
  page.append(head, ohmCard(), ledCard(), colorCard(), rcCard());
  root.append(page);
  return { destroy() { page.remove(); } };
}
