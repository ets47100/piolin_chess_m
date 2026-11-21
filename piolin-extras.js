// SPDX-License-Identifier: GPL-3.0-or-later
// El modo contra máquina, los relojes y la revisión de fallos viven en src/app.js.
(() => {
  const $ = id => document.getElementById(id);

  // --- CONSEJOS DE GRAN MAESTRO EN TIEMPO REAL ---
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

  // --- IMPORTADOR DESDE LICHESS Y CHESS.COM ---
  const openOnlineModal = () => $('online-dialog')?.showModal();
  $('online-open')?.addEventListener('click', openOnlineModal);
  $('online-btn-quick')?.addEventListener('click', openOnlineModal);

  const search = $('online-fetch-btn'), save = $('online-save-all');
  let found = [], foundUser = '';
  save.addEventListener('click', async () => {
    search.disabled = save.disabled = true;
    try {
      $('online-status').textContent = await new Promise((resolve, reject) => {
        document.dispatchEvent(new CustomEvent('piolin:study-pgn-batch', {
          detail: { pgns: found, player: foundUser, resolve, reject },
        }));
      });
    } catch (error) {
      $('online-status').textContent = error.message;
    } finally {
      search.disabled = save.disabled = false;
    }
  });

  search?.addEventListener('click', async () => {
    const platform = $('online-platform').value;
    const user = $('online-user').value.trim();
    const max = Number($('online-max').value);
    const perf = $('online-perf').value;
    const status = $('online-status');
    const resultsBox = $('online-results');

    if (!user) { status.textContent = 'Escribe un nombre de usuario.'; return; }
    status.textContent = `Conectando con ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`;
    resultsBox.innerHTML = '';

    search.disabled = true;
    save.hidden = true;
    found = [];
    try {
      let pgns = [];
      if (platform === 'lichess') {
        const perfParam = perf !== 'all' ? `&perfType=${encodeURIComponent(perf)}` : '';
        const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}${perfParam}&pgnInJson=false&clocks=true`;
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
            if (g.pgn) {
              const rhythm = ['bullet', 'blitz', 'rapid', 'classical', 'daily'].includes(g.time_class)
                ? g.time_class : 'unknown';
              pgns.push(g.pgn.trim().replace(/\r?\n\r?\n/, `\n[PiolinRhythm "${rhythm}"]\n\n`));
            }
            if (pgns.length >= max) break;
          }
        }
      }

      if (!pgns.length) {
        status.textContent = 'No se encontraron partidas con esos filtros.';
        return;
      }
      found = pgns;
      foundUser = user;
      save.hidden = false;
      status.textContent = `${pgns.length} partidas encontradas. Estudia el conjunto o elige una partida.`;
      pgns.forEach((pgn, idx) => {
        const header = key => pgn.match(new RegExp('\\[' + key + '\\s+"([^"]+)"\\]'))?.[1] || '';
        const row = document.createElement('div'), description = document.createElement('div');
        const names = document.createElement('strong'), date = document.createElement('small');
        const button = document.createElement('button');
        row.className = 'library-item';
        description.className = 'library-description';
        names.textContent = `${idx + 1}. ${header('White')} — ${header('Black')} (${header('Result')})`;
        date.textContent = header('UTCDate') || header('Date');
        description.append(names, date);
        button.type = 'button';
        button.dataset.loadIdx = idx;
        button.className = 'primary';
        button.textContent = 'Estudiar partida';
        row.append(description, button);
        resultsBox.append(row);
      });

      resultsBox.onclick = e => {
        const btn = e.target.closest('[data-load-idx]');
        if (!btn) return;
        document.dispatchEvent(new CustomEvent('piolin:open-online-game', {
          detail: { pgn: pgns[Number(btn.dataset.loadIdx)], player: user },
        }));
      };
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
    } finally {
      search.disabled = false;
    }
  });
})();
