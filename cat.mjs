import { personality, catReaction } from './cat-model.mjs?v=98d2337a5beb';
export function visitDelay(random = Math.random) { return 90000 + Math.floor(random() * 150000); }
export class CatVisits {
  constructor({ show, hide, available, later = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), random = Math.random }) {
    Object.assign(this, { show, hide, available, later, cancel, random });
    this.enabled = true; this.pinned = false; this.visible = false;
  }
  schedule(delay = visitDelay(this.random)) {
    this.cancel(this.wait);
    if (this.enabled && !this.visible) this.wait = this.later(() => this.visit(), delay);
  }
  visit(manual = false) {
    this.cancel(this.wait);
    if (!manual && (!this.enabled || !this.available())) { this.schedule(); return; }
    this.visible = true; this.show(); this.armDeparture();
  }
  armDeparture() {
    this.cancel(this.departure);
    if (!this.pinned) this.departure = this.later(() => {
      if (!this.available()) { this.armDeparture(); return; }
      this.dismiss();
    }, 20000);
  }
  stay(value) { this.pinned = value; if(this.visible) this.armDeparture(); }
  dismiss() { this.cancel(this.departure); this.visible = false; this.hide(); this.schedule(); }
  enable(value) { this.enabled = value; if (!value) this.dismiss(); else this.schedule(); }
  dispose() { this.cancel(this.wait); this.cancel(this.departure); }
}
export function initCat({ mood = null, onMoodChange = () => {} } = {}) {
  const $ = selector => document.querySelector(selector);
  const card = $('#panini-visit'); let saved;
  try { saved = JSON.parse(localStorage.getItem('delina-panini-v1')); } catch {}
  let feeling = mood; let previous = -1; let reactionTimer;
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
    available: () => !document.hidden && !document.querySelector('dialog[open]') && !card.matches(':hover') && !card.contains(document.activeElement),
    show: () => { showMessage(); card.hidden = false; },
    hide: () => { card.hidden = true; }
  });
  visits.enabled = saved?.enabled !== false;
  visits.pinned = saved?.pinned === true;
  $('#panini-enabled').checked = visits.enabled;
  const save = () => { try { localStorage.setItem('delina-panini-v1', JSON.stringify({ enabled: visits.enabled, pinned: visits.pinned })); } catch {} };
  const renderStay = () => { $('#panini-stay').setAttribute('aria-pressed', String(visits.pinned)); $('#panini-stay').textContent = visits.pinned ? 'Staying with you ♡' : 'Stay with me'; };
  $('#panini-invite').addEventListener('click', () => visits.visit(true));
  $('#panini-dismiss').addEventListener('click', () => { $('#panini-invite').focus(); visits.dismiss(); });
  $('#panini-stay').addEventListener('click', () => { visits.stay(!visits.pinned); save(); renderStay(); });
  $('#panini-enabled').addEventListener('change', event => { visits.enable(event.target.checked); save(); });
  visits.setMood = value => { clearTimeout(reactionTimer); delete card.dataset.reaction; feeling = value; previous = -1; showMessage(); };
  $('#panini-mood').addEventListener('change', event => onMoodChange(event.target.value === 'neutral' ? null : event.target.value));
  function react(action) {
    clearTimeout(reactionTimer);
    card.dataset.reaction = action;
    $('#panini-message').textContent = catReaction(feeling, action);
    $('#panini-emotion').textContent = {pet:'Purring for you',treat:'Snack happiness',play:'A little paw-some nonsense',cheer:'A smile, if you feel like one'}[action];
    visits.armDeparture();
    reactionTimer = setTimeout(() => { delete card.dataset.reaction; $('#panini-emotion').textContent = personality(feeling).label; }, 3500);
  }
  for(const action of ['pet','treat','play','cheer']) $('#panini-'+action).addEventListener('click', () => react(action));
  $('#panini-pet-art').addEventListener('click', () => react('pet'));
  window.addEventListener('pagehide', () => { clearTimeout(reactionTimer); visits.dispose(); });
  window.addEventListener('pageshow', event => { if(event.persisted){ if(visits.visible) visits.armDeparture(); else visits.schedule(); } });
  showMessage(); renderStay(); visits.schedule(25000);
  return visits;
}
