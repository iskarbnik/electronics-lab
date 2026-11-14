import { T, near, info, place, wire, flip, measure, quiz, batterySetup } from './common.js';
import { voltageBetween } from '../sim/circuit.js';

const bw = pts => ({ pts, of: 'BAT', dir: 1 });
const S = T('הכנה', 'Setup');

export default {
  id: 'l17-diode',
  unit: 3,
  title: T('הדיודה: שסתום חד כיווני', 'The diode: a one-way valve'),
  summary: T('רכיב שמעביר זרם רק בכיוון אחד.', 'A part that lets current through in one direction only.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'D2', type: 'diode', x: 6, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 12, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 17, y: 6, rot: 90 },
    ],
    wires: [
      bw([[2, 4], [2, 2], [4, 2]]),
      bw([[8, 2], [10, 2]]),
      bw([[14, 2], [17, 2], [17, 4]]),
      bw([[17, 8], [17, 10], [2, 10], [2, 8]]),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+3', 'a3'], 'red', S),
    place('R1', 'resistor', ['b5', 'b9'], { r: 470 }, S),
    place('D1', 'led', ['c9', 'c10'], { color: 'red' }, S),
    wire('W2', ['a10', 'p-10'], 'black', S),
  ],
  steps: [
    info(T(
      'דיודה מעבירה זרם רק בכיוון אחד, כמו שסתום. הזרם נכנס דרך האנודה ויוצא דרך הקתודה, שמסומנת בפס. בסמל, המשולש מצביע לכיוון הזרם. הכנו נורית ונגד, וחסר רק הרכיב שבין החוט לנגד.',
      'A diode lets current through in one direction only, like a valve. Current enters through the anode and leaves through the cathode, which is marked with a stripe. In the symbol, the triangle points the way the current flows. We prepared an LED and a resistor, and only the part between the wire and the resistor is missing.')),
    place('D2', 'diode', ['c3', 'c5'], {},
      T('הציבו דיודה: האנודה בעמודה 3 והקתודה (הפס) בעמודה 5. הנורית נדלקת.', 'Place a diode: anode in column 3 and cathode (the stripe) in column 5. The LED lights up.'),
      { expect: sim => sim.comps.D1.lit }),
    measure('b3', 'b5',
      T('מדדו את המתח על הדיודה, בין עמודה 3 (אדום) לעמודה 5 (שחור). הוא קטן, בערך 0.7 V.', 'Measure the voltage across the diode, between column 3 (red) and column 5 (black). It is small, about 0.7 V.'),
      { expect: sim => near(voltageBetween(sim, 'b3', 'b5'), 0.75, 0.15) }),
    info(T(
      'דיודת סיליקון "גובה" כ-0.7 V ואז מעבירה זרם. זה דומה לנורית, אבל בלי אור. לכן לנורית נשאר קצת פחות מתח.',
      'A silicon diode "costs" about 0.7 V and then conducts. It is like an LED, but without the light. So the LED gets a little less voltage.')),
    flip('D2', false,
      T('בחרו בדיודה ולחצו על ״הפוך״. עכשיו היא מחוברת הפוך, והנורית כבית.', 'Select the diode and press Flip. Now it is connected backwards, and the LED goes dark.'),
      { watch: 'D1' }),
    info(T(
      'כשהדיודה הפוכה היא חוסמת, ולא זורם כמעט זרם. מתח הסוללה כולו נופל עליה.',
      'Connected backwards, the diode blocks, and almost no current flows. The whole battery voltage drops across it.')),
    flip('D2', true,
      T('הפכו אותה חזרה. הנורית נדלקת שוב.', 'Flip it back. The LED lights up again.'),
      { watch: 'D1', expect: sim => sim.comps.D1.lit }),
    quiz(T('כמה מתח נופל על דיודת סיליקון שמוליכה?', 'How much voltage drops across a conducting silicon diode?'),
      [T('בערך 0.7 V', 'About 0.7 V'), T('בערך 9 V', 'About 9 V'), T('0 V', '0 V')], 0,
      T('זה ערך אופייני לסיליקון, כמעט בלי קשר לזרם.', 'This is typical for silicon, almost regardless of the current.')),
    quiz(T('למה שמים דיודה בסדרה עם הסוללה במכשירים?', 'Why do devices put a diode in series with the battery?'),
      [T('כדי להגן מפני חיבור הפוך של הסוללה', 'To protect against connecting the battery backwards'), T('כדי להגדיל את המתח', 'To raise the voltage'), T('כדי להאיר', 'To give light')], 0,
      T('אם הסוללה מחוברת הפוך, הדיודה חוסמת וההתקן בטוח.', 'If the battery is backwards, the diode blocks and the device stays safe.')),
  ],
};
