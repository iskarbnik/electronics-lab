import { T, info, wire, place, toggle, quiz, batterySetup } from './common.js';

const SETUP = T('הכנה', 'Setup');
const bw = (pts, of) => ({ pts, of, dir: 1 });

export default {
  id: 'l16-latch',
  title: T('זיכרון: תפס SR משני שערים', 'Memory: an SR latch from two gates'),
  summary: T('שני שערי NOR שמחוברים זה לזה "זוכרים" ביט אחד.', 'Two NOR gates wired to each other "remember" one bit.'),
  battery: 5,
  schematic: {
    parts: [
      { id: 'S1', type: 'switch', x: 3, y: 3 },
      { id: 'S2', type: 'switch', x: 3, y: 12 },
      { id: 'G1', type: 'gate', x: 12, y: 4 },
      { id: 'G2', type: 'gate', x: 12, y: 11 },
      { id: 'D1', type: 'led', x: 20, y: 4, rot: 0 },
      { id: 'D2', type: 'led', x: 20, y: 11, rot: 0 },
    ],
    wires: [
      bw([[1, 3], [0, 3], [0, 3.5], [10, 3.5]], 'S1'), bw([[1, 12], [0, 12], [0, 10.5], [10, 10.5]], 'S2'),
      bw([[14, 4], [18, 4]], 'D1'), bw([[14, 11], [18, 11]], 'D2'),
      bw([[16, 4], [16, 7.5], [8, 7.5], [8, 11.5], [10, 11.5]], 'D1'), bw([[16, 11], [16, 8], [7, 8], [7, 4.5], [10, 4.5]], 'D2'),
    ],
    dots: [[16, 4], [16, 11]],
  },
  setup: [
    ...batterySetup(),
    place('S1', 'switch', ['e2', 'e3', 'e4'], {}, SETUP), place('S2', 'switch', ['e26', 'e27', 'e28'], {}, SETUP),
    wire('W1', ['p-2', 'a2'], 'black', SETUP), wire('W2', ['p+4', 'a4'], 'red', SETUP),
    wire('W3', ['p-26', 'a26'], 'black', SETUP), wire('W4', ['p+28', 'a28'], 'red', SETUP),
    wire('W5', ['a3', 'b8'], 'green', SETUP), wire('W6', ['a27', 'b14'], 'blue', SETUP),
    place('R1', 'resistor', ['b10', 'b11'], { r: 330 }, SETUP), place('D1', 'led', ['c11', 'c12'], { color: 'green' }, SETUP), wire('W9', ['a12', 'p-12'], 'black', SETUP),
    place('R2', 'resistor', ['a16', 'a17'], { r: 330 }, SETUP), place('D2', 'led', ['c17', 'c18'], { color: 'red' }, SETUP), wire('W10', ['a18', 'p-18'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'כל השערים עד עכשיו היו "בלי זיכרון": היציאה תלויה רק בכניסות ברגע זה. אבל אם מחברים את היציאה של כל שער לכניסה של השער השני, נוצר מעגל שזוכר מה קרה קודם. זה תפס SR, אבן הבניין של כל זיכרון.',
      'Every gate so far had "no memory": the output depends only on the inputs right now. But if you wire each gate\'s output to the other gate\'s input, you get a circuit that remembers what happened before. This is an SR latch, the building block of all memory.')),
    place('G1', 'gate', ['e8', 'e9', 'e10'], { fn: 'nor' }, T('הציבו שער NOR בעמודות 8 עד 10. היציאה שלו (Q) מדליקה את הנורית הירוקה.', 'Place a NOR gate in columns 8 to 10. Its output (Q) lights the green LED.')),
    place('G2', 'gate', ['e14', 'e15', 'e16'], { fn: 'nor' }, T('הציבו שער NOR שני בעמודות 14 עד 16. היציאה שלו מדליקה את הנורית האדומה (ההפך של Q).', 'Place a second NOR gate in columns 14 to 16. Its output lights the red LED (the opposite of Q).')),
    wire('W7', ['a10', 'a15'], 'yellow', T('חברו את היציאה של השער הראשון (עמודה 10) לכניסה B של השני (עמודה 15).', 'Connect the first gate\'s output (column 10) to the second gate\'s input B (column 15).')),
    wire('W8', ['b16', 'b9'], 'orange', T('וחברו את היציאה של השער השני (עמודה 16) לכניסה B של הראשון (עמודה 9). עכשיו הם מחוברים בלולאה.', 'And connect the second gate\'s output (column 16) to the first gate\'s input B (column 9). Now they are wired in a loop.')),
    toggle('S2', true, T('העלו את S2 (S, "הצבה"). הנורית הירוקה נדלקת: Q = 1.', 'Flip S2 up (S, "set"). The green LED lights: Q = 1.'), { expect: s => s.comps.G1.high && !s.comps.G2.high }),
    toggle('S2', false, T('הורידו את S2 בחזרה. הנורית הירוקה <b>נשארת</b> דולקת! המעגל זוכר.', 'Flip S2 back down. The green LED <b>stays</b> on! The circuit remembers.'), { expect: s => s.comps.G1.high && !s.comps.G2.high }),
    toggle('S1', true, T('העלו את S1 (R, "איפוס"). עכשיו הנורית האדומה נדלקת והירוקה כבית: Q = 0.', 'Flip S1 up (R, "reset"). Now the red LED lights and the green one goes out: Q = 0.'), { expect: s => !s.comps.G1.high && s.comps.G2.high }),
    toggle('S1', false, T('הורידו את S1. הפעם המעגל זוכר את ה-0.', 'Flip S1 back down. This time the circuit remembers the 0.'), { expect: s => !s.comps.G1.high && s.comps.G2.high }),
    quiz(T('שני המתגים למטה. מה קובע איזו נורית דולקת?', 'Both switches are down. What decides which LED is on?'),
      [T('מה היה הלחיצה האחרונה: S או R', 'Which was pressed last: S or R'), T('המתח של הסוללה', 'The battery voltage'), T('סדר הנוריות על הלוח', 'The order of the LEDs on the board')], 0,
      T('זה זיכרון: שני המתגים למטה לא משנים כלום, והמעגל שומר את המצב האחרון.', 'This is memory: with both switches down nothing changes, and the circuit keeps the last state.')),
    quiz(T('כמה ביטים של מידע שומר תפס SR אחד?', 'How many bits does one SR latch store?'),
      [T('ביט אחד', 'One bit'), T('שמונה ביטים', 'Eight bits'), T('אפס', 'Zero')], 0,
      T('Q הוא 0 או 1. זיכרון של מחשב הוא מיליארדים של תאים כאלה.', 'Q is 0 or 1. A computer\'s memory is billions of cells like this one.')),
  ],
};
