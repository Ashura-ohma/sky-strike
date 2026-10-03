// Match tactics stay independent of rendering and browser APIs.
export const BRUSHES = [
  {id:'west-river',x:-9,z:9,r:4.5},{id:'east-river',x:9,z:-9,r:4.5},
  {id:'blue-jungle',x:-39,z:9,r:5},{id:'red-jungle',x:39,z:-9,r:5},
  {id:'west-bank',x:-11,z:24,r:4.5},{id:'east-bank',x:11,z:-24,r:4.5},
  {id:'north-lane',x:-39,z:-39,r:5},{id:'south-lane',x:39,z:39,r:5},
  {id:'shrine-bank',x:-27,z:-10,r:4},{id:'dragon-bank',x:27,z:10,r:4}
];
export const SPELLS = {
  blink:{name:'闪现',desc:'向瞄准方向瞬移最多8米，避开地形',cooldown:35},
  barrier:{name:'屏障',desc:'获得220 + 每级20护盾，持续3.5秒',cooldown:40},
  smite:{name:'惩戒',desc:'对9米内最近野怪造成600 + 每级25真实伤害并回血',cooldown:25}
};
const d2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const inRange=(a,b,r)=>d2(a,b)<=r*r;
export function setupTactics(arena){
  arena.wards=[];arena.relic={x:-19,z:-19,radius:5,active:false,owner:-1,progress:[0,0],until:0,spawnAt:35};
  for(const h of arena.units.filter(u=>u.type==='hero')){h.relicCaptures=0;h.dragonKills=0;h.revealedUntil=0;}
  arena.player.spell=SPELLS[arena.options.spell]?arena.options.spell:'blink';arena.player.spellUntil=0;arena.player.wardUntil=0;
  arena.contracts=[
    {id:'farm',name:'兵线收割',desc:'完成12次小兵补刀',current:0,goal:12,reward:160,done:false},
    {id:'siege',name:'破阵先锋',desc:'参与最后一击摧毁1座防御塔',current:0,goal:1,reward:180,done:false},
    {id:'river',name:'河道争夺',desc:'夺取1次圣坛或参与猎龙1次',current:0,goal:1,reward:220,done:false}
  ];
}
export function updateContracts(arena){
  const h=arena.player,values={farm:h.lastHits||0,siege:h.towerKills||0,river:(h.relicCaptures||0)+(h.dragonKills||0)};
  for(const c of arena.contracts||[]){c.current=Math.min(c.goal,values[c.id]||0);if(!c.done&&c.current>=c.goal){c.done=true;h.gold+=c.reward;arena.event('contract',{id:c.id,text:`契约完成 · ${c.name} +${c.reward}金币`});}}
}
export function tickTactics(arena,dt){
  arena._visionCache=null;arena.wards=arena.wards.filter(w=>w.until>arena.time);
  const r=arena.relic;
  if(!r.active&&arena.time>=r.spawnAt){r.active=true;r.owner=-1;r.progress=[0,0];arena.event('objective',{text:'河道圣坛已出现 · 站入光圈5秒可占领'});}
  if(r.active&&r.owner>=0&&arena.time>=r.until){r.active=false;r.owner=-1;r.progress=[0,0];r.spawnAt=arena.time+20;arena.event('objective',{text:'河道圣坛祝福结束 · 20秒后重新出现'});}
  if(r.active&&r.owner===-1){
    const occupants=[0,1].map(team=>arena.units.filter(u=>u.alive&&u.type==='hero'&&u.team===team&&inRange(u,r,r.radius)));
    if(occupants[0].length&&occupants[1].length)return updateContracts(arena);
    const team=occupants[0].length?0:occupants[1].length?1:-1;
    if(team<0){r.progress=r.progress.map(n=>Math.max(0,n-dt*.75));}
    else {r.progress[1-team]=Math.max(0,r.progress[1-team]-dt);r.progress[team]=Math.min(5,r.progress[team]+dt);
      if(r.progress[team]>=5-1e-8){r.progress[team]=5;r.owner=team;r.until=arena.time+75;
        for(const h of arena.units)if(h.type==='hero'&&h.team===team)h.gold+=120;
        for(const h of occupants[team])h.relicCaptures++;
        arena.event('objective',{text:team===0?'我方占领圣坛 · 全队+120金币，恢复与河道视野75秒':'敌方占领圣坛 · 敌方获得金币、恢复与河道视野',team});
      }
    }
  }
  updateContracts(arena);
}
export const tacticalMethods={
  brushAt(unit){return BRUSHES.find(b=>inRange(unit,b,b.r))||null;},
  getVisionSources(team){
    if(!this._visionCache||this._visionCache.time!==this.time||this._visionCache.count!==this.units.length){
      const sources=[[],[]];
      for(const u of this.units)if(u.alive&&u.team<2){const r=u.type==='hero'?23:u.type==='tower'?18:u.type==='base'?21:u.type==='minion'?12:0;if(r)sources[u.team].push({unit:u,r});}
      for(const w of this.wards)if(w.until>this.time)sources[w.team].push({unit:w,r:18});
      if(this.relic.active&&this.relic.owner>=0&&this.relic.until>this.time)sources[this.relic.owner].push({unit:this.relic,r:25});
      this._visionCache={time:this.time,count:this.units.length,sources};
    }
    return (this._visionCache.sources[team]||[]).filter(s=>s.unit.alive!==false).map(s=>({x:s.unit.x,z:s.unit.z,r:s.r,unit:s.unit}));
  },
  isPointVisible(team,x,z){
    if(this.options.fog===false||team===2)return true;
    if(!this._visionCache||this._visionCache.time!==this.time||this._visionCache.count!==this.units.length)this.getVisionSources(team);
    return (this._visionCache.sources[team]||[]).some(s=>s.unit.alive!==false&&inRange(s.unit,{x,z},s.r));
  },
  canSee(team,u){
    if(!u)return false;if(u.team===team||u.type==='tower'||u.type==='base'||team===2)return true;
    const revealed=(u.revealedUntil||0)>this.time;
    const close=()=>this.units.some(h=>h.alive&&h.type==='hero'&&h.team===team&&inRange(h,u,3));
    if(u.stealthUntil>this.time&&!revealed&&!close())return false;
    if(this.options.fog===false)return true;
    if(!this.isPointVisible(team,u.x,u.z))return false;
    if(revealed)return true;
    const brush=this.brushAt(u);
    if(!brush)return true;
    return close()||this.units.some(h=>h.alive&&h.type==='hero'&&h.team===team&&this.brushAt(h)?.id===brush.id)||this.wards.some(w=>w.team===team&&w.until>this.time&&inRange(w,brush,brush.r));
  },
  placeWard(){
    const h=this.player;if(!h.alive||this.winner!==null||h.wardUntil>this.time||h.stunUntil>this.time)return false;
    const own=this.wards.filter(w=>w.team===h.team&&w.until>this.time);if(own.length>=2)this.wards=this.wards.filter(w=>w!==own[0]);
    this.wards.push({id:++this.nextId,team:h.team,x:h.x,z:h.z,until:this.time+45});h.wardUntil=this.time+35;this._visionCache=null;
    this.event('toast',{text:'侦察守卫已放置 · 提供45秒视野'});return true;
  },
  useSpell(aim){
    const h=this.player,s=SPELLS[h.spell];if(!s||!h.alive||this.winner!==null||h.spellUntil>this.time||h.stunUntil>this.time)return false;
    if(h.spell==='blink'){
      const dir=aim||h.face;if(!dir||!Number.isFinite(dir.x)||!Number.isFinite(dir.z)||Math.hypot(dir.x,dir.z)<.0001)return false;
      const n=Math.hypot(dir.x,dir.z),start={x:h.x,z:h.z},dx=dir.x/n,dz=dir.z/n;
      for(let step=.25;step<=8;step+=.25){const x=start.x+dx*step,z=start.z+dz*step;if(x< -58||x>58||z< -58||z>58||this.blockers.some(b=>(x-b.x)**2+(z-b.z)**2<(b.r+.8)**2))break;h.x=x;h.z=z;}
      if(inRange(h,start,.1))return false;h.face={x:dx,z:dz};this.effects.push({id:++this.nextId,kind:'ring',team:h.team,...start,radius:3,life:.45,maxLife:.45});
    }else if(h.spell==='barrier'){
      h.shield+=220+h.level*20;h.shieldUntil=Math.max(h.shieldUntil,this.time+3.5);this.effects.push({id:++this.nextId,kind:'shield',team:h.team,x:h.x,z:h.z,radius:3.4,life:.6,maxLife:.6});
    }else if(h.spell==='smite'){
      const target=this.units.filter(u=>u.alive&&u.type==='monster'&&u.team===2&&inRange(h,u,9)&&this.canSee(h.team,u)).sort((a,b)=>d2(h,a)-d2(h,b))[0];
      if(!target){this.event('toast',{text:'惩戒需要9米内可见的野怪'});return false;}
      this.damage(h,target,600+h.level*25,true,true);const heal=Math.min(h.maxHealth-h.health,100+h.level*8);h.health+=heal;h.healing+=heal;
      this.effects.push({id:++this.nextId,kind:'ring',team:h.team,x:target.x,z:target.z,radius:4,life:.55,maxLife:.55});
    }
    h.spellUntil=this.time+s.cooldown;h.recall=0;h.revealedUntil=this.time+2;this._visionCache=null;this.event('spell',{id:h.id,spell:h.spell,text:`${s.name}已释放`});return true;
  }
};
