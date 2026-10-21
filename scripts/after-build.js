// afterAllArtifactBuild hook.
// 1) Рядом с каждым .AppImage создаёт .desktop, указывающий на этот .AppImage.
// 2) Создаёт MIME-файл (XML) для регистрации расширения .hsnd.

const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterAllArtifactBuild(context) {
  const outDir = context.outDir;
  if (!outDir || !fs.existsSync(outDir)) {
    console.warn('[after-build] outDir not found, skipping artifact generation');
    return;
  }

  const files = fs.readdirSync(outDir);
  const appImages = files.filter(f => f.endsWith('.AppImage'));

  // ---------- 1. .desktop рядом с AppImage ----------
  if (appImages.length === 0) {
    console.warn('[after-build] No .AppImage in outDir, skipping .desktop creation');
  } else {
    for (const appImage of appImages) {
      const fullPath = path.join(outDir, appImage);
      const fileNameNoExt = appImage.replace(/\.AppImage$/, '');
      const desktopPath = path.join(outDir, fileNameNoExt + '.desktop');

      const content = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Hyuga Sound',
        'Comment=Guitar Toolkit',
        'Exec=' + fullPath.replace(/ /g, '\\ ') + ' %f',
        'Icon=hyuga-sound',
        'Categories=AudioVideo;Audio;',
        'MimeType=application/x-hyuga-sound;',
        'Terminal=false',
        'StartupWMClass=Hyuga Sound',
        '',
      ].join('\n');

      fs.writeFileSync(desktopPath, content, { mode: 0o755 });
      console.log('[after-build] Created: ' + desktopPath);
    }
  }

  // ---------- 2. MIME XML для .hsnd ----------
  const mimeXmlPath = path.join(outDir, 'hyuga-sound-mime.xml');
  const mimeXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">',
    '  <mime-type type="application/x-hyuga-sound">',
    '    <comment>Hyuga Sound Scene</comment>',
    '    <comment xml:lang="ru">Сцена Hyuga Sound</comment>',
    '    <glob pattern="*.hsnd"/>',
    '    <icon name="hyuga-sound"/>',
    '  </mime-type>',
    '</mime-info>',
    '',
  ].join('\n');

  fs.writeFileSync(mimeXmlPath, mimeXml);
  console.log('[after-build] Created: ' + mimeXmlPath);
};
