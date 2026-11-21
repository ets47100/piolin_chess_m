// SPDX-License-Identifier: GPL-3.0-or-later
const CACHE_NAME = 'piolin-chess-pwa-v11';
const ENGINE_CACHE = 'piolin-engine-v1';
const ENGINE_WASM = 'engine/full/stockfish-19.wasm';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './chessground.css',
  './app.js',
  './piolin-extras.js',
  './pwa-install.js',
  './favicon.svg',
  './manifest.json',
  './piolin.png',
  './piolin-512.png',
  './licencias.html',
  './engine/stockfish-19-lite-single.js',
  './engine/stockfish-19-lite-single.wasm',
  './engine/full/stockfish-19.js',
  './pieces/wP.svg', './pieces/wN.svg', './pieces/wB.svg', './pieces/wR.svg', './pieces/wQ.svg', './pieces/wK.svg',
  './pieces/bP.svg', './pieces/bN.svg', './pieces/bB.svg', './pieces/bR.svg', './pieces/bQ.svg', './pieces/bK.svg'
];

const APP_ASSET_CACHE = CACHE_NAME + '-study';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_ASSET_CACHE).then((cache) => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith('piolin-chess-pwa-') && k !== APP_ASSET_CACHE && k !== ENGINE_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Stockfish con varios hilos necesita SharedArrayBuffer, que exige aislamiento de origen.
// GitHub Pages no permite fijar cabeceras, así que las añadimos aquí.
function isolate(response) {
  if (!response || response.status === 0 || response.status === 206 || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function handle(request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/' + ENGINE_WASM)) {
    const engine = await caches.open(ENGINE_CACHE);
    const hit = await engine.match(url.pathname);
    if (hit) return isolate(hit);
  }
  const cached = await caches.match(request, { ignoreSearch: true });
  return isolate(cached || await fetch(request));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
  event.respondWith(handle(request));
});
