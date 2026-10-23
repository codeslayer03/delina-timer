import { initCat } from './cat.mjs?v=cc6917e89bd0';
import { nextTrack, trackOrder, musicTime, seekTime, playMedia } from './music-model.mjs?v=cc6917e89bd0';
import { initSpace } from './space.mjs?v=cc6917e89bd0';
import { Timer, formatTime, TimerTicker } from './timer.mjs?v=cc6917e89bd0';
import { moods, resumeAudio } from './soundscape.mjs?v=cc6917e89bd0';
import { quotes, dailyQuoteIndex, dayGreeting } from './quotes.mjs?v=cc6917e89bd0';
const elements = new Map();
const $ = selector => {
  if (!elements.has(selector)) elements.set(selector,document.querySelector(selector));
  return elements.get(selector);
};
const space = initSpace();
function setText(selector, value) { const element = $(selector); if (element.textContent !== value) element.textContent = value; }
const key = 'little-duck-v1';
let stored;
try { stored = JSON.parse(localStorage.getItem(key)); } catch {}
const timer = new Timer(stored?.timer);
const ticker = new TimerTicker(timer, render, {hidden:()=>document.hidden});
let name = typeof stored?.name === 'string' ? stored.name : 'A perfectly soft egg';
let hint = typeof stored?.hint === 'string' ? stored.hint : 'A golden, runny little center.';
let sound = stored?.sound !== false;
let tiny = stored?.tiny === true;
let audio;
let alarm = null;
let lastState;
let toastTimeout;
let storageNotice = false;
let calmPlaying = false;
let musicLoading = false;
let musicError = false;
let mood = Object.hasOwn(moods, stored?.mood) ? stored.mood : null;
let feeling = stored?.feeling === null ? null : Object.hasOwn(moods, stored?.feeling) ? stored.feeling : mood;
let musicRequest = 0;
let volume = Number.isFinite(stored?.volume) ? Math.min(1, Math.max(0, stored.volume)) : .3;
let shuffle = stored?.shuffle === true;
let repeat = ['one','all','off'].includes(stored?.repeat) ? stored.repeat : 'one';
let favorites = Array.isArray(stored?.favorites) ? stored.favorites.filter(value => trackOrder.includes(value)) : [];
const musicHistory = [];
const phonePlayer = $('#phone-player');
const panini = initCat({mood:feeling, onMoodChange(value) { feeling=value; panini.setMood(value); save(); }});
function stopMusic() {
  phonePlayer.pause(); calmPlaying = false; musicLoading = false;
}
function phoneSource(value) {
  const url = new URL(`./music-${value}.wav`, import.meta.url);
  url.search = new URL(import.meta.url).search;
  return url.href;
}
phonePlayer.loop=repeat==='one';
if(mood)phonePlayer.src=phoneSource(mood);
phonePlayer.addEventListener('playing', () => { if(!phonePlayer.paused){calmPlaying = true; musicLoading = false; musicError = false; renderCalm();} });
phonePlayer.addEventListener('pause', () => { calmPlaying = false; renderCalm(); });
phonePlayer.addEventListener('waiting', () => { if(!phonePlayer.paused){musicLoading=true;renderCalm();} });
phonePlayer.addEventListener('error', () => {
  calmPlaying = false; musicLoading = false; musicError = true; renderCalm();toast('The melody could not load. Check your connection and tap play to retry.');
});
phonePlayer.addEventListener('volumechange', () => {
  volume = phonePlayer.muted ? 0 : phonePlayer.volume; $('#calm-volume').value = String(volume*100); renderCalm(); save();
});
for(const event of ['loadedmetadata','durationchange','timeupdate','seeked']) phonePlayer.addEventListener(event, renderMusicTime);
phonePlayer.addEventListener('ended', () => {
  if(repeat === 'all') skipTrack(1);
  else if(repeat === 'one') { phonePlayer.currentTime=0; playMood(); }
  else { calmPlaying=false; renderCalm(); }
});
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
function renderMusicTime() {
  if(document.hidden)return;
  const duration = phonePlayer.src === phoneSource(mood) && Number.isFinite(phonePlayer.duration) ? phonePlayer.duration : 0;
  const current = duration ? seekTime(phonePlayer.currentTime,duration) : 0;
  $('#music-seek').disabled = !duration;
  $('#music-seek').value = duration ? String(Math.round(current/duration*1000)) : '0';
  $('#music-seek').setAttribute('aria-valuetext',`${musicTime(current)} of ${musicTime(duration)}`);
  setText('#music-elapsed',musicTime(current));
  setText('#music-duration',musicTime(duration || (mood ? moods[mood].notes.length*moods[mood].pace : 0)));
  try {
    if(navigator.mediaSession?.setPositionState) {
      if(duration) navigator.mediaSession.setPositionState({duration,playbackRate:phonePlayer.playbackRate,position:current});
      else navigator.mediaSession.setPositionState();
    }
  } catch {}
}
function renderCalm() {
  const song = moods[mood];
  $('#calm-toggle').setAttribute('aria-pressed', String(calmPlaying));
  $('#calm-toggle').setAttribute('aria-label', musicLoading ? 'Cancel music loading' : calmPlaying ? 'Pause music' : 'Play music');
  $('#calm-label').textContent = song?.title || 'Pick your little soundtrack';
  $('#calm-hint').textContent = song?.hint || 'Different feelings, different little melodies.';
  $('#calm-play').textContent = calmPlaying ? 'Ⅱ Pause' : musicLoading ? 'Cancel' : '▶ Play';
  $('#music-state').textContent = musicError ? 'Couldn’t play · tap play to retry' : musicLoading ? 'Getting your melody ready…' : !song ? 'Choose a mood to begin' : volume === 0 ? 'Muted · check volume' : calmPlaying ? 'Playing for you' : 'Ready when you are';
  $('#now-playing').dataset.mood = mood || 'neutral';
  $('#artwork-mood').textContent = song?.name || 'A little space for you';
  $('#music-shuffle').setAttribute('aria-pressed',String(shuffle));
  $('#music-repeat').setAttribute('aria-pressed',String(repeat!=='off'));
  $('#music-repeat').setAttribute('aria-label',`Repeat ${repeat === 'one' ? 'one melody' : repeat === 'all' ? 'all melodies' : 'off'}`);
  $('#repeat-one').hidden=repeat!=='one';
  setText('#music-modes', `${{one:'Repeat one melody',all:'Repeat all melodies',off:'Repeat off'}[repeat]}${shuffle ? ' · Shuffle on' : ''}`);
  $('#music-favorite').disabled=!song;
  $('#music-favorite').setAttribute('aria-pressed',String(favorites.includes(mood)));
  $('#music-favorite').setAttribute('aria-label', favorites.includes(mood) ? 'Remove melody from favorites' : 'Favorite this melody');
  $('#music-favorite span').textContent=favorites.includes(mood)?'♥':'♡';
  document.querySelectorAll('button[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === mood)));
  document.querySelectorAll('[data-track]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.track===mood)); });
  try { if(navigator.mediaSession) navigator.mediaSession.playbackState=calmPlaying?'playing':mood?'paused':'none'; } catch {}
  renderMusicTime(); updateActivity();
}
function selectTrack(value, changeFeeling = false) {
  if(mood && mood !== value) { musicHistory.push(mood); if(musicHistory.length>50)musicHistory.shift(); }
  mood=value; musicError=false;
  if(changeFeeling){feeling=value;panini.setMood(value);}
  save(); renderCalm(); playMood();
}
function skipTrack(direction) {
  if(direction < 0 && phonePlayer.currentTime > 3) { phonePlayer.currentTime=0; renderMusicTime(); return; }
  if(direction < 0 && musicHistory.length) {
    mood=musicHistory.pop(); musicError=false; save();renderCalm();playMood();return;
  }
  selectTrack(nextTrack(mood,direction,shuffle));
}
function updateMediaMetadata() {
  try {
    if(navigator.mediaSession && window.MediaMetadata && mood) navigator.mediaSession.metadata=new MediaMetadata({title:moods[mood].title,artist:'Karan · For Delina',album:'Your little mood radio',artwork:[{src:new URL('./music-cover.svg',import.meta.url).href,sizes:'512x512',type:'image/svg+xml'}]});
  } catch {}
}
async function playMood() {
  if(!mood){mood='happy';save();}
  const request = ++musicRequest;
  musicLoading=true;musicError=false;renderCalm();updateMediaMetadata();
  const source = phoneSource(mood);
  if (phonePlayer.src !== source || phonePlayer.error) { phonePlayer.src = source; phonePlayer.load(); }
  phonePlayer.loop=repeat==='one';
  if (phonePlayer.volume !== volume) phonePlayer.volume = volume;
  try {
    await playMedia(phonePlayer);
    if(request !== musicRequest) return;
    calmPlaying = !phonePlayer.paused;
  } catch(error) {
    if(request !== musicRequest) return;
    phonePlayer.pause();calmPlaying=false;musicError=true;
    console.warn('Delina music could not start:', error);
    toast('Tap play to retry. Check media volume and Bluetooth output.');
  } finally { if(request === musicRequest){musicLoading=false;renderCalm();} }
}
document.querySelectorAll('button[data-mood]').forEach(button => button.addEventListener('click', () => selectTrack(button.dataset.mood,true)));
$('#calm-toggle').addEventListener('click', () => {
  if(calmPlaying || musicLoading){++musicRequest;stopMusic();renderCalm();}
  else playMood();
});
$('#music-next').addEventListener('click',()=>skipTrack(1));
$('#music-previous').addEventListener('click',()=>skipTrack(-1));
$('#music-shuffle').addEventListener('click',()=>{shuffle=!shuffle;save();renderCalm();});
$('#music-repeat').addEventListener('click',()=>{repeat={one:'all',all:'off',off:'one'}[repeat];phonePlayer.loop=repeat==='one';save();renderCalm();});
$('#music-favorite').addEventListener('click',()=>{if(!mood)return;favorites=favorites.includes(mood)?favorites.filter(value=>value!==mood):[...favorites,mood];save();renderCalm();});
$('#music-seek').addEventListener('input',event=>{if(!Number.isFinite(phonePlayer.duration))return;phonePlayer.currentTime=seekTime(Number(event.target.value)/1000*phonePlayer.duration,phonePlayer.duration);renderMusicTime();});
$('#music-queue-toggle').addEventListener('click',()=>{$('#music-queue').hidden=!$('#music-queue').hidden;$('#music-queue-toggle').setAttribute('aria-expanded',String(!$('#music-queue').hidden));});
for(const value of trackOrder){
  const item=document.createElement('li');const button=document.createElement('button');
  button.type='button';button.dataset.track=value;button.textContent=`${moods[value].name} · ${moods[value].title}`;button.addEventListener('click',()=>selectTrack(value));item.append(button);$('#music-queue').append(item);
}
if(navigator.mediaSession){
  for(const [action,handler] of Object.entries({play:()=>playMood(),pause:()=>{++musicRequest;stopMusic();renderCalm();},nexttrack:()=>skipTrack(1),previoustrack:()=>skipTrack(-1),seekto:details=>{if(Number.isFinite(details.seekTime) && Number.isFinite(phonePlayer.duration)){phonePlayer.currentTime=seekTime(details.seekTime,phonePlayer.duration);renderMusicTime();}}}))try{navigator.mediaSession.setActionHandler(action,handler);}catch{}
}
renderCalm();
$('#calm-volume').addEventListener('input',event=>{
  volume=Number(event.target.value)/100;
  phonePlayer.muted=false;phonePlayer.volume=volume;renderCalm();save();
});
$('#sound').checked = sound;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function save() {
  try { localStorage.setItem(key, JSON.stringify({ timer: timer.snapshot(), name, hint, sound, tiny, volume, mood, quoteAuto, linkMusic, musicPlayerVersion: 3, feeling, shuffle, repeat, favorites })); }
  catch { if (!storageNotice) { storageNotice = true; toast('Your browser could not save this timer. Keep this tab open.'); } }
}
async function unlockAudio() {
  try {
    // Supported Safari versions can classify this as music instead of ambient effects.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    if (!audio || audio.state === 'closed') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable in this browser');
      audio = new AudioContext();
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
    if (linkMusic && (calmPlaying || musicLoading)) { ++musicRequest; stopMusic(); renderCalm(); }
    chime(); stopAlarm();
    alarm = setInterval(chime, 6500);
    save();
  }
  lastState = state;
  updateActivity();ticker.sync();
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
  const musicHidden = $('#music-panel').hidden && !!mood && (calmPlaying || musicLoading || phonePlayer.currentSrc);
  $('#timer-activity').hidden = !timerHidden;
  $('#music-activity').hidden = !musicHidden;
  $('#music-quick-toggle').hidden = !musicHidden;$('#music-quick-next').hidden = !musicHidden;
  setText('#music-quick-toggle',calmPlaying || musicLoading ? 'Pause music' : 'Play music');
  $('#music-quick-toggle').setAttribute('aria-label',calmPlaying || musicLoading ? 'Pause music' : 'Play music');
  setText('#timer-activity', `Timer · ${timer.state === 'done' ? 'time’s up' : formatTime(timer.remaining)}${timer.state === 'paused' ? ' · paused' : ''} ↗`);
  setText('#music-activity', `Music · ${moods[mood]?.name || 'playing'} ↗`);
  $('#background-activity').hidden = !(timerHidden || musicHidden);
}
$('#timer-activity').addEventListener('click', () => space.show('timer'));
$('#music-activity').addEventListener('click', () => space.show('music'));
$('#music-quick-toggle').addEventListener('click',()=>$('#calm-toggle').click());
$('#music-quick-next').addEventListener('click',()=>skipTrack(1));
document.addEventListener('delina:features', updateActivity);
function refreshVisibility(){
  document.documentElement.classList.toggle('page-hidden',document.hidden);
  timer.tick();render();if(!document.hidden)renderMusicTime();
}
document.addEventListener('visibilitychange',refreshVisibility);
window.addEventListener('pageshow',event=>{if(event.persisted)refreshVisibility();});
window.addEventListener('pagehide', () => { ++musicRequest; ticker.stop(); save(); stopMusic(); renderCalm(); });
render();
