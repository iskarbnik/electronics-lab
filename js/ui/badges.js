// Badges page.
import { t, L, onLang } from '../i18n.js';
import { BADGES } from '../badges.js';

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.6 3.1 1.2-6.3L3 9.4l6.3-.8z" fill="currentColor"/></svg>';

// ctx: badge context (see badges.js makeCtx)
export function mountBadges(root, opts = {}) {
  const el = document.createElement('div');
  el.className = 'lab badgespage';
  el.innerHTML = `<header class="lhead"><button class="iconbtn back" type="button">${BACK}</button><div class="ltitle"><h1></h1><span class="lstep"></span></div></header><div class="toolsbody"><div class="badgegrid"></div></div>`;
  root.append(el);
  function render() {
    el.querySelector('h1').textContent = t('badges.title');
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
    const ctx = opts.makeCtx();
    const got = BADGES.map(b => b.test(ctx));
    el.querySelector('.lstep').textContent = t('badges.sum', { n: got.filter(Boolean).length, m: BADGES.length });
    el.querySelector('.badgegrid').innerHTML = BADGES.map((b, k) => `<article class="badge${got[k] ? ' on' : ''}"><div class="bicon">${STAR}</div><div><h2>${esc(L(b.title))}</h2><p>${esc(L(b.desc))}</p>${got[k] ? '' : `<span class="muted">${esc(t('badges.locked'))}</span>`}</div></article>`).join('');
  }
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  render();
  const off = onLang(render);
  return { destroy() { off(); el.remove(); } };
}
