export function drawChordSVG(frets, startFret, size = 126) {
  const w = size, h = size;
  const pad = 12;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stringGap = innerW / 5;
  const fretGap = innerH / 4;

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
  if (startFret === 1) {
    svg += `<line x1="${pad}" y1="${pad}" x2="${pad + innerW}" y2="${pad}" stroke="#fff" stroke-width="4"/>`;
  } else {
    svg += `<line x1="${pad}" y1="${pad}" x2="${pad + innerW}" y2="${pad}" stroke="#666" stroke-width="2"/>`;
  }
  for (let f = 1; f <= 4; f++) {
    svg += `<line x1="${pad}" y1="${pad + f * fretGap}" x2="${pad + innerW}" y2="${pad + f * fretGap}" stroke="#888" stroke-width="1.5"/>`;
  }
  for (let s = 0; s < 6; s++) {
    svg += `<line x1="${pad + s * stringGap}" y1="${pad}" x2="${pad + s * stringGap}" y2="${pad + innerH}" stroke="#ccc" stroke-width="1.5"/>`;
  }
  for (let s = 0; s < 6; s++) {
    const f = frets[s];
    const x = pad + s * stringGap;
    if (f === -1) {
      svg += `<text x="${x}" y="${pad - 4}" text-anchor="middle" font-size="14" fill="#e74c3c">✕</text>`;
    } else if (f === 0) {
      svg += `<circle cx="${x}" cy="${pad - 8}" r="5" fill="none" stroke="#2ecc71" stroke-width="2"/>`;
    } else {
      const y = pad + f * fretGap;
      svg += `<circle cx="${x}" cy="${y}" r="7" fill="#e74c3c"/>`;
    }
  }
  if (startFret > 1) {
    svg += `<text x="3" y="${pad + 2 * fretGap + 6}" font-size="11" fill="#a0a0c0">${startFret}</text>`;
  }
  svg += `</svg>`;
  return svg;
}
