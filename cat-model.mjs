export const personalities = {
 happy: { state:'playful', label:'Tiny mischief mode', messages:['Your happy looks good on you. Shall we celebrate with a little nonsense?', 'Good mood detected. Deploying the silly little paws.', 'I brought my best zoomies. You bring your lovely self.'] },
 low: { state:'cuddly', label:'Extra gentle with you', messages:['A low day doesn’t make you any less lovely, Delina. I’m curling up beside you.', 'You don’t have to cheer up for me. We can just sit together for a little while.', 'Tiny delivery for my favorite human: one soft head bump, no expectations.'] },
 overwhelmed: { state:'calm', label:'One soft breath at a time', messages:['Let your shoulders drop a little. One slow breath with me. Nothing else just now.', 'Too much at once? We can make this moment smaller. Just one breath, together.', 'Rest your paws, Delina. The next little thing can wait for a moment.'] },
 focus: { state:'watchful', label:'Quiet study buddy', messages:['I’ll guard your little focus bubble. One thing at a time, human.', 'You do your little task. I’ll supervise from this extremely important loaf position.', 'A tiny step counts. I’m quietly rooting for you.'] },
 sleepy: { state:'sleepy', label:'Sleepy little loaf', messages:['My paws are tucked in. You can slow down too, Delina.', 'No more big things for this little moment. Just a soft breath and a slow blink.', 'Sleepy company reporting for duty. We can rest our busy little heads.'] },
 neutral: { state:'curious', label:'Just here for you', messages:['Just checking on my favorite human. Have you had a little water?', 'A little stretch? I’ll supervise, of course.', 'No big plans. Just you, me, and a cozy little moment.'] }
};
export function personality(mood) { return personalities[mood] || personalities.neutral; }
export function catReaction(mood, action, random = Math.random) {
 const gentle = mood === 'low' || mood === 'overwhelmed';
 const options = {
  pet: gentle ? ['Prrr. No need to do anything. Your hand and my little head are enough.', 'A slow blink, just for you. You’re safe in this tiny moment.'] : ['Prrrr. Yes, that is precisely the spot. You may continue.', 'Head scratches accepted. You have been promoted to favorite human.'],
  treat: ['For me? I shall remember this kindness for at least twelve whole minutes.', 'A tiny snack! My serious cat face has temporarily left the room.'],
  play: gentle ? ['One very gentle paw boop. We can play as slowly as you like.', 'I caught the little ball. You don’t have to chase anything today.'] : ['I meant to catch that on the first try. Obviously.', 'Pounce! The little ball has been thoroughly supervised.'],
  cheer: gentle ? ['I brought you a smile-sized gift: imagine me trying to fit into a teacup. Paws everywhere.', 'My plan was to catch your worries. I got distracted by a paper bag. But I’m still here with you.'] : ['Breaking news: I have sat in a box. It is now my entire kingdom.', 'I tried to help with the laundry. Apparently being the warmest sock is not a job.']
 };
 const replies=options[action] || personality(mood).messages;
 return replies[Math.min(replies.length-1,Math.floor(random()*replies.length))];
}
