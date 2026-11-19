// SPDX-License-Identifier: GPL-3.0-or-later
const CACHE_NAME = 'piolin-chess-pwa-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './chessground.css',
  './app.js',
  './piolin-extras.js',
  './favicon.svg',
  './manifest.json',
  './licencias.html',
  './engine/stockfish-19-single.js',
  './pieces/wP.svg', './pieces/wN.svg', './pieces/wB.svg', './pieces/wR.svg', './pieces/wQ.svg', './pieces/wK.svg',
  './pieces/bP.svg', './pieces/bN.svg', './pieces/bB.svg', './pieces/bR.svg', './pieces/bQ.svg', './pieces/bK.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
