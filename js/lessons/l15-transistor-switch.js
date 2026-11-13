import { T, info, wire, place, press, measure, remove, replace, quiz, batterySetup, SETUP } from './common.js';
import { getComp } from '../sim/circuit.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l15-transistor-switch',
  title: T('טרנזיסטור כמפסק', 'The transistor as a switch'),
  summary: T('זרם קטן בבסיס מדליק זרם גדול בין הקולט לפולט.', 'A small base current turns on a large current from collector to emitter.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 8, rot: 90 },
      { id: 'B1', type: 'button', x: 6, y: 2, rot: 0 },
      { id: 'R1', type: 'resistor', x: 10, y: 6, rot: 90 },
      { id: 'R2', type: 'resistor', x: 15, y: 3, rot: 90 },
      { id: 'D1', type: 'led', x: 15, y: 7, rot: 90 },
      { id: 'Q1', type: 'npn', x: 14, y: 11, rot: 0 },
    ],
    wires: [
      bw([[2, 6], [2, -1], [15, -1], [15, 1]], 'R2'),
      bw([[2, 2], [4, 2]], 'R1'),
      bw([[8, 2], [10, 2], [10, 4]], 'R1'),
      bw([[10, 8], [10, 11], [12, 11]], 'R1'),
      bw([[15, 13], [15, 15], [2, 15], [2, 10]], 'Q1'),
    ],
    dots: [[2, 2]],
  },
  setup: [
    ...batterySetup(),
    wire('W3', ['p+3', 'a3'], 'red', SETUP),
    place('B1', 'button', ['c3', 'c6'], {}, SETUP),
    place('R1', 'resistor', ['d6', 'd10'], { r: 10000 }, SETUP),
    wire('WS', ['p+19', 'a19'], 'red', SETUP),
    place('R2', 'resistor', ['c19', 'c15'], { r: 330 }, SETUP),
    place('D1', 'led', ['d15', 'd11'], { color: 'red' }, SETUP),
    wire('WE', ['a12', 'p-12'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'לטרנזיסטור NPN שלוש רגליים: בסיס (<code>B</code>), קולט (<code>C</code>) ופולט (<code>E</code>). זרם קטן שנכנס לבסיס פותח את הדרך לזרם גדול מהקולט לפולט, כמו מפסק שמופעל בחשמל. הנורית והנגד שלה כבר מחוברים לקולט.',
      'An NPN transistor has three legs: base (<code>B</code>), collector (<code>C</code>) and emitter (<code>E</code>). A small current into the base opens the way for a large current from collector to emitter, like a switch operated by electricity. The LED and its resistor are already wired to the collector.')),
    place('Q1', 'npn', ['e10', 'e11', 'e12'], {},
      T('הציבו את הטרנזיסטור: הבסיס בעמודה 10, הקולט בעמודה 11 והפולט בעמודה 12. הנורית כבויה כי אין זרם בבסיס.', 'Place the transistor: base in column 10, collector in column 11, emitter in column 12. The LED is off because there is no base current.'),
      { expect: s => !s.comps.D1.lit && s.comps.Q1.state === 'off' }),
    press('B1', T('לחצו והחזיקו את הלחצן. זרם קטן עובר דרך 10 kΩ אל הבסיס, והנורית נדלקת.', 'Press and hold the button. A small current flows through 10 kΩ into the base, and the LED lights.')),
    wire('W4', ['e3', 'e6'], 'orange',
      T('כדי לא להחזיק את הלחצן, חברו חוט כתום מעל הלחצן, בין עמודה 3 לעמודה 6.', 'To stop holding the button, connect an orange wire across it, from column 3 to column 6.'),
      { expect: s => s.comps.D1.lit && s.comps.Q1.state === 'sat' }),
    measure('a10', 'a12',
      T('מדדו את מתח הבסיס-פולט: אדום בעמודה 10, שחור בעמודה 12. זה צומת דיודה, ולכן בערך 0.7 V.', 'Measure base to emitter: red in column 10, black in column 12. It is a diode junction, so about 0.7 V.'),
      { expect: s => Math.abs(s.comps.Q1.vbe - 0.7) < 0.05 }),
    measure('a11', 'a12',
      T('מדדו את מתח הקולט-פולט: אדום בעמודה 11, שחור בעמודה 12. כשהטרנזיסטור דולק לגמרי הוא כמעט סגור, ונופלים עליו רק כ-0.2 V.', 'Measure collector to emitter: red in column 11, black in column 12. Fully on, the transistor is almost a closed switch with only about 0.2 V across it.'),
      { expect: s => s.comps.Q1.vce < 0.35 }),
    info(T(
      'זרם הבסיס: <code>(9 - 0.7) / 10000 ≈ 0.83 mA</code>. זרם הנורית: בערך <code>20 mA</code>. זרם קטן שולט בזרם גדול פי 24, וזה אחד הרעיונות החשובים באלקטרוניקה. כך מיקרו-בקר מדליק מנוע או רמזור.',
      'Base current: <code>(9 - 0.7) / 10000 ≈ 0.83 mA</code>. LED current: about <code>20 mA</code>. A small current controls one 24 times larger, one of the key ideas of electronics. It is how a microcontroller turns on a motor or a lamp.')),
    quiz(T('מה תפקיד הנגד של 10 kΩ בבסיס?', 'What does the 10 kΩ resistor at the base do?'),
      [T('מגביל את זרם הבסיס', 'It limits the base current'), T('מגביר את האות', 'It amplifies the signal'), T('אין לו תפקיד', 'Nothing')], 0,
      T('צומת הבסיס-פולט הוא דיודה. בלי נגד זרם עצום יזרום וישרוף אותו.', 'The base-emitter junction is a diode. Without a resistor a huge current would flow and burn it.')),
    wire('W5', ['a6', 'a10'], 'yellow',
      T('עכשיו נשבור בכוונה: חברו חוט צהוב בין עמודה 6 לעמודה 10, מעקף של נגד הבסיס.', 'Now break something on purpose: connect a yellow wire from column 6 to column 10, bypassing the base resistor.'),
      { expect: (s, c) => getComp(c, 'Q1').burned && s.comps.Q1.burned }),
    info(T(
      'הטרנזיסטור נשרף. זרם הבסיס היה אמור להיות פחות מ-1 mA והפך לעשרות אמפרים. זכרו: תמיד נגד בבסיס.',
      'The transistor burned out. The base current should be under 1 mA and became many amps. Remember: always a resistor on the base.')),
    remove('W5', T('הסירו את החוט הצהוב.', 'Remove the yellow wire.')),
    replace('Q1', T('החליפו את הטרנזיסטור השרוף בחדש (הקישו עליו).', 'Swap the burned transistor for a new one (tap it).'),
      { expect: s => s.comps.D1.lit }),
    quiz(T('מה פירוש האותיות B, C ו-E בטרנזיסטור?', 'What do the letters B, C and E stand for on a transistor?'),
      [T('בסיס, קולט, פולט', 'Base, collector, emitter'), T('סוללה, קבל, חשמל', 'Battery, capacitor, electricity'), T('בקרה, זרם, אנרגיה', 'Control, current, energy')], 0,
      T('הבסיס שולט, זרם עיקרי זורם מהקולט לפולט.', 'The base controls, the main current flows from collector to emitter.')),
  ],
};
