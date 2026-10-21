import { PitchDetector } from "./vendor/pitchy.js";
import { t } from './i18n.js';

const tunerNoteEl = document.getElementById('tunerNote');
const tunerFreqEl = document.getElementById('tunerFreq');
const tunerCentsEl = document.getElementById('tunerCents');
const tunerNeedle = document.getElementById('tunerNeedle');
const tunerStartBtn = document.getElementById('tunerStart');
const tunerStopBtn = document.getElementById('tunerStop');
const tunerSvg = document.getElementById('tunerSvg');

let tunerStream = null;
let tunerAudioCtx = null;
let tunerAnalyser = null;
let tunerRafId = null;
let tunerDetector = null;
let tunerBuffer = null;

// Текущее состояние, чтобы при смене языка можно было мгновенно перерисовать подпись
let lastCents = null;       // null = нет сигнала, иначе число
let tunerActive = false;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GAUGE_W = 760, GAUGE_H = 400;
const CX = GAUGE_W / 2, CY = GAUGE_H - 20;
const R_OUTER = 340, R_INNER_MAJOR = 290, R_INNER_MINOR = 310, R_LABEL = 250;
const MAX_ANGLE = 45;

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildTunerScale() {
  let svg = '';
  const startP = polar(CX, CY, R_OUTER, -MAX_ANGLE);
  const endP = polar(CX, CY, R_OUTER, MAX_ANGLE);
  svg += `<path d="M ${startP.x} ${startP.y} A ${R_OUTER} ${R_OUTER} 0 0 1 ${endP.x} ${endP.y}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>`;
  for (let cents = -50; cents <= 50; cents += 5) {
    const angle = (cents / 50) * MAX_ANGLE;
    const isMajor = cents % 25 === 0;
    const isCenter = cents === 0;
    const rInner = isMajor ? R_INNER_MAJOR : R_INNER_MINOR;
    const p1 = polar(CX, CY, R_OUTER, angle);
    const p2 = polar(CX, CY, rInner, angle);
    let stroke = 'rgba(255,255,255,0.35)';
    let width = 2;
    if (isCenter) { stroke = '#2ecc71'; width = 5; }
    else if (isMajor) { stroke = 'rgba(255,255,255,0.7)'; width = 3; }
    svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
    if (isMajor) {
      const lp = polar(CX, CY, R_LABEL, angle);
      const label = cents === 0 ? '0' : (cents > 0 ? '+' + cents : '' + cents);
      const fill = isCenter ? '#2ecc71' : 'rgba(255,255,255,0.65)';
      svg += `<text x="${lp.x}" y="${lp.y + 7}" text-anchor="middle" font-size="22" font-weight="600" fill="${fill}" font-family="'Segoe UI', system-ui, sans-serif">${label}</text>`;
    }
  }
  const topP = polar(CX, CY, R_OUTER + 10, 0);
  svg += `<polygon points="${topP.x},${topP.y + 4} ${topP.x - 9},${topP.y - 13} ${topP.x + 9},${topP.y - 13}" fill="#2ecc71" opacity="0.9"/>`;
  tunerSvg.innerHTML = svg;
}
buildTunerScale();

function frequencyToNoteInfo(freq) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const roundedMidi = Math.round(midi);
  const cents = (midi - roundedMidi) * 100;
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return { note: NOTE_NAMES[noteIndex] + octave, cents };
}

function centsLabel(cents) {
  if (cents === null) return t('tuner.listening');
  const absCents = Math.abs(cents);
  if (absCents < 5) return t('tuner.intune');
  if (cents < 0) return t('tuner.flat', { cents: cents.toFixed(1) });
  return t('tuner.sharp', { cents: cents.toFixed(1) });
}

function updateTunerUI(freq) {
  if (!freq || freq <= 0) {
    lastCents = null;
    tunerNoteEl.textContent = '—';
    tunerFreqEl.textContent = '';
    tunerCentsEl.textContent = t('tuner.listening');
    tunerCentsEl.classList.remove('intune');
    tunerNeedle.style.transform = 'translateX(-50%) rotate(0deg)';
    tunerNeedle.className = 'tuner-needle';
    return;
  }
  const { note, cents } = frequencyToNoteInfo(freq);
  lastCents = cents;
  tunerNoteEl.textContent = note;
  tunerFreqEl.textContent = freq.toFixed(1) + ' Hz';
  const absCents = Math.abs(cents);
  let cls = 'tuner-needle';
  if (absCents < 5) { cls += ' intune'; tunerCentsEl.classList.add('intune'); }
  else if (cents < 0) { cls += ' flat'; tunerCentsEl.classList.remove('intune'); }
  else { cls += ' sharp'; tunerCentsEl.classList.remove('intune'); }
  tunerCentsEl.textContent = centsLabel(cents);
  tunerNeedle.className = cls;
  const clamped = Math.max(-50, Math.min(50, cents));
  const angle = (clamped / 50) * MAX_ANGLE;
  tunerNeedle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

function tunerLoop() {
  if (!tunerAnalyser || !tunerDetector || !tunerBuffer) return;
  tunerAnalyser.getFloatTimeDomainData(tunerBuffer);
  const [pitch, clarity] = tunerDetector.findPitch(tunerBuffer, tunerAudioCtx.sampleRate);
  if (clarity > 0.85 && pitch > 60 && pitch < 1500) updateTunerUI(pitch);
  else updateTunerUI(null);
  tunerRafId = requestAnimationFrame(tunerLoop);
}

async function startTuner() {
  try {
    tunerStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    tunerAudioCtx = new AudioContext();
    await tunerAudioCtx.resume();
    tunerAnalyser = tunerAudioCtx.createAnalyser();
    tunerAnalyser.fftSize = 4096;
    const src = tunerAudioCtx.createMediaStreamSource(tunerStream);
    src.connect(tunerAnalyser);
    tunerBuffer = new Float32Array(tunerAnalyser.fftSize);
    tunerDetector = PitchDetector.forFloat32Array(tunerAnalyser.fftSize);
    tunerStartBtn.disabled = true;
    tunerStopBtn.disabled = false;
    tunerActive = true;
    tunerCentsEl.textContent = t('tuner.listening');
    tunerLoop();
  } catch (err) {
    console.error('Tuner error:', err);
    alert(t('tuner.micError') + ' ' + err.message);
  }
}

function stopTuner() {
  if (tunerRafId) { cancelAnimationFrame(tunerRafId); tunerRafId = null; }
  if (tunerStream) { tunerStream.getTracks().forEach(t => t.stop()); tunerStream = null; }
  if (tunerAudioCtx) { tunerAudioCtx.close(); tunerAudioCtx = null; }
  tunerAnalyser = null; tunerDetector = null; tunerBuffer = null;
  tunerStartBtn.disabled = false;
  tunerStopBtn.disabled = true;
  tunerActive = false;
  lastCents = null;
  tunerNoteEl.textContent = '—';
  tunerFreqEl.textContent = '';
  tunerCentsEl.textContent = t('tuner.hint');
  tunerCentsEl.classList.remove('intune');
  tunerNeedle.style.transform = 'translateX(-50%) rotate(0deg)';
  tunerNeedle.className = 'tuner-needle';
}

tunerStartBtn.addEventListener('click', startTuner);
tunerStopBtn.addEventListener('click', stopTuner);

// При смене языка — перерисовываем подпись статуса
window.addEventListener('langchange', () => {
  if (!tunerActive) {
    // тюнер выключен — показываем подсказку
    tunerCentsEl.textContent = t('tuner.hint');
    return;
  }
  // тюнер включён — либо "Слушаю...", либо актуальная метка
  if (lastCents === null) {
    tunerCentsEl.textContent = t('tuner.listening');
  } else {
    tunerCentsEl.textContent = centsLabel(lastCents);
  }
});
