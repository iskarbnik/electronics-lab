// Guided Arduino lessons. They run in the lab screen on the starter kit (or on a bare Uno).
// Step types: info, code (loads `code` into the editor; done when `goal(ctx)` is true), build (done when `goal` is true), quiz.
// ctx = { board, runner, code, out, running, stats }. `demo(board, ms)` plays what a learner would do, for the tests.

const T = (he, en) => ({ he, en });
import { addComp } from '../sim/circuit.js';
import { unoHole } from './kit.js';

const info = text => ({ type: 'info', text });
const quiz = (text, options, answer, why) => ({ type: 'quiz', text, options, answer, why });
const code = (text, src, goal, demo) => ({ type: 'code', text, code: src, goal, demo });
const toggles = (b, id) => b.stats.toggles[id] || 0;

const BLINK = T(
`void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`,
`void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`);

export const ARDUINO_LESSONS = [
  {
    id: 'a01-blink',
    title: T('הבהוב ראשון', 'Your first blink'),
    summary: T('כותבים תוכנה שמדליקה ומכבה נורית.', 'Write a program that switches an LED on and off.'),
    circuit: 'kit',
    steps: [
      info(T(
        'Arduino הוא מחשב קטן. התוכנית שלו כוללת שתי פונקציות: <code>setup()</code> רצה פעם אחת בהתחלה, ו-<code>loop()</code> רצה שוב ושוב לנצח. בלוח כבר מחוברת נורית אדומה לפין 13, דרך נגד של 220 Ω.',
        'An Arduino is a tiny computer. Its program has two functions: <code>setup()</code> runs once at the start, and <code>loop()</code> runs again and again forever. A red LED is already wired to pin 13 through a 220 Ω resistor.')),
      code(T('הקוד כבר בעורך. לחצו על "הרצה" וראו את הנורית מהבהבת.', 'The code is in the editor. Press Run and watch the LED blink.'),
        BLINK, ({ board }) => toggles(board, 'L1') >= 2),
      code(T('עכשיו שנו את שני ערכי ה-<code>delay</code> ל-200 והריצו שוב. הנורית צריכה להבהב מהר יותר.', 'Now change both <code>delay</code> values to 200 and run again. The LED should blink faster.'),
        null, ({ board, running }) => running && board.stats.ms > 1500 && toggles(board, 'L1') >= 6,
        (board, ms, ctx) => { if (ms === 0) ctx.setCode(ctx.code().replace(/delay\(1000\)/g, 'delay(200)')); }),
      quiz(T('מה עושה <code>delay(1000)</code>?', 'What does <code>delay(1000)</code> do?'),
        [T('עוצר את התוכנית לשנייה אחת', 'Pauses the program for one second'), T('מדליק את הנורית לאלף שניות', 'Lights the LED for a thousand seconds'), T('חוזר אלף פעם', 'Repeats a thousand times')], 0,
        T('המספר הוא באלפיות שנייה (ms), ולכן 1000 הם שנייה אחת.', 'The number is in milliseconds, so 1000 is one second.')),
      quiz(T('למה יש נגד בין הפין לנורית?', 'Why is there a resistor between the pin and the LED?'),
        [T('הוא מגביל את הזרם כדי שהנורית לא תישרף', 'It limits the current so the LED does not burn out'), T('הוא מדליק את הנורית', 'It switches the LED on'), T('הוא מאט את התוכנית', 'It slows the program down')], 0,
        T('פין נותן 5 V ונורית צריכה כ-20 mA. בלי נגד הזרם גבוה מדי: <code>R = (5 - 2) / 0.02 ≈ 150 Ω</code>.', 'A pin gives 5 V and an LED wants about 20 mA. Without a resistor the current is far too high: <code>R = (5 - 2) / 0.02 ≈ 150 Ω</code>.')),
    ],
  },
  {
    id: 'a02-button',
    title: T('קוראים לחצן', 'Reading a button'),
    summary: T('קלט דיגיטלי, INPUT_PULLUP ותנאי if.', 'Digital input, INPUT_PULLUP and the if statement.'),
    circuit: 'kit',
    steps: [
      info(T(
        'עד עכשיו הפין היה פלט. עכשיו נקרא ממנו. הלחצן על פין 2 מחובר לאדמה, ולכן כשלוחצים עליו הפין יורד ל-0 V.',
        'So far a pin was an output. Now we read from one. The button on pin 2 goes to ground, so pressing it pulls the pin down to 0 V.')),
      code(T('הריצו, ולחצו על הלחצן בלוח. הנורית הצהובה (פין 8) נדלקת כשלוחצים ונכבית כשעוזבים.', 'Run it, then press the button on the board. The yellow LED (pin 8) lights while you press and goes out when you let go.'),
        T(
`void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(8, HIGH);
  } else {
    digitalWrite(8, LOW);
  }
}
`,
`void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(8, HIGH);
  } else {
    digitalWrite(8, LOW);
  }
}
`), ({ board }) => board.stats.litWhilePressed && board.stats.darkWhileReleased,
        (board, ms) => { const s = board.circuit.comps.find(c => c.id === 'S1'); s.props.pressed = ms > 300 && ms < 800; board.dirty = true; }),
      quiz(T('מה עושה <code>INPUT_PULLUP</code>?', 'What does <code>INPUT_PULLUP</code> do?'),
        [T('מחבר נגד פנימי ל-5 V, כך שפין שלא לוחצים עליו קורא HIGH', 'Connects an internal resistor to 5 V, so an untouched pin reads HIGH'), T('מגביר את הזרם', 'Raises the current'), T('הופך את הפין לפלט', 'Makes the pin an output')], 0,
        T('בלי נגד כזה פין שאינו מחובר "צף" וקורא ערכים אקראיים.', 'Without such a resistor an unconnected pin "floats" and reads random values.')),
      quiz(T('הלחצן לא לחוץ. מה מחזיר <code>digitalRead(2)</code>?', 'The button is not pressed. What does <code>digitalRead(2)</code> return?'),
        [T('HIGH', 'HIGH'), T('LOW', 'LOW'), T('לא ידוע', 'Unknown')], 0,
        T('הנגד הפנימי מושך את הפין ל-5 V. לחיצה מחברת אותו לאדמה, ואז הוא קורא LOW.', 'The internal resistor pulls the pin to 5 V. Pressing connects it to ground, and then it reads LOW.')),
    ],
  },
  {
    id: 'a03-pwm',
    title: T('עמעום עם PWM', 'Dimming with PWM'),
    summary: T('analogWrite מדליק ומכבה מהר מאוד כדי לדמות מתח ביניים.', 'analogWrite switches on and off very fast to fake a middle voltage.'),
    circuit: 'kit',
    steps: [
      info(T(
        'פין דיגיטלי יודע להיות רק 0 V או 5 V. כדי לעמעם, <code>analogWrite</code> מדליק ומכבה כ-490 פעמים בשנייה, ומשנה כמה זמן הוא דולק מתוך כל מחזור. זה נקרא PWM. רק פינים עם ~ תומכים בו: 3, 5, 6, 9, 10, 11.',
        'A digital pin can only be 0 V or 5 V. To dim, <code>analogWrite</code> switches on and off about 490 times a second and changes how long it stays on in each cycle. This is PWM. Only the ~ pins support it: 3, 5, 6, 9, 10, 11.')),
      code(T('הריצו. הנורית הירוקה (פין 9) מתעממת ומתבהרת לסירוגין.', 'Run it. The green LED (pin 9) fades down and up.'),
        T(
`int level = 0;
int step = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level = level + step;
  if (level <= 0 || level >= 255) {
    step = -step;
  }
  delay(20);
}
`,
`int level = 0;
int step = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level = level + step;
  if (level <= 0 || level >= 255) {
    step = -step;
  }
  delay(20);
}
`), ({ board }) => board.stats.brightness.has('L3') && board.stats.ms > 1200),
      quiz(T('<code>analogWrite(9, 128)</code> נותן בערך:', '<code>analogWrite(9, 128)</code> gives about:'),
        [T('חצי מהבהירות המלאה', 'Half the full brightness'), T('2.5 V יציבים', 'A steady 2.5 V'), T('בהירות מלאה', 'Full brightness')], 0,
        T('הפין דולק בחצי מהזמן. העין רואה ממוצע. (על מעגל עם קבל אפשר באמת למדוד בערך 2.5 V.)', 'The pin is on half of the time and the eye sees the average. (With a capacitor to smooth it you really could measure about 2.5 V.)')),
      quiz(T('הערך המרבי של <code>analogWrite</code> הוא:', 'The largest value for <code>analogWrite</code> is:'),
        [T('255', '255'), T('1023', '1023'), T('100', '100')], 0,
        T('זה ערך של 8 ביט: 0 עד 255. הערך של <code>analogRead</code> הוא 10 ביט, 0 עד 1023.', 'It is an 8 bit value: 0 to 255. <code>analogRead</code> is 10 bit, 0 to 1023.')),
    ],
  },
  {
    id: 'a04-pot-serial',
    title: T('פוטנציומטר ומוניטור סריאלי', 'Potentiometer and the serial monitor'),
    summary: T('קוראים מתח אנלוגי ומדפיסים אותו למחשב.', 'Read an analog voltage and print it to the computer.'),
    circuit: 'kit',
    steps: [
      info(T(
        'הכניסות A0 עד A5 מודדות מתח בין 0 ל-5 V וממירות אותו למספר 0 עד 1023. הפוטנציומטר על A0 הוא מחלק מתח שאפשר לסובב. <code>Serial.println</code> שולח טקסט למוניטור הסריאלי.',
        'Inputs A0 to A5 measure a voltage between 0 and 5 V and turn it into a number from 0 to 1023. The potentiometer on A0 is a voltage divider you can turn. <code>Serial.println</code> sends text to the serial monitor.')),
      code(T('הריצו וסובבו את הפוטנציומטר. המספרים במוניטור משתנים, והנורית הירוקה מתעממת.', 'Run it and turn the potentiometer. The numbers in the monitor change and the green LED dims.'),
        T(
`void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);
  int level = map(raw, 0, 1023, 0, 255);
  analogWrite(9, level);
  Serial.print("A0 = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 5.0 / 1023.0);
  delay(200);
}
`,
`void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);
  int level = map(raw, 0, 1023, 0, 255);
  analogWrite(9, level);
  Serial.print("A0 = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 5.0 / 1023.0);
  delay(200);
}
`), ({ board, out }) => /A0 = \d+/.test(out) && board.stats.analog.size >= 3,
        (board, ms) => { const p = board.circuit.comps.find(c => c.id === 'P1'); p.props.pos = Math.min(1, ms / 1500); board.dirty = true; }),
      quiz(T('מה טווח הערכים של <code>analogRead</code>?', 'What range of values does <code>analogRead</code> return?'),
        [T('0 עד 1023', '0 to 1023'), T('0 עד 255', '0 to 255'), T('0 עד 5', '0 to 5')], 0, T('ממיר של 10 ביט נותן 1024 ערכים.', 'A 10 bit converter gives 1024 values.')),
      quiz(T('מה נותן <code>map(512, 0, 1023, 0, 255)</code>?', 'What does <code>map(512, 0, 1023, 0, 255)</code> give?'),
        [T('127', '127'), T('255', '255'), T('512', '512')], 0, T('512 הוא בערך חצי מהטווח, ולכן התוצאה בערך חצי מ-255.', '512 is about half of the range, so the result is about half of 255.')),
    ],
  },
  {
    id: 'a05-numbers',
    title: T('מספרים ב-Arduino', 'Numbers on the Arduino'),
    summary: T('int של 16 ביט, חילוק שלמים ומספרים עשרוניים.', 'The 16 bit int, integer division and decimals.'),
    circuit: 'kit',
    steps: [
      info(T(
        'במחשב רגיל int הוא 32 ביט, אבל ב-Uno הוא רק 16 ביט: הערכים ממינוס 32768 עד 32767. מעל זה המספר "מתהפך". גם חילוק של שני מספרים שלמים נותן מספר שלם.',
        'On a normal computer an int is 32 bit, but on the Uno it is only 16 bit: values from -32768 to 32767. Go above that and the number "wraps around". Dividing two whole numbers also gives a whole number.')),
      code(T('הריצו וצפו במוניטור: המשתנה <code>big</code> עולה, ואז קופץ למספר שלילי.', 'Run it and watch the monitor: <code>big</code> climbs, then jumps to a negative number.'),
        T(
`int big = 32760;
float half = 7 / 2;
float exact = 7 / 2.0;

void setup() {
  Serial.begin(9600);
  Serial.println(half);
  Serial.println(exact);
}

void loop() {
  big = big + 1;
  Serial.println(big);
  delay(150);
}
`,
`int big = 32760;
float half = 7 / 2;
float exact = 7 / 2.0;

void setup() {
  Serial.begin(9600);
  Serial.println(half);
  Serial.println(exact);
}

void loop() {
  big = big + 1;
  Serial.println(big);
  delay(150);
}
`), ({ out }) => /-3276\d/.test(out)),
      quiz(T('מה מדפיס <code>Serial.println(7 / 2)</code>?', 'What does <code>Serial.println(7 / 2)</code> print?'),
        [T('3', '3'), T('3.5', '3.5'), T('4', '4')], 0, T('שני המספרים שלמים, ולכן גם התוצאה שלמה. כדי לקבל 3.5 כתבו <code>7 / 2.0</code>.', 'Both numbers are whole, so the result is whole too. Write <code>7 / 2.0</code> to get 3.5.')),
      quiz(T('איזה סוג משתנה מחזיק עד 255 בלבד?', 'Which variable type holds only up to 255?'),
        [T('byte', 'byte'), T('int', 'int'), T('long', 'long')], 0, T('byte הוא 8 ביט ללא סימן: 0 עד 255.', 'A byte is 8 bits without a sign: 0 to 255.')),
    ],
  },
  {
    id: 'a06-serial-input',
    title: T('שולחים פקודות מהמחשב', 'Sending commands from the computer'),
    summary: T('Serial.read וקלט מהמוניטור הסריאלי.', 'Serial.read and input from the serial monitor.'),
    circuit: 'kit',
    steps: [
      info(T(
        'הקשר הסריאלי עובד בשני הכיוונים. מתחת למוניטור יש שורת קלט: מה שתשלחו נכנס לזיכרון קטן, ו-<code>Serial.available()</code> אומר כמה תווים מחכים שיקראו אותם.',
        'The serial link works both ways. Under the monitor there is an input line: what you send goes into a small buffer, and <code>Serial.available()</code> tells you how many characters are waiting to be read.')),
      code(T('הריצו ושלחו את התו <b>1</b> כדי להדליק את הנורית האדומה.', 'Run it and send the character <b>1</b> to switch the red LED on.'),
        T(
`void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  Serial.println("send 1 or 0");
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') {
      digitalWrite(13, HIGH);
      Serial.println("on");
    } else if (c == '0') {
      digitalWrite(13, LOW);
      Serial.println("off");
    }
  }
}
`,
`void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  Serial.println("send 1 or 0");
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') {
      digitalWrite(13, HIGH);
      Serial.println("on");
    } else if (c == '0') {
      digitalWrite(13, LOW);
      Serial.println("off");
    }
  }
}
`), ({ board }) => !!board.sim.comps.L1.lit, (board, ms) => { if (ms === 400) board.send('1'); }),
      code(T('עכשיו שלחו <b>0</b> כדי לכבות אותה.', 'Now send <b>0</b> to switch it off.'),
        null, ({ board, running }) => running && !board.sim.comps.L1.lit && toggles(board, 'L1') >= 2, (board, ms) => { if (ms === 400) board.send('1'); if (ms === 1000) board.send('0'); }),
      quiz(T('מה מחזיר <code>Serial.read()</code> כשאין תווים?', 'What does <code>Serial.read()</code> return when nothing is waiting?'),
        [T('-1', '-1'), T('0', '0'), T('התוכנית נתקעת', 'The program hangs')], 0, T('לכן בודקים קודם <code>Serial.available() &gt; 0</code>.', 'That is why you check <code>Serial.available() &gt; 0</code> first.')),
    ],
  },
  {
    id: 'a07-wire-it',
    title: T('מחברים בעצמכם', 'Wire it yourself'),
    summary: T('בונים מעגל על הלוח ואז כותבים לו קוד.', 'Build a circuit on the board, then write the code for it.'),
    circuit: 'empty',
    steps: [
      info(T(
        'הפעם ה-Uno ריק. הפינים שלו יושבים בשורה התחתונה של הלוח (שורה j, עמודות 6 עד 25), כל אחד עם תווית. מחברים אליו בחוטים. בחרו כלי מהסרגל מתחת ללוח והקישו על שני חורים כדי להציב רכיב, או גררו מחור לחור להנחת חוט.',
        'This time the Uno is bare. Its pins sit in the bottom row of the board (row j, columns 6 to 25), each one labelled. You connect to them with wires. Pick a tool from the bar under the board and tap two holes to place a part, or drag from hole to hole for a wire.')),
      { type: 'build', text: T(
        'בנו מעגל: חוט מפין <b>D12</b> לעמודה בחצי העליון, נגד של 220 Ω, נורית (הקצה הראשון שתקישו הוא האנודה, ה-+), וחוט חזרה אל <b>GND</b>. טיפ: אפשר להשתמש בפסי המתח למעלה לחיבור לאדמה.',
        'Build a circuit: a wire from pin <b>D12</b> to a column in the top half, a 220 Ω resistor, an LED (the first end you tap is the anode, the +), and a wire back to <b>GND</b>. Tip: you can use the rails at the top for ground.'),
        goal: ({ board }) => {
          const c = board.circuit.comps;
          return c.some(x => x.type === 'led') && c.some(x => x.type === 'resistor') && c.filter(x => x.type === 'wire').length >= 2;
        },
        demo: board => {
          const add = (id, type, pins, props) => addComp(board.circuit, { id, type, pins, props });
          add('W1', 'wire', [unoHole('D12').replace('j', 'i'), 'a5'], { color: 'green' });
          add('R1', 'resistor', ['c5', 'c8'], { r: 220 });
          add('L1', 'led', ['d8', 'd9'], { color: 'red' });
          add('W2', 'wire', ['a9', 'p-9'], { color: 'black' });
          add('W3', 'wire', [unoHole('GND').replace('j', 'i'), 'p-6'], { color: 'black' });
        } },
      code(T('כתבו תוכנית שמהבהבת את הנורית על פין 12 (העתיקו את ה-Blink ושנו את 13 ל-12) והריצו.', 'Write a program that blinks the LED on pin 12 (copy Blink and change 13 to 12) and run it.'),
        BLINK, ({ board }) => Object.values(board.stats.toggles).some(n => n >= 4),
        (board, ms, ctx) => { if (ms === 0) ctx.setCode(ctx.code().replace(/13/g, '12').replace(/1000/g, '200')); }),
      quiz(T('הנורית לא נדלקת והקוד נכון. מה הסיבה הסבירה?', 'The LED stays dark and the code is right. What is the likely cause?'),
        [T('הנורית הפוכה: האנודה והקתודה מוחלפות', 'The LED is the wrong way round: anode and cathode swapped'), T('הנגד גדול מדי', 'The resistor is too big'), T('ה-Uno עייף', 'The Uno is tired')], 0,
        T('נורית עובדת רק בכיוון אחד. אפשר להפוך אותה בכרטיס הרכיב.', 'An LED only works one way. You can flip it from its part card.')),
    ],
  },
];
