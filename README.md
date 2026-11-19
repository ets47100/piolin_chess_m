# Piolín Chess M

Aplicación web (PWA) de ajedrez con análisis Stockfish, biblioteca de partidas, importación PGN/chess.com/Lichess y modo contra la máquina.

Demo: https://ets47100.github.io/piolin_chess_m/

## Estructura
- `index.html`, `style.css`, `chessground.css`: interfaz.
- `app.js`: bundle generado (Chessground + chess.js + lógica); sin fuentes en el repo todavía.
- `piolin-extras.js`: modo contra máquina, relojes y auditoría GM.
- `engine/`: carga de Stockfish (WASM, vía CDN).
- `sw.js`, `manifest.json`: PWA offline.

## Hoja de ruta
Repertorios → entrenamiento → repetición espaciada y estadísticas → ejercicios automáticos desde errores.

Licencia GPL-3.0 (ver `licenses/`).
