// Модуль локализации. Экспортирует t(key), setLang(lang), getLang().
// Применяет переводы ко всем элементам с data-i18n / data-i18n-title / data-i18n-placeholder.
// Слушает клики по [data-lang-switch] и сохраняет выбор в localStorage.

const STORAGE_KEY = 'hyuga-sound-lang';

const DICT = {
  ru: {
    // ---- Общее ----
    'app.title': 'Hyuga Sound',
    'about.title': 'Hyuga Sound',
    'about.version': 'Версия:',
    'about.author': 'Автор:',
    'about.license': 'Лицензия',
    'about.licenseName': 'GNU General Public License v3.0 or later (GPL-3.0-or-later)',
    'about.licenseText': 'This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.',
    'about.langLabel': 'Язык:',
    'about.langRu': 'Русский',
    'about.langEn': 'English',

    // ---- Инфо-панель ----
    'info.recording': 'Запись:',
    'info.duration': 'Длительность:',

    // ---- Аудио ----
    'audio.record': 'Записать',
    'audio.stop': 'Стоп',
    'audio.play': 'Слушать',
    'audio.error': 'Ошибка:',

    // ---- Сцена ----
    'scene.export': 'Экспорт .hsnd',
    'scene.import': 'Импорт .hsnd',
    'scene.clear': 'Очистить сцену',
    'scene.exported': 'Сцена экспортирована:',
    'scene.exportError': 'Ошибка экспорта:',
    'scene.importError': 'Ошибка импорта:',
    'scene.imported': 'Сцена успешно загружена из .hsnd',
    'scene.clearConfirm': 'Очистить сцену? Будут удалены все куплеты и аккорды, а бой сброшен.',
    'scene.cleared': 'Сцена очищена',
    'scene.openError': 'Не удалось открыть файл:',

    // ---- Куплеты ----
    'verses.heading': 'Закреплённые аккорды',
    'verses.add': 'Добавить куплет',
    'verses.empty': 'Нет куплетов. Нажмите «+ Добавить куплет».',
    'verses.titlePlaceholder': 'Название...',
    'verses.titleTitle': 'Кликните, чтобы переименовать',
    'verses.titleEdit': 'Редактировать название',
    'verses.dragHandle': 'Перетащите для изменения порядка куплетов',
    'verses.select': 'Выбрать',
    'verses.active': '✓ Активен',
    'verses.clear': 'Очистить',
    'verses.clearConfirm': 'Очистить все аккорды в «',
    'verses.deleteTitle': 'Удалить куплет',
    'verses.deleteConfirm': 'Удалить «',
    'verses.deleteConfirm2': '» со всеми аккордами?',
    'verses.pinnedHint': 'Нажмите на аккорд ниже, чтобы добавить в этот куплет',
    'verses.pinnedTitle': 'Потяните, чтобы изменить порядок · Клик — удалить',

    // ---- Бой ----
    'battle.heading': 'Бой',
    'battle.modePick': 'Медиатор',
    'battle.modeFinger': 'Пальцами',
    'battle.minusTitle': 'Убрать стрелку',
    'battle.plusTitle': 'Добавить стрелку',
    'battle.arrows': 'стрелок',
    'battle.addSep': 'Приглушение',
    'battle.addSepTitle': 'Добавить разделитель (приглушение)',
    'battle.sepLabel': 'глуш.',
    'battle.sepTitle': 'Потяните, чтобы переместить разделитель',
    'battle.sepDelTitle': 'Удалить разделитель',
    'battle.thumb': 'Большой',
    'battle.index': 'Указательный',
    'battle.fingerTitle': 'Клик — сменить палец (Большой → Указательный → —)',

    // ---- Аккорды ----
    'chords.heading': 'Аккорды',

    // ---- Тюнер ----
    'tuner.heading': 'Тюнер',
    'tuner.start': 'Включить тюнер',
    'tuner.stop': 'Остановить',
    'tuner.hint': 'Нажмите «Включить тюнер»',
    'tuner.listening': 'Слушаю...',
    'tuner.intune': '✓ В строю',
    'tuner.flat': '♭ {cents} центов (ниже)',
    'tuner.sharp': '♯ +{cents} центов (выше)',
    'tuner.micError': 'Не удалось получить доступ к микрофону:',
    
    // ---- Структура песни ----
    'structure.heading': 'Структура песни',
    'structure.addLine': 'Добавить строку',
    'structure.addLineTitle': 'Добавить строку структуры',
    'structure.autoTitles': 'Подписывать куплеты над аккордами',
    'structure.emptyHint': 'Структура пуста. Нажмите «+ Добавить строку».',
    'structure.editHeading': 'Кликните, чтобы изменить заголовок',
    'structure.editLine': 'Редактировать строку',
    'structure.deleteLine': 'Удалить строку',
    'structure.addPrompt': 'Что добавить?',
    'structure.addHeading': 'Заголовок (Куплет 1, Припев...)',
    'structure.addChordline': 'Строка с аккордами (+ текст)',
    'structure.addLyrics': 'Только текст',
    'structure.addEmpty': 'Пустая строка',
    'structure.promptHeading': 'Заголовок секции:',
    'structure.promptChords': 'Аккорды через пробел (например: Am C G):',
    'structure.promptLyrics': 'Текст строки (можно оставить пустым):',
    
    'structure.open': 'Открыть структуру песни',
    'chordsTable.open': 'Таблица аккордов',
    'chordsTable.title': 'Все аккорды',
    'chordsTable.search': 'Поиск аккорда (Am, C, ...)',
    'chordsTable.empty': 'Ничего не найдено',
    'chordsTable.clickToPin': 'Кликните, чтобы добавить в активный куплет',
    
    // ---- Каподастр ----
    'capo.none': 'Каподастр: нет',
    'capo.fret': 'Каподастр: {n} лад',
    'capo.prompt': 'На каком ладу каподастр?',
    'capo.invalid': 'Введите число от 0 до 12. 0 = без каподастра.',
    
    // ---- Устройство ввода ----
    'about.audioInputLabel': 'Устройство ввода (микрофон)',
    'about.audioInputDefault': 'По умолчанию (системное)',
    'about.audioInputNoDevices': 'Нет доступных устройств',
    'about.audioInputMicrophone': 'Микрофон {n}',
  },

  en: {
    'app.title': 'Hyuga Sound',
    'about.title': 'Hyuga Sound',
    'about.version': 'Version:',
    'about.author': 'Author:',
    'about.license': 'License',
    'about.licenseName': 'GNU General Public License v3.0 or later (GPL-3.0-or-later)',
    'about.licenseText': 'This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.',
    'about.langLabel': 'Language:',
    'about.langRu': 'Русский',
    'about.langEn': 'English',

    'info.recording': 'Recording:',
    'info.duration': 'Duration:',

    'audio.record': 'Record',
    'audio.stop': 'Stop',
    'audio.play': 'Listen',
    'audio.error': 'Error:',

    'scene.export': 'Export .hsnd',
    'scene.import': 'Import .hsnd',
    'scene.clear': 'Clear scene',
    'scene.exported': 'Scene exported:',
    'scene.exportError': 'Export error:',
    'scene.importError': 'Import error:',
    'scene.imported': 'Scene loaded successfully from .hsnd',
    'scene.clearConfirm': 'Clear the scene? All verses and chords will be removed, and the strumming pattern will be reset.',
    'scene.cleared': 'Scene cleared',
    'scene.openError': 'Failed to open file:',

    'verses.heading': 'Pinned chords',
    'verses.add': 'Add verse',
    'verses.empty': 'No verses. Click "+ Add verse".',
    'verses.titlePlaceholder': 'Title...',
    'verses.titleTitle': 'Click to rename',
    'verses.titleEdit': 'Edit title',
    'verses.dragHandle': 'Drag to reorder verses',
    'verses.select': 'Select',
    'verses.active': '✓ Active',
    'verses.clear': 'Clear',
    'verses.clearConfirm': 'Clear all chords in "',
    'verses.deleteTitle': 'Delete verse',
    'verses.deleteConfirm': 'Delete "',
    'verses.deleteConfirm2': '" with all its chords?',
    'verses.pinnedHint': 'Click a chord below to add it to this verse',
    'verses.pinnedTitle': 'Drag to reorder · Click to delete',

    'battle.heading': 'Strumming',
    'battle.modePick': 'Plectrum',
    'battle.modeFinger': 'Fingers',
    'battle.minusTitle': 'Remove arrow',
    'battle.plusTitle': 'Add arrow',
    'battle.arrows': 'arrows',
    'battle.addSep': 'Mute',
    'battle.addSepTitle': 'Add separator (mute)',
    'battle.sepLabel': 'mute',
    'battle.sepTitle': 'Drag to move separator',
    'battle.sepDelTitle': 'Delete separator',
    'battle.thumb': 'Thumb',
    'battle.index': 'Index',
    'battle.fingerTitle': 'Click to cycle finger (Thumb → Index → —)',

    'chords.heading': 'Chords',

    'tuner.heading': 'Tuner',
    'tuner.start': 'Start tuner',
    'tuner.stop': 'Stop',
    'tuner.hint': 'Click "Start tuner"',
    'tuner.listening': 'Listening...',
    'tuner.intune': '✓ In tune',
    'tuner.flat': '♭ {cents} cents (flat)',
    'tuner.sharp': '♯ +{cents} cents (sharp)',
    'tuner.micError': 'Failed to access microphone:',
    'structure.heading': 'Song structure',
    'structure.addLine': 'Add line',
    'structure.addLineTitle': 'Add structure line',
    'structure.autoTitles': 'Show verse labels above chords',
    'structure.emptyHint': 'Structure is empty. Click "+ Add line".',
    'structure.editHeading': 'Click to edit heading',
    'structure.editLine': 'Edit line',
    'structure.deleteLine': 'Delete line',
    'structure.addPrompt': 'What to add?',
    'structure.addHeading': 'Heading (Verse 1, Chorus...)',
    'structure.addChordline': 'Chord line (+ lyrics)',
    'structure.addLyrics': 'Lyrics only',
    'structure.addEmpty': 'Empty line',
    'structure.promptHeading': 'Section heading:',
    'structure.promptChords': 'Chords separated by spaces (e.g. Am C G):',
    'structure.promptLyrics': 'Line lyrics (may be empty):',
    
    'structure.open': 'Open song structure',
    'chordsTable.open': 'Chords table',
    'chordsTable.title': 'All chords',
    'chordsTable.search': 'Search chord (Am, C, ...)',
    'chordsTable.empty': 'Nothing found',
    'chordsTable.clickToPin': 'Click to add to active verse',
    
    'capo.none': 'Capo: none',
    'capo.fret': 'Capo: fret {n}',
    'capo.prompt': 'Which fret is the capo on?',
    'capo.invalid': 'Enter a number from 0 to 12. 0 = no capo.',
    
    // ---- Audio input ----
    'about.audioInputLabel': 'Input device (microphone)',
    'about.audioInputDefault': 'Default (system)',
    'about.audioInputNoDevices': 'No devices available',
    'about.audioInputMicrophone': 'Microphone {n}',
  },
};

let currentLang = 'ru';

export function getLang() {
  return currentLang;
}

export function t(key, params) {
  const dict = DICT[currentLang] || DICT.ru;
  let s = dict[key];
  if (s === undefined) {
    // fallback на русский, если в текущем языке нет ключа
    s = (DICT.ru[key] !== undefined ? DICT.ru[key] : key);
  }
  if (params && typeof s === 'string') {
    s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : '');
  }
  return s;
}

function applyTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Переключатели языка
  scope.querySelectorAll('[data-lang-switch]').forEach(el => {
    el.classList.toggle('active', el.dataset.langSwitch === currentLang);
  });
}

export function setLang(lang) {
  if (lang !== 'ru' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyTranslations();
  // Сообщаем остальным модулям
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function initI18n() {
  const saved = localStorage.getItem(STORAGE_KEY);
  currentLang = (saved === 'en') ? 'en' : 'ru';
  document.documentElement.lang = currentLang;

  document.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-lang-switch]');
    if (!sw) return;
    setLang(sw.dataset.langSwitch);
  });

  applyTranslations();
}

// Удобная функция для модулей, которые рендерят DOM динамически:
// после render вызови applyI18nTo(elementOrFragment)
export function applyI18nTo(el) {
  applyTranslations(el);
}
