const test=require('node:test'),assert=require('node:assert/strict');
async function fixture(){
  const {Arena}=await import('../android/app/src/main/assets/engine.mjs');
  const arena=new Arena('draven',123,{difficulty:'training',fog:false}),h=arena.player;
  const enemy=arena.units.find(u=>u.type==='hero'&&u.team===1);
  arena.units=[h,enemy];arena.waveAt=Infinity;arena.contracts=[];
  h.x=0;h.z=0;h.level=4;h.skillLevels=[1,1,1,1];h.attack=61;
  Object.assign(enemy,{x:7,z:0,health:5000,maxHealth:5000,armor:0,stunUntil:Infinity});
  return {arena,h,enemy};
}
function advance(arena,seconds,input){for(let i=0;i<Math.ceil(seconds*60);i++)arena.tick(1/60,input);}

test('spinning axes empower attacks and limit held, flying and catchable axes to two',async()=>{
  const {arena,h,enemy}=await fixture(),{activeDravenAxes}=await import('../android/app/src/main/assets/draven.mjs');
  assert.equal(arena.cast(h,0),true);h.skillCd[0]=0;arena.cast(h,0);assert.equal(h.draven.axes,2);
  assert.equal(arena.attack(h,enemy),true);const shot=arena.shots[0];assert.equal(shot.kind,'draven-axe');assert.ok(shot.damage>h.attack*1.8);
  assert.equal(h.draven.axes,1);assert.equal(activeDravenAxes(arena,h),2);
  h.skillCd[0]=0;arena.cast(h,0);assert.equal(h.draven.axes,1);
  advance(arena,.3);assert.equal(arena.shots.length,0);assert.equal(arena.effects.filter(e=>e.kind==='axe-catch').length,1);assert.equal(activeDravenAxes(arena,h),2);
});
test('axe landing follows movement, catch restores the axe and refreshes Blood Rush',async()=>{
  const {arena,h,enemy}=await fixture();arena.cast(h,0);arena.cast(h,1);arena.attack(h,enemy);
  advance(arena,.25,{x:0,z:1});const marker=arena.effects.find(e=>e.kind==='axe-catch');
  assert.ok(marker);assert.ok(marker.z>h.z+2.5);assert.ok(Math.abs(marker.x-h.x)<.01);
  assert.equal(h.draven.axes,0);assert.ok(h.skillCd[1]>0);
  h.x=marker.x;h.z=marker.z;advance(arena,.8);
  assert.equal(h.draven.axes,1);assert.equal(h.draven.adoration,1);assert.equal(h.draven.catchCount,1);assert.equal(h.skillCd[1],0);
  assert.equal(arena.effects.some(e=>e.kind==='axe-catch'),false);
});
test('moving toward a rock keeps the axe catch point outside blocking terrain',async()=>{
  const {arena,h}=await fixture(),{landDravenAxe}=await import('../android/app/src/main/assets/draven.mjs');
  const rock=arena.blockers[0];h.x=rock.x-rock.r-2;h.z=rock.z;h.velocityX=8;h.velocityZ=0;
  landDravenAxe(arena,{kind:'draven-axe',source:h.id});const marker=arena.effects.find(e=>e.kind==='axe-catch');
  assert.ok(marker);assert.ok(marker.x>h.x);assert.ok(Math.hypot(marker.x-rock.x,marker.z-rock.z)>=rock.r+.8);
});
test('missed axes and inactive held axes expire without granting passive stacks',async()=>{
  const {arena,h,enemy}=await fixture();arena.cast(h,0);arena.attack(h,enemy);advance(arena,.3);
  h.x=-12;advance(arena,2.5);assert.equal(h.draven.axes,0);assert.equal(h.draven.adoration,0);
  h.skillCd[0]=0;arena.cast(h,0);assert.equal(h.draven.axes,1);advance(arena,8.1);assert.equal(h.draven.axes,0);
});
test('Blood Rush boosts movement and attack speed only for its buff window',async()=>{
  const {arena,h,enemy}=await fixture();arena.attack(h,enemy);const normalCd=h.cd;h.cd=0;
  arena.cast(h,1);assert.ok(arena.moveSpeed(h)>h.speed*1.3);arena.attack(h,enemy);assert.ok(h.cd<normalCd*.8);
  advance(arena,3.6);assert.equal(arena.moveSpeed(h),h.speed);h.cd=0;arena.attack(h,enemy);assert.equal(h.cd,normalCd);
});
test('Stand Aside uses physical mitigation, does not lifesteal, and pushes plus slows once',async()=>{
  const {arena,h,enemy}=await fixture();enemy.armor=100;enemy.magicResist=.6;h.lifesteal=1;h.health=100;
  arena.cast(h,2);const raw=arena.shots[0].damage;
  advance(arena,.4);assert.equal(arena.events.find(e=>e.type==='hit'&&e.id===enemy.id).amount,Math.round(raw/2));assert.ok(enemy.health<5000-raw/2+.5);assert.ok(h.health<102);assert.equal(h.healing,0);
  assert.ok(Math.abs(enemy.z)>2);assert.ok(enemy.slowUntil>arena.time);assert.equal(arena.events.filter(e=>e.type==='hit'&&e.id===enemy.id).length,1);
});
test('Whirling Death automatically returns at the first champion and hits once per leg',async()=>{
  const {arena,h,enemy}=await fixture();enemy.x=10;arena.cast(h,3);const shot=arena.shots.find(s=>s.kind==='draven-r');
  advance(arena,.5);assert.equal(shot.leg,'back');advance(arena,1);
  assert.equal(arena.events.filter(e=>e.type==='hit'&&e.id===enemy.id).length,2);assert.equal(h.draven.ultimateId,null);assert.equal(arena.shots.some(s=>s.kind==='draven-r'),false);
});
test('Whirling Death second press reverses without mana or cooldown reset and cannot recast twice',async()=>{
  const {arena,h,enemy}=await fixture();enemy.z=30;arena.cast(h,3,{x:1,z:0});advance(arena,.4);
  const mana=h.mana,cooldown=h.skillCd[3],id=h.draven.ultimateId;h.mana=0;
  assert.equal(arena.cast(h,3),true);assert.equal(arena.shots.find(s=>s.id===id).leg,'back');assert.equal(h.mana,0);assert.equal(h.skillCd[3],cooldown);
  assert.equal(arena.cast(h,3),false);h.mana=mana;advance(arena,1);assert.equal(h.draven.ultimateId,null);
});
test('returning ultimate ends at the caster without overshooting into enemies behind him',async()=>{
  const {arena,h,enemy}=await fixture(),{tickDravenShot}=await import('../android/app/src/main/assets/draven.mjs');
  enemy.x=-4;arena.cast(h,3,{x:1,z:0});const shot=arena.shots.find(s=>s.kind==='draven-r');
  shot.x=1;shot.z=0;shot.leg='back';const health=enemy.health;
  tickDravenShot(arena,shot,.1);assert.equal(enemy.health,health);assert.equal(shot.x,h.x);assert.equal(shot.z,h.z);assert.equal(shot.life,0);
});
test('Whirling Death damages multiple minions, falls off per leg and resets on return',async()=>{
  const {arena,h,enemy}=await fixture();enemy.z=30;
  const minions=[6,12].map(x=>arena.spawn({type:'minion',team:1,x,z:0,radius:.7,health:5000,armor:0,speed:0,range:0,attack:0,lane:1,pathIndex:0,rate:1}));
  arena.cast(h,3,{x:1,z:0});advance(arena,.7);const shot=arena.shots.find(s=>s.kind==='draven-r');
  assert.equal(shot.leg,'out');arena.cast(h,3);advance(arena,1);
  const hits=arena.events.filter(e=>e.type==='hit'&&minions.some(t=>t.id===e.id));assert.equal(hits.length,4);
  assert.equal(hits[0].amount,hits[2].amount);assert.equal(hits[1].amount,hits[3].amount);assert.ok(hits[0].amount>hits[1].amount);
});
test('Adoration stacks on last hits, cashes out on champion kill, and halves on death',async()=>{
  const {arena,h,enemy}=await fixture();h.draven.adoration=5;
  const minion=arena.spawn({type:'minion',team:1,x:1,z:1,radius:.7,health:1,armor:0});arena.damage(h,minion,100);assert.equal(h.draven.adoration,6);
  const gold=h.gold;arena.damage(h,enemy,10000);assert.equal(h.draven.adoration,0);assert.equal(h.gold-gold,237);
  h.draven.adoration=9;enemy.alive=true;arena.damage(enemy,h,100000);assert.equal(h.draven.adoration,4);
});
test('death and respawn clear active axes, catch markers, buffs and ultimate recast state',async()=>{
  const {arena,h,enemy}=await fixture();arena.cast(h,0);arena.attack(h,enemy);advance(arena,.3);arena.cast(h,1);arena.cast(h,3,{x:0,z:1});
  assert.ok(arena.effects.some(e=>e.kind==='axe-catch'));assert.ok(h.draven.ultimateId);
  arena.damage(enemy,h,100000);assert.equal(h.draven.axes,0);assert.equal(h.draven.ultimateId,null);assert.equal(h.draven.bloodRushUntil,0);
  assert.ok(arena.effects.filter(e=>e.kind==='axe-catch').every(e=>e.life<=0));assert.ok(arena.shots.filter(s=>s.kind.startsWith('draven-')).every(s=>s.life<=0));
  h.respawn=.01;arena.tick(.02);assert.equal(h.alive,true);assert.equal(h.draven.axes,0);assert.deepEqual(h.skillCd,[0,0,0,0]);
});
