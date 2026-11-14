// The offline tutor: reads the circuit and the simulation and explains what is probably wrong, and
// answers short questions from a glossary and the parts encyclopedia. No network, no language model.
import { fmt, fmtF } from './sim/format.js';
import { ltr } from './i18n.js';
import { stripOf } from './sim/board.js';
import { PARTS } from './parts.js';

const T = (he, en) => ({ he, en });

export function diagnose(circuit, sim) {
  const out = [];
  const say = (sev, he, en, id) => out.push({ sev, id, text: T(he, en) });
  const parts = circuit.comps.filter(c => c.type !== 'battery' && c.type !== 'uno');
  if (!parts.length) { say('info', 'התחילו בחיבור הסוללה: חוט מהקוטב + לפס ה-+, וחוט מהקוטב - לפס ה--. אחר כך הוסיפו רכיבים.', 'Start by connecting the battery: a wire from the + terminal to the + rail and from the - terminal to the - rail. Then add parts.'); return out; }
  if (sim?.short) say('warn', 'יש קצר: הסוללה דוחפת זרם עצום כמעט בלי התנגדות. חפשו חוט שמחבר ישירות בין + ל-, ושימו נגד בדרך.', 'There is a short circuit: the battery is pushing a huge current through almost no resistance. Look for a wire joining + and - directly, and put a resistor in the way.');
  const r = id => sim?.comps[id] || {};
  for (const c of parts) {
    const s = r(c.id);
    if (c.type === 'led') {
      if (c.burned) say('warn', `נורית ${c.id} נשרפה כי עבר בה יותר מדי זרם. החליפו אותה, והוסיפו נגד בטור (למשל 330 Ω ל-9 V).`, `LED ${c.id} burned out from too much current. Replace it and add a series resistor (for example 330 Ω at 9 V).`, c.id);
      else if (s.lit && s.i > 0.025) say('warn', `בנורית ${c.id} עובר ${ltr(fmt(s.i, 'A'))}, קרוב לגבול. נגד גדול יותר יהיה בטוח יותר.`, `LED ${c.id} carries ${ltr(fmt(s.i, 'A'))}, close to its limit. A bigger resistor would be safer.`, c.id);
      else if (!s.lit) {
        if (s.v < -0.5) say('warn', `נורית ${c.id} הפוכה: האנודה (+) צריכה להיות בצד של ה-+. הפכו אותה.`, `LED ${c.id} is the wrong way round: the anode (+) must face the + side. Flip it.`, c.id);
        else if (Math.abs(s.v) < 0.05) say('info', `אין מתח על נורית ${c.id}: כנראה הלולאה לא סגורה, או שחוט עוקף אותה. עקבו אחרי הזרם מה-+ ועד ה-.`, `There is no voltage across LED ${c.id}: the loop is probably not closed, or a wire bypasses it. Follow the current from + to -.`, c.id);
        else if (s.v > 0.3) say('info', `על נורית ${c.id} יש ${ltr(fmt(s.v, 'V'))}, אבל נורית צריכה בערך 2 V כדי להידלק. בדקו שאין רכיב שלוקח את רוב המתח.`, `LED ${c.id} has ${ltr(fmt(s.v, 'V'))} across it, but an LED needs about 2 V to light. Check that nothing else is taking most of the voltage.`, c.id);
      }
    }
    if (c.type === 'resistor' && s.hot) say('warn', `נגד ${c.id} מתחמם: הוא נושא ${ltr(fmt(s.p, 'W'))} ומוגבל ל-${ltr('1/4 W')}. השתמשו בנגד גדול יותר.`, `Resistor ${c.id} is overheating: it carries ${ltr(fmt(s.p, 'W'))} and is rated ${ltr('1/4 W')}. Use a bigger value.`, c.id);
    if (c.type === 'capacitor' && s.v < -0.5) say('warn', `קבל ${c.id} מחובר הפוך (${ltr(fmtF(c.props.c))}). קבל אלקטרוליטי נהרס מקוטביות הפוכה.`, `Capacitor ${c.id} is connected backwards (${ltr(fmtF(c.props.c))}). An electrolytic capacitor is ruined by reverse polarity.`, c.id);
    if (c.type === 'transistor') {
      if (s.state === 'sat' && s.ib > 0.005) say('warn', `לבסיס של ${c.id} נכנס ${ltr(fmt(s.ib, 'A'))}: הרבה מדי. הוסיפו נגד בסיס (למשל 10 kΩ).`, `${c.id} has ${ltr(fmt(s.ib, 'A'))} flowing into its base: far too much. Add a base resistor (for example 10 kΩ).`, c.id);
      else if (s.state === 'off') say('info', `הטרנזיסטור ${c.id} סגור: הבסיס צריך יותר מ-${ltr('0.7 V')} מעל הפולט וזרם קטן דרך נגד.`, `Transistor ${c.id} is off: the base needs more than ${ltr('0.7 V')} above the emitter, with a small current through a resistor.`, c.id);
    }
    if (c.type === 'gate') {
      c.pins.slice(0, -1).forEach((h, k) => {
        const strip = stripOf(h);
        const used = circuit.comps.some(o => o !== c && o.pins.some(p => stripOf(p) === strip));
        if (!used) say('warn', `כניסה ${'AB'[k]} של שער ${c.id} לא מחוברת לכלום, והיא "צפה". חברו אותה ל-+ או ל-, למשל דרך מתג.`, `Input ${'AB'[k]} of gate ${c.id} is connected to nothing, so it "floats". Connect it to + or -, for example through a switch.`, c.id);
      });
    }
  }
  const uno = circuit.comps.find(c => c.type === 'uno');
  if (uno && sim) for (const [name, p] of Object.entries(sim.comps.UNO?.pins || {})) if (p.over) say('warn', `פין ${ltr(name)} מספק יותר מ-${ltr('40 mA')}. הוסיפו נגד בטור.`, `Pin ${ltr(name)} is delivering more than ${ltr('40 mA')}. Add a series resistor.`);
  if (!out.length) say('ok', 'לא מצאתי בעיה במעגל. אם משהו עדיין לא עובד, בדקו את הרכיבים אחד אחד עם רב-מודד.', 'I cannot see a problem in the circuit. If something still does not work, check the parts one by one with the multimeter.');
  return out;
}

// ---------- questions ----------
const G = (keys, he, en) => ({ keys, text: T(he, en) });
export const GLOSSARY = [
  G(['ohm', 'אוהם', 'v=ir', 'law'], 'חוק אוהם: <code>V = I × R</code>. מתח שווה זרם כפול התנגדות. אם יודעים שניים מהשלושה, מחשבים את השלישי (בדף המחשבונים).', 'Ohm\'s law: <code>V = I × R</code>. Voltage is current times resistance. Know any two and you can find the third (the calculators page does it).'),
  G(['short', 'קצר'], 'קצר הוא דרך בלי התנגדות בין שני הקטבים של הסוללה. עוברת בו הרבה מאוד זרם, וזה מסוכן. תמיד שימו נגד או עומס בדרך.', 'A short circuit is a path with almost no resistance between the battery terminals. A huge current flows, which is dangerous. Always put a resistor or a load in the way.'),
  G(['voltage', 'volt', 'מתח', 'וולט'], 'מתח הוא ה"דחיפה" שהסוללה נותנת, נמדד בוולט. כמו לחץ מים: ככל שהוא גבוה יותר, יותר זרם בא באותה התנגדות.', 'Voltage is the "push" the battery gives, measured in volts. Like water pressure: the higher it is, the more current flows through the same resistance.'),
  G(['current', 'amp', 'זרם', 'אמפר'], 'זרם הוא כמה מטען עובר בשנייה, נמדד באמפר (mA הוא אלפית אמפר). נורית רגילה רוצה בערך 20 mA.', 'Current is how much charge passes per second, measured in amps (mA is a thousandth of an amp). An ordinary LED wants about 20 mA.'),
  G(['resistor led', 'why resistor', 'נגד לנורית', 'למה נגד'], 'נורית לא מגבילה את הזרם בעצמה. בלי נגד היא לוקחת זרם גדול ונשרפת. נגד בטור קובע את הזרם: <code>R = (Vs - Vf) / I</code>.', 'An LED does not limit its own current. Without a resistor it draws a lot and burns out. A series resistor sets the current: <code>R = (Vs - Vf) / I</code>.'),
  G(['pwm', 'dimming', 'עמעום'], 'PWM מדליק ומכבה במהירות רבה, ומשנה כמה זמן הפין דולק בכל מחזור. העין רואה ממוצע, ולכן הנורית נראית עמומה.', 'PWM switches on and off very fast and changes how long the pin stays on in each cycle. The eye sees the average, so the LED looks dimmer.'),
  G(['pull', 'pullup', 'floating', 'צף', 'משיכה'], 'כניסה דיגיטלית שלא מחוברת לשום דבר "צפה" וקוראת ערכים אקראיים. נגד משיכה (או INPUT_PULLUP) מחזיק אותה על ערך ידוע.', 'A digital input connected to nothing "floats" and reads random values. A pull resistor (or INPUT_PULLUP) holds it at a known level.'),
  G(['series', 'טור'], 'בטור הרכיבים בשרשרת אחת: אותו זרם עובר בכולם והמתחים מתחברים.', 'In series the parts are in one chain: the same current flows through all of them and the voltages add.'),
  G(['parallel', 'מקביל'], 'במקביל לכל רכיב אותו מתח, והזרמים מתחברים. הנורות בבית מחוברות במקביל.', 'In parallel every part has the same voltage and the currents add. Household lights are wired in parallel.'),
  G(['divider', 'מחלק'], 'שני נגדים בטור מחלקים את המתח: <code>Vout = Vin × R2 / (R1 + R2)</code>.', 'Two resistors in series split the voltage: <code>Vout = Vin × R2 / (R1 + R2)</code>.'),
  G(['time constant', 'rc', 'קבוע זמן'], 'קבוע הזמן של נגד וקבל הוא <code>τ = R × C</code>. אחרי τ אחד הקבל ב-63%, ואחרי 5τ כמעט מלא.', 'The time constant of a resistor and capacitor is <code>τ = R × C</code>. After one τ the capacitor is at 63%, and after 5τ almost full.'),
  G(['transistor', 'טרנזיסטור', 'base', 'בסיס'], 'טרנזיסטור NPN: זרם קטן שנכנס לבסיס מאפשר זרם גדול מהקולט לפולט (<code>Ic ≈ β × Ib</code>). תמיד שמים נגד בסיס.', 'An NPN transistor: a small current into the base lets a big current flow from collector to emitter (<code>Ic ≈ β × Ib</code>). Always use a base resistor.'),
  G(['logic', 'gate', 'שער', 'לוגי'], 'שער לוגי מקבל כניסות של 0 או 1 ונותן יציאה לפי טבלת אמת. AND צריך שתיהן 1, OR מספיקה אחת, NOT הופך. NAND ו-NOR הם ההפכים של AND ו-OR.', 'A logic gate takes 0 or 1 inputs and gives an output by a truth table. AND needs both 1, OR needs one, NOT flips. NAND and NOR are the opposites of AND and OR.'),
  G(['analog', 'adc', 'אנלוגי'], 'כניסה אנלוגית מודדת מתח וממירה אותו למספר: ב-Uno 0 עד 1023, ב-ESP32 0 עד 4095.', 'An analog input measures a voltage and turns it into a number: 0 to 1023 on an Uno, 0 to 4095 on an ESP32.'),
  G(['multimeter', 'meter', 'רב-מודד', 'מד'], 'רב-מודד מודד מתח בין שתי נקודות: הניחו את הגשוש האדום והשחור על שני צדדי הרכיב. במעגל פתוח לא תראו כלום.', 'A multimeter measures the voltage between two points: put the red and black probes on the two sides of a part. In an open circuit you will read nothing.'),
];

const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}= ]+/gu, ' ');
export function answer(question) {
  const q = ' ' + norm(question) + ' ';
  if (!q.trim()) return [];
  const hits = [];
  for (const g of GLOSSARY) {
    const score = g.keys.reduce((n, k) => n + (q.includes(norm(k)) ? 1 + norm(k).length / 20 : 0), 0);
    if (score > 0) hits.push({ score, text: g.text });
  }
  for (const p of PARTS) {
    const names = [p.name.en, p.name.he, p.id].map(norm);
    const score = names.reduce((n, nm) => n + (nm.trim() && q.includes(nm.trim()) ? 1 + nm.length / 20 : 0), 0);
    if (score > 0) hits.push({ score, text: T(`<b>${p.name.he}</b>: ${p.what.he} ${p.facts.he}`, `<b>${p.name.en}</b>: ${p.what.en} ${p.facts.en}`) });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 2).map(h => h.text);
}
