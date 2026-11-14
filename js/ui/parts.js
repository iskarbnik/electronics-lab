// Parts encyclopedia page: searchable cards.
import { L, getLang, onLang, t } from '../i18n.js';
import { PARTS } from '../parts.js';

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
import { bidi } from '../i18n.js';

export function mountParts(root, opts = {}) {
  const el = document.createElement('div');
  el.className = 'lab partspage';
  el.innerHTML = `<header class="lhead"><button class="iconbtn back" type="button">${BACK}</button><div class="ltitle"><h1></h1></div></header>
    <div class="partsbody"><input class="partsearch" type="search" autocomplete="off"><div class="partlist"></div></div>`;
  root.append(el);
  const list = el.querySelector('.partlist'), search = el.querySelector('.partsearch');
  function render() {
    el.querySelector('h1').textContent = t('parts.title');
    el.querySelector('.back').setAttribute('aria-label', t('lesson.homeAria'));
    search.placeholder = t('parts.search'); search.setAttribute('aria-label', t('parts.search'));
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    const hits = PARTS.filter(p => !q || (L(p.name) + ' ' + p.name.en + ' ' + L(p.what)).toLowerCase().includes(q));
    if (!hits.length) list.innerHTML = `<p class="muted">${esc(t('parts.none'))}</p>`;
    for (const p of hits) {
      const card = document.createElement('article');
      card.className = 'partcardx';
      card.innerHTML = `<svg class="partsym" viewBox="-4 -6 128 72" aria-hidden="true">${p.symbol}</svg>
        <div class="partinfo"><h2>${esc(L(p.name))}</h2><p>${bidi(L(p.what))}</p><p>${bidi(L(p.facts))}</p><p class="parttip"><b>${esc(t('parts.tip'))}</b> ${bidi(L(p.tip))}</p></div>`;
      list.append(card);
    }
  }
  search.addEventListener('input', render);
  el.querySelector('.back').addEventListener('click', () => opts.onHome?.());
  render();
  const off = onLang(render);
  return { destroy() { off(); el.remove(); } };
}
