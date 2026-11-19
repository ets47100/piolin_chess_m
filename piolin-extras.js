// SPDX-License-Identifier: GPL-3.0-or-later
(() => {
  const $ = id => document.getElementById(id);

  // --- 1. MOTOR DEDICADO PARA JUGAR VS MÁQUINA Y REVISIÓN GM ---
  let botWorker = null;
  let botActive = false;
  let botColor = 'b'; // 'b' = máquina juega negras, 'w' = máquina juega blancas
  let botSkill = 10;
  let clockInterval = null;
  let timeWhite = 600, timeBlack = 600;
  let lastSeenMovesCount = 0;

  function initBotWorker() {
    if (botWorker) return botWorker;
    botWorker = new Worker('engine/stockfish-19-lite-single.js');
    botWorker.postMessage('uci');
    botWorker.postMessage('setoption name Hash value 16');
    botWorker.postMessage('isready');
    return botWorker;
  }

  function formatClock(sec) {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateClocksUI() {
    const flipped = $('top-player')?.textContent === 'Blancas';
    if ($('clock-top')) $('clock-top').textContent = formatClock(flipped ? timeWhite : timeBlack);
    if ($('clock-bottom')) $('clock-bottom').textContent = formatClock(flipped ? timeBlack : timeWhite);
  }

  // Lee las jugadas actuales desde la lista del DOM y pide jugada a Stockfish
  function getMovesListFromUI() {
    const buttons = [...document.querySelectorAll('#moves .move-button')];
    return buttons.map(b => b.textContent.trim());
  }

  // --- 2. CONSEJOS DE GRAN MAESTRO EN TIEMPO REAL ---
  function generateGMAdvice(scoreText, pvText, plyCount) {
    if (!scoreText || scoreText === '—') return 'Pulsa «Analizar» para recibir la recomendación del Gran Maestro en esta posición.';
    const bestMove = pvText ? pvText.split(/\s+/).slice(0, 4).join(' ') : '';
    if (scoreText.includes('#')) {
      return `¡Secuencia de mate detectada (${scoreText})! Calcula con precisión los jaques forzados: ${bestMove}.`;
    }
    const val = parseFloat(scoreText.replace(/[≥≤+]/g, ''));
    if (isNaN(val)) return `Línea principal recomendada por el GM: ${bestMove}`;

    const phase = plyCount < 16 ? 'Apertura' : plyCount < 55 ? 'Medio juego' : 'Final';
    let plan = '';
    if (Math.abs(val) < 0.45) {
      plan = 'Posición equilibrada. Prioriza mejorar tu pieza peor colocada y controlar las casillas centrales.';
    } else if (val >= 0.45 && val < 1.5) {
      plan = 'Ligera ventaja blanca. Presiona sin precipitar simplificaciones y busca crear debilidades en la estructura rival.';
    } else if (val <= -0.45 && val > -1.5) {
      plan = 'Ligera ventaja negra. Mantén la tensión dinámica y coordina tus piezas hacia las columnas abiertas.';
    } else if (val >= 1.5) {
      plan = 'Ventaja decisiva para blancas. Simplifica piezas (no peones) para evitar contrajuego y convierte la ventaja.';
    } else {
      plan = 'Ventaja decisiva para negras. Busca rupturas directas o cambios de piezas que neutralicen la defensa blanca.';
    }
    return `[${phase}] ${plan} Mejor continuación: ${bestMove}.`;
  }

  // Observar cambios en la evaluación para actualizar el consejo de GM automáticamente
  const scoreEl = $('score');
  if (scoreEl) {
    const obs = new MutationObserver(() => {
      const ply = document.querySelectorAll('#moves .move-button').length;
      if ($('gm-advice-text')) {
        $('gm-advice-text').textContent = generateGMAdvice(scoreEl.textContent, $('pv')?.textContent || '', ply);
      }
    });
    obs.observe(scoreEl, { childList: true, characterData: true, subtree: true });
  }

  // --- 3. JUGAR CONTRA LA MÁQUINA (RESPUESTA AUTOMÁTICA) ---
  function triggerBotReplyIfNeeded() {
    if (!botActive) return;
    const turnText = $('turn-status')?.textContent || '';
    if (turnText.includes('mate') || turnText.includes('Tablas') || turnText.includes('Ahogado')) {
      botActive = false;
      clearInterval(clockInterval);
      return;
    }
    const isWhiteTurn = turnText.includes('blancas');
    const isBotTurn = (botColor === 'w' && isWhiteTurn) || (botColor === 'b' && !isWhiteTurn);
    if (!isBotTurn) return;

    // Activar análisis automático de un toque para que el motor sugiera y ejecute la jugada
    const w = initBotWorker();
    const depthBySkill = { 1: 4, 5: 7, 10: 10, 15: 13, 20: 16 }[botSkill] || 10;
    $('gm-advice-text').textContent = '🤖 Piolín está pensando su jugada…';

    // Si el botón Analizar no está encendido, lo encendemos brevemente para leer la flecha del tablero o simulamos el toque en el tablero
    if ($('engine-toggle') && !$('engine-toggle').classList.contains('running') && !$('engine-toggle').disabled) {
      $('engine-toggle').click();
    }
  }

  // Vigilar cada vez que el jugador hace una jugada en el tablero durante una partida vs Máquina
  const movesContainer = $('moves');
  if (movesContainer) {
    new MutationObserver(() => {
      const currentCount = document.querySelectorAll('#moves .move-button').length;
      if (botActive && currentCount !== lastSeenMovesCount) {
        lastSeenMovesCount = currentCount;
        setTimeout(() => {
          const turnText = $('turn-status')?.textContent || '';
          const isWhiteTurn = turnText.includes('blancas');
          const isBotTurn = (botColor === 'w' && isWhiteTurn) || (botColor === 'b' && !isWhiteTurn);
          if (isBotTurn) {
            // Pedimos a la variante principal de Stockfish que mueva en el tablero tras 900ms
            setTimeout(playEngineBestMoveOnBoard, 1100);
          }
        }, 250);
      }
    }).observe(movesContainer, { childList: true, subtree: true });
  }

  function playEngineBestMoveOnBoard() {
    if (!botActive) return;
    // Leer la flecha verde que dibuja Stockfish en Chessground (orig -> dest)
    const shape = document.querySelector('cg-container svg.cg-shapes line');
    const pvText = $('pv')?.textContent || '';
    // Si el motor ya calculó la mejor jugada en el PV, la ejecutamos simulando el movimiento en el PGN actual
    const firstSanMatch = pvText.match(/(?:\d+\.+|\d+…)\s*([O0-O0-]+|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/);
    if (firstSanMatch) {
      const san = firstSanMatch[1];
      const moves = getMovesListFromUI();
      moves.push(san);
      const pgn = moves.map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m)).join(' ');
      $('import-text').value = `[Event "Partida vs Piolín Nivel ${botSkill}"]\n\n${pgn}`;
      // Cargar sin pedir confirmación
      const origConfirm = window.confirm;
      window.confirm = () => true;
      $('import-confirm').click();
      window.confirm = origConfirm;
      $('gm-advice-text').textContent = `🤖 Piolín ha jugado ${san}. ¡Es tu turno!`;
    }
  }

  $('play-bot-open')?.addEventListener('click', () => $('bot-dialog')?.showModal());
  $('bot-start')?.addEventListener('click', () => {
    botColor = $('bot-color').value === 'w' ? 'b' : 'w';
    botSkill = Number($('bot-strength').value);
    const totalSec = Number($('bot-time').value);
    botActive = true;
    lastSeenMovesCount = 0;
    $('mode-badge').textContent = `VS MÁQUINA`;

    if (totalSec > 0) {
      timeWhite = totalSec; timeBlack = totalSec;
      $('clock-top').hidden = false; $('clock-bottom').hidden = false;
      updateClocksUI();
      clearInterval(clockInterval);
      clockInterval = setInterval(() => {
        if (!botActive) return;
        const isWhiteTurn = ($('turn-status')?.textContent || '').includes('blancas');
        if (isWhiteTurn) timeWhite--; else timeBlack--;
        updateClocksUI();
        if (timeWhite <= 0 || timeBlack <= 0) {
          botActive = false; clearInterval(clockInterval);
          alert(timeWhite <= 0 ? '¡Tiempo agotado para las blancas!' : '¡Tiempo agotado para las negras!');
        }
      }, 1000);
    } else {
      $('clock-top').hidden = true; $('clock-bottom').hidden = true;
      clearInterval(clockInterval);
    }

    const origConfirm = window.confirm;
    window.confirm = () => true;
    $('new-game').click();
    if ($('bot-color').value === 'b' && $('top-player').textContent !== 'Blancas') $('flip').click();
    if ($('bot-color').value === 'w' && $('top-player').textContent === 'Blancas') $('flip').click();
    window.confirm = origConfirm;

    if ($('engine-toggle') && !$('engine-toggle').classList.contains('running') && !$('engine-toggle').disabled) {
      $('engine-toggle').click();
    }
    $('bot-dialog').close();
    if (botColor === 'w') setTimeout(playEngineBestMoveOnBoard, 1200);
  });

  $('bot-stop')?.addEventListener('click', () => {
    botActive = false; clearInterval(clockInterval);
    $('mode-badge').textContent = 'ANÁLISIS';
    $('bot-dialog').close();
  });

  // --- 4. IMPORTADOR DESDE LICHESS Y CHESS.COM (50, 100, 200 Y MODALIDAD) ---
  const openOnlineModal = () => $('online-dialog')?.showModal();
  $('online-open')?.addEventListener('click', openOnlineModal);
  $('online-btn-quick')?.addEventListener('click', openOnlineModal);

  $('online-fetch-btn')?.addEventListener('click', async () => {
    const platform = $('online-platform').value;
    const user = $('online-user').value.trim();
    const max = Number($('online-max').value);
    const perf = $('online-perf').value;
    const status = $('online-status');
    const resultsBox = $('online-results');

    if (!user) { status.textContent = 'Escribe un nombre de usuario.'; return; }
    status.textContent = `Conectando con ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`;
    resultsBox.innerHTML = '';

    try {
      let pgns = [];
      if (platform === 'lichess') {
        const perfParam = perf !== 'all' ? `&perfType=${encodeURIComponent(perf)}` : '';
        const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}${perfParam}&pgnInJson=false`;
        const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
        if (!res.ok) throw new Error(`Usuario no encontrado en Lichess (${res.status}).`);
        const raw = await res.text();
        pgns = raw.split(/\n\n(?=\[Event\s)/).map(s => s.trim()).filter(Boolean);
      } else {
        const arcRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
        if (!arcRes.ok) throw new Error('Usuario no encontrado en Chess.com.');
        const { archives } = await arcRes.json();
        for (const archiveUrl of archives.slice(-4).reverse()) {
          if (pgns.length >= max) break;
          const mRes = await fetch(archiveUrl);
          const mData = await mRes.json();
          for (const g of (mData.games || []).reverse()) {
            if (perf !== 'all' && g.time_class !== perf) continue;
            if (g.pgn) pgns.push(g.pgn.trim());
            if (pgns.length >= max) break;
          }
        }
      }

      if (!pgns.length) {
        status.textContent = 'No se encontraron partidas con esos filtros.';
        return;
      }
      status.textContent = `✓ ${pgns.length} partidas encontradas. Toca «Analizar» en la que quieras ver:`;
      resultsBox.innerHTML = pgns.map((pgn, idx) => {
        const w = (pgn.match(/\[White\s+"([^"]+)"\]/) || [,'Blancas'])[1];
        const b = (pgn.match(/\[Black\s+"([^"]+)"\]/) || [,'Negras'])[1];
        const r = (pgn.match(/\[Result\s+"([^"]+)"\]/) || [,'*'])[1];
        const d = (pgn.match(/\[(?:UTCDate|Date)\s+"([^"]+)"\]/) || [,''])[1];
        return `<div class="library-item">
          <div class="library-description">
            <strong>${idx + 1}. ${w} vs ${b} (${r})</strong>
            <small>${d}</small>
          </div>
          <button type="button" data-load-idx="${idx}" class="primary">Analizar</button>
        </div>`;
      }).join('');

      resultsBox.onclick = e => {
        const btn = e.target.closest('[data-load-idx]');
        if (!btn) return;
        const chosenPgn = pgns[Number(btn.dataset.loadIdx)];
        $('import-text').value = chosenPgn;
        const origConfirm = window.confirm;
        window.confirm = () => true;
        $('import-confirm').click();
        window.confirm = origConfirm;
        $('online-dialog').close();
      };
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
    }
  });

  // --- 5. REVISIÓN DE FALLOS DE LA PARTIDA (ENTRENADOR GM) ---
  const enableAuditCheck = setInterval(() => {
    if ($('engine-toggle') && !$('engine-toggle').disabled && $('gm-audit-btn')) {
      $('gm-audit-btn').disabled = false;
      clearInterval(enableAuditCheck);
    }
  }, 500);

  let detectedMistakes = [];
  let mistakeCursor = -1;

  $('gm-audit-btn')?.addEventListener('click', async () => {
    const moveButtons = [...document.querySelectorAll('#moves .move-button')];
    if (!moveButtons.length) {
      alert('Carga o juega primero una partida para poder revisar sus fallos.');
      return;
    }
    $('mistakes-panel').hidden = false;
    $('mistakes-summary').textContent = 'Analizando jugadas en busca de fallos…';
    $('mistakes-list').innerHTML = '';
    detectedMistakes = [];

    // Activamos el motor si estaba pausado
    if (!$('engine-toggle').classList.contains('running')) $('engine-toggle').click();

    let prevEval = 0;
    for (let i = 0; i < moveButtons.length; i++) {
      moveButtons[i].click();
      $('mistakes-summary').textContent = `Revisando jugada ${i + 1} de ${moveButtons.length}…`;
      await new Promise(r => setTimeout(r, 420));
      const rawScore = $('score')?.textContent || '0';
      const val = rawScore.includes('#') ? (rawScore.includes('-') ? -10 : 10) : parseFloat(rawScore.replace(/[≥≤+]/g, '')) || 0;
      const diff = (i % 2 === 0) ? (prevEval - val) : (val - prevEval);

      if (i > 1 && diff >= 0.75) {
        const type = diff >= 2.0 ? { tag: '?? Grave', cls: 'badge-blunder' } :
                     diff >= 1.2 ? { tag: '? Error', cls: 'badge-mistake' } :
                                   { tag: '?! Imprecisión', cls: 'badge-inaccuracy' };
        const moveNum = Math.floor(i / 2) + 1;
        const side = i % 2 === 0 ? `${moveNum}.` : `${moveNum}...`;
        detectedMistakes.push({ ply: i + 1, label: `${side} ${moveButtons[i].textContent}`, diff: diff.toFixed(2), ...type });
      }
      prevEval = val;
    }

    $('mistakes-summary').textContent = `Fallos encontrados: ${detectedMistakes.length}`;
    if (!detectedMistakes.length) {
      $('mistakes-list').innerHTML = '<p style="font-size:12px;margin:4px 0;">¡Partida muy precisa! No se detectaron pérdidas graves.</p>';
      return;
    }
    $('mistakes-list').innerHTML = detectedMistakes.map((m, idx) => `
      <div class="mistake-item" data-mistake-ply="${m.ply}">
        <span><strong>${m.label}</strong> (pierde ${m.diff} peones)</span>
        <span class="${m.cls}">${m.tag}</span>
      </div>
    `).join('');

    $('mistakes-list').onclick = e => {
      const item = e.target.closest('[data-mistake-ply]');
      if (!item) return;
      const targetPly = Number(item.dataset.mistakePly);
      const btn = document.querySelector(`#moves .move-button[data-ply="${targetPly}"]`);
      btn?.click();
    };
  });

  $('next-mistake-btn')?.addEventListener('click', () => {
    if (!detectedMistakes.length) return;
    mistakeCursor = (mistakeCursor + 1) % detectedMistakes.length;
    const targetPly = detectedMistakes[mistakeCursor].ply;
    document.querySelector(`#moves .move-button[data-ply="${targetPly}"]`)?.click();
  });
})();
