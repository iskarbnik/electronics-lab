import { T, info, wire, place, setC, wait, quiz, SETUP } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l12-rc',
  title: T('קבוע הזמן RC ואוסילוסקופ', 'The RC time constant and the oscilloscope'),
  summary: T('מחולל אותות, נגד וקבל, ואוסילוסקופ שמראה כמה מהר הקבל נטען.', 'A signal generator, a resistor and a capacitor, and an oscilloscope that shows how fast the capacitor charges.'),
  scope: { span: 4, vmax: 6, ch: [
    { hole: 'a3', label: T('מחולל', 'Generator'), color: '#ffd23f' },
    { hole: 'a8', label: T('קבל', 'Capacitor'), color: '#35d4ff' },
  ] },
  schematic: {
    parts: [
      { id: 'G1', type: 'gen', x: 3, y: 6, rot: 90 },
      { id: 'R1', type: 'resistor', x: 9, y: 2, rot: 0 },
      { id: 'C1', type: 'capacitor', x: 15, y: 6, rot: 90 },
    ],
    wires: [
      bw([[3, 4], [3, 2], [7, 2]], 'G1'),
      bw([[11, 2], [15, 2], [15, 4]], 'R1'),
      bw([[15, 8], [15, 10], [3, 10], [3, 8]], 'C1'),
    ],
    dots: [],
  },
  setup: [
    wire('WN', ['BAT-', 'p-1'], 'black', SETUP),
    place('G1', 'gen', ['a3', 'a4'], { wave: 'square', f: 0.5, v: 5 }, SETUP),
    wire('W4', ['b4', 'p-4'], 'black', SETUP),
    wire('W5', ['a9', 'p-9'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'הפעם אין סוללה בשימוש. מחולל האותות יוצר גל ריבועי: שנייה אחת של <code>5 V</code>, שנייה אחת של <code>0 V</code>, וחוזר חלילה. הסוללה רק נותנת את הארקה. נשתמש באוסילוסקופ, שמצייר מתח כנגד זמן. הוא בלשונית "אוסילוסקופ".',
      'This time the battery is not used. The signal generator makes a square wave: one second at <code>5 V</code>, one second at <code>0 V</code>, and again. The battery only provides ground. We will use an oscilloscope, which draws voltage against time. It is on the "Oscilloscope" tab.'),
      { view: 'scope' }),
    place('R1', 'resistor', ['c3', 'c8'], { r: 1000 },
      T('הציבו נגד של 1 kΩ בין עמודה 3 לעמודה 8.', 'Place a 1 kΩ resistor from column 3 to column 8.')),
    place('C1', 'capacitor', ['d8', 'd9'], { c: 470e-6 },
      T('הציבו קבל של 470 µF בין עמודה 8 לעמודה 9.', 'Place a 470 µF capacitor from column 8 to column 9.')),
    wait('C1', 4, (s, c) => c.t >= 4,
      T('הקו הצהוב הוא הגל הריבועי. הקו הכחול הוא הקבל: הוא לא קופץ, הוא עולה בהדרגה ויורד בהדרגה. חכו כמה שניות והתבוננו.',
        'The yellow line is the square wave. The blue line is the capacitor: it does not jump, it rises gradually and falls gradually. Wait a few seconds and watch.'),
      { fresh: true, view: 'scope' }),
    info(T(
      'הזמן שלוקח לקבל להגיע ל-63% מהמתח נקרא קבוע הזמן <code>τ = R × C</code>. כאן: <code>1000 Ω × 470 µF = 0.47 s</code>.',
      'The time the capacitor takes to reach 63% of the voltage is the time constant <code>τ = R × C</code>. Here: <code>1000 Ω × 470 µF = 0.47 s</code>.')),
    setC('C1', 100e-6,
      T('הקטינו את הקבל ל-100 µF (הקישו עליו ובחרו ערך). עכשיו τ קטן, והקבל עוקב אחרי הגל כמעט בלי השהיה.',
        'Make the capacitor smaller, 100 µF (tap it and pick a value). Now τ is small and the capacitor follows the wave almost without delay.')),
    wait('C1', 4, (s, c) => c.t >= 4,
      T('התבוננו בקו הכחול: חד ומהיר.', 'Watch the blue line: sharp and quick.'), { fresh: true, view: 'scope' }),
    setC('C1', 1e-3,
      T('עכשיו הגדילו את הקבל ל-1000 µF. τ גדול, והקבל לא מספיק להיטען עד הסוף.',
        'Now make the capacitor bigger, 1000 µF. τ is large and the capacitor never gets time to fully charge.')),
    wait('C1', 4, (s, c) => c.t >= 4,
      T('התבוננו בקו הכחול: איטי ומעוגל, והוא כבר לא מגיע ל-5 V.', 'Watch the blue line: slow and rounded, and it no longer reaches 5 V.'), { fresh: true, view: 'scope' }),
    quiz(T('נגד של 10 kΩ וקבל של 100 µF. מה קבוע הזמן?', 'A 10 kΩ resistor and a 100 µF capacitor. What is the time constant?'),
      [T('1 שנייה', '1 second'), T('0.1 שנייה', '0.1 seconds'), T('10 שניות', '10 seconds')], 0,
      T('<code>10000 Ω × 0.0001 F = 1 s</code>.', '<code>10000 Ω × 0.0001 F = 1 s</code>.')),
    quiz(T('רוצים שהקבל יטען לאט יותר. מה עושים?', 'You want the capacitor to charge more slowly. What do you do?'),
      [T('מגדילים את הנגד או את הקבל', 'Make the resistor or the capacitor bigger'), T('מקטינים את הנגד', 'Make the resistor smaller'), T('מקטינים את הקבל', 'Make the capacitor smaller')], 0,
      T('τ הוא מכפלה: גדול יותר פירושו איטי יותר.', 'τ is a product: bigger means slower.')),
  ],
};
