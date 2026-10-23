// A quiet, original pentatonic music-box melody, synthesized locally.
const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 523.25, 659.25, 587.33, 523.25, 440];
export class Soundscape {
  constructor(context, volume = .3) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = volume;
    this.master.connect(context.destination);
    this.notes = new Set();
    this.index = 0;
  }
  setVolume(value) { this.master.gain.setTargetAtTime(value, this.context.currentTime, .15); }
  start() {
    if (this.interval) return;
    this.next = this.context.currentTime + .1;
    this.schedule();
    this.interval = setInterval(() => this.schedule(), 150);
  }
  schedule() {
    const now = this.context.currentTime;
    if (this.next < now) this.next = now + .1;
    while (this.next < now + .4) {
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = melody[this.index++ % melody.length];
      envelope.gain.setValueAtTime(0, this.next);
      envelope.gain.linearRampToValueAtTime(.09, this.next + .06);
      envelope.gain.exponentialRampToValueAtTime(.0001, this.next + 3.8);
      oscillator.connect(envelope); envelope.connect(this.master);
      this.notes.add(oscillator);
      oscillator.onended = () => { this.notes.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(this.next); oscillator.stop(this.next + 4);
      this.next += 2.5;
    }
  }
  stop() {
    clearInterval(this.interval); this.interval = null;
    this.master.gain.setTargetAtTime(0, this.context.currentTime, .12);
    for (const oscillator of this.notes) oscillator.stop(this.context.currentTime + .5);
  }
}
