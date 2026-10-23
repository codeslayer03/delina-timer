// Original little soundtracks. Mood changes melody, pace, register, and texture.
export const moods = {
  happy: { name: 'Happy', title: 'A pocketful of sunshine', hint: 'Bright little bells for your happy heart', notes: [72,76,79,81,79,76,74,79,76,72,69,72], pace: .62, tail: 1.3, level: .085, shimmer: .18 },
  low: { name: 'A little low', title: 'A little hug in a melody', hint: 'Warm, unhurried notes. No need to rush a feeling.', notes: [60,64,67,64,62,60,57,60,64,62,60,55], pace: 2.1, tail: 4.5, level: .075, shimmer: .04 },
  overwhelmed: { name: 'Overwhelmed', title: 'Room to breathe', hint: 'Soft, spacious tones. One little breath at a time.', notes: [57,64,69,64,57,60,67,60], pace: 3.4, tail: 6, level: .055, shimmer: 0 },
  focus: { name: 'Need focus', title: 'One little thing at a time', hint: 'An even, quiet rhythm for your next small step', notes: [60,67,64,67,60,69,64,67,62,67,64,67], pace: 1.1, tail: 2.2, level: .065, shimmer: .06 },
  sleepy: { name: 'Sleepy', title: 'Moonlight & little dreams', hint: 'Low, sleepy notes for winding down', notes: [55,60,64,60,57,55,52,55,60,57,55,48], pace: 2.8, tail: 5.5, level: .055, shimmer: 0 }
};
export class Soundscape {
  constructor(context, volume = .3, mood = 'overwhelmed') {
    this.context = context;
    this.song = moods[mood] || moods.overwhelmed;
    this.master = context.createGain();
    this.master.gain.value = volume;
    this.master.connect(context.destination);
    this.notes = new Set(); this.index = 0; this.stopped = false;
  }
  setVolume(value) { if (!this.stopped) this.master.gain.setTargetAtTime(value, this.context.currentTime, .15); }
  start() {
    if (this.interval || this.stopped) return;
    this.next = this.context.currentTime + .1; this.schedule();
    this.interval = setInterval(() => this.schedule(), 100);
  }
  schedule() {
    const now = this.context.currentTime;
    if (this.next < now) this.next = now + .1;
    while (this.next < now + .3) {
      const frequency = 440 * 2 ** ((this.song.notes[this.index++ % this.song.notes.length] - 69) / 12);
      this.note(frequency, this.next, this.song.level);
      if (this.song.shimmer) this.note(frequency * 2, this.next + .015, this.song.level * this.song.shimmer);
      this.next += this.song.pace;
    }
  }
  note(frequency, at, level) {
    const oscillator = this.context.createOscillator(); const envelope = this.context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + .07);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + this.song.tail);
    oscillator.connect(envelope); envelope.connect(this.master); this.notes.add(oscillator);
    oscillator.onended = () => { this.notes.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); if (this.stopped && !this.notes.size) this.master.disconnect(); };
    oscillator.start(at); oscillator.stop(at + this.song.tail + .1);
  }
  stop() {
    if (this.stopped) return;
    this.stopped = true; clearInterval(this.interval); this.interval = null;
    this.master.gain.setTargetAtTime(0, this.context.currentTime, .12);
    for (const oscillator of this.notes) oscillator.stop(this.context.currentTime + .5);
    if (!this.notes.size) this.master.disconnect();
  }
}
