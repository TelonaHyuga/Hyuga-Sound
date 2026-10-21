import { state } from './state.js';
import { t } from './i18n.js';
import { askText } from './input-modal.js';

const wrapper = document.getElementById('structure-wrapper');
const addLineBtn = document.getElementById('addStructureLine');
const autoTitlesToggle = document.getElementById('structureAutoTitles');

const sidebar = document.getElementById('structureSidebar');
const toggleBtn = document.getElementById('structureToggleBtn');

// ---- Открытие / закрытие сайдбара ----
function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('hidden');
  document.body.classList.add('structure-open');
  if (toggleBtn) toggleBtn.classList.add('active');
}
function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('hidden');
  document.body.classList.remove('structure-open');
  if (toggleBtn) toggleBtn.classList.remove('active');
}
function toggleSidebar() {
  if (!sidebar) return;
  if (sidebar.classList.contains('hidden')) openSidebar();
  else closeSidebar();
}
if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

openSidebar();

// ---- Рендер структуры ----
export function renderStructure() {
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const lines = state.structure.lines || [];
  if (lines.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'structure-empty-hint';
    hint.textContent = t('structure.emptyHint');
    wrapper.appendChild(hint);
    return;
  }

  let currentSection = '';

  lines.forEach((line, idx) => {
    if (line.type === 'heading') {
      currentSection = line.text;
    }

    const row = document.createElement('div');
    row.className = 'structure-row structure-row-' + line.type;
    row.dataset.index = idx;
    row.dataset.verseId = line.verseId || '';

    if (line.type === 'heading') {
      const h = document.createElement('div');
      h.className = 'structure-heading';
      h.textContent = line.text || '—';
      h.title = t('structure.editHeading');
      h.style.cursor = 'text';
      h.addEventListener('click', () => editLine(idx, 'heading'));
      row.appendChild(h);
      row.appendChild(makeDeleteBtn(idx));
    } else if (line.type === 'chordline') {
      if (state.structure.autoTitles && currentSection) {
        const auto = document.createElement('div');
        auto.className = 'structure-auto-title';
        auto.textContent = currentSection;
        row.appendChild(auto);
      }

      const chordsRow = document.createElement('div');
      chordsRow.className = 'structure-chords-row';
      (line.chords || []).forEach(cn => {
        const c = document.createElement('span');
        c.className = 'structure-chord';
        c.textContent = cn;
        chordsRow.appendChild(c);
      });
      row.appendChild(chordsRow);

      if (line.lyrics && line.lyrics.trim()) {
        const ly = document.createElement('div');
        ly.className = 'structure-lyrics';
        ly.textContent = line.lyrics;
        row.appendChild(ly);
      }

      const actions = document.createElement('div');
      actions.className = 'structure-row-actions';

      const edit = document.createElement('button');
      edit.className = 'btn btn-sm btn-blue';
      edit.textContent = '✎';
      edit.title = t('structure.editLine');
      edit.addEventListener('click', (e) => {
        e.stopPropagation();
        editLine(idx, 'chordline');
      });
      actions.appendChild(edit);

      const del = document.createElement('button');
      del.className = 'btn btn-sm btn-red';
      del.textContent = '✕';
      del.title = t('structure.deleteLine');
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        // chordline не удаляем отдельно — он привязан к куплету.
        // Удаление куплета = удаление heading + chordline.
        // Если у chordline есть verseId — удаляем куплет целиком.
        if (line.verseId) {
          window.dispatchEvent(new CustomEvent('verse:delete-request', {
            detail: { verseId: line.verseId }
          }));
        } else {
          // Ручная chordline без куплета — просто удаляем строку
          state.structure.lines.splice(idx, 1);
          renderStructure();
        }
      });
      actions.appendChild(del);

      row.appendChild(actions);
    } else if (line.type === 'lyrics') {
      const ly = document.createElement('div');
      ly.className = 'structure-lyrics';
      ly.textContent = line.text || '';
      ly.style.cursor = 'text';
      ly.addEventListener('click', () => editLine(idx, 'lyrics'));
      row.appendChild(ly);
      row.appendChild(makeDeleteBtn(idx));
    } else if (line.type === 'empty') {
      const sp = document.createElement('div');
      sp.className = 'structure-spacer';
      row.appendChild(sp);
      row.appendChild(makeDeleteBtn(idx));
    }

    wrapper.appendChild(row);
  });
}

function makeDeleteBtn(idx) {
  const b = document.createElement('button');
  b.className = 'btn btn-sm btn-red structure-del';
  b.textContent = '✕';
  b.title = t('structure.deleteLine');
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const line = state.structure.lines[idx];
    if (!line) return;

    // heading, привязанный к куплету → удаляем весь куплет
    if (line.type === 'heading' && line.verseId) {
      window.dispatchEvent(new CustomEvent('verse:delete-request', {
        detail: { verseId: line.verseId }
      }));
      return;
    }

    // Обычная строка — просто удаляем
    state.structure.lines.splice(idx, 1);
    renderStructure();
  });
  return b;
}

async function editLine(idx, kind) {
  const line = state.structure.lines[idx];
  if (!line) return;

  if (kind === 'heading') {
    const v = await askText(t('structure.promptHeading'), line.text || '');
    if (v === null) return;
    line.text = v.trim();

    if (line.verseId) {
      const verse = state.verses.find(x => x.id === line.verseId);
      if (verse) {
        verse.title = line.text;
        window.dispatchEvent(new CustomEvent('verse:title-changed', {
          detail: { verseId: verse.id, title: verse.title }
        }));
      }
    }

    renderStructure();
  } else if (kind === 'lyrics') {
    const v = await askText(t('structure.promptLyrics'), line.text || '');
    if (v === null) return;
    line.text = v;
    renderStructure();
  } else if (kind === 'chordline') {
    // Редактируем ТОЛЬКО текст. Аккорды берутся из куплета.
    const ly = await askText(t('structure.promptLyrics'), line.lyrics || '');
    if (ly === null) return;
    line.lyrics = ly;
    renderStructure();
  }
}

// ---- Добавление строки ----
if (addLineBtn) {
  addLineBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // Больше нет пункта "строка с аккордами" — она создаётся автоматически
    // при добавлении куплета. Остаются: заголовок, текст, пустая строка.
    const choice = await askText(
      t('structure.addPrompt') + '\n' +
      '1 — ' + t('structure.addHeading') + '\n' +
      '2 — ' + t('structure.addLyrics') + '\n' +
      '3 — ' + t('structure.addEmpty'),
      '1'
    );
    if (choice === null) return;
    const n = parseInt(choice, 10);

    if (n === 1) {
      const v = await askText(t('structure.promptHeading'), '');
      if (v === null) return;
      state.structure.lines.push({ type: 'heading', text: v.trim() });
    } else if (n === 2) {
      const v = await askText(t('structure.promptLyrics'), '');
      if (v === null) return;
      state.structure.lines.push({ type: 'lyrics', text: v });
    } else if (n === 3) {
      state.structure.lines.push({ type: 'empty' });
    }
    renderStructure();
  });
}

// ---- Auto-titles toggle ----
if (autoTitlesToggle) {
  autoTitlesToggle.checked = state.structure.autoTitles !== false;
  autoTitlesToggle.addEventListener('change', () => {
    state.structure.autoTitles = autoTitlesToggle.checked;
    renderStructure();
  });
}

// ---- Подписки на события ----

// verses.js: добавил/изменил/удалил куплет → перерисовать structure
window.addEventListener('structure:changed', () => {
  renderStructure();
});

// verses.js: переименовал куплет → точечно обновить heading
window.addEventListener('structure:heading-changed', (e) => {
  const { verseId, text } = e.detail || {};
  if (!verseId) return;
  if (!wrapper) return;

  const rows = wrapper.querySelectorAll('.structure-row-heading');
  rows.forEach(row => {
    const idx = Number(row.dataset.index);
    const line = state.structure.lines[idx];
    if (line && line.verseId === verseId) {
      const headingEl = row.querySelector('.structure-heading');
      if (headingEl) headingEl.textContent = text;
    }
  });
});

// ---- Смена языка ----
window.addEventListener('langchange', () => {
  renderStructure();
});
