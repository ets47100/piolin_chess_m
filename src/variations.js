// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';

export function moveLabel(fen, san) {
  const [, turn, , , , number] = fen.split(' ');
  return number + (turn === 'w' ? '. ' : '... ') + san;
}

export function lineText(initialFen, moves) {
  const chess = new Chess(initialFen);
  return moves.map((san, index) => {
    const label = index === 0 || chess.turn() === 'w' ? moveLabel(chess.fen(), san) : san;
    chess.move(san);
    return label;
  }).join(' ');
}

function makeNode(fen, parent, san) {
  return { fen, parent, san, children: [], comment: '' };
}

export function addMove(node, input) {
  const move = new Chess(node.fen).move(input);
  const existing = node.children.find(child => child.san === move.san);
  if (existing) return existing;
  const child = makeNode(move.after, node, move.san);
  node.children.push(child);
  return child;
}

function readPgn(root, pgn, strictMain) {
  let node = root;
  const returns = [];
  const tokens = pgn.matchAll(/\[[A-Za-z][A-Za-z0-9_]*\s+"(?:\\.|[^"\\])*"\s*\]|\{[^}]*\}|;[^\r\n]*|[()]|\$\d+|\d+\.+|[^\s{}();\[\]$]+/g);
  for (const [token] of tokens) {
    if (token[0] === '[' || token[0] === '$' || /^\d+\.+$|^\.\.\.$/.test(token)) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      if (!returns.length) break;
      continue;
    }
    if (token === '(') {
      returns.push(node);
      node = node?.parent ?? node;
    } else if (token === ')') {
      node = returns.pop();
    } else if (node && (token[0] === '{' || token[0] === ';')) {
      const comment = token.slice(1, token[0] === '{' ? -1 : undefined).trim();
      if (comment) node.comment += (node.comment ? '\n' : '') + comment;
    } else if (node) {
      try { node = addMove(node, token); }
      catch (error) {
        if (strictMain && !returns.length) throw error;
        node = undefined;
      }
    }
  }
  return returns.length ? returns[0] : node;
}

export function pgnMainLine(initialFen, pgn) {
  return nodeMoves(readPgn(makeNode(initialFen), pgn, true));
}

export function moveTree(doc) {
  const root = makeNode(doc.initialFen);
  doc.moves.reduce(addMove, root);
  if (doc.sourcePgn) readPgn(root, doc.sourcePgn, false);
  for (const line of doc.variations || []) line.reduce(addMove, root);
  return root;
}

export function nodeMoves(node) {
  const moves = [];
  for (let current = node; current.parent; current = current.parent) moves.push(current.san);
  return moves.reverse();
}
