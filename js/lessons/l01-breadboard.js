import { T, info, explore, wire, quiz } from './common.js';

export default {
  id: 'l01-breadboard',
  title: T('לוח המטריצה', 'The breadboard'),
  summary: T('איך בנויים החורים, הפסים ופסי המתח, ומחברים סוללה.', 'How the holes, strips and rails work, and how to hook up the battery.'),
  schematic: null,
  setup: [],
  steps: [
    info(T(
      'לוח מטריצה הוא לוח פלסטיק מלא חורים. מכניסים אליו רכיבים ללא הלחמה, ואפשר לשנות הכול בכל רגע.',
      'A breadboard is a plastic board full of tiny holes. You push parts into it with no soldering, and you can change everything any time.')),
    explore('col',
      T('מתחת לחורים מסתתרים פסי מתכת. הקישו על חור בעמודה כלשהי ותראו שחמשת החורים שבה הם פס אחד.',
        'Hidden under the holes are metal strips. Tap a hole in any column and you will see that the 5 holes in it are one strip.')),
    explore('rail',
      T('בקצוות הלוח יש פסי מתח ארוכים, אחד עם + ואחד עם -. הקישו על חור באחד מהם: כל השורה היא פס אחד.',
        'Along the edges run long power rails, one marked + and one marked -. Tap a hole in one: the whole row is a single strip.')),
    info(T(
      'באמצע הלוח יש מרווח. הוא מפריד בין החורים a עד e לבין f עד j, ולכן הם אינם מחוברים זה לזה.',
      'The gap in the middle keeps holes a to e apart from holes f to j, so they are not connected to each other.')),
    wire('WP', ['BAT+', 'p+1'], 'red',
      T('חברו חוט אדום מהקוטב + של הסוללה לפס ה-+ העליון.',
        'Connect a red wire from the battery + terminal to the top + rail.')),
    wire('WN', ['BAT-', 'p-1'], 'black',
      T('עכשיו חוט שחור מהקוטב - של הסוללה לפס ה-- העליון.',
        'Now a black wire from the battery - terminal to the top - rail.')),
    info(T(
      'פס ה-+ נמצא עכשיו 9 V מעל פס ה--. שום דבר לא זורם, כי אין נתיב שמחבר ביניהם.',
      'The + rail is now 9 V above the - rail. Nothing flows, because there is no path joining them.')),
    quiz(T('אילו חורים מחוברים לחור a3?', 'Which holes are connected to a3?'),
      [T('b3, c3, d3, e3', 'b3, c3, d3, e3'), T('a4, a5, a6', 'a4, a5, a6'), T('f3, g3, h3', 'f3, g3, h3')], 0,
      T('חמשת החורים a עד e באותה עמודה הם פס אחד. a4 הוא בעמודה אחרת, ו-f3 נמצא מעבר למרווח.',
        'The 5 holes a to e in one column are a single strip. a4 is in another column, and f3 is across the gap.')),
    quiz(T('בשביל מה פסי המתח?', 'What are the rails for?'),
      [T('להפיץ + ו- לכל הלוח', 'To spread + and - across the whole board'), T('לחבר את שני צדי המרווח', 'To join the two sides of the gap'), T('להחזיק את הסוללה', 'To hold the battery')], 0,
      T('הסוללה מחוברת פעם אחת, ומכל חור בפס אפשר לקחת מתח בכל מקום בלוח.',
        'The battery is connected once, and from any hole in a rail you can take power anywhere on the board.')),
  ],
};
