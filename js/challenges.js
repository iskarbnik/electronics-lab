// Sandbox challenges: a goal text, a starting circuit and a checker that runs the simulator.
import { newCircuit, addComp, clone, getComp, simulate } from './sim/circuit.js';
import { stripOf } from './sim/board.js';
import { buildCircuit } from './lessons/engine.js';
import l14 from './lessons/l14-logic-basics.js';
import l16 from './lessons/l16-latch.js';

const T = (he, en) => ({ he, en });
const powered = v => {
  const c = newCircuit(v);
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'], props: { color: 'red' } });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'], props: { color: 'black' } });
  return c;
};
const sim = circuit => { const c = clone(circuit); return { c, s: simulate(c) }; };
const leds = c => c.comps.filter(x => x.type === 'led');
const ok = () => ({ ok: true });
const no = (he, en) => ({ ok: false, note: T(he, en) });

// For logic challenges: the output LED D1 must follow the truth table [00, 01, 10, 11].
function table(expected, label) {
  return circuit => {
    const c0 = clone(circuit);
    if (!c0.comps.some(x => x.type === 'gate')) return no('הציבו שער לוגי בעמודות 12 עד 14 (או 12 ו-14 לשער NOT).', 'Place a logic gate in columns 12 to 14 (or 12 and 14 for a NOT gate).');
    const got = [];
    for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const c = clone(c0);
      getComp(c, 'S1').props.on = !!a; getComp(c, 'S2').props.on = !!b;
      got.push(simulate(c).comps.D1?.lit ? 1 : 0);
    }
    if (got.every((v, k) => v === expected[k])) return ok();
    return no(`הנורית אמורה להתנהג כמו ${label}. כרגע הטבלה היא ${got.join('')} במקום ${expected.join('')} (סדר: 00, 01, 10, 11).`, `The LED should behave like ${label}. The table is ${got.join('')} but should be ${expected.join('')} (order: 00, 01, 10, 11).`);
  };
}
const logicStart = () => buildCircuit({ setup: l14.setup, steps: [], battery: 5 }, 0);

export const CHALLENGES = [
  { id: 'c01', title: T('להדליק נורית בבטחה', 'Light an LED safely'), battery: 9, start: () => powered(9),
    text: T('חברו נורית ונגד לסוללה כך שהנורית דולקת וזורם בה בין 5 ל-25 mA.', 'Connect an LED and a resistor to the battery so the LED lights with between 5 and 25 mA through it.'),
    hint: T('נגד בטור עם הנורית. <code>R = (9 - 2) / 0.02</code>.', 'A resistor in series with the LED. <code>R = (9 - 2) / 0.02</code>.'),
    check: circuit => {
      const { c, s } = sim(circuit);
      if (!leds(c).length) return no('אין עדיין נורית על הלוח.', 'There is no LED on the board yet.');
      if (leds(c).some(l => l.burned)) return no('הנורית נשרפה. החליפו אותה והוסיפו נגד.', 'The LED burned out. Replace it and add a resistor.');
      const good = leds(c).some(l => s.comps[l.id].lit && s.comps[l.id].i >= 0.005 && s.comps[l.id].i <= 0.025);
      return good ? ok() : no('הנורית עוד לא דולקת בזרם בטוח (5 עד 25 mA).', 'The LED is not yet lit with a safe current (5 to 25 mA).');
    } },
  { id: 'c02', title: T('שתי נוריות, סוללה אחת', 'Two LEDs, one battery'), battery: 9, start: () => powered(9),
    text: T('הדליקו שתי נוריות בו זמנית מהסוללה של 9 V, בלי לשרוף אף אחת.', 'Light two LEDs at the same time from the 9 V battery, without burning either.'),
    hint: T('אפשר בטור (נגד אחד) או במקביל (נגד לכל נורית).', 'In series (one resistor) or in parallel (a resistor each).'),
    check: circuit => {
      const { c, s } = sim(circuit);
      if (leds(c).some(l => l.burned)) return no('אחת הנוריות נשרפה.', 'One of the LEDs burned out.');
      const n = leds(c).filter(l => s.comps[l.id].lit).length;
      return n >= 2 ? ok() : no(`דולקות ${n} נוריות. צריך שתיים.`, `${n} LED(s) lit. You need two.`);
    } },
  { id: 'c03', title: T('מחלק מתח ל-3 וולט', 'A 3 volt divider'), battery: 9, start: () => powered(9),
    text: T('בנו מחלק מתח משני נגדים כך שבנקודה שביניהם יהיו 3 V (בין 2.7 ל-3.3) מתוך 9 V.', 'Build a voltage divider from two resistors so the point between them is 3 V (between 2.7 and 3.3) from the 9 V.'),
    hint: T('<code>Vout = 9 × R2 / (R1 + R2)</code>. R2 צריך להיות חצי מ-R1.', '<code>Vout = 9 × R2 / (R1 + R2)</code>. R2 must be half of R1.'),
    check: circuit => {
      const { c, s } = sim(circuit);
      const rs = c.comps.filter(x => x.type === 'resistor');
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) for (const a of rs[i].pins) for (const b of rs[j].pins) {
        const st = stripOf(a);
        if (st && st === stripOf(b)) {
          const v = s.nodeV[st];
          if (v >= 2.7 && v <= 3.3 && Math.abs(s.comps[rs[i].id].i) > 5e-5) return ok();
        }
      }
      return no('לא מצאתי נקודה של כ-3 V בין שני נגדים שזורם בהם זרם. בדקו אותה עם רב-מודד.', 'I could not find a point of about 3 V between two resistors with current flowing. Check it with the multimeter.');
    } },
  { id: 'c04', title: T('לחצן שמפעיל טרנזיסטור', 'A button that drives a transistor'), battery: 9, start: () => powered(9),
    text: T('בנו מעגל שבו נורית דולקת רק כשלוחצים על לחצן, והלחצן מזרים זרם רק לבסיס של טרנזיסטור (הנורית בקולט).', 'Build a circuit where an LED lights only while a button is pressed, and the button only feeds the base of a transistor (the LED is in the collector).'),
    hint: T('לחצן, נגד בסיס של 10 kΩ, טרנזיסטור, ונורית עם נגד בקולט.', 'A button, a 10 kΩ base resistor, a transistor, and an LED with a resistor in the collector.'),
    check: circuit => {
      const c0 = clone(circuit), btn = c0.comps.find(x => x.type === 'button'), tr = c0.comps.find(x => x.type === 'transistor');
      if (!btn || !tr || !leds(c0).length) return no('צריך לחצן, טרנזיסטור ונורית.', 'You need a button, a transistor and an LED.');
      btn.props.pressed = false; const off = simulate(clone(c0));
      btn.props.pressed = true; const on = simulate(clone(c0));
      const lit = r => leds(c0).some(l => r.comps[l.id].lit);
      if (lit(off)) return no('הנורית דולקת גם בלי לחיצה.', 'The LED is lit even without a press.');
      if (!lit(on)) return no('הנורית לא נדלקת כשלוחצים.', 'The LED does not light when pressed.');
      if (on.comps[tr.id].state === 'off') return no('הנורית דולקת, אבל לא דרך הטרנזיסטור.', 'The LED is lit, but not through the transistor.');
      return ok();
    } },
  { id: 'c05', title: T('קבל שנטען בשניות', 'A capacitor that charges in seconds'), battery: 9, start: () => powered(9),
    text: T('חברו קבל דרך נגד לסוללה כך שהמתח על הקבל מגיע ל-6 V אחרי בין 2 ל-4 שניות.', 'Connect a capacitor through a resistor to the battery so its voltage reaches 6 V after between 2 and 4 seconds.'),
    hint: T('<code>τ = R × C</code>, והקבל מגיע ל-6 V (שני שלישים) אחרי בערך 1.1τ. נסו 1 kΩ ו-2200 µF.', '<code>τ = R × C</code>, and the capacitor reaches 6 V (two thirds) after about 1.1τ. Try 1 kΩ and 2200 µF.'),
    check: circuit => {
      const c = clone(circuit);
      const cap = c.comps.find(x => x.type === 'capacitor');
      if (!cap) return no('אין קבל על הלוח.', 'There is no capacitor on the board.');
      for (let t = 0.05; t <= 12; t += 0.05) {
        const s = simulate(c, { dt: 0.05, advance: true });
        if (s.comps[cap.id].v >= 6) return t >= 2 && t <= 4 ? ok() : no(`הקבל מגיע ל-6 V אחרי ${t.toFixed(1)} שניות. צריך בין 2 ל-4.`, `The capacitor reaches 6 V after ${t.toFixed(1)} seconds. You need between 2 and 4.`);
      }
      return no('הקבל לא מגיע ל-6 V תוך 12 שניות. בדקו את המעגל.', 'The capacitor does not reach 6 V within 12 seconds. Check the circuit.');
    } },
  { id: 'c06', title: T('בנו שער AND', 'Build the AND behaviour'), battery: 5, start: logicStart,
    text: T('על הלוח שני מתגים ונורית. הציבו שער כך שהנורית תדלק רק כששני המתגים למעלה.', 'The board has two switches and an LED. Place a gate so the LED lights only when both switches are up.'),
    hint: T('שער AND בעמודות 12 עד 14.', 'An AND gate in columns 12 to 14.'), check: table([0, 0, 0, 1], 'AND') },
  { id: 'c07', title: T('נורית שמחכה להבדל', 'The LED that wants a difference'), battery: 5, start: logicStart,
    text: T('הנורית צריכה להידלק כשהמתגים במצבים שונים זה מזה, ולכבות כשהם זהים.', 'The LED must light when the switches are in different positions, and go out when they are the same.'),
    hint: T('איזה שער נותן 1 כשהכניסות שונות?', 'Which gate gives 1 when the inputs differ?'), check: table([0, 1, 1, 0], 'XOR') },
  { id: 'c08', title: T('בנו זיכרון', 'Build a memory'), battery: 5, start: () => buildCircuit({ setup: l16.setup, steps: [], battery: 5 }, 0),
    text: T('הציבו שני שערי NOR וחברו אותם בלולאה כך שהם יזכרו: S מציב את Q, R מאפס אותו, ושני המתגים למטה שומרים.', 'Place two NOR gates and wire them in a loop so they remember: S sets Q, R resets it, and both switches down hold the value.'),
    hint: T('כמו בשיעור התפס: היציאה של כל שער נכנסת לכניסה B של השני.', 'As in the latch lesson: each gate\'s output goes to the other gate\'s input B.'),
    check: circuit => {
      const c = clone(circuit), g = c.comps.filter(x => x.type === 'gate');
      if (g.length < 2) return no('צריך שני שערים.', 'You need two gates.');
      const set = (S, R) => { getComp(c, 'S2').props.on = !!S; getComp(c, 'S1').props.on = !!R; const s = simulate(c); return [g[0], g[1]].map(x => !!s.comps[x.id].high); };
      const a = set(1, 0), b = set(0, 0), d = set(0, 1), e = set(0, 0);
      const same = (x, y) => x[0] === y[0] && x[1] === y[1];
      if (a[0] !== b[0] || a[1] !== b[1]) return no('כשמורידים את S המצב משתנה: המעגל לא זוכר.', 'When S is released the state changes: the circuit does not remember.');
      if (same(a, d)) return no('ה-R לא משנה כלום. בדקו את החיבורים.', 'R changes nothing. Check the connections.');
      if (!same(d, e)) return no('כשמורידים את R המצב משתנה: המעגל לא זוכר.', 'When R is released the state changes: the circuit does not remember.');
      return ok();
    } },
  { id: 'c09', title: T('12 וולט ונורית', '12 volts and an LED'), battery: 12, start: () => powered(12),
    text: T('הסוללה כאן היא 12 V. הדליקו נורית בזרם בטוח (5 עד 25 mA) בלי שנגד יתחמם.', 'The battery here is 12 V. Light an LED with a safe current (5 to 25 mA) without any resistor overheating.'),
    hint: T('<code>R = (12 - 2) / 0.02 = 500 Ω</code>, אז 560 Ω.', '<code>R = (12 - 2) / 0.02 = 500 Ω</code>, so 560 Ω.'),
    check: circuit => {
      const { c, s } = sim(circuit);
      if (leds(c).some(l => l.burned)) return no('הנורית נשרפה.', 'The LED burned out.');
      if (c.comps.some(x => x.type === 'resistor' && s.comps[x.id].hot)) return no('נגד מתחמם. השתמשו בערך גבוה יותר.', 'A resistor is overheating. Use a higher value.');
      return leds(c).some(l => s.comps[l.id].lit && s.comps[l.id].i >= 0.005 && s.comps[l.id].i <= 0.025) ? ok() : no('הנורית עוד לא דולקת בזרם בטוח.', 'The LED is not yet lit with a safe current.');
    } },
];
