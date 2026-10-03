const test=require('node:test'),assert=require('node:assert/strict');
const load=async()=>({...await import('../android/app/src/main/assets/engine.mjs'),...await import('../android/app/src/main/assets/campaign.mjs')});
const memory=()=>({value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}});
test('campaign requires victory plus chapter goal and unlocks in order without repeat rewards',async()=>{
 const {Arena,CAMPAIGN,applyCampaign,loadCampaign,campaignStatus,recordCampaign,evaluateCampaign}=await load();
 const p=loadCampaign(memory());
 for(const stage of CAMPAIGN){
  assert.equal(campaignStatus(p,stage.id).unlocked,true);
  const a=new Arena('blade',4,{difficulty:stage.difficulty});applyCampaign(a,stage.id);
  assert.equal(applyCampaign(a,stage.id),false);
  a.winner=0;assert.equal(evaluateCampaign(a).completed,false);
  a.player.lastHits=12;a.player.inventory=['boots','blade','armor'];a.player.relicCaptures=1;a.player.dragonKills=1;a.player.kills=4;
  const r=recordCampaign(p,a,stage.id);assert.equal(r.coins,stage.reward);assert.equal(r.stars,3);
  assert.equal(recordCampaign(p,a,stage.id+'-replay').coins,0);
  a.player.deaths=5;a.time=900;recordCampaign(p,a,'lower-score');assert.equal(campaignStatus(p,stage.id).stars,3);
 }
});
test('locked chapters, unfinished games, defeat and mismatched difficulty earn no chapter progress',async()=>{
 const {Arena,applyCampaign,loadCampaign,recordCampaign}=await load(),p=loadCampaign(memory());
 const a=new Arena('mage',123,{difficulty:'normal'});applyCampaign(a,'arsenal');a.player.inventory=['boots','blade','armor'];
 assert.equal(recordCampaign(p,a,'running').coins,0);a.winner=1;assert.equal(recordCampaign(p,a,'lost').completed,false);
 a.winner=0;assert.equal(recordCampaign(p,a,'locked').completed,false);
 const b=new Arena('blade',1,{difficulty:'training'});applyCampaign(b,'dawn');b.player.lastHits=99;b.winner=0;assert.equal(recordCampaign(p,b,'training').coins,0);
});
test('campaign save loads safely and modifiers affect the intended scenario',async()=>{
 const {Arena,applyCampaign,loadCampaign,saveCampaign}=await load(),mem=memory(),p=loadCampaign(mem);
 p.stages.dawn={stars:2,bestSeconds:210};assert.equal(saveCampaign(mem,p),true);assert.deepEqual(loadCampaign(mem),p);
 mem.value='broken';assert.deepEqual(loadCampaign(mem),{version:1,stages:{}});
 mem.value=JSON.stringify({version:1,stages:{hunter:{stars:3,bestSeconds:100}}});assert.deepEqual(loadCampaign(mem).stages,{});
 const a=new Arena();applyCampaign(a,'dawn');assert.equal(a.options.fog,false);assert.equal(a.player.level,2);assert.equal(a.player.gold,800);
 const b=new Arena();applyCampaign(b,'hunter');assert.equal(b.dragon.respawn,25);assert.equal(b.dragon.maxHealth,2500);assert.equal(b.player.level,4);
});
