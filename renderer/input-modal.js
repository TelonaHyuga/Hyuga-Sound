const overlay = document.getElementById('inputModalOverlay');
const titleEl = document.getElementById('inputModalTitle');
const textarea = document.getElementById('inputModalTextarea');
const btnOk = document.getElementById('inputModalOk');
const btnCancel = document.getElementById('inputModalCancel');

let resolveFn = null;

function close(result) {
  overlay.classList.remove('show');
  if (resolveFn) {
    const r = resolveFn;
    resolveFn = null;
    r(result);
  }
}

export function askText(title, defaultValue = '') {
  return new Promise((resolve) => {
    titleEl.textContent = title;
    textarea.value = defaultValue;
    overlay.classList.add('show');
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 30);
    resolveFn = resolve;
  });
}

btnOk.addEventListener('click', () => close(textarea.value));
btnCancel.addEventListener('click', () => close(null));
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) close(null);
});
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    close(textarea.value);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close(null);
  }
});
