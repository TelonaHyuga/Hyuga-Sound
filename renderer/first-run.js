// renderer/first-run.js
// Показывает модалку выбора языка при первом запуске.
// Флаг «первый запуск» = отсутствие ключа 'hyuga-sound-lang' в localStorage
// (тот же ключ, что использует i18n.js).

import { setLang } from './i18n.js';

const I18N_STORAGE_KEY = 'hyuga-sound-lang';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

function alreadyChosen() {
  return localStorage.getItem(I18N_STORAGE_KEY) !== null;
}

export async function runFirstRunFlow() {
  if (alreadyChosen()) return;

  await new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'first-run-overlay';
    // Текст намеренно двуязычный: до выбора языка мы ещё не знаем,
    // на каком языке говорить с пользователем.
    overlay.innerHTML = `
      <div class="first-run-dialog">
        <h2>Выберите язык / Choose language</h2>
        <p class="first-run-sub">
          Позже можно изменить в меню «О программе».<br>
          You can change this later in the "About" menu.
        </p>
        <div class="first-run-buttons"></div>
      </div>`;

    const buttons = overlay.querySelector('.first-run-buttons');
    LANGUAGES.forEach(({ code, label }) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-blue';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        setLang(code);       // ← записывает 'hyuga-sound-lang', шлёт 'langchange'
        overlay.remove();
        resolve();
      });
      buttons.appendChild(btn);
    });

    document.body.appendChild(overlay);
  });
}
