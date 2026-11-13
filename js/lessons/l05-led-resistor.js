import { T, info, remove, wire, place, replace, quiz, baseSetup, loopSchematic } from './common.js';
import { getComp } from '../sim/circuit.js';

export default {
  id: 'l05-led-resistor',
  title: T('למה נורית צריכה נגד', 'Why an LED needs a resistor'),
  summary: T('שורפים נורית בכוונה, כאן זה לא עולה כלום, ולומדים לחשב נגד.', 'Burn an LED on purpose, it costs nothing here, then learn to size the resistor.'),
  schematic: loopSchematic(),
  setup: baseSetup(),
  steps: [
    info(T(
      'עכשיו נשבור משהו בכוונה. כאן זה לא עולה כלום.',
      'Now we will break something on purpose. Here it costs nothing.')),
    remove('R1', T('הוציאו את הנגד (הקישו עליו ובחרו להסיר).', 'Remove the resistor (tap it and choose remove).')),
    wire('WX', ['c5', 'c9'], 'yellow',
      T('במקומו חברו חוט צהוב בין עמודה 5 לעמודה 9. זה קצר סביב הנגד.',
        'In its place connect a yellow wire between column 5 and column 9. That is a short around the resistor.'),
      { expect: (s, c) => getComp(c, 'D1').burned && s.comps.D1.burned }),
    info(T(
      'הנורית נשרפה. ניסו לעבור בה כ-800 mA, ונורית מחזיקה כ-20 mA. על שולחן עבודה אמיתי היה כאן הבזק, ריח ונורית מתה.',
      'The LED burned out. About 800 mA tried to flow, and an LED takes about 20 mA. On a real bench you would get a flash, a smell and a dead LED.')),
    remove('WX', T('הסירו את החוט הצהוב.', 'Remove the yellow wire.')),
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 },
      T('החזירו נגד של 470 Ω.', 'Put the 470 Ω resistor back.')),
    replace('D1', T('החליפו את הנורית השרופה בחדשה (הקישו עליה).', 'Swap the burnt LED for a new one (tap it).'),
      { expect: s => s.comps.D1.lit }),
    info(T(
      'איך בוחרים נגד? מחסירים את מתח הנורית ממתח הסוללה ומחלקים בזרם הרצוי: <code>R = (9 - 2) / 0.02 = 350 Ω</code>. לוקחים את הערך התקני הבא כלפי מעלה, 390 Ω או 470 Ω.',
      'How do you pick the resistor? Subtract the LED voltage from the supply and divide by the current you want: <code>R = (9 - 2) / 0.02 = 350 Ω</code>. Take the next standard value up, 390 Ω or 470 Ω.')),
    quiz(T('ספק של 5 V, נורית של 2 V ורצון ב-20 mA. איזה נגד?', 'A 5 V supply, a 2 V LED and 20 mA wanted. Which resistor?'),
      [T('150 Ω', '150 Ω'), T('250 Ω', '250 Ω'), T('15 Ω', '15 Ω')], 0,
      T('<code>R = (5 - 2) / 0.02 = 150 Ω</code>.', '<code>R = (5 - 2) / 0.02 = 150 Ω</code>.')),
    quiz(T('החישוב נותן ערך שאינו קיים בסדרה התקנית. מה בוחרים?', 'The calculation gives a value that is not a standard one. What do you choose?'),
      [T('את הערך התקני הגבוה הבא', 'The next higher standard value'), T('את הערך התקני הנמוך הבא', 'The next lower standard value'), T('בלי נגד', 'No resistor')], 0,
      T('נגד גבוה יותר נותן קצת פחות זרם, וזה בטוח לנורית. נגד נמוך עלול לעבור את הגבול.', 'A slightly higher resistor gives slightly less current, which is safe for the LED. A lower one could go past the limit.')),
  ],
};
