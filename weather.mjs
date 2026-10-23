import { weatherLook, validPlace } from './weather-model.mjs?v=5efd3606c7c5';
const $ = selector => document.querySelector(selector);
const key = 'delina-weather-v1';
let place, controller, searchController, lastFetch = 0, weatherData, locationRequest = 0;
let unit = 'c';
try { if (localStorage.getItem('delina-weather-unit') === 'f') unit = 'f'; } catch {}
$('#weather-unit').value = unit;
function updateReading() {
  if (!weatherData) return;
  const value = unit === 'f' ? weatherData.temperature_2m * 9 / 5 + 32 : weatherData.temperature_2m;
  $('#weather-temp').textContent = `${Math.round(value)}°${unit.toUpperCase()}`;
}
$('#weather-unit').addEventListener('change', event => {
  unit = event.target.value; updateReading();
  try { localStorage.setItem('delina-weather-unit', unit); } catch {}
});
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
  if (!validPlace(place) || $('#weather-panel').hidden) return;
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
    weatherData = result.current; updateReading();
    $('#weather-condition').textContent = look.condition;
    $('#weather-outfit').textContent = look.note;
    const time = typeof result.current.time === 'string' ? result.current.time.split('T')[1]?.slice(0,5) : '';
    $('#weather-status').textContent = time ? `Weather at ${time} local time · refreshed every 15 min` : 'Current weather · refreshed every 15 min';
  } catch (error) {
    if (controller !== request) return;
    weatherData = null; clearOutfit(); $('#weather-icon').textContent = '♡'; $('#weather-temp').textContent = '—';
    $('#weather-condition').textContent = 'Weather unavailable';
    $('#weather-status').textContent = 'Couldn’t check the sky. Tap refresh to try again.';
    $('#weather-outfit').textContent = 'Her pink bow is lovely in any weather.';
  } finally { clearTimeout(timeout); }
}
function choosePlace(selected) {
  if (!validPlace(selected)) return;
  place = selected;
  weatherData = null;
  clearOutfit();
  $('#weather-temp').textContent = '—';
  $('#weather-condition').textContent = 'Checking the sky…';
  $('#weather-icon').textContent = '☁';
  $('#weather-outfit').textContent = 'Choosing a little outfit for your sky…';
  try { localStorage.setItem(key, JSON.stringify(place)); } catch {}
  $('#weather-dialog').close(); refresh();
}
$('#change-weather').addEventListener('click', () => {
  $('#weather-dialog').showModal(); $('#weather-error').textContent = ''; $('#city-results').replaceChildren();
});
$('#close-weather').addEventListener('click', () => $('#weather-dialog').close());
$('#weather-dialog').addEventListener('close', () => {
  ++locationRequest;
  searchController?.abort();
  searchController = undefined;
});
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
  const request = ++locationRequest;
  $('#weather-error').textContent = 'Waiting for your location permission…';
  navigator.geolocation.getCurrentPosition(position => {
    if (request !== locationRequest || !$('#weather-dialog').open) return;
    choosePlace({name:'Your little patch of sky',latitude:Number(position.coords.latitude.toFixed(2)),longitude:Number(position.coords.longitude.toFixed(2))});
  }, () => {
    if (request === locationRequest && $('#weather-dialog').open) $('#weather-error').textContent = 'No location shared. Search for a city instead.';
  }, {enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
$('#forget-city').addEventListener('click', () => {
  controller?.abort(); controller = undefined; place = undefined; weatherData = null; lastFetch = 0;
  try { localStorage.removeItem(key); } catch {}
  clearOutfit(); $('#weather-place').textContent = 'Where’s your little world?';
  $('#weather-temp').textContent = '—'; $('#weather-condition').textContent = 'Choose a city to see its weather';
  $('#weather-icon').textContent = '☁'; $('#weather-status').textContent = 'I’ll dress for the weather when you choose a place.';
  $('#weather-outfit').textContent = 'Her favorite pink bow, whatever the sky brings.';
  $('#change-weather').textContent = 'Choose a city'; $('#refresh-weather').hidden = true; $('#weather-dialog').close();
});
document.addEventListener('delina:features', () => { if (!$('#weather-panel').hidden && Date.now()-lastFetch >= 900000) refresh(); });
$('#refresh-weather').addEventListener('click', refresh);
setInterval(() => { if (!document.hidden && Date.now()-lastFetch >= 900000) refresh(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now()-lastFetch >= 900000) refresh(); });
if (place) refresh();
