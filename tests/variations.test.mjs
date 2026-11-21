// SPDX-License-Identifier: GPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DEFAULT_FEN, validateDocument, newDocument, exportPgn } from '../src/model.js';
import { addMove, lineText, moveTree, nodeMoves } from '../src/variations.js';
import { parseChapters } from '../src/lichess-studies.js';
import { openingTraps, trapDocument, trapMatches } from '../src/opening-traps.js';

const pgn = `[Event "Ejemplo"]
[StudyName "Ejemplo"]
[ChapterName "Primer capítulo"]
[ChapterURL "https://lichess.org/study/study123/chapt123"]

{ inicio } 1.e4 (1.d4 d5 (1...Nf6) 2.c4) e5 { centro } 2.Nf3 *`;

test('conserva los comentarios, la línea principal y las variantes anidadas', () => {
  const { chapters: [doc], omitted } = parseChapters(pgn, 'study123');
  assert.equal(omitted, 0);
  assert.equal(doc.id, 'lichess:study123:chapt123');
  assert.equal(exportPgn(doc), pgn);
  const root = moveTree(doc);
  assert.equal(root.comment, 'inicio');
  assert.deepEqual(root.children.map(node => node.san), ['e4', 'd4']);
  assert.deepEqual(root.children[1].children.map(node => node.san), ['d5', 'Nf6']);
  assert.equal(root.children[0].children[0].comment, 'centro');
  const branch = addMove(root.children[0], 'c5');
  assert.deepEqual(nodeMoves(branch), ['e4', 'c5']);
  assert.deepEqual(doc.moves, ['e4', 'e5', 'Nf3']);
  assert.deepEqual(validateDocument({ ...doc, variations: [['e4', 'c5']] }).variations, [['e4', 'c5']]);
});

test('respeta la numeración completa, incluso cuando empieza con negras', () => {
  assert.equal(lineText(DEFAULT_FEN, ['e4', 'e5', 'Nf3']), '1. e4 e5 2. Nf3');
  const fen = new Chess().move('e4').after.replace(/ 1$/, ' 12');
  assert.equal(lineText(fen, ['e5', 'Nf3']), '12... e5 13. Nf3');
});

test('cada ficha se puede reproducir y la respuesta se cuenta por partida y color', () => {
  for (const trap of openingTraps) moveTree(trapDocument(trap));
  const legal = openingTraps.find(trap => trap.name === 'Trampa de Legal');
  const { moves } = trapDocument(legal);
  const games = [moves, moves.slice(0, legal.ply + 1), [...moves.slice(0, legal.ply + 1), legal.defense]]
    .map(moves => ({ doc: { ...newDocument(), moves } }));
  const match = trapMatches(games, 'w').find(row => row.trap === legal);
  assert.equal(match.reached, 3);
  assert.equal(match.seen, 2);
  assert.equal(match.matched, 1);
  assert.equal(trapMatches(games, 'b').some(row => row.trap === legal), false);
});
