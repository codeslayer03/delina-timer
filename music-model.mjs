export const trackOrder = ['happy','low','overwhelmed','focus','sleepy'];
export function nextTrack(current, direction = 1, shuffle = false, random = Math.random) {
 const index = trackOrder.indexOf(current);
 if(index < 0) return trackOrder[0];
 if(shuffle && direction > 0) return trackOrder[(index+1+Math.min(trackOrder.length-2,Math.floor(random()*(trackOrder.length-1))))%trackOrder.length];
 return trackOrder[(index+direction+trackOrder.length)%trackOrder.length];
}
export function seekTime(position, duration) {
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(position))return 0;
 return Math.max(0,Math.min(duration,position));
}
export function musicTime(seconds) {
 const value=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
 return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
}

// Start synchronously in the user's tap; recover if a media request never settles.
export async function playMedia(media, timeoutMs = 8000) {
 let timeout;
 try {
  await Promise.race([media.play(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Music loading timed out')),timeoutMs);})]);
 } finally {clearTimeout(timeout);}
}
