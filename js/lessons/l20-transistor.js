import { T, info, place, wire, toggle, setR, quiz, batterySetup } from './common.js';

const w = (pts, of, extra) => ({ pts, of, dir: 1, ...extra });
const S = T('הכנה', 'Setup');

export default {
  id: 'l20-transistor',
  unit: 3,
  title: T('הטרנזיסטור: מתג שנשלט בזרם', 'The transistor: a switch run by current'),
  summary: T('זרם קטן בבסיס מדליק זרם גדול בנורית.', 'A small current at the base turns on a big current in the LED.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'S1', type: 'switch', x: 6, y: 5, rot: 90 },
      { id: 'RB', type: 'resistor', x: 8, y: 10, rot: 0 },
      { id: 'D1', type: 'led', x: 13, y: 2, rot: 90 },
      { id: 'R1', type: 'resistor', x: 13, y: 6, rot: 90 },
      { id: 'Q1', type: 'transistor', x: 12, y: 10, rot: 0 },
    ],
    wires: [
      w([[2, 4], [2, 0], [13, 0]], 'BAT'),
      w([[6, 0], [6, 3]], 'S1'),
      w([[6, 7], [6, 10]], 'RB'),
      w([[2, 8], [2, 12], [13, 12]], 'BAT', { dir: -1 }),
    ],
    dots: [[6, 0]],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+5', 'a5'], 'red', S),
    place('D1', 'led', ['b5', 'b6'], { color: 'red' }, S),
    place('R1', 'resistor', ['a6', 'a10'], { r: 470 }, S),
  ],
  steps: [
    info(T(
      'טרנזיסטור הוא מתג בלי חלקים זזים. יש לו שלוש רגליים: קולט (C), בסיס (B) ופולט (E). זרם קטן שנכנס לבסיס פותח דרך לזרם גדול מהקולט לפולט. הכנו נורית ונגד שמחכים לחיבור לאדמה.',
      'A transistor is a switch with no moving parts. It has three legs: collector (C), base (B) and emitter (E). A small current into the base opens a path for a big current from collector to emitter. We prepared an LED and a resistor that are waiting for a path to ground.')),
    place('Q1', 'transistor', ['e10', 'e11', 'e12'], {},
      T('הציבו טרנזיסטור: הקולט בעמודה 10, הבסיס בעמודה 11 והפולט בעמודה 12.', 'Place a transistor: collector in column 10, base in column 11 and emitter in column 12.')),
    wire('WE', ['a12', 'p-12'], 'black',
      T('חברו את הפולט (עמודה 12) לפס ה-- בחוט שחור. הנורית עדיין כבויה, כי אין זרם בבסיס.', 'Connect the emitter (column 12) to the - rail with a black wire. The LED is still off, because no current enters the base.'),
      { expect: sim => !sim.comps.D1.lit }),
    place('RB', 'resistor', ['b11', 'b15'], { r: 10000 },
      T('הציבו נגד של 10 kΩ בין הבסיס (עמודה 11) לעמודה 15. הוא יגביל את זרם הבסיס.', 'Place a 10 kΩ resistor between the base (column 11) and column 15. It will limit the base current.')),
    place('S1', 'switch', ['c15', 'c17'], {},
      T('הציבו מתג בין עמודה 15 לעמודה 17.', 'Place a switch between column 15 and column 17.')),
    wire('WS', ['p+17', 'a17'], 'red',
      T('חברו את עמודה 17 לפס ה-+ בחוט אדום.', 'Connect column 17 to the + rail with a red wire.'),
      { expect: sim => !sim.comps.D1.lit }),
    toggle('S1', true,
      T('סגרו את המתג. זרם קטן נכנס לבסיס, והנורית נדלקת.', 'Close the switch. A small current enters the base, and the LED lights up.'),
      { expect: sim => sim.comps.D1.lit && sim.comps.Q1.state === 'sat' }),
    info(T(
      'דרך המתג זורמים רק כ-0.8 mA, אבל בנורית זורמים כ-14 mA. המתג הקטן שולט בזרם גדול פי כמה. כך מחשב קטן יכול להפעיל מנוע או מנורה חזקה.',
      'Only about 0.8 mA flows through the switch, yet about 14 mA flows through the LED. The small switch controls a current many times bigger. This is how a small computer can run a motor or a strong lamp.')),
    setR('RB', 1000000,
      T('בחרו בנגד הבסיס והחליפו אותו ל-1 MΩ. זרם הבסיס קטן פי 100, והנורית נחלשת מאוד.', 'Select the base resistor and change it to 1 MΩ. The base current is 100 times smaller, and the LED gets very dim.'),
      { expect: sim => sim.comps.D1.lit && sim.comps.D1.brightness < 0.1 && sim.comps.Q1.state === 'active' }),
    info(T(
      'הטרנזיסטור מגביר: זרם הקולט הוא בערך פי 100 מזרם הבסיס. עם 1 MΩ הוא פתוח רק חלקית. עם 10 kΩ היה זרם בסיס בשפע, ולכן הוא היה פתוח לגמרי והנגד של הנורית קבע את הזרם.',
      'The transistor amplifies: the collector current is about 100 times the base current. With 1 MΩ it is only partly on. With 10 kΩ there was plenty of base current, so it was fully on and the LED resistor set the current.')),
    setR('RB', 10000,
      T('החזירו את נגד הבסיס ל-10 kΩ. הנורית שוב בהירה.', 'Change the base resistor back to 10 kΩ. The LED is bright again.'),
      { expect: sim => sim.comps.D1.brightness > 0.5 }),
    toggle('S1', false,
      T('פתחו את המתג. בלי זרם בבסיס אין זרם בקולט, והנורית כבה.', 'Open the switch. With no base current there is no collector current, and the LED goes out.'),
      { expect: sim => !sim.comps.D1.lit }),
    quiz(T('איזו רגל שולטת בטרנזיסטור?', 'Which leg controls the transistor?'),
      [T('הבסיס', 'The base'), T('הקולט', 'The collector'), T('הפולט', 'The emitter')], 0,
      T('זרם קטן בבסיס קובע כמה זרם יעבור מהקולט לפולט.', 'A small current at the base decides how much current passes from collector to emitter.')),
    quiz(T('למה שמים נגד לפני הבסיס?', 'Why do we put a resistor before the base?'),
      [T('כדי להגביל את זרם הבסיס ולא לשרוף את הטרנזיסטור', 'To limit the base current so the transistor does not burn'), T('כדי שהנורית תאיר חזק יותר', 'To make the LED brighter'), T('כדי להפוך את כיוון הזרם', 'To reverse the current')], 0,
      T('הבסיס מתנהג כמו דיודה. בלי נגד היה זורם בו זרם גדול מדי.', 'The base behaves like a diode. Without a resistor far too much current would flow into it.')),
  ],
};
