// The quiz: ten random questions drawn from every lesson.
import { t, L, ltr, bidi, onLang } from '../i18n.js';
import { buildBank, pick, shuffleOptions, percent } from '../quizbank.js';
import * as store from '../store.js';

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const N = 10;

export function mountQuiz(root, opts = {}) {
  const bank = buildBank(opts.lessonLists || []);
  const rand = opts.rand || Math.random;
  const el = document.createElement('div');
  el.className = 'lab quizpage';
  el.innerHTML = `<header class="lhead"><button class="iconbtn back" type="button">${BACK}</button><div class="ltitle"><h1></h1></div></header><div class="toolsbody quizbody"></div>`;
  root.append(el);
  const body = el.querySelector('.quizbody');
  let qs = null, idx = 0, right = 0, picked = -1, finished = false;

  function render() {
    el.querySelector('h1').textContent = t('quiz.title');
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
    const best = store.getFlag('quizBest');
    if (!qs) {
      body.innerHTML = `<section class="toolcard"><p>${t('quiz.sum')}</p>${best !== null ? `<p><b>${t('quiz.best', { p: ltr(best + '%') })}</b></p>` : ''}<button class="btn primary startb" type="button">${t('quiz.start')}</button></section>`;
      body.querySelector('.startb').addEventListener('click', start);
      return;
    }
    if (finished) {
      const p = percent(right, qs.length);
      body.innerHTML = `<section class="toolcard"><div class="bigcheck">${CHECK}</div><h2>${t('quiz.result', { r: ltr(right), m: ltr(qs.length), p: ltr(p + '%') })}</h2><p>${t('quiz.best', { p: ltr((store.getFlag('quizBest') ?? p) + '%') })}</p><div class="btnrow"><button class="btn primary againb" type="button">${t('quiz.again')}</button><button class="btn ghost homeb" type="button">${t('complete.home')}</button></div></section>`;
      body.querySelector('.againb').addEventListener('click', start);
      body.querySelector('.homeb').addEventListener('click', () => opts.onHome?.());
      return;
    }
    const q = qs[idx], answered = picked >= 0;
    body.innerHTML = `<section class="toolcard"><p class="muted">${t('quiz.q', { n: ltr(idx + 1), m: ltr(qs.length) })}</p><div class="gtext">${bidi(L(q.text))}</div>
      <div class="gquiz">${q.options.map((o, k) => `<button type="button" class="opt${answered && k === q.answer ? ' right' : ''}${answered && picked === k && k !== q.answer ? ' wrong' : ''}" data-k="${k}"${answered ? ' disabled' : ''}><span>${bidi(L(o))}</span></button>`).join('')}</div>
      ${answered ? `<div class="hint ${picked === q.answer ? 'ok' : 'bad'}">${picked === q.answer ? CHECK : ''}<span><b>${t(picked === q.answer ? 'quiz.right' : 'quiz.wrong')}</b> ${bidi(L(q.why))}</span></div><div class="btnrow"><button class="btn primary nextb" type="button">${t(idx === qs.length - 1 ? 'nav.finish' : 'nav.next')}</button></div>` : ''}</section>`;
    body.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { picked = +b.dataset.k; if (picked === q.answer) right++; render(); }));
    body.querySelector('.nextb')?.addEventListener('click', () => {
      picked = -1;
      if (idx === qs.length - 1) { finished = true; const p = percent(right, qs.length); if ((store.getFlag('quizBest') ?? -1) < p) store.setFlag('quizBest', p); }
      else idx++;
      render();
    });
  }
  function start() { qs = pick(bank, N, rand).map(q => shuffleOptions(q, rand)); idx = 0; right = 0; picked = -1; finished = false; render(); }
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  render();
  const off = onLang(render);
  return { destroy() { off(); el.remove(); }, debug: { get questions() { return qs; }, start } };
}
