import { T, info, remove, place, toggle, quiz } from './common.js';
import { logicSetup } from './l14-logic-basics.js';

const bw = (pts, of) => ({ pts, of, dir: 1 });
const gate = fn => place('G1', 'gate', ['e12', 'e13', 'e14'], { fn }, T(
  `הציבו שער ${fn.toUpperCase()} בעמודות 12 עד 14.`, `Place the ${fn.toUpperCase()} gate in columns 12 to 14.`));

export default {
  id: 'l15-logic-more',
  title: T('NAND, NOR ו-XOR', 'NAND, NOR and XOR'),
  summary: T('השערים ההפוכים, ושער "אחד בדיוק".', 'The inverted gates, and the "exactly one" gate.'),
  battery: 5,
  schematic: {
    parts: [
      { id: 'S1', type: 'switch', x: 4, y: 3 },
      { id: 'S2', type: 'switch', x: 4, y: 9 },
      { id: 'G1', type: 'gate', x: 12, y: 6 },
      { id: 'R1', type: 'resistor', x: 19, y: 6, rot: 0 },
      { id: 'D1', type: 'led', x: 25, y: 9, rot: 90 },
    ],
    wires: [bw([[2, 3], [1, 3], [1, 5.5], [10, 5.5]], 'S1'), bw([[2, 9], [1, 9], [1, 6.5], [10, 6.5]], 'S2'), bw([[14, 6], [17, 6]], 'D1'), bw([[21, 6], [25, 6], [25, 7]], 'D1'), bw([[25, 11], [25, 13], [14, 13]], 'D1')],
    dots: [],
  },
  setup: logicSetup(),
  steps: [
    info(T(
      'אותה לוח כמו בשיעור הקודם. נוספים שלושה שערים: <b>NAND</b> הוא AND הפוך, <b>NOR</b> הוא OR הפוך, ו-<b>XOR</b> נותן 1 כשהכניסות <b>שונות</b>.',
      'The same board as in the last lesson, with three more gates: <b>NAND</b> is AND flipped, <b>NOR</b> is OR flipped, and <b>XOR</b> gives 1 when the inputs <b>differ</b>.')),
    gate('nand'),
    info(T('שני המתגים למטה (0 ו-0): NAND נותן 1 והנורית דולקת. זה ההפך מ-AND.', 'Both switches are down (0 and 0): NAND gives 1 and the LED is on. It is the opposite of AND.'), { expect: s => s.comps.G1.high && s.comps.D1.lit }),
    toggle('S1', true, T('העלו את S1. עדיין דולקת, כי NAND נותן 0 רק כששתיהן 1.', 'Flip S1 up. Still on, because NAND gives 0 only when both are 1.'), { expect: s => s.comps.G1.high }),
    toggle('S2', true, T('העלו גם את S2. עכשיו הנורית כבויה.', 'Flip S2 up as well. Now the LED goes out.'), { expect: s => !s.comps.G1.high }),
    quiz(T('NAND נותן 0 רק כש...', 'NAND gives 0 only when...'),
      [T('שתי הכניסות 1', 'both inputs are 1'), T('שתי הכניסות 0', 'both inputs are 0'), T('הכניסות שונות', 'the inputs differ')], 0,
      T('זה בדיוק ההפך מ-AND. מתוך NAND אפשר לבנות כל שער אחר, ולכן הוא נקרא "שער אוניברסלי".', 'It is exactly the opposite of AND. Any other gate can be built from NAND, which is why it is called a "universal gate".')),
    remove('G1', T('הסירו את ה-NAND.', 'Remove the NAND.')),
    gate('nor'),
    toggle('S1', false, T('הורידו את S1. עכשיו S1 ו-S2 שונות, ו-NOR נותן 0.', 'Flip S1 down. Now S1 and S2 differ, and NOR gives 0.'), { expect: s => !s.comps.G1.high }),
    toggle('S2', false, T('הורידו גם את S2. כששתיהן 0, NOR נותן 1 והנורית דולקת.', 'Flip S2 down too. With both at 0, NOR gives 1 and the LED lights.'), { expect: s => s.comps.G1.high }),
    remove('G1', T('הסירו את ה-NOR.', 'Remove the NOR.')),
    gate('xor'),
    info(T('כשהכניסות זהות (0 ו-0) XOR נותן 0.', 'When the inputs are the same (0 and 0) XOR gives 0.'), { expect: s => !s.comps.G1.high }),
    toggle('S1', true, T('העלו את S1. הכניסות שונות, והנורית נדלקת.', 'Flip S1 up. The inputs differ and the LED lights.'), { expect: s => s.comps.G1.high }),
    toggle('S2', true, T('העלו גם את S2. כששתיהן 1 הן זהות, והנורית כבויה.', 'Flip S2 up as well. With both at 1 they are the same, and the LED goes out.'), { expect: s => !s.comps.G1.high }),
    quiz(T('איזה שער נותן 1 כשהכניסות שונות זו מזו?', 'Which gate gives 1 when the inputs differ from each other?'),
      [T('XOR', 'XOR'), T('AND', 'AND'), T('NOR', 'NOR')], 0,
      T('XOR הוא "אחד מהם, אבל לא שניהם". הוא משמש, למשל, בחיבור בינארי.', 'XOR means "one of them, but not both". It is used in binary addition, for example.')),
  ],
};
