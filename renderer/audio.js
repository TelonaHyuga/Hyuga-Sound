import { t } from './i18n.js';

const recBtn = document.getElementById('rec');
const playBtn = document.getElementById('play');
const waveCtx = document.getElementById('wave').getContext('2d');
const timerEl = document.getElementById('timer');
const durationEl = document.getElementById('duration');

let blob = null, url = null;
let audioCtx, analyser, source, gainNode, audioEl;
let animId = null;
let mediaRecorder;
let chunks = [];
let recStart = 0, recInterval = null;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}
function startTimer() {
  recStart = Date.now();
  timerEl.textContent = '00:00';
  recInterval = setInterval(() => { timerEl.textContent = fmt((Date.now() - recStart) / 1000); }, 200);
}
function stopTimer() {
  clearInterval(recInterval); recInterval = null;
  const elapsed = (Date.now() - recStart) / 1000;
  timerEl.textContent = fmt(elapsed);
  durationEl.textContent = fmt(elapsed);
}
function drawCenterLine() {
  waveCtx.clearRect(0, 0, 500, 80);
  waveCtx.strokeStyle = '#2a3a5e'; waveCtx.lineWidth = 1;
  waveCtx.beginPath(); waveCtx.moveTo(0, 40); waveCtx.lineTo(500, 40); waveCtx.stroke();
}
function drawWave() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  waveCtx.clearRect(0, 0, 500, 80);
  waveCtx.strokeStyle = '#2a3a5e'; waveCtx.lineWidth = 1;
  waveCtx.beginPath(); waveCtx.moveTo(0, 40); waveCtx.lineTo(500, 40); waveCtx.stroke();
  waveCtx.strokeStyle = '#7cc4ff'; waveCtx.lineWidth = 2;
  waveCtx.beginPath();
  const step = 500 / data.length;
  for (let i = 0; i < data.length; i++) {
    const y = (data[i] / 255) * 80;
    i === 0 ? waveCtx.moveTo(0, y) : waveCtx.lineTo(i * step, y);
  }
  waveCtx.stroke();
}
function startVisuals() {
  (function loop() { drawWave(); animId = requestAnimationFrame(loop); })();
}
function stopVisuals() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  waveCtx.clearRect(0, 0, 500, 80);
  drawCenterLine();
  if (audioEl) { audioEl.pause(); audioEl = null; }
  if (source) { source.disconnect(); source = null; }
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  analyser = null;
}

recBtn.onclick = async () => {
  if (recBtn.classList.contains('btn-recording')) {
    mediaRecorder.stop(); stopTimer(); stopVisuals(); return;
  }
  stopVisuals();
  if (url) { URL.revokeObjectURL(url); url = null; }
  chunks = [];
  durationEl.textContent = '—';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    await audioCtx.resume();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      blob = new Blob(chunks, { type: 'audio/webm' });
      url = URL.createObjectURL(blob);
      stream.getTracks().forEach(t => t.stop());
      recBtn.innerHTML = `<span class="ico">●</span> ${t('audio.record')}`;
      recBtn.classList.remove('btn-recording');
    };
    mediaRecorder.start();
    recBtn.innerHTML = `<span class="ico">■</span> ${t('audio.stop')}`;
    recBtn.classList.add('btn-recording');
    startTimer();
    startVisuals();
  } catch (err) {
    console.error('Ошибка:', err);
    alert(t('audio.error') + ' ' + err.message);
  }
};

playBtn.onclick = async () => {
  if (!url) return;
  stopVisuals();
  audioCtx = new AudioContext();
  await audioCtx.resume();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;
  audioEl = new Audio(url);
  source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  audioEl.onended = stopVisuals;
  audioEl.play();
  startVisuals();
};

drawCenterLine();
