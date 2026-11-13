# Electronics Lab

A bilingual (Hebrew RTL and English), installable PWA that teaches electronics on a live breadboard simulator. Plain ES modules, no build step, no dependencies, works offline and from a sub-path such as GitHub Pages.

## Phases

1. Foundation: breadboard and schematic simulator, 10 lessons on voltage, current, resistors, LEDs, power, buttons and potentiometers.
2. More parts: capacitors, diodes, transistors, oscilloscope, calculators, parts encyclopedia.
3. Digital logic gates.
4. Arduino Uno with code.
5. Sandbox, challenges and an AI tutor.
6. ESP32.

## Run locally

```
python3 -m http.server 8123
```

Then open http://localhost:8123/ (any static server works; service workers need localhost or https).

## Tests

```
npm test
```

(Node 22, uses the built-in test runner.)

## GitHub Pages

Push the repository, then in the repository on GitHub open Settings, Pages, choose "Deploy from a branch", pick the branch and the `/ (root)` folder, and save. All URLs are relative, so it works under `https://<user>.github.io/<repo>/`. After changing app files, bump `VERSION` in `sw.js`.

---

<div dir="rtl">

# מעבדת אלקטרוניקה

אפליקציית PWA דו־לשונית (עברית ואנגלית) שמלמדת אלקטרוניקה על סימולטור חי של לוח ניסויים. מודולי ES פשוטים, בלי שלב בנייה ובלי תלויות. עובדת גם בלי אינטרנט וגם מתת־נתיב כמו GitHub Pages.

## שלבי הפרויקט

1. יסודות: סימולטור של לוח ניסויים וסכמה, 10 שיעורים על מתח, זרם, נגדים, נוריות, הספק, לחצנים ופוטנציומטרים.
2. עוד רכיבים: קבלים, דיודות, טרנזיסטורים, אוסילוסקופ, מחשבונים ואנציקלופדיית רכיבים.
3. שערים לוגיים דיגיטליים.
4. Arduino Uno עם קוד.
5. ארגז חול, אתגרים ומורה פרטי מבוסס בינה מלאכותית.
6. ESP32.

## הרצה מקומית

```
python3 -m http.server 8123
```

ואז פותחים את http://localhost:8123/ (כל שרת סטטי מתאים; Service Worker דורש localhost או https).

## בדיקות

```
npm test
```

## הפעלת GitHub Pages

דוחפים את המאגר, ובמאגר ב־GitHub נכנסים ל־Settings, Pages, בוחרים "Deploy from a branch", את הענף ואת התיקייה `/ (root)`, ושומרים. כל הכתובות יחסיות ולכן זה עובד תחת `https://<user>.github.io/<repo>/`. אחרי שינוי בקבצי האפליקציה מעלים את `VERSION` בקובץ `sw.js`.

</div>
