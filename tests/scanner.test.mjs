// SPDX-License-Identifier: GPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { clockData, phaseOf, scannerSummary } from '../src/scanner.js';
import { analyzeStudyGame, studyGame } from '../src/player-study.js';
import { importText } from '../src/model.js';
import { themePuzzles } from '../src/training-puzzles.js';

const pgn = `[Event "Rapid"]
[White "Ana"]
[Black "Luis"]
[Result "0-1"]
[TimeControl "300+2"]

1. e4 {[%clk 0:04:59]} e5 {[%clk 0:04:57]} 2. Nf3 {[%clk 0:00:58]} Nc6
3. Bc4 {[%clk 0:00:53]} Nf6 0-1`;

test('reconstruye los tiempos por color usando el incremento y tolera relojes ausentes', () => {
  const doc = importText(pgn);
  const chess = new Chess(doc.initialFen);
  const moves = doc.moves.map(san => chess.move(san));
  assert.deepEqual(clockData(pgn, moves, doc.initialFen).map(item => item.spent), [3, 5, 243, null, 7, null]);
  assert.equal(phaseOf(new Chess()), 'opening');
  assert.equal(phaseOf(new Chess('8/5k2/8/4P3/4K3/8/8/8 w - - 0 35')), 'ending');
});

test('el escaneo conserva la evaluación de cada jugada y confirma los errores destacados', async () => {
  const doc = importText(pgn);
  const game = { ...studyGame(doc), colors: ['w'] };
  const analyze = async (fen, depth) => {
    const chess = new Chess(fen);
    const afterNf3 = chess.get('f3')?.type === 'n' && chess.turn() === 'b' && chess.moveNumber() === 2;
    return { bestMove: chess.moves({ verbose: true })[0].lan,
      evaluation: { bound: 'exact', type: 'cp', value: afterNf3 ? 200 : 0, depth, pv: [] } };
  };
  const result = await analyzeStudyGame(game, analyze, () => {}, () => false);
  assert.equal(result.metrics.length, 3);
  assert.deepEqual(result.metrics.map(item => [item.before, item.after]), [[0,0], [0,-200], [0,0]]);
  assert.equal(result.findings[0].loss, 200);
  assert.equal(scannerSummary([{ game, ...result }]).bank.length, 1);
  assert.equal(await analyzeStudyGame(game, analyze, () => {}, () => true), null);
});

test('evidencia insuficiente deja ejes sin nota y los puzles locales tienen líneas legales', () => {
  const empty = scannerSummary([]);
  assert.ok(empty.radar.every(axis => axis.score === null));
  for (const list of Object.values(themePuzzles)) {
    for (const [, fen, sequence] of list) {
      const chess = new Chess(fen);
      for (const uci of sequence.split(' ')) {
        assert.ok(chess.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] }));
      }
    }
  }
});
