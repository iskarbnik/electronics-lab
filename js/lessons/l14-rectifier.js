import { T, info, wire, place, wait, quiz, SETUP } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l14-rectifier',
  title: T('הפיכת AC ל-DC: מיישר וקבל החלקה', 'AC to DC: a rectifier and a smoothing capacitor'),
  summary: T('דיודה חותכת את החצי השלילי של גל, וקבל מחליק את מה שנשאר.', 'A diode cuts off the negative half of a wave, and a capacitor smooths what is left.'),
  scope: { span: 4, vmax: 6, vmin: -6, ch: [
    { hole: 'a3', label: T('כניסה', 'Input'), color: '#ffd23f' },
    { hole: 'a8', label: T('יציאה', 'Output'), color: '#35d4ff' },
  ] },
  schematic: {
    parts: [
      { id: 'G1', type: 'gen', x: 3, y: 6, rot: 90 },
      { id: 'D1', type: 'diode', x: 9, y: 2, rot: 0 },
      { id: 'C1', type: 'capacitor', x: 15, y: 6, rot: 90 },
      { id: 'R1', type: 'resistor', x: 19, y: 6, rot: 90 },
    ],
    wires: [
      bw([[3, 4], [3, 2], [7, 2]], 'G1'),
      bw([[11, 2], [19, 2], [19, 4]], 'D1'),
      bw([[15, 2], [15, 4]], 'C1'),
      bw([[15, 8], [15, 10], [19, 10], [19, 8]], 'C1'),
      bw([[3, 8], [3, 10], [15, 10]], 'G1'),
    ],
    dots: [[15, 2], [15, 10]],
  },
  setup: [
    wire('WN', ['BAT-', 'p-1'], 'black', SETUP),
    place('G1', 'gen', ['a3', 'a4'], { wave: 'sine', f: 1, v: 5 }, SETUP),
    wire('W4', ['b4', 'p-4'], 'black', SETUP),
    place('R1', 'resistor', ['d8', 'd9'], { r: 1000 }, SETUP),
    wire('W5', ['a9', 'p-9'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'המחולל עכשיו יוצר זרם חילופין (AC): המתח מתנדנד בין <code>+5 V</code> ל-<code>-5 V</code>, פעם בשנייה. הקו הצהוב באוסילוסקופ הוא הכניסה והכחול הוא היציאה על נגד העומס. כרגע אין בין שניהם חיבור.',
      'The generator now makes alternating current (AC): the voltage swings between <code>+5 V</code> and <code>-5 V</code>, once a second. The yellow line on the scope is the input and the blue one is the output across the load resistor. Right now nothing connects them.'),
      { view: 'scope' }),
    place('D1', 'diode', ['c3', 'c8'], {},
      T('הציבו דיודה בין עמודה 3 לעמודה 8, האנודה בעמודה 3. הקתודה (הפס) בעמודה 8.', 'Place a diode from column 3 to column 8, anode in column 3. The cathode (stripe) goes in column 8.'),
      { view: 'scope' }),
    wait('D1', 4, (s, c) => c.t >= 4,
      T('היציאה (כחול) מראה רק את החצי החיובי של הגל, נמוך ב-0.7 V בערך. החצי השלילי נחסם. זה מיישר חצי גל.', 'The output (blue) shows only the positive half of the wave, about 0.7 V lower. The negative half is blocked. This is a half wave rectifier.'),
      { fresh: true, view: 'scope' }),
    place('C1', 'capacitor', ['e8', 'e9'], { c: 1e-3 },
      T('עכשיו הוסיפו קבל של 1000 µF במקביל לנגד, בין עמודה 8 לעמודה 9.', 'Now add a 1000 µF capacitor in parallel with the load, from column 8 to column 9.'),
      { view: 'scope' }),
    wait('C1', 6, (s, c) => c.t >= 6,
      T('הקבל נטען בשיא הגל ומחזיק את המתח בין השיאים. היציאה הרבה יותר חלקה, אבל עדיין נשארים נחשולים. זה כבר דומה ל-DC.', 'The capacitor charges at the peak and holds the voltage between peaks. The output is much smoother, though some ripples remain. That is already close to DC.'),
      { fresh: true, view: 'scope' }),
    quiz(T('מתח הכניסה מגיע לשיא של 5 V. מה השיא ביציאה אחרי הדיודה?', 'The input peaks at 5 V. What is the output peak after the diode?'),
      [T('בערך 4.3 V', 'About 4.3 V'), T('5 V', '5 V'), T('10 V', '10 V')], 0,
      T('הדיודה לוקחת בערך 0.7 V: 5 - 0.7 = 4.3 V.', 'The diode takes about 0.7 V: 5 - 0.7 = 4.3 V.')),
    quiz(T('איך אפשר להקטין את הנחשולים ביציאה?', 'How can you reduce the ripples in the output?'),
      [T('קבל גדול יותר', 'A bigger capacitor'), T('קבל קטן יותר', 'A smaller capacitor'), T('בלי קבל', 'No capacitor')], 0,
      T('קבל גדול מחזיק יותר מטען, והמתח יורד פחות בין השיאים.', 'A bigger capacitor holds more charge, so the voltage sags less between peaks.')),
  ],
};
