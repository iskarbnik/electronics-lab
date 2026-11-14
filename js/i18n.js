// Two languages, one table. t(key, vars) for UI strings, L({he,en}) for lesson content.
import * as store from './store.js';

const S = {
  'app.name': ['Electronics Lab', 'מעבדת אלקטרוניקה'],
  'lang.switch': ['Language', 'שפה'],
  'home.tagline': ['Learn electronics by building real circuits on a live breadboard.', 'לומדים אלקטרוניקה בבניית מעגלים אמיתיים על לוח ניסויים חי.'],
  'home.progress': ['{n} of {m} lessons done', '{n} מתוך {m} שיעורים הושלמו'],
  'home.unit1': ['Unit 1: The basics', 'יחידה 1: היסודות'],
  'home.continue': ['Continue', 'המשך'],
  'home.done': ['Done', 'הושלם'],
  'home.lesson': ['Lesson {n}', 'שיעור {n}'],
  'home.next': ['Coming next', 'בקרוב'],
  'soon.parts': ['More parts: capacitors, diodes, transistors', 'עוד רכיבים: קבלים, דיודות וטרנזיסטורים'],
  'soon.scope': ['Oscilloscope and calculators', 'אוסילוסקופ ומחשבונים'],
  'soon.enc': ['Parts encyclopedia', 'אנציקלופדיית רכיבים'],
  'soon.logic': ['Digital logic gates', 'שערים לוגיים דיגיטליים'],
  'home.unit4': ['Arduino', 'Arduino'],
  'home.arduino': ['Write code for an Arduino Uno and watch it drive real circuits.', 'כותבים קוד ל-Arduino Uno ורואים אותו מפעיל מעגלים אמיתיים.'],
  'ard.title': ['Arduino Uno lab', 'מעבדת Arduino Uno'],
  'ard.sub': ['Code, run, and see the circuit react', 'כותבים, מריצים, ורואים את המעגל מגיב'],
  'ard.pins': ['What is wired up:', 'מה מחובר:'],
  'ard.p.d13': ['red LED with a 220 Ω resistor', 'נורית אדומה עם נגד 220 Ω'],
  'ard.p.d8': ['yellow LED with a 220 Ω resistor', 'נורית צהובה עם נגד 220 Ω'],
  'ard.p.d9': ['green LED with a 220 Ω resistor (PWM, use analogWrite)', 'נורית ירוקה עם נגד 220 Ω (PWM, אפשר analogWrite)'],
  'ard.p.d2': ['push button to ground (use INPUT_PULLUP)', 'לחצן לאדמה (השתמשו ב-INPUT_PULLUP)'],
  'ard.p.a0': ['potentiometer between 5 V and ground', 'פוטנציומטר בין 5 V לאדמה'],
  'ard.pot': ['Turn the potentiometer', 'סובבו את הפוטנציומטר'],
  'ard.examples': ['Examples', 'דוגמאות'],
  'ard.run': ['Run', 'הרצה'],
  'ard.stop': ['Stop', 'עצירה'],
  'ard.reset': ['Reset board', 'איפוס הלוח'],
  'ard.code': ['Arduino code', 'קוד Arduino'],
  'ard.serial': ['Serial monitor', 'מוניטור סריאלי'],
  'ard.clear': ['Clear', 'ניקוי'],
  'ard.st.idle': ['Ready. Press Run.', 'מוכן. לחצו על הרצה.'],
  'ard.st.running': ['Running', 'רץ'],
  'ard.st.stopped': ['Stopped', 'נעצר'],
  'ard.st.done': ['The program finished.', 'התוכנית הסתיימה.'],
  'ard.err.line': ['Line {n}:', 'שורה {n}:'],
  'ard.err.generic': ['Something is wrong with the code.', 'יש בעיה בקוד.'],
  'ard.err.unexpected': ['Unexpected {name}. Check the code around here.', 'הופיע {name} במקום לא צפוי. בדקו את הקוד באזור הזה.'],
  'ard.err.expected': ['Expected {name} here.', 'חסר כאן {name}.'],
  'ard.err.eof': ['The code ended too early. A closing bracket may be missing.', 'הקוד נגמר מוקדם מדי. אולי חסר סוגר.'],
  'ard.err.char': ['Unknown character {name}.', 'תו לא מוכר {name}.'],
  'ard.err.string': ['A quote is not closed.', 'מרכאות לא נסגרו.'],
  'ard.err.lvalue': ['Cannot assign to that.', 'אי אפשר לשים ערך בזה.'],
  'ard.err.nosetup': ['The program needs a setup() function.', 'לתוכנית חסרה הפונקציה setup().'],
  'ard.err.noloop': ['The program needs a loop() function.', 'לתוכנית חסרה הפונקציה loop().'],
  'ard.err.undef': ['{name} is not declared.', 'המשתנה {name} לא הוגדר.'],
  'ard.err.undefFn': ['There is no function called {name}.', 'אין פונקציה בשם {name}.'],
  'ard.err.argc': ['Wrong number of arguments for {name}.', 'מספר הארגומנטים של {name} שגוי.'],
  'ard.err.index': ['{name} was used outside its size.', 'פנייה אל {name} מחוץ לגודל המערך.'],
  'ard.err.array': ['{name} is an array. Use it with an index like {name}[0].', '{name} הוא מערך. פנו אליו עם אינדקס, למשל {name}[0].'],
  'ard.err.stack': ['{name} called itself too many times.', 'הפונקציה {name} קראה לעצמה יותר מדי פעמים.'],
  'ard.err.type': ['That operation does not work on text.', 'הפעולה הזאת לא עובדת על טקסט.'],
  'ard.burned': ['An LED burned out. Press Reset board to replace it, and use a resistor.', 'נורית נשרפה. לחצו על איפוס הלוח כדי להחליף אותה, והשתמשו בנגד.'],
  'ard.overload': ['Pin {pin} is delivering more than 40 mA, which is more than an Arduino pin can take.', 'פין {pin} מספק יותר מ-40 mA, יותר ממה שפין של Arduino מסוגל לתת.'],
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
  'hint.potSpace': ['The potentiometer needs three free holes in a row. Pick another spot.', 'הפוטנציומטר צריך שלושה חורים פנויים ברצף. בחרו מקום אחר.'],
  'hint.placed': ['Placed!', 'הרכיב במקומו!'],
  'hint.exploreCol': ['Tap any hole in the middle of the board.', 'הקישו על חור כלשהו באמצע הלוח.'],
  'hint.exploreRail': ['Tap a hole on one of the long rails.', 'הקישו על חור באחד הפסים הארוכים.'],
  'hint.exploreWrong': ['Not that kind of strip. Try the highlighted idea above.', 'זה לא סוג הפס המתאים. נסו לפי ההוראה למעלה.'],
  'hint.measureRed': ['Tap the hole for the red probe (highlighted).', 'הקישו על החור של הגשוש האדום (מסומן).'],
  'hint.measureBlack': ['Now tap the hole for the black probe (highlighted).', 'עכשיו הקישו על החור של הגשוש השחור (מסומן).'],
  'hint.measureWrong': ['Move the probes to the highlighted strips.', 'העבירו את הגשושים לפסים המסומנים.'],
  'hint.do.select': ['Tap the part to select it.', 'הקישו על הרכיב כדי לבחור בו.'],
  'hint.do.flip': ['Select the part and press Flip.', 'בחרו ברכיב ולחצו על ״הפוך״.'],
  'hint.do.remove': ['Select the part and press Remove.', 'בחרו ברכיב ולחצו על ״הסר״.'],
  'hint.do.replace': ['Select the burned LED and press Replace.', 'בחרו בנורית השרופה ולחצו על ״החלף״.'],
  'hint.do.set': ['Select the resistor and pick a value.', 'בחרו בנגד ובחרו ערך.'],
  'hint.do.wait': ['Keep going and watch the part card or the meter.', 'המשיכו וצפו בכרטיס הרכיב או ברב-מודד.'],
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
  'part.diode': ['Diode', 'דיודה'],
  'part.capacitor': ['Capacitor', 'קבל'],
  'card.conducting': ['Conducting', 'מוליכה'],
  'card.blocking': ['Blocking', 'חוסמת'],
  'card.charge': ['Stored voltage', 'מתח אגור'],
  'toast.burn': ['The LED burned out! {i} is far above the 20 mA it can take.', 'הנורית נשרפה! {i} זה הרבה מעל 20 mA שהיא מסוגלת לעמוד בהם.'],
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
const UNIT_RUN = /((?:(?<![\p{L}\d.\/-])-)?(?<![\w.\/])\d+(?:[.,]\d+)?(?:\/\d+)?)(\s?)(µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F|s)(?![A-Za-z0-9µΩ])/gu;
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
