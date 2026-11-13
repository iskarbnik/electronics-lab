import { T, info, measure, quiz, near, baseSetup, loopSchematic } from './common.js';
import { voltageBetween } from '../sim/circuit.js';

export default {
  id: 'l03-voltage',
  title: T('מתח', 'Voltage'),
  summary: T('מודדים מתח עם רב-מודד ורואים איך המתח מתחלק במעגל.', 'Measure voltage with a multimeter and see how it is shared around the loop.'),
  schematic: loopSchematic(),
  setup: baseSetup(),
  steps: [
    info(T(
      'מתח הוא הדחיפה שמניעה את הזרם. הוא תמיד נמדד בין שתי נקודות, כמו הפרש לחץ המים בין שני קצות צינור. מודדים אותו ב-V עם רב-מודד.',
      'Voltage is the push that drives current. It is always measured between two points, like the water pressure difference between two ends of a pipe. We measure it in V with a multimeter.')),
    measure('p+3', 'p-3',
      T('הניחו את הגשש האדום על פס ה-+ ואת השחור על פס ה--. תקבלו בערך 9 V, מתח הסוללה.',
        'Put the red probe on the + rail and the black one on the - rail. You get about 9 V, the battery voltage.'),
      { expect: s => near(voltageBetween(s, 'p+3', 'p-3'), 9, 0.1) }),
    measure('a5', 'a9',
      T('עכשיו מדדו על פני הנגד: מעמודה 5 לעמודה 9. בערך 6.9 V נופלים עליו.',
        'Now measure across the resistor, from column 5 to column 9. About 6.9 V drops across it.'),
      { expect: s => near(voltageBetween(s, 'a5', 'a9'), 6.9, 0.1) }),
    measure('a9', 'a10',
      T('ועל פני הנורית, מעמודה 9 לעמודה 10: בערך 2.1 V.', 'And across the LED, column 9 to column 10: about 2.1 V.'),
      { expect: s => near(voltageBetween(s, 'a9', 'a10'), 2.1, 0.1) }),
    info(T(
      '6.9 + 2.1 = 9. סכום המתחים סביב הלולאה שווה למתח הסוללה. זה חוק המתחים של קירכהוף.',
      '6.9 + 2.1 = 9. The voltages around the loop add up to the battery voltage. This is Kirchhoff\'s voltage law.')),
    measure('a5', 'p+3',
      T('נקודות שמחוברות בחוט הן באותו מתח. מדדו בין עמודה 5 לפס ה-+ ותקבלו 0 V.',
        'Points joined by a wire sit at the same voltage. Measure between column 5 and the + rail and you get 0 V.'),
      { expect: s => near(voltageBetween(s, 'a5', 'p+3'), 0, 0.05) }),
    quiz(T('בלולאה יש סוללה של 9 V, נגד ונורית. על הנורית נופלים 2 V. כמה על הנגד?', 'A loop has a 9 V battery, a resistor and an LED. The LED drops 2 V. How much does the resistor drop?'),
      [T('7 V', '7 V'), T('2 V', '2 V'), T('9 V', '9 V')], 0,
      T('המתחים סביב הלולאה מסתכמים ל-9 V, ולכן 9 - 2 = 7 V.', 'The voltages around the loop add up to 9 V, so 9 - 2 = 7 V.')),
    quiz(T('מה אומר רב-מודד שמחובר בין שתי נקודות שמחוברות בחוט?', 'What does a multimeter read between two points joined by a wire?'),
      [T('בערך 0 V', 'About 0 V'), T('9 V', '9 V'), T('2 V', '2 V')], 0,
      T('חוט הוא כמעט הולך מושלם, ולכן אין בו הפרש מתח.', 'A wire is nearly a perfect conductor, so there is no voltage difference along it.')),
  ],
};
