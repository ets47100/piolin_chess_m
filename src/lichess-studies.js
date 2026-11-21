// SPDX-License-Identifier: GPL-3.0-or-later
import { newDocument, pgnHeader, validateDocument } from './model.js';
import { pgnMainLine } from './variations.js';

const origin = 'https://lichess.org';

function studyPath(link) {
  const url = new URL(link);
  const match = url.pathname.match(/^\/study\/([a-zA-Z0-9]{8})(?:\/([a-zA-Z0-9]{8}))?\/?$/);
  if (url.origin !== origin || !match) throw Error('Pega un enlace público de Lichess con el formato lichess.org/study/…');
  return match.slice(1);
}

export function studyChapter(doc) {
  const source = pgnHeader(doc.sourcePgn || '', 'ChapterURL');
  return /^lichess:[a-zA-Z0-9]{8}:[a-zA-Z0-9]{8}$/.test(doc.id) &&
    /^https:\/\/lichess\.org\/study\/[a-zA-Z0-9]{8}\/[a-zA-Z0-9]{8}$/.test(source) ? source : '';
}

export function parseChapters(pgn, studyId) {
  const chapters = [];
  let omitted = 0;
  for (const text of pgn.trim().split(/\r?\n(?:[ \t]*\r?\n)+(?=\[Event\s)/)) {
    try {
      const [study, chapter] = studyPath(pgnHeader(text, 'ChapterURL'));
      const variant = pgnHeader(text, 'Variant').toLowerCase();
      if (study !== studyId || !chapter || (variant && !['standard', 'chess', 'from position'].includes(variant))) {
        throw Error('Capítulo no compatible.');
      }
      if (text.length > 2000000) throw Error('Capítulo demasiado grande.');
      const doc = newDocument();
      doc.id = 'lichess:' + study + ':' + chapter;
      doc.initialFen = pgnHeader(text, 'FEN') || doc.initialFen;
      doc.moves = pgnMainLine(doc.initialFen, text);
      doc.sourcePgn = text;
      doc.title = (pgnHeader(text, 'ChapterName') || pgnHeader(text, 'Event') || doc.title).slice(0, 200);
      doc.orientation = pgnHeader(text, 'Orientation') === 'black' ? 'black' : 'white';
      chapters.push(validateDocument(doc));
    } catch {
      omitted++;
    }
  }
  if (!chapters.length) throw Error('Este estudio no contiene capítulos públicos de ajedrez estándar que Piolín pueda abrir.');
  return { chapters, omitted };
}

function credit(doc, name) {
  return pgnHeader(doc.sourcePgn, name);
}

export function setupLichessStudies(get, store, updateLibrary) {
  const dialog = get('lichess-studies'), form = get('lichess-study-form');
  const status = get('lichess-study-status'), box = get('lichess-study-chapters');
  const save = get('lichess-study-save'), fetchButton = get('lichess-study-fetch');
  let chapters = [];
  get('lichess-studies-open').addEventListener('click', () => dialog.showModal());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (fetchButton.disabled || save.disabled) return;
    fetchButton.disabled = true;
    chapters = [];
    box.replaceChildren();
    save.hidden = true;
    status.textContent = 'Buscando capítulos…';
    try {
      const [studyId, chapterId] = studyPath(get('lichess-study-url').value.trim());
      const path = studyId + (chapterId ? '/' + chapterId : '');
      const response = await fetch(origin + '/api/study/' + path + '.pgn?clocks=false&comments=true&variations=true&orientation=true', {
        signal: AbortSignal.timeout(25000), credentials: 'omit',
      });
      if (!response.ok) throw Error(response.status === 429 ? 'Lichess pide esperar antes de volver a buscar.' : 'Lichess no ha devuelto el estudio. Comprueba que el enlace sea público.');
      const result = parseChapters(await response.text(), studyId);
      chapters = result.chapters;
      const existing = new Set((await store.all()).map(doc => doc.id));
      const title = credit(chapters[0], 'StudyName') || chapters[0].title;
      status.textContent = title + ' · ' + chapters.length + ' capítulos disponibles.' +
        (result.omitted ? ' ' + result.omitted + ' capítulos omitidos por incompatibilidad.' : '');
      for (const chapter of chapters) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = chapter.id;
        input.disabled = existing.has(chapter.id);
        input.checked = !input.disabled;
        const annotator = credit(chapter, 'Annotator').replace(/^https:\/\/lichess\.org\/@\//, '');
        label.append(input, ' ' + chapter.title + (annotator ? ' · Anotaciones de ' + annotator : '') +
          (input.disabled ? ' · Ya guardado' : ''));
        box.append(label);
      }
      save.hidden = !box.querySelector('input:enabled');
    } catch (error) {
      status.textContent = error.message;
    } finally {
      fetchButton.disabled = false;
    }
  });
  save.addEventListener('click', async () => {
    const selected = new Set([...box.querySelectorAll('input:checked:enabled')].map(input => input.value));
    if (!selected.size) {
      status.textContent = 'Selecciona al menos un capítulo.';
      return;
    }
    save.disabled = true;
    try {
      const added = await store.importChapters(chapters.filter(doc => selected.has(doc.id)));
      await updateLibrary();
      status.textContent = added ? added + ' capítulos guardados en la biblioteca.' : 'Esos capítulos ya estaban guardados.';
      for (const input of box.querySelectorAll('input:checked:enabled')) {
        input.checked = false;
        input.disabled = true;
        input.parentElement.append(' · Ya guardado');
      }
      save.hidden = !box.querySelector('input:enabled');
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });
}
