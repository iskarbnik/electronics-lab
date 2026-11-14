# Electronics Lab

Bilingual (Hebrew RTL + English) installable PWA that teaches electronics on a live breadboard simulator. Vanilla ES modules, no build step, no dependencies, works offline and from a subpath (GitHub Pages).

## Architecture
- `js/sim/`: simulator. `board.js` geometry and strips, `circuit.js` components and `simulate()`, `solver.js`, `format.js` (`fmt`, resistor `bands`).
- `js/lessons/`: `index.js` exports `LESSONS`; `l01..l15-*.js` one file per lesson (a lesson may set `battery: 5` for logic); `common.js` step constructors; `engine.js` `applyStep` / `buildCircuit`.
- `js/ui/`: `lessonPlayer.js` (the lesson screen, exposes `window.__elab.player.debug`), `boardView.js`, `schematicView.js`, `svg.js`.
- `js/arduino/`: Phase 4. `parser.js` (lexer, parser for the Arduino C++ subset), `interp.js` (`Sketch`, generator based so `delay()` pauses; Uno integer sizes: int is 16 bit), `kit.js` (`newLabCircuit()`/`newKit()`: the Uno plugs into row j, columns 6 to 25, and the kit is wired to it with jumpers; `KitBoard` host for the sketch, `Runner` steps it in time), `examples.js`. Uno part: comp type `uno` in `circuit.js` (pin outputs are 25 Ω sources, INPUT_PULLUP is 20 kΩ to 5 V, over 40 mA flags `over`). `ui/arduinoLab.js` is the `#/arduino` screen (`window.__elab.lab`). analogWrite is blended between its high and low circuit states by duty.
- `js/calc.js` pure calculator maths, `js/parts.js` encyclopedia data, `js/ui/tools.js` (`#/tools`), `js/ui/parts.js` (`#/parts`), `js/ui/scope.js` (oscilloscope used by the Arduino lab).
- `js/app.js` router and home screen, `js/i18n.js` strings (`t`, `L`, `ltr`, `bidi`), `js/store.js` progress in localStorage, `sw.js` service worker.
- Lesson: `{ id, title, summary, schematic, setup:[step], steps:[step] }`. All text is `{ he, en }` and may hold simple HTML. Step types: info, explore, wire, place, measure, do (select/flip/remove/replace/set/press/turn/toggle/wait, with `auto` and `until`), quiz. Three-hole parts (pot, transistor, 3-input gate, SPDT switch) are placed by tapping the first hole. Any step may have `expect(sim, circuit)`, checked by tests.

## Simulator conventions
- Hole ids: `a1..j30` (rows a-e top half, f-j bottom half), rails `p+N p-N` (top) and `q+N q-N` (bottom), battery terminals `BAT+`, `BAT-`.
- Strips (`stripOf`): `T<col>` for a-e, `B<col>` for f-j, whole rails `p+ p- q+ q-`, and the terminals. Holes on a strip are one node.
- Signs: `v = V(pin0) - V(pin1)`, current `i` flows pin0 to pin1; battery `i` is the current it delivers from +. LED pins are `[anode, cathode]`. Pot pins `[A, wiper, B]`, R(A-wiper) = r * pos.
- More parts: diode `[anode, cathode]` (0.7 V), capacitor `[+, -]` with `props.vc` (time advances only with `simulate(c, { dt, advance: true })`), transistor NPN `[C, B, E]` (off / act / sat, beta 100), SPDT `switch` `[low, common, high]`, `gate` `[A, B, Y]` (NOT: `[A, Y]`), supply = battery voltage, threshold half supply.
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
2. Capacitors, diodes, transistors, time-domain circuits, oscilloscope, calculators, parts encyclopedia (done; the scope lives in the Arduino lab only).
3. Logic gates (done: AND, OR, NOT, NAND, NOR, XOR, lessons 14 and 15; no flip-flops or multi-gate circuits yet).
4. Arduino Uno with an in-app interpreter for a subset of Arduino code (done: lab, wiring editor, serial input, PWM, 7 guided lessons in `js/arduino/lessons.js`).
5. Sandbox, challenges, quizzes, badges, AI tutor.
6. ESP32.
