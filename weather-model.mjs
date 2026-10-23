export function weatherLook({ temperature_2m: temp, weather_code: code, wind_speed_10m: wind, is_day: day }) {
  if (![temp, code, wind, day].every(Number.isFinite) || !Number.isInteger(code) || ![0,1].includes(day)) throw new Error('Weather data is incomplete.');
  const snow = [71,73,75,77,85,86].includes(code);
  const rain = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);
  let condition = code === 0 ? (day ? 'Clear skies' : 'Clear night') : code <= 2 ? 'Partly cloudy' : code === 3 ? 'Cloudy' : [45,48].includes(code) ? 'Misty' : snow ? 'Snowy' : code >= 95 ? 'Thunderstorms' : rain ? 'Rainy' : 'Changing skies';
  if (snow) return { outfit: 'snow', icon: '❄', condition, note: 'A woolly hat and scarf. Snowflake snuggles!' };
  if (rain) return { outfit: 'rain', icon: '☂', condition, note: 'Raincoat on. A little rain won’t dim our sparkle.' };
  if (temp <= 10) return { outfit: 'cold', icon: '♡', condition, note: 'A cozy cardigan and scarf to keep her toasty.' };
  if (wind >= 25) return { outfit: 'wind', icon: '〰', condition: `${condition} · breezy`, note: 'Scarf tucked in. Hold on to your little bow!' };
  if (!day) return { outfit: 'night', icon: '☾', condition, note: 'Starry pajamas for a softer little evening.' };
  if (code <= 1 && temp >= 18) return { outfit: 'sun', icon: '☀', condition, note: 'Sunnies and a little daisy. Hello, sunshine!' };
  return { outfit: 'cloud', icon: '☁', condition, note: 'A little lavender cardigan for cloudy-day comfort.' };
}
export function validPlace(place) {
  return place && typeof place.name === 'string' && place.name.length <= 150 && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
}
