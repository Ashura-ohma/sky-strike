import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
test('complete game runtime: start, movement, pause, touch, game over and restart',async()=>{
 const elements=new Map(),events={},raf=[],saved={};
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(t,k)=>t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,classList:{add(){},remove(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f},setAttribute(){},focus(){},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:480,height:720}),setPointerCapture(){}});return elements.get(id)};
 const sandbox={...engine,console,Math,document:{getElementById:el,addEventListener:(n,f)=>events[n]=f,hidden:false},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},requestAnimationFrame:f=>raf.push(f)};
 const code=(await readFile(new URL('../dist/game.js',import.meta.url),'utf8')).replace(/^import .*\n/,'');
 vm.createContext(sandbox);vm.runInContext('const W=WIDTH,H=HEIGHT;'+code+';globalThis.inspect=()=>({g,state});',sandbox);
 const step=t=>{const cb=raf.shift();assert.ok(cb);cb(t)};step(0);assert.equal(sandbox.inspect().state,'ready');el('start').listeners.click();assert.equal(sandbox.inspect().state,'playing');
 events.keydown({key:'ArrowLeft',preventDefault(){},target:{tagName:'CANVAS'}});for(let n=1;n<=20;n++)step(n*16.67);events.keyup({key:'ArrowLeft'});assert.ok(sandbox.inspect().g.player.x<240);assert.ok(sandbox.inspect().g.bullets.length>0);
 el('pause').listeners.click();const before=sandbox.inspect().g.time;step(500);assert.equal(sandbox.inspect().g.time,before);assert.equal(sandbox.inspect().state,'paused');el('start').listeners.click();assert.equal(sandbox.inspect().state,'playing');
 el('game').listeners.pointerdown({pointerId:1,clientX:100,clientY:100,preventDefault(){}});el('game').listeners.pointermove({pointerId:1,clientX:150,clientY:100});assert.ok(sandbox.inspect().g.player.x>150);el('game').listeners.pointerup({pointerId:1});
 events.blur();assert.equal(sandbox.inspect().state,'paused');el('start').listeners.click();
 const g=sandbox.inspect().g;g.player.invincible=0;g.player.lives=1;g.enemyBullets.push({x:g.player.x,y:g.player.y,r:10,vx:0,vy:0});step(517);assert.equal(sandbox.inspect().state,'over');assert.equal(g.player.lives,0);
 el('start').listeners.click();assert.equal(sandbox.inspect().state,'playing');assert.equal(sandbox.inspect().g.score,0);assert.equal(sandbox.inspect().g.player.lives,3);
 for(let n=32;n<2000;n++){if(sandbox.inspect().state==='over')el('start').listeners.click();step(n*16.67)}
});
