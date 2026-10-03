// Six self-contained offline scenarios. Progress is independent of classic matches.
export const CAMPAIGN = [
  {id:'dawn',name:'初临峡谷',subtitle:'第一章 · 兵线基础',description:'无迷雾的休闲战场。开局 2 级、800 金币，跟随兵线熟悉推进节奏。',goalText:'补兵 12 个，并摧毁敌方水晶',reward:150,difficulty:'easy',gold:800,xp:120,goal:'minions',target:12,limit:360},
  {id:'arsenal',name:'整装出征',subtitle:'第二章 · 装备搭配',description:'开局 1800 金币。组合三件装备，利用合成和出售调整阵容。',goalText:'持有至少 3 件装备，并摧毁敌方水晶',reward:180,difficulty:'normal',gold:1800,xp:280,goal:'items',target:3,limit:360},
  {id:'river',name:'河道争夺',subtitle:'第三章 · 控图与视野',description:'河道圣坛提前在 10 秒开放。插眼侦察草丛，站入据点完成占领。',goalText:'亲自占领圣坛 1 次，并摧毁敌方水晶',reward:220,difficulty:'normal',gold:1200,xp:280,goal:'relics',target:1,limit:420},
  {id:'hunter',name:'猎龙行动',subtitle:'第四章 · 野区决策',description:'龙王在 25 秒苏醒，生命降至 2500。开局 4 级、2000 金币，可带惩击争夺目标。',goalText:'参与击败龙王 1 次，并摧毁敌方水晶',reward:260,difficulty:'normal',gold:2000,xp:600,goal:'dragons',target:1,limit:420},
  {id:'shadow',name:'破晓突围',subtitle:'第五章 · 团战考验',description:'挑战难度。用草丛和召唤技能创造机会；先击败敌方英雄，再推进水晶。',goalText:'亲自击败英雄 4 次，并摧毁敌方水晶',reward:300,difficulty:'hard',gold:1800,xp:600,goal:'kills',target:4,limit:480},
  {id:'crown',name:'峡谷之冠',subtitle:'终章 · 双线决胜',description:'挑战难度，开局 4 级、2400 金币。占据圣坛并参与猎龙，以地图资源取得胜利。',goalText:'占领圣坛、参与猎龙各 1 次，并摧毁敌方水晶',reward:400,difficulty:'hard',gold:2400,xp:600,goal:'both',target:1,limit:480}
];
const KEY='zhufeng.campaign.v1';
const fresh=()=>({version:1,stages:{}});
export function loadCampaign(storage){
  try {
    const raw=JSON.parse(storage.getItem(KEY));
    if(raw?.version!==1)return fresh();
    const p=fresh();
    for(const stage of CAMPAIGN){
      const entry=raw.stages?.[stage.id];
      if(entry&&Number.isInteger(entry.stars)&&entry.stars>=1&&entry.stars<=3)
        p.stages[stage.id]={stars:entry.stars,bestSeconds:Number.isFinite(entry.bestSeconds)&&entry.bestSeconds>=0?entry.bestSeconds:0};
    }
    // A corrupt save must not unlock a later chapter without its prerequisites.
    let missing=false;
    for(const stage of CAMPAIGN){if(missing)delete p.stages[stage.id];if(!p.stages[stage.id])missing=true;}
    return p;
  }catch{return fresh();}
}
export function saveCampaign(storage,p){try{storage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function campaignStatus(p,id){
  const i=CAMPAIGN.findIndex(s=>s.id===id),entry=p.stages?.[id];
  return {unlocked:i===0||(i>0&&!!p.stages?.[CAMPAIGN[i-1].id]),stars:entry?.stars||0,completed:!!entry};
}
export function applyCampaign(arena,id){
  const stage=CAMPAIGN.find(s=>s.id===id);
  if(!stage||arena.time!==0||arena.campaignId)return false;
  arena.campaignId=id;arena.campaignStage=stage;
  if(id==='dawn')arena.options.fog=false;
  arena.player.gold=stage.gold;
  arena.addXp(arena.player,stage.xp);
  arena.player.health=arena.player.maxHealth;arena.player.mana=arena.player.maxMana;
  if(id==='river'&&arena.relic)arena.relic.spawnAt=10;
  if(id==='hunter'){arena.dragon.respawn=25;arena.dragon.health=arena.dragon.maxHealth=2500;}
  return true;
}
export function evaluateCampaign(arena){
  const stage=CAMPAIGN.find(s=>s.id===arena?.campaignId);
  if(!stage)return {objectives:[],completed:false,stars:0,reason:''};
  const h=arena.player,objectives=[];
  const add=(label,current,goal)=>objectives.push({label,current,goal,done:current>=goal});
  if(stage.goal==='minions')add('补兵',h.lastHits,stage.target);
  if(stage.goal==='items')add('持有装备',h.inventory.length,stage.target);
  if(['relics','both'].includes(stage.goal))add('占领圣坛',h.relicCaptures||0,1);
  if(['dragons','both'].includes(stage.goal))add('参与猎龙',h.dragonKills||0,1);
  if(stage.goal==='kills')add('击败英雄',h.kills,stage.target);
  add('摧毁敌方水晶',arena.winner===0?1:0,1);
  const completed=objectives.every(o=>o.done)&&arena.options.difficulty===stage.difficulty;
  const stars=completed?1+Number(h.deaths<=2)+Number(arena.time<=stage.limit):0;
  return {objectives,completed,stars,reason:completed?'章节完成':arena.winner===1?'水晶失守，重整旗鼓':arena.winner===0?'胜利，但章节目标尚未完成':'完成章节目标，再摧毁水晶'};
}
export function recordCampaign(p,arena,matchId){
  const no={coins:0,stars:0,firstClear:false,completed:false,reason:''};
  const stage=CAMPAIGN.find(s=>s.id===arena?.campaignId);
  if(!stage||!matchId||arena.winner===null)return no;
  const result=evaluateCampaign(arena);
  if(!result.completed)return {...no,reason:result.reason};
  if(!campaignStatus(p,stage.id).unlocked)return {...no,reason:'请先完成前一章节'};
  const old=p.stages[stage.id],firstClear=!old;
  p.stages[stage.id]={stars:Math.max(old?.stars||0,result.stars),bestSeconds:old?Math.min(old.bestSeconds,Math.round(arena.time)):Math.round(arena.time)};
  return {coins:firstClear?stage.reward:0,stars:result.stars,firstClear,completed:true,reason:firstClear?'首次通关奖励已获得':'章节完成，最佳星级已保留'};
}
