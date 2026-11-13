import { T, info, wire, place, select, measure, setR, quiz, near, batterySetup } from './common.js';
import { voltageBetween } from '../sim/circuit.js';

const bw = pts => ({ pts, of: 'BAT', dir: 1 });

export default {
  id: 'l08-series',
  title: T('חיבור בטור', 'Series circuits'),
  summary: T('שני נגדים בטור: זרם אחד, והמתח מתחלק.', 'Two resistors in series: one current, and the voltage is shared.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'R1', type: 'resistor', x: 8, y: 2, rot: 0 },
      { id: 'R2', type: 'resistor', x: 14, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 18, y: 6, rot: 90 },
    ],
    wires: [
      bw([[2, 4], [2, 2], [6, 2]]),
      bw([[10, 2], [12, 2]]),
      bw([[16, 2], [18, 2], [18, 4]]),
      bw([[18, 8], [18, 10], [2, 10], [2, 8]]),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+5', 'a5'], 'red', T('הכנה', 'Setup')),
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 }, T('הכנה', 'Setup')),
  ],
  steps: [
    place('R2', 'resistor', ['d9', 'd13'], { r: 470 },
      T('הציבו נגד שני של 470 Ω אחרי הראשון, מעמודה 9 לעמודה 13. הוא נמשך מאותו פס של הנגד הראשון.',
        'Place a second 470 Ω resistor after the first, from column 9 to column 13. It shares a strip with the first one.')),
    place('D1', 'led', ['c13', 'c14'], { color: 'red' },
      T('הציבו נורית אחרי הנגד השני, ברגל + בעמודה 13.', 'Place the LED after the second resistor, + leg in column 13.')),
    wire('W2', ['a14', 'p-14'], 'black',
      T('סגרו את המעגל בחוט שחור אל פס ה--.', 'Close the circuit with a black wire to the - rail.'),
      { expect: s => s.comps.D1.lit && near(s.comps.BAT.i, 0.0074, 0.0005) }),
    info(T(
      'הנורית דולקת, אבל עמומה יותר: רק כ-7.4 mA. יש כאן נתיב אחד, ולכן אותו זרם עובר בכל החלקים, וההתנגדויות מצטרפות: 470 + 470 = 940 Ω.',
      'The LED lights, but dimmer: only about 7.4 mA. There is a single path, so the same current flows through every part, and the resistances add: 470 + 470 = 940 Ω.')),
    select('R1', T('הקישו על R1 ובדקו את הזרם שלו. הוא זהה לזרם של כל חלק אחר.', 'Tap R1 and check its current. It is the same as in every other part.')),
    measure('a5', 'a9',
      T('מדדו על פני R1: בערך 3.5 V.', 'Measure across R1: about 3.5 V.'),
      { expect: s => near(voltageBetween(s, 'a5', 'a9'), 3.5, 0.1) }),
    measure('a9', 'a13',
      T('ועל פני R2: גם בערך 3.5 V. שני נגדים שווים מתחלקים במתח שווה.', 'And across R2: also about 3.5 V. Two equal resistors share the voltage equally.'),
      { expect: s => near(voltageBetween(s, 'a9', 'a13'), 3.5, 0.1) }),
    setR('R2', 1000,
      T('שנו את R2 ל-1000 Ω. הנגד הגדול לוקח את החלק הגדול יותר מהמתח.',
        'Change R2 to 1000 Ω. The bigger resistor takes the bigger share of the voltage.'),
      { expect: s => s.comps.R2.v > s.comps.R1.v * 1.5 }),
    quiz(T('שני נגדים, 100 Ω ו-220 Ω, בטור. מה ההתנגדות הכוללת?', 'Two resistors, 100 Ω and 220 Ω, in series. What is the total resistance?'),
      [T('320 Ω', '320 Ω'), T('69 Ω', '69 Ω'), T('220 Ω', '220 Ω')], 0,
      T('בטור מחברים: 100 + 220 = 320 Ω.', 'In series you add: 100 + 220 = 320 Ω.')),
    quiz(T('מה נכון לגבי הזרם בחיבור בטור?', 'What is true of the current in a series circuit?'),
      [T('הוא זהה בכל החלקים', 'It is the same in every part'), T('הוא קטן אחרי כל נגד', 'It gets smaller after each resistor'), T('הוא מתחלק בין הנגדים', 'It splits between the resistors')], 0,
      T('הזרם לא נעלם בדרך, ולכן כמה שנכנס בחלק אחד יוצא ממנו ונכנס בבא.', 'Current is not used up on the way, so what enters one part leaves it and enters the next.')),
  ],
};
