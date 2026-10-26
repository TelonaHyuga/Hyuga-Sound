import { state, generateVerseId } from './state.js';
import { renderVerses, addVerse } from './verses.js';
import { battleState, initBattle, renderArrows } from './battle.js';
import { showToast } from './toast.js';
import { t } from './i18n.js';
import { renderStructure } from './structure.js';

const HSND_MAGIC = 'HSND';
const HSND_VERSION = 3;

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const clearSceneBtn = document.getElementById('clearSceneBtn');
const fileInput = document.getElementById('fileInput');

const BATTLE_MAX = 24;
const BATTLE_SEP_MAX = 24;
function defaultArrow() { return { type: 'arrow', up: false, finger: null }; }

// ============ SANITIZE ============
function sanitizeStructure(s) {
  if (!s || typeof s !== 'object') return { lines: [], autoTitles: true };
  const lines = Array.isArray(s.lines) ? s.lines.map(l => {
    if (!l || typeof l !== 'object') return null;
    if (l.type === 'heading') {
      return { type: 'heading', text: String(l.text || ''), verseId: l.verseId ? String(l.verseId) : undefined };
    }
    if (l.type === 'chordline') {
      return {
        type: 'chordline',
        chords: Array.isArray(l.chords) ? l.chords.map(String) : [],
        lyrics: String(l.lyrics || ''),
        verseId: l.verseId ? String(l.verseId) : undefined,
      };
    }
    if (l.type === 'lyrics') {
      return { type: 'lyrics', text: String(l.text || '') };
    }
    if (l.type === 'empty') {
      return { type: 'empty' };
    }
    return null;
  }).filter(Boolean) : [];
  return { lines, autoTitles: s.autoTitles !== false };
}

function sanitizeVerse(v) {
  if (!v || typeof v !== 'object') return null;
  const title = typeof v.title === 'string' ? v.title : 'Куплет';
  const id = typeof v.id === 'string' && v.id ? v.id : generateVerseId();
  const chords = Array.isArray(v.chords) ? v.chords
    .filter(c => c && typeof c === 'object' && typeof c.name === 'string')
    .map(c => ({
      name: c.name,
      frets: Array.isArray(c.frets) ? c.frets.map(n => Number(n) || 0) : [-1, -1, -1, -1, -1, -1],
      startFret: Number(c.startFret) > 0 ? Number(c.startFret) : 1,
      power: !!c.power
    })) : [];
  return { id, title, chords };
}

function sanitizeBattle(b) {
  if (!b) return { mode: 'pick', sequence: null };
  if (b && typeof b === 'object' && !Array.isArray(b) && Array.isArray(b.sequence)) {
    const mode = (b.mode === 'finger') ? 'finger' : 'pick';
    const seq = b.sequence.map(it => {
      if (!it || typeof it !== 'object') return null;

      // Распаковка обёртки { "arrow": {...} } или { "sep": {...} }
      if (it.arrow && typeof it.arrow === 'object') it = it.arrow;
      if (it.sep && typeof it.sep === 'object') it = it.sep;

      if (it.type === 'sep' || it.sep === true) return { type: 'sep' };
      if (it.type === 'arrow' || it.arrow === true) {
        const finger = (it.finger === 'thumb' || it.finger === 'index') ? it.finger : null;
        return { type: 'arrow', up: !!it.up, finger };
      }
      // fallback: если это просто true/false (старый формат)
      if (typeof it === 'boolean') return { type: 'arrow', up: it, finger: null };
      return null;
    }).filter(Boolean);
    return { mode, sequence: seq };
  }
  // ... остальные ветки как были
  if (b && typeof b === 'object' && Array.isArray(b.arrows)) {
    const arrows = b.arrows.map(up => ({ type: 'arrow', up: !!up, finger: null }));
    return { mode: 'pick', sequence: arrows };
  }
  if (Array.isArray(b)) {
    const arrows = b.map(up => ({ type: 'arrow', up: !!up, finger: null }));
    return { mode: 'pick', sequence: arrows };
  }
  return { mode: 'pick', sequence: null };
}

function applyImportedBattle(b) {
  const { mode, sequence } = sanitizeBattle(b);
  battleState.mode = (mode === 'finger' || mode === 'pick') ? mode : 'pick';
  let seq = sequence;
  if (!Array.isArray(seq) || seq.length === 0) {
    seq = [];
    for (let i = 0; i < 6; i++) seq.push(defaultArrow());
  }
  if (seq.filter(it => it.type === 'arrow').length === 0) {
    seq = [];
    for (let i = 0; i < 6; i++) seq.push(defaultArrow());
  }
  while (seq.filter(it => it.type === 'arrow').length > BATTLE_MAX) {
    for (let i = seq.length - 1; i >= 0; i--) {
      if (seq[i].type === 'arrow') { seq.splice(i, 1); break; }
    }
  }
  while (seq.filter(it => it.type === 'sep').length > BATTLE_SEP_MAX) {
    for (let i = seq.length - 1; i >= 0; i--) {
      if (seq[i].type === 'sep') { seq.splice(i, 1); break; }
    }
  }
  battleState.sequence = seq;
  document.body.classList.toggle('battle-finger', battleState.mode === 'finger');
  const battleModeSwitch = document.getElementById('battleModeSwitch');
  if (battleModeSwitch) {
    Array.from(battleModeSwitch.querySelectorAll('.btn')).forEach(b => {
      b.classList.toggle('active', b.dataset.mode === battleState.mode);
    });
  }
  renderArrows();
}

// ============ PARSE .hsnd ============
function parseHsnd(text) {
  let raw = text.trim();
  if (!raw) throw new Error('Empty file');
  const headerMatch = raw.match(/^HSND:(\d+)\s*\n/);
  if (headerMatch) raw = raw.slice(headerMatch[0].length);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { throw new Error('Invalid JSON inside .hsnd'); }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Unknown file format');
  if (parsed.magic && parsed.magic !== HSND_MAGIC) throw new Error('Wrong format signature');
  if (!parsed.scene) throw new Error('No scene in file');
  if (parsed.version && Number(parsed.version) > HSND_VERSION) throw new Error('File created by newer app version');
  return parsed;
}

// ============ BUILD ============
export function buildSceneObject() {
  return {
    format: 'hyuga-sound-scene', magic: HSND_MAGIC, version: HSND_VERSION,
    created: new Date().toISOString(), app: 'Hyuga Sound',
    scene: {
      verses: state.verses.map(v => ({
        id: v.id, title: v.title,
        chords: v.chords.map(c => ({
          name: c.name,
          frets: Array.isArray(c.frets) ? [...c.frets] : [],
          startFret: c.startFret ?? 1, power: !!c.power
        }))
      })),
      activeVerseId: state.activeVerseId,
      battle: {
        mode: battleState.mode,
        sequence: battleState.sequence.map(it => it.type === 'arrow'
          ? { type: 'arrow', up: !!it.up, finger: it.finger || null }
          : { type: 'sep' })
      },
      capo: state.capo || 0,
      structure: {
        autoTitles: state.structure.autoTitles !== false,
        lines: state.structure.lines.map(l => ({ ...l })),
      }
    }
  };
}

// ============ EXPORT ============
function exportScene() {
  try {
    const obj = buildSceneObject();
    const json = JSON.stringify(obj, null, 2);
    const content = `${HSND_MAGIC}:${HSND_VERSION}\n${json}`;
    const blob = new Blob([content], { type: 'application/x-hyuga-sound' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `hyuga-scene-${stamp}.hsnd`;
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t('scene.exported') + ' ' + filename, 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast(t('scene.exportError') + ' ' + err.message, 'error');
  }
}

// ============ IMPORT ============
export function applySceneData(scene, topLevel) {
  const importedVerses = Array.isArray(scene.verses)
    ? scene.verses.map(sanitizeVerse).filter(Boolean)
    : [];
  if (importedVerses.length === 0) {
    importedVerses.push({ id: generateVerseId(), title: t('verses.add') + ' 1', chords: [] });
  }
  state.verses = importedVerses;
  const numericIds = state.verses.map(v => {
    const m = String(v.id).match(/^verse-(\d+)/);
    return m ? Number(m[1]) : 0;
  }).filter(n => Number.isFinite(n));
  state.verseCounter = Math.max(state.verseCounter, ...numericIds, state.verses.length);
  if (typeof scene.activeVerseId === 'string' && state.verses.some(v => v.id === scene.activeVerseId)) {
    state.activeVerseId = scene.activeVerseId;
  } else {
    state.activeVerseId = state.verses[0].id;
  }
  applyImportedBattle(scene.battle);
  state.structure = sanitizeStructure(scene.structure);

  // КАПО: приоритет scene.capo, фолбэк на top-level capo (для ИИ-файлов, где capo уехал наверх)
  const capoRaw = (scene && scene.capo !== undefined && scene.capo !== null)
    ? scene.capo
    : (topLevel && topLevel.capo);
  const capoNum = Number(capoRaw);
  state.capo = Number.isFinite(capoNum)
    ? Math.max(0, Math.min(12, Math.trunc(capoNum)))
    : 0;

  renderVerses();
  renderStructure();
  window.dispatchEvent(new CustomEvent('capo:changed', { detail: { capo: state.capo } }));
}

function importScene(text) {
  const parsed = parseHsnd(text);
  applySceneData(parsed.scene, parsed);   // <-- второй аргумент
  showToast(t('scene.imported'), 'success');
}

// ============ CLEAR ============
function clearScene() {
  if (!confirm(t('scene.clearConfirm'))) return;
  state.verses = []; state.activeVerseId = null; state.verseCounter = 0;
  state.structure = { lines: [], autoTitles: true };
  state.capo = 0;
  window.dispatchEvent(new CustomEvent('capo:changed', { detail: { capo: 0 } }));
  
  initBattle(6);
  addVerse();
  renderStructure();
  showToast(t('scene.cleared'), 'success');
}

// ============ FILE READ ============
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsText(file);
  });
}

// ============ WIRE UP ============
exportBtn.addEventListener('click', exportScene);
importBtn.addEventListener('click', () => { fileInput.value = ''; fileInput.click(); });
clearSceneBtn.addEventListener('click', clearScene);
fileInput.addEventListener('change', async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    importScene(text);
  } catch (err) {
    console.error('Import error:', err);
    showToast(t('scene.importError') + ' ' + err.message, 'error');
  }
});

// Открыть .hsnd из системы (ассоциация файлов)
window.__hyugaImportScene = importScene;
