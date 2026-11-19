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
})();
