// Original notes written for Delina; no quote API or tracking.
export const quotes = [
  'One little step is still a step. I’m proud of you.',
  'You can do lovely things at your own gentle pace.',
  'Unclench your shoulders, sweetheart. You have a little room to breathe.',
  'You don’t have to bloom all at once. Little by little is lovely, too.',
  'A sip of water, a deep breath, a fresh little start.',
  'You bring something sweet to the world just by being you.',
  'Rest is part of the journey. Even little ducks float for a while.',
  'Let’s do the next small thing together. I’ll be right here.',
  'A tricky moment doesn’t get to decide your whole day.',
  'Look how far your tiny steps have already carried you.',
  'There is time to try again, and time for a cozy cup of tea.',
  'Your best can look different today. It still counts.',
  'Leave a little space in your day for something that makes you smile.',
  'A soft heart and a small brave step can go a long way.',
  'You’re allowed to pause without giving up.',
  'Some days, showing up is the brave little thing.',
  'You deserve the same kindness you give so freely.',
  'Take today one little feather at a time.',
  'The little things you’re doing matter, even when nobody sees them.',
  'A little less hurry. A little more kindness to yourself.',
  'There’s no perfect pace for becoming yourself.',
  'Let the day be a little softer around the edges.',
  'I saved you a quiet moment. It’s yours whenever you need it.',
  'You’ve done enough to deserve a peaceful little evening.'
];
export function dailyQuoteIndex(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) % quotes.length;
}
export function dayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'A soft start to your morning';
  if (hour < 17) return 'A little kindness for your afternoon';
  return 'A cozy moment for your evening';
}
