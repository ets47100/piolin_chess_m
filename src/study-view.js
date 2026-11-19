// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import { LocalEngine } from './engine.js';
import { legalDests, pvToSan } from './model.js';
import { analyzeStudyGame, lessons, playerKey, rhythms, selectGames, studyGame, summarize } from './player-study.js';

const $ = id => document.getElementById(id);

export function setupStudy(loadLibrary, showError) {
  const dialog = $('study-dialog'), form = $('study-form'), player = $('study-player');
  const start = $('study-start'), pause = $('study-pause'), status = $('study-status');
  const progress = $('study-progress'), results = $('study-results');
  const onlyBatch = $('study-only-batch');
  const filters = [player, $('study-rhythm'), $('study-color'), $('study-limit'), onlyBatch];
  const exercise = $('study-exercise');
  let library = [], batch, job, engine, board, position, example, solved;

  async function open({ preferredPlayer = '', batchKeys } = {}) {
    library = (await loadLibrary()).map(studyGame).filter(Boolean);
    const users = new Map();
    for (const game of library) {
      for (const name of [game.white, game.black]) users.set(playerKey(name), name);
    }
    const selected = preferredPlayer ? playerKey(preferredPlayer) : player.value;
    batch = batchKeys;
    $('study-scope').hidden = !batch;
    onlyBatch.checked = Boolean(batch);
    if (batch) {
      $('study-rhythm').value = 'all';
      $('study-color').value = 'all';
      $('study-limit').value = 'all';
    }
    player.replaceChildren(...[...users].sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([key, name]) => new Option(name, key)));
    if (users.has(selected)) player.value = selected;
    updateSelection();
    dialog.showModal();
  }

  function selection() {
    const candidates = onlyBatch.checked && batch ? library.filter(game => batch.has(game.key)) : library;
    return selectGames(candidates, player.value, $('study-color').value,
      $('study-rhythm').value, Number($('study-limit').value) || Infinity);
  }

  function updateSelection() {
    const games = selection();
    const same = job?.key === JSON.stringify(games.map(game => [game.key, game.colors])) &&
      job.player === player.value;
    if (!same) job = undefined;
    status.textContent = games.length
      ? `${games.length} partidas seleccionadas para este estudio.`
      : 'No hay partidas con jugador y jugadas para esos filtros. Guarda en la Biblioteca las partidas PGN del jugador.';
    progress.hidden = !job;
    if (job) showProgress(job.records.length, games.length);
    results.replaceChildren();
    if (job?.records.length) renderReport();
    start.disabled = !games.length;
    start.textContent = !job ? 'Analizar partidas' : job.records.length < games.length ? 'Continuar análisis' : 'Analizar de nuevo';
  }

  function showProgress(done, total, detail = '') {
    progress.max = total;
    progress.value = done;
    status.textContent = `${done} de ${total} partidas analizadas.${detail ? ' ' + detail : ''}`;
  }

  function renderReport() {
    results.replaceChildren();
    const note = document.createElement('p');
    note.textContent = 'Estimación de Stockfish. Los patrones estratégicos son pistas para revisar. Las comparaciones usan partidas del mismo ritmo; si falta la fecha PGN, ese grupo no muestra evolución.';
    results.append(note);
    for (const group of summarize(job.records)) {
      const section = document.createElement('section');
      section.className = 'study-group';
      const title = document.createElement('h3');
      title.textContent = `${rhythms[group.rhythm]} · ${group.count} partidas`;
      section.append(title);
      if (!group.patterns.length) {
        const empty = document.createElement('p');
        empty.textContent = 'El análisis no encontró pérdidas de evaluación suficientemente claras.';
        section.append(empty);
      }
      for (const pattern of group.patterns) {
        const lesson = lessons[pattern.kind], heading = document.createElement('h4');
        heading.textContent = lesson.title;
        const stats = document.createElement('p');
        stats.textContent = `${pattern.count} de ${group.count} partidas · ${pattern.total} casos.`;
        if (pattern.priorTotal && group.chronological && group.rhythm !== 'unknown') {
          stats.textContent += ` Últimas 10: ${pattern.recent}/10. Anteriores: ${pattern.prior}/${pattern.priorTotal}.`;
        }
        const tip = document.createElement('p');
        tip.textContent = lesson.tip;
        section.append(heading, stats, tip);
        for (const event of pattern.examples) {
          const button = document.createElement('button');
          button.type = 'button';
          const number = event.fen.split(' ')[5];
          button.textContent = `${event.game} · jugada ${number} con ${event.color === 'w' ? 'blancas' : 'negras'}`;
          button.addEventListener('click', () => openExercise(event));
          section.append(button);
        }
      }
      results.append(section);
    }
  }

  function renderExercise() {
    const orientation = example.color === 'w' ? 'white' : 'black';
    board.set({
      fen: position.fen(), orientation, check: position.inCheck(), lastMove: undefined,
      turnColor: position.turn() === 'w' ? 'white' : 'black',
      movable: { free: false, color: solved ? undefined : orientation, dests: legalDests(position) },
    });
  }

  function openExercise(event) {
    example = event;
    exercise.showModal();
    if (!board) {
      board = Chessground($('study-board'), {
        coordinates: true, drawable: { enabled: false }, premovable: { enabled: false },
        movable: { events: { after: (from, to) => {
          const candidates = position.moves({ verbose: true }).filter(move => move.from === from && move.to === to);
          if (!candidates.length || solved) return;
          if (candidates.some(move => move.promotion)) {
            $('study-exercise-feedback').textContent = 'Puedes consultar la variante del motor para ver la pieza de promoción.';
            renderExercise();
            return;
          }
          const move = position.move({ from, to });
          solved = true;
          $('study-exercise-feedback').textContent = move.lan === example.best
            ? `${move.san}: coincide con la primera opción de Stockfish.`
            : `Has probado ${move.san}. Consulta la variante del motor para comparar las ideas.`;
          renderExercise();
        } } },
      });
    }
    resetExercise();
  }

  function resetExercise() {
    position = new Chess(example.fen);
    solved = false;
    $('study-exercise-title').textContent = example.game;
    const name = player.selectedOptions[0]?.text || '';
    const color = example.color === 'w' ? 'blancas' : 'negras';
    const feedback = $('study-exercise-feedback');
    feedback.textContent = name + ' juega con ' + color + '. Encuentra una continuación.';
    const solution = $('study-exercise-solution');
    solution.hidden = true;
    solution.textContent = '';
    renderExercise();
  }

  $('study-exercise-reset').addEventListener('click', resetExercise);
  $('study-exercise-reveal').addEventListener('click', () => {
    const solution = $('study-exercise-solution');
    solution.textContent = `En la partida: ${example.move}${example.reply ? ' · Respuesta y continuación: ' + example.reply : ''}. Sugerencia de Stockfish: ${example.solution || pvToSan(example.fen, [example.best])}.`;
    solution.hidden = false;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (engine) return;
    const games = selection();
    if (!games.length) return;
    if (!job || job.records.length === games.length) {
      job = { key: JSON.stringify(games.map(game => [game.key, game.colors])), player: player.value, records: [] };
    }
    const worker = new LocalEngine({ options: { Hash: 16 } });
    engine = worker;
    start.disabled = true;
    pause.disabled = false;
    for (const filter of filters) filter.disabled = true;
    results.replaceChildren();
    progress.hidden = false;
    showProgress(job.records.length, games.length, 'Preparando Stockfish…');
    let message = '';
    try {
      for (const game of games.slice(job.records.length)) {
        if (engine !== worker) break;
        const findings = await analyzeStudyGame(game, (fen, depth) => worker.analyze(fen, depth),
          (ply, total) => {
            if (ply <= 2 || ply % 12 < 2) showProgress(job.records.length, games.length, `Jugada ${ply} de ${total}.`);
          }, () => engine !== worker);
        if (!findings || engine !== worker) break;
        job.records.push({ game, findings });
        showProgress(job.records.length, games.length);
      }
    } catch (error) {
      if (engine === worker) message = error.message;
    } finally {
      const paused = engine !== worker;
      worker.destroy();
      engine = undefined;
      for (const filter of filters) filter.disabled = false;
      start.disabled = false;
      pause.disabled = true;
      start.textContent = job.records.length < games.length ? 'Continuar análisis' : 'Analizar de nuevo';
      showProgress(job.records.length, games.length, message || (paused
        ? 'Análisis en pausa. Se conservan las partidas completadas mientras esta pestaña siga abierta.'
        : 'Análisis terminado.'));
      if (job.records.length) renderReport();
    }
  });

  function stop() {
    const worker = engine;
    engine = undefined;
    worker?.destroy();
  }

  pause.addEventListener('click', stop);
  dialog.addEventListener('close', stop);
  for (const filter of filters) filter.addEventListener('change', updateSelection);
  $('study-open').addEventListener('click', () => open().catch(showError));
  return open;
}
