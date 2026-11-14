import { T, info, wire, place, press, setR, quiz, batterySetup } from './common.js';

const SETUP = T('הכנה', 'Setup');
const w = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l13-transistor',
  title: T('הטרנזיסטור: זרם קטן שולט בזרם גדול', 'The transistor: a small current controls a big one'),
  summary: T('טרנזיסטור NPN כמתג וכמגבר, עם נורית בעומס.', 'An NPN transistor as a switch and as an amplifier, with an LED as the load.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 8, rot: 90 },
      { id: 'R1', type: 'resistor', x: 14, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 20, y: 6, rot: 90 },
      { id: 'S1', type: 'button', x: 8, y: 14, rot: 0 },
      { id: 'R2', type: 'resistor', x: 14, y: 14, rot: 0 },
      { id: 'Q1', type: 'transistor', x: 19, y: 14 },
    ],
    wires: [
      w([[2, 6], [2, 2], [5, 2]]), w([[5, 2], [12, 2]], 'R1'), w([[16, 2], [20, 2], [20, 4]], 'R1'),
      w([[20, 8], [20, 12]], 'D1'), w([[20, 16], [20, 19]], 'Q1'), w([[20, 19], [2, 19], [2, 10]]),
      w([[5, 2], [5, 14], [6, 14]], 'S1'), w([[10, 14], [12, 14]], 'R2'), w([[16, 14], [17, 14]], 'R2'),
    ],
    dots: [[5, 2]],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+3', 'a3'], 'red', SETUP),
    place('R1', 'resistor', ['b3', 'b6'], { r: 470 }, SETUP),
    place('D1', 'led', ['a6', 'a8'], { color: 'red' }, SETUP),
    wire('W2', ['a10', 'p-10'], 'black', SETUP),
    wire('W3', ['p+15', 'a15'], 'red', SETUP),
  ],
  steps: [
    info(T(
      'טרנזיסטור הוא שסתום חשמלי. לטרנזיסטור NPN שלוש רגליים: <b>קולט</b> (C), <b>בסיס</b> (B) ו<b>פולט</b> (E). זרם קטן שנכנס לבסיס מאפשר לזרם גדול בהרבה לעבור מהקולט לפולט. הנורית והנגד כבר מחוברים לקולט.',
      'A transistor is an electric valve. An NPN transistor has three legs: the <b>collector</b> (C), the <b>base</b> (B) and the <b>emitter</b> (E). A small current into the base lets a much bigger current flow from the collector to the emitter. The LED and its resistor are already connected to the collector.')),
    place('Q1', 'transistor', ['e8', 'e9', 'e10'], {},
      T('הציבו את הטרנזיסטור: הקישו על חור בעמודה 8, והוא יתפוס שלוש עמודות (8 עד 10: קולט, בסיס, פולט).',
        'Place the transistor: tap a hole in column 8 and it takes three columns (8 to 10: collector, base, emitter).')),
    place('R2', 'resistor', ['b9', 'b13'], { r: 10000 },
      T('נגד הבסיס: 10 kΩ בין עמודה 9 (הבסיס) לעמודה 13. הוא מגביל את זרם הבסיס.',
        'The base resistor: 10 kΩ between column 9 (the base) and column 13. It limits the base current.')),
    place('S1', 'button', ['c13', 'd15'], {},
      T('הציבו לחצן בין עמודה 13 לעמודה 15, כדי להזרים זרם לבסיס.', 'Place a button between column 13 and column 15, to feed current to the base.')),
    info(T(
      'הנורית כבויה: בלי זרם בסיס הטרנזיסטור "סגור", ולא עובר זרם בקולט.',
      'The LED is dark: with no base current the transistor is "closed", and no collector current flows.')),
    press('S1', T('לחצו והחזיקו את הלחצן. הנורית נדלקת.', 'Press and hold the button. The LED lights.')),
    info(T(
      'זרם הבסיס הוא <code>(9 - 0.7) / 10 kΩ ≈ 0.83 mA</code>. עם הגבר 100 הטרנזיסטור "רוצה" להעביר 83 mA, אבל הנורית והנגד מגבילים ל-14 mA בערך. הטרנזיסטור נכנס ל<b>רוויה</b>: הוא פתוח לגמרי, כמו מתג סגור, והמתח עליו כמעט 0.2 V.',
      'The base current is <code>(9 - 0.7) / 10 kΩ ≈ 0.83 mA</code>. With a gain of 100 the transistor "wants" to pass 83 mA, but the LED and resistor limit it to about 14 mA. It goes into <b>saturation</b>: fully open, like a closed switch, with only about 0.2 V across it.')),
    quiz(T('למה בכלל צריך טרנזיסטור כדי להדליק נורית?', 'Why use a transistor at all to light an LED?'),
      [T('כדי ששבב או לחצן קטן ישלטו בזרם גדול בהרבה', 'So a tiny signal source can control a much bigger current'), T('כדי להגדיל את המתח של הסוללה', 'To raise the battery voltage'), T('הוא מחליף את הנגד', 'It replaces the resistor')], 0,
      T('זה העיקרון של כל שבב: אות חלש שולט בעומס חזק, כמו מנוע או רצועת נוריות.', 'This is the idea behind every chip: a weak signal controls a strong load, such as a motor or an LED strip.')),
    setR('R2', 100000, T('בחרו בנגד הבסיס והחליפו אותו ל-100 kΩ.', 'Select the base resistor and change it to 100 kΩ.')),
    press('S1', T('לחצו שוב על הלחצן. הנורית עדיין דולקת אבל עמומה יותר.', 'Press the button again. The LED is still lit but dimmer.')),
    info(T(
      'עכשיו זרם הבסיס הוא רק <code>8.3 / 100 kΩ ≈ 83 µA</code>, והקולט מעביר בערך פי 100 ממנו: <code>8.3 mA</code>. כאן הטרנזיסטור פועל כ<b>מגבר</b>: זרם הקולט פרופורציוני לזרם הבסיס.',
      'Now the base current is only <code>8.3 / 100 kΩ ≈ 83 µA</code>, and the collector passes about 100 times that: <code>8.3 mA</code>. Here the transistor works as an <b>amplifier</b>: the collector current is proportional to the base current.')),
    quiz(T('זרם הבסיס הוא 2 mA וההגבר הוא 100. מה זרם הקולט המרבי האפשרי?', 'The base current is 2 mA and the gain is 100. What is the largest possible collector current?'),
      [T('200 mA', '200 mA'), T('2 mA', '2 mA'), T('20 mA', '20 mA')], 0,
      T('<code>Ic = 100 × 2 mA = 200 mA</code>, אם המעגל מאפשר זרם כזה.', '<code>Ic = 100 × 2 mA = 200 mA</code>, if the circuit allows that much.')),
  ],
};
