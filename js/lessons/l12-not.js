import { T, info, wire, place, toggle, quiz, batterySetup } from './common.js';
import { inputA, outChain, gateOnBoard, linkA, linkY, gateSchematic } from './logic.js';

export default {
  id: 'l12-not',
  unit: 2,
  truth: 'G1',
  title: T('שער NOT: הופך את האות', 'The NOT gate: flip the signal'),
  summary: T('שער עם כניסה אחת ומוצא אחד שתמיד הפוך מהכניסה.', 'A gate with one input and one output that is always the opposite.'),
  schematic: gateSchematic('not', false),
  setup: [...batterySetup(), ...inputA(), ...outChain(1)],
  steps: [
    info(T(
      'שער לוגי הוא שבב קטן שמקבל אותות גבוהים ונמוכים ומחליט מה יהיה המוצא. שער NOT הוא הפשוט ביותר: כניסה אחת, מוצא אחד, והמוצא תמיד הפוך מהכניסה. הכנו מתג עם נגד משיכה למטה, ונורית עם נגד בצד המוצא. בשבב אמיתי יש עוד שתי רגליים, למתח ולאדמה. כאן הלוח מספק אותם אוטומטית.',
      'A logic gate is a tiny chip that takes high and low signals and decides the output. The NOT gate is the simplest: one input, one output, and the output is always the opposite of the input. We prepared a switch with a pull-down resistor, and an LED with its resistor on the output side. A real chip has two more legs, for power and ground. Here the board supplies them automatically.')),
    place('G1', 'gate', ['j13', 'j14'], { fn: 'not' },
      T('הציבו שער NOT בתחתית הלוח: רגל הכניסה A בעמודה 13 והמוצא Y בעמודה 14.', 'Place a NOT gate in the bottom half: input leg A in column 13 and output Y in column 14.')),
    wire('XA', ['e4', 'f13'], 'blue',
      T('חברו חוט מעמודה 4, שם יוצא אות המתג, אל רגל הכניסה A של השער בעמודה 13.', 'Connect a wire from column 4, where the switch signal comes out, to input leg A of the gate in column 13.')),
    wire('XY', ['f14', 'e18'], 'green',
      T('חברו חוט ממוצא השער Y בעמודה 14 אל הנגד של הנורית בעמודה 18. המתג כבוי, ובכל זאת הנורית דולקת!', 'Connect a wire from the gate output Y in column 14 to the LED resistor in column 18. The switch is off, and yet the LED is lit!'),
      { expect: sim => sim.comps.D1.lit }),
    info(T(
      'הכניסה נמוכה (0) והמוצא גבוה (1), ולכן הנורית דולקת. המוצא של השער מחבר את הנורית אל ה-+ של הסוללה דרך הנגד. זה בדיוק מה ש-NOT עושה: הוא הופך.',
      'The input is low (0) and the output is high (1), so the LED is lit. The gate output connects the LED to the battery + through the resistor. That is exactly what NOT does: it inverts.')),
    toggle('SA', true,
      T('סגרו את המתג. הכניסה הופכת ל-1, והמוצא ל-0.', 'Close the switch. The input becomes 1 and the output becomes 0.'),
      { expect: sim => !sim.comps.D1.lit }),
    toggle('SA', false,
      T('פתחו את המתג שוב. הנורית חוזרת להידלק.', 'Open the switch again. The LED lights up again.'),
      { expect: sim => sim.comps.D1.lit }),
    info(T(
      'טבלת האמת למעלה מציגה את כל האפשרויות, והשורה הפעילה מודגשת: 0 הופך ל-1 ו-1 הופך ל-0. בסכמה העיגול הקטן במוצא של השער הוא בועת היפוך.',
      'The truth table above lists every possibility, with the active row highlighted: 0 becomes 1 and 1 becomes 0. In the schematic the little circle on the gate output is the inversion bubble.')),
    quiz(T('הכניסה היא 1. מה המוצא של שער NOT?', 'The input is 1. What is the output of a NOT gate?'),
      [T('0', '0'), T('1', '1'), T('תלוי בנורית', 'It depends on the LED')], 0,
      T('NOT תמיד הופך, ולכן 1 נהיה 0.', 'NOT always inverts, so 1 becomes 0.')),
    quiz(T('מחברים שני שערי NOT בטור והכניסה היא 1. מה המוצא הסופי?', 'Two NOT gates are connected in a row and the input is 1. What is the final output?'),
      [T('1', '1'), T('0', '0'), T('אין מוצא', 'There is no output')], 0,
      T('הראשון הופך ל-0 והשני הופך חזרה ל-1.', 'The first makes it 0 and the second flips it back to 1.')),
  ],
};
