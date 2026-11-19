# Piolín Chess M

Aplicación web (PWA) de ajedrez con análisis Stockfish, biblioteca de partidas, importación PGN/chess.com/Lichess y modo contra la máquina.

Demo: https://ets47100.github.io/piolin_chess_m/

## Estructura
- `index.html`, `style.css`, `chessground.css`: interfaz.
- `src/`: fuentes (`app.js`, `model.js`, `storage.js`, `engine.js`).
- `app.js`: bundle generado con esbuild; no editar a mano.
- `piolin-extras.js`: modo contra máquina, relojes y auditoría GM.
- `engine/`: Stockfish 19 lite (WASM, un solo hilo, incluido en el repo).
- `sw.js`, `manifest.json`: PWA offline.

## Desarrollo
```
npm install
npm run build   # genera app.js y app.js.map
```

## Hoja de ruta
Repertorios → entrenamiento → repetición espaciada y estadísticas → ejercicios automáticos desde errores.

Licencia GPL-3.0 (ver `licenses/`).
