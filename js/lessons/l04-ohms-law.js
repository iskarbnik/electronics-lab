import { T, info, select, setR, quiz, near, baseSetup, loopSchematic } from './common.js';

export default {
  id: 'l04-ohms-law',
  title: T('זרם, התנגדות וחוק אוהם', 'Current, resistance and Ohm\'s law'),
  summary: T('משנים את הנגד ורואים איך הזרם משתנה.', 'Change the resistor and watch the current respond.'),
  schematic: loopSchematic(),
  setup: baseSetup(),
  steps: [
    info(T(
      'זרם הוא כמות המטען שעוברת בכל שנייה. נמדוד אותו באמפר (A), ובמעגלים שלנו ב-mA. התנגדות מגבילה את הזרם ונמדדת באוהם (Ω).',
      'Current is how much charge passes each second. It is measured in amperes (A), and in our circuits in mA. Resistance limits the current and is measured in ohms (Ω).')),
    select('R1', T('הקישו על הנגד כדי לראות את המספרים שלו.', 'Tap the resistor to see its numbers.')),
    info(T(
      'לנגד יש 6.9 V עליו ו-470 Ω, ולכן הזרם הוא <code>I = V / R</code> = 6.9 V / 470 Ω = 14.6 mA. זה חוק אוהם.',
      'The resistor has 6.9 V across it and 470 Ω, so the current is <code>I = V / R</code> = 6.9 V / 470 Ω = 14.6 mA. That is Ohm\'s law.')),
    setR('R1', 1000,
      T('החליפו את הנגד ל-1000 Ω (הקישו עליו ובחרו ערך). הזרם יורד לכ-7 mA והנורית עמומה יותר.',
        'Change the resistor to 1000 Ω (tap it and pick a value). The current drops to about 7 mA and the LED dims.'),
      { expect: s => s.comps.R1.i > 0.006 && s.comps.R1.i < 0.008 }),
    setR('R1', 330,
      T('עכשיו 330 Ω. הזרם עולה לכ-20 mA, הגבול הנוח של הנורית.',
        'Now 330 Ω. The current rises to about 20 mA, the LED\'s comfortable limit.'),
      { expect: s => near(s.comps.R1.i, 0.0207, 0.002) }),
    setR('R1', 10000,
      T('ולבסוף 10000 Ω. כמעט שום זרם, והנורית בקושי זוהרת.', 'Finally 10000 Ω. Almost no current, and the LED barely glows.'),
      { expect: s => s.comps.R1.i < 0.001 && s.comps.D1.lit }),
    info(T(
      'שלוש צורות לאותו חוק: <code>V = I × R</code>, <code>I = V / R</code> ו-<code>R = V / I</code>. מכסים את מה שמחפשים ומחשבים.',
      'Three forms of the same law: <code>V = I × R</code>, <code>I = V / R</code> and <code>R = V / I</code>. Cover what you are looking for and calculate.')),
    setR('R1', 470, T('החזירו את הנגד ל-470 Ω.', 'Put the resistor back to 470 Ω.'),
      { expect: s => near(s.comps.R1.i, 0.0146, 0.0005) }),
    quiz(T('5 V על נגד של 250 Ω. מה הזרם?', '5 V across a 250 Ω resistor. What is the current?'),
      [T('20 mA', '20 mA'), T('50 mA', '50 mA'), T('1250 mA', '1250 mA')], 0,
      T('<code>I = V / R</code> = 5 / 250 = 0.02 A = 20 mA.', '<code>I = V / R</code> = 5 / 250 = 0.02 A = 20 mA.')),
    quiz(T('מה קורה לזרם אם מכפילים את ההתנגדות והמתח נשאר?', 'What happens to the current if you double the resistance and the voltage stays the same?'),
      [T('הוא קטן בחצי', 'It halves'), T('הוא מוכפל', 'It doubles'), T('הוא לא משתנה', 'It stays the same')], 0,
      T('הזרם הפוך ביחס להתנגדות: פי 2 התנגדות, חצי זרם.', 'Current is inversely proportional to resistance: twice the resistance, half the current.')),
  ],
};
