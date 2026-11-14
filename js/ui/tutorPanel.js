// The tutor overlay: a live diagnosis of the circuit plus a small question box.
import { t, L, bidi, onLang } from '../i18n.js';
import { diagnose, answer } from '../tutor.js';
import * as store from '../store.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

// getState() -> { circuit, sim }. host is a positioned element the panel covers the bottom of.
export function createTutor(host, getState) {
  const el = document.createElement('div');
  el.className = 'tutor';
  el.hidden = true;
  el.innerHTML = `<div class="thead"><b class="ttitle"></b><button class="iconbtn sm tclose" type="button">${X}</button></div>
    <div class="tbody"><h3 class="tsee"></h3><ul class="tdiag"></ul><h3 class="task"></h3>
    <form class="tform"><input class="tq" type="text" autocomplete="off"><button class="btn small tsend" type="submit"></button></form>
    <div class="tans" aria-live="polite"></div><p class="tnote"></p></div>`;
  host.append(el);
  const q = s => el.querySelector(s);
  let asked = '';
  function render() {
    q('.ttitle').textContent = t('tutor.title'); q('.tsee').textContent = t('tutor.check'); q('.task').textContent = t('tutor.ask');
    q('.tq').placeholder = t('tutor.ph'); q('.tq').setAttribute('aria-label', t('tutor.ask')); q('.tsend').textContent = t('tutor.send');
    q('.tnote').textContent = t('tutor.note'); q('.tclose').setAttribute('aria-label', t('card.close'));
    const { circuit, sim } = getState();
    q('.tdiag').innerHTML = diagnose(circuit, sim).map(d => `<li class="${d.sev}">${bidi(L(d.text))}</li>`).join('');
    const a = asked ? answer(asked) : null;
    q('.tans').innerHTML = a === null ? '' : a.length ? a.map(x => `<p>${bidi(L(x))}</p>`).join('') : `<p class="muted">${esc(t('tutor.none'))}</p>`;
  }
  q('.tform').addEventListener('submit', e => { e.preventDefault(); asked = q('.tq').value.trim(); store.setFlag('tutor', true); render(); });
  q('.tclose').addEventListener('click', () => { el.hidden = true; });
  const off = onLang(() => { if (!el.hidden) render(); });
  return {
    toggle() { el.hidden = !el.hidden; if (!el.hidden) { store.setFlag('tutor', true); render(); } },
    refresh() { if (!el.hidden) render(); },
    get open() { return !el.hidden; },
    destroy() { off(); el.remove(); },
  };
}
