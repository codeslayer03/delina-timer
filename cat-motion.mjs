const poses = {
 happy: ['walk-right','stretch','walk-left','peek'],
 low: ['nuzzle','rest','stretch'],
 overwhelmed: ['breathe','rest'],
 focus: ['peek','rest'],
 sleepy: ['sleep','rest'],
 neutral: ['walk-right','peek','walk-left','stretch']
};
export function motionPose(mood, step = 0) {
 const choices = poses[mood] || poses.neutral;
 return choices[Math.max(0,step)%choices.length];
}
// One slow timer per visible visit. CSS performs the movement between poses.
export class CatMotion {
 constructor({draw,later=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}) {
  Object.assign(this,{draw,later,cancel}); this.state={visible:false,enabled:true,reduced:false,hidden:false,mood:null,reacting:false};this.step=0;
 }
 update(changes) {
  this.state={...this.state,...changes};this.cancel(this.timer);this.timer=null;
  const {visible,enabled,reduced,hidden,reacting}=this.state;
  if(!visible||!enabled||reduced||hidden||reacting){this.draw('rest');return;}
  this.tick();
 }
 tick(){
  this.draw(motionPose(this.state.mood,this.step++));
  this.timer=this.later(()=>this.tick(),this.state.mood==='happy'?6500:9500);
 }
 dispose(){this.cancel(this.timer);this.timer=null;this.draw('rest');}
}
