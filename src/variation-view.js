// SPDX-License-Identifier: GPL-3.0-or-later
import { Chessground } from '@lichess-org/chessground';
import { Chess } from 'chess.js';
import { legalDests } from './model.js';
import { addMove, lineText, moveTree, nodeMoves } from './variations.js';

export function setupVariations(get, choosePromotion, showError) {
  const dialog = get('variation-dialog');
  const choices = get('variation-choices');
  const saveButton = get('variation-save');
  let root, node, origin, board, orientation, save, trail, canSave;

  function render() {
    const chess = new Chess(node.fen);
    const color = chess.turn() === 'w' ? 'white' : 'black';
    const last = node.parent ? new Chess(node.parent.fen).move(node.san) : null;
    board.set({
      fen: chess.fen(), orientation, turnColor: color, check: chess.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: { color, free: false, dests: legalDests(chess) },
    });
    get('variation-line').textContent = lineText(root.fen, nodeMoves(node)) || 'Posición inicial';
    get('variation-comment').textContent = node.comment;
    get('variation-prev').disabled = !node.parent;
    get('variation-next').disabled = !node.children.length;
    get('variation-reset').disabled = node === origin;
    saveButton.hidden = !save || !canSave(nodeMoves(node));
    choices.replaceChildren(...node.children.map(child => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = child.san;
      button.addEventListener('click', () => visit(child));
      return button;
    }));
  }

  function visit(next) {
    if (next.parent === node) trail.set(node, next);
    node = next;
    render();
  }

  async function play(from, to) {
    const candidates = new Chess(node.fen).moves({ verbose: true })
      .filter(move => move.from === from && move.to === to);
    if (candidates.length > 1) {
      render();
      const promotion = await choosePromotion();
      if (promotion) visit(addMove(node, { from, to, promotion }));
    } else if (candidates.length) visit(addMove(node, candidates[0].san));
    else render();
  }

  const tryMove = (from, to) => play(from, to).catch(error => { render(); showError(error); });
  get('variation-prev').addEventListener('click', () => visit(node.parent));
  get('variation-next').addEventListener('click', () => visit(trail.get(node) || node.children[0]));
  get('variation-reset').addEventListener('click', () => visit(origin));
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try { await save(nodeMoves(node)); render(); }
    catch (error) { showError(error); }
    finally { saveButton.disabled = false; }
  });

  return function open(doc, cursor = doc.cursor, options = {}) {
    root = moveTree(doc);
    const main = doc.moves.slice(0, cursor);
    origin = main.reduce((parent, san) => parent.children.find(child => child.san === san), root);
    node = origin;
    orientation = doc.orientation || 'white';
    save = options.save;
    canSave = options.canSave || (() => false);
    trail = new Map();
    get('variation-title').textContent = doc.title || 'Explorar variante';
    dialog.showModal();
    board ||= Chessground(get('variation-board'), {
      coordinates: true, drawable: { enabled: false }, premovable: { enabled: false },
      movable: { events: { after: tryMove } },
    });
    render();
    if (options.move) tryMove(...options.move);
  };
}
