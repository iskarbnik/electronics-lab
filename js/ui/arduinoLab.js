// The Arduino lab screen: an Uno on the breadboard that you can wire up, a code editor, run/stop,
// a serial monitor with input, and optional guided lessons.
import { t, L, ltr, bidi, getLang, onLang } from '../i18n.js';
import { getComp, addComp, removeComp, usedHoles } from '../sim/circuit.js';
import { parseHole, stripOf, nearestHole, COLS } from '../sim/board.js';
import { fmt, fmtF } from '../sim/format.js';
import { createBoardView, hitComp } from './boardView.js';
import { createScope, TIME_DIVS } from './scope.js';
import { KitBoard, Runner, newKit, newLabCircuit, BOARDS } from '../arduino/kit.js';
import { EXAMPLES as UNO_EXAMPLES, ESP_EXAMPLES } from '../arduino/examples.js';

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const KEY_PROG = 'elab.arduino';
const MAX_OUT = 4000;
const TOOLS = ['select', 'wire', 'resistor', 'led', 'button', 'pot', 'capacitor', 'diode'];
const PREFIX = { wire: 'W', resistor: 'R', led: 'L', button: 'S', pot: 'P', capacitor: 'C', diode: 'D' };
const R_CHIPS = [100, 220, 330, 470, 1000, 2200, 4700, 10000];
const C_CHIPS = [1e-5, 1e-4, 4.7e-4, 1e-3, 2.2e-3];
const LED_COLORS = ['red', 'yellow', 'green', 'blue', 'white'];
const WIRE_COLORS = ['red', 'black', 'blue', 'green', 'yellow', 'orange'];

// Guided-lesson progress, shared with the home screen.
export const progress = {
  read() { try { const o = JSON.parse(store.get(KEY_PROG) || '{}'); return { done: o.done || {}, step: o.step || {} }; } catch { return { done: {}, step: {} }; } },
  isDone(id) { return !!this.read().done[id]; },
  getStep(id) { return this.read().step[id] || 0; },
  setStep(id, n) { const p = this.read(); p.step[id] = n; store.set(KEY_PROG, JSON.stringify(p)); },
  reset() { store.set(KEY_PROG, '{}'); },
  markDone(id) { const p = this.read(); p.done[id] = true; store.set(KEY_PROG, JSON.stringify(p)); },
};

export function mountArduinoLab(root, opts = {}) {
  const lesson = opts.lesson || null;
  const boardId = lesson ? (lesson.board || 'uno') : (store.get('elab.labboard') === 'esp32' ? 'esp32' : 'uno');
  const prof = BOARDS[boardId];
  const EXAMPLES = boardId === 'esp32' ? ESP_EXAMPLES : UNO_EXAMPLES;
  const KEY_CODE = boardId === 'esp32' ? 'elab.sketch.esp32' : 'elab.sketch', KEY_CIRCUIT = boardId === 'esp32' ? 'elab.labcircuit.esp32' : 'elab.labcircuit';
  const el = document.createElement('div');
  el.className = 'lab';
  el.innerHTML = `
    <header class="lhead">
      <button class="iconbtn back" type="button">${BACK}</button>
      <div class="ltitle"><h1></h1><span class="lstep"></span></div>
    </header>
    <div class="labbody">
      <section class="lableft">
        <div class="pane labboard"><div class="bhost"></div></div>
        <div class="palette">
          <div class="tools" role="group"></div>
          <div class="toolopts"></div>
          <div class="labhint" role="status"></div>
          <div class="partcard" hidden></div>
          <div class="btnrow boardbtns"><button class="btn small ghost loadkit" type="button"></button><button class="btn small ghost clearb" type="button"></button></div>
        </div>
      </section>
      <section class="labcol">
        <div class="guide" hidden></div>
        <div class="boardsel" role="group" hidden><button type="button" data-b="uno">Arduino Uno</button><button type="button" data-b="esp32">ESP32</button></div>
        <details class="labpins"><summary></summary><p class="pinhelp"></p><ul></ul></details>
        <label class="labpot"><span class="potlbl"></span> <input class="potin" type="range" min="0" max="1" step="0.01" value="0.5"></label>
        <div class="labtools">
          <label class="exlbl"><span class="extxt"></span><select class="exsel"></select></label>
          <button class="btn primary run" type="button"></button>
          <button class="btn stop" type="button"></button>
          <button class="btn ghost resetb" type="button"></button>
        </div>
        <textarea class="code" dir="ltr" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="14"></textarea>
        <div class="labstatus" role="status"></div>
        <div class="monhead"><b class="montitle"></b><button class="btn small ghost clr" type="button"></button></div>
        <pre class="mon" dir="ltr" aria-live="off"></pre>
        <details class="scopebox"><summary class="scopesum"></summary>
          <div class="scopectl"><label><span class="ch1l"></span> <select class="ch1" dir="ltr"></select></label><label><span class="ch2l"></span> <select class="ch2" dir="ltr"></select></label>
            <label><span class="tdl"></span> <select class="tdiv" dir="ltr"></select></label><button class="btn small ghost freeze" type="button"></button></div>
          <div class="scopehost"></div><div class="scoperead" dir="ltr"></div>
        </details>
        <form class="serin"><input class="serline" dir="ltr" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"><label class="nl"><input class="nlbox" type="checkbox" checked> <span></span></label><button class="btn small sendb" type="submit"></button></form>
      </section>
    </div>`;
  root.append(el);
  const q = s => el.querySelector(s);
  const E = {
    title: q('h1'), sub: q('.lstep'), tools: q('.tools'), opts: q('.toolopts'), hint: q('.labhint'), card: q('.partcard'), loadkit: q('.loadkit'), clearb: q('.clearb'),
    guide: q('.guide'), pinsum: q('.labpins summary'), pinhelp: q('.pinhelp'), pinlist: q('.labpins ul'), pot: q('.potlbl'), potin: q('.potin'),
    exlbl: q('.extxt'), sel: q('.exsel'), run: q('.run'), stop: q('.stop'), reset: q('.resetb'), code: q('.code'), status: q('.labstatus'),
    monTitle: q('.montitle'), clr: q('.clr'), mon: q('.mon'), serform: q('.serin'), serline: q('.serline'), nlbox: q('.nlbox'), nltxt: q('.nl span'), send: q('.sendb'),
    scopeBox: q('.scopebox'), scopeSum: q('.scopesum'), ch1: q('.ch1'), ch2: q('.ch2'), tdiv: q('.tdiv'), freeze: q('.freeze'), scopeRead: q('.scoperead'),
    ch1l: q('.ch1l'), ch2l: q('.ch2l'), tdl: q('.tdl'),
  };

  // ---------- state ----------
  const loadCircuit = () => {
    if (lesson) return lesson.circuit === 'empty' ? newLabCircuit(false, boardId) : newKit(boardId);
    try {
      const c = JSON.parse(store.get(KEY_CIRCUIT) || 'null');
      if (c && Array.isArray(c.comps) && c.comps.some(x => x.type === 'uno' && x.props.names?.length === prof.names.length)) return c;
    } catch { /* fall through */ }
    return newKit(boardId);
  };
  let kit = new KitBoard(loadCircuit());
  let runner = null, timer = 0, t0 = 0, last = 0, needDraw = true, shownOut = '', lastStatus = null;
  let tool = 'select', pending = null, selection = null, hintKey = '';
  const opt = { wire: 'red', r: 220, led: 'red', cap: 1e-3 };
  const saveCircuit = () => { if (!lesson) store.set(KEY_CIRCUIT, JSON.stringify({ comps: kit.circuit.comps })); };

  const view = createBoardView(q('.bhost'), {
    noBattery: true,
    onPress(id, down) { const c = getComp(kit.circuit, id); if (!c || c.type !== 'button') return; c.props.pressed = down; kit.dirty = true; needDraw = true; },
    onTap: pt => onTap(pt),
  });

  // ---------- texts ----------
  for (const ex of EXAMPLES) { const o = document.createElement('option'); o.value = ex.id; E.sel.append(o); }
  E.sel.insertAdjacentHTML('afterbegin', '<option value="" hidden></option>');
  const sameAsExample = src => EXAMPLES.find(ex => ex.code.he === src || ex.code.en === src);
  const toolName = k => (k === 'select' ? t('ard.tool.select') : t('part.' + k));
  function texts() {
    E.title.textContent = lesson ? L(lesson.title) : t(boardId === 'esp32' ? 'ard.title32' : 'ard.title');
    E.sub.textContent = lesson ? t('ard.guided') : t('ard.sub');
    E.pinsum.textContent = t('ard.pins');
    E.pinhelp.innerHTML = bidi(esc(t('ard.pinhelp')));
    const row = (pin, key) => `<li>${ltr(pin)} ${bidi(esc(t(key)))}</li>`;
    E.pinlist.innerHTML = boardId === 'esp32'
      ? row('GPIO 18', 'ard.p.d13') + row('GPIO 19', 'ard.p.d8') + row('GPIO 21', 'ard.p.e21') + row('GPIO 4', 'ard.p.d2') + row('GPIO 34', 'ard.p.e34')
      : row('D13', 'ard.p.d13') + row('D8', 'ard.p.d8') + row('D9', 'ard.p.d9') + row('D2', 'ard.p.d2') + row('A0', 'ard.p.a0');
    E.pinhelp.innerHTML = bidi(esc(t(boardId === 'esp32' ? 'ard.pinhelp32' : 'ard.pinhelp')));
    const bs = el.querySelector('.boardsel'); bs.hidden = !!lesson;
    bs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.b === boardId)));
    E.pot.textContent = t('ard.pot');
    E.exlbl.textContent = t('ard.examples');
    [...E.sel.options].slice(1).forEach((o, k) => { o.textContent = L(EXAMPLES[k].title); });
    E.run.textContent = t('ard.run'); E.stop.textContent = t('ard.stop'); E.reset.textContent = t('ard.reset');
    E.monTitle.textContent = t('ard.serial'); E.clr.textContent = t('ard.clear');
    E.send.textContent = t('ard.send'); E.nltxt.textContent = t('ard.newline'); E.serline.setAttribute('aria-label', t('ard.sendph')); E.serline.placeholder = t('ard.sendph');
    E.scopeSum.textContent = t('ard.scope'); E.ch1l.textContent = t('scope.ch1'); E.ch2l.textContent = t('scope.ch2'); E.tdl.textContent = t('scope.tdiv');
    E.freeze.textContent = scopeFrozen !== null ? t('scope.run') : t('scope.freeze');
    [E.ch1, E.ch2].forEach((sel, k) => { sel.options[0].textContent = t('scope.off'); });
    E.loadkit.textContent = t('ard.loadKit'); E.clearb.textContent = t('ard.clearBoard');
    E.code.setAttribute('aria-label', t('ard.code'));
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
    renderTools(); renderOpts(); renderCard(); renderHint(); setStatus(lastStatus, true); renderGuide(true);
  }

  // ---------- status line ----------
  function setStatus(s, force) {
    const key = s && typeof s === 'object' ? JSON.stringify(s) : s;
    if (!force && key === lastStatus) return;
    lastStatus = typeof s === 'object' && s ? JSON.parse(JSON.stringify(s)) : s;
    let msg = '', cls = '';
    if (!s) msg = t('ard.st.idle');
    else if (s === 'running') { msg = t('ard.st.running'); cls = 'ok'; }
    else if (s === 'stopped') msg = t('ard.st.stopped');
    else if (s === 'done') msg = t('ard.st.done');
    else if (s.error) {
      const e = s.error, k = 'ard.err.' + e.code;
      const base = t(k, { name: ltr(esc(e.name || '')) });
      msg = (e.line ? t('ard.err.line', { n: ltr(e.line) }) + ' ' : '') + (base === k ? t('ard.err.generic') : base);
      cls = 'bad';
    } else if (s.burned) { msg = t('ard.burned'); cls = 'bad'; }
    else if (s.over) { msg = t('ard.overload', { pin: ltr(s.over) }); cls = 'bad'; }
    E.status.className = 'labstatus ' + cls;
    E.status.innerHTML = bidi(msg);
  }

  // ---------- code and examples ----------
  const savedCode = store.get(KEY_CODE);
  E.code.value = lesson ? '' : (savedCode ?? EXAMPLES[0].code[getLang()]);
  const pickExample = () => { const ex = sameAsExample(E.code.value); E.sel.value = ex ? ex.id : ''; };
  const setCode = v => { E.code.value = v; if (!lesson) store.set(KEY_CODE, v); pickExample(); };
  pickExample();
  E.sel.addEventListener('change', () => { const ex = EXAMPLES.find(x => x.id === E.sel.value); if (!ex) return; stop(); setCode(ex.code[getLang()]); kit.resetPins(); needDraw = true; setStatus(null); });
  E.code.addEventListener('input', () => { if (!lesson) store.set(KEY_CODE, E.code.value); pickExample(); });
  E.code.addEventListener('keydown', e => {          // Tab inserts spaces; Escape then Tab leaves the editor
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && E.code.dataset.trap !== 'off') {
      e.preventDefault();
      E.code.setRangeText('  ', E.code.selectionStart, E.code.selectionEnd, 'end');
      E.code.dispatchEvent(new Event('input'));
    } else if (e.key === 'Escape') E.code.dataset.trap = 'off';
    else if (e.key !== 'Tab') delete E.code.dataset.trap;
  });

  // ---------- board editing ----------
  const nextId = type => { let n = 1; while (getComp(kit.circuit, PREFIX[type] + n)) n++; return PREFIX[type] + n; };
  const props = type => (type === 'wire' ? { color: opt.wire } : type === 'resistor' ? { r: opt.r } : type === 'led' ? { color: opt.led } : type === 'capacitor' ? { c: opt.cap, vc: 0 } : type === 'pot' ? { r: 10000, pos: 0.5 } : {});
  const changed = () => { kit.dirty = true; needDraw = true; saveCircuit(); renderCard(); };
  const setHint = key => { hintKey = key; renderHint(); };
  function renderHint() {
    const k = hintKey || (tool === 'select' ? 'ard.hint.select' : pending ? 'ard.hint.second' : tool === 'pot' ? 'ard.hint.pot' : 'ard.hint.first');
    E.hint.textContent = t(k);
  }
  function selectTool(k) { tool = k; pending = null; hintKey = ''; if (k !== 'select') select(null); renderTools(); renderOpts(); renderHint(); needDraw = true; }
  function renderTools() {
    E.tools.innerHTML = '';
    for (const k of TOOLS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool' + (tool === k ? ' on' : ''); b.textContent = toolName(k); b.setAttribute('aria-pressed', String(tool === k));
      b.addEventListener('click', () => selectTool(k));
      E.tools.append(b);
    }
  }
  function chips(list, cur, fmtFn, onPick) {
    const row = document.createElement('div'); row.className = 'chips';
    for (const v of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.dir = 'ltr'; b.textContent = fmtFn(v);
      b.addEventListener('click', () => onPick(v));
      row.append(b);
    }
    return row;
  }
  function renderOpts() {
    E.opts.innerHTML = '';
    if (tool === 'wire') E.opts.append(chips(WIRE_COLORS, opt.wire, c => t('color.' + c), v => { opt.wire = v; renderOpts(); }));
    if (tool === 'resistor') E.opts.append(chips(R_CHIPS, opt.r, v => fmt(v, 'Ω'), v => { opt.r = v; renderOpts(); }));
    if (tool === 'led') E.opts.append(chips(LED_COLORS, opt.led, c => t('color.' + c), v => { opt.led = v; renderOpts(); }));
    if (tool === 'capacitor') E.opts.append(chips(C_CHIPS, opt.cap, fmtF, v => { opt.cap = v; renderOpts(); }));
  }

  function onTap(pt) {
    if (!pt) return;
    const hole = pt.hole || nearestHole(pt.x, pt.y, 10);
    if (tool !== 'select' && hole) return placeTap(hole);
    const cid = pt.comp || (pt.hole ? null : hitComp(kit.circuit, pt.x, pt.y, 10));
    select(cid || null);
  }
  function placeTap(hole) {
    hintKey = '';
    const used = usedHoles(kit.circuit);
    if (pending && hole === pending) { pending = null; renderHint(); needDraw = true; return; }
    if (used.has(hole)) return setHint('ard.hint.occupied');
    if (tool === 'pot') {
      const p = parseHole(hole);
      if (!p || p.row.length === 2 || p.col + 2 > COLS) return setHint('ard.hint.potSpace');
      const hs = [0, 1, 2].map(k => p.row + (p.col + k));
      if (hs.some(h => used.has(h))) return setHint('ard.hint.potSpace');
      addComp(kit.circuit, { id: nextId('pot'), type: 'pot', pins: hs, props: props('pot') });
      renderHint(); return changed();
    }
    if (!pending) { pending = hole; renderHint(); needDraw = true; return; }
    if (stripOf(pending) === stripOf(hole)) return setHint('ard.hint.same');
    addComp(kit.circuit, { id: nextId(tool), type: tool, pins: [pending, hole], props: props(tool) });
    pending = null; renderHint(); changed();
  }
  function select(id) { selection = id && getComp(kit.circuit, id) ? id : null; renderCard(); needDraw = true; }

  function renderCard() {
    const c = selection && getComp(kit.circuit, selection);
    if (!c || c.type === 'uno') { E.card.hidden = true; return; }
    E.card.hidden = false; E.card.innerHTML = '';
    const head = document.createElement('div'); head.className = 'chead';
    const val = c.type === 'resistor' ? fmt(c.props.r, 'Ω') : c.type === 'capacitor' ? fmtF(c.props.c) : '';
    head.innerHTML = `<span class="cname"><b>${esc(t('part.' + c.type))}</b> <span class="cid">${esc(c.id)}</span>${val ? ` <bdi dir="ltr" class="cval">${esc(val)}</bdi>` : ''}</span>`;
    E.card.append(head);
    const edit = fn => () => { const cc = getComp(kit.circuit, c.id); if (cc) { fn(cc); changed(); } };
    if (c.type === 'resistor') E.card.append(chips(R_CHIPS, c.props.r, v => fmt(v, 'Ω'), v => edit(cc => { cc.props.r = v; })()));
    if (c.type === 'capacitor') E.card.append(chips(C_CHIPS, c.props.c, fmtF, v => edit(cc => { cc.props.c = v; })()));
    if (c.type === 'led') E.card.append(chips(LED_COLORS, c.props.color, x => t('color.' + x), v => edit(cc => { cc.props.color = v; })()));
    if (c.type === 'wire') E.card.append(chips(WIRE_COLORS, c.props.color, x => t('color.' + x), v => edit(cc => { cc.props.color = v; })()));
    if (c.type === 'pot') {
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.01; inp.value = c.props.pos;
      inp.addEventListener('input', () => { c.props.pos = +inp.value; kit.dirty = true; needDraw = true; saveCircuit(); });
      E.card.append(inp);
    }
    const row = document.createElement('div'); row.className = 'btnrow';
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + cls; b.textContent = label; b.addEventListener('click', fn); row.append(b); };
    if (['led', 'diode', 'capacitor'].includes(c.type)) btn(t('card.flip'), edit(cc => { cc.pins = [cc.pins[1], cc.pins[0]]; }));
    if (c.burned) btn(t('card.replace'), edit(cc => { cc.burned = false; }), 'primary');
    btn(t('card.remove'), () => { removeComp(kit.circuit, c.id); selection = null; changed(); }, 'danger');
    E.card.append(row);
  }
  E.loadkit.addEventListener('click', () => { stop(); kit = new KitBoard(newKit(boardId)); afterNewBoard(); });
  E.clearb.addEventListener('click', () => { stop(); kit = new KitBoard(newLabCircuit(false, boardId)); afterNewBoard(); });
  function afterNewBoard() { if (scopeOpen()) wireScope(); selection = null; pending = null; kit.dirty = true; needDraw = true; saveCircuit(); renderCard(); setStatus(null); shownOut = ''; E.mon.textContent = ''; syncPot(); }
  const potComp = () => getComp(kit.circuit, 'P1');
  function syncPot() { const p = potComp(); E.potin.closest('label').hidden = !p || p.type !== 'pot'; if (p) E.potin.value = p.props.pos; }
  E.potin.addEventListener('input', () => { const p = potComp(); if (p) { p.props.pos = +E.potin.value; kit.dirty = true; needDraw = true; saveCircuit(); } });

  // ---------- drawing ----------
  function draw() {
    if (kit.dirty) kit.refresh();
    view.update({ circuit: kit.circuit, sim: kit.sim, selected: selection, tapped: [], guides: { pending }, probes: null });
    needDraw = false;
  }

  // ---------- running ----------
  const running = () => !!runner && !runner.error && !runner.finished;
  function frame() {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (runner) {
      runner.step(now - t0);
      if (runner.error) { setStatus({ error: runner.error }); runner = null; needDraw = true; }
      else if (runner.finished) { setStatus('done'); needDraw = true; }
    }
    if (kit.hasCap || (kit.scope && scopeOpen())) { kit.advance(dt); needDraw = true; drawScope(); }
    else if (kit.dirty) { kit.refresh(); needDraw = true; }
    if (running()) kit.observe(dt * 1000);
    if (needDraw) {
      draw();
      if (running()) {
        const burnt = kit.circuit.comps.some(c => c.type === 'led' && c.burned);
        const over = Object.entries(kit.sim.comps.UNO.pins).find(([, p]) => p.over);
        setStatus(burnt ? { burned: 1 } : over ? { over: over[0] } : 'running');
      }
    }
    if (kit.out !== shownOut) {
      if (kit.out.length > MAX_OUT) kit.out = kit.out.slice(-MAX_OUT);
      shownOut = kit.out; E.mon.textContent = shownOut; E.mon.scrollTop = E.mon.scrollHeight;
    }
    if (lesson) checkGoal();
  }
  function stop() {
    const was = running();
    runner = null;
    if (was) { kit.resetPins(); needDraw = true; setStatus('stopped'); }
  }
  function run() {
    stop();
    try { runner = new Runner(E.code.value, kit); }
    catch (e) { if (e && e.code) { runner = null; setStatus({ error: { code: e.code, line: e.line, name: e.name === 'Error' ? '' : e.name } }); return; } throw e; }
    kit.resetPins(); shownOut = ''; E.mon.textContent = '';
    t0 = performance.now(); last = t0;
    setStatus('running');
    frame();
  }
  E.run.addEventListener('click', run);
  E.stop.addEventListener('click', stop);
  E.reset.addEventListener('click', () => { stop(); kit.reset(); needDraw = true; setStatus(null); shownOut = ''; E.mon.textContent = ''; });
  E.clr.addEventListener('click', () => { kit.out = ''; shownOut = ''; E.mon.textContent = ''; });
  E.serform.addEventListener('submit', e => { e.preventDefault(); kit.send(E.serline.value + (E.nlbox.checked ? '\n' : '')); E.serline.value = ''; });
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  el.querySelectorAll('.boardsel button').forEach(b => b.addEventListener('click', () => { if (b.dataset.b !== boardId) { store.set('elab.labboard', b.dataset.b); opts.remount?.(); } }));

  // ---------- guided lesson ----------
  let stepIdx = 0, done = false, quizState = { picked: -1, right: false, wrong: false }, complete = false;
  const steps = lesson?.steps || [];
  const ctx = () => ({ board: kit, runner, code: E.code.value, out: kit.out, running: running(), stats: kit.stats });
  function enterStep(i, fresh = true) {
    stepIdx = i; done = steps[i].type === 'info'; quizState = { picked: -1, right: false, wrong: false };
    if (lesson) progress.setStep(lesson.id, i);
    if (fresh && steps[i].type === 'code') { stop(); kit.resetPins(); if (steps[i].code) setCode(steps[i].code[getLang()]); needDraw = true; }
    renderGuide(true);
  }
  function checkGoal() {
    const s = steps[stepIdx];
    if (complete || done || !s || !s.goal) return;
    let ok = false;
    try { ok = !!s.goal(ctx()); } catch { ok = false; }
    if (ok) { done = true; renderGuide(true); }
  }
  let guideKey = '';
  function renderGuide(force) {
    if (!lesson) { E.guide.hidden = true; return; }
    const s = steps[stepIdx], key = [stepIdx, done, quizState.picked, quizState.right, getLang(), complete].join('|');
    if (!force && key === guideKey) return;
    guideKey = key;
    E.guide.hidden = false;
    const last = stepIdx === steps.length - 1;
    let html = `<div class="gtop"><span>${t('lesson.step', { n: ltr(stepIdx + 1), m: ltr(steps.length) })}</span><div class="pbar"><i style="width:${(stepIdx + 1) / steps.length * 100}%"></i></div></div>`;
    html += `<div class="gtext">${bidi(L(s.text))}</div>`;
    if (s.type === 'quiz') {
      html += '<div class="gquiz">' + s.options.map((o, k) => `<button type="button" class="opt${quizState.right && k === s.answer ? ' right' : ''}${quizState.picked === k && !quizState.right ? ' wrong' : ''}" data-k="${k}"${quizState.right ? ' disabled' : ''}><span>${bidi(L(o))}</span></button>`).join('') + '</div>';
      if (quizState.right) html += `<div class="hint ok">${CHECK}<span><b>${esc(t('quiz.right'))}</b> ${bidi(L(s.why))}</span></div>`;
      else if (quizState.picked >= 0) html += `<div class="hint bad"><span>${esc(t('quiz.wrong'))}</span></div>`;
    } else if (s.type !== 'info') {
      html += `<div class="hint ${done ? 'ok' : 'info'}">${done ? CHECK : ''}<span>${esc(done ? t('step.done') : t(s.type === 'build' ? 'ard.g.build' : 'ard.g.code'))}</span></div>`;
    }
    html += `<div class="btnrow"><button type="button" class="btn small gback"${stepIdx === 0 ? ' disabled' : ''}>${esc(t('nav.back'))}</button><button type="button" class="btn small primary gnext${done ? ' ready' : ''}"${done ? '' : ' disabled'}>${esc(last ? t('nav.finish') : t('nav.next'))}</button></div>`;
    E.guide.innerHTML = html;
    E.guide.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k; quizState.picked = k;
      if (k === s.answer) { quizState.right = true; done = true; }
      renderGuide(true);
    }));
    E.guide.querySelector('.gback').addEventListener('click', () => { if (stepIdx > 0) enterStep(stepIdx - 1); });
    E.guide.querySelector('.gnext').addEventListener('click', () => {
      if (!done) return;
      if (last) { progress.markDone(lesson.id); const i = (opts.lessons || []).findIndex(l => l.id === lesson.id), nxt = (opts.lessons || [])[i + 1]; if (nxt) opts.onOpen?.(nxt.id); else opts.onHome?.(); }
      else enterStep(stepIdx + 1);
    });
  }

  // ---------- oscilloscope ----------
  const scope = createScope(q('.scopehost'));
  let scopeFrozen = null;
  const scopeNames = ['', ...kit.uno.props.names.filter(n => n !== prof.supply && n !== 'GND'), prof.supply];
  for (const sel of [E.ch1, E.ch2]) for (const n of scopeNames) { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.append(o); }
  E.ch1.value = boardId === 'esp32' ? 'G18' : 'D13'; E.ch2.value = '';
  for (const d of TIME_DIVS) { const o = document.createElement('option'); o.value = d; o.textContent = d >= 1 ? d + ' s' : d * 1000 + ' ms'; E.tdiv.append(o); }
  E.tdiv.value = 0.5;
  const scopeOpen = () => E.scopeBox.open;
  function wireScope() { kit.scope = { pins: [E.ch1.value, E.ch2.value], t: [], a: [], b: [] }; }
  for (const sel of [E.ch1, E.ch2]) sel.addEventListener('change', wireScope);
  E.scopeBox.addEventListener('toggle', () => { if (scopeOpen()) wireScope(); else kit.scope = null; });
  E.freeze.addEventListener('click', () => { scopeFrozen = scopeFrozen === null ? (kit.scope?.t.at(-1) ?? 0) : null; E.freeze.textContent = scopeFrozen !== null ? t('scope.run') : t('scope.freeze'); });
  function drawScope() {
    if (!scopeOpen() || !kit.scope) return;
    scope.draw(kit.scope, +E.tdiv.value, scopeFrozen);
    const last = i => kit.scope.t.length ? kit.scope[i === 0 ? 'a' : 'b'].at(-1) : null;
    E.scopeRead.innerHTML = [0, 1].map(i => kit.scope.pins[i] ? `<span class="c${i}">${kit.scope.pins[i]}: ${last(i) === null ? '' : fmt(last(i), 'V')}</span>` : '').join(' ');
  }

  // ---------- language ----------
  const off = onLang(() => {
    if (!lesson) { const ex = sameAsExample(E.code.value); if (ex) setCode(ex.code[getLang()]); }
    texts();
  });

  // ---------- start ----------
  timer = setInterval(frame, 16);
  last = performance.now();
  syncPot();
  texts();
  if (lesson) { const s = progress.getStep(lesson.id); enterStep(Math.min(s, steps.length - 1), true); }
  draw();
  view.reset();

  return {
    destroy() { clearInterval(timer); off(); view.destroy(); el.remove(); },
    debug: {
      get board() { return kit; }, get runner() { return runner; }, get step() { return stepIdx; }, get done() { return done; },
      get code() { return E.code.value; }, set code(v) { setCode(v); },
      tap: pt => onTap(pt), setTool: selectTool, get tool() { return tool; },
    },
  };
}
