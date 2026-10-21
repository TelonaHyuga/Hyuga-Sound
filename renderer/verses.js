import {
  state,
  generateVerseId,
  addVerseToStructure,
  syncVerseToStructure,
  removeVerseFromStructure,
} from './state.js';
import { drawChordSVG } from './chord-svg.js';
import { t } from './i18n.js';

const versesWrapper = document.getElementById('verses-wrapper');
const addVerseBtn = document.getElementById('addVerseBtn');

// Уведомляем structure.js о том, что надо перерисоваться — без прямого импорта
function notifyStructureChanged() {
  window.dispatchEvent(new CustomEvent('structure:changed'));
}

// ---- Добавление куплета ----
export function addVerse(title) {
  const id = generateVerseId();
  const defaultTitle = `${t('verses.add')} ${state.verses.length + 1}`;
  const verse = {
    id,
    title: title || defaultTitle,
    chords: [],
  };
  state.verses.push(verse);
  if (!state.activeVerseId) state.activeVerseId = id;

  addVerseToStructure(verse);      // синхронизация
  notifyStructureChanged();

  renderVerses();
  return id;
}

// ---- Удаление куплета ----
export function deleteVerse(id) {
  const idx = state.verses.findIndex(v => v.id === id);
  if (idx === -1) return;

  removeVerseFromStructure(id);    // синхронизация
  state.verses.splice(idx, 1);

  if (state.activeVerseId === id) {
    state.activeVerseId = state.verses.length > 0 ? state.verses[0].id : null;
  }

  notifyStructureChanged();
  renderVerses();
}

// ---- Выбор активного куплета ----
export function setActiveVerse(id) {
  state.activeVerseId = id;
  renderVerses();
}

// ---- Закрепление аккорда ----
export function pinChordToActiveVerse(c) {
  if (!state.activeVerseId) addVerse();
  const verse = state.verses.find(v => v.id === state.activeVerseId);
  if (!verse) return;

  verse.chords.push({ ...c });
  syncVerseToStructure(verse);     // синхронизация
  notifyStructureChanged();

  renderVerses();
}

// ---- Рендер всех куплетов ----
export function renderVerses() {
  versesWrapper.innerHTML = '';

  if (state.verses.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:#555;padding:1rem;';
    empty.textContent = t('verses.empty');
    versesWrapper.appendChild(empty);
    return;
  }

  state.verses.forEach((verse) => {
    const verseEl = document.createElement('div');
    verseEl.className = 'verse';
    verseEl.dataset.verseId = verse.id;
    if (verse.id === state.activeVerseId) {
      verseEl.style.borderColor = 'rgba(124,196,255,0.45)';
      verseEl.style.boxShadow = '0 0 0 1px rgba(124,196,255,0.25), var(--shadow)';
    }

    const header = document.createElement('div');
    header.className = 'verse-header';

    const handle = document.createElement('span');
    handle.className = 'verse-drag-handle';
    handle.textContent = '⠿';
    handle.title = t('verses.dragHandle');
    header.appendChild(handle);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'verse-title-wrap';

    const titleInput = document.createElement('input');
    titleInput.className = 'verse-title';
    titleInput.type = 'text';
    titleInput.value = verse.title;
    titleInput.placeholder = t('verses.titlePlaceholder');
    titleInput.title = t('verses.titleTitle');

    // Изменение названия — синхронизируем с structure
    titleInput.addEventListener('input', () => {
      verse.title = titleInput.value;
      syncVerseToStructure(verse);
      // Не перерисовываем весь structure (потеряется фокус) —
      // просто шлём событие, structure.js точечно обновит heading
      window.dispatchEvent(new CustomEvent('structure:heading-changed', {
        detail: { verseId: verse.id, text: verse.title }
      }));
    });

    titleInput.addEventListener('focus', () => {
      state.activeVerseId = verse.id;
      Array.from(versesWrapper.querySelectorAll('.verse')).forEach(el => {
        const id = el.dataset.verseId;
        if (id === state.activeVerseId) {
          el.style.borderColor = 'rgba(124,196,255,0.45)';
          el.style.boxShadow = '0 0 0 1px rgba(124,196,255,0.25), var(--shadow)';
        } else {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }
      });
      Array.from(versesWrapper.querySelectorAll('.verse')).forEach(el => {
        const id = el.dataset.verseId;
        const btn = el.querySelector('.verse-actions .btn[data-role="select"]');
        if (btn) {
          if (id === state.activeVerseId) {
            btn.className = 'btn btn-sm btn-green';
            btn.textContent = t('verses.active');
          } else {
            btn.className = 'btn btn-sm btn-blue';
            btn.textContent = t('verses.select');
          }
        }
      });
    });

    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') titleInput.blur();
    });
    titleWrap.appendChild(titleInput);

    const editHint = document.createElement('span');
    editHint.className = 'verse-title-edit-hint';
    editHint.textContent = '✎';
    editHint.title = t('verses.titleEdit');
    editHint.style.pointerEvents = 'auto';
    editHint.style.cursor = 'pointer';
    editHint.addEventListener('click', (e) => {
      e.stopPropagation();
      titleInput.focus();
      titleInput.select();
    });
    titleWrap.appendChild(editHint);

    header.appendChild(titleWrap);

    const actions = document.createElement('div');
    actions.className = 'verse-actions';

    const selectBtn = document.createElement('button');
    selectBtn.dataset.role = 'select';
    selectBtn.className = 'btn btn-sm ' + (verse.id === state.activeVerseId ? 'btn-green' : 'btn-blue');
    selectBtn.textContent = verse.id === state.activeVerseId ? t('verses.active') : t('verses.select');
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveVerse(verse.id);
    });
    actions.appendChild(selectBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-orange';
    clearBtn.textContent = t('verses.clear');
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (verse.chords.length === 0) return;
      if (confirm(t('verses.clearConfirm') + verse.title + '»?')) {
        verse.chords = [];
        syncVerseToStructure(verse);
        notifyStructureChanged();
        renderVerses();
      }
    });
    actions.appendChild(clearBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-red';
    delBtn.textContent = '✕';
    delBtn.title = t('verses.deleteTitle');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(t('verses.deleteConfirm') + verse.title + t('verses.deleteConfirm2'))) {
        deleteVerse(verse.id);
      }
    });
    actions.appendChild(delBtn);

    header.appendChild(actions);
    verseEl.appendChild(header);

    const pinnedContainer = document.createElement('div');
    pinnedContainer.className = 'pinned-container';

    if (verse.chords.length === 0) {
      const hint = document.createElement('span');
      hint.className = 'empty-hint';
      hint.textContent = t('verses.pinnedHint');
      pinnedContainer.appendChild(hint);
    } else {
      verse.chords.forEach((c, cIdx) => {
        const el = document.createElement('div');
        el.className = 'pinned-chord' + (c.power ? ' power' : '');
        el.dataset.verseId = verse.id;
        el.dataset.chordIndex = cIdx;
        el.innerHTML = `<span>${c.name}</span>${drawChordSVG(c.frets, c.startFret, 100)}`;
        el.title = t('verses.pinnedTitle');
        el.addEventListener('pointerdown', onChordPointerDown);
        pinnedContainer.appendChild(el);
      });
    }

    verseEl.appendChild(pinnedContainer);

    verseEl.addEventListener('click', (e) => {
      if (e.target.closest('button, input, .pinned-chord, .verse-title-edit-hint')) return;
      setActiveVerse(verse.id);
    });

    versesWrapper.appendChild(verseEl);
  });
}

// ============ CHORD DRAG & REORDER ============
let dragState = null;

function onChordPointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const el = e.currentTarget;
  const verseId = el.dataset.verseId;
  const chordIndex = Number(el.dataset.chordIndex);

  dragState = {
    el, verseId, chordIndex,
    startX: e.clientX, startY: e.clientY,
    dragging: false, pointerId: e.pointerId,
    targetEl: null, insertBefore: true,
  };
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove', onChordPointerMove);
  el.addEventListener('pointerup', onChordPointerUp);
  el.addEventListener('pointercancel', onChordPointerUp);
}

function onChordPointerMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.dragging) {
    if (Math.hypot(dx, dy) < 6) return;
    dragState.dragging = true;
    dragState.el.classList.add('dragging');
  }
  dragState.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
  updateChordPlaceholder(e.clientX, e.clientY);
}

function updateChordPlaceholder(x, y) {
  const container = dragState.el.parentElement;
  const items = Array.from(container.querySelectorAll('.pinned-chord')).filter(el => el !== dragState.el);
  items.forEach(el => el.classList.remove('placeholder'));
  if (items.length === 0) return;
  let closest = null, closestDist = Infinity, insertBefore = true;
  items.forEach(el => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(x - cx, y - cy);
    if (d < closestDist) {
      closestDist = d; closest = el; insertBefore = x < cx;
    }
  });
  if (closest) {
    closest.classList.add('placeholder');
    dragState.targetEl = closest;
    dragState.insertBefore = insertBefore;
  }
}

function onChordPointerUp(e) {
  if (!dragState) return;
  const { el, dragging, pointerId, verseId, chordIndex } = dragState;
  el.removeEventListener('pointermove', onChordPointerMove);
  el.removeEventListener('pointerup', onChordPointerUp);
  el.removeEventListener('pointercancel', onChordPointerUp);

  if (dragging) {
    el.classList.remove('dragging');
    el.style.transform = '';
    const verse = state.verses.find(v => v.id === verseId);
    if (!verse) { dragState = null; return; }

    const container = el.parentElement;
    const items = Array.from(container.querySelectorAll('.pinned-chord'));
    const targetEl = dragState.targetEl;
    const insertBefore = dragState.insertBefore;
    items.forEach(i => i.classList.remove('placeholder'));

    if (targetEl) {
      const targetIdx = Number(targetEl.dataset.chordIndex);
      let newIdx = insertBefore ? targetIdx : targetIdx + 1;
      const oldIdx = chordIndex;
      if (oldIdx < newIdx) newIdx -= 1;
      if (newIdx !== oldIdx && newIdx >= 0 && newIdx <= verse.chords.length) {
        const [moved] = verse.chords.splice(oldIdx, 1);
        verse.chords.splice(newIdx, 0, moved);
      }
    }
    syncVerseToStructure(verse);
    notifyStructureChanged();
    renderVerses();
  } else {
    const verse = state.verses.find(v => v.id === verseId);
    if (verse) {
      verse.chords.splice(chordIndex, 1);
      syncVerseToStructure(verse);
      notifyStructureChanged();
      renderVerses();
    }
  }
  try { el.releasePointerCapture(pointerId); } catch (err) {}
  dragState = null;
}

// ============ VERSES REORDERING ============
let verseDragState = null;

versesWrapper.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.verse-drag-handle');
  if (!handle) return;
  if (e.button !== undefined && e.button !== 0) return;

  const verseEl = handle.closest('.verse');
  if (!verseEl) return;
  const verseId = verseEl.dataset.verseId;
  const idx = state.verses.findIndex(v => v.id === verseId);
  if (idx === -1) return;

  verseDragState = {
    verseEl, verseId, originalIndex: idx,
    startY: e.clientY, dragging: false, pointerId: e.pointerId,
  };
  verseEl.classList.add('dragging-verse');
  verseEl.setPointerCapture(e.pointerId);

  const onMove = (ev) => {
    if (!verseDragState) return;
    const dy = ev.clientY - verseDragState.startY;
    if (!verseDragState.dragging) {
      if (Math.abs(dy) < 8) return;
      verseDragState.dragging = true;
      verseEl.style.transform = 'scale(0.98)';
    }
    const allVerses = Array.from(versesWrapper.querySelectorAll('.verse'));
    allVerses.forEach(v => { if (v !== verseEl) v.style.outline = ''; });
    let closest = null, closestDist = Infinity, insertBefore = true;
    allVerses.forEach(v => {
      if (v === verseEl) return;
      const r = v.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      const d = Math.abs(ev.clientY - cy);
      if (d < closestDist) {
        closestDist = d; closest = v; insertBefore = ev.clientY < cy;
      }
    });
    if (closest) {
      closest.style.outline = '2px dashed rgba(124,196,255,0.6)';
      verseDragState.targetEl = closest;
      verseDragState.insertBefore = insertBefore;
    } else {
      verseDragState.targetEl = null;
    }
  };

  const onUp = () => {
    verseEl.removeEventListener('pointermove', onMove);
    verseEl.removeEventListener('pointerup', onUp);
    verseEl.removeEventListener('pointercancel', onUp);
    verseEl.classList.remove('dragging-verse');
    verseEl.style.transform = '';

    if (verseDragState && verseDragState.dragging && verseDragState.targetEl) {
      const targetEl = verseDragState.targetEl;
      const targetId = targetEl.dataset.verseId;
      const targetIdx = state.verses.findIndex(v => v.id === targetId);
      let newIdx = verseDragState.insertBefore ? targetIdx : targetIdx + 1;
      const oldIdx = verseDragState.originalIndex;
      if (oldIdx < newIdx) newIdx -= 1;
      if (newIdx !== oldIdx && newIdx >= 0 && newIdx <= state.verses.length) {
        const [moved] = state.verses.splice(oldIdx, 1);
        state.verses.splice(newIdx, 0, moved);
      }
    }
    Array.from(versesWrapper.querySelectorAll('.verse')).forEach(v => v.style.outline = '');
    renderVerses();
    try { verseEl.releasePointerCapture(verseDragState ? verseDragState.pointerId : e.pointerId); } catch (err) {}
    verseDragState = null;
  };

  verseEl.addEventListener('pointermove', onMove);
  verseEl.addEventListener('pointerup', onUp);
  verseEl.addEventListener('pointercancel', onUp);
});

addVerseBtn.addEventListener('click', () => { addVerse(); });

// Внешний импорт сцены (из scene.js)
export function importSceneExternally(text) {
  if (window.__hyugaImportScene) {
    window.__hyugaImportScene(text);
  } else {
    console.warn('scene.js ещё не загружен');
  }
}

// Смена языка
window.addEventListener('langchange', () => {
  renderVerses();
});

// structure.js отредактировал heading — обновить поле ввода куплета
window.addEventListener('verse:title-changed', (e) => {
  const { verseId, title } = e.detail || {};
  if (!verseId) return;

  const verse = state.verses.find(v => v.id === verseId);
  if (verse) verse.title = title;

  // Точечно обновить input в DOM, чтобы не терять фокус
  const input = versesWrapper.querySelector(
    `.verse[data-verse-id="${verseId}"] .verse-title`
  );
  if (input) input.value = title;
});

// structure.js просит удалить куплет — удаляем
window.addEventListener('verse:delete-request', (e) => {
  const { verseId } = e.detail || {};
  if (!verseId) return;

  // Удаляем через существующую функцию (она удаляет и из verses, и из structure,
  // и рассылает structure:changed)
  deleteVerse(verseId);
});
