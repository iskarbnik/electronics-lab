// Router, home screen, language switch and service worker registration.
import { initLang, setLang, getLang, onLang, t, L, ltr } from './i18n.js';
import * as store from './store.js';
import { mountLesson } from './ui/lessonPlayer.js';

const app = document.getElementById('app');
let LESSONS = [];
let player = null;
let loadError = false;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SOON = ['soon.parts', 'soon.scope', 'soon.enc', 'soon.logic', 'soon.arduino', 'soon.sandbox', 'soon.esp'];

function langSwitch() {
  const cur = getLang();
  return `<div class="langsw" role="group" aria-label="${esc(t('lang.switch'))}">
    <button type="button" data-lang="he" lang="he" aria-pressed="${cur === 'he'}">עברית</button>
    <button type="button" data-lang="en" lang="en" aria-pressed="${cur === 'en'}">English</button></div>`;
}

function renderHome() {
  document.title = t('app.name');
  const total = LESSONS.length, n = LESSONS.filter(l => store.isDone(l.id)).length;
  const rows = LESSONS.map((l, k) => {
    const done = store.isDone(l.id), started = !done && store.getStep(l.id) > 0;
    return `<li><a class="lrow${done ? ' done' : ''}" href="#/lesson/${esc(l.id)}">
      <span class="num">${done ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr">' + esc(t('home.done')) + '</span>' : k + 1}</span>
      <span class="lbody"><b>${esc(L(l.title))}</b><span>${L(l.summary)}</span></span>
      ${started ? `<span class="badge">${esc(t('home.continue'))}</span>` : ''}
    </a></li>`;
  }).join('');
  app.innerHTML = `
  <div class="home">
    <header class="hhead">
      <div class="brand"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#ffb224" opacity=".18"/><path d="M20 38V26a12 12 0 0 1 24 0v12z" fill="#ffb224"/><rect x="17" y="38" width="30" height="5" rx="2" fill="#e69a12"/><path d="M26 43v14M38 43v10" stroke="#aab4c0" stroke-width="3" stroke-linecap="round"/></svg><h1>${esc(t('app.name'))}</h1></div>
      ${langSwitch()}
    </header>
    <p class="tagline">${esc(t('home.tagline'))}</p>
    <div class="progress"><div class="ptext">${t('home.progress', { n: ltr(n), m: ltr(total) })}</div>
      <div class="pbar big" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${total ? n / total * 100 : 0}%"></i></div></div>
    <h2>${esc(t('home.unit1'))}</h2>
    ${loadError ? `<p class="err">${esc(t('lesson.loadError'))}</p>` : `<ol class="lessons">${rows}</ol>`}
    <h2 class="dim">${esc(t('home.next'))}</h2>
    <ul class="soon">${SOON.map(k => `<li>${esc(t(k))}</li>`).join('')}</ul>
    <button class="btn ghost reset" type="button">${esc(t('home.reset'))}</button>
  </div>`;
  app.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  app.querySelector('.reset').addEventListener('click', confirmReset);
}

function confirmReset() {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><p>${esc(t('reset.confirm'))}</p>
    <div class="btnrow"><button class="btn danger yes" type="button">${esc(t('reset.yes'))}</button><button class="btn ghost no" type="button">${esc(t('reset.no'))}</button></div></div>`;
  document.body.append(m);
  const close = () => m.remove();
  m.querySelector('.no').addEventListener('click', close);
  m.querySelector('.yes').addEventListener('click', () => { store.resetProgress(); close(); renderHome(); });
  m.addEventListener('click', e => { if (e.target === m) close(); });
  m.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  m.querySelector('.no').focus();
}

function route() {
  if (player) { player.destroy(); player = null; }
  const m = /^#\/lesson\/([\w-]+)/.exec(location.hash);
  document.body.classList.toggle('in-lesson', !!m);
  if (!m) { app.innerHTML = ''; window.scrollTo(0, 0); return renderHome(); }
  const lesson = LESSONS.find(l => l.id === m[1]);
  if (!lesson) { location.hash = '#/'; return; }
  app.innerHTML = '';
  document.title = `${L(lesson.title)} | ${t('app.name')}`;
  player = mountLesson(app, lesson, {
    lessons: LESSONS,
    onHome: () => { location.hash = '#/'; },
    onOpen: id => { location.hash = '#/lesson/' + id; },
  });
}

onLang(() => {
  if (!player) renderHome();
  else { const l = LESSONS.find(x => location.hash.endsWith(x.id)); if (l) document.title = `${L(l.title)} | ${t('app.name')}`; }
});

async function start() {
  initLang();
  try { LESSONS = (await import('./lessons/index.js')).LESSONS; } catch (e) { console.error(e); loadError = true; }
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.__elab = { get player() { return player; } };
start();
