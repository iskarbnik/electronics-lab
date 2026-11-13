import { T, info, place, wire, turn, quiz, batterySetup } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l10-pot',
  title: T('מעמעם עם פוטנציומטר', 'A potentiometer dimmer'),
  summary: T('פוטנציומטר כהתנגדות משתנה שמעמעמת את הנורית.', 'Use a potentiometer as a variable resistor to dim the LED.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'P1', type: 'pot', x: 7, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 14, y: 2, rot: 0 },
      { id: 'D1', type: 'led', x: 18, y: 6, rot: 90 },
    ],
    wires: [
      bw([[2, 4], [2, 2], [5, 2]]),
      bw([[7, 0], [12, 0], [12, 2]], 'P1'),
      bw([[16, 2], [18, 2], [18, 4]]),
      bw([[18, 8], [18, 10], [2, 10], [2, 8]]),
    ],
    dots: [],
  },
  setup: [
    ...batterySetup(),
    place('R1', 'resistor', ['b6', 'b10'], { r: 470 }, T('הכנה', 'Setup')),
    place('D1', 'led', ['c10', 'c11'], { color: 'red' }, T('הכנה', 'Setup')),
    wire('W2', ['a11', 'p-11'], 'black', T('הכנה', 'Setup')),
  ],
  steps: [
    info(T(
      'פוטנציומטר הוא נגד שאפשר לסובב. כבר הכנו את הנורית ואת נגד ההגנה, ועכשיו נוסיף את הפוטנציומטר.',
      'A potentiometer is a resistor you can turn. The LED and its protective resistor are ready, now we add the potentiometer.')),
    place('P1', 'pot', ['e5', 'e6', 'e7'], { r: 10000, pos: 0.5 },
      T('הציבו פוטנציומטר של 10 kΩ. רגליו נכנסות לעמודות 5, 6 ו-7.', 'Place a 10 kΩ potentiometer. Its legs go into columns 5, 6 and 7.')),
    wire('W1', ['p+5', 'a5'], 'red',
      T('חברו חוט אדום מפס ה-+ אל עמודה 5. הנורית דולקת בעמימות.', 'Connect a red wire from the + rail to column 5. The LED glows dimly.'),
      { expect: s => s.comps.D1.lit && s.comps.D1.brightness < 0.15 }),
    turn('P1', { max: 0.05, value: 0.05 },
      T('סובבו את הפוטנציומטר עד הסוף לכיוון אחד. הנורית מתבהרת.', 'Turn the potentiometer all the way one way. The LED brightens.'),
      { expect: s => s.comps.D1.brightness > 0.3 }),
    turn('P1', { min: 0.95, value: 0.95 },
      T('עכשיו סובבו עד הסוף לכיוון ההפוך. הנורית כמעט כבויה.', 'Now turn it all the way the other way. The LED almost goes out.'),
      { expect: s => s.comps.D1.lit && s.comps.D1.brightness < 0.1 }),
    info(T(
      'בפנים יש מסלול נגדי ומגב שמחליק עליו. אם משתמשים בשתי רגליים, זה נגד משתנה. אם משתמשים בשלוש, זה מחלק מתח, ככה מיקרו-בקר קורא כפתור סיבוב. על כך בהמשך.',
      'Inside is a resistive track and a sliding wiper. Using two legs makes it a variable resistor. Using all three makes a voltage divider, which is how an Arduino reads a knob, coming later.')),
    quiz(T('פוטנציומטר של 10 kΩ בחצי הדרך. מה ההתנגדות בין הרגל האמצעית לקצה?', 'A 10 kΩ potentiometer turned halfway. What is the resistance from the middle leg to an end?'),
      [T('בערך 5 kΩ', 'About 5 kΩ'), T('0 Ω', '0 Ω'), T('10 kΩ', '10 kΩ')], 0,
      T('המגב חוצה את המסלול לשני חצאים, כל אחד כ-5 kΩ.', 'The wiper splits the track into two halves, each about 5 kΩ.')),
    quiz(T('למה נגד ה-470 Ω נשאר במעגל?', 'Why does the 470 Ω resistor stay in the circuit?'),
      [T('כדי להגן על הנורית כשהפוטנציומטר על 0', 'To protect the LED when the potentiometer is at zero'), T('כדי להאיר את הנורית', 'To make the LED glow'), T('אין סיבה', 'No reason')], 0,
      T('בלעדיו, כשהפוטנציומטר על 0 Ω, יזרום זרם גדול שישרוף את הנורית.', 'Without it, with the potentiometer at 0 Ω, a large current would flow and burn the LED.')),
  ],
};
