const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../android/app/src/main/assets/engine.mjs');
function isolate(a){const enemy=a.units.find(u=>u.type==='hero'&&u.team===1);a.units=[a.player,enemy];a.waveAt=Infinity;enemy.x=55;enemy.z=55;enemy.stunUntil=10000;return enemy;}
function run(a,seconds){for(let i=0;i<Math.round(seconds*10);i++)a.tick(.1);}
test('shared vision, brush concealment and damage reveal are enforced by target selection',async()=>{
  const {Arena,BRUSHES}=await load(),a=new Arena(),h=a.player,enemy=isolate(a),b=BRUSHES[0];h.x=0;h.z=0;enemy.x=30;enemy.z=0;
  assert.equal(a.canSee(0,enemy),false);assert.equal(a.nearestEnemy(h,40),undefined);enemy.x=12;assert.equal(a.canSee(0,enemy),true);
  enemy.x=b.x;enemy.z=b.z;h.x=b.x;h.z=b.z-10;assert.equal(a.canSee(0,enemy),false);assert.equal(a.attack(h,enemy),false);
  a.damage(h,enemy,10,true);assert.equal(a.canSee(0,enemy),true);a.time=2.1;assert.equal(a.canSee(0,enemy),false);
  const scout=a.spawn({type:'minion',team:0,x:35,z:35,health:100,radius:.7});assert.equal(a.isPointVisible(0,40,40),true);scout.alive=false;assert.equal(a.isPointVisible(0,40,40),false);
  h.x=b.x;h.z=b.z+4;assert.equal(a.canSee(0,enemy),true);assert.equal(a.brushAt(enemy).id,b.id);
});
test('wards expose their brush, expire, enforce cooldown and never defeat active skill stealth',async()=>{
  const {Arena,BRUSHES}=await load(),a=new Arena(),h=a.player,enemy=isolate(a),b=BRUSHES[0];h.x=b.x;h.z=b.z;assert.equal(a.placeWard(),true);const first=a.wards[0].id;assert.equal(a.placeWard(),false);assert.equal(h.wardUntil,35);
  enemy.x=b.x;enemy.z=b.z;h.x=b.x;h.z=b.z-20;assert.equal(a.canSee(0,enemy),true);enemy.stealthUntil=10;assert.equal(a.canSee(0,enemy),false);
  h.z=b.z-2;assert.equal(a.canSee(0,enemy),true);h.z=b.z-30;a.time=35;assert.equal(a.placeWard(),true);h.wardUntil=0;assert.equal(a.placeWard(),true);assert.equal(a.wards.length,2);assert.ok(a.wards.every(w=>w.id!==first));
  a.time=80; a.tick(.01);assert.equal(a.wards.length,0);h.alive=false;assert.equal(a.placeWard(),false);
});
test('fog option allows training visibility but preserves un-revealed skill stealth',async()=>{
  const {Arena}=await load(),a=new Arena('blade',1,{fog:false}),enemy=isolate(a);assert.equal(a.canSee(0,enemy),true);assert.equal(a.isPointVisible(0,58,-58),true);enemy.stealthUntil=3;assert.equal(a.canSee(0,enemy),false);
});
test('entering shade stealth clears cast reveal while incoming damage reveals within vision',async()=>{
  const {Arena}=await load(),a=new Arena('shade'),h=a.player,enemy=isolate(a);h.x=0;h.z=0;enemy.x=10;enemy.z=0;
  assert.equal(a.canSee(1,h),true);assert.equal(a.cast(h,2),true);assert.equal(h.revealedUntil,0);assert.equal(a.canSee(1,h),false);
  a.damage(enemy,h,10);assert.equal(a.canSee(1,h),true);h.x=-40;assert.equal(a.canSee(1,h),false);
});
test('blink validates aim, stops at terrain and bounds, barrier expires and invalid casts keep cooldown',async()=>{
  const {Arena}=await load(),a=new Arena(),h=a.player;isolate(a);h.x=-40;h.z=10;assert.equal(a.useSpell({x:NaN,z:0}),false);assert.equal(h.spellUntil,0);assert.equal(a.useSpell({x:0,z:0}),false);
  assert.equal(a.useSpell({x:1,z:0}),true);assert.ok(h.x<=-34.8&&h.x>-40);assert.equal(a.useSpell({x:1,z:0}),false);
  h.spellUntil=0;h.x=57;h.z=0;assert.equal(a.useSpell({x:1,z:0}),true);assert.equal(h.x,58);h.spellUntil=0;assert.equal(a.useSpell({x:1,z:0}),false);assert.equal(h.spellUntil,0);
  h.spell='barrier';assert.equal(a.useSpell(),true);assert.equal(h.shield,240);assert.ok(h.shieldUntil>a.time);run(a,4);assert.equal(h.shield,0);
});
test('smite requires a nearby neutral target and deals true damage independent of armour',async()=>{
  const {Arena}=await load(),a=new Arena('blade',1,{spell:'smite'}),h=a.player;isolate(a);h.x=0;h.z=0;h.health-=180;
  assert.equal(a.useSpell(),false);assert.equal(h.spellUntil,0);
  const m=a.spawn({type:'monster',camp:'red',team:2,x:10,z:0,home:{x:10,z:0},health:1200,armor:500,radius:2,speed:0,attack:0,range:2});assert.equal(a.useSpell(),false);assert.equal(h.spellUntil,0);
  m.x=8;const before=h.health;assert.equal(a.useSpell(),true);assert.equal(m.health,575);assert.equal(h.health,before+108);assert.equal(h.spellUntil,25);
});
test('river capture stops while contested, awards once and expires before recapture',async()=>{
  const {Arena}=await load(),a=new Arena(),h=a.player,enemy=isolate(a),r=a.relic;h.x=r.x;h.z=r.z;a.time=35;run(a,2);assert.equal(r.active,true);assert.ok(Math.abs(r.progress[0]-2)<1e-7);enemy.x=r.x+1;enemy.z=r.z;const progress=r.progress[0];run(a,2);assert.equal(r.progress[0],progress);assert.equal(r.owner,-1);
  enemy.x=55;enemy.z=55;const gold=h.gold;run(a,3);assert.equal(r.owner,0);assert.equal(h.relicCaptures,1);assert.ok(Math.abs(h.gold-gold-(120+220+9))<.0001);assert.equal(a.contracts.find(c=>c.id==='river').done,true);assert.equal(a.isPointVisible(0,r.x+24,r.z),true);
  const captured=h.gold;run(a,5);assert.ok(Math.abs(h.gold-captured-15)<.0001);assert.equal(h.relicCaptures,1);a.time=r.until+.01;a.tick(.01);assert.equal(r.active,false);assert.equal(r.owner,-1);assert.equal(h.relicCaptures,1);
});
test('minion and tower contracts reward once; dragon kills increment credited hero',async()=>{
  const {Arena}=await load(),a=new Arena(),h=a.player;isolate(a);h.x=0;h.z=0;
  for(let i=0;i<12;i++){const m=a.spawn({type:'minion',team:1,x:0,z:1,health:1,armor:0,radius:1});a.damage(h,m,100);}
  assert.equal(h.lastHits,12);assert.equal(a.contracts[0].done,true);assert.equal(h.gold,450+12*30+160);const gold=h.gold;a.damage(h,a.spawn({type:'minion',team:1,x:0,z:1,health:1,armor:0,radius:1}),100);assert.equal(h.gold,gold+30);
  const tower=a.spawn({type:'tower',team:1,x:0,z:1,health:1,armor:0,radius:2});a.damage(h,tower,100);assert.equal(a.contracts[1].done,true);
  const support=a.spawn({type:'hero',team:0,x:0,z:15,health:100,armor:0,radius:1,dragonKills:0,gold:0,level:15});
  const dragon=a.spawn({type:'monster',boss:true,camp:'dragon',team:2,x:0,z:2,health:1,armor:0,radius:3});a.damage(h,dragon,100);assert.equal(h.dragonKills,1);assert.equal(support.dragonKills,1);assert.equal(a.contracts[2].done,true);
});
test('neutral monsters leash home and heal instead of chasing across the map',async()=>{
  const {Arena}=await load(),a=new Arena(),h=a.player;isolate(a);h.x=14;h.z=0;const m=a.spawn({type:'monster',camp:'blue',team:2,x:12,z:0,home:{x:0,z:0},health:780,attack:48,armor:15,range:3.5,rate:1.2,radius:2.3,speed:4,stunUntil:0});m.health=100;
  a.tick(.1);assert.equal(m.leashing,true);assert.ok(m.x<12);assert.equal(a.shots.some(s=>s.source===m.id),false);run(a,2);assert.ok(m.x<1);assert.equal(m.leashing,false);assert.equal(m.health,m.maxHealth);
});
