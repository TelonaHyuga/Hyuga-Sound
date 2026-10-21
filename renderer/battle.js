import { t } from './i18n.js';

const arrowsEl = document.getElementById('arrows');
const battleCountEl = document.getElementById('battleCount');
const battleMinusBtn = document.getElementById('battleMinus');
const battlePlusBtn = document.getElementById('battlePlus');
const addSepBtn = document.getElementById('addSepBtn');
const battleModeSwitch = document.getElementById('battleModeSwitch');

const BATTLE_MIN = 1;
const BATTLE_MAX = 24;
const BATTLE_SEP_MAX = 24;

export const battleState = {
  mode: 'pick',
  sequence: [],
};

function defaultArrow() { return { type: 'arrow', up: false, finger: null }; }
function defaultSep() { return { type: 'sep' }; }
function getArrowCount() { return battleState.sequence.filter(it => it.type === 'arrow').length; }
function getSepCount() { return battleState.sequence.filter(it => it.type === 'sep').length; }

export function initBattle(n = 6) {
  battleState.sequence = [];
  for (let i = 0; i < n; i++) battleState.sequence.push(defaultArrow());
  battleState.mode = 'pick';
  applyBattleMode();
  renderArrows();
}

function applyBattleMode() {
  document.body.classList.toggle('battle-finger', battleState.mode === 'finger');
  Array.from(battleModeSwitch.querySelectorAll('.btn')).forEach(b => {
    b.classList.toggle('active', b.dataset.mode === battleState.mode);
  });
}

function fingerLabel(finger) {
  if (finger === 'thumb') return t('battle.thumb');
  if (finger === 'index') return t('battle.index');
  return '—';
}

export function renderArrows() {
  arrowsEl.innerHTML = '';
  const arrowCount = getArrowCount();

  battleState.sequence.forEach((item, idx) => {
    if (item.type === 'arrow') {
      const a = document.createElement('div');
      a.className = 'arrow' + (item.up ? ' up' : '');
      a.dataset.index = idx;
      a.innerHTML = `<span class="arrow-icon">▼</span>`;

      const fingerEl = document.createElement('span');
      fingerEl.className = 'finger';
      fingerEl.textContent = fingerLabel(item.finger);
      a.appendChild(fingerEl);

      a.addEventListener('click', () => {
        item.up = !item.up;
        a.classList.toggle('up', item.up);
      });

      if (battleState.mode === 'finger') {
        fingerEl.style.pointerEvents = 'auto';
        fingerEl.style.cursor = 'pointer';
        fingerEl.title = t('battle.fingerTitle');
        fingerEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          cycleFinger(item, fingerEl);
        });
      }

      arrowsEl.appendChild(a);
    } else {
      const sep = document.createElement('div');
      sep.className = 'arrow-sep';
      sep.dataset.index = idx;
      sep.title = t('battle.sepTitle');
      sep.innerHTML = `
        <div class="arrow-sep-line"></div>
        <div class="arrow-sep-label">${t('battle.sepLabel')}</div>
        <div class="arrow-sep-line"></div>
        <button class="arrow-sep-del" title="${t('battle.sepDelTitle')}">✕</button>
      `;
      sep.querySelector('.arrow-sep-del').addEventListener('click', (ev) => {
        ev.stopPropagation();
        battleState.sequence.splice(idx, 1);
        renderArrows();
      });
      sep.addEventListener('pointerdown', onSepPointerDown);
      arrowsEl.appendChild(sep);
    }
  });

  battleCountEl.textContent = arrowCount;
  battleMinusBtn.disabled = arrowCount <= BATTLE_MIN;
  battlePlusBtn.disabled = arrowCount >= BATTLE_MAX;
}

function cycleFinger(item, fingerEl) {
  if (item.finger === 'thumb') item.finger = 'index';
  else if (item.finger === 'index') item.finger = null;
  else item.finger = 'thumb';
  fingerEl.textContent = fingerLabel(item.finger);
}

let sepDragState = null;

function onSepPointerDown(e) {
  if (e.target.closest('.arrow-sep-del')) return;
  if (e.button !== undefined && e.button !== 0) return;

  const sep = e.currentTarget;
  const sepIndex = Number(sep.dataset.index);

  sepDragState = {
    sep, sepIndex,
    startX: e.clientX, startY: e.clientY,
    dragging: false, pointerId: e.pointerId,
    targetEl: null, insertBefore: true,
  };

  sep.setPointerCapture(e.pointerId);
  sep.addEventListener('pointermove', onSepPointerMove);
  sep.addEventListener('pointerup', onSepPointerUp);
  sep.addEventListener('pointercancel', onSepPointerUp);
}

function onSepPointerMove(e) {
  if (!sepDragState) return;
  const dx = e.clientX - sepDragState.startX;
  const dy = e.clientY - sepDragState.startY;
  if (!sepDragState.dragging) {
    if (Math.hypot(dx, dy) < 6) return;
    sepDragState.dragging = true;
    sepDragState.sep.classList.add('dragging');
    sepDragState.sep.style.zIndex = 1000;
  }
  sepDragState.sep.style.transform = `translate(${dx}px, ${dy}px)`;

  const items = Array.from(arrowsEl.children).filter(el => el !== sepDragState.sep);
  items.forEach(el => el.classList.remove('drop-target'));

  let closest = null, closestDist = Infinity, insertBefore = true;
  items.forEach(el => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < closestDist) {
      closestDist = d; closest = el; insertBefore = e.clientX < cx;
    }
  });

  if (closest) {
    closest.classList.add('drop-target');
    sepDragState.targetEl = closest;
    sepDragState.insertBefore = insertBefore;
  } else {
    sepDragState.targetEl = null;
  }
}

function onSepPointerUp(e) {
  if (!sepDragState) return;
  const { sep, dragging, pointerId, sepIndex } = sepDragState;
  sep.removeEventListener('pointermove', onSepPointerMove);
  sep.removeEventListener('pointerup', onSepPointerUp);
  sep.removeEventListener('pointercancel', onSepPointerUp);

  sep.classList.remove('dragging');
  sep.style.transform = '';
  sep.style.zIndex = '';
  Array.from(arrowsEl.children).forEach(el => el.classList.remove('drop-target'));

  if (dragging && sepDragState.targetEl) {
    const targetEl = sepDragState.targetEl;
    const targetIndex = Number(targetEl.dataset.index);
    const insertBefore = sepDragState.insertBefore;

    let newIndex = insertBefore ? targetIndex : targetIndex + 1;
    const [moved] = battleState.sequence.splice(sepIndex, 1);
    let adjustedTarget = newIndex;
    if (sepIndex < newIndex) adjustedTarget -= 1;
    adjustedTarget = Math.max(0, Math.min(battleState.sequence.length, adjustedTarget));
    battleState.sequence.splice(adjustedTarget, 0, moved);
    renderArrows();
  }

  try { sep.releasePointerCapture(pointerId); } catch (err) {}
  sepDragState = null;
}

function addArrowEnd() { battleState.sequence.push(defaultArrow()); renderArrows(); }
function removeLastArrow() {
  for (let i = battleState.sequence.length - 1; i >= 0; i--) {
    if (battleState.sequence[i].type === 'arrow') {
      battleState.sequence.splice(i, 1); renderArrows(); return;
    }
  }
}
function addSeparator() {
  if (getSepCount() >= BATTLE_SEP_MAX) return;
  battleState.sequence.push(defaultSep()); renderArrows();
}

battlePlusBtn.addEventListener('click', () => {
  if (getArrowCount() >= BATTLE_MAX) return;
  addArrowEnd();
});
battleMinusBtn.addEventListener('click', () => {
  if (getArrowCount() <= BATTLE_MIN) return;
  removeLastArrow();
});
addSepBtn.addEventListener('click', addSeparator);

battleModeSwitch.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode !== 'pick' && mode !== 'finger') return;
  if (mode === battleState.mode) return;
  battleState.mode = mode;
  applyBattleMode();
  renderArrows();
});

// Перерисовываем при смене языка
window.addEventListener('langchange', () => {
  renderArrows();
});
