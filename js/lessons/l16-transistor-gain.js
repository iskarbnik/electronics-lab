import { T, info, wire, place, select, setR, quiz, batterySetup, SETUP } from './common.js';

const bw = (pts, of = 'BAT') => ({ pts, of, dir: 1 });

export default {
  id: 'l16-transistor-gain',
  title: T('הגבר של טרנזיסטור', 'Transistor gain'),
  summary: T('זרם הקולט גדול פי 100 מזרם הבסיס, עד שהטרנזיסטור נכנס לרוויה.', 'The collector current is 100 times the base current, until the transistor saturates.'),
  schematic: {
    parts: [
      { id: 'BAT', type: 'battery', x: 2, y: 8, rot: 90 },
      { id: 'R1', type: 'resistor', x: 6, y: 2, rot: 0 },
      { id: 'R2', type: 'resistor', x: 15, y: 3, rot: 90 },
      { id: 'D1', type: 'led', x: 15, y: 7, rot: 90 },
      { id: 'Q1', type: 'npn', x: 14, y: 11, rot: 0 },
    ],
    wires: [
      bw([[2, 6], [2, -1], [15, -1], [15, 1]], 'R2'),
      bw([[2, 2], [4, 2]], 'R1'),
      bw([[8, 2], [10, 2], [10, 11], [12, 11]], 'R1'),
      bw([[15, 13], [15, 15], [2, 15], [2, 10]], 'Q1'),
    ],
    dots: [[2, 2]],
  },
  setup: [
    ...batterySetup(),
    wire('W3', ['p+3', 'a3'], 'red', SETUP),
    place('R1', 'resistor', ['c3', 'c10'], { r: 100000 }, SETUP),
    wire('WS', ['p+19', 'a19'], 'red', SETUP),
    place('R2', 'resistor', ['c19', 'c15'], { r: 330 }, SETUP),
    place('D1', 'led', ['d15', 'd11'], { color: 'red' }, SETUP),
    wire('WE', ['a12', 'p-12'], 'black', SETUP),
  ],
  steps: [
    info(T(
      'בשיעור הקודם הטרנזיסטור היה מפסק. הפעם נבדוק מה קורה בין "כבוי" ל"דולק". נגד הבסיס כבר בן 100 kΩ, ונשנה אותו.',
      'In the last lesson the transistor was a switch. This time we look at what happens between off and on. The base resistor is 100 kΩ now, and we will change it.')),
    place('Q1', 'npn', ['e10', 'e11', 'e12'], {},
      T('הציבו את הטרנזיסטור: בסיס בעמודה 10, קולט בעמודה 11, פולט בעמודה 12. הנורית דולקת בעמימות.', 'Place the transistor: base in column 10, collector in column 11, emitter in column 12. The LED glows dimly.'),
      { expect: s => s.comps.Q1.state === 'active' && s.comps.D1.lit && s.comps.D1.brightness < 0.5 }),
    select('Q1', T('הקישו על הטרנזיסטור. הכרטיס מראה את זרם הקולט, ובשורה למטה את זרם הבסיס.', 'Tap the transistor. The card shows the collector current, and the line below shows the base current.')),
    info(T(
      'זרם הבסיס כאן: <code>(9 - 0.7) / 100 kΩ ≈ 83 µA</code>. זרם הקולט הוא פי 100 ממנו, כלומר <code>8.3 mA</code>. זה הגבר זרם (β) של 100.',
      'The base current here: <code>(9 - 0.7) / 100 kΩ ≈ 83 µA</code>. The collector current is 100 times that, so <code>8.3 mA</code>. That is a current gain (β) of 100.')),
    setR('R1', 220000,
      T('הגדילו את נגד הבסיס ל-220 kΩ (הקישו עליו ובחרו). זרם בסיס קטן יותר, ולכן הנורית עמומה יותר.', 'Raise the base resistor to 220 kΩ (tap it and pick a value). Less base current, so a dimmer LED.'),
      { expect: s => s.comps.Q1.state === 'active' && s.comps.Q1.i < 0.005 }),
    setR('R1', 47000,
      T('עכשיו 47 kΩ. יותר זרם בסיס, נורית בהירה יותר.', 'Now 47 kΩ. More base current, a brighter LED.'),
      { expect: s => s.comps.Q1.state === 'active' && s.comps.Q1.i > 0.015 }),
    setR('R1', 10000,
      T('ועכשיו 10 kΩ. הבסיס אמור לתת 83 mA בקולט, אבל הנורית והנגד שלה לא נותנים יותר מ-20 mA בערך.', 'And now 10 kΩ. The base should give 83 mA at the collector, but the LED and its resistor allow only about 20 mA.'),
      { expect: s => s.comps.Q1.state === 'sat' }),
    info(T(
      'זו רוויה: הטרנזיסטור פתוח עד הסוף, והזרם נקבע לפי מה שמחובר לקולט ולא לפי הבסיס. בין "כבוי" ל"רוויה" יש אזור הגברה, שבו הקולט עוקב אחרי הבסיס פי β.',
      'This is saturation: the transistor is wide open and the current is set by what is attached to the collector, not by the base. Between off and saturated lies the amplifying region, where the collector follows the base times β.')),
    quiz(T('זרם הבסיס הוא 0.1 mA והטרנזיסטור באזור ההגברה עם β = 100. מה זרם הקולט?', 'The base current is 0.1 mA and the transistor is in its amplifying region with β = 100. What is the collector current?'),
      [T('10 mA', '10 mA'), T('0.1 mA', '0.1 mA'), T('100 mA', '100 mA')], 0,
      T('<code>0.1 mA × 100 = 10 mA</code>.', '<code>0.1 mA × 100 = 10 mA</code>.')),
    quiz(T('למה הזרם בנורית לא ממשיך לעלות כשמקטינים את נגד הבסיס מתחת ל-10 kΩ?', 'Why does the LED current stop rising when you go below 10 kΩ on the base?'),
      [T('הטרנזיסטור כבר ברוויה והעומס מגביל את הזרם', 'The transistor is saturated and the load limits the current'), T('הנגד התקלקל', 'The resistor broke'), T('הסוללה התרוקנה', 'The battery drained')], 0,
      T('ברוויה אין עוד "מקום" להגברה: הזרם נקבע לפי הנורית והנגד של 330 Ω.', 'In saturation there is no room left to amplify: the current is set by the LED and the 330 Ω resistor.')),
  ],
};
