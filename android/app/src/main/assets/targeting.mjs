// Skill intent is separate from rendering and casting. A tap chooses a visible
// enemy; a deliberate drag keeps exactly the player's aim. All ranges are world
// units, matching engine.mjs rather than the basic-attack acquisition radius.
const definition=(targeting,range,options={})=>Object.freeze({targeting,range,radius:0,...options});
export const SKILL_TARGETING=Object.freeze({
  blade:Object.freeze([
    definition('dash',7,{radius:4.6}),definition('self',0,{radius:5.7}),
    definition('self',0),definition('dash',10,{radius:6})
  ]),
  mage:Object.freeze([
    definition('line',21,{radius:1.1,projectileSpeed:26}),definition('point',9,{radius:6}),
    definition('movement',8),definition('point',12,{radius:7,delay:.65})
  ]),
  ranger:Object.freeze([
    definition('line',22,{radius:1.1,projectileSpeed:26}),definition('cone',12,{halfAngle:Math.PI/3}),
    definition('movement',6),definition('line',26,{radius:1.1,projectileSpeed:26})
  ]),
  warden:Object.freeze([
    definition('point',3,{radius:4.5}),definition('self',0),
    definition('dash',8,{radius:3.8}),definition('self',0,{radius:9})
  ]),
  shade:Object.freeze([
    definition('dash',8,{radius:4}),definition('line',18,{radius:1.1,projectileSpeed:26}),
    definition('self',0),definition('target',15,{radius:4.5,heroesOnly:true})
  ]),
  tide:Object.freeze([
    definition('point',7,{radius:5}),definition('self',0,{radius:11}),
    definition('self',0,{radius:11}),definition('self',0,{radius:11})
  ]),
  draven:Object.freeze([
    definition('self',0),definition('self',0),
    definition('line',19,{radius:1.1,projectileSpeed:26}),definition('line',52,{radius:1.6,projectileSpeed:25})
  ])
});
const EMPTY=definition('self',0);
const finiteVector=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.z);
const length=v=>Math.hypot(v.x,v.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function unit(v,fallback={x:1,z:0}){
  if(!finiteVector(v)||length(v)<1e-6)return {...fallback};
  const n=length(v);return {x:v.x/n,z:v.z/n};
}
function toward(origin,point,fallback){return unit({x:point.x-origin.x,z:point.z-origin.z},fallback);}
function boundedPoint(origin,point,range){
  const dx=point.x-origin.x,dz=point.z-origin.z,d=Math.hypot(dx,dz),scale=d>range&&d>0?range/d:1;
  return {x:clamp(origin.x+dx*scale,-58,58),z:clamp(origin.z+dz*scale,-58,58)};
}

export function getSkillTargeting(kind,index){
  return SKILL_TARGETING[typeof kind==='string'?kind:kind?.kind]?.[index]||EMPTY;
}

function targetIsValid(arena,h,target,metadata){
  if(!target?.alive||target.id===h.id||target.team===h.team||!finiteVector(target))return false;
  if(!['hero','minion','monster'].includes(target.type)||(metadata.heroesOnly&&target.type!=='hero'))return false;
  if(typeof arena.canSee==='function'&&!arena.canSee(h.team,target))return false;
  if(target.visible===false)return false;
  const d=distance(h,target),body=Math.max(0,Number(target.radius)||0);
  // Neutral camps are a nearby fallback, never an invitation to fire across the
  // jungle. Unit-targeted and cone abilities use the engine's center distance.
  if(target.team===2&&d>8+body)return false;
  const hitMargin=['target','cone'].includes(metadata.targeting)?0:metadata.radius+body;
  return d<=metadata.range+hitMargin+1e-6;
}

function projectilePoint(h,target,metadata){
  const point={x:target.x,z:target.z};
  if(!metadata.projectileSpeed)return point;
  let vx=Number.isFinite(target.velocityX)?target.velocityX:0;
  let vz=Number.isFinite(target.velocityZ)?target.velocityZ:0;
  if(Math.hypot(vx,vz)<.001&&target.moving&&finiteVector(target.face)){
    const face=unit(target.face),speed=Number(target.speed)||0;
    vx=face.x*speed;vz=face.z*speed;
  }
  // A short, capped lead helps moving targets without wildly steering at stale
  // velocity after a dash, or guessing the future position of an invisible unit.
  const time=Math.min(.22,distance(h,target)/metadata.projectileSpeed);
  const dx=vx*time,dz=vz*time,n=Math.hypot(dx,dz),scale=n>1.8?1.8/n:1;
  point.x+=dx*scale;point.z+=dz*scale;
  return point;
}

/**
 * options.manual: true only after a deliberate skill drag (or explicit AI aim).
 * options.aim: normalized or unnormalized world direction, never screen pixels.
 * options.point: optional world-space manual landing point, clamped to cast range.
 * options.movement: current world-space joystick direction, for mobility spells.
 * options.lockedTargetId: explicit enemy lock; defaults to h.lockedTargetId.
 * No state is mutated, so the same result can drive a preview and the final cast.
 */
export function resolveSkillAim(arena,h,index,options={}){
  const metadata=getSkillTargeting(h,index),range=metadata.range;
  const face=unit(h?.face),movement=finiteVector(options.movement)&&length(options.movement)>.0001?unit(options.movement):face;
  const fallback=options.manual?unit(options.aim,face):movement;
  const result=(aim,point,targetId,mode)=>({aim,point,targetId,mode,range,distance:distance(h,point),metadata});
  if(metadata.targeting==='self')return result(face,{x:h.x,z:h.z},null,'self');
  if(options.manual){
    const point=finiteVector(options.point)?boundedPoint(h,options.point,range):boundedPoint(h,{x:h.x+fallback.x*range,z:h.z+fallback.z*range},range);
    return result(toward(h,point,fallback),point,null,'manual');
  }
  if(metadata.targeting==='movement'){
    const point=boundedPoint(h,{x:h.x+movement.x*range,z:h.z+movement.z*range},range);
    return result(movement,point,null,'movement');
  }
  const candidates=(arena.units||[]).filter(target=>targetIsValid(arena,h,target,metadata));
  const explicitId=Object.prototype.hasOwnProperty.call(options,'lockedTargetId')?options.lockedTargetId:h.lockedTargetId;
  let target=candidates.find(t=>t.id===explicitId);
  // A held attack lock only outranks other heroes when it is itself a hero.
  // A nearby minion must not steal an offensive skill from an enemy champion.
  target||=candidates.find(t=>t.id===h.attackTargetId&&t.type==='hero');
  if(!target){
    const priority=t=>t.type==='hero'?0:t.type==='minion'?1:2;
    candidates.sort((a,b)=>priority(a)-priority(b)||distance(h,a)-distance(h,b)||(a.id||0)-(b.id||0));
    target=candidates[0];
  }
  if(target){
    const predicted=projectilePoint(h,target,metadata),point=boundedPoint(h,predicted,range);
    return result(toward(h,predicted,fallback),point,target.id,'auto');
  }
  const aim=finiteVector(options.aim)?unit(options.aim,movement):movement;
  return result(aim,boundedPoint(h,{x:h.x+aim.x*range,z:h.z+aim.z*range},range),null,'forward');
}
