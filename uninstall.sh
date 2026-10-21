#!/usr/bin/env bash
# uninstall.sh — удаляет всё, что положил install.sh.
# Не трогает: сам проект, dist/, node_modules, build/icon.png.
set -e

BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
MIME_DIR="$HOME/.local/share/mime/packages"
ICONS_ROOT="$HOME/.local/share/icons/hicolor"
MIME_HOME="$HOME/.local/share/mime"

echo "==> Удаление Hyuga Sound из ~/.local"

# 1. AppImage
if [ -f "$BIN_DIR/hyuga-sound.AppImage" ]; then
  rm -f "$BIN_DIR/hyuga-sound.AppImage"
  echo "Удалён: $BIN_DIR/hyuga-sound.AppImage"
fi

# 2. .desktop
if [ -f "$APPS_DIR/hyuga-sound.desktop" ]; then
  rm -f "$APPS_DIR/hyuga-sound.desktop"
  echo "Удалён: $APPS_DIR/hyuga-sound.desktop"
fi

# 3. MIME XML
if [ -f "$MIME_DIR/hyuga-sound.xml" ]; then
  rm -f "$MIME_DIR/hyuga-sound.xml"
  echo "Удалён: $MIME_DIR/hyuga-sound.xml"
fi

# 4. Иконки во всех размерах
FOUND_ICONS=0
for SZ in 16 32 48 64 128 256 512 1024; do
  F="$ICONS_ROOT/${SZ}x${SZ}/apps/hyuga-sound.png"
  if [ -f "$F" ]; then
    rm -f "$F"
    echo "Удалён: $F"
    FOUND_ICONS=1
  fi
done
if [ "$FOUND_ICONS" -eq 0 ]; then
  echo "Иконки hicolor/{...}/apps/hyuga-sound.png не найдены — нечего удалять"
fi

# 5. Обновление баз
echo "==> Обновление базы MIME"
update-mime-database "$MIME_HOME" 2>/dev/null || true

echo "==> Обновление базы .desktop"
update-desktop-database "$APPS_DIR" 2>/dev/null || true

echo "==> Обновление кэша иконок"
gtk-update-icon-cache "$ICONS_ROOT" 2>/dev/null || \
  xdg-icon-resource forceupdate --theme hicolor 2>/dev/null || \
  echo "(кэш иконок не обновлён)"

echo
echo "==> Удаление завершено."
echo
echo "Ассоциация .hsnd могла остаться в mimeapps.list — если нужно, поправь вручную:"
echo "  ~/.config/mimeapps.list  →  строка с 'application/x-hyuga-sound'"
