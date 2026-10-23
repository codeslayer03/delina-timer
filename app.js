import { initSpace } from './space.mjs?v=887ac35ece83';
import { Timer, formatTime } from './timer.mjs?v=887ac35ece83';
import { Soundscape, moods, resumeAudio } from './soundscape.mjs?v=887ac35ece83';
import { quotes, dailyQuoteIndex, dayGreeting } from './quotes.mjs?v=887ac35ece83';
const $ = selector => document.querySelector(selector);
const space = initSpace();
function setText(selector, value) { const element = $(selector); if (element.textContent !== value) element.textContent = value; }
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
let quoteAuto = stored?.quoteAuto !== false;
let linkMusic = stored?.linkMusic === true;
$('#link-music').checked = linkMusic;
$('#link-music').addEventListener('change', event => { linkMusic = event.target.checked; save(); });
function renderQuoteOptions() {
  $('#quote-auto').setAttribute('aria-pressed', String(quoteAuto));
  $('#quote-auto').innerHTML = quoteAuto ? '<span aria-hidden="true">Ⅱ</span> Pause notes' : '<span aria-hidden="true">▶</span> Resume notes';
  $('#quote-cadence').textContent = quoteAuto ? 'A fresh note every 30 seconds' : 'Stay with this little note';
}
$('#quote-auto').addEventListener('click', () => { quoteAuto = !quoteAuto; save(); renderQuoteOptions(); });
renderQuoteOptions();
$('#calm-volume').value = String(volume * 100);
function showQuote() {
  $('#quote').textContent = quotes[quoteIndex];
  $('#day-greeting').textContent = dayGreeting();
}
showQuote();
$('#next-quote').addEventListener('click', () => { quoteIndex = (quoteIndex + 1) % quotes.length; showQuote(); });
setInterval(() => {
  if (document.hidden || $('#quotes-panel').hidden || !quoteAuto) return;
  const today = new Date().toDateString();
  quoteIndex = today !== lastQuoteDay ? dailyQuoteIndex() : (quoteIndex + 1) % quotes.length;
  lastQuoteDay = today; showQuote();
}, 30000);
function renderCalm() {
  const song = moods[mood];
  $('#calm-toggle').disabled = !song;
  $('#calm-toggle').setAttribute('aria-pressed', String(calmPlaying));
  $('#calm-label').textContent = song ? `${song.title}${calmPlaying ? (volume === 0 ? ' · muted' : ' · playing') : ''}` : 'Pick your little soundtrack';
  $('#calm-hint').textContent = volume === 0 && song ? 'Volume is zero. Move the slider to hear your melody.' : song?.hint || 'Different feelings, different little melodies.';
  $('#calm-play').textContent = calmPlaying ? 'Ⅱ' : '▶';
  updateActivity();
  document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === mood)));
}
async function playMood() {
  const request = ++musicRequest;
  if (!await unlockAudio() || request !== musicRequest) return;
  try {
    calm?.stop(); calm = new Soundscape(audio, volume, mood); calm.start(); calmPlaying = true;
  } catch (error) {
    calm?.stop(); calmPlaying = false;
    console.error('Delina music could not start:', error);
    toast('Music could not start. Tap play to try again.');
  }
  renderCalm();
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
  renderCalm(); save();
});
$('#sound').checked = sound;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function save() {
  try { localStorage.setItem(key, JSON.stringify({ timer: timer.snapshot(), name, hint, sound, tiny, volume, mood, quoteAuto, linkMusic })); }
  catch { if (!storageNotice) { storageNotice = true; toast('Your browser could not save this timer. Keep this tab open.'); } }
}
async function unlockAudio() {
  try {
    if (!audio || audio.state === 'closed') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable in this browser');
      audio = new AudioContext();
      audio.addEventListener('statechange', () => {
        if (audio.state !== 'running' && calmPlaying) {
          ++musicRequest; calm.stop(); calmPlaying = false; renderCalm();
          toast('Music paused by your browser. Tap play to continue.');
        }
      });
    }
    // resumeAudio calls resume before its first await, preserving the user gesture.
    await resumeAudio(audio);
    return true;
  } catch (error) {
    console.warn('Delina audio is unavailable:', error);
    toast('Sound could not start. Check device volume and browser sound settings, then tap play again.'); return false;
  }
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
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + 1.4);
  });
}
function stopAlarm() { clearInterval(alarm); alarm = null; }
function render() {
  const { state, remaining, duration } = timer;
  const text = formatTime(remaining);
  setText('#clock', text);
  $('#clock').setAttribute('aria-label', `${text.replace(':', ' minutes ')} seconds remaining`);
  setText('#timer-name', name);
  setText('#timer-hint', hint);
  const portion = Math.min(1, Math.max(0, remaining / duration));
  $('#progress').style.width = `${portion * 100}%`;
  $('#watch-progress').style.strokeDashoffset = String(175.93 * (1 - portion));
  $('#watch-hand').setAttribute('transform', `rotate(${360 * (1 - portion)} 215 245)`);
  $('#scene').classList.toggle('running', state === 'running');
  $('#scene').classList.toggle('done', state === 'done');
  document.body.classList.toggle('tiny', tiny);
  $('#mini').setAttribute('aria-pressed', String(tiny));
  setText('#mini', tiny ? 'Spacious view' : 'Compact view');
  setText('#sound-label', sound ? '♫ Sound on' : '♪ Sound off');
  const labels = { idle: ['▶', 'Start timer'], running: ['Ⅱ', 'Pause timer'], paused: ['▶', 'Keep going'], done: ['✓', 'Thank you, Delina!'] };
  const startLabel = `<span aria-hidden="true">${labels[state][0]}</span> ${labels[state][1]}`;
  if ($('#start').innerHTML !== startLabel) $('#start').innerHTML = startLabel;
  setText('#duck-caption', { idle: 'Delina is ready when you are.', running: 'Delina is keeping an eye on things.', paused: 'A little breather. Delina can wait.', done: 'Quack, quack! Your moment is ready.' }[state]);
  const status = { idle: 'A little pause before something lovely.', running: 'Take a breath. Delina has the timing covered.', paused: 'Paused. Take all the time you need.', done: 'Time’s up! Something lovely is waiting.' }[state];
  if ($('#timer-status').textContent !== status) $('#timer-status').textContent = status;
  document.title = state === 'idle' ? 'Delina · Your little space' : state === 'done' ? 'Time’s up! · Delina' : `${text} · Delina`;
  document.querySelectorAll('.preset, .quick-time').forEach(button => {
    const selected = Number(button.dataset.seconds) === duration && button.dataset.name === name;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  if (state === 'done' && lastState !== 'done') {
    if (linkMusic && calmPlaying) { ++musicRequest; calm.stop(); calmPlaying = false; renderCalm(); }
    chime(); stopAlarm();
    alarm = setInterval(chime, 6500);
    save();
  }
  lastState = state;
  updateActivity();
}
$('#start').addEventListener('click', () => {
  unlockAudio();
  if (timer.state === 'running') timer.pause();
  else if (timer.state === 'done') { stopAlarm(); timer.reset(); }
  else timer.start();
  save(); render();
});
$('#reset').addEventListener('click', () => { stopAlarm(); timer.reset(); save(); render(); });
document.querySelectorAll('.preset, .quick-time').forEach(button => button.addEventListener('click', () => {
  stopAlarm(); timer.set(Number(button.dataset.seconds));
  name = button.dataset.name; hint = button.dataset.hint; save(); render();
}));
$('#sound').addEventListener('change', async event => {
  sound = event.target.checked;
  save(); render();
  if (sound && await unlockAudio()) chime();
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
function updateActivity() {
  const timerHidden = $('#timer-panel').hidden && timer.state !== 'idle';
  const musicHidden = $('#music-panel').hidden && calmPlaying;
  $('#timer-activity').hidden = !timerHidden;
  $('#music-activity').hidden = !musicHidden;
  setText('#timer-activity', `Timer · ${timer.state === 'done' ? 'time’s up' : formatTime(timer.remaining)}${timer.state === 'paused' ? ' · paused' : ''} ↗`);
  setText('#music-activity', `Music · ${moods[mood]?.name || 'playing'} ↗`);
  $('#background-activity').hidden = !(timerHidden || musicHidden);
}
$('#timer-activity').addEventListener('click', () => space.show('timer'));
$('#music-activity').addEventListener('click', () => space.show('music'));
document.addEventListener('delina:features', updateActivity);
setInterval(() => { timer.tick(); render(); }, 200);
document.addEventListener('visibilitychange', () => { timer.tick(); render(); });
window.addEventListener('pagehide', () => { ++musicRequest; save(); if (calm) calm.stop(); calmPlaying = false; renderCalm(); });
render();
