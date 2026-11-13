import { T, info, select, setR, quiz, near, baseSetup, loopSchematic } from './common.js';

export default {
  id: 'l06-power',
  title: T('הספק', 'Power'),
  summary: T('כמה אנרגיה כל רכיב צורך, ולמה נגדים מתחממים.', 'How much energy each part uses, and why resistors get hot.'),
  schematic: loopSchematic(),
  setup: baseSetup(),
  steps: [
    info(T(
      'הספק הוא הקצב שבו אנרגיה מומרת, ונמדד בוואט (W). החוק: <code>P = V × I</code>.',
      'Power is the rate at which energy is converted, measured in watts (W). The rule: <code>P = V × I</code>.')),
    select('BAT', T('הקישו על הסוללה. היא מספקת כ-131 mW.', 'Tap the battery. It delivers about 131 mW.'),
      { expect: s => near(s.comps.BAT.p, 0.131, 0.003) }),
    select('R1', T('עכשיו על הנגד. כ-100 mW שלו הופכים לחום.', 'Now the resistor. About 100 mW of it becomes heat.'),
      { expect: s => near(s.comps.R1.p, 0.1, 0.003) }),
    info(T(
      'הנורית לוקחת כ-31 mW. 100 + 31 = 131: מה שהסוללה נותנת, החלקים צורכים. האנרגיה נשמרת.',
      'The LED takes about 31 mW. 100 + 31 = 131: what the battery gives, the parts use. Energy is conserved.'),
      { expect: s => near(s.comps.D1.p, 0.031, 0.002) }),
    info(T(
      'נגדים בערכות מדורגים ל-1/4 W, כלומר 250 mW. מעל זה הם מתחממים יותר מדי ועלולים להיפגע.',
      'Kit resistors are rated 1/4 W, that is 250 mW. Above that they overheat.')),
    setR('R1', 330, T('החליפו ל-330 Ω. ההספק בנגד עולה לכ-141 mW, ועדיין בטווח הבטוח.', 'Change to 330 Ω. The resistor now dissipates about 141 mW, still safe.'),
      { expect: s => near(s.comps.R1.p, 0.141, 0.004) && !s.comps.R1.hot }),
    setR('R1', 470, T('החזירו ל-470 Ω.', 'Back to 470 Ω.')),
    quiz(T('9 V וזרם של 20 mA. מה ההספק?', '9 V at 20 mA. What is the power?'),
      [T('180 mW', '180 mW'), T('450 mW', '450 mW'), T('29 mW', '29 mW')], 0,
      T('<code>P = 9 × 0.02 = 0.18 W</code> = 180 mW.', '<code>P = 9 × 0.02 = 0.18 W</code> = 180 mW.')),
    quiz(T('5 V ו-100 mA בנגד של 1/4 W. מה קורה?', '5 V and 100 mA in a 1/4 W resistor. What happens?'),
      [T('הוא מתחמם יותר מדי', 'It overheats'), T('הכול בסדר', 'It is fine'), T('הוא לא מקבל זרם', 'It gets no current')], 0,
      T('<code>P = 5 × 0.1 = 0.5 W</code>, כפול ממה שהנגד מחזיק.', '<code>P = 5 × 0.1 = 0.5 W</code>, twice what the resistor can take.')),
  ],
};
