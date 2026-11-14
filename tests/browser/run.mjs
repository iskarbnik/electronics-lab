// Browser tests: plays every lesson through the real UI. Run with `npm run test:browser`.
// Uses the pre-installed Playwright (never installs anything). Screenshots only on failure.
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FAIL_DIR = join(ROOT, 'tests/browser/failures');
const { LESSONS } = await import(pathToFileURL(join(ROOT, 'js/lessons/index.js')));
const { buildCircuit } = await import(pathToFileURL(join(ROOT, 'js/lessons/engine.js')));
const { simulate } = await import(pathToFileURL(join(ROOT, 'js/sim/circuit.js')));
const { holePos, BATTERY } = await import(pathToFileURL(join(ROOT, 'js/sim/board.js')));
const { fmt } = await import(pathToFileURL(join(ROOT, 'js/sim/format.js')));
const { STRINGS } = await import(pathToFileURL(join(ROOT, 'js/i18n.js')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(ROOT, normalize(p));
    if (!file.startsWith(ROOT)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const CONFIGS = [
  { name: 'phone-he', lang: 'he', ctx: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'he-IL' }, touch: true },
  { name: 'desktop-en', lang: 'en', ctx: { viewport: { width: 1280, height: 800 }, locale: 'en-US' }, touch: false },
];

const failures = [];
const lit = { final: 0, press: 0 };
let checks = 0;
const browser = await chromium.launch();

async function shot(page, label) {
  try { await mkdir(FAIL_DIR, { recursive: true }); await page.screenshot({ path: join(FAIL_DIR, label.replace(/[^\w.-]+/g, '_') + '.png') }); } catch {}
}
function fail(label, msg) { failures.push(`${label}: ${msg}`); console.log(`  FAIL ${label}: ${msg}`); }

async function playLesson(cfg, lesson) {
  const label = `${cfg.name}/${lesson.id}`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const tr = k => STRINGS[k][cfg.lang === 'he' ? 1 : 0];
  const wait = ms => page.waitForTimeout(ms);
  const toScreen = ([x, y]) => page.evaluate(([x, y]) => {
    const q = new DOMPoint(x, y).matrixTransform(document.querySelector('.boardsvg').getScreenCTM()); return { x: q.x, y: q.y };
  }, [x, y]);
  const tap = async q => { if (cfg.touch) await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y); await wait(100); };
  const pt = id => { const p = holePos(id); return [p.x, p.y]; };
  const tapHole = async id => tap(await toScreen(pt(id)));
  const circuitComp = id => page.evaluate(id => { const c = __elab.player.debug.circuit.comps.find(c => c.id === id); return c ? { type: c.type, pins: c.pins } : null; }, id);
  const compPoint = async id => {
    const c = await circuitComp(id);
    if (!c) throw new Error('component not on board: ' + id);
    if (c.type === 'battery') return [BATTERY.x + BATTERY.w / 2, BATTERY.y + BATTERY.h / 2];
    const ps = c.pins.map(pt);
    if (c.pins.length === 3) return [ps[1][0], ps[1][1] - 30];
    return [(ps[0][0] + ps[ps.length - 1][0]) / 2, (ps[0][1] + ps[ps.length - 1][1]) / 2];
  };
  const state = () => page.evaluate(() => ({ step: __elab.player.debug.step, done: !!document.querySelector('.complete:not([hidden])') && getComputedStyle(document.querySelector('.complete')).display !== 'none', nextOn: !document.querySelector('.nx').disabled }));
  // Hebrew only: every number+unit in visible text must sit inside a bdi, code, svg or dir=ltr element.
  const unwrappedUnits = () => page.evaluate(() => {
    const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?(?:\/\d+)?\s?(?:µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F|s)(?![A-Za-z0-9µΩ])/;
    const bad = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const el = n.parentElement;
      if (!el || el.closest('bdi,code,svg,script,style,[dir=ltr],[hidden]')) continue;
      const m = re.exec(n.nodeValue); if (m) bad.push(m[0]);
    }
    return bad;
  });
  const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1);

  try {
    await page.goto(BASE); await page.waitForSelector('.lrow');
    await page.goto(`${BASE}#/lesson/${lesson.id}`); await page.reload(); await page.waitForSelector('.lesson'); await wait(400);
    const attrs = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
    if (attrs[0] !== cfg.lang || attrs[1] !== (cfg.lang === 'he' ? 'rtl' : 'ltr')) throw new Error(`wrong lang/dir: ${attrs}`);
    const n = lesson.steps.length;
    for (let k = 0; k < n; k++) {
      const s = lesson.steps[k];
      let st = await state();
      if (st.step !== k) throw new Error(`expected to be on step ${k}, on ${st.step}`);
      await wait(380);
      if (await hscroll()) throw new Error(`horizontal scroll on step ${k}`);
      if (cfg.lang === 'he') { const bad = await unwrappedUnits(); if (bad.length) throw new Error(`step ${k}: unit values outside a bidi run: ${bad.join(', ')}`); }
      if (s.type === 'quiz') {
        const wrong = s.answer === 0 ? 1 : 0;
        await page.click(`.opt >> nth=${wrong}`);
        if (!(await page.$('.hint.bad'))) throw new Error('wrong quiz answer gave no feedback');
        await page.click(`.opt >> nth=${s.answer}`);
      } else if (s.type === 'explore') await tapHole(s.want === 'rail' ? 'p+12' : 'c12');
      else if (s.type === 'wire') { await tapHole(s.pins[0]); await tapHole(s.pins[1]); }
      else if (s.type === 'place') { if (s.pins.length === 3) await tapHole(s.pins[0]); else { await tapHole(s.pins[0]); await tapHole(s.pins[1]); } }
      else if (s.type === 'measure') { await tapHole(s.red); await tapHole(s.black); }
      else if (s.type === 'do') {
        const q = await toScreen(await compPoint(s.comp));
        if (s.act === 'wait') {
          // time passes on its own; `drive` names a button to hold meanwhile
          let cdp;
          if (s.drive) {
            const bq = await toScreen(await compPoint(s.drive));
            if (cfg.touch) { cdp = await ctx.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [bq] }); }
            else { await page.mouse.move(bq.x, bq.y); await page.mouse.down(); }
          }
          for (let i = 0; i < 100; i++) { if ((await state()).nextOn) break; await wait(100); }
          if (s.drive) { if (cfg.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); }
        } else if (s.act === 'press') {
          let cdp;
          if (cfg.touch) { cdp = await ctx.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [q] }); }
          else { await page.mouse.move(q.x, q.y); await page.mouse.down(); }
          await wait(250);
          const litNow = await page.evaluate(() => Object.values(__elab.player.debug.sim.comps).some(c => c.lit));
          const hasLed = await page.evaluate(() => __elab.player.debug.circuit.comps.some(c => c.type === 'led'));
          if (hasLed && !litNow) throw new Error('LED not lit while the button is held');
          lit.press++;
          if (cfg.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
        } else {
          await tap(q);
          if (s.act === 'flip') await page.click(`.card .btn >> text="${tr('card.flip')}"`);
          else if (s.act === 'remove') await page.click(`.card .btn >> text="${tr('card.remove')}"`);
          else if (s.act === 'replace') await page.click(`.card .btn >> text="${tr('card.replace')}"`);
          else if (s.act === 'set') {
            const probe = { comps: [{ id: s.comp, props: {} }] }; s.auto(probe);
            await page.locator('.card .chip', { hasText: new RegExp(`^${fmt(probe.comps[0].props.r, 'Ω')}$`) }).click();
          } else if (s.act === 'turn') {
            await page.$eval('.card input[type=range]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, s.range.value);
          }
        }
      }
      // wait for auto-advance (wire/place) or the Next button
      for (let i = 0; i < 30; i++) { st = await state(); if (st.step !== k || st.done || st.nextOn) break; await wait(100); }
      if (st.step === k && !st.done) {
        if (!st.nextOn) throw new Error(`step ${k} (${s.type}${s.act ? ' ' + s.act : ''}) never completed`);
        if (k === n - 1) {
          // assert the lit LEDs of the final circuit before leaving the lesson
          const want = Object.entries(simulate(buildCircuit(lesson, n)).comps).filter(([id, c]) => c.lit).map(([id]) => id);
          const got = await page.evaluate(() => Object.entries(__elab.player.debug.sim.comps).filter(([id, c]) => c.lit).map(([id]) => id));
          if (want.length) lit.final++;
          for (const id of want) if (!got.includes(id)) throw new Error(`LED ${id} should be lit at the end, debug reports lit: [${got}]`);
        }
        await page.click('.nx');
        for (let i = 0; i < 30; i++) { st = await state(); if (st.step !== k || st.done) break; await wait(100); }
      }
      if (k < n - 1 && st.step === k) throw new Error(`did not advance past step ${k}`);
    }
    await page.waitForSelector('.complete:not([hidden])', { timeout: 4000 });
    checks++;
    if (await hscroll()) throw new Error('horizontal scroll on completion');
    await page.reload(); await page.waitForSelector('.lesson');
    await page.goto(BASE); await page.reload(); await page.waitForSelector('.lrow');
    const done = await page.$eval(`.lrow[href$="${lesson.id}"]`, a => a.classList.contains('done'));
    if (!done) throw new Error('progress not persisted after reload');
    if (await hscroll()) throw new Error('horizontal scroll on home');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label} (${n} steps)`);
  } catch (e) {
    fail(label, e.message.split('\n')[0]); await shot(page, label);
  } finally { await ctx.close(); }
}

async function offlineCheck() {
  const label = 'offline';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(e.message));
  try {
    await page.goto(BASE); await page.waitForSelector('.lrow');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('.lrow');
    if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) throw new Error('page not controlled by the service worker');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('.lrow', { timeout: 5000 });
    await page.goto(`${BASE}#/lesson/${LESSONS[0].id}`); await page.reload(); await page.waitForSelector('.lesson .boardsvg', { timeout: 5000 });
    if (problems.length) throw new Error(problems.join(' | '));
    console.log('  ok   offline app shell');
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
}

// The Arduino lab: run Blink, a syntax error, the button example and the serial monitor.
async function labCheck(cfg) {
  const label = `${cfg.name}/arduino-lab`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const wait = ms => page.waitForTimeout(ms);
  const lit = id => page.evaluate(id => __elab.lab.debug.board.sim.comps[id].lit, id);
  try {
    await page.goto(BASE); await page.waitForSelector('.lrow');
    await page.click('a[href="#/arduino"]'); await page.waitForSelector('.lab .code');
    const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (await hscroll()) throw new Error('horizontal scroll');
    if (cfg.lang === 'he') {
      const bad = await page.evaluate(() => {
        const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?\s?(?:µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F|s)(?![A-Za-z0-9µΩ])/, out = [];
        const w = document.createTreeWalker(document.querySelector('.lab'), NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) { const e = n.parentElement; if (!e || e.closest('bdi,code,svg,textarea,pre,[dir=ltr]')) continue; const m = re.exec(n.nodeValue); if (m) out.push(m[0]); }
        return out;
      });
      if (bad.length) throw new Error('units outside a bidi run: ' + bad.join(', '));
    }
    // Blink (the default sketch): L1 goes on and off
    await page.click('.run');
    const seen = new Set();
    for (let i = 0; i < 30 && seen.size < 2; i++) { await wait(100); seen.add(await lit('L1')); }
    if (seen.size < 2) throw new Error('Blink did not toggle L1');
    await page.click('.stop');
    if (await lit('L1')) throw new Error('L1 still lit after Stop');
    // syntax error shows a message with a line number
    await page.evaluate(() => { __elab.lab.debug.code = 'void setup() { int x = ; } void loop() {}'; });
    await page.click('.run');
    if (!(await page.$('.labstatus.bad'))) throw new Error('no error shown for a syntax error');
    // button example: holding the button lights L2
    await page.selectOption('.exsel', 'button');
    await page.click('.run'); await wait(150);
    if (await lit('L2')) throw new Error('L2 lit without the button');
    await page.evaluate(() => { const c = __elab.lab.debug.board.circuit.comps.find(c => c.id === 'S1'); c.props.pressed = true; __elab.lab.debug.board.dirty = true; });
    await wait(200);
    if (!(await lit('L2'))) throw new Error('L2 not lit while the button is pressed');
    // pot example prints to the serial monitor
    await page.selectOption('.exsel', 'pot');
    await page.click('.run'); await wait(500);
    const mon = await page.textContent('.mon');
    if (!/A0 = \d+/.test(mon)) throw new Error('serial monitor empty: ' + JSON.stringify(mon));
    if (await hscroll()) throw new Error('horizontal scroll while running');
    await page.click('.stop');
    // serial input: send 1 and the LED on pin 13 lights
    await page.evaluate(() => { __elab.lab.debug.code = 'void setup(){ Serial.begin(9600); pinMode(13, OUTPUT); } void loop(){ if (Serial.available() > 0) { char c = Serial.read(); if (c == \'1\') digitalWrite(13, HIGH); if (c == \'0\') digitalWrite(13, LOW); Serial.println(c); } }'; });
    await page.click('.run'); await wait(100);
    await page.fill('.serline', '1'); await page.press('.serline', 'Enter'); await wait(250);
    if (!(await lit('L1'))) throw new Error('serial input did not light L1');
    if (!/1/.test(await page.textContent('.mon'))) throw new Error('echo missing from the serial monitor');
    await page.click('.stop');
    // wiring by hand: a guided lesson on a bare Uno, built with taps
    await page.goto(`${BASE}#/arduino/a07-wire-it`); await page.waitForSelector('.guide .gnext');
    await page.click('.gnext'); await wait(200);
    const toScreen = ([x, y]) => page.evaluate(([x, y]) => { const q = new DOMPoint(x, y).matrixTransform(document.querySelector('.boardsvg').getScreenCTM()); return { x: q.x, y: q.y }; }, [x, y]);
    const tapHole = async id => { const hp = holePos(id); const p = await toScreen([hp.x, hp.y]); if (cfg.touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); await wait(80); };
    const pick = async name => page.click(`.tool >> text="${name}"`);
    const tr = k => STRINGS[k][cfg.lang === 'he' ? 1 : 0];
    await pick(tr('part.wire')); await tapHole('i9'); await tapHole('a5');
    await pick(tr('part.resistor')); await tapHole('c5'); await tapHole('c8');
    await pick(tr('part.led')); await tapHole('d8'); await tapHole('d9');
    await pick(tr('part.wire')); await tapHole('a9'); await tapHole('p-9');
    await tapHole('i7'); await tapHole('p-6');
    await wait(200);
    if (!(await page.evaluate(() => __elab.lab.debug.done))) throw new Error('build step not recognised after wiring by taps');
    await page.click('.gnext'); await wait(200);
    await page.evaluate(() => { __elab.lab.debug.code = 'void setup(){ pinMode(12, OUTPUT); } void loop(){ digitalWrite(12, HIGH); delay(150); digitalWrite(12, LOW); delay(150); }'; });
    await page.click('.run');
    const seen2 = new Set();
    for (let i = 0; i < 30 && seen2.size < 2; i++) { await wait(100); seen2.add(await page.evaluate(() => __elab.lab.debug.board.sim.comps.L1.lit)); }
    if (seen2.size < 2) throw new Error('hand-wired LED did not blink');
    if (await hscroll()) throw new Error('horizontal scroll in the wiring lesson');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label}`);
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
}

// Calculators, parts encyclopedia and the oscilloscope.
async function pagesCheck(cfg) {
  const label = `${cfg.name}/tools-parts-scope`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const wait = ms => page.waitForTimeout(ms);
  const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const unwrapped = () => page.evaluate(() => {
    const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?(?:\/\d+)?\s?(?:µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F|s)(?![A-Za-z0-9µΩ])/, out = [];
    const w = document.createTreeWalker(document.querySelector('.lab'), NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const e = n.parentElement; if (!e || e.closest('bdi,code,svg,textarea,pre,select,input,[dir=ltr]')) continue; const m = re.exec(n.nodeValue); if (m) out.push(m[0]); }
    return out;
  });
  try {
    await page.goto(BASE); await page.waitForSelector('.lrow');
    // calculators
    await page.click('a[href="#/tools"]'); await page.waitForSelector('.toolcard');
    const before = await page.textContent('.toolcard:nth-of-type(2) .tout');
    await page.fill('.toolcard:nth-of-type(2) input >> nth=2', '5');           // LED current 5 mA
    const after = await page.textContent('.toolcard:nth-of-type(2) .tout');
    if (before === after) throw new Error('LED resistor result did not change');
    if (!/ohm|Ω/i.test(await page.textContent('.toolcard:first-of-type .tout')) && !/Ω/.test(await page.textContent('.toolcard:first-of-type .tout'))) throw new Error('Ohm card empty');
    if (!(await page.$('.swatches i'))) throw new Error('no colour band swatches');
    if (cfg.lang === 'he') { const bad = await unwrapped(); if (bad.length) throw new Error('tools: units outside a bidi run: ' + bad.join(', ')); }
    if (await hscroll()) throw new Error('horizontal scroll on tools');
    // parts
    await page.goto(`${BASE}#/parts`); await page.waitForSelector('.partcardx');
    const all = await page.$$eval('.partcardx', a => a.length);
    await page.fill('.partsearch', 'NAND');
    const some = await page.$$eval('.partcardx', a => a.length);
    if (!(some >= 1 && some < all)) throw new Error(`search did not filter (${some} of ${all})`);
    await page.fill('.partsearch', 'zzzz'); if (await page.$('.partcardx')) throw new Error('nonsense search matched');
    await page.fill('.partsearch', '');
    if (cfg.lang === 'he') { const bad = await unwrapped(); if (bad.length) throw new Error('parts: units outside a bidi run: ' + bad.join(', ')); }
    if (await hscroll()) throw new Error('horizontal scroll on parts');
    // scope: Blink on D13 draws a trace
    await page.goto(`${BASE}#/arduino`); await page.waitForSelector('.lab .code');
    await page.click('.scopesum'); await page.click('.run'); await wait(1500);
    const pts = await page.$eval('.scopesvg polyline', p => p.getAttribute('points').split(' ').length).catch(() => 0);
    if (pts < 5) throw new Error('scope drew no trace');
    await page.click('.stop');
    if (await hscroll()) throw new Error('horizontal scroll with the scope open');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label}`);
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
}

// Sandbox, challenges, tutor, quiz, badges and the ESP32 board.
async function phase5Check(cfg) {
  const label = `${cfg.name}/sandbox-quiz-badges-esp32`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const wait = ms => page.waitForTimeout(ms);
  const tr = k => STRINGS[k][cfg.lang === 'he' ? 1 : 0];
  const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const unwrapped = () => page.evaluate(() => {
    const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?(?:\/\d+)?\s?(?:µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F|s)(?![A-Za-z0-9µΩ])/, out = [];
    const w = document.createTreeWalker(document.querySelector('.lab'), NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const e = n.parentElement; if (!e || e.closest('bdi,code,svg,textarea,pre,select,input,[dir=ltr],.tutor [dir=ltr]')) continue; const m = re.exec(n.nodeValue); if (m) out.push(m[0]); }
    return out;
  });
  const toScreen = ([x, y]) => page.evaluate(([x, y]) => { const q = new DOMPoint(x, y).matrixTransform(document.querySelector('.boardsvg').getScreenCTM()); return { x: q.x, y: q.y }; }, [x, y]);
  const tapHole = async id => { const hp = holePos(id); const p = await toScreen([hp.x, hp.y]); if (cfg.touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); await wait(80); };
  const pick = name => page.click(`.tool >> text="${name}"`);
  try {
    await page.goto(BASE); await page.waitForSelector('.lrow');
    for (const href of ['#/sandbox', '#/sandbox/c01', '#/quiz', '#/badges']) if (!(await page.$(`a[href="${href}"]`))) throw new Error('home is missing ' + href);
    // challenge c01 solved by taps
    await page.click('a[href="#/sandbox/c01"]'); await page.waitForSelector('.sandbox .tool');
    await pick(tr('part.wire')); await tapHole('p+3'); await tapHole('a3');
    await pick(tr('part.resistor')); await tapHole('c3'); await tapHole('c6');
    await pick(tr('part.led')); await tapHole('d6'); await tapHole('d7');
    await pick(tr('part.wire')); await tapHole('a7'); await tapHole('p-7');
    await page.waitForSelector('.chbox .hint.ok', { timeout: 4000 });
    if (cfg.lang === 'he') { const bad = await unwrapped(); if (bad.length) throw new Error('sandbox: units outside a bidi run: ' + bad.join(', ')); }
    // tutor
    await page.click('.tutorbtn'); await page.waitForSelector('.tutor:not([hidden]) .tdiag li');
    await page.fill('.tq', cfg.lang === 'he' ? 'חוק אוהם' : 'ohm law'); await page.press('.tq', 'Enter');
    await page.waitForSelector('.tans p');
    if (cfg.lang === 'he') { const bad = await unwrapped(); if (bad.length) throw new Error('tutor: units outside a bidi run: ' + bad.join(', ')); }
    await page.click('.tclose');
    if (await hscroll()) throw new Error('horizontal scroll in the sandbox');
    // free sandbox: an example runs, the AND gate table is right through the UI model
    await page.goto(`${BASE}#/sandbox`); await page.waitForSelector('.sandbox .tool');
    await page.selectOption('.exsel', 'sb.ex.and'); await wait(200);
    const high = await page.evaluate(() => { const p = __elab.page.debug; const c = p.circuit; const set = (a, b) => { c.comps.find(x => x.id === 'S1').props.on = !!a; c.comps.find(x => x.id === 'S2').props.on = !!b; return JSON.stringify(c).length && true; }; set(1, 1); p.load(c); return null; });
    await wait(200);
    const lit = await page.evaluate(() => __elab.page.debug.sim.comps.D1.lit);
    if (!lit) throw new Error('AND example: LED should be lit with both switches up');
    // quiz
    await page.goto(`${BASE}#/quiz`); await page.waitForSelector('.startb'); await page.click('.startb');
    for (let k = 0; k < 10; k++) { await page.click('.opt >> nth=0'); await page.click('.nextb'); }
    await page.waitForSelector('.againb');
    const best = await page.evaluate(() => JSON.parse(localStorage.getItem('elab.v1')).flags.quizBest);
    if (typeof best !== 'number') throw new Error('quiz score not saved');
    if (cfg.lang === 'he') { const bad = await unwrapped(); if (bad.length) throw new Error('quiz: units outside a bidi run: ' + bad.join(', ')); }
    // badges
    await page.goto(`${BASE}#/badges`); await page.waitForSelector('.badge');
    if (!(await page.$('.badge.on'))) throw new Error('no badge earned after a challenge and a sandbox visit');
    if (await hscroll()) throw new Error('horizontal scroll on badges');
    // ESP32: switch the free lab and blink GPIO 18
    await page.goto(`${BASE}#/arduino`); await page.waitForSelector('.lab .code');
    await page.click('.boardsel [data-b="esp32"]'); await page.waitForSelector('.lab .code'); await wait(200);
    await page.click('.run');
    const seen = new Set();
    for (let i = 0; i < 30 && seen.size < 2; i++) { await wait(100); seen.add(await page.evaluate(() => __elab.lab.debug.board.sim.comps.L1.lit)); }
    if (seen.size < 2) throw new Error('ESP32 blink did not toggle L1');
    await page.click('.stop');
    await page.goto(`${BASE}#/arduino/e02-esp32-adc-pwm`); await page.waitForSelector('.guide .gnext');
    if (await hscroll()) throw new Error('horizontal scroll in the ESP32 lesson');
    await page.goto(`${BASE}#/arduino`); await page.waitForSelector('.boardsel'); await page.click('.boardsel [data-b="uno"]');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label}`);
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
}

for (const cfg of CONFIGS) {
  console.log(cfg.name);
  for (const lesson of LESSONS) await playLesson(cfg, lesson);
  await labCheck(cfg);
  await pagesCheck(cfg);
  await phase5Check(cfg);
}
console.log('offline');
await offlineCheck();
await browser.close(); server.close();
console.log(`lit-LED assertions: ${lit.final} final circuits, ${lit.press} press-and-hold steps`);
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall browser checks passed');
process.exit(failures.length ? 1 : 0);
