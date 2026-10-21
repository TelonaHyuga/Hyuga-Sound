#!/usr/bin/env bash
# install.sh — минимальная версия.
set -e

DIST="dist"
APPIMAGE=$(ls "$DIST"/*.AppImage | head -n1)

BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
MIME_DIR="$HOME/.local/share/mime/packages"
ICON_DIR="$HOME/.local/share/icons/hicolor/1024x1024/apps"
mkdir -p "$BIN_DIR" "$APPS_DIR" "$MIME_DIR" "$ICON_DIR"

INSTALLED_APPIMAGE="$BIN_DIR/hyuga-sound.AppImage"
INSTALLED_ICON="$ICON_DIR/hyuga-sound.png"

cp "$APPIMAGE" "$INSTALLED_APPIMAGE"
chmod +x "$INSTALLED_APPIMAGE"
cp "build/icon.png" "$INSTALLED_ICON"
cp "$DIST/hyuga-sound-mime.xml" "$MIME_DIR/hyuga-sound.xml"

DESKTOP_SRC="${APPIMAGE%.AppImage}.desktop"
DESKTOP_DST="$APPS_DIR/hyuga-sound.desktop"
cp "$DESKTOP_SRC" "$DESKTOP_DST"
sed -i "s|^Exec=.*|Exec=$INSTALLED_APPIMAGE %f|" "$DESKTOP_DST"
sed -i "s|^Icon=.*|Icon=$INSTALLED_ICON|" "$DESKTOP_DST"

update-mime-database "$HOME/.local/share/mime"
update-desktop-database "$APPS_DIR"
xdg-mime default hyuga-sound.desktop application/x-hyuga-sound

echo "Установлено: $INSTALLED_APPIMAGE"
