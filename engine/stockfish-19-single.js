// SPDX-License-Identifier: GPL-3.0-or-later
// Wrapper inteligente: usa el motor local si está disponible, o descarga Stockfish WASM automáticamente desde CDN si GitHub rechaza el archivo de 99MB.
try {
  importScripts('./stockfish-19-single.js');
} catch (e) {
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
}
