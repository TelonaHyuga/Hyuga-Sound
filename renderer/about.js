import { initI18n } from './i18n.js';

const aboutBtn = document.getElementById('aboutBtn');
const aboutOverlay = document.getElementById('aboutOverlay');
const aboutClose = document.getElementById('aboutClose');
const aboutVersion = document.getElementById('aboutVersion');
const aboutSiteLink = document.getElementById('aboutSiteLink');

let versionLoaded = false;

async function openAbout() {
  aboutOverlay.classList.add('show');
  if (!versionLoaded && window.electronAPI) {
    try {
      const v = await window.electronAPI.getAppVersion();
      aboutVersion.textContent = v;
      versionLoaded = true;
    } catch (err) {
      console.error('Failed to get app version:', err);
    }
  }
}

function closeAbout() {
  aboutOverlay.classList.remove('show');
}

aboutBtn.addEventListener('click', openAbout);
aboutClose.addEventListener('click', closeAbout);
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) closeAbout();
});

aboutSiteLink.addEventListener('click', async (e) => {
  e.preventDefault();
  const url = 'https://telona.xo.je';
  if (window.electronAPI) {
    const ok = await window.electronAPI.openExternal(url);
    if (!ok) window.open(url, '_blank');
  } else {
    window.open(url, '_blank');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aboutOverlay.classList.contains('show')) {
    closeAbout();
  }
});

// Инициализируем i18n — это применяет все data-i18n в index.html
initI18n();
