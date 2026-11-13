# Electronics Lab

Bilingual (Hebrew RTL + English) installable PWA that teaches electronics on a live breadboard simulator. Vanilla ES modules, no build step, no dependencies, works offline and from a subpath (GitHub Pages).

## Architecture
- `js/sim/`: simulator. `board.js` geometry and strips, `circuit.js` components and `simulate()`, `solver.js`, `format.js` (`fmt`, resistor `bands`).
- `js/lessons/`: `index.js` exports `LESSONS`; `l01..l10-*.js` one file per lesson; `common.js` step constructors; `engine.js` `applyStep` / `buildCircuit`.
- `js/ui/`: `lessonPlayer.js` (the lesson screen, exposes `window.__elab.player.debug`), `boardView.js`, `schematicView.js`, `svg.js`.
- `js/app.js` router and home screen, `js/i18n.js` strings (`t`, `L`, `ltr`, `bidi`), `js/store.js` progress in localStorage, `sw.js` service worker.
- Lesson: `{ id, title, summary, schematic, setup:[step], steps:[step] }`. All text is `{ he, en }` and may hold simple HTML. Step types: info, explore, wire, place, measure, do (select/flip/remove/replace/set/press/turn, with `auto` and `until`), quiz. Any step may have `expect(sim, circuit)`, checked by tests.

## Simulator conventions
- Hole ids: `a1..j30` (rows a-e top half, f-j bottom half), rails `p+N p-N` (top) and `q+N q-N` (bottom), battery terminals `BAT+`, `BAT-`.
- Strips (`stripOf`): `T<col>` for a-e, `B<col>` for f-j, whole rails `p+ p- q+ q-`, and the terminals. Holes on a strip are one node.
- Signs: `v = V(pin0) - V(pin1)`, current `i` flows pin0 to pin1; battery `i` is the current it delivers from +. LED pins are `[anode, cathode]`. Pot pins `[A, wiper, B]`, R(A-wiper) = r * pos.
- Burn rule: an LED over 50 mA is marked `burned` and stays dead until replaced. A resistor over 1/4 W is flagged `hot`.

## Rules
- No build step, no npm dependencies, no framework. All URLs relative.
- Every user-facing string exists in both Hebrew and English.
- Any value with a unit (mA, V, kΩ, W...) shown in Hebrew goes through `bidi()` from `js/i18n.js` (it wraps runs in `<bdi dir="ltr">`; the lesson player already applies it to lesson text, quiz options, hints and toasts) or `ltr()` for values built in code. Never concatenate a unit before a number.
- Hebrew uses one term for the multimeter: "רב-מודד".
- No em dashes in any text.
- Changing any app file: bump `VERSION` in `sw.js` and keep its `FILES` list complete (`tests/sw.test.js` checks this).
- Tests: `npm test` (unit, fast) always; `npm run test:browser` (Playwright, plays every lesson at 390x844 touch Hebrew and 1280x800 English, plus an offline check) after UI, lesson or service worker changes. Use the pre-installed Playwright, never install it. Failure screenshots go to the git-ignored `tests/browser/failures/`.
- New lessons: add the file, register in `lessons/index.js` and `sw.js`; the browser test picks it up automatically.

## Phase plan
1. Foundation: simulator, lesson engine, 10 lessons, PWA, i18n (done).
2. Capacitors, diodes, transistors, time-domain circuits, oscilloscope, calculators, parts encyclopedia.
3. Logic gates.
4. Arduino Uno with an in-app interpreter for a subset of Arduino code.
5. Sandbox, challenges, quizzes, badges, AI tutor.
6. ESP32.
