/** Pure deterministic gameplay helpers, independent from rendering. */
export const WIDTH = 480, HEIGHT = 720;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const collides = (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2 < (a.r+b.r)**2;
export const waveAt = seconds => Math.floor(seconds / 22) + 1;
export function shotPattern(level) {
  return level === 1 ? [{x:0,vx:0}] : level === 2 ? [{x:-9,vx:-12},{x:9,vx:12}] : [{x:-13,vx:-70},{x:0,vx:0},{x:13,vx:70}];
}
export function createGame() {
  return {time:0, score:0, wave:1, kills:0, fire:0, spawn:.6, player:{x:240,y:615,r:12,lives:3,level:1,invincible:2}, bullets:[], enemies:[], enemyBullets:[], pickups:[], particles:[], shake:0};
}
export function applyPickup(player, type) {
  if(type === 'power') player.level = Math.min(3,player.level+1);
  else player.lives = Math.min(3,player.lives+1);
}
