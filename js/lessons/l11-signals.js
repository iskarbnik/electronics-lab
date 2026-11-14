import { T, near, info, wire, place, toggle, measure, quiz, batterySetup } from './common.js';
import { voltageBetween } from '../sim/circuit.js';

const w = (pts, of, extra) => ({ pts, of, dir: 1, ...extra });
const v = sim => voltageBetween(sim, 'b4', 'p-5');

export default {
  id: 'l11-signals',
  unit: 2,
  title: T('אותות דיגיטליים: גבוה ונמוך', 'Digital signals: high and low'),
  summary: T('מתג, נגד משיכה למטה, ואיך מתח הופך ל-0 או ל-1.', 'A switch, a pull-down resistor, and how a voltage becomes a 0 or a 1.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'SA', type: 'switch', x: 8, y: 3, rot: 90 },
      { id: 'RA', type: 'resistor', x: 8, y: 9, rot: 90 },
    ],
    wires: [
      w([[2, 4], [2, 0], [8, 0]], 'BAT'),
      w([[8, 0], [8, 1]], 'SA'),
      w([[8, 5], [8, 7]], 'RA', { net: 'b4' }),
      w([[8, 6], [12, 6]], 'RA', { net: 'b4' }),
      w([[8, 11], [8, 12], [2, 12], [2, 8]], 'RA'),
    ],
    dots: [[8, 6]],
  },
  setup: [...batterySetup()],
  steps: [
    info(T(
      'עד עכשיו מתח יכול היה להיות כל מספר. בעולם הדיגיטלי יש רק שני מצבים: גבוה (1), קרוב למתח הסוללה, ונמוך (0), קרוב ל-0 וולט. כל מחשב בנוי על זה. נבנה כניסה דיגיטלית פשוטה ממתג.',
      'So far a voltage could be any number. In the digital world there are only two states: high (1), close to the battery voltage, and low (0), close to 0 volts. Every computer is built on this. Let us build a simple digital input from a switch.')),
    wire('WA1', ['p+2', 'a2'], 'red',
      T('חברו חוט אדום מפס ה-+ אל עמודה 2.', 'Connect a red wire from the + rail to column 2.')),
    place('SA', 'switch', ['c2', 'c4'], {},
      T('הציבו מתג הזזה בין עמודה 2 לעמודה 4.', 'Place a slide switch between column 2 and column 4.')),
    toggle('SA', true,
      T('הקישו על המתג כדי לסגור אותו.', 'Tap the switch to close it.')),
    measure('b4', 'p-5',
      T('מדדו בין עמודה 4 (גשוש אדום) לפס ה-- (גשוש שחור). המתג סגור והמתח כמעט 9 V: זה גבוה.',
        'Measure between column 4 (red probe) and the - rail (black probe). The switch is closed and the voltage is about 9 V: that is high.'),
      { expect: sim => near(v(sim), 9, 0.1) }),
    toggle('SA', false,
      T('פתחו את המתג.', 'Open the switch.')),
    measure('b4', 'p-5',
      T('מדדו שוב. עמודה 4 לא מחוברת לשום דבר, והרב-מודד מראה בערך 0 V. אבל אל תסמכו על זה: כניסה כזו נקראת צפה, והיא קולטת רעש וחשמל סטטי. שבב אמיתי היה קורא פעם 0 ופעם 1 באקראי.',
        'Measure again. Column 4 is connected to nothing, and the multimeter shows about 0 V. Do not trust it: an input like this is called floating, and it picks up noise and static. A real chip would read 0 or 1 at random.'),
      { expect: sim => near(v(sim), 0, 0.5) }),
    place('RA', 'resistor', ['p-4', 'a4'], { r: 10000 },
      T('כדי לתקן, הציבו נגד של 10 kΩ בין עמודה 4 לפס ה--. זה נגד משיכה למטה: הוא מחזיק את הכניסה על נמוך כשהמתג פתוח.',
        'To fix it, place a 10 kΩ resistor between column 4 and the - rail. This is a pull-down resistor: it holds the input low while the switch is open.')),
    info(T(
      'עכשיו המתח בעמודה 4 תמיד מוגדר. מתג פתוח: הנגד מושך ל-0 V. מתג סגור: המתג (כמעט 0 Ω) מנצח את הנגד הגדול ומחבר ל-9 V, ורק 0.9 mA זורמים בנגד. בסכמה הקו הירוק הוא אות גבוה והאפור הוא נמוך.',
      'Now the voltage at column 4 is always defined. Switch open: the resistor pulls it to 0 V. Switch closed: the switch (almost 0 Ω) beats the big resistor and connects it to 9 V, and only 0.9 mA flows in the resistor. In the schematic a green line is a high signal and a gray one is low.')),
    toggle('SA', true,
      T('סגרו את המתג. הקו בסכמה נהיה ירוק.', 'Close the switch. The line in the schematic turns green.'),
      { expect: sim => near(v(sim), 9, 0.2) }),
    toggle('SA', false,
      T('פתחו אותו. הכניסה נמוכה, והפעם בוודאות.', 'Open it. The input is low, and this time for sure.'),
      { expect: sim => near(v(sim), 0, 0.05) }),
    info(T(
      'שער לוגי מחליט לפי סף: מתח מעל חצי ממתח האספקה נקרא 1, ומתחת לחצי נקרא 0. כאן הסף הוא 4.5 V.',
      'A logic gate decides with a threshold: a voltage above half the supply counts as 1, and below half counts as 0. Here the threshold is 4.5 V.')),
    quiz(T('למה צריך נגד משיכה למטה?', 'Why do we need a pull-down resistor?'),
      [T('כדי שהכניסה תהיה 0 כשהמתג פתוח, ולא צפה', 'So the input is 0 when the switch is open, instead of floating'),
        T('כדי להגביל את הזרם בנורית', 'To limit the current in an LED'),
        T('כדי להעלות את המתח ל-9 V', 'To raise the voltage to 9 V')], 0,
      T('בלי הנגד, מתג פתוח משאיר את הכניסה לא מחוברת לשום דבר, והערך שלה אקראי.', 'Without it, an open switch leaves the input connected to nothing, and its value is random.')),
    quiz(T('המתג סגור והנגד הוא 10 kΩ. איזה זרם זורם בנגד?', 'The switch is closed and the resistor is 10 kΩ. What current flows in it?'),
      [T('0.9 mA', '0.9 mA'), T('9 mA', '9 mA'), T('90 mA', '90 mA')], 0,
      T('9 V חלקי 10 kΩ זה 0.9 mA. זה קטן מאוד, ולכן כניסות דיגיטליות כמעט לא מבזבזות חשמל.', 'Nine volts divided by 10 kΩ is 0.9 mA. That is tiny, so digital inputs hardly waste any power.')),
  ],
};
