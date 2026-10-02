import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp,collides,waveAt,shotPattern,createGame,applyPickup} from '../dist/engine.js';
test('movement remains in bounds',()=>{assert.equal(clamp(-3,0,480),0);assert.equal(clamp(999,0,480),480);assert.equal(clamp(90,0,480),90)});
test('collision respects circular hitboxes',()=>{assert.ok(collides({x:0,y:0,r:5},{x:6,y:0,r:3}));assert.equal(collides({x:0,y:0,r:5},{x:9,y:0,r:3}),false)});
test('waves increase every 22 seconds',()=>{assert.equal(waveAt(0),1);assert.equal(waveAt(21.9),1);assert.equal(waveAt(22),2);assert.equal(waveAt(66),4)});
test('upgrades increase firing patterns',()=>{assert.equal(shotPattern(1).length,1);assert.equal(shotPattern(2).length,2);assert.equal(shotPattern(3).length,3);assert.equal(shotPattern(3)[1].vx,0)});
test('new game resets all transient state',()=>{const a=createGame();a.bullets.push({});a.player.lives=0;const b=createGame();assert.equal(b.player.lives,3);assert.equal(b.score,0);assert.equal(b.bullets.length,0)});
test('power and repair are capped',()=>{const p=createGame().player;for(let i=0;i<5;i++)applyPickup(p,'power');assert.equal(p.level,3);p.lives=1;applyPickup(p,'health');assert.equal(p.lives,2);applyPickup(p,'health');applyPickup(p,'health');assert.equal(p.lives,3)});
