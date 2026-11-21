// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { DEFAULT_FEN, pgnHeader } from './model.js';

export const phases = { opening: 'Apertura', middle: 'Medio juego', ending: 'Final' };
export const themes = {
  mate: 'Mate', mateIn2: 'Mate en dos', hangingPiece: 'Pieza colgada', pin: 'Clavada',
  pawnEndgame: 'Final de peones', rookEndgame: 'Final de torres', kingsideAttack: 'Ataque al rey',
  opening: 'Apertura', endgame: 'Final', middlegame: 'Medio juego', short: 'Táctica corta',
};

export function phaseOf(chess) {
  const board = chess.board().flat().filter(Boolean);
  const material = board.reduce((sum, piece) => sum + ({ q: 4, r: 2, b: 1, n: 1 }[piece.type] || 0), 0);
  if (material <= 8) return 'ending';
  const undeveloped = board.filter(piece => ['n', 'b'].includes(piece.type) &&
    piece.square[1] === (piece.color === 'w' ? '1' : '8')).length;
  return chess.moveNumber() <= 12 && undeveloped >= 3 ? 'opening' : 'middle';
}

export function clockData(pgn, moves, initialFen) {
  const after = new Map();
  try {
    const chess = new Chess();
    if (!pgn) return [];
    chess.loadPgn(pgn);
    for (const { fen, comment } of chess.getComments()) {
      const match = comment.match(/\[%clk\s+(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)\]/);
      if (match) after.set(fen, Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    }
  } catch { return []; }
  const control = pgnHeader(pgn, 'TimeControl').match(/^(\d+)(?:\+(\d+))?$/);
  const increment = control ? Number(control[2] || 0) : null;
  const starting = initialFen === DEFAULT_FEN;
  const previous = { w: control && starting ? Number(control[1]) : null, b: control && starting ? Number(control[1]) : null };
  return moves.map(move => {
    const clock = after.get(move.after) ?? null;
    const old = previous[move.color];
    const spent = clock !== null && old !== null && increment !== null ? old + increment - clock : null;
    previous[move.color] = clock;
    return { clock, spent: spent !== null && spent >= -0.2 ? Math.max(0, spent) : null, beforeClock: old };
  });
}

function pinned(chess, square) {
  const piece = chess.get(square);
  if (!piece || piece.type === 'k') return false;
  const king = chess.board().flat().find(item => item?.type === 'k' && item.color === piece.color);
  const dx = square.charCodeAt(0) - king.square.charCodeAt(0);
  const dy = Number(square[1]) - Number(king.square[1]);
  if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return false;
  let x = king.square.charCodeAt(0) + Math.sign(dx), y = Number(king.square[1]) + Math.sign(dy);
  let passed = false;
  for (; x >= 97 && x <= 104 && y >= 1 && y <= 8; x += Math.sign(dx), y += Math.sign(dy)) {
    const target = String.fromCharCode(x) + y;
    if (target === square) { passed = true; continue; }
    const blocker = chess.get(target);
    if (!blocker) continue;
    return passed && blocker.color !== piece.color && (dx && dy ? 'bq' : 'rq').includes(blocker.type);
  }
  return false;
}

export function exerciseTheme(move, before, after, phase, kind) {
  const chess = new Chess(move.before);
  const types = chess.board().flat().filter(Boolean).map(piece => piece.type);
  if (before.evaluation.type === 'mate' && before.evaluation.value === 2) return 'mateIn2';
  if (kind === 'mate') return 'mate';
  if (phase === 'ending' && types.every(type => 'pk'.includes(type))) return 'pawnEndgame';
  if (phase === 'ending' && types.every(type => 'prk'.includes(type))) return 'rookEndgame';
  const reply = after.bestMove;
  if (reply) {
    const position = new Chess(move.after);
    const target = reply.slice(2, 4);
    if (kind === 'material' && position.get(target) && pinned(position, target)) return 'pin';
    if (kind === 'material' && position.get(target)?.color === move.color && /[nbrq]/.test(position.get(target).type)) return 'hangingPiece';
  }
  return kind === 'king' ? 'kingsideAttack' : { opening: 'opening', middle: 'middlegame', ending: 'endgame' }[phase];
}

const winChance = score => 1 / (1 + Math.exp(-0.0037 * score));
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const accuracy = values => values.length >= 5 ? Math.round(average(values.map(item =>
  100 * Math.max(0, 1 - Math.max(0, winChance(item.before) - winChance(item.after)))))) : null;

export function scannerSummary(records) {
  const moves = records.flatMap(record => record.metrics || []).filter(item =>
    Number.isFinite(item.before) && Number.isFinite(item.after));
  const findings = records.flatMap(record => record.findings || []);
  const phaseMap = Object.keys(phases).map(key => {
    const selected = moves.filter(item => item.phase === key);
    return { key, count: selected.length, score: accuracy(selected), swings: 0 };
  });
  for (const { metrics = [] } of records) {
    let critical;
    for (let index = 0; index < metrics.length; index++) {
      const item = metrics[index], following = metrics.slice(index + 1, index + 4);
      const loss = item.before - item.after;
      if (loss < 100 || following.length < 2 ||
          !following.every(next => next.before <= item.before - loss / 2)) continue;
      if (!critical || loss > critical.before - critical.after) critical = item;
    }
    if (critical) phaseMap.find(row => row.key === critical.phase).swings++;
  }
  const tactical = moves.filter(item => item.tactical || item.after <= item.before - 150);
  const defense = moves.filter(item => item.before <= -75 && item.before >= -400);
  const timed = moves.filter(item => item.clock !== null && item.clock !== undefined);
  const low = timed.filter(item => item.beforeClock != null && item.beforeClock < 60);
  const over = timed.filter(item => item.beforeClock >= 60);
  const clockScore = accuracy(low), reference = accuracy(over);
  const radar = [
    { name: 'Apertura', ...phaseMap[0] },
    { name: 'Táctica', count: tactical.length, score: accuracy(tactical) },
    { name: 'Finales', ...phaseMap[2] },
    { name: 'Tiempo', count: low.length, score: clockScore },
    { name: 'Defensa', count: defense.length, score: accuracy(defense) },
  ];
  const clockGames = records.filter(record => record.metrics?.some(item => item.clock != null));
  const outcomes = clockGames.flatMap(record => {
    const sides = new Set(record.metrics.filter(item => item.clock < 60 && item.clock != null).map(item => item.side));
    const result = pgnHeader(record.game.doc.sourcePgn || '', 'Result');
    if (!['1-0', '0-1', '1/2-1/2'].includes(result) || sides.size !== 1) return [];
    return [result === ([...sides][0] === 'w' ? '0-1' : '1-0')];
  });
  const bank = [...new Map(findings.filter(event => event.loss >= 150).sort((a,b) => b.loss - a.loss)
    .map(event => [event.fen.split(' ').slice(0, 4).join(' '), event]).reverse()).values()]
    .sort((a,b) => b.loss - a.loss);
  return { radar, phaseMap, bank, clockGames: clockGames.length, clockScore, reference,
    lowCount: low.length, referenceCount: over.length, knownLowResults: outcomes.length, lowLosses: outcomes.filter(Boolean).length };
}
