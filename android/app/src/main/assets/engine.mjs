import {setupTactics,tickTactics,updateContracts,tacticalMethods} from './tactics.mjs';
export {BRUSHES,SPELLS} from './tactics.mjs';
import {EXTRA_HEROES,EXTRA_ITEMS,RUNES,DIFFICULTIES} from './content.mjs';
export const HEROES = {
  blade: { name: '苍岚', title: '逐风剑士', role: '近战 / 突进', color: 0x85e2ef, health: 860, mana: 280, attack: 57, power: 0, armor: 24, speed: 8.4, range: 3.5, rate: .72, skills: ['破风斩','回旋刃','风之护','天穹坠'] },
  mage: { name: '星璃', title: '星辉法师', role: '远程 / 法术', color: 0xc4a3ff, health: 650, mana: 420, attack: 42, power: 40, armor: 12, speed: 7.6, range: 8.8, rate: .9, skills: ['星辉弹','霜星阵','折光跃','陨星天降'] },
  ranger: { name: '翎羽', title: '月影游侠', role: '远程 / 射手', color: 0xa9ef92, health: 710, mana: 320, attack: 53, power: 0, armor: 15, speed: 8, range: 10, rate: .65, skills: ['穿云箭','散射箭','疾风步','万羽齐发'] }
};
Object.assign(HEROES,EXTRA_HEROES);
export const ITEMS = [
  { id:'boots',name:'风行之靴',price:250,icon:'boot',desc:'移动速度 +18%',speed:1.4 },
  { id:'blade',name:'破晓之刃',price:520,icon:'blade',desc:'攻击 +32',attack:32 },
  { id:'orb',name:'星辉法典',price:520,icon:'orb',desc:'法强 +65 · 技能增伤',power:65 },
  { id:'armor',name:'守望之甲',price:480,icon:'shield',desc:'生命 +260 · 护甲 +25',health:260,armor:25 },
  { id:'bow',name:'疾羽长弓',price:650,icon:'bow',desc:'攻击 +18 · 攻速 +25%',attack:18,haste:.25 },
  { id:'crown',name:'潮汐之冠',price:430,icon:'crown',desc:'法强 +25 · 回蓝 +6/秒',power:25,manaRegen:6 }
];
ITEMS.forEach(i=>i.category=i.id==='boots'?'move':['orb','crown'].includes(i.id)?'magic':i.id==='armor'?'defense':'attack');
ITEMS.push(...EXTRA_ITEMS);
export const LANES = [
  [{x:-50,z:50},{x:-50,z:-50},{x:50,z:-50}],
  [{x:-50,z:50},{x:50,z:-50}],
  [{x:-50,z:50},{x:50,z:50},{x:50,z:-50}]
];
export const BASES = [{x:-50,z:50},{x:50,z:-50}];
export const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function pointOnLane(lane,t) {
  const path=LANES[lane]; let total=0;
  for(let i=1;i<path.length;i++)total+=dist(path[i-1],path[i]);
  let remain=clamp(t,0,1)*total;
  for(let i=1;i<path.length;i++){const n=dist(path[i-1],path[i]);if(remain<=n)return {x:path[i-1].x+(path[i].x-path[i-1].x)*remain/n,z:path[i-1].z+(path[i].z-path[i-1].z)*remain/n};remain-=n;}
  return {...path.at(-1)};
}
export const BLOCKERS = [
  {x:-29,z:10,r:5},{x:-13,z:33,r:5},{x:29,z:-10,r:5},{x:13,z:-33,r:5},
  {x:-32,z:-29,r:5},{x:32,z:29,r:5},{x:-4,z:-30,r:4},{x:4,z:30,r:4}
];
function direction(a,b){const d=Math.max(.0001,dist(a,b));return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};}
export class Arena {
  constructor(hero='blade',seed=123,options={}) {
    this.options={difficulty:'normal',rune:null,fog:true,spell:'blink',...options};if(this.options.difficulty==='training'&&options.fog===undefined)this.options.fog=false;this.blockers=BLOCKERS;this.difficulty=DIFFICULTIES[this.options.difficulty]||DIFFICULTIES.normal;this.dragonBuff=[0,0];this.command=null;
    this.seed=seed;this.nextId=0;this.time=0;this.units=[];this.shots=[];this.effects=[];this.events=[];this.winner=null;this.teamKills=[0,0];this.waveAt=0;this.wave=0;this.player=null;
    for(let team=0;team<2;team++){
      this.spawn({type:'base',team,...BASES[team],health:2600,attack:0,armor:25,radius:4.8});
      for(let lane=0;lane<3;lane++)for(let tier=0;tier<2;tier++)this.spawn({type:'tower',team,lane,tier,...pointOnLane(lane,team===0?(.14+tier*.18):(.86-tier*.18)),health:1150,attack:110,armor:35,range:13,rate:1.15,radius:2.2});
      const kinds=team===0?[hero,'warden','ranger','tide','shade']:['blade','mage','ranger','warden','tide'];
      const names=team===0?['你','霁云','轻舟','青禾','辰风']:['赤霄','暮烬','夜羽','雷锋','影星'];
      kinds.forEach((kind,i)=>{
        const h=this.spawn({type:'hero',team,kind,name:names[i],lane:[1,0,2,0,2][i],...BASES[team],...HEROES[kind],health:HEROES[kind].health,radius:1.2});
        h.name=names[i];h.x+=(i-2)*2;h.z+=(i-2)*2;h.level=1;h.xp=0;h.gold=450;h.inventory=[];h.kills=0;h.deaths=0;h.assists=0;h.skillCd=[0,0,0,0];h.maxMana=h.mana;h.respawn=0;h.pathIndex=team===0?1:LANES[h.lane].length-2;h.isPlayer=team===0&&i===0;h.face={x:team===0?1:-1,z:team===0?-1:1};h.haste=0;h.manaRegen=0;h.skillLevels=[1,1,1,0];h.skillPoints=0;h.damageDealt=0;h.damageTaken=0;h.healing=0;h.lastHits=0;h.towerKills=0;h.streak=0;h.attackCount=0;h.stunUntil=0;h.crit=0;h.lifesteal=0;h.cdr=0;h.magicResist=0;h.penetration=0;h.regen=0;h.frost=0;h.thorns=0;
        if(h.isPlayer){this.player=h;const rune=RUNES[this.options.rune];if(rune)this.applyStats(h,rune,1);}if(team===1){h.attack*=this.difficulty.enemy;h.power*=this.difficulty.enemy;h.maxHealth*=this.difficulty.enemy;h.health=h.maxHealth;}
      });
    }
    for(const [x,z,camp] of [[-25,-22,'blue'],[25,22,'red'],[-33,24,'red'],[33,-24,'blue']])this.spawn({type:'monster',camp,team:2,x,z,home:{x,z},health:780,attack:48,armor:15,range:3.5,rate:1.2,radius:2.3,respawn:0,speed:4,stunUntil:0});
    this.dragon=this.spawn({type:'monster',camp:'dragon',boss:true,team:2,x:19,z:19,home:{x:19,z:19},health:3400,attack:100,armor:35,range:5,rate:1.4,radius:3.7,respawn:65,alive:false,deadAt:-100,speed:3,stunUntil:0});
    if(this.options.difficulty==='training'){this.addXp(this.player,20000);this.player.gold=12000;}
    setupTactics(this);
  }
  applyStats(h,item,sign=1){for(const stat of ['attack','power','armor','speed','haste','manaRegen','lifesteal','crit','cdr','penetration','regen','frost','thorns','magicResist'])h[stat]=(h[stat]||0)+sign*(item[stat]||0);h.maxHealth+=sign*(item.health||0);h.health=Math.max(0,Math.min(h.maxHealth,h.health+sign*(item.health||0)));}
  itemPrice(h,item){return item.price-(item.from&&h.inventory.includes(item.from)?ITEMS.find(i=>i.id===item.from).price:0);}
  upgradeSkill(index,h=this.player){if(!Number.isInteger(index)||index<0||index>3||h.skillPoints<1||(index===3&&h.level<4)||h.skillLevels[index]>=(index===3?3:5))return false;h.skillPoints--;h.skillLevels[index]++;return true;}
  sell(slot){const h=this.player;if(!Number.isInteger(slot)||slot<0||slot>=h.inventory.length)return false;const item=ITEMS.find(i=>i.id===h.inventory[slot]);this.applyStats(h,item,-1);h.inventory.splice(slot,1);h.gold+=Math.floor(item.price*.7);return true;}
  ping(kind){this.command={kind,until:this.time+12};this.event('toast',{text:kind==='attack'?'全队集结中路推进':kind==='defend'?'队友优先返回基地防守':kind==='relic'?'队友向河道圣坛集结':'队友向远古龙巢集结'});}

  rand(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  spawn(data){const u={id:++this.nextId,alive:true,cd:0,shield:0,shieldUntil:0,slowUntil:0,recall:0,hitAt:-99,deadAt:0,...data};u.maxHealth=u.health;this.units.push(u);return u;}
  event(type,data={}){this.events.push({type,time:this.time,...data});}
  byId(id){return this.units.find(u=>u.id===id);}
  nearestEnemy(u,range,includeBuildings=true){
    const targets=this.units.filter(v=>v.alive&&v.team!==u.team&&dist(u,v)<=range+v.radius&&(v.team!==2||dist(u,v)<8)&&(includeBuildings||!['tower','base'].includes(v.type))&&this.canSee(u.team,v));
    targets.sort((a,b)=>{
      const rank=v=>v.type==='hero'?0:v.type==='minion'?1:v.type==='monster'?2:3;
      return rank(a)-rank(b)||dist(u,a)-dist(u,b);
    });return targets[0];
  }
  walk(u,target,dt,speed=u.speed){
    if(this.time<(u.stunUntil||0))return;const d=dist(u,target);if(d<.12)return;const v=direction(u,target);u.face=v;u.moving=true;
    const step=Math.min(d,speed*(this.time<u.slowUntil?.45:1)*(this.time<(u.stealthUntil||0)?1.25:1)*dt);u.x+=v.x*step;u.z+=v.z*step;
    u.x=clamp(u.x,-59,59);u.z=clamp(u.z,-59,59);
    if(u.type==='hero')for(const b of BLOCKERS){const n=dist(u,b),min=b.r+.8;if(n<min){const a=direction(b,u);u.x=b.x+a.x*min;u.z=b.z+a.z*min;}}
  }
  vulnerable(base){return [0,1,2].some(l=>!this.units.some(v=>v.type==='tower'&&v.team===base.team&&v.lane===l&&v.alive));}
  damage(source,target,amount,spell=false,trueDamage=false){
    if(!target?.alive||!source||source.team===target.team||this.winner!==null)return 0;
    if(target.type==='base'&&!this.vulnerable(target)){if(source.isPlayer&&this.time-(this.lastProtected??-99)>2){this.lastProtected=this.time;this.event('toast',{text:'先摧毁一路的两座防御塔，才能攻击水晶'});}return 0;}
    if(target.type==='tower'&&!this.units.some(v=>v.alive&&v.team===source.team&&v.type==='minion'&&dist(v,target)<13))amount*=.42;
    if(!trueDamage&&source.kind==='shade'&&target.health<target.maxHealth*.35)amount*=1.25;if(!trueDamage&&target.kind==='warden'&&target.health<target.maxHealth*.35)amount*=.85;if(!trueDamage&&this.time<(target.guardUntil||0))amount*=.65;if(!trueDamage&&spell&&source.kind==='mage')amount+=source.power*.08;let value=trueDamage?amount:amount*100/(100+(spell?target.armor*.5*(1-Math.min(.65,source.penetration||0)):target.armor));if(!trueDamage&&spell)value*=1-Math.min(.6,target.magicResist||0);if(!trueDamage&&source.team<2&&this.dragonBuff[source.team]>this.time)value*=1.15;
    const absorbed=Math.min(value,target.shield);target.shield-=absorbed;value-=absorbed;
    target.health=Math.max(0,target.health-value);target.hitAt=this.time;target.recall=0;source.revealedUntil=this.time+2;target.revealedUntil=this.time+2;this.event('hit',{id:target.id,source:source.id,amount:Math.round(value),spell});
    if(source.type==='hero'){source.damageDealt+=value;if(!spell&&source.lifesteal>0){const heal=Math.min(source.maxHealth-source.health,value*source.lifesteal);source.health+=heal;source.healing+=heal;}if(spell&&source.frost)target.slowUntil=Math.max(target.slowUntil,this.time+1);}if(target.type==='hero'){target.damageTaken+=value;if(source.type==='hero'){target.lastAttacker=source.id;if(!spell&&target.thorns>0){const reflected=Math.min(Math.max(0,source.health-1),value*target.thorns);source.health-=reflected;}}}
    if(target.health<=0){
      target.alive=false;target.deadAt=this.time;this.event('death',{id:target.id,source:source.id});
      let credit=source.type==='hero'?source:this.units.filter(h=>h.type==='hero'&&h.alive&&h.team===source.team&&dist(h,target)<20).sort((a,b)=>dist(a,target)-dist(b,target))[0];
      if(target.type==='hero'){
        target.deaths++;target.streak=0;target.respawn=9+target.level*.8;if(source.team<2)this.teamKills[source.team]++;if(credit){credit.kills++;credit.streak++;credit.gold+=200;this.addXp(credit,130);}
        this.event('kill',{killer:credit?.name||'小兵 / 防御塔',victim:target.name,team:source.team});
        for(const h of this.units)if(h.type==='hero'&&h.alive&&h.team===source.team&&h!==credit&&dist(h,target)<18)h.assists++;
      } else if(target.type==='minion'){if(credit){credit.lastHits++;credit.gold+=target.siege?65:30;this.addXp(credit,target.siege?65:40);}}
      else if(target.type==='tower'){if(credit)credit.towerKills++;
        for(const h of this.units)if(h.type==='hero'&&h.team===source.team){h.gold+=140;this.addXp(h,60);}
        this.event('tower',{team:source.team,text:source.team===0?'敌方防御塔已摧毁':'我方防御塔被摧毁'});
      } else if(target.type==='base'){this.winner=source.team;this.event('finish',{team:source.team});}
      else if(target.type==='monster'){
        target.respawn=target.boss?100:55;if(target.boss){for(const h of this.units)if(h.type==='hero'&&h.team===source.team&&(h===credit||(h.alive&&dist(h,target)<20)))h.dragonKills=(h.dragonKills||0)+1;this.dragonBuff[source.team]=this.time+70;for(const h of this.units)if(h.type==='hero'&&h.team===source.team){h.gold+=220;this.addXp(h,160);}this.event('objective',{text:source.team===0?'我方击败远古龙王 · 全队强化 70 秒':'敌方击败远古龙王 · 小心强化兵线',team:source.team});}else if(credit){credit.gold+=95;this.addXp(credit,85);if(target.camp==='blue')credit.blueUntil=this.time+55;else credit.buffUntil=this.time+55;this.event('toast',{text:credit.isPlayer?(target.camp==='blue'?'获得星蓝祝福 · 回蓝加快':'获得赤焰祝福 · 普攻增伤'):'野区守卫被击败'});}
      }
    }updateContracts(this);return value;
  }
  addXp(h,xp){if(h.level>=15)return;h.xp+=xp;let need=80+h.level*40;
    while(h.xp>=need&&h.level<15){h.xp-=need;h.level++;h.skillPoints++;if(h.level===4)h.skillLevels[3]=1;h.maxHealth+=65;h.health=Math.min(h.maxHealth,h.health+100);h.attack+=4;h.power+=['mage','tide'].includes(h.kind)?8:2;h.maxMana+=15;h.mana=Math.min(h.maxMana,h.mana+45);need=80+h.level*40;if(h.isPlayer)this.event('level',{text:`升级至 ${h.level} 级${h.level===4?' · 终极技能已解锁':''}`});}if(h.level>=15)h.xp=0;
  }
  attack(u,target){
    if(!target||u.cd>0||!target.alive||this.time<(u.stunUntil||0)||!this.canSee(u.team,target))return false;u.stealthUntil=0;u.revealedUntil=this.time+2;u.attackCount=(u.attackCount||0)+1;
    u.face=direction(u,target);u.cd=(u.rate||.9)/(1+(u.haste||0));this.event('attack',{id:u.id,target:target.id});
    let damage=u.attack*(this.time<(u.buffUntil||0)?1.18:1);if(u.empowered){damage*=1.35;u.empowered=false;}if(u.kind==='ranger'&&u.attackCount%3===0)damage*=1.5;if(this.rand()<(u.crit||0))damage*=1.75;
    if(u.range>4)this.shots.push({id:++this.nextId,source:u.id,team:u.team,target:target.id,x:u.x,z:u.z,dir:direction(u,target),speed:u.type==='tower'?25:30,damage,life:2,spell:false,radius:.65,kind:u.type==='tower'?'tower':'attack'});
    else this.damage(u,target,damage);return true;
  }
  cast(h,index,aim={x:1,z:-1}){
    if(!h?.alive||this.winner!==null||!Number.isInteger(index)||index<0||index>3||h.skillCd[index]>0||this.time<(h.stunUntil||0))return false;
    if(index===3&&h.level<4){if(h.isPlayer)this.event('toast',{text:'终极技能在 4 级解锁'});return false;}
    const costs=[30,45,35,90],cooldowns=[5,8,11,26];if(h.mana<costs[index]){if(h.isPlayer)this.event('toast',{text:'法力不足，回城可恢复'});return false;}
    const mag=Math.hypot(aim.x,aim.z)||1,dir={x:aim.x/mag,z:aim.z/mag};h.face=dir;h.mana-=costs[index];const rank=Math.max(1,h.skillLevels[index]);const amp=1+(rank-1)*.16;h.skillCd[index]=cooldowns[index]*(1-Math.min(.4,h.cdr||0))*Math.pow(.96,rank-1);h.recall=0;h.stealthUntil=0;h.revealedUntil=this.time+2;if(h.kind==='blade')h.empowered=true;if(h.kind==='tide'){const heal=Math.min(h.maxHealth-h.health,25+h.power*.2);h.health+=heal;h.healing+=heal;}
    const at=range=>({x:clamp(h.x+dir.x*range,-58,58),z:clamp(h.z+dir.z*range,-58,58)});
    const aoe=(center,radius,damage,slow=0)=>{this.effects.push({id:++this.nextId,kind:'ring',team:h.team,x:center.x,z:center.z,radius,life:.6,maxLife:.6});for(const t of this.units)if(t.alive&&t.team!==h.team&&dist(center,t)<radius+t.radius){this.damage(h,t,damage*amp,true);if(slow)t.slowUntil=this.time+slow;}};
    const bolt=(d,damage,range,kind='skill')=>this.shots.push({id:++this.nextId,source:h.id,team:h.team,x:h.x,z:h.z,dir:d,speed:26,damage:damage*amp,life:range/26,spell:true,radius:1.1,kind,hitIds:[],pierce:2});
    const power=h.power||0;this.event('cast',{id:h.id,index});if(EXTRA_HEROES[h.kind]){this.specialCast(h,index,dir,power,aoe,bolt,at,amp);return true;}
    if(index===0){
      if(h.kind==='blade'){const end=at(7);this.walk(h,end,1,7);aoe(h,4.6,72+h.attack*.5);}
      else if(h.kind==='mage')bolt(dir,85+power,21,'star');
      else {for(const a of [-.13,0,.13]){const ca=Math.cos(a),sa=Math.sin(a);bolt({x:dir.x*ca-dir.z*sa,z:dir.x*sa+dir.z*ca},45+h.attack*.45,22,'arrow');}}
    }else if(index===1){
      if(h.kind==='blade'){aoe(h,5.7,70+h.attack*.4);h.health=Math.min(h.maxHealth,h.health+35);}
      else if(h.kind==='mage')aoe(at(9),6,60+power*.65,3);
      else {for(const t of this.units)if(t.alive&&t.team!==h.team&&dist(h,t)<12){const d=direction(h,t);if(d.x*dir.x+d.z*dir.z>.5)this.damage(h,t,58+h.attack*.6); }aoe(at(4),2,0);}
    }else if(index===2){
      if(h.kind==='blade'){h.shield+=150+power;h.shieldUntil=this.time+4;this.effects.push({id:++this.nextId,kind:'shield',team:h.team,x:h.x,z:h.z,radius:3,life:.8,maxLife:.8});}
      else {const end=at(h.kind==='mage'?8:6);this.walk(h,end,1,dist(h,end));this.effects.push({id:++this.nextId,kind:'ring',team:h.team,x:h.x,z:h.z,radius:3,life:.4,maxLife:.4});}
    }else {
      if(h.kind==='blade'){const end=at(10);this.walk(h,end,1,10);aoe(h,6,155+h.attack*.9,1.5);}
      else if(h.kind==='mage'){this.effects.push({id:++this.nextId,kind:'meteor',source:h.id,team:h.team,...at(12),radius:7,life:1.4,maxLife:1.4,delay:.65,damage:(180+power*1.2)*amp});}
      else for(let i=-3;i<=3;i++){const a=i*.1,ca=Math.cos(a),sa=Math.sin(a);bolt({x:dir.x*ca-dir.z*sa,z:dir.x*sa+dir.z*ca},65+h.attack*.65,26,'arrow');}
    }return true;
  }
  specialCast(h,index,dir,power,aoe,bolt,at,amp){
    const stun=(center,radius,seconds)=>{for(const t of this.units)if(t.alive&&t.team!==h.team&&!['base','tower'].includes(t.type)&&dist(t,center)<radius+t.radius)t.stunUntil=this.time+seconds;};
    const allies=()=>this.units.filter(u=>u.alive&&u.team===h.team&&u.type==='hero'&&dist(u,h)<11);
    const heal=(u,value)=>{const actual=Math.min(u.maxHealth-u.health,value);u.health+=actual;h.healing+=actual;};
    if(h.kind==='warden'){
      if(index===0){const center=at(3);aoe(center,4.5,70+h.attack*.6,2);stun(center,4,.55);}
      if(index===1){h.shield+=230+h.maxHealth*.12;h.shieldUntil=this.time+4;h.guardUntil=this.time+4;aoe(h,3,0);}
      if(index===2){this.walk(h,at(8),1,8);aoe(h,3.8,60+h.attack*.5);stun(h,3.8,.8);}
      if(index===3){aoe(h,9,100+h.maxHealth*.16,3);stun(h,8,1.4);}
    }else if(h.kind==='shade'){
      if(index===0){this.walk(h,at(8),1,8);aoe(h,4,55+h.attack*.8);}
      if(index===1)for(const angle of [-.16,0,.16])bolt({x:dir.x*Math.cos(angle)-dir.z*Math.sin(angle),z:dir.x*Math.sin(angle)+dir.z*Math.cos(angle)},55+h.attack*.55,18,'arrow');
      if(index===2){h.stealthUntil=this.time+3;h.revealedUntil=0;this.effects.push({id:++this.nextId,kind:'ring',team:h.team,x:h.x,z:h.z,radius:3,life:.5,maxLife:.5});}
      if(index===3){const t=this.units.filter(u=>u.alive&&u.type==='hero'&&u.team!==h.team&&this.canSee(h.team,u)&&dist(h,u)<15).sort((a,b)=>dist(a,at(10))-dist(b,at(10)))[0];const end=t?{x:t.x-dir.x*2,z:t.z-dir.z*2}:at(10);this.walk(h,end,1,15);aoe(h,4.5,170+h.attack*1.3);}
    }else if(h.kind==='tide'){
      if(index===0)aoe(at(7),5,75+power*.7,2);
      if(index===1){for(const u of allies())heal(u,(110+power*.7)*amp);this.effects.push({id:++this.nextId,kind:'heal',team:h.team,x:h.x,z:h.z,radius:9,life:.8,maxLife:.8});}
      if(index===2){for(const u of allies()){u.shield+=120+power*.65;u.shieldUntil=this.time+5;}aoe(h,8,0);}
      if(index===3){for(const u of allies())heal(u,(230+power)*amp);aoe(h,11,100+power*.9,2);stun(h,9,.85);}
    }
  }
  buy(id,h=this.player){const item=ITEMS.find(i=>i.id===id);if(!item)return {ok:false,reason:'装备不存在'};const slot=item.from?h.inventory.indexOf(item.from):-1;const cost=this.itemPrice(h,item);if(h.inventory.length>=6&&slot<0)return {ok:false,reason:'装备栏已满'};if(h.gold<cost)return {ok:false,reason:'金币不足'};
    h.gold-=cost;if(slot>=0){this.applyStats(h,ITEMS.find(i=>i.id===item.from),-1);h.inventory.splice(slot,1,id);}else h.inventory.push(id);this.applyStats(h,item);if(h.isPlayer)this.event('purchase',{text:`购买 ${item.name}`});return {ok:true};
  }
  heal(){const h=this.player;if(!h.alive||(h.healUntil||0)>this.time)return false;h.health=Math.min(h.maxHealth,h.health+210);h.mana=Math.min(h.maxMana,h.mana+80);h.healUntil=this.time+40;this.effects.push({id:++this.nextId,kind:'heal',team:0,x:h.x,z:h.z,radius:4,life:.8,maxLife:.8});return true;}
  recall(){const h=this.player;if(!h.alive)return;h.recall=3.2;this.event('toast',{text:'回城吟唱中 · 移动或受伤会取消'});}
  spawnWave(){this.wave++;for(let team=0;team<2;team++)for(let lane=0;lane<3;lane++)for(let i=0;i<(this.wave%3===0?4:3);i++){
    const siege=i===3,empowered=this.dragonBuff[team]>this.time;const n=this.spawn({type:'minion',team,lane,...pointOnLane(lane,team===0?.025:.975),health:(siege?420:140)+this.wave*7+(empowered?100:0),attack:(siege?36:18)+this.wave+(empowered?12:0),armor:5,speed:5.2,range:i>=2?7:2.3,rate:1.1,radius:.7,siege,empowered,ranged:i>=2,pathIndex:team===0?1:LANES[lane].length-2});n.x+=(i-1)*1.3;n.z+=(i-1)*1.3;
  }}
  laneAdvance(u,dt){const path=LANES[u.lane],goal=path[u.pathIndex];if(!goal)return;this.walk(u,goal,dt,u.speed);if(dist(u,goal)<2.5)u.pathIndex+=u.team===0?1:-1;}
  tick(dt,input={x:0,z:0,attack:false}){
    if(this.winner!==null)return;dt=clamp(dt,0,.1);this.time+=dt;tickTactics(this,dt);
    if(this.command&&this.command.until<this.time)this.command=null;if(this.time>=this.waveAt){this.waveAt=this.time+18;this.spawnWave();if(this.wave===1)this.event('toast',{text:'兵线出发 · 跟随小兵推进，避免独自越塔'});}
    for(const u of this.units){
      u.cd=Math.max(0,u.cd-dt);u.moving=false;if(u.shieldUntil<this.time)u.shield=0;
      if(!u.alive){
        if(u.type==='hero'||u.type==='monster'){u.respawn-=dt;if(u.respawn<=0){u.alive=true;u.health=u.maxHealth;u.mana=u.maxMana||0;const home=u.type==='hero'?BASES[u.team]:u.home;u.x=home.x;u.z=home.z;u.pathIndex=u.team===0?1:LANES[u.lane||0].length-2;u.skillCd?.fill(0);u.stunUntil=0;u.stealthUntil=0;u.revealedUntil=0;u.leashing=false;u.retreat=false;if(u.boss)this.event('objective',{text:'远古龙王已苏醒 · 击败可强化全队与兵线'});if(u.isPlayer)this.event('toast',{text:'英雄复活，重新加入战场'});}}
        continue;
      }
      if(u.type==='hero'){
        u.gold+=3*dt;this.addXp(u,4*dt);u.mana=Math.min(u.maxMana,u.mana+(2+(u.manaRegen||0)+(u.blueUntil>this.time?10:0))*dt);u.health=Math.min(u.maxHealth,u.health+(1.2+(u.regen||0)+(this.relic.active&&this.relic.owner===u.team?3:0))*dt);u.skillCd=u.skillCd.map(cd=>Math.max(0,cd-dt));
        if(dist(u,BASES[u.team])<9){u.health=Math.min(u.maxHealth,u.health+85*dt);u.mana=Math.min(u.maxMana,u.mana+65*dt);}
        if(this.time<u.stunUntil)continue;if(u.isPlayer){
          const moving=Math.hypot(input.x||0,input.z||0)>.05;
          if(moving){u.recall=0;this.walk(u,{x:u.x+input.x*10,z:u.z+input.z*10},dt);u.moveGoal=null;}
          else if(u.recall>0){u.recall-=dt;if(u.recall<=0){u.x=BASES[0].x;u.z=BASES[0].z;this.event('recall');}}
          else if(u.moveGoal){this.walk(u,u.moveGoal,dt);if(dist(u,u.moveGoal)<.5)u.moveGoal=null;}
          if(input.attack&&u.recall<=0){const target=this.nearestEnemy(u,17);if(target){if(dist(u,target)>u.range+target.radius){if(!moving)this.walk(u,target,dt);}else this.attack(u,target);}}
        }else{
          const magical=['mage','tide'].includes(u.kind),build=['boots',magical?'orb':'blade','armor',magical?'void':'infinity','heart',magical?'mercy':'vampire'];u.buildStep||=0;const item=ITEMS.find(i=>i.id===build[u.buildStep]);if(item&&this.buy(item.id,u).ok)u.buildStep++;if(u.skillPoints>0)this.upgradeSkill(u.level>=4&&u.skillLevels[3]<3?3:u.skillLevels.indexOf(Math.min(...u.skillLevels.slice(0,3))),u);const enemy=this.nearestEnemy(u,13),home=BASES[u.team];
          if(u.health<u.maxHealth*.23||u.retreat){u.retreat=u.health<u.maxHealth*.8;this.walk(u,home,dt);}
          else if(enemy){if(dist(u,enemy)>u.range+enemy.radius)this.walk(u,enemy,dt);else this.attack(u,enemy);if(enemy.type!=='tower'&&enemy.type!=='base'&&dist(u,enemy)<12){const aim=direction(u,enemy);if(u.skillCd[0]<=0)this.cast(u,0,aim);else if(u.skillCd[1]<=0&&dist(u,enemy)<8)this.cast(u,1,aim);else if(u.skillCd[3]<=0&&u.level>=4&&enemy.type==='hero')this.cast(u,3,aim);else if(u.health<u.maxHealth*.55&&u.skillCd[2]<=0)this.cast(u,2,aim);}}
          else if(u.team===0&&this.command){const target=this.command.kind==='defend'?BASES[0]:this.command.kind==='dragon'?this.dragon:this.command.kind==='relic'?this.relic:{x:0,z:0};if(dist(u,target)>4)this.walk(u,target,dt);else if(target.boss&&target.alive)this.attack(u,target);}
          else if(this.relic.active&&this.relic.owner===-1&&u.kind==='warden'){if(dist(u,this.relic)>2)this.walk(u,this.relic,dt);}
          else this.laneAdvance(u,dt);
        }
      }else if(u.type==='minion'){
        const candidates=this.units.filter(t=>t.alive&&t.team!==u.team&&t.team!==2&&dist(u,t)<u.range+3+t.radius&&this.canSee(u.team,t)).sort((a,b)=>(a.type==='minion'?0:a.type==='hero'?1:2)-(b.type==='minion'?0:b.type==='hero'?1:2)||dist(u,a)-dist(u,b));
        const target=candidates[0];if(target){if(dist(u,target)<=u.range+target.radius)this.attack(u,target);else this.walk(u,target,dt);}else this.laneAdvance(u,dt);
      }else if(u.type==='tower'){
        const targets=this.units.filter(t=>t.alive&&t.team!==u.team&&t.team!==2&&!['tower','base'].includes(t.type)&&dist(u,t)<u.range+t.radius&&this.canSee(u.team,t)).sort((a,b)=>(a.type==='minion'?0:1)-(b.type==='minion'?0:1)||dist(u,a)-dist(u,b));this.attack(u,targets[0]);
      }else if(u.type==='monster'){
        const leash=u.boss?14:11;if(dist(u,u.home)>leash)u.leashing=true;
        if(u.leashing){this.walk(u,u.home,dt,u.speed*1.8);u.health=Math.min(u.maxHealth,u.health+u.maxHealth*.35*dt);if(dist(u,u.home)<1){u.leashing=false;u.health=u.maxHealth;}continue;}
        const target=this.units.filter(h=>h.alive&&h.type==='hero'&&this.canSee(2,h)&&dist(h,u.home)<leash&&dist(h,u)<(u.boss?13:8)).sort((a,b)=>dist(a,u)-dist(b,u))[0];if(target){if(dist(u,target)>u.range+target.radius)this.walk(u,target,dt);else this.attack(u,target);if(u.boss&&this.time>(u.slamAt||0)){u.slamAt=this.time+6;this.effects.push({id:++this.nextId,kind:'meteor',source:u.id,team:2,x:target.x,z:target.z,radius:6,life:1.6,maxLife:1.6,delay:1,damage:170});}}else if(dist(u,u.home)>1){this.walk(u,u.home,dt);u.health=Math.min(u.maxHealth,u.health+60*dt);}
      }
    }
    const mobiles=this.units.filter(u=>u.alive&&(u.type==='hero'||u.type==='minion'));
    for(let i=0;i<mobiles.length;i++)for(let j=i+1;j<mobiles.length;j++){const u=mobiles[i],v=mobiles[j];if(u.type!==v.type)continue;const n=dist(u,v),min=u.type==='hero'?2:1;if(n<min&&n>.001){const push=Math.min((min-n)*.5,.12),dx=(v.x-u.x)/n*push,dz=(v.z-u.z)/n*push;u.x-=dx;u.z-=dz;v.x+=dx;v.z+=dz;}}
    for(const s of this.shots){
      s.life-=dt;if(s.life<=0)continue;const source=this.byId(s.source);if(!source){s.life=0;continue;}
      if(s.target){const target=this.byId(s.target);if(!target?.alive){s.life=0;continue;}s.dir=direction(s,target);const delta=s.speed*dt;if(dist(s,target)<delta+target.radius){this.damage(source,target,s.damage,s.spell);s.life=0;continue;}}
      s.x+=s.dir.x*s.speed*dt;s.z+=s.dir.z*s.speed*dt;
      if(!s.target){for(const t of this.units)if(t.alive&&t.team!==s.team&&!s.hitIds.includes(t.id)&&dist(s,t)<s.radius+t.radius){this.damage(source,t,s.damage,s.spell);s.hitIds.push(t.id);if(s.hitIds.length>=s.pierce){s.life=0;break;}}}
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const e of this.effects){e.life-=dt;if(e.kind==='meteor'&&!e.fired&&e.maxLife-e.life>e.delay){e.fired=true;const source=this.byId(e.source);for(const u of this.units)if(u.alive&&u.team!==e.team&&dist(u,e)<e.radius+u.radius)this.damage(source,u,e.damage,true);this.event('meteor',{x:e.x,z:e.z});}}
    this.effects=this.effects.filter(e=>e.life>0);this.units=this.units.filter(u=>u.type!=='minion'||u.alive||this.time-u.deadAt<.8);
  }
}

Object.assign(Arena.prototype,tacticalMethods);
