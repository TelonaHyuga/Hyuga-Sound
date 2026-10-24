import { showToast } from './toast.js';
import { state } from './state.js';
import { addVerse, renderVerses } from './verses.js';
import { initBattle, renderArrows } from './battle.js';

import './i18n.js';
import './scene.js';
import './audio.js';
import './tuner.js';
import './about.js';
import './input-modal.js';
import './chords-table.js';
import './capo.js';
import { runFirstRunFlow } from './first-run.js';
import { restoreLastSession, startAutosave, hasSavedSession } from './persistence.js';
import { renderInputDeviceSelect } from './audio-input.js';
import { renderStructure } from './structure.js';
import { t } from './i18n.js';

async function bootstrapHyuga() {
  // 3. Выбор языка при первом запуске — до восстановления сессии,
  //    чтобы интерфейс сразу был на выбранном языке.
  await runFirstRunFlow();

  // 2. Восстановление последней сессии.
  //    Если сохранения нет — оставляем приложение как есть
  //    (пустой старт / дефолтный куплет из существующей инициализации).
  if (hasSavedSession()) restoreLastSession();

  // Запускаем автосейв (baseline уже после возможного восстановления).
  startAutosave();

  // 1. Наполнить селект устройств в модалке «О программе», если контейнер есть.
  const audioContainer = document.getElementById('audioInputContainer');
  if (audioContainer) renderInputDeviceSelect(audioContainer);
}

bootstrapHyuga();

function setupExternalFileOpen() {
  if (!window.electronAPI || !window.electronAPI.onOpenHsndFile) return;
  window.electronAPI.onOpenHsndFile(async (filePath) => {
    try {
      const text = await window.electronAPI.readTextFile(filePath);
      if (window.__hyugaImportScene) {
        window.__hyugaImportScene(text);
      } else {
        showToast(t('scene.importError') + ' scene.js not ready', 'error');
      }
    } catch (err) {
      console.error('Failed to open file:', err);
      showToast(t('scene.openError') + ' ' + err.message, 'error');
    }
  });
}

// Старт
initBattle(6);
if (state.verses.length === 0) addVerse();
renderVerses();
renderStructure();
setupExternalFileOpen();

window.__hyuga = { showToast, state };
