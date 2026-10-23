import { Timer, formatTime } from './timer.mjs';
import { Soundscape, moods } from './soundscape.mjs';
import { quotes, dailyQuoteIndex, dayGreeting } from './quotes.mjs';
const $ = selector => document.querySelector(selector);
const key = 'little-duck-v1';
let stored;
try { stored = JSON.parse(localStorage.getItem(key)); } catch {}
const timer = new Timer(stored?.timer);
let name = typeof stored?.name === 'string' ? stored.name : 'A perfectly soft egg';
let hint = typeof stored?.hint === 'string' ? stored.hint : 'A golden, runny little center.';
let sound = stored?.sound !== false;
let tiny = stored?.tiny === true;
let audio;
let alarm = null;
let lastState;
let toastTimeout;
let storageNotice = false;
let calm;
let calmPlaying = false;
let mood = Object.hasOwn(moods, stored?.mood) ? stored.mood : null;
let musicRequest = 0;
let volume = Number.isFinite(stored?.volume) ? Math.min(1, Math.max(0, stored.volume)) : .3;
let quoteIndex = dailyQuoteIndex();
let lastQuoteDay = new Date().toDateString();
$('#calm-volume').value = String(volume * 100);
function showQuote() {
  $('#quote').textContent = quotes[quoteIndex];
  $('#day-greeting').textContent = dayGreeting();
}
showQuote();
$('#next-quote').addEventListener('click', () => { quoteIndex = (quoteIndex + 1) % quotes.length; showQuote(); });
setInterval(() => {
  if (document.hidden) return;
  const today = new Date().toDateString();
  quoteIndex = today !== lastQuoteDay ? dailyQuoteIndex() : (quoteIndex + 1) % quotes.length;
  lastQuoteDay = today; showQuote();
}, 30000);
function renderCalm() {
  const song = moods[mood];
  $('#calm-toggle').disabled = !song;
  $('#calm-toggle').setAttribute('aria-pressed', String(calmPlaying));
  $('#calm-label').textContent = song ? `${song.title}${calmPlaying ? ' · playing' : ''}` : 'Pick your little soundtrack';
  $('#calm-hint').textContent = song?.hint || 'Different feelings, different little melodies.';
  $('#calm-play').textContent = calmPlaying ? 'Ⅱ' : '▶';
  document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === mood)));
}
async function playMood() {
  const request = ++musicRequest;
  if (!await unlockAudio() || request !== musicRequest) return;
  calm?.stop(); calm = new Soundscape(audio, volume, mood); calm.start(); calmPlaying = true; renderCalm();
}
document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => {
  mood = button.dataset.mood; save(); renderCalm(); playMood();
}));
$('#calm-toggle').addEventListener('click', () => {
  if (calmPlaying) { ++musicRequest; calm.stop(); calmPlaying = false; renderCalm(); }
  else playMood();
});
renderCalm();
$('#calm-volume').addEventListener('input', event => {
  volume = Number(event.target.value) / 100;
  if (calmPlaying) calm.setVolume(volume);
  save();
});
$('#sound').checked = sound;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function save() {
  try { localStorage.setItem(key, JSON.stringify({ timer: timer.snapshot(), name, hint, sound, tiny, volume, mood })); }
  catch { if (!storageNotice) { storageNotice = true; toast('Your browser could not save this timer. Keep this tab open.'); } }
}
async function unlockAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      audio.addEventListener('statechange', () => {
        if (audio.state !== 'running' && calmPlaying) {
          calm.stop(); calmPlaying = false; renderCalm();
        }
      });
    }
    await audio.resume();
    if (audio.state !== 'running') throw new Error('Sound is paused');
    return true;
  } catch { toast('Tap again to enable sound. Delina will still show when time is up.'); return false; }
}
function chime() {
  if (!sound || !audio || audio.state !== 'running') return;
  [523.25, 659.25, 783.99, 659.25].forEach((frequency, i) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime + i * .38;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(.085, at + .06);
    gain.gain.exponentialRampToValueAtTime(.001, at + 1.3);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(at); oscillator.stop(at + 1.4);
  });
}
function stopAlarm() { clearInterval(alarm); alarm = null; }
function render() {
  const { state, remaining, duration } = timer;
  const text = formatTime(remaining);
  $('#clock').textContent = text;
  $('#clock').setAttribute('aria-label', `${text.replace(':', ' minutes ')} seconds remaining`);
  $('#timer-name').textContent = name;
  $('#timer-hint').textContent = hint;
  const portion = Math.min(1, Math.max(0, remaining / duration));
  $('#progress').style.width = `${portion * 100}%`;
  $('#watch-progress').style.strokeDashoffset = String(175.93 * (1 - portion));
  $('#watch-hand').setAttribute('transform', `rotate(${360 * (1 - portion)} 215 245)`);
  $('#scene').classList.toggle('running', state === 'running');
  $('#scene').classList.toggle('done', state === 'done');
  document.body.classList.toggle('tiny', tiny);
  $('#mini').setAttribute('aria-pressed', String(tiny));
  $('#mini').innerHTML = tiny ? '<span aria-hidden="true">↗</span> Full mode' : '<span aria-hidden="true">↙</span> Tiny mode';
  $('#sound-label').textContent = sound ? '♫ Sound on' : '♪ Sound off';
  const labels = { idle: ['▶', 'Start timer'], running: ['Ⅱ', 'Pause timer'], paused: ['▶', 'Keep going'], done: ['✓', 'Thank you, Delina!'] };
  const startLabel = `<span aria-hidden="true">${labels[state][0]}</span> ${labels[state][1]}`;
  if ($('#start').innerHTML !== startLabel) $('#start').innerHTML = startLabel;
  $('#duck-caption').textContent = { idle: 'Delina is ready when you are.', running: 'Delina is keeping an eye on things.', paused: 'A little breather. Delina can wait.', done: 'Quack, quack! Your moment is ready.' }[state];
  const status = { idle: 'A little pause before something lovely.', running: 'Take a breath. Delina has the timing covered.', paused: 'Paused. Take all the time you need.', done: 'Time’s up! Something lovely is waiting.' }[state];
  if ($('#timer-status').textContent !== status) $('#timer-status').textContent = status;
  document.title = state === 'idle' ? 'Delina · Your little duck timer' : state === 'done' ? 'Time’s up! · Delina' : `${text} · Delina`;
  document.querySelectorAll('.preset').forEach(button => {
    const selected = Number(button.dataset.seconds) === duration && button.dataset.name === name;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  if (state === 'done' && lastState !== 'done') {
    chime(); stopAlarm();
    alarm = setInterval(chime, 6500);
    save();
  }
  lastState = state;
}
$('#start').addEventListener('click', () => {
  unlockAudio();
  if (timer.state === 'running') timer.pause();
  else if (timer.state === 'done') { stopAlarm(); timer.reset(); }
  else timer.start();
  save(); render();
});
$('#reset').addEventListener('click', () => { stopAlarm(); timer.reset(); save(); render(); });
document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => {
  stopAlarm(); timer.set(Number(button.dataset.seconds));
  name = button.dataset.name; hint = button.dataset.hint; save(); render();
}));
$('#sound').addEventListener('change', event => {
  sound = event.target.checked;
  if (sound) { unlockAudio(); setTimeout(chime, 100); }
  save(); render();
});
$('#mini').addEventListener('click', () => { tiny = !tiny; save(); render(); });
$('#custom').addEventListener('click', () => {
  $('#minutes').value = Math.floor(timer.duration / 60);
  $('#seconds').value = timer.duration % 60;
  $('#label').value = '';
  $('#form-error').textContent = '';
  $('#custom-dialog').showModal();
});
$('#close-dialog').addEventListener('click', () => $('#custom-dialog').close());
$('#custom-dialog').addEventListener('click', event => { if (event.target === $('#custom-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
$('#custom-form').addEventListener('submit', event => {
  event.preventDefault();
  const seconds = Number($('#minutes').value) * 60 + Number($('#seconds').value);
  try { timer.set(seconds); } catch (error) { $('#form-error').textContent = error.message; return; }
  stopAlarm(); name = $('#label').value.trim() || 'A moment of your own'; hint = 'A little time for whatever you need.';
  $('#custom-dialog').close(); save(); render();
});
setInterval(() => { timer.tick(); render(); }, 200);
document.addEventListener('visibilitychange', () => { timer.tick(); render(); });
window.addEventListener('pagehide', () => { ++musicRequest; save(); if (calm) calm.stop(); calmPlaying = false; renderCalm(); });
render();
