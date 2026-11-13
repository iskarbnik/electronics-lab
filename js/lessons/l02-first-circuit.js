import { T, info, wire, place, flip, quiz, batterySetup, loopSchematic } from './common.js';

export default {
  id: 'l02-first-circuit',
  title: T('המעגל הראשון', 'Your first circuit'),
  summary: T('מדליקים נורית LED עם סוללה ונגד.', 'Light an LED with a battery and a resistor.'),
  schematic: loopSchematic(),
  setup: batterySetup(),
  steps: [
    info(T(
      'המטרה: להדליק נורית LED. נשתמש בשלושה חלקים: סוללה, נגד ונורית. התרשים החשמלי לצד הלוח הוא המפה, והוא מתמלא תוך כדי הבנייה.',
      'The goal: light an LED. We need three parts: a battery, a resistor and an LED. The schematic beside the board is the map, and it fills in as you build.')),
    wire('W1', ['p+5', 'a5'], 'red',
      T('חברו חוט אדום מפס ה-+ אל עמודה 5.', 'Connect a red wire from the + rail to column 5.')),
    place('R1', 'resistor', ['c5', 'c9'], { r: 470 },
      T('הציבו נגד של 470 Ω בין עמודה 5 לעמודה 9. אין לו כיוון.', 'Place a 470 Ω resistor between column 5 and column 9. It has no direction.')),
    place('D1', 'led', ['d9', 'd10'], { color: 'red' },
      T('הציבו נורית LED. הרגל הארוכה היא ה-+ (אנודה), והיא הולכת לצד של הנגד, בעמודה 9.',
        'Place an LED. The long leg is + (the anode) and goes on the resistor side, column 9.')),
    info(T(
      'עדיין חשוך. המעגל פתוח: הזרם לא יכול לחזור לסוללה.',
      'Still dark. This is an open circuit: the current has no way back to the battery.')),
    wire('W2', ['a10', 'p-10'], 'black',
      T('סגרו את המעגל בחוט שחור מהנורית אל פס ה--.', 'Close the loop with a black wire from the LED to the - rail.'),
      { expect: s => s.comps.D1.lit }),
    info(T(
      'הנורית דולקת! עקבו אחרי הנקודות הנעות: הזרם (המקובל) יוצא מה-+, עובר בנגד ובנורית וחוזר ל--. הקישו על כל רכיב כדי לראות את המספרים שלו.',
      'It lights! Follow the moving dots: conventional current leaves +, passes through the resistor and the LED, and returns to -. Tap any part to see its numbers.')),
    flip('D1', false,
      T('הפכו את הנורית (הקישו עליה). נורית היא רחוב חד סטרי.', 'Flip the LED around (tap it). An LED is a one-way street.')),
    flip('D1', true,
      T('הפכו אותה בחזרה והיא תידלק שוב.', 'Flip it back and it lights again.')),
    quiz(T('מה קורה כשהופכים את הנורית?', 'What happens when you reverse the LED?'),
      [T('היא כבויה, כי זרם עובר רק בכיוון אחד', 'It goes dark, current only passes one way'), T('היא דולקת חזק יותר', 'It gets brighter'), T('שום דבר', 'Nothing changes')], 0,
      T('נורית LED מוליכה רק מהאנודה (+) אל הקטודה (-).', 'An LED conducts only from the anode (+) to the cathode (-).')),
    quiz(T('למה המעגל לא דלק לפני שחיברנו את החוט האחרון?', 'Why was the LED dark before the last wire?'),
      [T('המעגל היה פתוח', 'The circuit was open'), T('הנורית הייתה שבורה', 'The LED was broken'), T('הסוללה התרוקנה', 'The battery was empty')], 0,
      T('זרם זורם רק במעגל סגור, בלולאה שלמה מהסוללה ובחזרה אליה.', 'Current flows only in a closed circuit, a complete loop from the battery and back.')),
  ],
};
