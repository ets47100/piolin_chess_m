// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { pgnHeader, pvToSan } from './model.js';
import { clockData, exerciseTheme, phaseOf } from './scanner.js';

export const rhythms = {
  bullet: 'Bala', blitz: 'Blitz', rapid: 'Rápidas', classical: 'Clásicas',
  daily: 'Por correspondencia', unknown: 'Ritmo sin identificar',
};

function rhythmFor(pgn) {
  const explicit = pgnHeader(pgn, 'PiolinRhythm');
  if (explicit !== 'unknown' && Object.hasOwn(rhythms, explicit)) return explicit;
  const event = pgnHeader(pgn, 'Event').toLowerCase();
  for (const [key, pattern] of Object.entries({
    bullet: /\bbullet\b/, blitz: /\bblitz\b/, rapid: /\brapid\b/,
    classical: /\bclassical\b/, daily: /\b(daily|correspondence)\b/,
  })) {
    if (pattern.test(event)) return key;
  }
  const control = pgnHeader(pgn, 'TimeControl');
  if (/^1\/\d+$/.test(control)) return 'daily';
  const seconds = control.match(/^(\d+)(?:\+(\d+))?$/);
  if (!seconds) return 'unknown';
  const base = Number(seconds[1]), increment = Number(seconds[2] || 0);
  const chesscom = /chess\.com/i.test(pgnHeader(pgn, 'Site'));
  const estimated = base + 40 * increment;
  if (!estimated) return 'unknown';
  if (estimated < 180) return 'bullet';
  if (estimated < (chesscom ? 600 : 480)) return 'blitz';
  if (chesscom) return 'rapid';
  if (estimated < 1500) return 'rapid';
  return 'classical';
}

export const playerKey = name => name.toLowerCase();

export function studyGame(doc) {
  const pgn = doc.sourcePgn || '';
  const variant = pgnHeader(pgn, 'Variant').toLowerCase();
  if (variant && !['standard', 'chess', 'from position'].includes(variant)) return null;
  const white = pgnHeader(pgn, 'White'), black = pgnHeader(pgn, 'Black');
  if (!white || !black || white === '?' || black === '?' || !doc.moves.length) return null;
  const date = [pgnHeader(pgn, 'UTCDate'), pgnHeader(pgn, 'Date')]
    .find(value => /^\d{4}\.\d{2}\.\d{2}$/.test(value)) || '';
  const time = [pgnHeader(pgn, 'UTCTime'), pgnHeader(pgn, 'Time')]
    .find(value => /^\d{2}:\d{2}:\d{2}$/.test(value)) || '';
  const rhythm = rhythmFor(pgn);
  return {
    doc, white, black, date, time, rhythm,
    key: JSON.stringify([playerKey(white), playerKey(black), date, time, doc.initialFen, doc.moves]),
  };
}

export function selectGames(games, player, color, rhythm, limit) {
  const selected = [];
  const seen = new Set();
  for (const game of games) {
    const white = playerKey(game.white) === player;
    const black = playerKey(game.black) === player;
    const colors = [white && color !== 'b' && 'w', black && color !== 'w' && 'b'].filter(Boolean);
    if (!colors.length || (rhythm !== 'all' && rhythm !== game.rhythm) || seen.has(game.key)) continue;
    seen.add(game.key);
    selected.push({ ...game, colors });
  }
  selected.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) ||
    b.doc.updatedAt.localeCompare(a.doc.updatedAt));
  return selected.slice(0, limit);
}

export const lessons = {
  mate: {
    title: 'Táctica · Mate forzado',
    tip: 'Antes de decidir, calcula los jaques de ambos bandos. Para cada jaque, comprueba si se puede capturar la pieza, interponer otra o mover el rey.',
  },
  material: {
    title: 'Táctica · Pérdida de material',
    tip: 'Después de imaginar tu jugada, busca la captura más fuerte del rival. Cuenta qué material queda al final de la secuencia e identifica las piezas que quedan sin defensa.',
  },
  king: {
    title: 'Estrategia · Rey en el centro al abrirse una columna central',
    tip: 'Antes de cambiar peones centrales, compara qué rey queda más expuesto y quién puede ocupar primero la columna. Considera asegurar tu rey antes de abrir el juego.',
  },
  development: {
    title: 'Estrategia · Desarrollo pendiente en la apertura',
    tip: 'Compara tu jugada con una que saque una pieza menor y mejore la coordinación. Pregúntate qué amenaza concreta justifica aplazar el desarrollo.',
  },
  other: {
    title: 'Otras decisiones para revisar',
    tip: 'Busca dos jugadas candidatas y la mejor respuesta rival a cada una. Compara tu cálculo con la variante del motor para localizar el punto en que cambió la posición.',
  },
};

const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const material = (chess, color) => chess.board().flat().reduce((sum, piece) =>
  sum + (piece ? value[piece.type] * (piece.color === color ? 1 : -1) : 0), 0);

function playLine(fen, line) {
  const chess = new Chess(fen);
  for (const move of line) {
    try {
      chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
    } catch {
      break;
    }
  }
  return chess;
}

function score(result, sideToMove, player) {
  const ev = result?.evaluation;
  if (!ev || ev.bound !== 'exact') return null;
  const numeric = ev.type === 'mate' ? (ev.value > 0 ? 1000 : -1000) : Math.max(-900, Math.min(900, ev.value));
  return numeric === 0 || sideToMove === player ? numeric : -numeric;
}

function lossOf(before, after, player) {
  const first = score(before, player, player);
  const second = score(after, player === 'w' ? 'b' : 'w', player);
  return first === null || second === null ? 0 : first - second;
}

function classify(move, before, after) {
  const color = move.color;
  const best = playLine(move.before, before.evaluation.pv.slice(0, 4));
  const reply = playLine(move.after, after.evaluation.pv.slice(0, 3));
  if (before.evaluation.type !== after.evaluation.type ||
      (before.evaluation.type === 'mate' && Math.sign(before.evaluation.value) === Math.sign(after.evaluation.value))) {
    if (before.evaluation.type === 'mate' || after.evaluation.type === 'mate') return 'mate';
  }
  const initial = new Chess(move.before);
  if (material(best, color) - material(reply, color) >= 2 &&
      material(initial, color) - material(reply, color) >= 2) return 'material';
  const played = new Chess(move.after);
  const king = played.board().flat().find(piece => piece?.type === 'k' && piece.color === color);
  const openFiles = chess => {
    const pawnFiles = new Set(chess.board().flat().filter(piece => piece?.type === 'p')
      .map(piece => piece.square[0]));
    return Number(!pawnFiles.has('d')) + Number(!pawnFiles.has('e'));
  };
  if (move.piece === 'p' && move.captured && ['d','e'].includes(king?.square[0]) &&
      openFiles(played) > openFiles(initial)) return 'king';
  if (initial.moveNumber() <= 12) {
    const rank = color === 'w' ? '1' : '8';
    const waiting = ['b','c','f','g'].filter(file => {
      const piece = initial.get(file + rank);
      return piece?.color === color && ['n','b'].includes(piece.type);
    });
    if (waiting.length >= 2 && waiting.includes(before.bestMove?.[0]) &&
        before.bestMove[1] === rank && !waiting.some(file => move.from === file + rank)) return 'development';
  }
  return 'other';
}

export async function analyzeStudyGame(game, analyze, onProgress, isPaused) {
  const chess = new Chess(game.doc.initialFen);
  const moves = game.doc.moves.map(san => chess.move(san));
  const scans = new Map();
  const evaluate = async (fen, depth) => {
    const key = depth + ' ' + fen;
    if (!scans.has(key)) {
      const position = new Chess(fen);
      const evaluation = position.isCheckmate()
        ? { type: 'mate', value: 0, bound: 'exact', pv: [] }
        : position.isStalemate() || position.isInsufficientMaterial()
          ? { type: 'cp', value: 0, bound: 'exact', pv: [] }
          : null;
      scans.set(key, evaluation ? { evaluation, bestMove: null } : await analyze(fen, depth));
    }
    return scans.get(key);
  };
  const findings = [], metrics = [];
  const clocks = clockData(game.doc.sourcePgn, moves, game.doc.initialFen);
  for (let i = 0; i < moves.length; i++) {
    if (isPaused()) return null;
    const move = moves[i];
    if (!game.colors.includes(move.color)) continue;
    onProgress(i + 1, moves.length);
    let before = await evaluate(move.before, 8);
    let after = await evaluate(move.after, 8);
    if (lossOf(before, after, move.color) >= 110) {
      before = await evaluate(move.before, 12);
      after = await evaluate(move.after, 12);
    }
    const position = new Chess(move.before), phase = phaseOf(position);
    const pre = score(before, move.color, move.color);
    const post = score(after, move.color === 'w' ? 'b' : 'w', move.color);
    if (pre === null || post === null) continue;
    const loss = pre - post;
    const clock = clocks[i] || { clock: null, beforeClock: null, spent: null };
    metrics.push({ ply: i + 1, side: move.color, before: pre, after: post, phase, ...clock,
      tactical: before.evaluation.type === 'mate' || Boolean(before.bestMove &&
        (position.get(before.bestMove.slice(2, 4)) || position.inCheck())) });
    if (loss < 125 || !before.bestMove) continue;
    const kind = classify(move, before, after);
    findings.push({
      kind, phase, before: pre, theme: exerciseTheme(move, before, after, phase, kind),
      game: game.doc.title, ply: i + 1, loss,
      move: move.san, fen: move.before, color: move.color, best: before.bestMove,
      solution: pvToSan(move.before, before.evaluation.pv),
      replyFen: move.after, replyBest: after.bestMove,
      reply: pvToSan(move.after, after.evaluation.pv),
    });
  }
  return { findings, metrics };
}

export function summarize(records) {
  const groups = new Map();
  for (const record of records) {
    const rhythm = record.game.rhythm;
    if (!groups.has(rhythm)) groups.set(rhythm, []);
    groups.get(rhythm).push(record);
  }
  return [...groups].map(([rhythm, games]) => {
    const patterns = Object.keys(lessons).map(kind => {
      const examples = games.flatMap(game => game.findings.filter(event => event.kind === kind));
      const has = game => game.findings.some(event => event.kind === kind);
      const recent = games.slice(0, 10), prior = games.slice(10);
      const ranked = [...examples].sort((a, b) => b.loss - a.loss);
      const distinct = new Map();
      for (const example of ranked) {
        const position = example.fen.split(' ').slice(0, 4).join(' ');
        if (!distinct.has(position)) distinct.set(position, example);
        if (distinct.size === 3) break;
      }
      return {
        kind, count: games.filter(has).length, total: examples.length, examples: [...distinct.values()],
        impact: examples.reduce((sum, example) => sum + example.loss, 0),
        recent: recent.filter(has).length, prior: prior.filter(has).length, priorTotal: prior.length,
      };
    }).filter(pattern => pattern.total).sort((a, b) => b.count - a.count || b.impact - a.impact);
    return { rhythm, count: games.length, patterns: patterns.slice(0, 3),
      chronological: games.every(({ game }) => Boolean(game.date)) };
  });
}

const positionKey = fen => fen.split(' ').slice(0, 4).join(' ');

function openingBook(games, color) {
  const book = new Map();
  for (const game of games.filter(game => game.colors.includes(color))) {
    const chess = new Chess(game.doc.initialFen);
    if (chess.fen() !== new Chess().fen()) continue;
    const seen = new Set();
    for (const san of game.doc.moves.slice(0, 16)) {
      const fen = positionKey(chess.fen());
      const move = chess.move(san);
      if (move.color !== color || seen.has(fen)) continue;
      seen.add(fen);
      if (!book.has(fen)) book.set(fen, new Map());
      const choices = book.get(fen);
      choices.set(move.san, (choices.get(move.san) || 0) + 1);
    }
  }
  return book;
}

export async function prepareOpening(games, repertoire, ownColor, analyze) {
  const opponent = openingBook(games, ownColor === 'w' ? 'b' : 'w');
  const own = openingBook(repertoire, ownColor);
  const ranked = (book, chess) => [...(book.get(positionKey(chess.fen())) || [])]
    .sort((a, b) => b[1] - a[1]);
  const root = new Chess();
  if (!games.some(game => new Chess(game.doc.initialFen).fen() === root.fen())) return [];
  const choose = async chess => {
    const familiar = ranked(own, chess)[0];
    const result = await analyze(chess.fen(), 12);
    if (!result.bestMove) return null;
    const line = pvToSan(chess.fen(), result.evaluation.pv);
    const best = playLine(chess.fen(), [result.bestMove]).history()[0];
    return { san: familiar?.[0] || best, familiar: familiar?.[1] || 0, best, line };
  };
  const first = ownColor === 'w' ? await choose(root) : null;
  if (first) root.move(first.san);
  const observed = ranked(opponent, root);
  const total = observed.reduce((sum, [, count]) => sum + count, 0);
  const plans = [];
  for (const [move, count] of observed.slice(0, 3)) {
    const chess = new Chess(root.fen());
    chess.move(move);
    const response = await choose(chess);
    if (!response) continue;
    chess.move(response.san);
    const followups = ranked(opponent, chess).slice(0, 2).map(([reply, frequency]) => ({
      reply, frequency,
    }));
    let alternate;
    if (followups.length) {
      const reply = (followups[1] || followups[0]).reply;
      chess.move(reply);
      const continuation = await choose(chess);
      if (continuation) alternate = { reply, response: continuation };
    }
    plans.push({ first, move, count, total, response, followups, alternate });
  }
  if (!plans.length && first) plans.push({ first, followups: [] });
  return plans;
}
