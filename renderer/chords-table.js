import { CHORDS, ROOT_ORDER } from './chords-data.js';
import { drawChordSVG } from './chord-svg.js';
import { pinChordToActiveVerse } from './verses.js';
import { t } from './i18n.js';

const overlay = document.getElementById('chordsTableOverlay');
const closeBtn = document.getElementById('chordsTableClose');
const body = document.getElementById('chordsTableBody');
const searchInput = document.getElementById('chordsTableSearch');

const openBtns = [
  document.getElementById('chordsTableBtn2'),
];

let rendered = false;

function renderTable(filter = '') {
  const f = filter.trim().toLowerCase();
  body.innerHTML = '';

  // Группируем по root в порядке ROOT_ORDER
  const groups = {};
  CHORDS.forEach(c => {
    if (!groups[c.root]) groups[c.root] = [];
    groups[c.root].push(c);
  });

  let anyVisible = false;

  ROOT_ORDER.forEach(root => {
    const list = (groups[root] || []).filter(c =>
      !f || c.name.toLowerCase().includes(f)
    );
    if (list.length === 0) return;
    anyVisible = true;

    const col = document.createElement('div');
    col.className = 'chords-table-col';

    const header = document.createElement('div');
    header.className = 'chords-table-col-header';
    header.textContent = root;
    col.appendChild(header);

    list.forEach(c => {
      const cell = document.createElement('div');
      cell.className = 'chord-cell' + (c.power ? ' power' : '');
      cell.innerHTML = `<span>${c.name}</span>${drawChordSVG(c.frets, c.startFret, 110)}`;
      cell.title = t('chordsTable.clickToPin');
      cell.addEventListener('click', () => {
        pinChordToActiveVerse(c);
        closeModal();
      });
      col.appendChild(cell);
    });

    body.appendChild(col);
  });

  if (!anyVisible) {
    const empty = document.createElement('div');
    empty.className = 'chords-table-empty';
    empty.textContent = t('chordsTable.empty');
    body.appendChild(empty);
  }
}

function openModal() {
  overlay.classList.add('show');
  if (!rendered) {
    renderTable('');
    rendered = true;
  }
  searchInput.focus();
}

function closeModal() {
  overlay.classList.remove('show');
}

openBtns.forEach(b => { if (b) b.addEventListener('click', openModal); });
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (overlay) overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

if (searchInput) {
  searchInput.addEventListener('input', () => {
    renderTable(searchInput.value);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay.classList.contains('show')) {
    closeModal();
  }
});

window.addEventListener('langchange', () => {
  if (overlay.classList.contains('show')) {
    renderTable(searchInput.value);
  }
});
