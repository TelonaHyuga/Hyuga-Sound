#!/usr/bin/env bash
# install.sh — устанавливает уже собранные артефакты из dist/ в ~/.local
# Ничего не компилирует. Требует, чтобы dist/ уже содержал .AppImage,
# .desktop, mime.xml и иконку (см. build-all.sh).

set -e

DIST="dist"
APPIMAGE=$(ls "$DIST"/*.AppImage 2>/dev/null | head -n1 || true)

if [ -z "$APPIMAGE" ]; then
  echo "Ошибка: в $DIST/ нет *.AppImage. Сначала выполни ./build-all.sh"
  exit 1
fi

echo "==> Найден AppImage: $APPIMAGE"

# ----- 1. Каталоги назначения -----
BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
MIME_DIR="$HOME/.local/share/mime/packages"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
mkdir -p "$BIN_DIR" "$APPS_DIR" "$MIME_DIR" "$ICON_DIR"

# ----- 2. AppImage -----
INSTALLED_APPIMAGE="$BIN_DIR/hyuga-sound.AppImage"
cp "$APPIMAGE" "$INSTALLED_APPIMAGE"
chmod +x "$INSTALLED_APPIMAGE"
echo "Установлен AppImage: $INSTALLED_APPIMAGE"

# ----- 3. Иконка (несколько размеров из одного 1024×1024) -----
ICON_SRC=""
if [ -f "build/icon.png" ]; then
  ICON_SRC="build/icon.png"
elif [ -f "$DIST/icon.png" ]; then
  ICON_SRC="$DIST/icon.png"
fi

INSTALLED_ICON=""   # абсолютный путь — уйдёт в .desktop
if [ -n "$ICON_SRC" ]; then
  # Если есть imagemagick — нарежем все размеры, иначе кладём как есть в 1024
  if command -v convert >/dev/null 2>&1; then
    for SZ in 16 32 48 64 128 256 512 1024; do
      DIR="$HOME/.local/share/icons/hicolor/${SZ}x${SZ}/apps"
      mkdir -p "$DIR"
      convert "$ICON_SRC" -resize "${SZ}x${SZ}" "$DIR/hyuga-sound.png"
    done
    INSTALLED_ICON="$HOME/.local/share/icons/hicolor/512x512/apps/hyuga-sound.png"
    echo "Установлены иконки: hicolor/{16..1024}/apps/hyuga-sound.png"
  else
    # fallback — один размер, 1024
    DIR="$HOME/.local/share/icons/hicolor/1024x1024/apps"
    mkdir -p "$DIR"
    cp "$ICON_SRC" "$DIR/hyuga-sound.png"
    INSTALLED_ICON="$DIR/hyuga-sound.png"
    echo "Установлена иконка: $INSTALLED_ICON (imagemagick не найден, один размер)"
  fi
fi

# ----- 4. .desktop -----
# Предпочтительно использовать сгенерированный after-build.js (в нём правильный Exec),
# но перепишем Exec и Icon на абсолютные пути после копирования.
DESKTOP_SRC="${APPIMAGE%.AppImage}.desktop"
DESKTOP_DST="$APPS_DIR/hyuga-sound.desktop"

if [ -f "$DESKTOP_SRC" ]; then
  cp "$DESKTOP_SRC" "$DESKTOP_DST"
else
  # Fallback: если after-build.js почему-то не отработал, создаём свой .desktop
  cat > "$DESKTOP_DST" <<EOF
[Desktop Entry]
Type=Application
Name=Hyuga Sound
Comment=Guitar Toolkit
Exec=$INSTALLED_APPIMAGE %f
Icon=hyuga-sound
Categories=AudioVideo;Audio;
MimeType=application/x-hyuga-sound;
Terminal=false
StartupWMClass=Hyuga Sound
EOF
fi

# Правим Exec и Icon на абсолютные пути
# (Exec — на установленный AppImage, Icon — на установленный PNG)
if [ -n "$ICON_SRC" ]; then
  sed -i "s|^Exec=.*|Exec=$INSTALLED_APPIMAGE %f|" "$DESKTOP_DST"
  sed -i "s|^Icon=.*|Icon=$INSTALLED_ICON|" "$DESKTOP_DST"
else
  sed -i "s|^Exec=.*|Exec=$INSTALLED_APPIMAGE %f|" "$DESKTOP_DST"
  # Icon оставляем как есть (Icon=hyuga-sound)
fi

chmod 644 "$DESKTOP_DST"
echo "Установлен .desktop: $DESKTOP_DST"

# ----- 5. MIME XML -----
MIME_SRC="$DIST/hyuga-sound-mime.xml"
MIME_DST="$MIME_DIR/hyuga-sound.xml"

if [ -f "$MIME_SRC" ]; then
  cp "$MIME_SRC" "$MIME_DST"
  echo "Установлен MIME: $MIME_DST"
else
  echo "! $MIME_SRC не найден, MIME-тип не зарегистрирован"
fi

# ----- 6. Обновление баз и ассоциация -----
echo "==> Обновление базы MIME"
update-mime-database "$HOME/.local/share/mime" 2>/dev/null || true

echo "==> Обновление базы .desktop"
update-desktop-database "$APPS_DIR" 2>/dev/null || true

echo "==> Обновление кэша иконок"
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || \
  xdg-icon-resource forceupdate --theme hicolor 2>/dev/null || \
  echo "(кэш иконок не обновлён — не критично, тема подхватит при следующем логине)"

echo "==> Назначение Hyuga Sound обработчиком по умолчанию для application/x-hyuga-sound"
xdg-mime default hyuga-sound.desktop application/x-hyuga-sound 2>/dev/null || \
  echo "(xdg-mime не сработал — назначь ассоциацию вручную в настройках файлового менеджера)"

echo
echo "==> Готово."
echo "  AppImage: $INSTALLED_APPIMAGE"
echo "  Ярлык:    $DESKTOP_DST"
echo "  Иконка:   $INSTALLED_ICON"
echo "  MIME:     $MIME_DST"
