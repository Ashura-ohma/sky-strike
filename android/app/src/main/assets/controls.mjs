/** Input math is independent of the display refresh rate and world camera. */
export function analogStick(dx,dy,radius,deadzone=.1){
  const length=Math.hypot(dx,dy),limited=Math.min(length,Math.max(1,radius));
  const strength=Math.max(0,(limited/Math.max(1,radius)-deadzone)/(1-deadzone));
  const nx=length?dx/length:0,ny=length?dy/length:0;
  return {x:nx*strength,y:ny*strength,magnitude:strength,knobX:nx*limited,knobY:ny*limited};
}
export function worldInput(x,y,screenVector){
  const magnitude=Math.min(1,Math.hypot(x,y));
  if(magnitude<1e-6)return {x:0,z:0};
  const vector=screenVector(x,y),length=Math.hypot(vector.x,vector.z);
  if(!Number.isFinite(length)||length<1e-6)return {x:0,z:0};
  return {x:vector.x/length*magnitude,z:vector.z/length*magnitude};
}
/** At most 5 steps catch up after a slow frame; a long interruption never bursts. */
export class FixedStepClock{
  constructor(step=1/60,maxSteps=5){this.step=step;this.maxSteps=maxSteps;this.accumulator=0;}
  reset(){this.accumulator=0;}
  advance(seconds,simulate){
    if(!Number.isFinite(seconds)||seconds<0||seconds>.25){this.reset();return 0;}
    this.accumulator=Math.min(this.accumulator+seconds,this.step*this.maxSteps);
    let count=0;
    while(this.accumulator+1e-9>=this.step&&count<this.maxSteps){
      this.accumulator=Math.max(0,this.accumulator-this.step);count++;
      if(simulate(this.step)===false){this.reset();break;}
    }
    return count;
  }
}
