import { T, info, wire, place, press, quiz, batterySetup } from './common.js';

const bw = pts => ({ pts, of: 'BAT', dir: 1 });

export default {
  id: 'l07-button',
  title: T('הלחצן', 'The push button'),
  summary: T('מוסיפים לחצן שפותח וסוגר את המעגל.', 'Add a button that opens and closes the circuit.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
      { id: 'S1', type: 'button', x: 5, y: 2, rot: 0 },
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
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 }, T('הכנה', 'Setup')),
    place('D1', 'led', ['d9', 'd10'], { color: 'red' }, T('הכנה', 'Setup')),
    wire('W2', ['a10', 'p-10'], 'black', T('הכנה', 'Setup')),
  ],
  steps: [
    info(T(
      'הנורית והנגד כבר במקום, אבל חסר חיבור למתח. הפעם נשים בדרך לחצן, מתג שנסגר רק כשלוחצים עליו.',
      'The LED and resistor are already in place, but nothing feeds them yet. This time we put a button in the way, a switch that closes only while you press it.')),
    wire('W1', ['p+3', 'a3'], 'red',
      T('חברו חוט אדום מפס ה-+ אל עמודה 3.', 'Connect a red wire from the + rail to column 3.')),
    place('S1', 'button', ['c3', 'd5'], {},
      T('הציבו את הלחצן בין עמודה 3 לעמודה 5.', 'Place the button between column 3 and column 5.')),
    info(T(
      'הנורית כבויה. הלחצן לא לחוץ, ולכן המעגל פתוח.',
      'The LED is dark. The button is not pressed, so the circuit is open.')),
    press('S1', T('לחצו על הלחצן והחזיקו. הנורית נדלקת.', 'Press and hold the button. The LED lights.')),
    info(T(
      'כשהלחצן לחוץ המעגל סגור והזרם זורם. כשעוזבים הוא נפתח שוב. כל מתג עובד כך: הוא סוגר או פותח את הלולאה.',
      'While pressed, the circuit is closed and current flows. Let go and it opens again. Every switch works this way: it closes or opens the loop.')),
    quiz(T('הלחצן לא לחוץ. איזה מעגל זה?', 'The button is not pressed. What kind of circuit is this?'),
      [T('מעגל פתוח', 'Open circuit'), T('מעגל סגור', 'Closed circuit'), T('קצר', 'Short circuit')], 0,
      T('יש הפסק בלולאה, ולכן לא זורם זרם.', 'There is a break in the loop, so no current flows.')),
    quiz(T('איפה אפשר לשים את הלחצן בלולאה?', 'Where in the loop can the button go?'),
      [T('בכל מקום בלולאה, התוצאה זהה', 'Anywhere in the loop, the result is the same'), T('רק ליד הסוללה', 'Only next to the battery'), T('רק ליד הנורית', 'Only next to the LED')], 0,
      T('בלולאה אחת אותו זרם עובר בכל החלקים, ולכן הפסק בכל נקודה עוצר את כולם.', 'In a single loop the same current passes through every part, so a break anywhere stops them all.')),
  ],
};
