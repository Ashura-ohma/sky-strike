import {moveWithCollision} from './movement.mjs';

// The kit uses ordinary Arena projectiles/effects so renderers can observe it
// without owning any gameplay timers. Damage values are balanced for this game.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const direction=(a,b)=>{const d=distance(a,b)||1;return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};};
export const DRAVEN_COSTS=[35,35,55,90];
export const DRAVEN_COOLDOWNS=[7,10,11,32];
export function setupDraven(h){
  if(h.kind==='draven'&&!h.draven)h.draven={axes:0,adoration:0,catchCount:0,bloodRushUntil:0,rushMoveUntil:0,axeExpiresAt:0,ultimateId:null};
  return h.draven;
}
export function activeDravenAxes(arena,h){
  return (h.draven?.axes||0)+arena.shots.filter(s=>s.source===h.id&&s.kind==='draven-axe'&&s.life>0).length+arena.effects.filter(e=>e.source===h.id&&e.kind==='axe-catch'&&e.life>0).length;
}
export function dravenRecast(arena,h,index){
  if(h.kind!=='draven'||index!==3)return false;
  const shot=arena.shots.find(s=>s.id===h.draven?.ultimateId&&s.life>0);
  if(!shot||shot.leg!=='out')return false;
  shot.leg='back';shot.hitIds=[];shot.dir=direction(shot,h);
  h.recall=0;arena.event('cast',{id:h.id,index,recast:true});return true;
}
export function dravenHaste(arena,h){return h.draven?.bloodRushUntil>arena.time ? .35+.04*Math.max(0,(h.skillLevels?.[1]||1)-1) : 0;}
export function dravenSpeed(arena,h){
  const remaining=(h.draven?.rushMoveUntil||0)-arena.time;
  return remaining>0?1+(.34+.025*Math.max(0,(h.skillLevels?.[1]||1)-1))*Math.min(1,remaining/1.6):1;
}
export function castDraven(arena,h,index,dir,amp){
  const d=setupDraven(h);
  if(index===0){
    if(activeDravenAxes(arena,h)<2)d.axes++;
    d.axeExpiresAt=arena.time+8;
    arena.effects.push({id:++arena.nextId,kind:'ring',team:h.team,x:h.x,z:h.z,radius:2.3,life:.35,maxLife:.35});
  }else if(index===1){
    d.bloodRushUntil=arena.time+3.5;d.rushMoveUntil=arena.time+1.6;
    arena.effects.push({id:++arena.nextId,kind:'ring',team:h.team,x:h.x,z:h.z,radius:2.8,life:.35,maxLife:.35});
  }else if(index===2){
    arena.shots.push({id:++arena.nextId,kind:'draven-e',source:h.id,team:h.team,x:h.x,z:h.z,dir,speed:26,damage:(75+h.attack*.65)*amp,life:19/26,radius:1.6,spell:true,physical:true,hitIds:[],pierce:Infinity});
  }else{
    const shot={id:++arena.nextId,kind:'draven-r',source:h.id,team:h.team,x:h.x,z:h.z,dir,speed:25,damage:(150+h.attack*1.05)*amp,life:8,radius:2.1,spell:true,physical:true,hitIds:[],leg:'out',distance:0,range:52};
    arena.shots.push(shot);d.ultimateId=shot.id;
  }
}
export function prepareDravenAttack(arena,h,damage){
  const d=setupDraven(h);
  if(!d||d.axes<1)return {damage,kind:'attack'};
  d.axes--;d.axeExpiresAt=arena.time+8;
  const amp=1+.16*Math.max(0,(h.skillLevels[0]||1)-1);
  return {damage:damage+(28+h.attack*.65)*amp,kind:'draven-axe'};
}
export function landDravenAxe(arena,shot){
  if(shot.kind!=='draven-axe'||shot.bounced)return;
  shot.bounced=true;
  const h=arena.byId(shot.source);if(!h?.alive||h.kind!=='draven')return;
  // Bias the reachable landing spot toward the player's actual movement,
  // rather than the attack-facing direction, which supports orb walking.
  let dx=h.velocityX||h.x-(h._frameX??h.x),dz=h.velocityZ||h.z-(h._frameZ??h.z);
  const length=Math.hypot(dx,dz),point={type:'hero',x:h.x,z:h.z,radius:h.radius};
  if(length>.01)moveWithCollision(point,dx/length*3.6,dz/length*3.6,arena.blockers);
  const life=2.05;
  arena.effects.push({id:++arena.nextId,kind:'axe-catch',source:h.id,team:h.team,x:point.x,z:point.z,radius:1.9,landAt:arena.time+.72,expiresAt:arena.time+life,life,maxLife:life});
}
export function tickDraven(arena,h){
  if(h.kind!=='draven')return;
  const d=setupDraven(h);if(!h.alive)return;
  if(arena.time>=d.axeExpiresAt)d.axes=0;
  for(const e of arena.effects){
    if(e.kind!=='axe-catch'||e.source!==h.id||e.life<=0)continue;
    if(arena.time>=e.expiresAt){e.life=0;arena.event('draven-miss',{id:h.id});continue;}
    if(arena.time>=e.landAt&&distance(h,e)<=e.radius+h.radius*.25){
      e.life=0;d.axes=Math.min(2,d.axes+1);d.adoration++;d.catchCount++;d.axeExpiresAt=arena.time+8;h.skillCd[1]=0;
      arena.event('draven-catch',{id:h.id,x:e.x,z:e.z,axes:d.axes,adoration:d.adoration});
    }
  }
  if(d.ultimateId&&!arena.shots.some(s=>s.id===d.ultimateId&&s.life>0))d.ultimateId=null;
}
export function dravenCatchGoal(arena,h){
  if(h.kind!=='draven'||h.health<h.maxHealth*.3)return null;
  return arena.effects.filter(e=>e.kind==='axe-catch'&&e.source===h.id&&e.life>.15&&distance(h,e)<8).sort((a,b)=>a.expiresAt-b.expiresAt)[0]||null;
}
function segmentHits(arena,shot,end){
  const dx=end.x-shot.x,dz=end.z-shot.z,len2=dx*dx+dz*dz;
  return arena.units.filter(t=>t.alive&&t.team!==shot.team&&!['base','tower'].includes(t.type)&&!shot.hitIds.includes(t.id)).map(t=>{
    const fraction=Math.max(0,Math.min(1,((t.x-shot.x)*dx+(t.z-shot.z)*dz)/(len2||1)));
    return {target:t,fraction,hit:Math.hypot(t.x-(shot.x+dx*fraction),t.z-(shot.z+dz*fraction))<=shot.radius+t.radius};
  }).filter(item=>item.hit).sort((a,b)=>a.fraction-b.fraction||a.target.id-b.target.id);
}
export function tickDravenShot(arena,shot,dt){
  if(shot.kind!=='draven-e'&&shot.kind!=='draven-r')return false;
  const h=arena.byId(shot.source);
  if(!h?.alive){shot.life=0;return true;}
  const step=shot.speed*Math.min(dt,shot.life);shot.life-=dt;
  if(shot.kind==='draven-r'&&shot.leg==='back')shot.dir=direction(shot,h);
  const travel=shot.kind==='draven-r'?Math.min(step,shot.leg==='out'?shot.range-shot.distance:distance(shot,h)):step;
  const end={x:shot.x+shot.dir.x*travel,z:shot.z+shot.dir.z*travel};
  let reverse=false;
  for(const hit of segmentHits(arena,shot,end)){
    const target=hit.target,falloff=shot.kind==='draven-r'?Math.pow(.85,Math.min(4,shot.hitIds.length)):1;arena.damage(h,target,shot.damage*falloff,true,false,true);shot.hitIds.push(target.id);
    if(shot.kind==='draven-e'){
      target.slowUntil=Math.max(target.slowUntil,arena.time+2);target.stunUntil=Math.max(target.stunUntil||0,arena.time+.18);
      const lateral=(target.x-shot.x)*-shot.dir.z+(target.z-shot.z)*shot.dir.x,sign=lateral<0?-1:1;
      arena.displace(target,-shot.dir.z*sign*2.3+shot.dir.x*.35,shot.dir.x*sign*2.3+shot.dir.z*.35);
    }else if(shot.leg==='out'&&target.type==='hero'){
      end.x=shot.x+(end.x-shot.x)*hit.fraction;end.z=shot.z+(end.z-shot.z)*hit.fraction;reverse=true;break;
    }
  }
  if(shot.kind==='draven-r'&&shot.leg==='back'&&distance(shot,h)<=travel+h.radius){shot.life=0;if(h.draven.ultimateId===shot.id)h.draven.ultimateId=null;}
  shot.x=end.x;shot.z=end.z;
  if(shot.kind==='draven-r'&&shot.leg==='out'){
    shot.distance+=travel;
    if(reverse||shot.distance>=shot.range-.001){shot.leg='back';shot.hitIds=[];shot.dir=direction(shot,h);}
  }
  return true;
}
export function dravenKill(arena,credit,target){
  if(credit?.kind!=='draven')return;
  const d=setupDraven(credit);
  if(target.type==='minion')d.adoration++;
  if(target.type==='hero'){
    const stacks=d.adoration,gold=25+stacks*2;credit.gold+=gold;d.adoration=0;
    arena.event('draven-cashout',{id:credit.id,gold,stacks});
    if(credit.isPlayer)arena.event('toast',{text:`崇拜兑现 · 额外金币 +${gold}`});
  }
}
export function resetDraven(arena,h,death=false){
  if(h.kind!=='draven')return;
  const d=setupDraven(h);d.axes=0;d.bloodRushUntil=0;d.rushMoveUntil=0;d.axeExpiresAt=0;d.ultimateId=null;
  if(death)d.adoration=Math.floor(d.adoration*.5);
  for(const s of arena.shots)if(s.source===h.id&&s.kind.startsWith('draven-'))s.life=0;
  for(const e of arena.effects)if(e.source===h.id&&e.kind==='axe-catch')e.life=0;
}
