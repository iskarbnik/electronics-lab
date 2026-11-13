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
    if (c.type === 'pot' || c.type === 'npn') return [ps[1][0], ps[1][1] - 30];
    return [(ps[0][0] + ps[ps.length - 1][0]) / 2, (ps[0][1] + ps[ps.length - 1][1]) / 2];
  };
  const state = () => page.evaluate(() => ({ step: __elab.player.debug.step, done: !!document.querySelector('.complete:not([hidden])') && getComputedStyle(document.querySelector('.complete')).display !== 'none', nextOn: !document.querySelector('.nx').disabled }));
  // Hebrew only: every number+unit in visible text must sit inside a bdi, code, svg or dir=ltr element.
  const unwrappedUnits = () => page.evaluate(() => {
    const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?(?:\/\d+)?\s?(?:µA|mA|A|µV|mV|V|kΩ|MΩ|Ω|mW|W|mF|µF|nF|pF|F|kHz|Hz|mJ|µJ|J|ms|µs|s)(?![A-Za-z0-9µΩ])/;
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
      else if (s.type === 'place') { if (s.kind === 'pot' || s.kind === 'npn') await tapHole(s.pins[0]); else { await tapHole(s.pins[0]); await tapHole(s.pins[1]); } }
      else if (s.type === 'measure') { await tapHole(s.red); await tapHole(s.black); }
      else if (s.type === 'do') {
        const q = await toScreen(await compPoint(s.comp));
        if (s.act === 'wait') {
          // time passes by itself: nothing to tap. Just let the real-time simulation run.
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
            const pr = probe.comps[0].props, label = pr.c !== undefined ? fmt(pr.c, 'F') : fmt(pr.r, 'Ω');
            await page.locator('.card .chip', { hasText: new RegExp(`^${label}$`) }).click();
          } else if (s.act === 'turn') {
            await page.$eval('.card input[type=range]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, s.range.value);
          }
        }
      }
      // wait for auto-advance (wire/place) or the Next button
      if (lesson.scope && s.view === 'scope') {
        await wait(700);
        const tabOn = await page.evaluate(() => __elab.player.debug.tab);
        if (tabOn !== 'scope') throw new Error(`step ${k}: the scope tab did not open`);
        if (!(await page.$('.scopesvg .strace'))) throw new Error(`step ${k}: no trace drawn on the scope`);
      }
      const patience = s.type === 'do' && s.act === 'wait' ? 200 : 30;
      for (let i = 0; i < patience; i++) { st = await state(); if (st.step !== k || st.done || st.nextOn) break; await wait(100); }
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


async function pagesCheck(cfg) {
  const label = `${cfg.name}/pages`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(e.message));
  try {
    await page.goto(BASE); await page.reload(); await page.waitForSelector('.lrow');
    await page.click('a[href="#/tools"]'); await page.waitForSelector('.tools .card2');
    const first = await page.$eval('.tools .result .big', e => e.textContent);
    if (!/19\.1 mA/.test(first)) throw new Error('Ohm calculator gave ' + first);
    const std = await page.$$eval('.tools .result .big', es => es.map(e => e.textContent));
    if (!std.some(x => /390 Ω/.test(x))) throw new Error('LED calculator did not give 390 Ω: ' + std);
    await page.goBack(); await page.waitForSelector('.lrow');
    await page.click('a[href="#/parts"]'); await page.waitForSelector('.part');
    const n = await page.$$eval('.part', e => e.length);
    if (n < 10) throw new Error('expected all parts, got ' + n);
    await page.fill('.search', cfg.lang === 'he' ? 'קבל' : 'capacitor');
    if ((await page.$$eval('.part', e => e.length)) !== 1) throw new Error('search did not narrow to one part');
    if (cfg.lang === 'he') {
      const bad = await page.evaluate(() => {
        const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?\s?(?:µA|mA|A|V|kΩ|Ω|W|µF|F|Hz|s)(?![A-Za-z0-9µΩ])/, out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let x; (x = w.nextNode());) { const el = x.parentElement; if (!el || el.closest('bdi,code,svg,script,style,[dir=ltr],[hidden]')) continue; const m = re.exec(x.nodeValue); if (m) out.push(m[0]); }
        return out;
      });
      if (bad.length) throw new Error('unwrapped units: ' + bad.join(', '));
    }
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('horizontal scroll');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label}`);
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
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

for (const cfg of CONFIGS) {
  console.log(cfg.name);
  for (const lesson of LESSONS) await playLesson(cfg, lesson);
  await pagesCheck(cfg);
}
console.log('offline');
await offlineCheck();
await browser.close(); server.close();
console.log(`lit-LED assertions: ${lit.final} final circuits, ${lit.press} press-and-hold steps`);
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall browser checks passed');
process.exit(failures.length ? 1 : 0);
