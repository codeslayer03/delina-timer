import { CatMotion } from './cat-motion.mjs?v=cc6917e89bd0';
import { personality, catReaction } from './cat-model.mjs?v=cc6917e89bd0';
export function visitDelay(random = Math.random) { return 90000 + Math.floor(random() * 150000); }
export class CatVisits {
  constructor({ show, hide, available, later = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), random = Math.random }) {
    Object.assign(this, { show, hide, available, later, cancel, random });
    this.enabled = true; this.pinned = false; this.visible = false; this.suspended = false;
  }
  schedule(delay = visitDelay(this.random)) {
    this.cancel(this.wait);
    if (this.enabled && !this.visible && !this.suspended) this.wait = this.later(() => this.visit(), delay);
  }
  visit(manual = false) {
    this.cancel(this.wait);
    if (this.suspended) return;
    if (!manual && (!this.enabled || !this.available())) { this.schedule(); return; }
    this.visible = true; this.show(); this.armDeparture();
  }
  armDeparture() {
    this.cancel(this.departure);
    if (!this.pinned && !this.suspended) this.departure = this.later(() => {
      if (!this.available()) { this.armDeparture(); return; }
      this.dismiss();
    }, 20000);
  }
  stay(value) { this.pinned = value; if(this.visible) this.armDeparture(); }
  dismiss() { this.cancel(this.departure); this.visible = false; this.hide(); this.schedule(); }
  enable(value) { this.enabled = value; if (!value) this.dismiss(); else this.schedule(); }
  suspend(value) {
    this.suspended=value; this.cancel(this.wait); this.cancel(this.departure);
    if(!value){if(this.visible)this.armDeparture();else this.schedule();}
  }
  dispose() { this.cancel(this.wait); this.cancel(this.departure); }
}
export function initCat({ mood = null, onMoodChange = () => {} } = {}) {
  const $ = selector => document.querySelector(selector);
  const card = $('#panini-visit'); let saved;
  try { saved = JSON.parse(localStorage.getItem('delina-panini-v1')); } catch {}
  let feeling = mood; let previous = -1; let reactionTimer;
  let motionEnabled = saved?.motion !== false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const roamLane = document.createElement('div');roamLane.className='panini-roam-lane';
  const roamTrack = document.createElement('div');roamTrack.className='panini-roam-track';
  const roamer = document.createElement('button');roamer.type='button';roamer.className='panini-roamer';roamer.id='panini-roamer';
  roamer.setAttribute('aria-label','Open Panini’s check-in');
  const roamingCat = card.querySelector('svg').cloneNode(true);roamingCat.removeAttribute('aria-label');roamingCat.setAttribute('aria-hidden','true');roamingCat.classList.add('panini-roamer-cat');
  roamer.append(roamingCat);const roamName=document.createElement('span');roamName.textContent='Panini ♡';roamer.append(roamName);roamTrack.append(roamer);roamLane.append(roamTrack);document.body.append(roamLane);
  const motion = new CatMotion({draw:pose=>{card.dataset.motion=pose;}});
  function syncMotion() {
    card.dataset.motionEnabled=String(motionEnabled && !reduced.matches);
    motion.update({visible:!card.hidden,enabled:motionEnabled,reduced:reduced.matches,hidden:document.hidden,mood:feeling,reacting:!!card.dataset.reaction});
    $('#panini-motion').checked=motionEnabled;
    $('#panini-card-motion').checked=motionEnabled;
    roamLane.hidden=!card.hidden || !motionEnabled || reduced.matches || document.hidden || !!document.querySelector('dialog[open]');
    document.body.classList.toggle('panini-roaming',motionEnabled && !reduced.matches);
    roamLane.dataset.feeling=feeling || 'neutral';
    $('#panini-motion-note').textContent=reduced.matches ? 'Your device’s reduced-motion setting is on.' : 'Tap Panini as she wanders along the bottom.';
  }
  function showMessage() {
    const profile = personality(feeling);
    card.dataset.mood = profile.state;
    $('#panini-emotion').textContent = profile.label;
    $('#panini-mood').value = feeling || 'neutral';
    $('#panini-cheer').textContent = feeling === 'low' || feeling === 'overwhelmed' ? 'A little comfort ♡' : 'Make me smile ♡';
    const messages = profile.messages;
    let index = Math.floor(Math.random() * (messages.length - 1)); if(index >= previous) index++;
    previous = index; $('#panini-message').textContent = messages[index];
  }
  const visits = new CatVisits({
    available: () => !document.hidden && !document.querySelector('dialog[open]') && !card.matches(':hover') && !card.contains(document.activeElement) && !roamer.matches(':hover') && !roamer.contains(document.activeElement),
    show: () => { showMessage(); card.hidden = false; syncMotion(); },
    hide: () => { card.hidden = true; clearTimeout(reactionTimer); delete card.dataset.reaction; syncMotion(); }
  });
  visits.enabled = saved?.enabled !== false;
  visits.pinned = saved?.pinned === true;
  $('#panini-enabled').checked = visits.enabled;
  const save = () => { try { localStorage.setItem('delina-panini-v1', JSON.stringify({ enabled: visits.enabled, pinned: visits.pinned, motion: motionEnabled })); } catch {} };
  const renderStay = () => { $('#panini-stay').setAttribute('aria-pressed', String(visits.pinned)); $('#panini-stay').textContent = visits.pinned ? 'Staying with you ♡' : 'Stay with me'; };
  $('#panini-invite').addEventListener('click', () => visits.visit(true));
  roamer.addEventListener('click',()=>{visits.visit(true);$('#panini-pet-art').focus({preventScroll:true});});
  $('#panini-dismiss').addEventListener('click', () => { visits.dismiss(); (roamLane.hidden ? $('#panini-invite') : roamer).focus(); });
  $('#panini-stay').addEventListener('click', () => { visits.stay(!visits.pinned); save(); renderStay(); });
  $('#panini-enabled').addEventListener('change', event => { visits.enable(event.target.checked); save(); });
  visits.setMood = value => { clearTimeout(reactionTimer); delete card.dataset.reaction; feeling = value; previous = -1; showMessage(); syncMotion(); };
  $('#panini-mood').addEventListener('change', event => onMoodChange(event.target.value === 'neutral' ? null : event.target.value));
  function react(action) {
    clearTimeout(reactionTimer);
    card.dataset.reaction = action;
    $('#panini-message').textContent = catReaction(feeling, action);
    $('#panini-emotion').textContent = {pet:'Purring for you',treat:'Snack happiness',play:'A little paw-some nonsense',cheer:'A smile, if you feel like one'}[action];
    visits.armDeparture(); syncMotion();
    reactionTimer = setTimeout(() => { delete card.dataset.reaction; $('#panini-emotion').textContent = personality(feeling).label; syncMotion(); }, 3500);
  }
  for(const action of ['pet','treat','play','cheer']) $('#panini-'+action).addEventListener('click', () => react(action));
  $('#panini-pet-art').addEventListener('click', () => react('pet'));
  $('#panini-motion').addEventListener('change', event=>{motionEnabled=event.target.checked;save();syncMotion();});
  $('#panini-card-motion').addEventListener('change',event=>{motionEnabled=event.target.checked;save();syncMotion();});
  const dialogObserver=new MutationObserver(syncMotion);
  document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
  reduced.addEventListener('change',syncMotion);
  document.addEventListener('visibilitychange',()=>{visits.suspend(document.hidden);syncMotion();});
  window.addEventListener('pagehide', () => { clearTimeout(reactionTimer); visits.dispose(); motion.dispose(); });
  window.addEventListener('pageshow', event => { if(event.persisted){ visits.suspend(document.hidden); syncMotion(); } });
  showMessage(); renderStay(); syncMotion(); visits.schedule();
  return visits;
}
