import { T, info, wire, place, toggle, quiz, batterySetup } from './common.js';
import { inputA, inputB, outChain, gateSchematic } from './logic.js';

export default {
  id: 'l13-and',
  unit: 2,
  truth: 'G1',
  title: T('שער AND: שניהם חייבים', 'The AND gate: both must be 1'),
  summary: T('המוצא גבוה רק כששתי הכניסות גבוהות.', 'The output is high only when both inputs are high.'),
  schematic: gateSchematic('and', true),
  setup: [...batterySetup(), ...inputA(), ...inputB(), ...outChain(1)],
  steps: [
    info(T(
      'שער AND ("וגם") בודק שתי כניסות. המוצא גבוה רק כששתיהן גבוהות. הכנו שני מתגים עם נגדי משיכה למטה: המתג השמאלי הוא A והימני הוא B.',
      'The AND gate checks two inputs. The output is high only when both are high. We prepared two switches with pull-down resistors: the left switch is A and the right one is B.')),
    place('G1', 'gate', ['j13', 'j14', 'j15'], { fn: 'and' },
      T('הציבו שער AND: כניסה A בעמודה 13, כניסה B בעמודה 14 והמוצא Y בעמודה 15.', 'Place an AND gate: input A in column 13, input B in column 14 and output Y in column 15.')),
    wire('XA', ['e4', 'f13'], 'blue',
      T('חברו את המוצא של מתג A (עמודה 4) לכניסה A של השער (עמודה 13).', 'Connect the output of switch A (column 4) to gate input A (column 13).')),
    wire('XB', ['e10', 'f14'], 'yellow',
      T('חברו את המוצא של מתג B (עמודה 10) לכניסה B של השער (עמודה 14).', 'Connect the output of switch B (column 10) to gate input B (column 14).')),
    wire('XY', ['f15', 'e18'], 'green',
      T('חברו את מוצא השער Y (עמודה 15) אל הנגד של הנורית בעמודה 18. שני המתגים כבויים, ולכן הנורית כבויה.', 'Connect the gate output Y (column 15) to the LED resistor in column 18. Both switches are off, so the LED is off.'),
      { expect: sim => !sim.comps.D1.lit }),
    toggle('SA', true,
      T('סגרו את מתג A בלבד. A=1 ו-B=0, והנורית עדיין כבויה.', 'Close switch A only. A=1 and B=0, and the LED is still off.'),
      { expect: sim => !sim.comps.D1.lit }),
    toggle('SB', true,
      T('עכשיו סגרו גם את B. שתי הכניסות 1, והנורית נדלקת.', 'Now close B too. Both inputs are 1 and the LED lights up.'),
      { expect: sim => sim.comps.D1.lit }),
    toggle('SA', false,
      T('פתחו את A. הנורית כבה שוב.', 'Open A. The LED goes out again.'),
      { expect: sim => !sim.comps.D1.lit }),
    info(T(
      'AND הוא כמו שני מתגים בטור: הזרם עובר רק אם שניהם סגורים. בטבלת האמת רק שורה אחת נותנת 1.',
      'AND is like two switches in a row: current passes only if both are closed. In the truth table only one row gives 1.')),
    quiz(T('A=1 ו-B=0. מה המוצא של שער AND?', 'A=1 and B=0. What is the output of an AND gate?'),
      [T('0', '0'), T('1', '1')], 0,
      T('AND צריך ששתי הכניסות יהיו 1.', 'AND needs both inputs to be 1.')),
    quiz(T('מנעול נפתח רק אם הכרטיס תקין וגם הקוד נכון. איזה שער מתאים?', 'A lock opens only if the card is valid and the code is right. Which gate fits?'),
      [T('AND', 'AND'), T('OR', 'OR'), T('NOT', 'NOT')], 0,
      T('שני התנאים חייבים להתקיים יחד, וזה AND.', 'Both conditions must hold together, which is AND.')),
  ],
};
