import { T, info, wire, place, flip, measure, quiz, batterySetup, SETUP } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l13-diode',
  title: T('דיודה: שסתום חד כיווני', 'The diode: a one way valve'),
  summary: T('דיודה מעבירה זרם בכיוון אחד בלבד, ולוקחת בערך 0.7 V בדרך.', 'A diode passes current one way only, and takes about 0.7 V for the trip.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 7, rot: 90 },
      { id: 'R1', type: 'resistor', x: 8, y: 2, rot: 0 },
      { id: 'D1', type: 'diode', x: 14, y: 5, rot: 90 },
      { id: 'D2', type: 'led', x: 14, y: 9, rot: 90 },
    ],
    wires: [
      bw([[2, 5], [2, 2], [6, 2]]),
      bw([[10, 2], [14, 2], [14, 3]], 'R1'),
      bw([[14, 11], [14, 13], [2, 13], [2, 9]], 'D2'),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+5', 'a5'], 'red', SETUP),
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 }, SETUP),
    place('D2', 'led', ['e10', 'e11'], { color: 'red' }, SETUP),
    wire('W2', ['a11', 'p-11'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'דיודה היא כמו נורית בלי האור: זרם עובר בה מהאנודה (+) אל הקתודה (-), ולא בכיוון ההפוך. הפס הכסוף על הגוף מסמן את הקתודה. הנורית שבמעגל תעזור לנו לראות מה קורה.',
      'A diode is like an LED without the light: current passes from the anode (+) to the cathode (-), and not the other way. The silver stripe on the body marks the cathode. The LED in the circuit will help us see what happens.')),
    place('D1', 'diode', ['d9', 'd10'], {},
      T('הציבו דיודה: האנודה בעמודה 9 והקתודה (הפס) בעמודה 10. הנורית נדלקת.', 'Place a diode: anode in column 9 and cathode (the stripe) in column 10. The LED lights.'),
      { expect: s => s.comps.D2.lit && s.comps.D1.conducting }),
    measure('a9', 'a10',
      T('מדדו את המתח על הדיודה: הגשוש האדום בעמודה 9 והשחור בעמודה 10. בערך 0.7 V הולכים לאיבוד.', 'Measure the voltage across the diode: red probe in column 9, black in column 10. About 0.7 V is lost.'),
      { expect: s => Math.abs(s.comps.D1.v - 0.7) < 0.05 }),
    flip('D1', false,
      T('הפכו את הדיודה (הקישו עליה ולחצו "הפוך"). הנורית כבית: הדיודה חוסמת.', 'Flip the diode (tap it and press Flip). The LED goes out: the diode blocks.'),
      { expect: s => !s.comps.D2.lit }),
    measure('a9', 'a10',
      T('מדדו שוב על הדיודה. עכשיו כמעט כל מתח הסוללה נופל עליה, כי אין זרם שיוריד מתח על הנגד.', 'Measure across the diode again. Now nearly all the battery voltage is across it, since no current means no voltage drop on the resistor.'),
      { expect: s => Math.abs(s.comps.D1.v) > 8.5 }),
    info(T(
      'דיודה היא רכיב לא ליניארי: היא לא נשמעת לחוק אוהם. מעל כ-0.7 V היא מוליכה היטב, ומתחת לזה כמעט לא מוליכה. לכן שמים נגד בטור: הנגד הוא שקובע את הזרם.',
      'A diode is nonlinear: it does not obey Ohm\'s law. Above about 0.7 V it conducts well, below that hardly at all. That is why a resistor goes in series: the resistor sets the current.')),
    quiz(T('דיודה עם נורית אדומה בטור, מחוברות לסוללה של 9 V עם נגד. כמה מתח נופל על הנורית והדיודה יחד?', 'A diode and a red LED in series with a 9 V battery and a resistor. About how much voltage is across the LED and diode together?'),
      [T('בערך 2.7 V', 'About 2.7 V'), T('9 V', '9 V'), T('0.7 V', '0.7 V')], 0,
      T('2 V על הנורית ועוד 0.7 V על הדיודה. השאר נופל על הנגד.', '2 V across the LED plus 0.7 V across the diode. The rest falls across the resistor.')),
    quiz(T('למה דיודות מגנות על מעגלים מחיבור הפוך של סוללה?', 'Why do diodes protect circuits from a battery connected backwards?'),
      [T('בכיוון ההפוך הן חוסמות את הזרם', 'In reverse they block the current'), T('הן מגדילות את המתח', 'They raise the voltage'), T('הן מקררות את המעגל', 'They cool the circuit')], 0,
      T('סוללה הפוכה מנסה לדחוף זרם בכיוון שהדיודה לא מאפשרת.', 'A reversed battery tries to push current the way the diode does not allow.')),
  ],
};
