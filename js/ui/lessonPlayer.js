// The lesson player: owns the circuit, the step state machine and the DOM of the lesson screen.
import { COLS, TERMINALS, VIEW, stripOf, holesOfStrip, holePos, parseHole, nearestHole } from '../sim/board.js';
import { simulate, usedHoles, getComp, clone, addComp, removeComp, voltageBetween } from '../sim/circuit.js';
import { fmt } from '../sim/format.js';
import { GATE_FNS, truthTable } from '../sim/logic.js';
import { buildCircuit } from '../lessons/engine.js';
import { t, L, ltr, bidi, getLang, onLang } from '../i18n.js';
import * as store from '../store.js';
import { createBoardView, hitComp, compBox, stripBox, focusRect } from './boardView.js';
import { createSchematicView } from './schematicView.js';

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  meter: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12l4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  fit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const CHIPS = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 100000, 1000000];
const cleanV = v => (Math.abs(v) < 5e-4 ? 0 : v);
const multi = k => k === 'pot' || k === 'gate' || k === 'transistor';
const isTerm = h => h === 'BAT+' || h === 'BAT-';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function h(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; }

export function mountLesson(root, lesson, opts = {}) {
  const lessons = opts.lessons || [];
  const steps = lesson.steps;
  const plan = {};
  for (const s of [...(lesson.setup || []), ...steps]) {
    if (s.type === 'wire') plan[s.id] = { type: 'wire', props: { color: s.color } };
    else if (s.type === 'place') plan[s.id] = { type: s.kind, props: s.props || {} };
  }

  // ---------- DOM ----------
  const rootEl = h('div', 'lesson');
  rootEl.innerHTML = `
    <header class="lhead">
      <button class="iconbtn back" type="button">${ICON.back}</button>
      <div class="ltitle"><h1></h1><span class="lstep"></span></div>
      <button class="tbtn meterbtn" type="button" aria-pressed="false">${ICON.meter}<span></span></button>
      <button class="tbtn fitbtn" type="button">${ICON.fit}<span></span></button>
      <div class="pbar" role="progressbar"><i></i></div>
    </header>
    <main class="stage">
      <section class="pane boardpane">
        <div class="banner" hidden></div>
        <div class="meterbox" hidden></div>
        <div class="truthbox" hidden></div>
        <div class="scopebox" hidden></div>
        <div class="bhost"></div>
        <div class="toast" hidden role="status"></div>
        <div class="card" hidden></div>
      </section>
      <section class="pane schempane">
        <button class="schemtoggle" type="button" aria-expanded="true"><span></span>${ICON.chev}</button>
        <div class="shost"></div>
      </section>
    </main>
    <footer class="steppanel">
      <div class="stepbody"><div class="steptext"></div><div class="quiz"></div><div class="hint" role="status"></div></div>
      <div class="nav"><button class="btn ghost bk" type="button"></button><button class="btn primary nx" type="button"></button></div>
    </footer>
    <div class="complete" hidden></div>`;
  root.append(rootEl);
  const $ = s => rootEl.querySelector(s);
  const E = {
    back: $('.back'), title: $('.ltitle h1'), stepLbl: $('.lstep'), meterBtn: $('.meterbtn'), fitBtn: $('.fitbtn'), bar: $('.pbar'),
    bhost: $('.bhost'), meterBox: $('.meterbox'), truthBox: $('.truthbox'), scopeBox: $('.scopebox'), banner: $('.banner'), toast: $('.toast'), card: $('.card'),
    schemPane: $('.schempane'), schemToggle: $('.schemtoggle'), shost: $('.shost'),
    text: $('.steptext'), quiz: $('.quiz'), hint: $('.hint'), bk: $('.bk'), nx: $('.nx'), complete: $('.complete'),
  };
  if (!lesson.schematic) { E.schemPane.hidden = true; rootEl.classList.add('noschem'); }
  const board = createBoardView(E.bhost, { onTap, onPress });
  const schem = lesson.schematic ? createSchematicView(E.shost, lesson.schematic, { onSelect: id => selectComp(id) }) : null;

  // ---------- state ----------
  let stepIdx = 0, circuit, sim;
  const snapshots = {};
  const passed = new Set();
  let ui, selection, pending, probes, meterOn, done, quizState, hintOv, cardOpen = true, complete = false;
  let advanceTimer = 0, toastTimer = 0, cardKey = '', cardRefs = null, lastFocus = null;
  const cur = () => steps[stepIdx];
  const newUi = () => ({ pressed: new Set(), selected: new Set(), tapped: new Set() });

  function enter(i) {
    clearTimeout(advanceTimer);
    stepIdx = i;
    ui = newUi(); if (selection && !getComp(snapshots[i] || {comps: []}, selection)) selection = null; pending = null; probes = { red: null, black: null };
    done = false; quizState = { picked: -1, right: false, wrong: false }; hintOv = null;
    cardOpen = !!selection && cur().type === 'do' && cur().comp === selection;
    if (!snapshots[i]) snapshots[i] = buildCircuit(lesson, i);
    circuit = clone(snapshots[i]);
    const s = cur();
    meterOn = s.type === 'measure' || !!s.meter;
    if (s.meter) probes = { red: s.meter.red, black: s.meter.black };
    if (passed.has(i) && (s.type === 'quiz' || s.type === 'explore')) { done = true; if (s.type === 'quiz') quizState = { picked: s.answer, right: true, wrong: false }; }
    store.setStep(lesson.id, i);
    scopeData = [];
    sim = simulate(circuit);
    evalDone();
    ensureLoop();
    focusStep();
    renderAll();
  }

  function focusStep() {
    const s = cur(), boxes = [];
    const railPt = (strip, otherPin) => { const c = otherPin && parseHole(otherPin)?.col || 1; const p = holePos(strip + c) || holePos(strip + 1); return { x: p.x - 10, y: p.y - 10, w: 20, h: 20 }; };
    const stripFor = (strip, otherPin) => (/^[pq]/.test(strip) ? railPt(strip, otherPin) : stripBox(strip));
    if (s.type === 'wire' || (s.type === 'place' && !multi(s.kind))) {
      s.pins.forEach((p, k) => boxes.push(stripFor(stripOf(p), s.pins[1 - k])));
    } else if (s.type === 'place') {
      const a = holePos(s.pins[0]), b = holePos(s.pins[s.pins.length - 1]);
      boxes.push({ x: a.x - 14, y: a.y - 50, w: b.x - a.x + 28, h: 62 });
    } else if (s.type === 'measure') {
      boxes.push(stripFor(stripOf(s.red), s.black), stripFor(stripOf(s.black), s.red));
    } else if (s.type === 'do') {
      const c = getComp(circuit, s.comp);
      if (c) { const b = compBox(c); boxes.push(b, { x: b.x, y: b.y + b.h + 100, w: b.w, h: 1 }); }
    } else if (s.type === 'explore') {
      boxes.push(s.want === 'rail' ? { x: 60, y: 10, w: 300, h: 60 } : { x: 100, y: 60, w: 240, h: 240 });
    } else {
      for (const c of circuit.comps) if (c.type !== 'battery') boxes.push(compBox(c));
    }
    let r = focusRect(boxes);
    if (!boxes.length && !r) r = lastFocus;
    if (r && r.w > 620) r = null;
    lastFocus = r;
    board.setTarget(r);
  }

  function evalDone() {
    const s = cur();
    if (s.type === 'do') { if (!done && s.until(sim, circuit, ui)) { done = true; } }
    else if (s.type === 'measure') {
      if (!done && probes.red && probes.black) {
        const a = new Set([stripOf(probes.red), stripOf(probes.black)]), b = new Set([stripOf(s.red), stripOf(s.black)]);
        if (a.size === b.size && [...a].every(x => b.has(x))) done = true;
      }
    } else if (s.type === 'quiz') done = quizState.right;
  }
  const stepDone = () => cur().type === 'info' || done;

  function recalc() {
    ensureLoop();
    sim = simulate(circuit);
    for (const ev of sim.events) toast(t('toast.burn', { i: ltr(fmt(ev.i, 'A')) }));
    evalDone();
    renderAll();
  }

  // Time runs live while a capacitor is on the board.
  let raf = 0, lastT = 0;
  let scopeData = [];
  const hasCap = () => !!cur().scope || circuit.comps.some(c => c.type === 'capacitor' || (c.type === 'switch' && c.props.period));
  const vcs = () => circuit.comps.filter(c => c.type === 'capacitor').map(c => c.props.vc);
  function ensureLoop() {
    if (raf || complete || !hasCap()) return;
    lastT = performance.now(); raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (complete || !hasCap()) return;
    const dt = Math.min(0.05, (now - lastT) / 1000) * (lesson.timeScale || 1);
    lastT = now;
    if (dt > 0) {
      const before = vcs(), wasDone = done;
      sim = simulate(circuit, dt);
      for (const ev of sim.events) toast(t('toast.burn', { i: ltr(fmt(ev.i, 'A')) }));
      evalDone();
      if (cur().scope) {
        const T = circuit.t || 0, win = cur().scope.window || 4;
        scopeData.push({ t: T, v: cur().scope.holes.map(h => voltageBetween(sim, h, 'BAT-')) });
        while (scopeData.length && scopeData[0].t < T - win) scopeData.shift();
      }
      const moved = !!cur().scope || vcs().some((v, k) => Math.abs(v - before[k]) > 1e-6) || sim.events.length;
      if (moved) renderLive();
      if (done !== wasDone) renderPanel();
    }
    raf = requestAnimationFrame(tick);
  }
  function renderLive() { renderScope(); renderScope(); renderMeter(); renderTruth(); renderBanner(); renderCard(); renderBoard(); renderSchem(); }

  function toast(html) {
    E.toast.innerHTML = bidi(html); E.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { E.toast.hidden = true; }, 6000);
  }

  // ---------- navigation ----------
  function next() {
    if (!stepDone()) return;
    passed.add(stepIdx);
    if (stepIdx >= steps.length - 1) return finish();
    snapshots[stepIdx + 1] = clone(circuit);
    enter(stepIdx + 1);
  }
  function back() { if (stepIdx > 0) enter(stepIdx - 1); }
  function finish() {
    clearTimeout(advanceTimer);
    store.markDone(lesson.id);
    complete = true; renderComplete();
  }

  // ---------- input ----------
  const setHint = (key, kind = 'bad') => { hintOv = { text: t(key), kind }; renderPanel(); };

  function onPress(id, down) {
    if (complete) return;
    const c = getComp(circuit, id);
    if (!c || c.type !== 'button') return;
    c.props.pressed = down;
    if (down) ui.pressed.add(id);
    recalc();
  }

  function onTap(pt) {
    if (complete) return;
    hintOv = null;
    const s = cur();
    const hole = pt.hole || nearestHole(pt.x, pt.y, 10);
    if ((s.type === 'wire' || s.type === 'place') && !done) { if (hole) return placeTap(hole); }
    if (s.type === 'explore' && hole) return exploreTap(hole);
    if (meterOn && hole && s.type !== 'do') return probeTap(hole);
    const cid = pt.comp || (pt.hole ? null : hitComp(circuit, pt.x, pt.y, 10));
    if (cid && getComp(circuit, cid)?.type === 'switch') return toggleSwitch(cid);
    if (cid) return selectComp(cid);
    if (hole) { ui.tapped = new Set([stripOf(hole)]); renderBoard(); renderPanel(); }
  }

  function toggleSwitch(id) {
    const c = getComp(circuit, id);
    c.props.on = !c.props.on;
    ui.selected.add(id);
    recalc();
  }

  function selectComp(id) {
    if (!getComp(circuit, id)) return;
    selection = id; ui.selected.add(id); cardOpen = true; hintOv = null;
    const c = getComp(circuit, id);
    if (c && c.type !== 'battery') { const b = compBox(c); board.setTarget(focusRect([b, { x: b.x, y: b.y + b.h + 120, w: b.w, h: 1 }])); }
    recalc();
  }

  function exploreTap(hole) {
    const s = cur(), strip = stripOf(hole);
    ui.tapped = new Set([strip]);
    const ok = s.want === 'rail' ? /^[pq]/.test(strip) : /^[TB]/.test(strip);
    if (ok) { done = true; passed.add(stepIdx); } else hintOv = { text: t('hint.exploreWrong'), kind: 'bad' };
    renderBoard(); renderPanel();
  }

  function probeTap(hole) {
    if (probes.red && probes.black) probes = { red: hole, black: null };
    else if (!probes.red) probes.red = hole;
    else probes.black = hole;
    evalDone(); renderAll();
  }

  function placeTap(hole) {
    const s = cur(), strips = s.pins.map(stripOf), used = usedHoles(circuit), strip = stripOf(hole);
    if (pending && hole === pending.hole) { pending = null; hintOv = null; return renderAll(); }
    if (!isTerm(hole) && used.has(hole)) return setHint('hint.occupied');
    if (s.type === 'place' && multi(s.kind)) {
      if (strip !== strips[0]) return setHint('hint.wrongStrip');
      const p = parseHole(hole), n = s.pins.length;
      const hs = Array.from({ length: n }, (_, k) => p.row + (p.col + k));
      if (p.col + n - 1 > COLS || hs.some(x => used.has(x))) return setHint('hint.potSpace');
      return commit(hs);
    }
    if (!pending) {
      const idx = strips.indexOf(strip);
      if (idx < 0) return setHint('hint.wrongStrip');
      pending = { hole, idx };
      return renderAll();
    }
    const other = 1 - pending.idx;
    if (strips[other] !== strip) return setHint('hint.wrongStrip');
    const pins = []; pins[pending.idx] = pending.hole; pins[other] = hole;
    commit(pins);
  }

  function commit(pins) {
    const s = cur();
    addComp(circuit, { id: s.id, type: s.type === 'wire' ? 'wire' : s.kind, pins, props: s.type === 'wire' ? { color: s.color } : { ...(s.props || {}) } });
    pending = null; done = true;
    hintOv = { text: t('hint.placed'), kind: 'ok' };
    recalc();
    const mine = stepIdx;
    advanceTimer = setTimeout(() => { if (stepIdx === mine && !complete) next(); }, 450);
  }

  // ---------- rendering ----------
  const stepKey = () => `${stepIdx}`;

  function guides() {
    const s = cur(), g = { rings: [], pulse: null, pending: pending?.hole || null, compRing: null };
    const free = hole => isTerm(hole) || !usedHoles(circuit).has(hole);
    const pick = (strip, canon) => (canon && stripOf(canon) === strip && free(canon) ? canon : holesOfStrip(strip).find(free) || null);
    if ((s.type === 'wire' || s.type === 'place') && !done) {
      const strips = s.pins.map(stripOf);
      const idxs = multi(s.kind) ? [0] : pending ? [1 - pending.idx] : [0, 1];
      for (const k of idxs) {
        if (strips[k] !== undefined && !g.rings.some(r => r.strip === strips[k])) g.rings.push({ strip: strips[k], kind: 'target' });
      }
      g.pulse = pick(strips[idxs[0]], s.pins[idxs[0]]);
      if (multi(s.kind)) { const p = s.pins[0]; g.pulse = free(p) ? p : g.pulse; }
    } else if (s.type === 'measure' && !done) {
      const rs = stripOf(s.red), bs = stripOf(s.black);
      const onRed = probes.red && stripOf(probes.red) === rs;
      if (!probes.red) { g.rings.push({ strip: rs, kind: 'red' }); g.pulse = s.red; }
      else if (!probes.black) { g.rings.push({ strip: onRed ? bs : rs, kind: onRed ? 'black' : 'red' }); g.pulse = onRed ? s.black : s.red; }
      else g.rings.push({ strip: rs, kind: 'red' }, { strip: bs, kind: 'black' });
    } else if (s.type === 'do' && !done && getComp(circuit, s.comp)) g.compRing = s.comp;
    return g;
  }

  function renderBoard() {
    board.update({ circuit, sim, selected: selection, tapped: [...ui.tapped], guides: guides(), probes: meterOn || cur().type === 'measure' ? probes : null });
  }
  function renderSchem() { schem?.update({ circuit, sim, selected: selection, plan }); }

  function renderHeader() {
    E.back.setAttribute('aria-label', t('lesson.homeAria'));
    E.title.textContent = L(lesson.title);
    E.stepLbl.innerHTML = t('lesson.step', { n: ltr(stepIdx + 1), m: ltr(steps.length) });
    E.meterBtn.querySelector('span').textContent = t('lesson.meter');
    E.meterBtn.setAttribute('aria-pressed', String(meterOn));
    E.fitBtn.querySelector('span').textContent = t('lesson.fit');
    E.fitBtn.setAttribute('aria-label', t('lesson.fitAria'));
    E.bar.firstElementChild.style.width = ((stepIdx + 1) / steps.length * 100) + '%';
    E.bar.setAttribute('aria-valuenow', stepIdx + 1); E.bar.setAttribute('aria-valuemax', steps.length);
    E.schemToggle.firstElementChild.textContent = t('schem.title');
    E.schemToggle.setAttribute('aria-label', t('schem.toggle'));
  }

  function renderPanel() {
    const s = cur(), last = stepIdx === steps.length - 1;
    E.text.innerHTML = bidi(L(s.text));
    // quiz
    E.quiz.innerHTML = '';
    if (s.type === 'quiz') {
      s.options.forEach((o, k) => {
        const b = h('button', 'opt', `<span>${bidi(L(o))}</span>`); b.type = 'button';
        if (quizState.right && k === s.answer) b.classList.add('right');
        if (quizState.picked === k && !quizState.right) b.classList.add('wrong');
        b.disabled = quizState.right;
        b.addEventListener('click', () => {
          if (quizState.right) return;
          quizState.picked = k;
          if (k === s.answer) { quizState.right = true; quizState.wrong = false; evalDone(); } else quizState.wrong = true;
          renderPanel();
        });
        E.quiz.append(b);
      });
    }
    // hint line
    let text = '', kind = 'info';
    const ok = s.ok ? L(s.ok) : t('step.done');
    if (hintOv) ({ text, kind } = hintOv);
    else if (s.type === 'quiz') { if (quizState.right) { text = `<b>${t('quiz.right')}</b> ${L(s.why)}`; kind = 'ok'; } else if (quizState.wrong) { text = t('quiz.wrong'); kind = 'bad'; } }
    else if (s.type === 'wire' || s.type === 'place') text = done ? t('hint.placed') : pending ? t('hint.tapSecond') : t('hint.tapFirst'), kind = done ? 'ok' : 'info';
    else if (s.type === 'explore') text = done ? ok : t(s.want === 'rail' ? 'hint.exploreRail' : 'hint.exploreCol'), kind = done ? 'ok' : 'info';
    else if (s.type === 'measure') { text = done ? ok : !probes.red ? t('hint.measureRed') : !probes.black ? t('hint.measureBlack') : t('hint.measureWrong'); kind = done ? 'ok' : 'info'; }
    else if (s.type === 'do') { text = done ? ok : t('hint.do.' + s.act); kind = done ? 'ok' : 'info'; }
    E.hint.className = 'hint ' + kind + (text ? '' : ' empty');
    E.hint.innerHTML = text ? (kind === 'ok' ? ICON.check : '') + `<span>${bidi(text)}</span>` : '';
    E.bk.textContent = t('nav.back'); E.bk.disabled = stepIdx === 0;
    E.nx.textContent = last ? t('nav.finish') : t('nav.next'); E.nx.disabled = !stepDone();
    E.nx.classList.toggle('ready', stepDone());
  }

  function renderMeter() {
    E.meterBox.hidden = !meterOn;
    if (!meterOn) return;
    let body;
    if (probes.red && probes.black) body = `<bdi dir="ltr"><b class="mval">${fmt(cleanV(voltageBetween(sim, probes.red, probes.black)), 'V')}</b></bdi>`;
    else body = `<span class="mhint">${bidi(probes.red ? t('meter.one') : t('meter.hint'))}</span>`;
    E.meterBox.innerHTML = `<span class="mtitle"><i class="dot red"></i><i class="dot black"></i>${t('meter.title')}</span>${body}`;
  }

  function renderTruth() {
    const g = lesson.truth && getComp(circuit, lesson.truth);
    E.truthBox.hidden = !g;
    if (!g) return;
    const st = sim.comps[g.id] || {}, cur = st.inputs || [];
    const bit = b => (b ? 1 : 0);
    const chips = truthTable(g.props.fn, g.pins.length - 1).map(([ins, out]) => {
      const on = cur.length === ins.length && ins.every((v, k) => v === cur[k]);
      return `<span class="tchip${on ? ' on' : ''}${out ? ' hi' : ''}"><bdi dir="ltr">${ins.map(bit).join(' ')}<i>&rarr;</i><b>${bit(out)}</b></bdi></span>`;
    }).join('');
    const names = g.pins.length === 3 ? 'A B Y' : 'A Y';
    E.truthBox.innerHTML = `<span class="mtitle">${t('truth.title')} <bdi dir="ltr" class="tnames">${names}</bdi></span><span class="tchips">${chips}</span>`;
  }

  const SCOPE_COLORS = ['#ffc94d', '#6ee7a8'];
  function renderScope() {
    const sc = cur().scope;
    E.scopeBox.hidden = !sc;
    if (!sc) return;
    const W = 300, H = 100, win = sc.window || 4, T = circuit.t || 0, vmax = 10;
    const x = tt => ((tt - (T - win)) / win) * W, y = v => H - 6 - (Math.max(0, Math.min(vmax, v)) / vmax) * (H - 12);
    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t('scope.title'))}">`;
    for (const gv of [0, 5, 10]) svg += `<line x1="0" x2="${W}" y1="${y(gv)}" y2="${y(gv)}" class="sgrid"/><text x="3" y="${y(gv) - 2}" class="sgl">${gv} V</text>`;
    sc.holes.forEach((_, k) => {
      const pts = scopeData.map(d => `${x(d.t).toFixed(1)},${y(d.v[k]).toFixed(1)}`).join(' ');
      if (pts) svg += `<polyline points="${pts}" fill="none" stroke="${SCOPE_COLORS[k]}" stroke-width="2.2" stroke-linejoin="round"/>`;
    });
    svg += '</svg>';
    const legend = sc.holes.map((_, k) => `<i style="background:${SCOPE_COLORS[k]}"></i>${bidi(L(sc.names[k]))}`).join(' ');
    E.scopeBox.innerHTML = `<span class="mtitle">${t('scope.title')}</span><span class="slegend">${legend}</span>${svg}`;
  }

  function renderBanner() {
    E.banner.hidden = !sim.short;
    if (sim.short) E.banner.innerHTML = t('banner.short', { i: ltr(fmt(sim.comps.BAT.i, 'A')) });
  }

  // ----- component card -----
  function valueOf(c) {
    if (c.type === 'resistor') return fmt(c.props.r, 'Ω');
    if (c.type === 'battery') return fmt(c.props.v, 'V');
    if (c.type === 'pot') return fmt(c.props.r, 'Ω');
    if (c.type === 'gate') return c.props.fn.toUpperCase();
    if (c.type === 'transistor') return 'NPN';
    if (c.type === 'capacitor') return `${+(c.props.c * 1e6).toFixed(1)} µF`;
    return '';
  }
  function renderCard() {
    const c = selection && getComp(circuit, selection);
    if (!c || !cardOpen || complete) { E.card.hidden = true; cardKey = ''; return; }
    const s = cur(), mine = s.type === 'do' && s.comp === c.id;
    const flags = { setfn: mine && s.act === 'setfn', set: mine && s.act === 'set', flip: mine && s.act === 'flip', remove: mine && s.act === 'remove' };
    const key = [c.id, c.type, c.burned, flags.setfn, flags.set, flags.flip, flags.remove, getLang()].join('|');
    if (key !== cardKey) { buildCard(c, flags); cardKey = key; }
    E.card.hidden = false;
    const st = sim.comps[c.id] || { v: 0, i: 0, p: 0 };
    const R = cardRefs;
    R.v.textContent = fmt(cleanV(st.v), 'V'); R.i.textContent = fmt(st.i, 'A'); R.p.textContent = fmt(st.p, 'W');
    let status = '', bad = false;
    if (c.type === 'resistor' && st.hot) { status = t('card.hot'); bad = true; }
    else if (c.type === 'led') { status = c.burned ? t('card.burned') : st.lit ? t('card.lit') : t('card.off'); bad = c.burned; }
    else if (c.type === 'button') status = c.props.pressed ? t('card.pressed') : t('card.released');
    else if (c.type === 'switch') status = c.props.on ? t('card.swon') : t('card.swoff');
    else if (c.type === 'transistor') status = t('card.q.' + (st.state || 'off'), { ib: ltr(fmt(st.ib || 0, 'A')) });
    else if (c.type === 'diode') status = st.i > 1e-5 ? t('card.cond') : t('card.block');
    else if (c.type === 'gate') {
      const names = c.pins.length === 3 ? ['A', 'B'] : ['A'];
      status = t('card.gate', { ins: ltr((st.inputs || []).map((b, k) => `${names[k]}=${b ? 1 : 0}`).join(', ')), y: ltr(st.out ? 1 : 0) });
    }
    R.status.innerHTML = bidi(status); R.status.className = 'cstatus' + (bad ? ' bad' : '') + (status ? '' : ' empty');
    if (R.chips) R.chips.forEach(([b, v]) => b.classList.toggle('on', c.props.r === v));
    if (R.fnChips) R.fnChips.forEach(([b, v]) => b.classList.toggle('on', c.props.fn === v));
    if (R.slider) {
      if (document.activeElement !== R.slider) R.slider.value = c.props.pos;
      R.sliderVal.textContent = fmt(c.props.r * c.props.pos, 'Ω');
    }
  }
  function buildCard(c, flags) {
    E.card.innerHTML = '';
    const head = h('div', 'chead');
    const val = c.type === 'led' ? '' : valueOf(c);
    head.innerHTML = `<span class="cname"><b>${t('part.' + c.type)}</b> <span class="cid">${esc(c.id)}</span>${val ? ` <bdi dir="ltr" class="cval">${val}</bdi>` : ''}</span>`;
    const x = h('button', 'iconbtn sm', ICON.x); x.type = 'button'; x.setAttribute('aria-label', t('card.close'));
    x.addEventListener('click', () => { cardOpen = false; renderCard(); });
    head.append(x);
    const vals = h('div', 'cvals', `<div><span>${t('card.v')}</span><bdi dir="ltr" class="num v"></bdi></div><div><span>${t('card.i')}</span><bdi dir="ltr" class="num i"></bdi></div><div><span>${t('card.p')}</span><bdi dir="ltr" class="num p"></bdi></div>`);
    const status = h('div', 'cstatus');
    E.card.append(head, vals, status);
    cardRefs = { v: vals.querySelector('.v'), i: vals.querySelector('.i'), p: vals.querySelector('.p'), status, chips: null, fnChips: null, slider: null };
    const ctl = h('div', 'cctl');
    if (c.type === 'resistor') {
      cardRefs.chips = [];
      const row = h('div', 'chips');
      for (const v of CHIPS) {
        const b = h('button', 'chip'); b.type = 'button'; b.textContent = fmt(v, 'Ω'); b.dir = 'ltr'; b.disabled = !flags.set;
        b.addEventListener('click', () => { const cc = getComp(circuit, c.id); if (cc) { cc.props.r = v; recalc(); } });
        row.append(b); cardRefs.chips.push([b, v]);
      }
      ctl.append(row);
    }
    if (c.type === 'gate' && c.pins.length === 3) {
      cardRefs.fnChips = [];
      const row = h('div', 'chips');
      for (const v of GATE_FNS) {
        const b = h('button', 'chip'); b.type = 'button'; b.textContent = v.toUpperCase(); b.dir = 'ltr'; b.disabled = !flags.setfn;
        b.addEventListener('click', () => { const cc = getComp(circuit, c.id); if (cc) { cc.props.fn = v; recalc(); } });
        row.append(b); cardRefs.fnChips.push([b, v]);
      }
      ctl.append(row);
    }
    if (c.type === 'pot') {
      const wrap = h('label', 'slider', `<span>${bidi(t('card.slider'))} <bdi dir="ltr" class="num sv"></bdi></span>`);
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.01; inp.value = c.props.pos;
      inp.addEventListener('input', () => { const cc = getComp(circuit, c.id); if (cc) { cc.props.pos = +inp.value; recalc(); } });
      wrap.append(inp); ctl.append(wrap);
      cardRefs.slider = inp; cardRefs.sliderVal = wrap.querySelector('.sv');
    }
    const row2 = h('div', 'btnrow');
    const mkBtn = (label, enabled, fn, cls = '') => { const b = h('button', 'btn small ' + cls, label); b.type = 'button'; b.disabled = !enabled; b.addEventListener('click', fn); row2.append(b); };
    if (c.type === 'led' || c.type === 'diode') mkBtn(t('card.flip'), flags.flip, () => { const cc = getComp(circuit, c.id); if (cc) { cc.pins = [cc.pins[1], cc.pins[0]]; recalc(); } });
    if (c.burned) mkBtn(t('card.replace'), true, () => { const cc = getComp(circuit, c.id); if (cc) { cc.burned = false; recalc(); } }, 'primary');
    if (c.type !== 'battery' && c.type !== 'wire' || flags.remove) mkBtn(t('card.remove'), flags.remove, () => { removeComp(circuit, c.id); selection = null; recalc(); }, 'danger');
    if (row2.children.length) ctl.append(row2);
    if (ctl.children.length) E.card.append(ctl);
  }

  function renderComplete() {
    E.complete.hidden = !complete;
    if (!complete) return;
    const idx = lessons.findIndex(l => l.id === lesson.id), nxt = lessons[idx + 1];
    E.complete.innerHTML = `<div class="ccard"><div class="bigcheck">${ICON.check}</div><h2>${t('complete.title')}</h2><p>${esc(L(lesson.title))}</p>${nxt ? '' : `<p class="muted">${t('complete.last')}</p>`}<div class="btnrow"></div></div>`;
    const row = E.complete.querySelector('.btnrow');
    if (nxt) { const b = h('button', 'btn primary', t('complete.next')); b.type = 'button'; b.addEventListener('click', () => opts.onOpen?.(nxt.id)); row.append(b); }
    const hb = h('button', 'btn' + (nxt ? ' ghost' : ' primary'), t('complete.home')); hb.type = 'button'; hb.addEventListener('click', () => opts.onHome?.()); row.append(hb);
    (row.firstElementChild).focus();
  }

  function renderAll() {
    renderHeader(); renderPanel(); renderMeter(); renderTruth(); renderBanner(); renderCard(); renderBoard(); renderSchem(); renderComplete();
  }

  // ---------- wiring ----------
  E.back.addEventListener('click', () => opts.onHome?.());
  E.bk.addEventListener('click', back);
  E.nx.addEventListener('click', next);
  E.fitBtn.addEventListener('click', () => board.fit());
  E.meterBtn.addEventListener('click', () => { meterOn = !meterOn; if (!meterOn) probes = { red: null, black: null }; renderAll(); });
  E.schemToggle.addEventListener('click', () => {
    const c = rootEl.classList.toggle('schemclosed');
    E.schemToggle.setAttribute('aria-expanded', String(!c));
  });
  const off = onLang(() => { cardKey = ''; renderAll(); });

  const startStep = store.isDone(lesson.id) ? 0 : Math.min(store.getStep(lesson.id), steps.length - 1);
  enter(startStep);

  return {
    destroy() { cancelAnimationFrame(raf); clearTimeout(advanceTimer); clearTimeout(toastTimer); off(); board.destroy(); schem?.destroy(); rootEl.remove(); },
    // for tests and automation
    debug: { get step() { return stepIdx; }, get circuit() { return circuit; }, get sim() { return sim; } },
  };
}
