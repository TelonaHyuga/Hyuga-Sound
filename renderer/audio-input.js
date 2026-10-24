// renderer/audio-input.js
// Выбор аудио-устройства (микрофон/интерфейс) для тюнера, записи и т.п.
// Сохраняет deviceId в localStorage. Работает с любым getUserMedia-вызовом.
import { t } from './i18n.js';

const STORAGE_KEY = 'hyuga.audioInputId';

// Флаг: пробовали ли уже запросить разрешение в этой сессии.
// Нужен, чтобы не показывать системный промпт при каждом перерисове.
let permissionAttempted = false;

export function getSavedDeviceId() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setSavedDeviceId(deviceId) {
  if (deviceId) localStorage.setItem(STORAGE_KEY, deviceId);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('audioinput:changed', {
    detail: { deviceId: deviceId || '' }
  }));
}

export async function listAudioInputs(requestPermission = false) {
  if (requestPermission) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
    } catch (e) {
      // Пользователь отклонил — метки останутся пустыми, это ок.
    }
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  } catch (e) {
    console.warn('enumerateDevices failed:', e);
    return [];
  }
}

export function buildAudioConstraints(extraAudio = {}) {
  const deviceId = getSavedDeviceId();
  const audio = { ...extraAudio };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return { audio };
}

export function getUserMediaWithPreferredDevice(extraAudio = {}) {
  return navigator.mediaDevices.getUserMedia(buildAudioConstraints(extraAudio));
}

export async function renderInputDeviceSelect(container, opts = {}) {
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('audio-input-container');

  const title = document.createElement('div');
  title.className = 'audio-input-title';
  title.textContent = opts.title || t('about.audioInputLabel');
  container.appendChild(title);

  const select = document.createElement('select');
  select.className = 'audio-input-select';
  select.id = 'audioInputSelect';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = t('about.audioInputDefault');
  select.appendChild(defaultOpt);

  async function refresh(withPermission = false) {
    const current = getSavedDeviceId();
    while (select.options.length > 1) select.remove(1);

    const devices = await listAudioInputs(withPermission);
    if (devices.length === 0) {
      const none = document.createElement('option');
      none.disabled = true;
      none.textContent = t('about.audioInputNoDevices');
      select.appendChild(none);
      return;
    }
    devices.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      // Без разрешения deviceId у всех пуст — не даём сохранить бессмысленный выбор
      if (!d.deviceId && devices.length > 1) {
        opt.disabled = true;
        opt.textContent = t('about.audioInputMicrophone', { n: i + 1 });
      } else {
        opt.textContent = d.label || t('about.audioInputMicrophone', { n: i + 1 });
      }
      if (d.deviceId === current) opt.selected = true;
      select.appendChild(opt);
    });
    if (current && !devices.some(d => d.deviceId === current)) {
      select.value = '';
      setSavedDeviceId('');
    }
  }

  select.addEventListener('change', () => setSavedDeviceId(select.value));
  container.appendChild(select);

  // Модалка видима? (offsetParent === null, если она display:none)
  const isVisible = container.offsetParent !== null;
  const initialDevices = await listAudioInputs(false);
  const hasLabels = initialDevices.some(d => d.deviceId);

  // Разрешение запрашиваем один раз, только когда модалка реально открыта —
  // иначе системный промпт всплывёт при запуске приложения.
  if (!hasLabels && !permissionAttempted && isVisible) {
    permissionAttempted = true;
    await refresh(true);
  } else {
    await refresh(false);
  }
}

// ---- Замена функциональности удалённой кнопки «Обновить» ----

// 1) Браузер сам уведомляет, когда устройства подключили/отключили.
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    const container = document.getElementById('audioInputContainer');
    if (container && container.offsetParent !== null) {
      renderInputDeviceSelect(container);
    }
  });
}

// 2) При открытии модалки «О программе» — перерисовываем.
//    setTimeout(0) гарантирует, что мы сработаем ПОСЛЕ того,
//    как обработчик aboutBtn в app.js снимет с модалки display:none.
const aboutBtn = document.getElementById('aboutBtn');
if (aboutBtn) {
  aboutBtn.addEventListener('click', () => {
    setTimeout(() => {
      const container = document.getElementById('audioInputContainer');
      if (container) renderInputDeviceSelect(container);
    }, 0);
  });
}

// 3) Смена языка — как раньше.
window.addEventListener('langchange', () => {
  const container = document.getElementById('audioInputContainer');
  if (container && container.children.length > 0) {
    renderInputDeviceSelect(container);
  }
});
