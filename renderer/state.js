export const state = {
  verses: [],
  activeVerseId: null,
  verseCounter: 0,
  capo: 0,
  structure: {
    lines: [],
    autoTitles: true,
  },
};

export function generateVerseId() {
  state.verseCounter++;
  return 'verse-' + state.verseCounter + '-' + Date.now().toString(36);
}

// ---- Синхронизация verses <-> structure ----

// Найти индекс heading-строки в structure.lines, привязанной к verseId
export function findStructureHeadingIndex(verseId) {
  return state.structure.lines.findIndex(
    l => l.type === 'heading' && l.verseId === verseId
  );
}

// Создать блок (heading + chordline) для нового куплета
export function addVerseToStructure(verse) {
  // Если блок для этого куплета уже есть — не дублируем
  if (findStructureHeadingIndex(verse.id) !== -1) return;

  const headingIdx = state.structure.lines.length;
  state.structure.lines.push({
    type: 'heading',
    text: verse.title,
    verseId: verse.id,
  });
  state.structure.lines.push({
    type: 'chordline',
    chords: verse.chords.map(c => c.name),
    lyrics: '',
    verseId: verse.id,
  });
}

// Обновить heading и chordline для куплета
export function syncVerseToStructure(verse) {
  const idx = findStructureHeadingIndex(verse.id);
  if (idx === -1) {
    // Блока нет — добавим
    addVerseToStructure(verse);
    return;
  }

  // Обновить heading
  state.structure.lines[idx].text = verse.title;

  // Найти chordline сразу после heading (до следующего heading)
  let chordlineIdx = -1;
  for (let i = idx + 1; i < state.structure.lines.length; i++) {
    if (state.structure.lines[i].type === 'heading') break;
    if (state.structure.lines[i].type === 'chordline' && state.structure.lines[i].verseId === verse.id) {
      chordlineIdx = i;
      break;
    }
  }

  if (chordlineIdx !== -1) {
    state.structure.lines[chordlineIdx].chords = verse.chords.map(c => c.name);
  } else {
    // chordline пропал (пользователь удалил вручную) — вернём
    state.structure.lines.splice(idx + 1, 0, {
      type: 'chordline',
      chords: verse.chords.map(c => c.name),
      lyrics: '',
      verseId: verse.id,
    });
  }
}

// Удалить блок куплета из structure.lines
export function removeVerseFromStructure(verseId) {
  const idx = findStructureHeadingIndex(verseId);
  if (idx === -1) return;

  // Удаляем heading
  state.structure.lines.splice(idx, 1);

  // Удаляем идущие следом строки с тем же verseId (chordline, lyrics, пустые), до следующего heading
  while (idx < state.structure.lines.length && state.structure.lines[idx].type !== 'heading') {
    state.structure.lines.splice(idx, 1);
  }
}
