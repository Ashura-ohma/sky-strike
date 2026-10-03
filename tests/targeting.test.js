const test=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../android/app/src/main/assets/targeting.mjs');
function fixture(kind='mage'){
  const h={id:1,type:'hero',alive:true,kind,team:0,x:0,z:0,face:{x:0,z:1}};
  const arena={units:[h],canSee:(_team,u)=>!u.hidden};
  const enemy=(id,x,z,extra={})=>{const u={id,type:'hero',alive:true,team:1,x,z,radius:1,health:100,...extra};arena.units.push(u);return u;};
  return {h,arena,enemy};
}
test('tap selects a visible reachable hero over closer minions and rejects hidden/dead/allied targets',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();
  enemy(2,1,0,{hidden:true});enemy(3,2,0,{alive:false});enemy(4,3,0,{team:0});enemy(5,4,0,{type:'minion'});enemy(6,10,0);enemy(7,50,0);
  const result=resolveSkillAim(arena,h,0);assert.equal(result.targetId,6);assert.equal(result.mode,'auto');assert.deepEqual(result.aim,{x:1,z:0});
});
test('explicit lock wins only while valid, then attack-locked hero precedes nearer heroes',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();
  const explicit=enemy(2,12,0),held=enemy(3,10,0);enemy(4,4,0);
  h.lockedTargetId=explicit.id;h.attackTargetId=held.id;
  assert.equal(resolveSkillAim(arena,h,0).targetId,2);
  explicit.hidden=true;assert.equal(resolveSkillAim(arena,h,0).targetId,3);
  held.x=50;assert.equal(resolveSkillAim(arena,h,0).targetId,4);
  assert.equal(h.lockedTargetId,2,'preview must not mutate player state');
});
test('manual drag ignores lock and preserves direction; manual point clamps to cast distance',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();enemy(2,5,0);h.lockedTargetId=2;
  const line=resolveSkillAim(arena,h,0,{manual:true,aim:{x:-4,z:0}});
  assert.equal(line.mode,'manual');assert.equal(line.targetId,null);assert.equal(line.aim.x,-1);assert.equal(line.point.x,-21);
  const circle=resolveSkillAim(arena,h,1,{manual:true,point:{x:0,z:80}});assert.equal(circle.point.z,9);
});
test('ground circles land at a nearby target, and clamp farther reachable targets without overshooting',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();const e=enemy(2,3,4);
  let result=resolveSkillAim(arena,h,1);assert.deepEqual(result.point,{x:3,z:4});assert.equal(result.distance,5);
  e.x=0;e.z=14;result=resolveSkillAim(arena,h,1);assert.equal(result.targetId,2);assert.equal(result.point.z,9);
  e.z=17;assert.equal(resolveSkillAim(arena,h,1).targetId,null);
});
test('self utilities do not choose enemies; movement skills follow joystick direction then facing',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();enemy(2,5,0);h.lockedTargetId=2;
  const moving=resolveSkillAim(arena,h,2,{movement:{x:0,z:-.25}});
  assert.equal(moving.mode,'movement');assert.equal(moving.targetId,null);assert.equal(moving.point.z,-8);
  assert.equal(resolveSkillAim(arena,h,2).point.z,8);
  h.kind='draven';const buff=resolveSkillAim(arena,h,0,{manual:true,aim:{x:1,z:0}});
  assert.equal(buff.mode,'self');assert.deepEqual(buff.aim,h.face);assert.deepEqual(buff.point,{x:0,z:0});assert.equal(buff.targetId,null);
});
test('projectiles get capped motion lead while ground circles use actual target position',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();enemy(2,10,0,{velocityX:0,velocityZ:8});
  const line=resolveSkillAim(arena,h,0);assert.ok(line.point.z>1&&line.point.z<=1.8);assert.ok(line.aim.z>0);
  const circle=resolveSkillAim(arena,h,1);assert.equal(circle.point.z,0);
  arena.units[1].velocityZ=1e6;assert.ok(resolveSkillAim(arena,h,0).point.z<=1.8);
});
test('fallback prefers minions over nearby neutrals, never distant camps or structures',async()=>{
  const {resolveSkillAim}=await load(),{h,arena,enemy}=fixture();
  enemy(2,1,0,{type:'tower'});const neutral=enemy(3,5,0,{type:'monster',team:2});const minion=enemy(4,8,0,{type:'minion'});
  assert.equal(resolveSkillAim(arena,h,0).targetId,4);minion.alive=false;assert.equal(resolveSkillAim(arena,h,0).targetId,3);
  neutral.x=15;assert.equal(resolveSkillAim(arena,h,0).targetId,null);
});
test('skill reach is independent of attack acquisition, including long Draven ultimate and hero-only execution',async()=>{
  const {resolveSkillAim,getSkillTargeting}=await load(),{h,arena,enemy}=fixture('draven');const far=enemy(2,40,0);
  assert.equal(resolveSkillAim(arena,h,2).targetId,null);assert.equal(resolveSkillAim(arena,h,3).targetId,2);
  far.x=60;assert.equal(resolveSkillAim(arena,h,3).targetId,null);assert.equal(getSkillTargeting('draven',3).range,52);
  h.kind='shade';far.x=16;enemy(3,4,0,{type:'minion'});assert.equal(resolveSkillAim(arena,h,3).targetId,null);
  far.x=14;assert.equal(resolveSkillAim(arena,h,3).targetId,2);
});
