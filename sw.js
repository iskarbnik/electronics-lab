// Service worker: precache the app shell, then network first with cache fallback.
// Bump VERSION whenever any app file changes so old caches are dropped.
const VERSION = 'elab-v3';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/app.js',
  'js/i18n.js',
  'js/store.js',
  'js/ui/boardView.js',
  'js/ui/schematicView.js',
  'js/ui/lessonPlayer.js',
  'js/ui/svg.js',
  'js/sim/board.js',
  'js/sim/circuit.js',
  'js/sim/format.js',
  'js/sim/logic.js',
  'js/sim/solver.js',
  'js/lessons/common.js',
  'js/lessons/engine.js',
  'js/lessons/index.js',
  'js/lessons/l01-breadboard.js',
  'js/lessons/l02-first-circuit.js',
  'js/lessons/l03-voltage.js',
  'js/lessons/l04-ohms-law.js',
  'js/lessons/l05-led-resistor.js',
  'js/lessons/l06-power.js',
  'js/lessons/l07-button.js',
  'js/lessons/l08-series.js',
  'js/lessons/l09-parallel.js',
  'js/lessons/l10-pot.js',
  'js/lessons/l11-signals.js',
  'js/lessons/l12-not.js',
  'js/lessons/l13-and.js',
  'js/lessons/l14-or.js',
  'js/lessons/l15-more-gates.js',
  'js/lessons/l16-half-adder.js',
  'js/lessons/logic.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
