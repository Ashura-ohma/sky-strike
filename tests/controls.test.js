const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../android/app/src/main/assets/controls.mjs');
test('floating stick rejects center noise and retains analog speed up to its rim',async()=>{
 const {analogStick}=await load();
 assert.equal(analogStick(2,2,40).magnitude,0);
 const gentle=analogStick(13,0,40),full=analogStick(100,0,40);
 assert.ok(Math.abs(gentle.magnitude-.25)<1e-12);assert.equal(full.magnitude,1);assert.equal(full.knobX,40);
 const diagonal=analogStick(40,40,40);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-12);
});
test('screen to world direction preserves thumb magnitude and rejects invalid projection',async()=>{
 const {worldInput}=await load();
 const out=worldInput(.3,.4,()=>({x:2,z:2}));assert.ok(Math.abs(Math.hypot(out.x,out.z)-.5)<1e-12);
 assert.deepEqual(worldInput(0,0,()=>{throw Error('must not project zero input');}),{x:0,z:0});
 assert.deepEqual(worldInput(1,0,()=>({x:NaN,z:0})),{x:0,z:0});
});
test('fixed step simulation agrees across refresh rates and never catches up through pause',async()=>{
 const {FixedStepClock}=await load();
 for(const hz of [30,60,120]){const clock=new FixedStepClock();let ticks=0;for(let i=0;i<hz*2;i++)clock.advance(1/hz,()=>{ticks++;});assert.equal(ticks,120);}
 const clock=new FixedStepClock();let ticks=0;clock.advance(.01,()=>ticks++);clock.reset();clock.advance(.01,()=>ticks++);assert.equal(ticks,0);
 clock.advance(5,()=>ticks++);assert.equal(ticks,0);clock.advance(.2,()=>ticks++);assert.equal(ticks,5);
 clock.reset();clock.advance(.1,()=>{ticks++;return false;});assert.equal(ticks,6);assert.equal(clock.accumulator,0);
});
