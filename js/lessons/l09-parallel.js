import { T, info, wire, place, select, remove, quiz, near, baseSetup } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l09-parallel',
  title: T('חיבור במקביל', 'Parallel circuits'),
  summary: T('שני ענפים על אותה סוללה, כל אחד עם מתח מלא.', 'Two branches on the same battery, each with the full voltage.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 8, rot: 90 },
      { id: 'R1', type: 'resistor', x: 8, y: 5, rot: 90 },
      { id: 'D1', type: 'led', x: 8, y: 10, rot: 90 },
      { id: 'R2', type: 'resistor', x: 14, y: 5, rot: 90 },
      { id: 'D2', type: 'led', x: 14, y: 10, rot: 90 },
    ],
    wires: [
      bw([[2, 6], [2, 2], [8, 2]]),
      bw([[8, 2], [14, 2], [14, 3]], 'R2'),
      bw([[8, 2], [8, 3]], 'R1'),
      bw([[8, 7], [8, 8]], 'R1'),
      bw([[14, 7], [14, 8]], 'R2'),
      bw([[8, 12], [8, 13]], 'R1'),
      bw([[14, 12], [14, 13], [8, 13]], 'R2'),
      bw([[8, 13], [2, 13], [2, 10]]),
    ],
    dots: [[8, 2], [8, 13]],
  },
  setup: baseSetup(),
  steps: [
    info(T(
      'עד עכשיו בנינו לולאה אחת. הפעם נוסיף ענף שני שמחובר לאותה סוללה, כלומר חיבור במקביל.',
      'So far we built a single loop. This time we add a second branch on the same battery, which is a parallel connection.')),
    wire('W3', ['p+16', 'a16'], 'red', T('חברו חוט אדום מפס ה-+ אל עמודה 16.', 'Connect a red wire from the + rail to column 16.')),
    place('R2', 'resistor', ['c16', 'c20'], { r: 470 },
      T('הציבו נגד של 470 Ω בין עמודה 16 לעמודה 20.', 'Place a 470 Ω resistor between column 16 and column 20.')),
    place('D2', 'led', ['d20', 'd21'], { color: 'green' },
      T('הציבו נורית ירוקה, ברגל + בעמודה 20.', 'Place a green LED, + leg in column 20.')),
    wire('W4', ['a21', 'p-21'], 'black',
      T('סגרו את הענף בחוט שחור אל פס ה--. שתי הנוריות דולקות.', 'Close the branch with a black wire to the - rail. Both LEDs light.'),
      { expect: s => s.comps.D1.lit && s.comps.D2.lit }),
    select('BAT',
      T('הקישו על הסוללה. היא נותנת כ-28.8 mA, שזה 14.6 + 14.2. זרמי הענפים מצטרפים, וזה חוק הזרמים של קירכהוף.',
        'Tap the battery. It gives about 28.8 mA, which is 14.6 + 14.2. The branch currents add, which is Kirchhoff\'s current law.'),
      { expect: s => near(s.comps.BAT.i, 0.0288, 0.0008) }),
    remove('D2',
      T('הוציאו את הנורית הירוקה. הנורית האדומה ממשיכה לדלוק: הענף השני לא מעניין אותה.',
        'Remove the green LED. The red LED keeps shining: the other branch does not matter to it.'),
      { expect: s => s.comps.D1.lit }),
    info(T(
      'כל ענף מקבל את המתח המלא של הסוללה. כך מחברים את האורות בבית: אפשר לכבות אחד בלי לפגוע באחרים.',
      'Each branch gets the full battery voltage. This is how house lights are wired: you can switch one off without affecting the others.')),
    quiz(T('שני ענפים במקביל, 10 mA ו-15 mA. כמה זרם הסוללה נותנת?', 'Two parallel branches, 10 mA and 15 mA. How much current does the battery give?'),
      [T('25 mA', '25 mA'), T('15 mA', '15 mA'), T('5 mA', '5 mA')], 0,
      T('זרמי הענפים מתחברים: 10 + 15 = 25 mA.', 'Branch currents add: 10 + 15 = 25 mA.')),
    quiz(T('מה המתח על כל ענף בחיבור במקביל?', 'What is the voltage across each branch in a parallel connection?'),
      [T('המתח המלא של הסוללה', 'The full battery voltage'), T('חצי ממתח הסוללה', 'Half the battery voltage'), T('0 V', '0 V')], 0,
      T('כל ענף מחובר ישירות לשני קטבי הסוללה.', 'Each branch is connected directly across both battery terminals.')),
  ],
};
