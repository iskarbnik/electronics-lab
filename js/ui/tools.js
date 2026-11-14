// Calculators page: Ohm's law, LED resistor, voltage divider, RC time, resistor colour bands.
import { L, ltr, getLang, onLang, t } from '../i18n.js';
import { fmt, fmtF, bands, BAND_GOLD } from '../sim/format.js';
import { ohm, ledResistor, divider, rc, bandCodes } from '../calc.js';

const T = (he, en) => ({ he, en });
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLOR_NAMES = {
  black: T('שחור', 'black'), brown: T('חום', 'brown'), red: T('אדום', 'red'), orange: T('כתום', 'orange'), yellow: T('צהוב', 'yellow'), green: T('ירוק', 'green'),
  blue: T('כחול', 'blue'), violet: T('סגול', 'violet'), gray: T('אפור', 'gray'), white: T('לבן', 'white'), gold: T('זהב', 'gold'), silver: T('כסף', 'silver'),
};
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };

// Each calculator: title, text, fields [{ id, label, unit, value, scale (to base units) }], compute(values) -> html lines
const CALCS = [
  {
    id: 'ohm', title: T('חוק אוהם', "Ohm's law"),
    text: T('מלאו שניים משלושת השדות וקבלו את השלישי ואת ההספק.', 'Fill in any two of the three fields to get the third, and the power.'),
    fields: [
      { id: 'v', label: T('מתח', 'Voltage'), unit: 'V', value: '9', scale: 1 },
      { id: 'i', label: T('זרם', 'Current'), unit: 'mA', value: '', scale: 1e-3 },
      { id: 'r', label: T('התנגדות', 'Resistance'), unit: 'Ω', value: '450', scale: 1 },
    ],
    compute: f => {
      const o = ohm({ v: f.v, i: f.i, r: f.r });
      if (!o) return [T('מלאו בדיוק שני שדות.', 'Fill in exactly two fields.')];
      return [T(`מתח: ${ltr(fmt(o.v, 'V'))}`, `Voltage: ${ltr(fmt(o.v, 'V'))}`), T(`זרם: ${ltr(fmt(o.i, 'A'))}`, `Current: ${ltr(fmt(o.i, 'A'))}`),
        T(`התנגדות: ${ltr(fmt(o.r, 'Ω'))}`, `Resistance: ${ltr(fmt(o.r, 'Ω'))}`), T(`הספק: ${ltr(fmt(Math.abs(o.p), 'W'))}`, `Power: ${ltr(fmt(Math.abs(o.p), 'W'))}`)];
    },
  },
  {
    id: 'led', title: T('נגד לנורית', 'LED resistor'),
    text: T('איזה נגד מחברים בטור לנורית? התוצאה מעוגלת לערך התקני (E12) כלפי מעלה.', 'Which resistor goes in series with an LED? The result is rounded up to a standard (E12) value.'),
    fields: [
      { id: 'vs', label: T('מתח ספק', 'Supply voltage'), unit: 'V', value: '9', scale: 1 },
      { id: 'vf', label: T('מתח הנורית', 'LED voltage'), unit: 'V', value: '2', scale: 1 },
      { id: 'i', label: T('זרם רצוי', 'Wanted current'), unit: 'mA', value: '20', scale: 1e-3 },
    ],
    compute: f => {
      const r = ledResistor(f.vs, f.vf, f.i);
      if (!r) return [T('מתח הספק חייב להיות גדול ממתח הנורית, והזרם חיובי.', 'The supply must be above the LED voltage, and the current positive.')];
      return [T(`נגד מדויק: ${ltr(fmt(r.exact, 'Ω'))}`, `Exact resistor: ${ltr(fmt(r.exact, 'Ω'))}`), T(`נגד תקני: ${ltr(fmt(r.std, 'Ω'))}`, `Standard resistor: ${ltr(fmt(r.std, 'Ω'))}`),
        T(`זרם בפועל: ${ltr(fmt(r.actual, 'A'))}`, `Actual current: ${ltr(fmt(r.actual, 'A'))}`), T(`הספק בנגד: ${ltr(fmt(r.power, 'W'))}`, `Resistor power: ${ltr(fmt(r.power, 'W'))}`)];
    },
  },
  {
    id: 'div', title: T('מחלק מתח', 'Voltage divider'),
    text: T('שני נגדים בטור מחלקים את המתח. המתח באמצע הוא <code>Vin × R2 / (R1 + R2)</code>.', 'Two resistors in series split the voltage. The middle voltage is <code>Vin × R2 / (R1 + R2)</code>.'),
    fields: [
      { id: 'vin', label: T('מתח כניסה', 'Input voltage'), unit: 'V', value: '9', scale: 1 },
      { id: 'r1', label: 'R1', unit: 'Ω', value: '1000', scale: 1 },
      { id: 'r2', label: 'R2', unit: 'Ω', value: '2000', scale: 1 },
    ],
    compute: f => (Number.isFinite(f.vin + f.r1 + f.r2) ? [T(`מתח יציאה: ${ltr(fmt(divider(f.vin, f.r1, f.r2), 'V'))}`, `Output voltage: ${ltr(fmt(divider(f.vin, f.r1, f.r2), 'V'))}`)] : [T('מלאו את כל השדות.', 'Fill in all the fields.')]),
  },
  {
    id: 'rc', title: T('קבוע זמן RC', 'RC time constant'),
    text: T('כמה זמן לוקח לקבל להיטען דרך נגד? אחרי <code>τ = R × C</code> הוא ב-63%, ואחרי 5τ כמעט מלא.', 'How long does a capacitor take to charge through a resistor? After <code>τ = R × C</code> it is at 63%, and after 5τ almost full.'),
    fields: [
      { id: 'r', label: T('התנגדות', 'Resistance'), unit: 'Ω', value: '1000', scale: 1 },
      { id: 'c', label: T('קיבול', 'Capacitance'), unit: 'µF', value: '1000', scale: 1e-6 },
    ],
    compute: f => {
      if (!(f.r > 0 && f.c > 0)) return [T('מלאו ערכים חיוביים.', 'Fill in positive values.')];
      const o = rc(f.r, f.c);
      return [T(`τ: ${ltr(fmt(o.tau, 's'))}`, `τ: ${ltr(fmt(o.tau, 's'))}`), T(`כמעט מלא (5τ): ${ltr(fmt(o.full, 's'))}`, `Almost full (5τ): ${ltr(fmt(o.full, 's'))}`),
        T(`תדר קטימה: ${ltr(fmt(o.fc, 'Hz'))}`, `Cutoff frequency: ${ltr(fmt(o.fc, 'Hz'))}`)];
    },
  },
  {
    id: 'bands', title: T('פסי הצבע של נגד', 'Resistor colour bands'),
    text: T('הכניסו ערך וקבלו את הצבעים. הפס הרביעי הוא סבילות (זהב: 5%).', 'Enter a value to get its colours. The fourth band is the tolerance (gold: 5%).'),
    fields: [{ id: 'r', label: T('התנגדות', 'Resistance'), unit: 'Ω', value: '4700', scale: 1 }],
    compute: f => {
      const c = f.r > 0 ? bandCodes(f.r) : null;
      if (!c) return [T('הכניסו ערך חיובי.', 'Enter a positive value.')];
      const hex = bands(f.r);
      const names = [...c.names.filter(Boolean), 'gold'];
      return [{ swatches: [...hex, BAND_GOLD].slice(0, names.length), text: names.map(n => L(COLOR_NAMES[n])).join(', ') }];
    },
  },
];

export function mountTools(root, opts = {}) {
  const el = document.createElement('div');
  el.className = 'lab toolspage';
  el.innerHTML = `<header class="lhead"><button class="iconbtn back" type="button">${BACK}</button><div class="ltitle"><h1></h1></div></header><div class="toolsbody"></div>`;
  root.append(el);
  const body = el.querySelector('.toolsbody');
  const state = {};
  for (const c of CALCS) state[c.id] = Object.fromEntries(c.fields.map(f => [f.id, f.value]));

  function build() {
    el.querySelector('h1').textContent = t('tools.title');
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
    body.innerHTML = '';
    for (const c of CALCS) {
      const card = document.createElement('section');
      card.className = 'toolcard';
      card.innerHTML = `<h2>${esc(L(c.title))}</h2><p>${L(c.text)}</p><div class="tfields"></div><div class="tout" aria-live="polite"></div>`;
      const fields = card.querySelector('.tfields'), out = card.querySelector('.tout');
      const run = () => {
        const f = {};
        for (const fd of c.fields) { const x = num(state[c.id][fd.id]); f[fd.id] = Number.isNaN(x) ? NaN : x * fd.scale; }
        out.innerHTML = '';
        for (const line of c.compute(f)) {
          const row = document.createElement('div');
          if (line.swatches) row.innerHTML = `<span class="swatches">${line.swatches.map(h => `<i style="background:${h}"></i>`).join('')}</span> ${esc(line.text)}`;
          else row.innerHTML = L(line);
          out.append(row);
        }
      };
      for (const fd of c.fields) {
        const lab = document.createElement('label');
        lab.innerHTML = `<span>${typeof fd.label === 'string' ? esc(fd.label) : esc(L(fd.label))} ${ltr('(' + fd.unit + ')')}</span><input type="text" inputmode="decimal" dir="ltr" autocomplete="off">`;
        const inp = lab.querySelector('input');
        inp.value = state[c.id][fd.id];
        inp.addEventListener('input', () => { state[c.id][fd.id] = inp.value; run(); });
        fields.append(lab);
      }
      body.append(card);
      run();
    }
  }
  build();
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  const off = onLang(build);
  return { destroy() { off(); el.remove(); } };
}
