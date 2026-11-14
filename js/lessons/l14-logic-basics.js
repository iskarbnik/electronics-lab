import { T, info, wire, place, remove, toggle, quiz, batterySetup } from './common.js';

const SETUP = T('הכנה', 'Setup');
const bw = (pts, of) => ({ pts, of, dir: 1 });
const schematic = fn => ({
  parts: [
    { id: 'S1', type: 'switch', x: 4, y: 3 },
    { id: 'S2', type: 'switch', x: 4, y: 9 },
    { id: 'G1', type: 'gate', x: 12, y: 6 },
    { id: 'R1', type: 'resistor', x: 19, y: 6, rot: 0 },
    { id: 'D1', type: 'led', x: 25, y: 9, rot: 90 },
  ],
  wires: [bw([[2, 3], [1, 3], [1, 5.5], [10, 5.5]], 'S1'), bw([[2, 9], [1, 9], [1, 6.5], [10, 6.5]], 'S2'), bw([[14, 6], [17, 6]], 'D1'), bw([[21, 6], [25, 6], [25, 7]], 'D1'), bw([[25, 11], [25, 13], [14, 13]], 'D1')],
  dots: [],
});

// The board: two SPDT switches S1 and S2 (down = ground, up = battery +) feed a gate at e12..e14, which lights an LED.
export const logicSetup = () => [
  ...batterySetup(),
  place('S1', 'switch', ['e3', 'e4', 'e5'], {}, SETUP),
  place('S2', 'switch', ['e7', 'e8', 'e9'], {}, SETUP),
  wire('W1', ['p-3', 'a3'], 'black', SETUP), wire('W2', ['p+5', 'a5'], 'red', SETUP),
  wire('W3', ['p-7', 'a7'], 'black', SETUP), wire('W4', ['p+9', 'a9'], 'red', SETUP),
  wire('W5', ['a4', 'b12'], 'green', SETUP), wire('W6', ['a8', 'b13'], 'blue', SETUP),
  place('R1', 'resistor', ['a14', 'a17'], { r: 330 }, SETUP),
  place('D1', 'led', ['b17', 'b18'], { color: 'red' }, SETUP),
  wire('W7', ['a18', 'p-18'], 'black', SETUP),
];

const gateText = (fnName, pins) => T(
  `הציבו שער ${fnName}: הקישו על חור בעמודה 12 והוא יתפוס עמודות 12 עד 14 (כניסה A, כניסה B, יציאה Y).`,
  `Place the ${fnName} gate: tap a hole in column 12 and it takes columns 12 to 14 (input A, input B, output Y).`);

export default {
  id: 'l14-logic-basics',
  title: T('שערים לוגיים: AND, OR ו-NOT', 'Logic gates: AND, OR and NOT'),
  summary: T('0 ו-1 אמיתיים: שערים שמחליטים לפי מתחי הכניסה.', 'Real 0s and 1s: gates that decide from their input voltages.'),
  battery: 5,
  schematic: schematic('and'),
  setup: logicSetup(),
  steps: [
    info(T(
      'במעגלים דיגיטליים יש רק שני מצבים: <b>גבוה</b> (1, כאן 5 V) ו<b>נמוך</b> (0, כאן 0 V). שער לוגי הוא שבב קטן שמקבל כניסות ומחליט מה היציאה. שני מתגים, S1 ו-S2, מחוברים לכניסות: למעלה זה 5 V ולמטה 0 V. היציאה מדליקה נורית.',
      'Digital circuits have only two states: <b>high</b> (1, here 5 V) and <b>low</b> (0, here 0 V). A logic gate is a small chip that takes inputs and decides the output. Two switches, S1 and S2, feed the inputs: up is 5 V and down is 0 V. The output lights an LED.')),
    place('G1', 'gate', ['e12', 'e13', 'e14'], { fn: 'and' }, gateText('AND')),
    info(T('שני המתגים למטה, שתי הכניסות נמוכות, והנורית כבויה.', 'Both switches are down, both inputs are low, and the LED is off.'), { expect: s => !s.comps.G1.high }),
    toggle('S1', true, T('הקישו על S1 כדי להעלות אותו (כניסה A גבוהה).', 'Tap S1 to flip it up (input A high).'), { expect: s => !s.comps.G1.high }),
    toggle('S2', true, T('עכשיו העלו גם את S2. הנורית נדלקת.', 'Now flip S2 up as well. The LED lights.'), { expect: s => s.comps.G1.high && s.comps.D1.lit }),
    quiz(T('שער AND נותן 1 רק כש...', 'An AND gate gives 1 only when...'),
      [T('שתי הכניסות 1', 'both inputs are 1'), T('אחת מהכניסות 1', 'either input is 1'), T('שתי הכניסות 0', 'both inputs are 0')], 0,
      T('AND: "וגם". צריך את A <b>וגם</b> את B.', 'AND means "and": you need A <b>and</b> B.')),
    remove('G1', T('הסירו את שער ה-AND (בחרו בו והקישו על הסר).', 'Remove the AND gate (select it and press Remove).')),
    place('G1', 'gate', ['e12', 'e13', 'e14'], { fn: 'or' }, gateText('OR'), { expect: s => s.comps.G1.high }),
    toggle('S2', false, T('הורידו את S2 למטה. S1 עדיין למעלה: הנורית נשארת דולקת, כי ב-OR מספיקה כניסה אחת.', 'Flip S2 down. S1 is still up: the LED stays on, because OR needs only one input.'), { expect: s => s.comps.G1.high }),
    toggle('S1', false, T('הורידו גם את S1. עכשיו שתיהן נמוכות והנורית כבויה.', 'Flip S1 down too. Now both are low and the LED goes out.'), { expect: s => !s.comps.G1.high }),
    quiz(T('שער OR נותן 0 רק כש...', 'An OR gate gives 0 only when...'),
      [T('שתי הכניסות 0', 'both inputs are 0'), T('שתי הכניסות 1', 'both inputs are 1'), T('כניסה אחת 1', 'one input is 1')], 0,
      T('OR: "או". 1 מספיק בכניסה אחת.', 'OR means "or": a 1 on either input is enough.')),
    remove('G1', T('הסירו את שער ה-OR.', 'Remove the OR gate.')),
    place('G1', 'gate', ['e12', 'e14'], { fn: 'not' },
      T('שער NOT יש לו רק כניסה אחת: הציבו אותו בין עמודה 12 (כניסה) לעמודה 14 (יציאה).', 'A NOT gate has just one input: place it between column 12 (input) and column 14 (output).'), { expect: s => s.comps.G1.high }),
    toggle('S1', true, T('העלו את S1. ה-NOT הופך אותה: הכניסה 1 נותנת יציאה 0, והנורית כבויה.', 'Flip S1 up. NOT inverts: an input of 1 gives an output of 0, and the LED goes out.'), { expect: s => !s.comps.G1.high }),
    quiz(T('מה יוצא משער NOT כשהכניסה 0?', 'What comes out of a NOT gate when the input is 0?'),
      [T('1', '1'), T('0', '0'), T('חצי', 'Half')], 0, T('NOT הופך כל ערך: 0 הופך ל-1 ו-1 הופך ל-0.', 'NOT flips every value: 0 becomes 1 and 1 becomes 0.')),
  ],
};
