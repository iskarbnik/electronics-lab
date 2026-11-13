// Parts encyclopedia: every part with its symbol, what it does and the lesson that teaches it.
import { L, bidi, onLang } from '../i18n.js';
import { el } from './svg.js';
import { symbol } from './schematicView.js';

const T = (en, he) => ({ en, he });

export const PARTS = [
  { type: 'battery', props: { v: 9 }, name: T('9 V battery', 'סוללת 9 וולט'),
    what: T('The power source. It gives the push, called voltage, that makes current flow. The long plate is plus.', 'מקור האנרגיה. הוא נותן את הדחיפה, שנקראת מתח, שגורמת לזרם לזרום. הפס הארוך הוא פלוס.'),
    facts: [T('Symbol: a long and a short plate', 'סמל: פס ארוך ופס קצר'), T('Unit: volt (V)', 'יחידה: וולט (V)')], lesson: 'l02-first-circuit' },
  { type: 'wire', props: {}, name: T('Wire', 'חוט'),
    what: T('Connects two holes. Holes in the same column strip, and every hole along a rail, are already connected inside the board.', 'מחבר שני חורים. חורים באותה עמודה, וכל החורים לאורך פס, כבר מחוברים בתוך הלוח.'),
    facts: [T('Five holes per column strip', 'חמישה חורים בכל עמודה'), T('Rails run the whole length', 'הפסים עוברים לאורך כל הלוח')], lesson: 'l01-breadboard' },
  { type: 'resistor', props: { r: 470 }, name: T('Resistor', 'נגד'),
    what: T('Limits the current. Voltage, current and resistance are tied by Ohm\'s law: V = I × R.', 'מגביל את הזרם. מתח, זרם והתנגדות קשורים בחוק אוהם: V = I × R.'),
    facts: [T('Unit: ohm (Ω)', 'יחידה: אוהם (Ω)'), T('Value read from colour bands', 'הערך נקרא מצבעי הפסים'), T('Starter kit size: 1/4 W', 'הספק בערכות מתחילים: 1/4 W')], lesson: 'l04-ohms-law' },
  { type: 'led', props: { color: 'red' }, name: T('LED', 'נורית LED'),
    what: T('A diode that gives light. It only works one way and always needs a resistor in series, or it burns out.', 'דיודה שנותנת אור. היא עובדת רק בכיוון אחד, ותמיד צריכה נגד בטור, אחרת היא נשרפת.'),
    facts: [T('About 2 V across a red one', 'בערך 2 V עליה כשהיא אדומה'), T('Comfortable current: about 20 mA', 'זרם נוח: בערך 20 mA'), T('Long leg is the anode (+)', 'הרגל הארוכה היא האנודה (+)')], lesson: 'l05-led-resistor' },
  { type: 'button', props: {}, name: T('Push button', 'לחצן'),
    what: T('Connects two points only while you press it.', 'מחבר שתי נקודות רק בזמן שלוחצים עליו.'),
    facts: [T('Momentary: springs back', 'רגעי: חוזר למקומו')], lesson: 'l07-button' },
  { type: 'pot', props: { r: 10000, pos: 0.5 }, name: T('Potentiometer', 'פוטנציומטר'),
    what: T('A resistor you can turn. With two legs it is a variable resistor, with three it divides a voltage.', 'נגד שאפשר לסובב. בשתי רגליים הוא נגד משתנה, ובשלוש הוא מחלק מתח.'),
    facts: [T('Three legs: A, wiper, B', 'שלוש רגליים: A, מגב, B'), T('Typical: 10 kΩ', 'נפוץ: 10 kΩ')], lesson: 'l10-pot' },
  { type: 'capacitor', props: { c: 100e-6 }, name: T('Capacitor', 'קבל'),
    what: T('Stores charge and energy for a moment. It charges and discharges over a time set by τ = R × C.', 'אוגר מטען ואנרגיה לרגע. הוא נטען ומתרוקן בזמן שנקבע לפי τ = R × C.'),
    facts: [T('Unit: farad (F), usually µF', 'יחידה: פארד (F), בדרך כלל µF'), T('Stored energy: ½ × C × V²', 'אנרגיה אצורה: ½ × C × V²'), T('Electrolytic ones have a plus and a minus leg', 'לקבלים אלקטרוליטיים יש רגל פלוס ורגל מינוס')], lesson: 'l11-capacitor' },
  { type: 'diode', props: {}, name: T('Diode', 'דיודה'),
    what: T('A one way valve for current. Current passes from anode to cathode, never back.', 'שסתום חד כיווני לזרם. הזרם עובר מהאנודה לקתודה, ולא חזרה.'),
    facts: [T('Silicon: about 0.7 V drop', 'סיליקון: נפילת מתח של כ-0.7 V'), T('The stripe marks the cathode', 'הפס מסמן את הקתודה'), T('Used in rectifiers and for protection', 'משמשת במיישרים ולהגנה')], lesson: 'l13-diode' },
  { type: 'npn', props: {}, name: T('NPN transistor', 'טרנזיסטור NPN'),
    what: T('A small current into the base controls a much larger current from collector to emitter. A switch, or an amplifier.', 'זרם קטן שנכנס לבסיס שולט בזרם גדול בהרבה מהקולט לפולט. מפסק, או מגבר.'),
    facts: [T('Legs: base, collector, emitter', 'רגליים: בסיס, קולט, פולט'), T('Base to emitter: about 0.7 V', 'בסיס לפולט: כ-0.7 V'), T('Current gain β: about 100', 'הגבר זרם β: בערך 100'), T('Always put a resistor on the base', 'תמיד שמים נגד בבסיס')], lesson: 'l15-transistor-switch' },
  { type: 'gen', props: { wave: 'square' }, name: T('Signal generator', 'מחולל אותות'),
    what: T('Makes a voltage that changes with time: a square wave or an AC sine wave. Look at it with the oscilloscope.', 'יוצר מתח שמשתנה עם הזמן: גל ריבועי או גל סינוס חילופין. מסתכלים עליו באוסילוסקופ.'),
    facts: [T('Frequency in hertz (Hz)', 'תדר בהרץ (Hz)')], lesson: 'l12-rc' },
];

const TX = {
  title: T('Parts encyclopedia', 'אנציקלופדיית רכיבים'),
  search: T('Search parts', 'חיפוש רכיבים'),
  none: T('No part matches.', 'אין רכיב שמתאים.'),
  try: T('Try it in a lesson', 'לנסות בשיעור'),
  home: T('Back to the lesson list', 'חזרה לרשימת השיעורים'),
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function icon(p) {
  const tall = p.type === 'npn', big = p.type === 'pot';
  const svg = el('svg', { viewBox: tall ? '-56 -50 92 100' : big ? '-52 -50 104 90' : '-52 -34 104 68', 'aria-hidden': 'true', class: 'picon' });
  const g = el('g'); g.append(symbol({ id: p.type, type: p.type }, null, { props: p.props }, null));
  svg.append(g);
  return svg;
}

export function mountParts(root, opts = {}) {
  const page = document.createElement('div'); page.className = 'page parts-page';
  const render = () => {
    page.innerHTML = '';
    const head = document.createElement('div'); head.className = 'phead';
    head.innerHTML = `<button class="iconbtn back" type="button" aria-label="${esc(L(TX.home))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1>${esc(L(TX.title))}</h1>`;
    head.querySelector('.back').addEventListener('click', () => opts.onHome?.());
    const q = document.createElement('input'); q.type = 'search'; q.className = 'search'; q.placeholder = L(TX.search); q.setAttribute('aria-label', L(TX.search)); q.value = query;
    const list = document.createElement('ul'); list.className = 'parts';
    const draw = () => {
      list.innerHTML = '';
      const needle = query.trim().toLowerCase();
      const shown = PARTS.filter(p => !needle || `${p.name.en} ${p.name.he} ${p.what.en} ${p.what.he}`.toLowerCase().includes(needle));
      if (!shown.length) list.innerHTML = `<li class="muted">${esc(L(TX.none))}</li>`;
      for (const p of shown) {
        const li = document.createElement('li'); li.className = 'part';
        li.append(icon(p));
        const body = document.createElement('div');
        body.innerHTML = `<h3>${esc(L(p.name))}</h3><p>${bidi(esc(L(p.what)))}</p><div class="tags">${p.facts.map(f => `<span class="tag">${bidi(esc(L(f)))}</span>`).join('')}</div><p><a class="try" href="#/lesson/${p.lesson}">${esc(L(TX.try))}</a></p>`;
        li.append(body); list.append(li);
      }
    };
    q.addEventListener('input', () => { query = q.value; draw(); });
    draw();
    page.append(head, q, list);
  };
  let query = '';
  render();
  root.append(page);
  const off = onLang(render);
  return { destroy() { off(); page.remove(); } };
}
