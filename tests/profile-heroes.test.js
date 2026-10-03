const test=require('node:test'),assert=require('node:assert/strict');

test('Draven mastery and match history survive reload alongside existing V5 data',async()=>{
  const {freshProfile,saveProfile,loadProfile}=await import('../android/app/src/main/assets/profile.mjs');
  const profile=freshProfile();profile.coins=460;profile.matches=2;profile.mastery={blade:42,draven:68,unknown:100};
  const match=hero=>({id:hero,hero,win:true,kills:3,deaths:1,assists:2,seconds:420,date:1,mode:'normal'});
  profile.history=[match('draven'),match('blade'),match('unknown')];
  const storage={value:null,setItem(key,value){this.value=value;},getItem(){return this.value;}};
  assert.equal(saveProfile(storage,profile),true);
  const restored=loadProfile(storage);
  assert.equal(restored.coins,460);assert.equal(restored.matches,2);
  assert.deepEqual(restored.mastery,{blade:42,draven:68});
  assert.deepEqual(restored.history.map(m=>m.hero),['draven','blade']);
});
