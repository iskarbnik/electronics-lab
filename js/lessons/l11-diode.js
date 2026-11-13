import { T, info, wire, place, measure, flip, quiz, batterySetup, near } from './common.js';

const bw = pts => ({ pts, of: 'BAT', dir: 1 });
const SETUP = T('הכנה', 'Setup');

export default {
  id: 'l11-diode',
  title: T('הדיודה: שסתום חד כיווני', 'The diode: a one-way valve'),
  summary: T('דיודה מעבירה זרם רק לכיוון אחד, ועולה בערך 0.7 וולט.', 'A diode passes current one way only, and costs about 0.7 volts.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'D2', type: 'diode', x: 5, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 10, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 16, y: 6, rot: 90 },
    ],
    wires: [
      bw([[2, 4], [2, 2], [3, 2]]),
      bw([[7, 2], [8, 2]]),
      bw([[12, 2], [16, 2], [16, 4]]),
      bw([[16, 8], [16, 10], [2, 10], [2, 8]]),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 }, SETUP),
    place('D1', 'led', ['d9', 'd10'], { color: 'red' }, SETUP),
    wire('W2', ['a10', 'p-10'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'נורית היא סוג של דיודה, ולכן היא מאירה רק בכיוון אחד. דיודה רגילה עושה את אותו דבר, רק בלי אור. נשים אחת בדרך של הזרם.',
      'An LED is a kind of diode, which is why it only works one way. An ordinary diode does the same without the light. Let us put one in the way of the current.')),
    wire('W1', ['p+3', 'a3'], 'red',
      T('חברו חוט אדום מפס ה-+ אל עמודה 3.', 'Connect a red wire from the + rail to column 3.')),
    place('D2', 'diode', ['c3', 'd5'], {},
      T('הציבו דיודה בין עמודה 3 לעמודה 5. הפס הבהיר הוא הקתודה, הצד שהזרם יוצא ממנו, ועליו להיות בעמודה 5.',
        'Place a diode between column 3 and column 5. The light stripe marks the cathode, the side the current leaves from, and it goes in column 5.'),
      { expect: s => s.comps.D1.lit && s.comps.D2.conducting }),
    measure('a3', 'a5',
      T('מדדו את המתח על הדיודה: גשוש אדום בעמודה 3 ושחור בעמודה 5.', 'Measure the voltage across the diode: red probe in column 3, black in column 5.'),
      { expect: s => near(s.comps.D2.v, 0.7, 0.1) }),
    info(T(
      'כ-0.7 V. זה "המחיר" של דיודת סיליקון: תמיד נופלים עליה בערך 0.7 V כשהיא מוליכה, בלי קשר לזרם. נורית נופלת עליה 2 V או יותר, וגם היא דיודה.',
      'About 0.7 V. That is the "price" of a silicon diode: roughly 0.7 V is lost across it whenever it conducts, whatever the current. An LED loses 2 V or more, and it is a diode too.')),
    flip('D2', false,
      T('הפכו את הדיודה (בחרו בה ולחצו על "הפוך"). הנורית כבה.', 'Flip the diode (select it and press Flip). The LED goes out.'),
      { watch: 'D1', expect: s => !s.comps.D2.conducting && Math.abs(s.comps.D2.i) < 1e-6 }),
    info(T(
      'הפוך, הדיודה חוסמת ולא עובר זרם. כל המתח נופל עליה. זו מגבלת הדיודה: כיוון אחד פתוח, וכיוון אחד חסום.',
      'Backwards, the diode blocks and no current flows. The whole supply voltage ends up across it. One direction is open, the other is shut.')),
    flip('D2', true,
      T('החזירו את הדיודה לכיוון הנכון והנורית נדלקת שוב.', 'Turn the diode back the right way and the LED lights again.'),
      { watch: 'D1' }),
    quiz(T('למה שמים דיודה בטור עם סוללה?', 'Why put a diode in series with a battery?'),
      [T('כדי שחיבור הפוך בטעות לא יזרים זרם ולא יזיק למעגל', 'So that connecting it backwards by mistake lets no current through and cannot harm the circuit'),
       T('כדי להגדיל את המתח', 'To raise the voltage'), T('כדי להאיר את המעגל', 'To light the circuit')], 0,
      T('זו הגנה מהיפוך קוטביות. המחיר הוא כ-0.7 V שהולכים לאיבוד.', 'This is reverse-polarity protection. The cost is the 0.7 V that gets lost.')),
    quiz(T('סוללה של 9 V, דיודה רגילה ונגד. כמה וולט נשארים לנגד?', 'A 9 V battery, an ordinary diode and a resistor. How many volts are left for the resistor?'),
      [T('כ-8.3 V', 'About 8.3 V'), T('9 V', '9 V'), T('כ-0.7 V', 'About 0.7 V')], 0,
      T('<code>9 - 0.7 = 8.3 V</code>.', '<code>9 - 0.7 = 8.3 V</code>.')),
  ],
};
