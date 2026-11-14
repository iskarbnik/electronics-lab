// The calculators page and the parts encyclopedia page.
import { t, L, ltr, bidi } from '../i18n.js';
import { fmt, bands, BAND_GOLD } from '../sim/format.js';
import { LED_VF } from '../sim/circuit.js';
import { ohm, ledResistor, rcTime, nearestE12 } from '../sim/calc.js';
import { PARTS } from '../parts.js';
import { el } from './svg.js';
import { symbol } from './schematicView.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function shell(root, titleKey) {
  root.innerHTML = `<div class="home page"><header class="hhead">
    <a class="iconbtn back" href="#/" aria-label="${esc(t('lesson.homeAria'))}">${BACK}</a>
    <h1 class="ptitle">${esc(t(titleKey))}</h1></header><div class="pbody"></div></div>`;
  return root.querySelector('.pbody');
}

// One calculator card: number fields, optional select, and a result that updates as you type.
function tool(body, id, fields, compute) {
  const sec = document.createElement('section');
  sec.className = 'tool'; sec.dataset.tool = id;
  sec.innerHTML = `<h2>${esc(t(`tool.${id}.title`))}</h2><p class="muted">${bidi(t(`tool.${id}.help`))}</p><div class="fields"></div><div class="tres" role="status"></div>`;
  const box = sec.querySelector('.fields'), res = sec.querySelector('.tres'), inputs = {};
  for (const f of fields) {
    const lab = document.createElement('label');
    lab.className = 'field';
    lab.innerHTML = `<span>${esc(t(f.label))}${f.unit ? ` <bdi dir="ltr">(${f.unit})</bdi>` : ''}</span>`;
    let inp;
    if (f.options) {
      inp = document.createElement('select');
      for (const [val, key] of f.options) { const o = document.createElement('option'); o.value = val; o.textContent = t(key); inp.append(o); }
    } else {
      inp = document.createElement('input');
      inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 'any'; inp.dir = 'ltr';
    }
    inp.name = f.name; inp.value = f.value ?? '';
    inp.addEventListener('input', run); inp.addEventListener('change', run);
    lab.append(inp); box.append(lab); inputs[f.name] = inp;
  }
  function run() {
    const v = {};
    for (const f of fields) v[f.name] = f.options ? inputs[f.name].value : (inputs[f.name].value === '' ? NaN : +inputs[f.name].value);
    res.innerHTML = compute(v) || `<span class="muted">${esc(t('tool.empty'))}</span>`;
  }
  body.append(sec); run();
}

const row = (key, val) => `<div><span>${esc(t(key))}</span><b>${ltr(val)}</b></div>`;

export function mountTools(root) {
  const body = shell(root, 'tools.title');
  tool(body, 'ohm', [
    { name: 'v', label: 'card.v', unit: 'V', value: 9 },
    { name: 'i', label: 'card.i', unit: 'mA', value: '' },
    { name: 'r', label: 'tool.r', unit: 'Ω', value: 470 },
  ], ({ v, i, r }) => {
    const o = ohm({ v, i: i / 1000, r });
    return o && row('card.v', fmt(o.v, 'V')) + row('card.i', fmt(o.i, 'A')) + row('tool.r', fmt(o.r, 'Ω')) + row('card.p', fmt(o.p, 'W'));
  });
  tool(body, 'led', [
    { name: 'vs', label: 'tool.vs', unit: 'V', value: 9 },
    { name: 'color', label: 'tool.color', options: Object.keys(LED_VF).map(c => [c, 'color.' + c]), value: 'red' },
    { name: 'i', label: 'card.i', unit: 'mA', value: 15 },
  ], ({ vs, color, i }) => {
    const o = ledResistor(vs, LED_VF[color], i / 1000);
    return o && row('tool.exact', fmt(o.r, 'Ω')) + row('tool.std', fmt(o.std, 'Ω')) + row('tool.real', fmt(o.i, 'A')) + row('card.p', fmt(o.p, 'W'));
  });
  tool(body, 'bands', [
    { name: 'r', label: 'tool.r', unit: 'Ω', value: 4700 },
  ], ({ r }) => {
    if (!(r >= 1) || r > 99e6) return '';
    const std = nearestE12(r), cols = [...bands(std), BAND_GOLD];
    const xs = [34, 48, 62, 92];
    const svg = `<svg class="bandsvg" viewBox="0 0 140 40" role="img" aria-label="${esc(t('tool.bands.title'))}"><path d="M0 20H140" stroke="#aab3bf" stroke-width="3"/><rect x="20" y="6" width="100" height="28" rx="12" fill="#e3c9a1" stroke="#b39466"/>${cols.map((c, k) => `<rect x="${xs[k]}" y="6" width="8" height="28" fill="${c}"/>`).join('')}</svg>`;
    return svg + row('tool.std', fmt(std, 'Ω'));
  });
  tool(body, 'rc', [
    { name: 'r', label: 'tool.r', unit: 'Ω', value: 470 },
    { name: 'c', label: 'tool.c', unit: 'µF', value: 1000 },
  ], ({ r, c }) => {
    const o = rcTime(r, c / 1e6);
    return o && row('tool.tau', fmt(o.tau, 's')) + row('tool.full', fmt(o.full, 's'));
  });
  return { destroy() { root.innerHTML = ''; } };
}

export function mountParts(root, lessons) {
  const body = shell(root, 'parts.title');
  for (const p of PARTS) {
    const card = document.createElement('article');
    card.className = 'pcard';
    const svg = el('svg', { viewBox: '-52 -46 104 92', class: 'schemsvg psym', role: 'img', 'aria-label': t('part.' + p.type) });
    svg.append(symbol({ id: p.type, type: p.type }, null, { props: p.type === 'gate' ? { fn: 'and' } : {} }, null));
    const k = lessons.findIndex(l => l.id === p.lesson), lesson = lessons[k];
    const link = lesson ? `<a class="plink" href="#/lesson/${esc(lesson.id)}">${t('parts.lesson', { n: ltr(k + 1) })}: ${esc(L(lesson.title))}</a>` : '';
    const text = document.createElement('div');
    text.className = 'ptext2';
    text.innerHTML = `<h2>${esc(t('part.' + p.type))}</h2><p>${bidi(L(p.what))}</p><p class="ptip">${bidi(L(p.tip))}</p>${link}`;
    card.append(svg, text); body.append(card);
  }
  return { destroy() { root.innerHTML = ''; } };
}
