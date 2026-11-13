import { T, info, wire, place, wait, quiz, batterySetup, near } from './common.js';
import { getComp } from '../sim/circuit.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });
const SETUP = T('הכנה', 'Setup');
const setVc = (c, v) => { const x = getComp(c, 'C1'); if (x) x.props.vc = v; };

export default {
  id: 'l12-capacitor',
  title: T('הקבל: סוללה קטנה שנטענת', 'The capacitor: a tiny rechargeable battery'),
  summary: T('טוענים קבל דרך נגד ורואים אותו מרוקן את עצמו דרך נורית. זמן שווה R כפול C.', 'Charge a capacitor through a resistor and watch it empty through an LED. Time is R times C.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'S1', type: 'button', x: 5, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 10, y: 2, rot: 0 },
      { id: 'C1', type: 'capacitor', x: 14, y: 6, rot: 90 },
      { id: 'R2', type: 'resistor', x: 20, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 25, y: 6, rot: 90 },
    ],
    wires: [
      bw([[2, 4], [2, 2], [3, 2]]),
      bw([[7, 2], [8, 2]]),
      bw([[12, 2], [14, 2]]),
      bw([[14, 2], [14, 4]], 'C1'),
      bw([[14, 2], [18, 2]], 'R2'),
      bw([[22, 2], [25, 2], [25, 4]], 'D1'),
      bw([[14, 8], [14, 10]], 'C1'),
      bw([[25, 8], [25, 10], [14, 10]], 'D1'),
      bw([[14, 10], [2, 10], [2, 8]], 'BAT'),
    ],
    dots: [[14, 2], [14, 10]],
  },
  setup: [
    ...batterySetup(),
    wire('W1', ['p+3', 'a3'], 'red', SETUP),
    place('R1', 'resistor', ['c5', 'c9'], { r: 100 }, SETUP),
    place('R2', 'resistor', ['b9', 'b12'], { r: 1000 }, SETUP),
    place('D1', 'led', ['c12', 'c13'], { color: 'red' }, SETUP),
    wire('W2', ['a10', 'p-10'], 'black', SETUP),
    wire('W3', ['a13', 'p-13'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'קבל אוגר מטען חשמלי, כמו סוללה קטנה שנטענת ומתרוקנת במהירות. כאן יש נגד ונורית, ובנוסף נשים לחצן וקבל.',
      'A capacitor stores electric charge, like a tiny battery that fills and empties quickly. Here a resistor and an LED are ready, and we will add a button and a capacitor.')),
    place('S1', 'button', ['c3', 'd5'], {},
      T('הציבו לחצן בין עמודה 3 לעמודה 5.', 'Place the button between column 3 and column 5.')),
    place('C1', 'capacitor', ['d9', 'd10'], { c: 0.001 },
      T('הציבו קבל של 1000 µF בין עמודה 9 לעמודה 10. הצד עם הפס הוא ה-, והוא בעמודה 10.',
        'Place a 1000 µF capacitor between column 9 and column 10. The striped side is -, and it goes in column 10.')),
    wait('C1',
      T('לחצו על הלחצן והחזיקו. הקבל נטען, ומד הטעינה שלו מתמלא. המשיכו ללחוץ עד שהוא מגיע ליותר מ-8 V.',
        'Press and hold the button. The capacitor charges and its gauge fills up. Keep holding until it passes 8 V.'),
      c => setVc(c, 9),
      sim => sim.comps.C1.v > 8,
      { drive: 'S1' }),
    info(T(
      'הנגד של 100 Ω מאט את הטעינה, ולכן היא לוקחת רגע ולא מיידית. הקבל מלא כמעט עד מתח הסוללה.',
      'The 100 Ω resistor slows the charging down, so it takes a moment instead of being instant. The capacitor is now filled almost to the battery voltage.')),
    wait('C1',
      T('עכשיו עזבו את הלחצן. הסוללה מנותקת, אבל הנורית ממשיכה לדלוק מהקבל. חכו עד שהיא כבה.',
        'Now let go of the button. The battery is cut off, yet the LED keeps glowing from the capacitor. Wait until it goes out.'),
      c => setVc(c, 0.5),
      sim => sim.comps.C1.v < 2.5,
      { expect: (s, c) => near(getComp(c, 'C1').props.vc, 0.5, 0.2) }),
    info(T(
      'הקבל התרוקן דרך הנורית והנגד של 1 kΩ. המתח יורד מהר בהתחלה ובאטיות בסוף, כי הזרם פרופורציוני למתח שנשאר.',
      'The capacitor emptied through the LED and the 1 kΩ resistor. The voltage falls fast at first and slowly at the end, because the current is proportional to the voltage that is left.')),
    info(T(
      'קבוע הזמן הוא <code>τ = R × C</code>. כאן <code>1 kΩ × 1000 µF = 1 s</code>. אחרי כמה קבועי זמן הקבל כמעט ריק או כמעט מלא. הגדילו את R או את C והתהליך מתארך.',
      'The time constant is <code>τ = R × C</code>. Here <code>1 kΩ × 1000 µF = 1 s</code>. After a few time constants a capacitor is almost empty or almost full. Raise R or C and everything takes longer.')),
    quiz(T('מחליפים את הנגד של 1 kΩ ב-10 kΩ, והקבל אותו קבל. מה קורה לדעיכה?', 'The 1 kΩ resistor is swapped for 10 kΩ, same capacitor. What happens to the fade?'),
      [T('היא איטית פי 10', 'It is 10 times slower'), T('היא מהירה פי 10', 'It is 10 times faster'), T('אין שינוי', 'No change')], 0,
      T('<code>τ = 10 kΩ × 1000 µF = 10 s</code>. נגד גדול מגביל את הזרם, והקבל מתרוקן לאט יותר.', '<code>τ = 10 kΩ × 1000 µF = 10 s</code>. A bigger resistor limits the current, so the capacitor empties more slowly.')),
    quiz(T('מה קבל אוגר?', 'What does a capacitor store?'),
      [T('מטען חשמלי, ומתח שמופיע עליו', 'Electric charge, shown as a voltage across it'), T('אור', 'Light'), T('התנגדות', 'Resistance')], 0,
      T('<code>Q = C × V</code>: ככל שיש יותר מטען, המתח על הקבל גבוה יותר.', '<code>Q = C × V</code>: the more charge, the higher the voltage across the capacitor.')),
  ],
};
