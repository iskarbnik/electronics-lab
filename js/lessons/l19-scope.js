import { T, info, place, wire, quiz, batterySetup } from './common.js';

const w = (pts, of, extra) => ({ pts, of, dir: 1, ...extra });
const S = T('הכנה', 'Setup');
const SC = { holes: ['b4', 'b8'], names: [T('המקור', 'Source'), T('הקבל', 'Capacitor')], window: 4 };

export default {
  id: 'l19-scope',
  unit: 3,
  title: T('אוסילוסקופ: מתח לאורך זמן', 'The oscilloscope: voltage over time'),
  summary: T('רואים איך מתח משתנה, ואיך קבל מעגל גל מרובע.', 'See how a voltage changes, and how a capacitor rounds a square wave.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'SA', type: 'switch', x: 6, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 12, y: 2, rot: 0 },
      { id: 'C1', type: 'capacitor', x: 16, y: 6, rot: 90 },
    ],
    wires: [
      w([[2, 4], [2, 2], [4, 2]], 'BAT'),
      w([[8, 2], [10, 2]], 'R1'),
      w([[14, 2], [16, 2], [16, 4]], 'C1'),
      w([[16, 8], [16, 10], [2, 10], [2, 8]], 'C1'),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    wire('WF', ['p+2', 'a2'], 'red', S),
    place('SA', 'switch', ['b2', 'b4'], { period: 2 }, S),
    place('R1', 'resistor', ['a4', 'a8'], { r: 470 }, S),
    place('C1', 'capacitor', ['e8', 'e9'], { c: 0.001, vc: 0 }, S),
    wire('WG', ['a9', 'p-9'], 'black', S),
  ],
  steps: [
    info(T(
      'מד מתח מראה ערך אחד בכל רגע. אוסילוסקופ מראה איך המתח משתנה לאורך זמן, כמו גרף שנכתב בזמן אמת. הכנו את מעגל הקבל מהשיעור הקודם, אבל המתג מחליף את עצמו כל שנייה.',
      'A multimeter shows one value at a time. An oscilloscope shows how the voltage changes over time, like a graph drawn live. We prepared the capacitor circuit from the last lesson, but the switch now flips itself every second.'),
      { scope: { ...SC, holes: ['b4'], names: [SC.names[0]] } }),
    info(T(
      'הקו הצהוב הוא המתח אחרי המתג: 9 V כשהוא סגור ו-0 V כשהוא פתוח. זה גל מרובע, ומעגלים דיגיטליים משתמשים בו כשעון.',
      'The yellow line is the voltage after the switch: 9 V when it is closed and 0 V when it is open. This is a square wave, and digital circuits use it as a clock.'),
      { scope: { ...SC, holes: ['b4'], names: [SC.names[0]] } }),
    info(T(
      'עכשיו נוסיף את המתח על הקבל, בקו הירוק. הקבל לא יכול להשתנות מיד: הוא עולה בעקומה כשהמתג סגור ויורד בעקומה כשהוא פתוח.',
      'Now we add the voltage across the capacitor, the green line. The capacitor cannot change instantly: it rises along a curve when the switch is closed and falls along a curve when it is open.'),
      { scope: SC }),
    info(T(
      'הקו הירוק מנסה לעקוב אחרי הצהוב, אבל מאחר. זה בדיוק זמן הטעינה R כפול C, כ-0.47 שניות כאן. כך מסננים רעש וכך מעגלים אותות.',
      'The green line tries to follow the yellow one, but lags behind. That is exactly the charging time R times C, about 0.47 seconds here. This is how circuits filter noise and round off signals.'),
      { scope: SC }),
    quiz(T('המתג נסגר. איך עולה המתח על הקבל?', 'The switch closes. How does the voltage on the capacitor rise?'),
      [T('בעקומה: מהר בהתחלה ואז לאט', 'Along a curve: fast at first, then slowly'), T('קפיצה מיידית ל-9 V', 'An instant jump to 9 V'), T('בקו ישר לתמיד', 'In a straight line forever')], 0,
      T('ההפרש מהמתח הסופי קטן עם הזמן, ולכן הזרם והקצב קטנים.', 'The gap to the final voltage shrinks with time, so the current and the rate shrink too.')),
    quiz(T('מה יראה האוסילוסקופ אם הנגד יהיה גדול פי 10?', 'What will the oscilloscope show if the resistor is 10 times bigger?'),
      [T('הקו הירוק יאחר הרבה יותר', 'The green line lags much more'), T('הקו הירוק יעקוב מהר יותר', 'The green line follows faster'), T('שום שינוי', 'No change')], 0,
      T('זמן הטעינה R כפול C גדל פי 10.', 'The charging time R times C grows 10 times.')),
  ],
};
