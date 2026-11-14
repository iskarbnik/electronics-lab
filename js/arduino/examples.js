// Example sketches for the Arduino lab. Code is the same in both languages, only the comments differ.
const T = (he, en) => ({ he, en });

export const EXAMPLES = [
  {
    id: 'blink',
    title: T('מהבהב', 'Blink'),
    code: T(
`// מהבהבים בנורית האדומה שעל פין 13
void setup() {
  pinMode(13, OUTPUT);       // פין 13 הוא פלט
}

void loop() {
  digitalWrite(13, HIGH);    // מדליקים
  delay(500);                // מחכים חצי שנייה
  digitalWrite(13, LOW);     // מכבים
  delay(500);
}
`,
`// Blink the red LED on pin 13
void setup() {
  pinMode(13, OUTPUT);       // pin 13 is an output
}

void loop() {
  digitalWrite(13, HIGH);    // switch it on
  delay(500);                // wait half a second
  digitalWrite(13, LOW);     // switch it off
  delay(500);
}
`),
  },
  {
    id: 'button',
    title: T('לחצן ונורית', 'Button and LED'),
    code: T(
`// הלחצן על פין 2 מחובר לאדמה, ולכן כשלוחצים קוראים LOW
void setup() {
  pinMode(2, INPUT_PULLUP);  // נגד פנימי מחזיק את הפין על HIGH
  pinMode(8, OUTPUT);        // הנורית הצהובה
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(8, HIGH);
  } else {
    digitalWrite(8, LOW);
  }
}
`,
`// The button on pin 2 goes to ground, so pressing it reads LOW
void setup() {
  pinMode(2, INPUT_PULLUP);  // an internal resistor holds the pin HIGH
  pinMode(8, OUTPUT);        // the yellow LED
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(8, HIGH);
  } else {
    digitalWrite(8, LOW);
  }
}
`),
  },
  {
    id: 'fade',
    title: T('עמעום עם PWM', 'Fade with PWM'),
    code: T(
`// analogWrite נותן 0 עד 255 על פין עם PWM, כאן פין 9 והנורית הירוקה
int level = 0;
int step = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level = level + step;
  if (level <= 0 || level >= 255) {
    step = -step;            // הופכים כיוון בקצוות
  }
  delay(20);
}
`,
`// analogWrite gives 0 to 255 on a PWM pin, here pin 9 and the green LED
int level = 0;
int step = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level = level + step;
  if (level <= 0 || level >= 255) {
    step = -step;            // turn around at the ends
  }
  delay(20);
}
`),
  },
  {
    id: 'pot',
    title: T('פוטנציומטר ומוניטור סריאלי', 'Potentiometer and serial monitor'),
    code: T(
`// קוראים את הפוטנציומטר ב-A0 ומעמעמים בו את הנורית הירוקה
void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);              // 0 עד 1023
  int level = map(raw, 0, 1023, 0, 255); // 0 עד 255
  analogWrite(9, level);
  Serial.print("A0 = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 5.0 / 1023.0);
  delay(200);
}
`,
`// Read the potentiometer on A0 and use it to dim the green LED
void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);              // 0 to 1023
  int level = map(raw, 0, 1023, 0, 255); // 0 to 255
  analogWrite(9, level);
  Serial.print("A0 = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 5.0 / 1023.0);
  delay(200);
}
`),
  },
  {
    id: 'traffic',
    title: T('רמזור עם מערך', 'Traffic light with an array'),
    code: T(
`// שלוש נוריות בפינים 13, 8 ו-9, מדליקים אחת בכל פעם
int lights[3] = {13, 8, 9};
int times[3] = {2000, 600, 2000};

void setup() {
  for (int i = 0; i < 3; i++) {
    pinMode(lights[i], OUTPUT);
  }
}

void loop() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(lights[i], HIGH);
    delay(times[i]);
    digitalWrite(lights[i], LOW);
  }
}
`,
`// Three LEDs on pins 13, 8 and 9, one lit at a time
int lights[3] = {13, 8, 9};
int times[3] = {2000, 600, 2000};

void setup() {
  for (int i = 0; i < 3; i++) {
    pinMode(lights[i], OUTPUT);
  }
}

void loop() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(lights[i], HIGH);
    delay(times[i]);
    digitalWrite(lights[i], LOW);
  }
}
`),
  },
  {
    id: 'ints',
    title: T('מספרים ב-Arduino', 'Numbers on the Arduino'),
    code: T(
`// int ב-Uno הוא 16 ביט: אחרי 32767 חוזרים למינוס. ראו במוניטור
int big = 32760;
float half = 7 / 2;          // חילוק שלמים נותן 3
float exact = 7 / 2.0;       // עם נקודה עשרונית נותן 3.5

void setup() {
  Serial.begin(9600);
  Serial.println(half);
  Serial.println(exact);
}

void loop() {
  big = big + 1;
  Serial.println(big);
  delay(300);
}
`,
`// An int on the Uno is 16 bit: after 32767 it wraps to a negative. Watch the monitor
int big = 32760;
float half = 7 / 2;          // integer division gives 3
float exact = 7 / 2.0;       // with a decimal point it gives 3.5

void setup() {
  Serial.begin(9600);
  Serial.println(half);
  Serial.println(exact);
}

void loop() {
  big = big + 1;
  Serial.println(big);
  delay(300);
}
`),
  },
];

// ESP32 examples (GPIO numbers; 3.3 V logic; analogRead is 12 bit; ledcAttach/ledcWrite for PWM on any pin).
export const ESP_EXAMPLES = [
  {
    id: 'blink',
    title: T('מהבהב', 'Blink'),
    code: T(
`// ב-ESP32 קוראים לפינים לפי מספר GPIO. הנורית האדומה על GPIO 18
void setup() {
  pinMode(18, OUTPUT);
}

void loop() {
  digitalWrite(18, HIGH);    // 3.3 V
  delay(500);
  digitalWrite(18, LOW);     // 0 V
  delay(500);
}
`,
`// On an ESP32 pins are named by GPIO number. The red LED is on GPIO 18
void setup() {
  pinMode(18, OUTPUT);
}

void loop() {
  digitalWrite(18, HIGH);    // 3.3 V
  delay(500);
  digitalWrite(18, LOW);     // 0 V
  delay(500);
}
`),
  },
  {
    id: 'button',
    title: T('לחצן ונורית', 'Button and LED'),
    code: T(
`// הלחצן על GPIO 4 מחובר לאדמה. הנורית הצהובה על GPIO 19
void setup() {
  pinMode(4, INPUT_PULLUP);
  pinMode(19, OUTPUT);
}

void loop() {
  digitalWrite(19, !digitalRead(4));   // לחיצה קוראת LOW, ולכן הופכים
}
`,
`// The button on GPIO 4 goes to ground. The yellow LED is on GPIO 19
void setup() {
  pinMode(4, INPUT_PULLUP);
  pinMode(19, OUTPUT);
}

void loop() {
  digitalWrite(19, !digitalRead(4));   // a press reads LOW, so invert it
}
`),
  },
  {
    id: 'pot',
    title: T('ADC של 12 ביט ו-PWM', '12 bit ADC and PWM'),
    code: T(
`// הפוטנציומטר על GPIO 34 (קריאה 0 עד 4095), הנורית הירוקה על GPIO 21
void setup() {
  Serial.begin(115200);
  ledcAttach(21, 5000, 8);               // פין, תדר, ביטים
}

void loop() {
  int raw = analogRead(34);              // 0 עד 4095
  ledcWrite(21, map(raw, 0, 4095, 0, 255));
  Serial.print("ADC = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 3.3 / 4095.0);
  delay(200);
}
`,
`// The potentiometer is on GPIO 34 (reads 0 to 4095), the green LED on GPIO 21
void setup() {
  Serial.begin(115200);
  ledcAttach(21, 5000, 8);               // pin, frequency, bits
}

void loop() {
  int raw = analogRead(34);              // 0 to 4095
  ledcWrite(21, map(raw, 0, 4095, 0, 255));
  Serial.print("ADC = ");
  Serial.print(raw);
  Serial.print("  volts = ");
  Serial.println(raw * 3.3 / 4095.0);
  delay(200);
}
`),
  },
];
