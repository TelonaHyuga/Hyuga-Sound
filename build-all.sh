#!/usr/bin/env bash
# build-all.sh — собирает Linux AppImage и Windows NSIS
set -e

echo "==> Сборка pitchy (если ещё не собрана)"
if [ ! -f "renderer/vendor/pitchy.js" ]; then
  npm run build:pitchy
fi

echo "==> Сборка Linux AppImage"
npm run build

echo "==> Сборка Windows NSIS"
npx electron-builder --win

echo "==> Компиляция прошла успешно. Файлы в директории dist/"
ls -1 dist/ 2>/dev/null || true
echo
echo "Для установки в систему выполни: ./install.sh"
