const toastEl = document.getElementById('toast');
let toastTimeout = null;

export function showToast(msg, type = 'success') {
  toastEl.textContent = msg;
  toastEl.className = 'show ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toastEl.className = ''; }, 2800);
}
