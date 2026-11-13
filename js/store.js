// Progress and settings in localStorage. Every access is guarded so the app also works
// when storage is blocked (private mode, cleared site data): state then lives in memory only.

const KEY = 'elab.v1';
let mem = null;

function fresh() { return { lang: null, done: {}, step: {} }; }

function clean(o) {
  const s = fresh();
  if (o && typeof o === 'object') {
    if (o.lang === 'he' || o.lang === 'en') s.lang = o.lang;
    if (o.done && typeof o.done === 'object') for (const k of Object.keys(o.done)) if (o.done[k]) s.done[k] = true;
    if (o.step && typeof o.step === 'object') for (const k of Object.keys(o.step)) if (Number.isInteger(o.step[k]) && o.step[k] >= 0) s.step[k] = o.step[k];
  }
  return s;
}

export function load() {
  try {
    const raw = globalThis.localStorage.getItem(KEY);
    if (raw) { mem = clean(JSON.parse(raw)); return mem; }
  } catch { /* blocked or corrupt */ }
  if (!mem) mem = fresh();
  return mem;
}

function save(s) {
  mem = s;
  try { globalThis.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export const getLang = () => load().lang;
export function setLang(lang) { const s = load(); s.lang = lang; save(s); }
export const isDone = id => !!load().done[id];
export const doneCount = ids => ids.filter(isDone).length;
export function markDone(id) { const s = load(); s.done[id] = true; delete s.step[id]; save(s); }
export const getStep = id => load().step[id] || 0;
export function setStep(id, n) { const s = load(); s.step[id] = n; save(s); }
export function resetProgress() { const s = load(); s.done = {}; s.step = {}; save(s); }
