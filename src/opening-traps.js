// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { DEFAULT_FEN } from './model.js';
import { lineText, moveLabel } from './variations.js';

const entries = [
  {
    name: 'Gambito Evans', kind: 'gambit',
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5', offer: 'b4',
    response: 'Bxb4', follow: 'c3 Ba5 d4', defense: 'Bb6', safe: 'a4',
    idea: 'Cede el peón de b para ganar tiempos contra el alfil y ocupar el centro con d4.',
  },
  {
    name: 'Gambito danés', kind: 'gambit',
    prefix: 'e4 e5 d4 exd4', offer: 'c3',
    response: 'dxc3', follow: 'Bc4 cxb2 Bxb2', defense: 'd5', safe: 'exd5',
    idea: 'Si aceptan los peones, activa los alfiles. Ante …d5, calcula el cambio central de inmediato.',
  },
  {
    name: 'Gambito Smith-Morra', kind: 'gambit',
    prefix: 'e4 c5 d4 cxd4', offer: 'c3',
    response: 'dxc3', follow: 'Nxc3 Nc6 Nf3', defense: 'Nf6', safe: 'e5',
    idea: 'Entrégale un peón a la Siciliana para desarrollar con rapidez y usar las columnas c y d.',
  },
  {
    name: 'Gambito escocés', kind: 'gambit',
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4', offer: 'Bc4',
    response: 'Bc5', follow: 'c3 Nf6 O-O', defense: 'Nf6', safe: 'e5',
    idea: 'Desarrolla el alfil hacia f7 y prepara c3 para recuperar espacio en el centro.',
  },
  {
    name: 'Trampa Milner-Barry en la Francesa', kind: 'trap',
    prefix: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4', offer: 'cxd4',
    response: 'Nxd4', follow: 'Nxd4 Qxd4 Bb5+ Bd7 Qxd4', defense: 'Bd7', safe: 'O-O',
    idea: 'Si el rival captura en d4 y después recaptura con la dama, Ab5+ despeja la columna y permite tomar la dama negra tras responder al jaque.',
  },
  {
    name: 'Trampa de Legal', kind: 'trap',
    prefix: 'e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5', offer: 'Nxe5',
    response: 'Bxd1', follow: 'Bxf7+ Ke7 Nd5#', defense: 'Nxe5', safe: 'Qxh5',
    idea: 'La captura de dama permite mate. Si recapturan con el caballo, toma el alfil de h5.',
  },
  {
    name: 'Gambito Budapest', kind: 'gambit',
    prefix: 'd4 Nf6 c4', offer: 'e5',
    response: 'dxe5', follow: 'Ng4 Nf3 Nc6', defense: 'e3', safe: 'exd4 exd4 d5',
    idea: 'Disputa e5 con el caballo y desarrolla las piezas. La captura blanca es una respuesta normal.',
  },
  {
    name: 'Trampa del Budapest', kind: 'trap',
    prefix: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3', offer: 'Ngxe5',
    response: 'axb4', follow: 'Nd3#', defense: 'Nxe5', safe: 'Nxe5',
    idea: 'El peón de e2 está clavado por la dama. Si las blancas toman en b4, el caballo da mate en d3.',
  },
  {
    name: 'Contragambito Albin', kind: 'gambit',
    prefix: 'd4 d5 c4', offer: 'e5',
    response: 'dxe5', follow: 'd4 Nf3 Nc6', defense: 'cxd5', safe: 'exd4',
    idea: 'Avanza el peón a d4 si aceptan el gambito y gana espacio para desarrollar las piezas.',
  },
  {
    name: 'Trampa de Lasker en el Albin', kind: 'trap',
    prefix: 'd4 d5 c4 e5 dxe5 d4 e3', offer: 'Bb4+',
    response: 'Bd2', follow: 'dxe3 Bxb4 exf2+ Ke2 fxg1=N+', defense: 'Nd2', safe: 'dxe3 fxe3 Nc6',
    idea: 'Si las blancas interponen el alfil, el peón puede capturar en g1 con promoción a caballo y jaque en la línea mostrada.',
  },
  {
    name: 'Trampa de Blackburne', kind: 'trap',
    prefix: 'e4 e5 Nf3 Nc6 Bc4', offer: 'Nd4',
    response: 'Nxe5', follow: 'Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#', defense: 'Nxd4', safe: 'exd4 O-O',
    idea: 'Si capturan en e5, ataca g2 con la dama. El mate requiere que las blancas también se equivoquen después. …Cd4 permite una respuesta fuerte en d4.',
  },
];

const moves = text => text.split(' ');
const key = fen => fen.split(' ').slice(0, 4).join(' ');

export const openingTraps = entries.map(entry => {
  const game = new Chess();
  for (const san of moves(entry.prefix)) game.move(san);
  const fen = game.fen(), color = game.turn();
  const offer = game.move(entry.offer);
  const afterOffer = game.fen();
  const reply = game.move(entry.response);
  return {
    ...entry, fen, color, ply: game.history().length - 2, key: key(fen), afterKey: key(afterOffer),
    label: moveLabel(fen, offer.san), response: reply.san,
    example: lineText(fen, [entry.offer, reply.san, ...moves(entry.follow)]),
    precaution: lineText(afterOffer, [entry.defense, ...moves(entry.safe)]),
    lines: [[entry.offer, reply.san, ...moves(entry.follow)], [entry.offer, entry.defense, ...moves(entry.safe)]],
  };
});

export function trapMatches(games, color) {
  const candidates = openingTraps.filter(trap => trap.color === color);
  const positions = new Map(), responses = new Map();
  for (const { doc } of games) {
    const game = new Chess(doc.initialFen);
    const reached = new Set();
    const answers = new Map();
    for (let index = 0; index <= Math.min(doc.moves.length, 40); index++) {
      const current = key(game.fen());
      reached.add(current);
      if (!doc.moves[index]) break;
      if (!answers.has(current)) answers.set(current, doc.moves[index]);
      game.move(doc.moves[index]);
    }
    for (const trap of candidates) {
      if (reached.has(trap.key)) positions.set(trap, (positions.get(trap) || 0) + 1);
      const response = answers.get(trap.afterKey);
      if (!response) continue;
      const counts = responses.get(trap) || { seen: 0, matched: 0 };
      counts.seen++;
      if (response === trap.response) counts.matched++;
      responses.set(trap, counts);
    }
  }
  return candidates.flatMap(trap => {
    const reached = positions.get(trap) || 0;
    const { seen, matched } = responses.get(trap) || { seen: 0, matched: 0 };
    return reached || seen ? [{ trap, reached, seen, matched }] : [];
  }).sort((a, b) => b.matched - a.matched || b.reached - a.reached);
}

export function trapDocument(trap) {
  return {
    title: trap.name, initialFen: DEFAULT_FEN, orientation: trap.color === 'w' ? 'white' : 'black',
    moves: [...moves(trap.prefix), ...trap.lines[0]],
    variations: [[...moves(trap.prefix), ...trap.lines[1]]],
  };
}

export function trapCard(trap, practice, summary) {
  const section = document.createElement('section');
  section.className = 'study-group';
  const title = document.createElement('h4');
  title.textContent = trap.name + ' · ' + (trap.color === 'w' ? 'Blancas' : 'Negras');
  section.append(title);
  for (const text of [summary, 'Juega ' + trap.label + '. ' + trap.idea,
    (trap.kind === 'trap' ? 'Si cae: ' : 'Si sigue esta línea: ') + trap.example,
    'Si evita esa línea: ' + trap.precaution]) {
    if (!text) continue;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    section.append(paragraph);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Practicar en el tablero';
  button.addEventListener('click', () => practice(trapDocument(trap), trap.ply));
  section.append(button);
  return section;
}
