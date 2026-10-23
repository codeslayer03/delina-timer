import { FEATURES, validFeatures } from './space-model.mjs?v=887ac35ece83';
const $ = selector => document.querySelector(selector);
const key = 'delina-space-v1';
export function initSpace() {
  let selected;
  try { selected = JSON.parse(localStorage.getItem(key)); } catch {}
  selected = validFeatures(selected);
  function apply() {
    selected = validFeatures(selected);
    for (const name of FEATURES) $(`#${name}-panel`).hidden = !selected.includes(name);
    const all = selected.length === FEATURES.length;
    document.body.dataset.view = all ? 'all' : selected.length === 1 ? selected[0] : 'mix';
    document.body.classList.toggle('single-feature', selected.length === 1);
    document.querySelectorAll('.feature-nav [data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === (all ? 'all' : selected.length === 1 ? selected[0] : 'mix'))));
    const labels = {music:'Music',timer:'Timer',weather:'Weather',quotes:'Quotes'};
    $('#space-summary').textContent = all ? 'All four, together. Make yourself at home.' : selected.map(name => labels[name]).join(' + ');
    $('#space-description').textContent = all ? 'A soundtrack, a little focus, your weather and a kind word.' : selected.length > 1 ? 'Your own combination. Just the things you need right now.' : {music:'Pick how you feel. Let Delina find the soundtrack.',timer:'One little moment, with a duck to watch the clock.',weather:'Your little patch of sky, and an outfit to match.',quotes:'A little encouragement, from her soft little heart to yours.'}[selected[0]];
    try { localStorage.setItem(key, JSON.stringify(selected)); } catch {}
    document.dispatchEvent(new CustomEvent('delina:features', { detail: [...selected] }));
  }
  document.querySelectorAll('.feature-nav [data-view]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.view === 'mix') {
      document.querySelectorAll('[name=feature]').forEach(input => { input.checked = selected.includes(input.value); });
      $('#mix-error').textContent = ''; $('#mix-dialog').showModal();
    } else { selected = button.dataset.view === 'all' ? [...FEATURES] : [button.dataset.view]; apply(); }
  }));
  $('#mix-form').addEventListener('submit', event => {
    event.preventDefault(); const values = [...document.querySelectorAll('[name=feature]:checked')].map(input => input.value);
    if (!values.length) { $('#mix-error').textContent = 'Choose at least one little thing for your space.'; return; }
    selected = values; $('#mix-dialog').close(); apply();
  });
  $('#close-mix').addEventListener('click', () => $('#mix-dialog').close());
  $('#mix-all').addEventListener('click', () => document.querySelectorAll('[name=feature]').forEach(input => { input.checked = true; }));
  function greeting() {
    const now = new Date(); const hour = now.getHours();
    $('#welcome-title').textContent = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, Delina.`;
    $('#today-date').textContent = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);
  }
  greeting(); setInterval(greeting,60000); apply();
  return { show(name) { selected = [name]; apply(); } };
}
