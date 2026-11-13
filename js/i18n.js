// Two languages, one table. t(key, vars) for UI strings, L({he,en}) for lesson content.
import * as store from './store.js';

const S = {
  'app.name': ['Electronics Lab', 'מעבדת אלקטרוניקה'],
  'lang.switch': ['Language', 'שפה'],
  'home.tagline': ['Learn electronics by building real circuits on a live breadboard.', 'לומדים אלקטרוניקה בבניית מעגלים אמיתיים על לוח ניסויים חי.'],
  'home.progress': ['{n} of {m} lessons done', '{n} מתוך {m} שיעורים הושלמו'],
  'home.unit1': ['Unit 1: The basics', 'יחידה 1: היסודות'],
  'home.unit2': ['Unit 2: Capacitors, diodes and transistors', 'יחידה 2: קבלים, דיודות וטרנזיסטורים'],
  'home.tools': ['Calculators', 'מחשבונים'],
  'home.toolsDesc': ['Ohm\'s law, LED resistor, colour code, RC', 'חוק אוהם, נגד לנורית, צבעי נגד, RC'],
  'home.parts': ['Parts encyclopedia', 'אנציקלופדיית רכיבים'],
  'home.partsDesc': ['Every part, its symbol and what it does', 'כל רכיב, הסמל שלו ומה הוא עושה'],
  'home.continue': ['Continue', 'המשך'],
  'home.done': ['Done', 'הושלם'],
  'home.lesson': ['Lesson {n}', 'שיעור {n}'],
  'home.next': ['Coming next', 'בקרוב'],
  'soon.logic': ['Digital logic gates', 'שערים לוגיים דיגיטליים'],
  'soon.arduino': ['Arduino Uno with code', 'Arduino Uno עם קוד'],
  'soon.sandbox': ['Sandbox, challenges and an AI tutor', 'ארגז חול, אתגרים ומורה פרטי מבוסס בינה מלאכותית'],
  'soon.esp': ['ESP32', 'ESP32'],
  'home.reset': ['Reset progress', 'איפוס התקדמות'],
  'reset.confirm': ['Erase all progress? This cannot be undone.', 'למחוק את כל ההתקדמות? אי אפשר לבטל את הפעולה.'],
  'reset.yes': ['Erase', 'מחיקה'],
  'reset.no': ['Cancel', 'ביטול'],
  'lesson.home': ['Home', 'בית'],
  'lesson.homeAria': ['Back to the lesson list', 'חזרה לרשימת השיעורים'],
  'lesson.step': ['Step {n} of {m}', 'שלב {n} מתוך {m}'],
  'lesson.meter': ['Multimeter', 'רב-מודד'],
  'lesson.restart': ['Restart', 'התחלה מחדש'],
  'lesson.restartAria': ['Discharge the capacitors and restart the clock', 'פריקת הקבלים ואיפוס השעון'],
  'scope.title': ['Oscilloscope', 'אוסילוסקופ'],
  'card.conducting': ['Conducting', 'מוליכה'],
  'card.blocking': ['Blocking', 'חוסמת'],
  'card.stored': ['Stored energy {e}', 'אנרגיה אצורה {e}'],
  'card.npn.off': ['Off: no base current, so no collector current.', 'כבוי: אין זרם בסיס, ולכן אין זרם קולט.'],
  'card.npn.active': ['Amplifying: collector current is about 100 times the base current {ib}.', 'מגבר: זרם הקולט הוא כפול 100 בערך מזרם הבסיס {ib}.'],
  'card.npn.sat': ['Fully on (saturated): it acts like a closed switch.', 'דולק לגמרי (רוויה): הוא מתנהג כמו מפסק סגור.'],
  'part.capacitor': ['Capacitor', 'קבל'],
  'part.diode': ['Diode', 'דיודה'],
  'part.npn': ['NPN transistor', 'טרנזיסטור NPN'],
  'part.gen': ['Signal generator', 'מחולל אותות'],
  'lesson.fit': ['Fit board', 'כל הלוח'],
  'lesson.fitAria': ['Show the whole board', 'הצגת כל הלוח'],
  'lesson.notFound': ['Lesson not found.', 'השיעור לא נמצא.'],
  'lesson.loadError': ['Could not load the lessons.', 'לא הצלחנו לטעון את השיעורים.'],
  'board.title': ['Breadboard', 'לוח ניסויים'],
  'schem.title': ['Schematic', 'סכמה'],
  'schem.toggle': ['Show or hide the schematic', 'הצגה או הסתרה של הסכמה'],
  'nav.back': ['Back', 'הקודם'],
  'nav.next': ['Next', 'הבא'],
  'nav.finish': ['Finish', 'סיום'],
  'hint.tapFirst': ['Tap a hole on a highlighted strip.', 'הקישו על חור בפס המסומן.'],
  'hint.tapSecond': ['Now tap the second hole.', 'עכשיו הקישו על החור השני.'],
  'hint.wrongStrip': ['That hole is on the wrong strip. Use a highlighted one.', 'החור הזה לא בפס הנכון. בחרו בפס מסומן.'],
  'hint.occupied': ['That hole is already taken. Pick another one.', 'החור הזה תפוס. בחרו חור אחר.'],
  'hint.threeSpace': ['This part needs three free holes in a row. Pick another spot.', 'לרכיב הזה צריך שלושה חורים פנויים ברצף. בחרו מקום אחר.'],
  'hint.placed': ['Placed!', 'הרכיב במקומו!'],
  'hint.exploreCol': ['Tap any hole in the middle of the board.', 'הקישו על חור כלשהו באמצע הלוח.'],
  'hint.exploreRail': ['Tap a hole on one of the long rails.', 'הקישו על חור באחד הפסים הארוכים.'],
  'hint.exploreWrong': ['Not that kind of strip. Try the highlighted idea above.', 'זה לא סוג הפס המתאים. נסו לפי ההוראה למעלה.'],
  'hint.measureRed': ['Tap the hole for the red probe (highlighted).', 'הקישו על החור של הגשוש האדום (מסומן).'],
  'hint.measureBlack': ['Now tap the hole for the black probe (highlighted).', 'עכשיו הקישו על החור של הגשוש השחור (מסומן).'],
  'hint.measureWrong': ['Move the probes to the highlighted strips.', 'העבירו את הגשושים לפסים המסומנים.'],
  'hint.do.select': ['Tap the part to select it.', 'הקישו על הרכיב כדי לבחור בו.'],
  'hint.do.flip': ['Select the LED and press Flip.', 'בחרו בנורית ולחצו על ״הפוך״.'],
  'hint.do.remove': ['Select the part and press Remove.', 'בחרו ברכיב ולחצו על ״הסר״.'],
  'hint.do.replace': ['Select the burned LED and press Replace.', 'בחרו בנורית השרופה ולחצו על ״החלף״.'],
  'hint.do.set': ['Select the resistor and pick a value.', 'בחרו בנגד ובחרו ערך.'],
  'hint.do.wait': ['Watch the circuit. Time is running.', 'התבוננו במעגל. הזמן עובר.'],
  'hint.do.press': ['Press and hold the button.', 'לחצו והחזיקו את הלחצן.'],
  'hint.do.turn': ['Select the potentiometer and move the slider.', 'בחרו בפוטנציומטר והזיזו את המחוון.'],
  'step.done': ['Done!', 'בוצע!'],
  'quiz.wrong': ['Not quite. Try again.', 'לא בדיוק. נסו שוב.'],
  'quiz.right': ['Correct!', 'נכון!'],
  'meter.title': ['Voltmeter', 'מד מתח'],
  'meter.hint': ['Tap two holes: red first, then black.', 'הקישו על שני חורים: קודם אדום ואז שחור.'],
  'meter.one': ['Tap a second hole for the black probe.', 'הקישו על חור שני עבור הגשוש השחור.'],
  'card.close': ['Close', 'סגירה'],
  'card.v': ['Voltage', 'מתח'],
  'card.i': ['Current', 'זרם'],
  'card.p': ['Power', 'הספק'],
  'card.value': ['Value', 'ערך'],
  'card.flip': ['Flip', 'הפוך'],
  'card.replace': ['Replace', 'החלף'],
  'card.remove': ['Remove', 'הסר'],
  'card.pressed': ['Pressed', 'לחוץ'],
  'card.released': ['Released', 'לא לחוץ'],
  'card.hot': ['Over its 1/4 W rating! It is overheating.', 'מעל ההספק המותר של <bdi dir="ltr">1/4 W</bdi>! הנגד מתחמם יתר על המידה.'],
  'card.burned': ['Burned out', 'שרופה'],
  'card.lit': ['Lit', 'דולקת'],
  'card.off': ['Off', 'כבויה'],
  'card.slider': ['Resistance, 0 Ω to 10 kΩ', 'התנגדות, מ-0 Ω עד 10 kΩ'],
  'card.rA': ['Wiper to A', 'מהמגלשה ל-A'],
  'part.battery': ['9 V battery', 'סוללת 9 וולט'],
  'part.wire': ['Wire', 'חוט'],
  'part.resistor': ['Resistor', 'נגד'],
  'part.led': ['LED', 'נורית LED'],
  'part.button': ['Push button', 'לחצן'],
  'part.pot': ['Potentiometer', 'פוטנציומטר'],
  'toast.burn.led': ['The LED burned out! {i} is far above the 20 mA it can take.', 'הנורית נשרפה! {i} זה הרבה מעל 20 mA שהיא מסוגלת לעמוד בהם.'],
  'toast.burn.diode': ['The diode burned out! {i} is more than its 1 A rating.', 'הדיודה נשרפה! {i} זה יותר מהדירוג שלה, 1 A.'],
  'toast.burn.npn': ['The transistor burned out! {i} is more than it can carry.', 'הטרנזיסטור נשרף! {i} זה יותר ממה שהוא מסוגל להעביר.'],
  'banner.short': ['Short circuit! The battery is pushing {i} through almost no resistance. Check your wires.', 'קצר חשמלי! הסוללה דוחפת {i} כמעט בלי התנגדות. בדקו את החוטים.'],
  'complete.title': ['Lesson complete!', 'השיעור הושלם!'],
  'complete.next': ['Next lesson', 'השיעור הבא'],
  'complete.home': ['Home', 'בית'],
  'complete.last': ['That was the last lesson in this unit. More is on the way.', 'זה היה השיעור האחרון ביחידה. עוד תוכן בדרך.'],
};

export const STRINGS = S;
const listeners = new Set();
let lang = 'en';

export function detect() {
  const saved = store.getLang();
  if (saved === 'he' || saved === 'en') return saved;
  const nav = globalThis.navigator?.language || '';
  return /^he\b/i.test(nav) || /^iw\b/i.test(nav) ? 'he' : 'en';
}

function apply() {
  const d = globalThis.document?.documentElement;
  if (!d) return;
  d.setAttribute('lang', lang);
  d.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
}

export function setLang(l, persist = true) {
  lang = l === 'he' ? 'he' : 'en';
  if (persist) store.setLang(lang);
  apply();
  for (const fn of listeners) fn(lang);
}
export const getLang = () => lang;
export const initLang = () => { lang = detect(); apply(); return lang; };
export const onLang = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function t(key, vars) {
  const e = S[key];
  let s = e ? e[lang === 'he' ? 1 : 0] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

export const L = o => (o ? (o[lang] ?? o.en ?? o.he ?? '') : '');

// A value with units that must read left to right inside Hebrew text.
export const ltr = s => `<bdi dir="ltr">${s}</bdi>`;

// Wraps every number+unit run ("819 mA", "4.7 kΩ", "1/4 W") in an isolated LTR <bdi>, so it keeps its
// order inside Hebrew text. Leaves HTML tags, <code> and existing <bdi> content untouched.
const UNIT_RUN = /((?:(?<![\p{L}\d.\/-])-)?(?<![\w.\/])\d+(?:[.,]\d+)?(?:\/\d+)?)(\s?)(µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|mF|µF|nF|pF|F|kHz|Hz|mJ|µJ|J|ms|µs|s)(?![A-Za-z0-9µΩ])/gu;
export function bidi(html) {
  if (!html) return html;
  let skip = 0;
  return String(html).split(/(<[^>]*>)/).map(part => {
    if (part.startsWith('<') && part.endsWith('>')) {
      const m = /^<(\/?)(code|bdi)\b/i.exec(part);
      if (m) skip = Math.max(0, skip + (m[1] ? -1 : 1));
      return part;
    }
    return skip ? part : part.replace(UNIT_RUN, (_, n, sp, u) => `<bdi dir="ltr">${n}${sp}${u}</bdi>`);
  }).join('');
}
