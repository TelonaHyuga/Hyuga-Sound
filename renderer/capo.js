import { state } from './state.js';
import { t } from './i18n.js';
import { askText } from './input-modal.js';

const capoBtn = document.getElementById('capoBtn');
const capoLabel = document.getElementById('capoLabel');

const CAPO_MAX = 12;

function updateCapoLabel() {
  if (!capoLabel) return;
  if (state.capo === 0) {
    capoLabel.textContent = t('capo.none');
  } else {
    capoLabel.textContent = t('capo.fret', { n: state.capo });
  }
}

async function changeCapo() {
  const current = state.capo === 0 ? '0' : String(state.capo);
  const v = await askText(
    t('capo.prompt') + ' (0–' + CAPO_MAX + ', 0 = ' + t('capo.none') + ')',
    current
  );
  if (v === null) return;

  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0 || n > CAPO_MAX) {
    alert(t('capo.invalid'));
    return;
  }

  state.capo = n;
  updateCapoLabel();
  window.dispatchEvent(new CustomEvent('capo:changed', { detail: { capo: n } }));
}

if (capoBtn) {
  capoBtn.addEventListener('click', changeCapo);
}

window.addEventListener('langchange', updateCapoLabel);

updateCapoLabel();
