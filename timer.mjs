export const MAX_SECONDS = 5999;
export class Timer {
  constructor(saved, now = Date.now()) {
    this.duration = 360;
    this.remaining = 360;
    this.deadline = null;
    this.state = 'idle';
    if (saved && Number.isInteger(saved.duration) && saved.duration > 0 && saved.duration <= MAX_SECONDS &&
        Number.isFinite(saved.remaining) && saved.remaining >= 0 && saved.remaining <= saved.duration &&
        ['idle', 'running', 'paused', 'done'].includes(saved.state) &&
        (saved.state !== 'running' || (Number.isFinite(saved.deadline) && saved.deadline > 0))) {
      Object.assign(this, { duration: saved.duration, remaining: saved.remaining, deadline: saved.deadline, state: saved.state });
      this.tick(now);
    }
  }
  set(seconds) {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_SECONDS) throw new RangeError('Choose a time from 00:01 to 99:59.');
    this.duration = this.remaining = seconds;
    this.deadline = null;
    this.state = 'idle';
  }
  start(now = Date.now()) {
    if (this.state === 'running') return;
    if (this.remaining <= 0) this.remaining = this.duration;
    this.deadline = now + this.remaining * 1000;
    this.state = 'running';
  }
  tick(now = Date.now()) {
    if (this.state === 'running') {
      this.remaining = Math.max(0, (this.deadline - now) / 1000);
      if (this.remaining === 0) { this.state = 'done'; this.deadline = null; }
    }
    return this.remaining;
  }
  pause(now = Date.now()) {
    if (this.state !== 'running') return;
    this.tick(now);
    if (this.state === 'running') { this.state = 'paused'; this.deadline = null; }
  }
  reset() { this.set(this.duration); }
  snapshot() { return { duration: this.duration, remaining: this.remaining, deadline: this.deadline, state: this.state }; }
}
export function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export class TimerTicker {
 constructor(timer, onTick, {later=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),hidden=()=>false,now=Date.now}={}) {
  Object.assign(this,{timer,onTick,later,cancel,hidden,now});
 }
 sync(){
  this.stop();
  if(this.timer.state==='running')this.pending=this.later(()=>{this.pending=null;this.timer.tick(this.now());this.onTick();},this.hidden()?1000:250);
 }
 stop(){this.cancel(this.pending);this.pending=null;}
}
