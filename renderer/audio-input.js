// renderer/audio-input.js
// Выбор аудио-устройства (микрофон/интерфейс) для тюнера, записи и т.п.
// Сохраняет deviceId в localStorage. Работает с любым getUserMedia-вызовом.
import { t } from './i18n.js';

const STORAGE_KEY = 'hyuga.audioInputId';

let permissionAttempted = false;
let activeInstance = null;

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
      await new Promise(r => setTimeout(r, 60));
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

  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }

  container.innerHTML = '';
  container.classList.add('audio-input-container');

  const label = document.createElement('div');
  label.className = 'audio-input-label';
  label.textContent = opts.title || t('about.audioInputLabel');
  container.appendChild(label);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'audio-input-btn';
  btn.id = 'audioInputBtn';
  container.appendChild(btn);

  const dropdown = document.createElement('div');
  dropdown.className = 'audio-input-dropdown hidden';
  document.body.appendChild(dropdown);

  let devices = [];
  let open = false;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function currentName() {
    const id = getSavedDeviceId();
    if (!id) return t('about.audioInputDefault');
    const d = devices.find(x => x.deviceId === id);
    return d?.label || t('about.audioInputMicrophone', { n: 1 });
  }

  function updateBtnLabel() {
    btn.innerHTML = `
      <span class="audio-input-btn-icon">🎤</span>
      <span class="audio-input-btn-text">${escapeHtml(currentName())}</span>
      <span class="audio-input-btn-chevron">▾</span>
    `;
  }

  function makeOption(value, name, disabled = false) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'audio-input-option';
    const isActive = value === getSavedDeviceId()
      || (!value && !getSavedDeviceId());
    if (isActive) el.classList.add('active');
    if (disabled) { el.disabled = true; el.classList.add('disabled'); }
    el.innerHTML = `
      <span class="audio-input-option-check">${isActive ? '✓' : ''}</span>
      <span class="audio-input-option-text">${escapeHtml(name)}</span>
    `;
    el.addEventListener('click', () => {
      if (disabled) return;
      setSavedDeviceId(value);
      updateBtnLabel();
      closeDropdown();
    });
    return el;
  }

  function renderOptions() {
    dropdown.innerHTML = '';
    dropdown.appendChild(makeOption('', t('about.audioInputDefault')));
    if (devices.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'audio-input-empty';
      empty.textContent = t('about.audioInputNoDevices');
      dropdown.appendChild(empty);
      return;
    }
    devices.forEach((d, i) => {
      const name = d.label || t('about.audioInputMicrophone', { n: i + 1 });
      const disabled = !d.deviceId && devices.length > 1;
      dropdown.appendChild(makeOption(d.deviceId, name, disabled));
    });
  }

  async function refresh(withPermission = false) {
    devices = await listAudioInputs(withPermission);
    const current = getSavedDeviceId();
    if (current && !devices.some(d => d.deviceId === current)) {
      setSavedDeviceId('');
    }
    updateBtnLabel();
  }

  function positionDropdown() {
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 260 && rect.top > 260;
    dropdown.style.position = 'fixed';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    if (showAbove) {
      dropdown.style.top = '';
      dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    } else {
      dropdown.style.bottom = '';
      dropdown.style.top = (rect.bottom + 4) + 'px';
    }
  }

  function onDocClick(e) {
    if (btn.contains(e.target) || dropdown.contains(e.target)) return;
    closeDropdown();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') closeDropdown();
  }
  function onScrollOrResize() { closeDropdown(); }

  async function openDropdown() {
    if (open) return;
    await refresh(false);
    renderOptions();
    positionDropdown();
    dropdown.classList.remove('hidden');
    open = true;
    btn.classList.add('open');
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  function closeDropdown() {
    if (!open) return;
    dropdown.classList.add('hidden');
    open = false;
    btn.classList.remove('open');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open) closeDropdown();
    else openDropdown();
  });

  // Первичная загрузка
  const initial = await listAudioInputs(false);
  const hasLabels = initial.some(d => d.deviceId);
  const isVisible = container.offsetParent !== null;

  if (!hasLabels && !permissionAttempted && isVisible) {
    permissionAttempted = true;
    devices = await listAudioInputs(true);
  } else {
    devices = initial;
  }
  updateBtnLabel();

  // Экземпляр с методами destroy + updateLabels
  activeInstance = {
    destroy() {
      closeDropdown();
      if (dropdown.parentElement === document.body) dropdown.remove();
    },
    updateLabels() {
      // Синхронно обновляем только тексты, без innerHTML='' и без await.
      // Никаких мельканий — пользователь видит смену текста в одном кадре.
      label.textContent = opts.title || t('about.audioInputLabel');
      updateBtnLabel();
      if (open) renderOptions();
    }
  };
}

// ---- Глобальные подписки ----

// Смена языка — только обновление подписей, без пересборки DOM.
window.addEventListener('langchange', () => {
  if (activeInstance) activeInstance.updateLabels();
});

// Браузер сам уведомляет, когда устройства подключили/отключили
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    const container = document.getElementById('audioInputContainer');
    if (container && container.offsetParent !== null) {
      renderInputDeviceSelect(container);
    }
  });
}

// При открытии модалки «О программе» — перерисовываем
const aboutBtn = document.getElementById('aboutBtn');
if (aboutBtn) {
  aboutBtn.addEventListener('click', () => {
    setTimeout(() => {
      const container = document.getElementById('audioInputContainer');
      if (container) renderInputDeviceSelect(container);
    }, 0);
  });
}
