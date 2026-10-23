import { weatherLook, validPlace } from './weather-model.mjs';
const $ = selector => document.querySelector(selector);
const key = 'delina-weather-v1';
let place, controller, searchController, lastFetch = 0;
try { const saved = JSON.parse(localStorage.getItem(key)); if (validPlace(saved)) place = saved; } catch {}
const baseTitle = 'Delina, a tiny yellow duck with a pink bow hairband, rosy cheeks and eyelashes, holding a green stopwatch';
async function jsonFetch(url, signal) {
  const response = await fetch(url, { signal, referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('The weather service is taking a little break. Please try again.');
  return response.json();
}
function clearOutfit() {
  $('#scene').dataset.sky = '';
  $('#duck-title').textContent = baseTitle;
}
async function refresh() {
  if (!validPlace(place)) return;
  controller?.abort(); const request = new AbortController(); controller = request;
  const timeout = setTimeout(() => request.abort(), 10000);
  $('#weather-status').textContent = 'Checking your little patch of sky…';
  $('#weather-place').textContent = place.name;
  $('#change-weather').textContent = 'Change city';
  $('#refresh-weather').hidden = false;
  const query = new URLSearchParams({latitude:place.latitude, longitude:place.longitude, current:'temperature_2m,weather_code,is_day,wind_speed_10m', timezone:'auto', forecast_days:'1'});
  try {
    const result = await jsonFetch(`https://api.open-meteo.com/v1/forecast?${query}`, request.signal);
    if (controller !== request) return;
    const look = weatherLook(result.current || {});
    lastFetch = Date.now();
    $('#scene').dataset.sky = look.outfit;
    $('#duck-title').textContent = `${baseTitle}. ${look.note}`;
    $('#weather-icon').textContent = look.icon;
    $('#weather-temp').textContent = `${Math.round(result.current.temperature_2m)}°C`;
    $('#weather-condition').textContent = look.condition;
    $('#weather-outfit').textContent = look.note;
    const time = typeof result.current.time === 'string' ? result.current.time.split('T')[1]?.slice(0,5) : '';
    $('#weather-status').textContent = time ? `Weather at ${time} local time · refreshed every 15 min` : 'Current weather · refreshed every 15 min';
  } catch (error) {
    if (controller !== request) return;
    clearOutfit(); $('#weather-icon').textContent = '♡'; $('#weather-temp').textContent = '—';
    $('#weather-condition').textContent = 'Weather unavailable';
    $('#weather-status').textContent = 'Couldn’t check the sky. Tap refresh to try again.';
    $('#weather-outfit').textContent = 'Her pink bow is lovely in any weather.';
  } finally { clearTimeout(timeout); }
}
function choosePlace(selected) {
  if (!validPlace(selected)) return;
  place = selected;
  try { localStorage.setItem(key, JSON.stringify(place)); } catch {}
  $('#weather-dialog').close(); refresh();
}
$('#change-weather').addEventListener('click', () => {
  $('#weather-dialog').showModal(); $('#weather-error').textContent = ''; $('#city-results').replaceChildren();
});
$('#close-weather').addEventListener('click', () => $('#weather-dialog').close());
$('#city-form').addEventListener('submit', async event => {
  event.preventDefault(); searchController?.abort();
  const request = new AbortController(); searchController = request;
  const timeout = setTimeout(() => request.abort(), 10000);
  $('#city-results').replaceChildren(); $('#weather-error').textContent = 'Looking for your city…';
  try {
    const query = new URLSearchParams({name:$('#city-query').value.trim(),count:'5',language:'en',format:'json'});
    const result = await jsonFetch(`https://geocoding-api.open-meteo.com/v1/search?${query}`,request.signal);
    if (searchController !== request) return;
    const choices = (result.results || []).filter(item => validPlace(item));
    $('#weather-error').textContent = choices.length ? 'Choose your city below.' : 'No city found. Try a nearby town or add a country.';
    for (const city of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'city-choice';
      const name = [city.name,city.admin1,city.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
      button.textContent = name;
      button.addEventListener('click', () => choosePlace({name,latitude:city.latitude,longitude:city.longitude}));
      $('#city-results').append(button);
    }
  } catch { if (searchController === request) $('#weather-error').textContent = 'City search couldn’t connect. Please try again.'; }
  finally { clearTimeout(timeout); }
});
$('#use-location').addEventListener('click', () => {
  if (!navigator.geolocation) { $('#weather-error').textContent = 'Location isn’t available. You can search for your city instead.'; return; }
  $('#weather-error').textContent = 'Waiting for your location permission…';
  navigator.geolocation.getCurrentPosition(position => choosePlace({name:'Your little patch of sky',latitude:Number(position.coords.latitude.toFixed(2)),longitude:Number(position.coords.longitude.toFixed(2))}),
    () => { $('#weather-error').textContent = 'No location shared. Search for a city instead.'; }, {enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
$('#refresh-weather').addEventListener('click', refresh);
setInterval(() => { if (!document.hidden && Date.now()-lastFetch >= 900000) refresh(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now()-lastFetch >= 900000) refresh(); });
if (place) refresh();
