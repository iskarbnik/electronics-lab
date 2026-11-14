// The Arduino lab screen: an Uno on the breadboard, a code editor, run/stop and a serial monitor.
import { t, L, ltr, bidi, getLang, onLang } from '../i18n.js';
import { getComp } from '../sim/circuit.js';
import { createBoardView } from './boardView.js';
import { KitBoard, Runner } from '../arduino/kit.js';
import { EXAMPLES } from '../arduino/examples.js';

const KEY = 'elab.sketch';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const save = v => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };
const MAX_OUT = 4000;

export function mountArduinoLab(root, opts = {}) {
  const el = document.createElement('div');
  el.className = 'lab';
  el.innerHTML = `
    <header class="lhead">
      <button class="iconbtn back" type="button">${BACK}</button>
      <div class="ltitle"><h1></h1><span class="lstep"></span></div>
    </header>
    <div class="labbody">
      <section class="pane labboard"><div class="bhost"></div></section>
      <section class="labcol">
        <p class="labpins"></p>
        <label class="labpot"><span class="potlbl"></span> <input class="potin" type="range" min="0" max="1" step="0.01" value="0.5"></label>
        <div class="labtools">
          <label class="exlbl"><span class="extxt"></span>
            <select class="exsel"></select></label>
          <button class="btn primary run" type="button"></button>
          <button class="btn stop" type="button"></button>
          <button class="btn ghost resetb" type="button"></button>
        </div>
        <textarea class="code" dir="ltr" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="14"></textarea>
        <div class="labstatus" role="status"></div>
        <div class="monhead"><b class="montitle"></b><button class="btn small ghost clr" type="button"></button></div>
        <pre class="mon" dir="ltr" aria-live="off"></pre>
      </section>
    </div>`;
  root.append(el);
  const q = s => el.querySelector(s);
  const E = { title: q('h1'), sub: q('.lstep'), pins: q('.labpins'), pot: q('.potlbl'), potin: q('.potin'), exlbl: q('.extxt'), sel: q('.exsel'), run: q('.run'), stop: q('.stop'), reset: q('.resetb'), code: q('.code'), status: q('.labstatus'), monTitle: q('.montitle'), clr: q('.clr'), mon: q('.mon') };

  let kit = new KitBoard(), runner = null, timer = 0, t0 = 0, needDraw = true, shownOut = '', lastStatus = '';
  const view = createBoardView(q('.bhost'), {
    noBattery: true,
    onPress(id, down) { const c = getComp(kit.circuit, id); if (!c || c.type !== 'button') return; c.props.pressed = down; kit.dirty = true; needDraw = true; },
  });

  // ----- texts -----
  for (const ex of EXAMPLES) { const o = document.createElement('option'); o.value = ex.id; E.sel.append(o); }
  const sameAsExample = src => EXAMPLES.find(ex => ex.code.he === src || ex.code.en === src);
  const pinRow = (pin, key) => `<li>${ltr(pin)} ${bidi(t(key))}</li>`;
  function texts() {
    E.title.textContent = t('ard.title');
    E.sub.textContent = t('ard.sub');
    E.pins.innerHTML = `<b>${esc(t('ard.pins'))}</b><ul>${pinRow('D13', 'ard.p.d13')}${pinRow('D8', 'ard.p.d8')}${pinRow('D9', 'ard.p.d9')}${pinRow('D2', 'ard.p.d2')}${pinRow('A0', 'ard.p.a0')}</ul>`;
    E.pot.innerHTML = `${esc(t('ard.pot'))}`;
    E.exlbl.textContent = t('ard.examples');
    [...E.sel.options].slice(1).forEach((o, k) => { o.textContent = L(EXAMPLES[k].title); });
    E.run.textContent = t('ard.run'); E.stop.textContent = t('ard.stop'); E.reset.textContent = t('ard.reset');
    E.monTitle.textContent = t('ard.serial'); E.clr.textContent = t('ard.clear');
    E.code.setAttribute('aria-label', t('ard.code'));
    setStatus(lastStatus, true);
  }

  // status: idle | running | stopped | { error }
  function setStatus(s, force) {
    const key = typeof s === 'object' ? JSON.stringify(s) : s;
    if (!force && key === lastStatus) return;
    lastStatus = s;
    let msg = '', cls = '';
    if (!s) { msg = t('ard.st.idle'); }
    else if (s === 'running') { msg = t('ard.st.running'); cls = 'ok'; }
    else if (s === 'stopped') { msg = t('ard.st.stopped'); }
    else if (s === 'done') { msg = t('ard.st.done'); }
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

  // ----- code and examples -----
  const initial = load();
  E.code.value = initial ?? EXAMPLES[0].code[getLang()];
  const pickExample = () => { const ex = sameAsExample(E.code.value); E.sel.value = ex ? ex.id : ''; };
  E.sel.insertAdjacentHTML('afterbegin', '<option value="" hidden></option>');
  pickExample();
  E.sel.addEventListener('change', () => { const ex = EXAMPLES.find(x => x.id === E.sel.value); if (!ex) return; stop(); E.code.value = ex.code[getLang()]; save(E.code.value); resetBoard(); });
  E.code.addEventListener('input', () => { save(E.code.value); pickExample(); });
  E.code.addEventListener('keydown', e => {          // Tab inserts spaces instead of leaving the editor (Escape then Tab leaves)
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.dataset.trap !== 'off') {
      e.preventDefault();
      const s = E.code.selectionStart;
      E.code.setRangeText('  ', s, E.code.selectionEnd, 'end');
      E.code.dispatchEvent(new Event('input'));
    } else if (e.key === 'Escape') { E.code.dataset.trap = 'off'; } else if (e.key !== 'Tab') delete E.code.dataset.trap;
  });

  // ----- board -----
  function draw() {
    if (kit.dirty) kit.refresh();
    view.update({ circuit: kit.circuit, sim: kit.sim, selected: null, tapped: [], guides: {}, probes: null });
    needDraw = false;
  }
  function resetBoard() {
    stop();
    kit = new KitBoard();
    getComp(kit.circuit, 'P1').props.pos = +E.potin.value;
    kit.dirty = true; shownOut = ''; E.mon.textContent = '';
    setStatus(null); draw();
  }
  E.potin.addEventListener('input', () => { getComp(kit.circuit, 'P1').props.pos = +E.potin.value; kit.dirty = true; needDraw = true; });

  // ----- running -----
  function tick() {
    const now = performance.now() - t0;
    runner.step(now);
    if (runner.error) { setStatus({ error: runner.error }); stopTimer(); kit.dirty = true; needDraw = true; }
    else if (runner.finished) { setStatus('done'); stopTimer(); }
    if (kit.dirty) needDraw = true;
    if (needDraw) {
      draw();
      const burnt = kit.circuit.comps.some(c => c.type === 'led' && c.burned);
      const over = Object.entries(kit.sim.comps.UNO.pins).find(([, p]) => p.over);
      if (runner && !runner.error && !runner.finished) setStatus(burnt ? { burned: 1 } : over ? { over: over[0] } : 'running');
    }
    if (kit.out !== shownOut) {
      if (kit.out.length > MAX_OUT) kit.out = kit.out.slice(-MAX_OUT);
      shownOut = kit.out; E.mon.textContent = shownOut;
      E.mon.scrollTop = E.mon.scrollHeight;
    }
  }
  const stopTimer = () => { clearInterval(timer); timer = 0; };
  function stop() {
    const was = !!timer;
    stopTimer();
    if (runner && !runner.error) { kit.reset(); needDraw = true; draw(); if (was) setStatus('stopped'); }
    runner = null;
  }
  function run() {
    stop();
    try { runner = new Runner(E.code.value, kit); }
    catch (e) { if (e && e.code) { runner = null; setStatus({ error: { code: e.code, line: e.line, name: e.name === 'Error' ? '' : e.name } }); return; } throw e; }
    kit.reset(); shownOut = ''; E.mon.textContent = '';
    t0 = performance.now();
    setStatus('running');
    timer = setInterval(tick, 16);
    tick();
  }
  E.run.addEventListener('click', run);
  E.stop.addEventListener('click', stop);
  E.reset.addEventListener('click', resetBoard);
  E.clr.addEventListener('click', () => { kit.out = ''; shownOut = ''; E.mon.textContent = ''; });
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));

  const off = onLang(() => {
    const ex = sameAsExample(E.code.value);
    if (ex) { E.code.value = ex.code[getLang()]; save(E.code.value); }
    texts();
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
  });

  texts();
  draw();
  view.reset();

  return {
    destroy() { stopTimer(); off(); view.destroy(); el.remove(); },
    debug: { get board() { return kit; }, get runner() { return runner; }, get code() { return E.code.value; }, set code(v) { E.code.value = v; } },
  };
}
