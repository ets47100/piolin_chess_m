// SPDX-License-Identifier: GPL-3.0-or-later
import { Chess } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import { LocalEngine } from './engine.js';
import { legalDests, positionAt, pvToSan } from './model.js';
import { analyzeStudyGame, lessons, playerKey, prepareOpening, rhythms, selectGames, studyGame, summarize } from './player-study.js';

const $ = id => document.getElementById(id);

export function setupStudy({ load, save, showError }) {
  const dialog = $('study-dialog'), form = $('study-form'), player = $('study-player');
  const start = $('study-start'), pause = $('study-pause'), status = $('study-status');
  const progress = $('study-progress'), results = $('study-results');
  const onlyBatch = $('study-only-batch'), role = $('study-role'), single = $('study-single');
  const color = $('study-color'), rhythm = $('study-rhythm'), limit = $('study-limit');
  const saveButton = $('study-save');
  const filters = [player, role, rhythm, color, limit, onlyBatch, single];
  const exercise = $('study-exercise'), replay = $('study-replay');
  let replayBoard, replayGame, replayPly;
  function renderReplay() {
    const { doc, colors } = replayGame;
    const chess = positionAt(doc, replayPly);
    replayBoard.set({
      fen: chess.fen(), orientation: colors[0] === 'b' ? 'black' : 'white', check: chess.inCheck(),
    });
    $('study-replay-move').textContent = replayPly
      ? `${replayPly}/${doc.moves.length} · ${doc.moves[replayPly - 1]}`
      : 'Posición inicial';
    $('study-replay-prev').disabled = replayPly === 0;
    $('study-replay-next').disabled = replayPly === doc.moves.length;
  }
  $('study-replay-prev').addEventListener('click', () => { replayPly--; renderReplay(); });
  $('study-replay-next').addEventListener('click', () => { replayPly++; renderReplay(); });
  function openReplay(game) {
    replayGame = game;
    replayPly = 0;
    $('study-replay-title').textContent = `${game.white} – ${game.black}`;
    replay.showModal();
    replayBoard ||= Chessground($('study-replay-board'), { viewOnly: true, drawable: { enabled: false } });
    renderReplay();
  }
  let library = [], batch, profiles, skipped, job, engine, board, position, example, solved, running;

  async function open({ preferredPlayer = '', games, saved, skipped: omitted = 0 } = {}) {
    if (dialog.open || running) return;
    const entries = await load();
    profiles = entries.filter(entry => entry.role === 'profile');
    library = entries.filter(entry => !entry.role).map(studyGame).filter(Boolean);
    batch = games?.map(studyGame) || saved?.records.map(record => record.game);
    skipped = omitted;
    const users = new Map();
    for (const game of batch || library) {
      for (const name of [game.white, game.black]) users.set(playerKey(name), name);
    }
    const selected = playerKey(preferredPlayer);
    player.replaceChildren(...[...users].sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([key, name]) => new Option(name, key)));
    if (users.has(selected)) player.value = selected;
    $('study-scope').hidden = !batch;
    onlyBatch.checked = Boolean(batch);
    rhythm.value = saved?.rhythm || 'all';
    role.value = saved?.role || '';
    setColorOptions(saved?.color);
    limit.value = 'all';
    single.value = '';
    job = undefined;
    updateSelection();
    if (saved) {
      job = { ...saved, key: selectionKey(selection()), saved: true };
      renderReport();
      progress.hidden = false;
      showProgress(saved.records.length, saved.records.length, 'Estudio guardado.');
      start.textContent = 'Analizar de nuevo';
      $('study-exit').textContent = 'Cerrar estudio';
    }
    dialog.showModal();
  }

  function setColorOptions(value) {
    const rival = role.value === 'rival';
    $('study-color-label').textContent = rival ? 'Jugaré con' : 'Color del jugador';
    const options = rival ? [] : [new Option('Ambos', 'all')];
    color.replaceChildren(...options, new Option('Blancas', 'w'), new Option('Negras', 'b'));
    if (value && [...color.options].some(option => option.value === value)) color.value = value;
  }

  function selection(individual = true) {
    const candidates = batch ? (onlyBatch.checked ? batch : [...batch, ...library]) : library;
    const side = role.value === 'rival' ? (color.value === 'w' ? 'b' : 'w') : color.value;
    const games = selectGames(candidates, player.value, side, rhythm.value, Number(limit.value) || Infinity);
    return individual && single.value ? games.filter(game => game.key === single.value) : games;
  }

  const selectionKey = games => JSON.stringify([role.value, player.value, color.value,
    games.map(game => [game.key, game.colors])]);

  function updateSelection() {
    const selected = single.value, available = selection(false);
    single.replaceChildren(new Option('Conjunto de partidas', ''), ...available.map(game =>
      new Option(`${game.white} – ${game.black} · ${game.date || 'Sin fecha'} · ${game.colors[0] === 'w' ? 'Blancas' : 'Negras'}`, game.key)));
    if (available.some(game => game.key === selected)) single.value = selected;
    const games = selection();
    if (job?.key !== selectionKey(games)) job = undefined;
    status.textContent = games.length
      ? `${games.length} partidas seleccionadas.${skipped ? ` ${skipped} PGN omitidos.` : ''}`
      : 'No hay partidas con jugador y jugadas para esos filtros.';
    progress.hidden = !job;
    if (job) showProgress(job.records.length, games.length);
    results.replaceChildren();
    if (job?.records.length) renderReport();
    start.disabled = !role.value || !games.length;
    start.textContent = !job ? 'Analizar partidas' : job.records.length < games.length ? 'Continuar análisis' : 'Analizar de nuevo';
    updateSave();
  }

  function updateSave() {
    saveButton.hidden = !job?.records.length || Boolean(job.saved);
    $('study-exit').textContent = job?.saved ? 'Cerrar estudio' : 'Salir sin guardar';
  }

  saveButton.addEventListener('click', async () => {
    if (running || !job?.records.length || job.saved) return;
    const current = job;
    saveButton.disabled = true;
    try {
      const { role, player, name, records, plans, color, rhythm } = current;
      await save({ id: 'study:' + crypto.randomUUID(), role, player, name, records,
        plans, color, rhythm, updatedAt: new Date().toISOString() });
      current.saved = true;
      if (job === current) {
        updateSave();
        status.textContent = 'Estudio guardado en la biblioteca.';
      }
    } catch (error) {
      showError(error);
    } finally {
      saveButton.disabled = false;
    }
  });

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
    const rival = job.role === 'rival';
    if (rival) renderPreparation();
    const evidence = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `Partidas analizadas (${job.records.length})`;
    evidence.append(summary);
    for (const { game, findings } of job.records) {
      const line = document.createElement('p');
      line.textContent = `${game.white} – ${game.black} · ${game.colors.map(side => side === 'w' ? 'Blancas' : 'Negras').join(' y ')} · ${rhythms[game.rhythm]} · ${findings.length} posiciones detectadas`;
      const replayButton = document.createElement('button');
      replayButton.type = 'button';
      replayButton.textContent = 'Reproducir partida';
      replayButton.addEventListener('click', () => openReplay(game));
      line.append(' ', replayButton);
      evidence.append(line);
    }
    results.append(evidence);
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
        heading.textContent = rival ? 'Debilidad observada · ' + lesson.title : lesson.title;
        const stats = document.createElement('p');
        stats.textContent = `${pattern.count} de ${group.count} partidas · ${pattern.total} casos.`;
        if (pattern.priorTotal && group.chronological && group.rhythm !== 'unknown') {
          stats.textContent += ` Últimas 10: ${pattern.recent}/10. Anteriores: ${pattern.prior}/${pattern.priorTotal}.`;
        }
        const tip = document.createElement('p');
        tip.textContent = rival ? ({
          mate: 'Cuando el rey quede expuesto, calcula jaques y amenazas de mate.',
          material: 'Busca capturas forzadas y piezas indefensas al calcular la respuesta.',
          king: 'Comprueba si puedes abrir una columna central antes de que el rival asegure su rey.',
          development: 'Considera abrir el centro cuando tus piezas estén mejor desarrolladas.',
          other: 'Revisa la continuación concreta y comprueba si la ventaja se mantiene ante la mejor defensa.',
        })[pattern.kind] : lesson.tip;
        section.append(heading, stats, tip);
        for (const event of pattern.examples) {
          const button = document.createElement('button');
          button.type = 'button';
          if (rival && !event.replyBest) continue;
          const exerciseEvent = rival ? {
            ...event, fen: event.replyFen, best: event.replyBest, color: event.color === 'w' ? 'b' : 'w',
            solution: event.reply, reply: '', afterRivalMove: true,
          } : event;
          const number = event.fen.split(' ')[5];
          button.textContent = `${event.game} · jugada ${number} con ${event.color === 'w' ? 'blancas' : 'negras'}`;
          button.addEventListener('click', () => openExercise(exerciseEvent));
          section.append(button);
        }
      }
      results.append(section);
    }
  }

  function renderPreparation() {
    const title = document.createElement('h3');
    title.textContent = `Preparación con ${job.color === 'w' ? 'blancas' : 'negras'}`;
    const opening = document.createElement('p');
    opening.textContent = 'Las frecuencias se calculan a partir de las partidas analizadas que alcanzaron cada posición. Las jugadas de repertorio proceden de los estudios guardados en Mi perfil. También se muestra la primera opción de Stockfish para comparar.';
    results.append(title, opening);
    for (const plan of job.plans || []) {
      const line = document.createElement('p');
      const describe = choice => choice.familiar
        ? `${choice.san} (repertorio, ${choice.familiar} partidas; Stockfish: ${choice.best})`
        : `${choice.san} (Stockfish)`;
      const beginning = plan.first ? `Empieza con ${describe(plan.first)}. ` : '';
      if (plan.response) {
        line.textContent = `${beginning}Si juega ${plan.move} (${plan.count}/${plan.total}), prepara ${describe(plan.response)}.`;
        if (plan.response.line) line.textContent += ` Variante del motor: ${plan.response.line}.`;
        if (plan.followups.length) line.textContent += ' Continuaciones vistas: ' +
          plan.followups.map(({ reply, frequency }) => `${reply} (${frequency})`).join(', ') + '.';
        if (plan.alternate) line.textContent += ` Ante ${plan.alternate.reply}, considera ${describe(plan.alternate.response)}.`;
      } else {
        line.textContent = beginning + 'La muestra no recoge respuestas del rival a esta salida.';
      }
      results.append(line);
    }
    if (!job.plans?.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Todavía no hay una muestra de apertura para este color.';
      results.append(empty);
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
    feedback.textContent = example.afterRivalMove
      ? `Tu rival acaba de jugar ${example.move}. Juegas con ${color}. Encuentra cómo responder.`
      : name + ' juega con ' + color + '. Encuentra una continuación.';
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
    if (running || !role.value) return;
    const games = selection();
    if (!games.length) return;
    if (!job || job.records.length === games.length) {
      job = { key: selectionKey(games), player: player.value, name: player.selectedOptions[0].text,
        role: role.value, color: color.value, rhythm: rhythm.value, records: [] };
    }
    const worker = new LocalEngine({ options: { Hash: 16 } });
    engine = worker;
    running = true;
    saveButton.hidden = true;
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
      if (job.role === 'rival' && engine === worker) {
        showProgress(job.records.length, games.length, 'Preparando aperturas…');
        const seen = new Set();
        const repertoire = profiles.flatMap(profile => profile.records.map(record => record.game))
          .filter(game => {
            const key = JSON.stringify([game.key, game.colors]);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        job.plans = await prepareOpening(job.records.map(record => record.game), repertoire,
          job.color, (fen, depth) => worker.analyze(fen, depth));
      }
    } catch (error) {
      if (engine === worker) message = error.message;
    } finally {
      const paused = engine !== worker;
      worker.destroy();
      engine = undefined;
      running = false;
      for (const filter of filters) filter.disabled = false;
      pause.disabled = true;
      if (!dialog.open) { job = undefined; return; }
      start.disabled = false;
      start.textContent = job.records.length < games.length ? 'Continuar análisis' : 'Analizar de nuevo';
      showProgress(job.records.length, games.length, message || (paused
        ? 'Análisis en pausa. Se conservan las partidas completadas mientras esta pestaña siga abierta.'
        : 'Análisis terminado.'));
      if (job.records.length) renderReport();
      updateSave();
    }
  });

  function stop() {
    const worker = engine;
    engine = undefined;
    worker?.destroy();
  }

  pause.addEventListener('click', stop);
  dialog.addEventListener('close', () => {
    stop();
    if (!running) job = undefined;
    batch = undefined;
  });
  role.addEventListener('change', () => setColorOptions());
  for (const filter of filters) filter.addEventListener('change', updateSelection);
  $('study-open').addEventListener('click', () => open().catch(showError));
  return open;
}
