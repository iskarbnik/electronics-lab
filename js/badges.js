// Badges are computed from progress; nothing extra is stored except a few flags.
const T = (he, en) => ({ he, en });
const allDone = (ids, ctx) => ids.every(id => ctx.lessonDone(id));

// ctx: { lessonDone(id), ardDone(id), flag(k), challengeIds, ardIds, espIds }
export const BADGES = [
  { id: 'first', title: T('צעד ראשון', 'First step'), desc: T('סיימו שיעור ראשון.', 'Finish your first lesson.'), test: c => ['l01-breadboard', 'l02-first-circuit', 'l03-voltage'].some(c.lessonDone) || c.anyLesson() },
  { id: 'basics', title: T('יסודות הלוח', 'Breadboard basics'), desc: T('סיימו את חמשת השיעורים הראשונים.', 'Finish the first five lessons.'), test: c => c.firstN(5) },
  { id: 'unit1', title: T('בוגר יחידה 1', 'Unit 1 graduate'), desc: T('סיימו את עשרת שיעורי היסוד.', 'Finish all ten foundation lessons.'), test: c => c.firstN(10) },
  { id: 'charged', title: T('טעון', 'Charged up'), desc: T('סיימו את שיעור הקבל.', 'Finish the capacitor lesson.'), test: c => c.lessonDone('l12-capacitor') },
  { id: 'valve', title: T('אדון השסתום', 'Valve master'), desc: T('סיימו את שיעור הטרנזיסטור.', 'Finish the transistor lesson.'), test: c => c.lessonDone('l13-transistor') },
  { id: 'logician', title: T('לוגיקאי', 'Logician'), desc: T('סיימו את שיעורי השערים הלוגיים והתפס.', 'Finish the logic gate and latch lessons.'), test: c => ['l14-logic-basics', 'l15-logic-more', 'l16-latch'].every(c.lessonDone) },
  { id: 'coder', title: T('המתכנת הראשון', 'First coder'), desc: T('סיימו את שיעור ההבהוב ב-Arduino.', 'Finish the Arduino blink lesson.'), test: c => c.ardDone('a01-blink') },
  { id: 'sketch', title: T('אמן סקצ\'ים', 'Sketch artist'), desc: T('סיימו את כל שיעורי ה-Arduino.', 'Finish every Arduino lesson.'), test: c => c.ardIds.every(c.ardDone) },
  { id: 'esp', title: T('חבר ל-ESP32', 'ESP32 explorer'), desc: T('סיימו את שיעורי ה-ESP32.', 'Finish the ESP32 lessons.'), test: c => c.espIds.every(c.ardDone) },
  { id: 'builder', title: T('בונה חופשי', 'Free builder'), desc: T('בנו משהו בארגז החול.', 'Build something in the sandbox.'), test: c => !!c.flag('sandbox') },
  { id: 'challenger', title: T('מתמודד', 'Challenger'), desc: T('פתרו אתגר אחד.', 'Solve one challenge.'), test: c => c.challengesDone() >= 1 },
  { id: 'champion', title: T('אלוף האתגרים', 'Challenge champion'), desc: T('פתרו את כל האתגרים.', 'Solve every challenge.'), test: c => c.challengesDone() >= c.challengeIds.length },
  { id: 'quiz80', title: T('חד', 'Sharp'), desc: T('קבלו 80% או יותר בחידון.', 'Score 80% or more in the quiz.'), test: c => (c.flag('quizBest') ?? 0) >= 80 },
  { id: 'perfect', title: T('מושלם', 'Perfect score'), desc: T('קבלו 100% בחידון.', 'Score 100% in the quiz.'), test: c => (c.flag('quizBest') ?? 0) >= 100 },
  { id: 'smoke', title: T('בדיקת עשן', 'Smoke test'), desc: T('שרפו נורית (בכוונה, כמובן).', 'Burn an LED (on purpose, of course).'), test: c => !!c.flag('burned') },
  { id: 'curious', title: T('סקרן', 'Curious'), desc: T('שאלו את המורה הפרטי.', 'Ask the tutor a question.'), test: c => !!c.flag('tutor') },
];

export function makeCtx({ lessons, ardLessons, espLessons, challengeIds, isDone, ardDone, getFlag }) {
  const ids = lessons.map(l => l.id);
  return {
    lessonDone: isDone, ardDone, flag: getFlag,
    anyLesson: () => ids.some(isDone),
    firstN: n => ids.slice(0, n).every(isDone),
    challengeIds, challengesDone: () => challengeIds.filter(id => getFlag('ch:' + id)).length,
    ardIds: ardLessons.map(l => l.id), espIds: espLessons.map(l => l.id),
  };
}

export const earned = ctx => BADGES.filter(b => b.test(ctx));
