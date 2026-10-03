const test=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../android/app/src/main/assets/engine.mjs');
async function fixture(hero='blade'){
  const {Arena}=await load(),arena=new Arena(hero,123,{fog:false}),h=arena.player;
  arena.units=[h];arena.waveAt=Infinity;h.x=0;h.z=0;
  return {arena,h};
}
function simulate(arena,hz,seconds,input){for(let i=0;i<Math.round(hz*seconds);i++)arena.tick(1/hz,input);}

test('analog travel and acceleration agree at 30, 60 and 120 Hz',async()=>{
  const positions=[];
  for(const hz of [30,60,120]){const {arena,h}=await fixture();simulate(arena,hz,2,{x:1,z:0});positions.push(h.x);assert.ok(h.moving);}
  assert.ok(Math.max(...positions)-Math.min(...positions)<1e-8);
  assert.ok(positions[0]>16.4&&positions[0]<16.8);
});
test('gentle tilt remains proportional and diagonal input cannot exceed maximum speed',async()=>{
  const quarter=await fixture(),full=await fixture(),diagonal=await fixture();
  simulate(quarter.arena,60,1,{x:.25,z:0});simulate(full.arena,60,1,{x:1,z:0});simulate(diagonal.arena,60,1,{x:1,z:1});
  assert.ok(Math.abs(quarter.h.x/full.h.x-.25)<1e-8);
  assert.ok(Math.abs(Math.hypot(diagonal.h.x,diagonal.h.z)-full.h.x)<1e-8);
});
test('release stops immediately, and a stationary player is not pushed by overlapping bots',async()=>{
  const {arena,h}=await fixture();simulate(arena,60,.5,{x:1,z:0});const x=h.x;
  arena.tick(1/60,{x:0,z:0});assert.equal(h.x,x);assert.equal(h.moving,false);assert.equal(h.velocityX,0);
  const bot=arena.spawn({...h,id:100,isPlayer:false,x:x+.5,stunUntil:Infinity});
  for(let i=0;i<60;i++)arena.tick(1/60);
  assert.equal(h.x,x);assert.equal(h.moving,false);assert.ok(bot.x>x+1.99);
});
test('swept collision prevents dash tunnelling and preserves tangential movement',async()=>{
  const {arena,h}=await fixture();const rock=arena.blockers[0];h.x=-40;h.z=10;
  arena.walk(h,{x:-15,z:10},1,25);assert.ok(h.x<-34.8);assert.ok(Math.hypot(h.x-rock.x,h.z-rock.z)>=rock.r+.8);
  h.x=-35;h.z=10;arena.walk(h,{x:-30,z:13},1,6);
  assert.ok(h.z>12);assert.ok(Math.hypot(h.x-rock.x,h.z-rock.z)>=rock.r+.8);
});
test('point movement routes around a blocking rock and reaches the destination',async()=>{
  const {arena,h}=await fixture();h.x=-40;h.z=10;h.moveGoal={x:-18,z:10};let peakDetour=0,cache=null,reused=false;
  for(let i=0;i<360;i++){
    arena.tick(1/60);peakDetour=Math.max(peakDetour,Math.abs(h.z-10));
    if(cache&&h._navigation===cache)reused=true;cache=h._navigation;
    for(const b of arena.blockers)assert.ok(Math.hypot(h.x-b.x,h.z-b.z)>=b.r+.8-1e-7);
  }
  assert.ok(peakDetour>5.5);assert.ok(reused);assert.ok(Math.hypot(h.x+18,h.z-10)<.15);assert.equal(h.moveGoal,null);
});
test('holding attack alongside a point destination cannot move the player twice in a tick',async()=>{
  const {arena,h}=await fixture();h.moveGoal={x:0,z:20};
  arena.spawn({type:'tower',team:1,x:10,z:0,radius:1,health:10000,armor:0,range:0,attack:0});
  arena.tick(1/60,{attack:true});assert.ok(Math.abs(h.x)<1e-8);assert.ok(Math.abs(h.z-h.speed/60)<1e-8);
});
test('walking attacks keep movement facing, retain a visible lock and reject hidden/out-of-range targets',async()=>{
  const {Arena}=await load(),arena=new Arena('ranger',123,{fog:false}),h=arena.player;
  const enemies=arena.units.filter(u=>u.type==='hero'&&u.team===1).slice(0,2);
  arena.units=[h,...enemies];arena.waveAt=Infinity;h.x=0;h.z=0;
  enemies.forEach((u,i)=>{u.x=0;u.z=5+i;u.stunUntil=Infinity;});
  arena.tick(1/60,{x:1,z:0,attack:true});const locked=h.attackTargetId;
  assert.ok(h.face.x>.99);assert.ok(Math.abs(h.face.z)<.001);assert.ok(arena.events.some(e=>e.type==='attack'&&e.id===h.id));
  enemies[1].z=4;arena.tick(1/60,{x:1,z:0,attack:true});assert.equal(h.attackTargetId,locked);
  enemies[0].stealthUntil=100;enemies[0].revealedUntil=0;arena.tick(1/60,{attack:true});assert.equal(h.attackTargetId,enemies[1].id);
  h.cd=0;enemies[1].z=30;assert.equal(arena.attack(h,enemies[1]),false);assert.equal(arena.attack(h,enemies[0]),false);
});
