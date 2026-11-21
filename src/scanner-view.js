// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { pgnHeader, pvToSan } from './model.js';
import { moveLabel } from './variations.js';
import { phases, scannerSummary, themes } from './scanner.js';
import { rhythms } from './player-study.js';
import { themePuzzles } from './training-puzzles.js';

function group(items, key) {
  const buckets = Object.create(null);
  for (const item of items) (buckets[key(item)] ||= []).push(item);
  return buckets;
}

function node(tag, value) {
  const item = document.createElement(tag);
  if (value !== undefined) item.textContent = value;
  return item;
}
function button(label, onClick) {
  const item = node('button', label);
  item.type = 'button';
  item.addEventListener('click', onClick);
  return item;
}
function table(labels, rows) {
  const item = node('table');
  item.className = 'scan-scores';
  const header = item.createTHead().insertRow();
  header.append(...labels.map(label => node('th', label)));
  const body = item.createTBody();
  for (const values of rows) body.insertRow().append(...values.map(value => node('td', value)));
  return item;
}

function drawRadar(values) {
  const canvas = node('canvas');
  canvas.width = 300;
  canvas.height = 250;
  canvas.className = 'scan-radar';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const point = (index, radius) => {
    const angle = index * Math.PI * 2 / 5 - Math.PI / 2;
    return [150 + radius * Math.cos(angle), 125 + radius * Math.sin(angle)];
  };
  function polygon(points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }
  ctx.strokeStyle = '#777268';
  for (const radius of [21, 42, 63, 84]) {
    polygon(values.map((_, i) => point(i, radius)));
    ctx.stroke();
  }
  ctx.fillStyle = '#e8e4db';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  values.forEach((item, i) => {
    const [x, y] = point(i, 108);
    ctx.fillText(item.name, x, y + 5);
  });
  if (values.every(item => item.score !== null)) {
    polygon(values.map((item, i) => point(i, 0.84 * item.score)));
    ctx.fillStyle = '#a3bd7240';
    ctx.fill();
    ctx.strokeStyle = '#a3bd72';
    ctx.stroke();
  }
  ctx.fillStyle = '#a3bd72';
  values.forEach((item, i) => {
    if (item.score === null) return;
    ctx.beginPath();
    ctx.arc(...point(i, 0.84 * item.score), 4, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}

const scoreText = score => score == null ? 'Datos insuficientes' : score + '/100';
const themeOf = event => event.theme || (event.kind === 'mate' ? 'mate' : 'short');
const eventLabel = event => moveLabel(event.fen, event.move || '');
const eventId = event => [event.fen, event.best].join(' ');

function diagnosticRows(records, stats) {
  const patterns = new Map();
  for (const [index, record] of records.entries()) {
    for (const event of record.findings) {
      const phase = event.phase || 'middle';
      const theme = themeOf(event);
      const opening = phase === 'opening'
        ? pgnHeader(record.game.doc.sourcePgn || '', 'Opening') || record.game.doc.moves.slice(0, 2).join(' ')
        : '';
      const key = JSON.stringify([theme, phase, event.color, opening]);
      const pattern = patterns.get(key) || { theme, phase, opening, side: event.color, items: [], games: new Set(), impact: 0 };
      pattern.items.push(event);
      pattern.games.add(index);
      pattern.impact += event.loss;
      patterns.set(key, pattern);
    }
  }
  const rows = [...patterns.values()].sort((a,b) => b.games.size - a.games.size || b.impact - a.impact).map(pattern => {
    const side = pattern.side === 'w' ? 'blancas' : 'negras';
    const cases = pattern.items.length;
    const text = `${themes[pattern.theme]} con ${side} · ${pattern.games.size} de ${records.length} partidas del grupo, ${cases} ${cases === 1 ? 'posición' : 'posiciones'}${pattern.opening ? ' · ' + pattern.opening : ''}.`;
    return { text, items: pattern.items.sort((a,b) => b.loss - a.loss) };
  });
  if (stats.knownLowResults >= 5 && stats.lowLosses >= 3 && stats.lowLosses * 2 >= stats.knownLowResults) {
    const text = `Con menos de un minuto: ${stats.lowLosses} derrotas de ${stats.knownLowResults} partidas con resultado y color identificados.`;
    const items = records.flatMap(record => {
      const times = new Set((record.metrics || []).filter(item => item.beforeClock != null && item.beforeClock < 60).map(item => item.ply));
      return record.findings.filter(event => times.has(event.ply));
    }).sort((a,b) => b.loss - a.loss);
    rows.splice(Math.min(rows.length, 2), 0, { text, items });
  }
  return rows.slice(0, 3);
}

function thematicPuzzle([id, fen, uci]) {
  const chess = new Chess(fen);
  const [setup, ...line] = uci.split(' ');
  chess.move({ from: setup.slice(0, 2), to: setup.slice(2, 4), promotion: setup[4] });
  return { id, fen: chess.fen(), best: line[0], line, color: chess.turn(),
    game: 'Puzle de Lichess · ' + id, solution: pvToSan(chess.fen(), line) };
}

function styleKey(event, attempts) {
  const previous = attempts[eventId(event)];
  return previous?.solved ? 2 : previous ? 0 : 1;
}

export function renderScanner({ job, report, training, week, openExercise, openReplay, progress }) {
  training.replaceChildren();
  week.replaceChildren();
  const groups = group(job.records, record => record.game.rhythm);
  for (const [rhythm, records] of Object.entries(groups)) {
    const stats = scannerSummary(records);
    const section = node('section');
    section.className = 'study-group';
    section.append(node('h3', rhythms[rhythm] + ' · ' + records.length + ' partidas'),
      drawRadar(stats.radar), table(['Área', 'Puntuación', 'Jugadas'], stats.radar.map(row =>
        [row.name, scoreText(row.score), row.count])));
    if (!records.some(record => record.metrics)) {
      section.append(node('p', 'Este estudio guardado conserva sus ejercicios. Escanéalo de nuevo para calcular el radar y las fases.'));
    }
    section.append(node('p', `Reloj disponible en ${stats.clockGames} partidas. Precisión con menos de un minuto: ${scoreText(stats.clockScore)} (${stats.lowCount} jugadas). Con un minuto o más: ${scoreText(stats.reference)} (${stats.referenceCount} jugadas).`));
    section.append(node('h4', 'Mapa de fases'), table(['Fase', 'Precisión', 'Jugadas', 'Pérdidas sostenidas'], stats.phaseMap.map(row =>
      [phases[row.key], scoreText(row.score), row.count, row.swings])));
    section.append(node('h4', job.role === 'rival' ? 'Tres debilidades del rival' : 'Tres fugas de ELO'));
    const rows = diagnosticRows(records, stats);
    if (!rows.length) section.append(node('p', 'El motor no encontró patrones de pérdida suficientemente claros.'));
    for (const row of rows) {
      const details = node('details');
      details.append(node('summary', row.text));
      for (const event of row.items.slice(0, 5)) {
        const text = `${event.game} · ${eventLabel(event)} · −${(event.loss / 100).toFixed(2)}`;
        if (job.role === 'rival') {
          const game = records.find(record => record.findings.includes(event))?.game;
          if (game) details.append(button(text, () => openReplay(game, event.ply)));
        } else details.append(button(text, () => openExercise(event)));
      }
      section.append(details);
    }
    report.append(section);
  }

  if (job.role !== 'profile') {
    training.append(node('p', 'Las posiciones de práctica de este rival están en Conclusiones.'));
    week.append(node('p', 'Para generar un plan semanal, escanea tus partidas con Mi perfil.'));
    return;
  }
  const stats = scannerSummary(job.records);
  const bank = stats.bank;
  const attempts = job.attempts || {};
  const ordered = [...bank].sort((a,b) => styleKey(a, attempts) - styleKey(b, attempts) || b.loss - a.loss);
  const list = node('div');
  const themeSelect = node('select');
  themeSelect.setAttribute('aria-label', 'Filtrar puzles por tema');
  themeSelect.append(new Option('Todos los temas', ''), ...[...new Set(bank.map(themeOf))].map(key => new Option(themes[key], key)));
  function refreshBank() {
    list.replaceChildren(...ordered.filter(event => !themeSelect.value || themeOf(event) === themeSelect.value)
      .map(event => button(`${themes[themeOf(event)]} · ${event.game} · ${eventLabel(event)}${attempts[eventId(event)]?.solved ? ' · Resuelto' : ''}`,
        () => openExercise(event))));
  }
  themeSelect.addEventListener('change', refreshBank);
  training.append(node('h3', `Puzles de tus partidas (${bank.length})`), themeSelect, list);
  if (!bank.length) training.append(node('p', 'La muestra no contiene caídas verificadas de al menos 1,5 peones.'));
  refreshBank();

  const counts = group(bank, themeOf);
  const theme = Object.keys(counts).sort((a,b) => counts[b].length - counts[a].length)[0] || 'short';
  const focus = themePuzzles[theme] || themePuzzles.short;
  const opening = bank.filter(event => event.phase === 'opening');
  const daySelect = node('select');
  daySelect.setAttribute('aria-label', 'Día del plan semanal');
  daySelect.append(...Array.from({ length: 7 }, (_, i) => new Option('Día ' + (i + 1), String(i))));
  daySelect.value = String(job.day || 0);
  const plan = node('div');
  function refreshPlan() {
    const day = Number(daySelect.value);
    plan.replaceChildren();
    const warm = node('section');
    warm.append(node('h4', '5 min · Calentamiento'));
    const fresh = ordered.filter(event => !attempts[eventId(event)]?.solved);
    const source = fresh.length ? fresh : ordered;
    if (source.length) {
      const offset = (day * 5) % source.length;
      for (const event of [...source.slice(offset), ...source.slice(0, offset)].slice(0, 5)) {
        warm.append(button(themes[themeOf(event)] + ' · ' + eventLabel(event), () => openExercise(event)));
      }
    } else warm.append(node('p', 'Todavía no hay puzles propios para este bloque.'));
    const reinforcement = node('section');
    reinforcement.append(node('h4', '5 min · Refuerzo · ' + themes[theme]));
    const puzzle = thematicPuzzle(focus[day % focus.length]);
    reinforcement.append(button('Resolver puzle', () => openExercise(puzzle)));
    const credit = node('a', 'Original en Lichess');
    credit.href = 'https://lichess.org/training/' + puzzle.id;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    reinforcement.append(' ', credit);
    const review = node('section');
    review.append(node('h4', '5 min · Corrección de apertura'));
    if (opening.length) {
      const event = opening[day % opening.length];
      const record = job.records.find(record => record.findings.includes(event));
      review.append(button(event.game + ' · ' + eventLabel(event), () => openExercise(event)));
      if (record) review.append(button('Ver cómo se llegó a la posición', () => openReplay(record.game, event.ply - 1)));
    } else review.append(node('p', 'El análisis no encontró una pérdida de apertura de al menos 1,5 peones.'));
    for (const [index, block] of [warm, reinforcement, review].entries()) {
      const key = day + ':' + index;
      const mark = node('input');
      mark.type = 'checkbox';
      mark.checked = Boolean(job.week?.[key]);
      mark.addEventListener('change', () => {
        (job.week ||= {})[key] = mark.checked;
        progress();
      });
      const label = node('label');
      label.append(mark, ' Bloque completado');
      block.append(label);
    }
    plan.append(warm, reinforcement, review);
  }
  daySelect.addEventListener('change', () => { job.day = Number(daySelect.value); refreshPlan(); });
  week.append(node('h3', '15 minutos al día'), daySelect, plan);
  refreshPlan();
}

export function recordAttempt(job, event, correct) {
  if (!job || !event || job.role !== 'profile') return;
  const id = eventId(event);
  const attempts = job.attempts ||= {};
  attempts[id] = { solved: Boolean(correct || attempts[id]?.solved) };
}
