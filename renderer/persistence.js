// renderer/persistence.js
// Автосохранение текущей сцены в localStorage + восстановление при старте.
// Работает через уже существующие buildSceneObject / applySceneData из scene.js.

import { buildSceneObject, applySceneData } from './scene.js';

const STORAGE_KEY = 'hyuga.lastSession';
const SAVE_INTERVAL_MS = 4000;

let lastSerialized = '';
let intervalId = null;

function snapshot() {
  try { return JSON.stringify(buildSceneObject()); }
  catch (e) { console.warn('Snapshot failed:', e); return null; }
}

function saveNow() {
  const snap = snapshot();
  if (snap && snap !== lastSerialized) {
    try {
      localStorage.setItem(STORAGE_KEY, snap);
      lastSerialized = snap;
    } catch (e) {
      console.warn('Autosave failed:', e);
    }
  }
}

export function hasSavedSession() {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function restoreLastSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw);
    if (!obj || !obj.scene) return false;
    applySceneData(obj.scene);
    return true;
  } catch (e) {
    console.warn('Session restore failed:', e);
    return false;
  }
}

export function startAutosave() {
  if (intervalId) return;
  lastSerialized = snapshot() || '';
  intervalId = setInterval(saveNow, SAVE_INTERVAL_MS);

  // Гарантированный сейв при закрытии/перезагрузке окна
  window.addEventListener('beforeunload', () => {
    try {
      const snap = snapshot();
      if (snap) localStorage.setItem(STORAGE_KEY, snap);
    } catch (e) {}
  });

  // Мгновенный сейв на структурные изменения
  window.addEventListener('structure:changed', saveNow);
  window.addEventListener('capo:changed', saveNow);
}

export function clearSavedSession() {
  localStorage.removeItem(STORAGE_KEY);
  lastSerialized = '';
}
