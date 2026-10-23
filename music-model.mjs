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
