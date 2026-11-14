// Sandbox: the whole parts box on one breadboard. Also hosts the challenges (a goal and a live checker).
import { t, L, ltr, bidi, onLang } from '../i18n.js';
import { newCircuit, addComp, removeComp, getComp, usedHoles, simulate, voltageBetween, clone } from '../sim/circuit.js';
import { parseHole, stripOf, nearestHole, COLS } from '../sim/board.js';
import { fmt, fmtF } from '../sim/format.js';
import { createBoardView, hitComp } from './boardView.js';
import { createScope } from './scope.js';
import { createTutor } from './tutorPanel.js';
import * as store from '../store.js';

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'elab.sandbox.current', KEY_SLOTS = 'elab.sandbox.slots';
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

const TOOLS = ['select', 'wire', 'resistor', 'led', 'button', 'switch', 'pot', 'capacitor', 'diode', 'transistor', 'gate'];
const PREFIX = { wire: 'W', resistor: 'R', led: 'D', button: 'S', switch: 'S', pot: 'P', capacitor: 'C', diode: 'V', transistor: 'Q', gate: 'G' };
const R_CHIPS = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 47000, 100000];
const C_CHIPS = [1e-5, 1e-4, 4.7e-4, 1e-3, 2.2e-3];
const LED_COLORS = ['red', 'yellow', 'green', 'blue', 'white'];
const WIRE_COLORS = ['red', 'black', 'blue', 'green', 'yellow', 'orange'];
const GATES = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'];
const VOLTS = [3, 5, 9, 12];
const THREE = { pot: 1, transistor: 1, switch: 1 };

function powered(v) {
  const c = newCircuit(v);
  addComp(c, { id: 'WP', type: 'wire', pins: ['BAT+', 'p+1'], props: { color: 'red' } });
  addComp(c, { id: 'WN', type: 'wire', pins: ['BAT-', 'p-1'], props: { color: 'black' } });
  return c;
}
const build = (c, parts) => { for (const [id, type, pins, props] of parts) addComp(c, { id, type, pins, props }); return c; };
const EXAMPLES = [
  ['sb.ex.led', () => build(powered(9), [['W1', 'wire', ['p+3', 'a3'], { color: 'red' }], ['R1', 'resistor', ['c3', 'c6'], { r: 470 }], ['D1', 'led', ['d6', 'd7'], {}], ['W2', 'wire', ['a7', 'p-7'], { color: 'black' }]])],
  ['sb.ex.div', () => build(powered(9), [['W1', 'wire', ['p+3', 'a3'], {}], ['R1', 'resistor', ['c3', 'c6'], { r: 2000 }], ['R2', 'resistor', ['b6', 'b9'], { r: 1000 }], ['W2', 'wire', ['a9', 'p-9'], { color: 'black' }]])],
  ['sb.ex.rc', () => build(powered(9), [['W1', 'wire', ['p+3', 'a3'], {}], ['S1', 'button', ['c3', 'd5'], {}], ['R1', 'resistor', ['c5', 'c9'], { r: 1000 }], ['C1', 'capacitor', ['d9', 'd10'], { c: 0.001 }], ['W2', 'wire', ['a10', 'p-10'], { color: 'black' }]])],
  ['sb.ex.tr', () => build(powered(9), [['W1', 'wire', ['p+3', 'a3'], {}], ['R1', 'resistor', ['b3', 'b6'], { r: 470 }], ['D1', 'led', ['a6', 'a8'], {}], ['Q1', 'transistor', ['e8', 'e9', 'e10'], {}], ['W2', 'wire', ['a10', 'p-10'], { color: 'black' }], ['R2', 'resistor', ['b9', 'b13'], { r: 10000 }], ['S1', 'button', ['c13', 'd15'], {}], ['W3', 'wire', ['p+15', 'a15'], {}]])],
  ['sb.ex.and', () => build(powered(5), [
    ['S1', 'switch', ['e3', 'e4', 'e5'], {}], ['S2', 'switch', ['e7', 'e8', 'e9'], {}], ['W1', 'wire', ['p-3', 'a3'], {}], ['W2', 'wire', ['p+5', 'a5'], {}], ['W3', 'wire', ['p-7', 'a7'], {}], ['W4', 'wire', ['p+9', 'a9'], {}],
    ['W5', 'wire', ['a4', 'b12'], {}], ['W6', 'wire', ['a8', 'b13'], {}], ['G1', 'gate', ['e12', 'e13', 'e14'], { fn: 'and' }], ['R1', 'resistor', ['a14', 'a17'], { r: 330 }], ['D1', 'led', ['b17', 'b18'], {}], ['W7', 'wire', ['a18', 'p-18'], {}]])],
];

export function mountSandbox(root, opts = {}) {
  const ch = opts.challenge || null;
  const el = document.createElement('div');
  el.className = 'lab sandbox';
  el.innerHTML = `
    <header class="lhead"><button class="iconbtn back" type="button">${BACK}</button><div class="ltitle"><h1></h1><span class="lstep"></span></div>
      <button class="tbtn tutorbtn" type="button"><span></span>?</button></header>
    <div class="labbody">
      <section class="lableft">
        <div class="pane labboard sbboard"><div class="banner" hidden></div><div class="bhost"></div></div>
        <div class="palette">
          <div class="tools" role="group"></div><div class="toolopts"></div><div class="labhint" role="status"></div>
          <div class="partcard" hidden></div>
        </div>
      </section>
      <section class="labcol">
        <div class="guide chbox" hidden></div>
        <div class="sbrow batrow"><span class="batl"></span><div class="chips batchips"></div></div>
        <div class="sbrow"><button class="tbtn meterbtn" type="button" aria-pressed="false"></button><div class="meterread" dir="ltr"></div></div>
        <details class="scopebox"><summary class="scopesum"></summary><div class="scopehost"></div></details>
        <div class="sbrow sbtools">
          <label class="exlbl"><span class="extxt"></span><select class="exsel"><option value="" hidden></option></select></label>
          <button class="btn small ghost clearb" type="button"></button>
        </div>
        <div class="sbrow slots"><select class="slotsel"></select><button class="btn small saveb" type="button"></button><button class="btn small loadb" type="button"></button><span class="slotmsg muted"></span></div>
      </section>
    </div>`;
  root.append(el);
  const q = s => el.querySelector(s);
  const E = {
    title: q('h1'), sub: q('.lstep'), tutorbtn: q('.tutorbtn'), banner: q('.banner'), tools: q('.tools'), opts: q('.toolopts'), hint: q('.labhint'), card: q('.partcard'),
    chbox: q('.chbox'), batl: q('.batl'), batchips: q('.batchips'), meterBtn: q('.meterbtn'), meterRead: q('.meterread'), scopeBox: q('.scopebox'), scopeSum: q('.scopesum'),
    exlbl: q('.extxt'), sel: q('.exsel'), clearb: q('.clearb'), slotsel: q('.slotsel'), saveb: q('.saveb'), loadb: q('.loadb'), slotmsg: q('.slotmsg'),
  };

  // ---------- state ----------
  const loadCurrent = () => {
    if (ch) return ch.start();
    try { const c = JSON.parse(lsGet(KEY) || 'null'); if (c && Array.isArray(c.comps) && c.comps.some(x => x.type === 'battery')) return c; } catch { /* fall through */ }
    return powered(9);
  };
  let circuit = loadCurrent(), sim = simulate(circuit);
  let tool = 'select', pending = null, selection = null, hintKey = '', meterOn = false, probes = { red: null, black: null };
  let dirty = true, needDraw = true, last = performance.now(), solved = false, checkNote = null, hintShown = false, checkDue = true, scopeT = 0;
  const opt = { wire: 'red', r: 470, led: 'red', cap: 1e-3, gate: 'and' };
  const hasCap = () => circuit.comps.some(c => c.type === 'capacitor');
  const scopeData = { t: [], a: [], b: [null] };
  const bat = () => getComp(circuit, 'BAT');
  const persist = () => { if (!ch) lsSet(KEY, JSON.stringify({ comps: circuit.comps })); };

  const view = createBoardView(q('.bhost'), {
    onPress(id, down) { const c = getComp(circuit, id); if (!c || c.type !== 'button') return; c.props.pressed = down; changed(false); },
    onTap: pt => onTap(pt),
  });
  const tutor = createTutor(q('.sbboard'), () => ({ circuit, sim }));
  const scope = createScope(q('.scopehost'));
  q('.tutorbtn').addEventListener('click', () => tutor.toggle());

  // ---------- texts ----------
  const toolName = k => (k === 'select' ? t('ard.tool.select') : t('part.' + k));
  function texts() {
    E.title.textContent = ch ? L(ch.title) : t('sb.title');
    E.sub.textContent = ch ? t('ch.title') : t('sb.sub');
    E.tutorbtn.firstElementChild.textContent = t('tutor.btn');
    E.batl.textContent = t('sb.battery'); E.meterBtn.textContent = t('sb.meter'); E.scopeSum.textContent = t('sb.scope');
    E.exlbl.textContent = t('sb.examples'); E.clearb.textContent = t('sb.clear'); E.saveb.textContent = t('sb.save'); E.loadb.textContent = t('sb.load');
    E.sel.options[0].textContent = '';
    [...E.sel.options].slice(1).forEach((o, k) => { o.textContent = t(EXAMPLES[k][0]); });
    renderSlots(); renderTools(); renderOpts(); renderHint(); renderCard(); renderBatChips(); renderChallenge();
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
  }
  for (const [k] of EXAMPLES) { const o = document.createElement('option'); o.value = k; E.sel.append(o); }

  // ---------- palette ----------
  const nextId = type => { let n = 1; while (getComp(circuit, PREFIX[type] + n)) n++; return PREFIX[type] + n; };
  const props = type => (type === 'wire' ? { color: opt.wire } : type === 'resistor' ? { r: opt.r } : type === 'led' ? { color: opt.led } : type === 'capacitor' ? { c: opt.cap, vc: 0 } : type === 'pot' ? { r: 10000, pos: 0.5 } : type === 'gate' ? { fn: opt.gate } : {});
  function changed(persistToo = true) { dirty = true; needDraw = true; checkDue = true; if (persistToo) persist(); renderCard(); store.setFlag('sandbox', true); }
  const setHint = key => { hintKey = key; renderHint(); };
  function renderHint() {
    const k = hintKey || (tool === 'select' ? 'ard.hint.select' : pending ? 'ard.hint.second' : THREE[tool] ? 'ard.hint.pot' : tool === 'gate' && opt.gate !== 'not' ? 'ard.hint.pot' : 'ard.hint.first');
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
      b.addEventListener('click', () => onPick(v)); row.append(b);
    }
    return row;
  }
  function renderOpts() {
    E.opts.innerHTML = '';
    if (tool === 'wire') E.opts.append(chips(WIRE_COLORS, opt.wire, c => t('color.' + c), v => { opt.wire = v; renderOpts(); }));
    if (tool === 'resistor') E.opts.append(chips(R_CHIPS, opt.r, v => fmt(v, 'Ω'), v => { opt.r = v; renderOpts(); }));
    if (tool === 'led') E.opts.append(chips(LED_COLORS, opt.led, c => t('color.' + c), v => { opt.led = v; renderOpts(); }));
    if (tool === 'capacitor') E.opts.append(chips(C_CHIPS, opt.cap, fmtF, v => { opt.cap = v; renderOpts(); }));
    if (tool === 'gate') E.opts.append(chips(GATES, opt.gate, g => g.toUpperCase(), v => { opt.gate = v; renderOpts(); renderHint(); }));
  }
  function renderBatChips() {
    E.batchips.innerHTML = '';
    E.batl.parentElement.hidden = !!ch;
    if (!ch) E.batchips.append(chips(VOLTS, bat()?.props.v, v => fmt(v, 'V'), v => { const b = bat(); if (b) { b.props.v = v; changed(); renderBatChips(); } }));
  }

  // ---------- placing and editing ----------
  function onTap(pt) {
    if (!pt) return;
    const hole = pt.hole || nearestHole(pt.x, pt.y, 10);
    if (meterOn && hole && tool === 'select') return probeTap(hole);
    if (tool !== 'select' && hole) return placeTap(hole);
    const cid = pt.comp || (pt.hole ? null : hitComp(circuit, pt.x, pt.y, 10));
    const c = cid && getComp(circuit, cid);
    if (c && c.type === 'switch') { c.props.on = !c.props.on; changed(); }
    select(cid || null);
  }
  function probeTap(hole) {
    if (probes.red && probes.black) probes = { red: hole, black: null };
    else if (!probes.red) probes.red = hole; else probes.black = hole;
    scopeData.t.length = 0; scopeData.a.length = 0; scopeT = 0; needDraw = true;
  }
  function placeTap(hole) {
    hintKey = '';
    const used = usedHoles(circuit);
    if (pending && hole === pending) { pending = null; renderHint(); needDraw = true; return; }
    if (used.has(hole)) return setHint('ard.hint.occupied');
    const three = THREE[tool] || (tool === 'gate' && opt.gate !== 'not');
    if (three) {
      const p = parseHole(hole);
      if (!p || p.row.length === 2 || p.col + 2 > COLS) return setHint('ard.hint.potSpace');
      const hs = [0, 1, 2].map(k => p.row + (p.col + k));
      if (hs.some(h => used.has(h))) return setHint('ard.hint.potSpace');
      addComp(circuit, { id: nextId(tool), type: tool, pins: hs, props: props(tool) });
      renderHint(); return changed();
    }
    if (!pending) { pending = hole; renderHint(); needDraw = true; return; }
    if (stripOf(pending) === stripOf(hole)) return setHint('ard.hint.same');
    addComp(circuit, { id: nextId(tool), type: tool, pins: [pending, hole], props: props(tool) });
    pending = null; renderHint(); changed();
  }
  function select(id) { selection = id && getComp(circuit, id) ? id : null; renderCard(); needDraw = true; }
  function renderCard() {
    const c = selection && getComp(circuit, selection);
    if (!c || c.type === 'battery') { E.card.hidden = true; return; }
    E.card.hidden = false; E.card.innerHTML = '';
    const head = document.createElement('div'); head.className = 'chead';
    const val = c.type === 'resistor' ? fmt(c.props.r, 'Ω') : c.type === 'capacitor' ? fmtF(c.props.c) : c.type === 'gate' ? c.props.fn.toUpperCase() : '';
    head.innerHTML = `<span class="cname"><b>${esc(t('part.' + c.type))}</b> <span class="cid">${esc(c.id)}</span>${val ? ` <bdi dir="ltr" class="cval">${esc(val)}</bdi>` : ''}</span>`;
    E.card.append(head);
    const edit = fn => v => { const cc = getComp(circuit, c.id); if (cc) { fn(cc, v); changed(); } };
    if (c.type === 'resistor') E.card.append(chips(R_CHIPS, c.props.r, v => fmt(v, 'Ω'), edit((cc, v) => { cc.props.r = v; })));
    if (c.type === 'capacitor') E.card.append(chips(C_CHIPS, c.props.c, fmtF, edit((cc, v) => { cc.props.c = v; })));
    if (c.type === 'led') E.card.append(chips(LED_COLORS, c.props.color, x => t('color.' + x), edit((cc, v) => { cc.props.color = v; })));
    if (c.type === 'wire') E.card.append(chips(WIRE_COLORS, c.props.color, x => t('color.' + x), edit((cc, v) => { cc.props.color = v; })));
    if (c.type === 'gate' && c.pins.length === 3) E.card.append(chips(GATES.filter(g => g !== 'not'), c.props.fn, g => g.toUpperCase(), edit((cc, v) => { cc.props.fn = v; })));
    if (c.type === 'pot') {
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.01; inp.value = c.props.pos;
      inp.addEventListener('input', () => { c.props.pos = +inp.value; changed(); });
      E.card.append(inp);
    }
    const row = document.createElement('div'); row.className = 'btnrow';
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + cls; b.textContent = label; b.addEventListener('click', fn); row.append(b); };
    if (['led', 'diode', 'capacitor'].includes(c.type)) btn(t('card.flip'), () => edit(cc => { cc.pins = [cc.pins[1], cc.pins[0]]; })());
    if (c.burned) btn(t('card.replace'), () => edit(cc => { cc.burned = false; })(), 'primary');
    btn(t('card.remove'), () => { removeComp(circuit, c.id); selection = null; changed(); }, 'danger');
    E.card.append(row);
  }

  // ---------- examples, clear, slots ----------
  E.sel.addEventListener('change', () => { const ex = EXAMPLES.find(x => x[0] === E.sel.value); if (!ex) return; replaceCircuit(ex[1]()); E.sel.value = ''; });
  E.clearb.addEventListener('click', () => replaceCircuit(ch ? ch.start() : powered(bat()?.props.v ?? 9)));
  function replaceCircuit(c) { circuit = c; selection = null; pending = null; probes = { red: null, black: null }; scopeData.t.length = 0; scopeData.a.length = 0; scopeT = 0; changed(); renderBatChips(); }
  const slots = () => { try { return JSON.parse(lsGet(KEY_SLOTS) || '{}') || {}; } catch { return {}; } };
  function renderSlots() {
    const cur = E.slotsel.value || '1', sl = slots();
    E.slotsel.innerHTML = [1, 2, 3].map(n => `<option value="${n}">${esc(t('sb.slot', { n }))} (${esc(sl[n] ? sl[n].comps.length - 1 + '' : t('sb.empty'))})</option>`).join('');
    E.slotsel.value = cur;
    E.saveb.hidden = E.loadb.hidden = E.slotsel.hidden = !!ch;
  }
  E.saveb.addEventListener('click', () => { const sl = slots(); sl[E.slotsel.value] = { comps: clone(circuit).comps }; lsSet(KEY_SLOTS, JSON.stringify(sl)); renderSlots(); E.slotmsg.textContent = t('sb.saved'); });
  E.loadb.addEventListener('click', () => { const s = slots()[E.slotsel.value]; if (!s) return; replaceCircuit({ comps: clone(s).comps }); E.slotmsg.textContent = t('sb.loaded'); });

  // ---------- meter ----------
  E.meterBtn.addEventListener('click', () => { meterOn = !meterOn; E.meterBtn.setAttribute('aria-pressed', String(meterOn)); if (!meterOn) probes = { red: null, black: null }; needDraw = true; });

  // ---------- challenge ----------
  const done = () => store.getFlag('ch:' + ch.id);
  function renderChallenge() {
    if (!ch) { E.chbox.hidden = true; return; }
    E.chbox.hidden = false;
    const list = opts.challenges || [], i = list.findIndex(c => c.id === ch.id), nxt = list[i + 1];
    let html = `<div class="gtext"><b>${esc(t('sb.goal'))}</b> ${bidi(L(ch.text))}</div>`;
    if (hintShown) html += `<div class="hint info"><span>${bidi(L(ch.hint))}</span></div>`;
    if (solved) html += `<div class="hint ok">${CHECK}<span>${esc(t('sb.solved'))}</span></div>`;
    else if (checkNote) html += `<div class="hint bad"><span>${bidi(L(checkNote))}</span></div>`;
    html += `<div class="btnrow">${hintShown ? '' : `<button type="button" class="btn small hintb">${esc(t('sb.hint'))}</button>`}${solved && nxt ? `<button type="button" class="btn small primary nextb">${esc(t('sb.nextch'))}</button>` : ''}<button type="button" class="btn small ghost allb">${esc(t('sb.allch'))}</button></div>`;
    E.chbox.innerHTML = html;
    E.chbox.querySelector('.hintb')?.addEventListener('click', () => { hintShown = true; renderChallenge(); });
    E.chbox.querySelector('.nextb')?.addEventListener('click', () => opts.onOpen?.(nxt.id));
    E.chbox.querySelector('.allb').addEventListener('click', () => opts.onHome?.());
  }
  function runCheck() {
    if (!ch) return;
    checkDue = false;
    let r; try { r = ch.check(circuit); } catch { r = { ok: false }; }
    if (r.ok && !solved) { solved = true; checkNote = null; store.setFlag('ch:' + ch.id, true); renderChallenge(); }
    else if (!r.ok && (solved || JSON.stringify(r.note) !== JSON.stringify(checkNote))) { solved = false; checkNote = r.note || null; renderChallenge(); }
  }

  // ---------- frame loop ----------
  function frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (hasCap()) { sim = simulate(circuit, { dt: Math.max(dt, 0.001), advance: true }); needDraw = true; checkDue = true; }
    else if (dirty) { sim = simulate(circuit); needDraw = true; }
    if (dirty) { for (const ev of sim.events) store.setFlag('burned', true); }
    dirty = false;
    if (sim.events.length) { renderCard(); }
    if (needDraw) {
      view.update({ circuit, sim, selected: selection, tapped: [], guides: { pending }, probes: meterOn ? probes : null });
      E.banner.hidden = !sim.short;
      if (sim.short) E.banner.innerHTML = t('banner.short', { i: ltr(fmt(sim.comps.BAT.i, 'A')) });
      if (probes.red && probes.black) {
        const v = voltageBetween(sim, probes.red, probes.black);
        E.meterRead.innerHTML = ltr(fmt(Math.abs(v) < 5e-4 ? 0 : v, 'V'));
        if (E.scopeBox.open) {
          scopeT += dt; scopeData.t.push(scopeT); scopeData.a.push(v);
          while (scopeData.t.length > 1 && scopeT - scopeData.t[0] > 30) { scopeData.t.shift(); scopeData.a.shift(); }
          scope.draw(scopeData, 0.5, null, Math.max(5, bat()?.props.v ?? 9));
        }
      } else E.meterRead.textContent = meterOn ? '' : '';
      needDraw = false;
      tutor.refresh();
    }
    if (checkDue && ch) runCheck();
  }
  const timer = setInterval(frame, 50);

  // ---------- start ----------
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  const off = onLang(texts);
  texts();
  if (ch && done()) { solved = true; renderChallenge(); }
  frame();
  view.reset();
  return {
    destroy() { clearInterval(timer); off(); tutor.destroy(); view.destroy(); el.remove(); },
    debug: { get circuit() { return circuit; }, get sim() { return sim; }, get solved() { return solved; }, tap: onTap, setTool: selectTool, get tool() { return tool; }, load(c) { replaceCircuit(c); } },
  };
}
