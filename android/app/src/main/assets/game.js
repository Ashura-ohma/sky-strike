(() => {
  "use strict";
  const { clamp, distance, inRange, applyDamage } = MobaCore;
  const canvas = document.querySelector("#arena");
  const ctx = canvas.getContext("2d");
  const W = 480, H = 820;
  const $ = (s) => document.querySelector(s);
  const ui = {
    start: $("#start-screen"), end: $("#end-screen"), startButton: $("#start-button"), restart: $("#restart-button"),
    playerHealth: $("#player-health"), objectiveHealth: $("#objective-health"), objectiveLabel: $("#objective-label"),
    clock: $("#clock"), kills: $("#kills"), result: $("#result-title"), detail: $("#result-detail"),
    toast: $("#toast"), joystick: $("#joystick"), stick: $("#stick"), attack: $("#attack"), q: $("#skill"), r: $("#ult")
  };
  let dpr = 1, scale = 1, offsetX = 0, offsetY = 0, last = 0, toastTimer = 0;
  let state;
  let paused = false;
  const input = { x: 0, y: 0, attack: false };
  const colors = { blue: "#54d7df", red: "#fb7185", gold: "#ffd282", text: "#f3fff5" };

  function resize() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    scale = Math.min(canvas.width / W, canvas.height / H);
    offsetX = (canvas.width - W * scale) / 2; offsetY = (canvas.height - H * scale) / 2;
  }
  window.addEventListener("resize", resize); resize();

  function makeMinion(team, x, y) { return { team, x, y, hp: 30, maxHp: 30, atk: 4, cooldown: Math.random() * .6, radius: 12 }; }
  function newGame() {
    state = {
      mode: "playing", time: 0, kills: 0, player: { x: W/2, y: 605, hp: 120, maxHp: 120, cooldown: 0, q: 0, r: 0, radius: 19 },
      tower: { x: W/2, y: 210, hp: 170, maxHp: 170 }, base: { x: W/2, y: 72, hp: 220, maxHp: 220 },
      foe: { x: W/2, y: 330, hp: 92, maxHp: 92, cooldown: 0, respawn: 0, radius: 21 },
      minions: [], spawn: 0, allySpawn: 0, towerFire: 0, flash: 0, hitText: 0
    };
    for (let i=0;i<3;i++) { state.minions.push(makeMinion("red", W/2+(i-1)*28, 380+i*20)); state.minions.push(makeMinion("blue", W/2+(i-1)*28, 650+i*18)); }
    paused = false;
    input.x = input.y = 0; input.attack = false;
    ui.start.classList.add("hidden"); ui.end.classList.add("hidden");
    showToast("击破防御塔，摧毁敌方水晶！");
  }
  function showToast(message) {
    ui.toast.textContent = message; ui.toast.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1650);
  }
  function finish(win) {
    if (state.mode !== "playing") return;
    state.mode = win ? "won" : "lost"; ui.result.textContent = win ? "胜利" : "战败";
    ui.detail.textContent = win ? `用时 ${formatTime(state.time)} · 击败 ${state.kills} 个敌人` : "英雄倒下了，再调整走位试试。";
    ui.end.classList.remove("hidden"); input.attack = false;
  }
  function formatTime(t) { const n=Math.floor(t); return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`; }
  function currentObjective() { return state.tower.hp > 0 ? state.tower : state.base; }
  function enemies() { return [...state.minions.filter(m => m.team === "red"), ...(state.foe.hp > 0 ? [state.foe] : []), currentObjective()]; }
  function targetForPlayer() {
    const p=state.player;
    const priority = [...state.minions.filter(m=>m.team==="red"), ...(state.foe.hp>0?[state.foe]:[]), currentObjective()];
    return priority.find(e => e.hp > 0 && inRange(p,e, e === currentObjective() ? 150 : 135));
  }
  function hit(target, amount) {
    if (!target || target.hp <= 0) return;
    const result = applyDamage(target, amount); state.flash=.12;
    if (result.killed && target.team === "red") state.kills++;
    if (result.killed && target === state.foe) target.respawn = 7;
    if (target === state.tower && target.hp === 0) showToast("防御塔已摧毁！继续向前！");
    if (target === state.base && target.hp === 0) finish(true);
  }
  function castQ() {
    if (!state || paused || state.mode!=="playing" || state.player.q>0) return;
    state.player.q=5;
    const candidates = enemies().filter(e => e.hp>0 && inRange(state.player,e,260)).sort((a,b)=>distance(state.player,a)-distance(state.player,b));
    if (candidates.length) { hit(candidates[0],34); showToast("星火命中！"); } else showToast("附近没有可命中的目标");
  }
  function castR() {
    if (!state || paused || state.mode!=="playing" || state.player.r>0) return;
    state.player.r=14; const p=state.player; let hits=0;
    for (const e of enemies()) if (e.hp>0 && inRange(p,e,175)) { hit(e,48); hits++; }
    showToast(hits ? `星陨奥义命中 ${hits} 个目标` : "星陨奥义释放！");
  }

  function update(dt) {
    if (!state || paused || state.mode!=="playing") return;
    state.time+=dt; state.flash=Math.max(0,state.flash-dt); const p=state.player;
    p.x=clamp(p.x+input.x*190*dt,105,375);
    p.y=clamp(p.y+input.y*190*dt,state.tower.hp>0?245:105,690);
    p.cooldown=Math.max(0,p.cooldown-dt); p.q=Math.max(0,p.q-dt); p.r=Math.max(0,p.r-dt);
    state.foe.cooldown=Math.max(0,state.foe.cooldown-dt); state.foe.respawn=Math.max(0,state.foe.respawn-dt);
    state.towerFire=Math.max(0,state.towerFire-dt); state.spawn+=dt; state.allySpawn+=dt;
    if(state.spawn>7.5){state.spawn=0;for(let i=0;i<3;i++)state.minions.push(makeMinion("red",W/2+(i-1)*34,355+i*17));}
    if(state.allySpawn>9){state.allySpawn=0;for(let i=0;i<2;i++)state.minions.push(makeMinion("blue",W/2+(i-.5)*38,670+i*14));}
    for(const m of state.minions){
      if(m.hp<=0)continue; m.cooldown=Math.max(0,m.cooldown-dt);
      const foes=state.minions.filter(n=>n.team!==m.team&&n.hp>0&&Math.abs(n.x-m.x)<35&&Math.abs(n.y-m.y)<37);
      const target=foes.sort((a,b)=>distance(m,a)-distance(m,b))[0];
      if(target){if(m.cooldown<=0){hit(target,m.atk);m.cooldown=.8;}}
      else {m.y += (m.team==="blue"?-1:1)*31*dt;}
    }
    state.minions=state.minions.filter(m=>m.hp>0&&m.y>45&&m.y<H-45);
    if(state.foe.hp<=0 && state.foe.respawn<=0){state.foe.hp=state.foe.maxHp;state.foe.x=W/2;state.foe.y=325;showToast("敌方英雄已复活");}
    const foe=state.foe;
    if(foe.hp>0){
      if(distance(foe,p)<245){const d=Math.max(1,distance(foe,p));foe.x+=((p.x-foe.x)/d)*68*dt;foe.y+=((p.y-foe.y)/d)*68*dt;}
      if(inRange(foe,p,47)&&foe.cooldown<=0){applyDamage(p,9);foe.cooldown=1.05;}
    }
    if(state.tower.hp>0&&inRange(state.tower,p,270)&&state.towerFire<=0){applyDamage(p,11);state.towerFire=1.65;}
    if(input.attack && p.cooldown<=0){const target=targetForPlayer();if(target){hit(target,13);p.cooldown=.52;}else p.cooldown=.12;}
    if(p.hp<=0)finish(false);
    updateHud();
  }
  function updateHud(){
    const p=state.player,o=currentObjective();
    ui.playerHealth.style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;
    ui.objectiveHealth.style.width=`${Math.max(0,o.hp/o.maxHp*100)}%`;
    ui.objectiveLabel.textContent=state.tower.hp>0?"敌方防御塔":"敌方水晶";
    ui.clock.textContent=formatTime(state.time);ui.kills.textContent=`击败 ${state.kills}`;
    ui.q.classList.toggle("ready",p.q<=0);ui.r.classList.toggle("ready",p.r<=0);
    ui.q.querySelector("small").textContent=p.q<=0?"就绪":`${Math.ceil(p.q)}秒`;
    ui.r.querySelector("small").textContent=p.r<=0?"就绪":`${Math.ceil(p.r)}秒`;
  }

  function roundedRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawBar(x,y,w,h,hp,max,team){roundedRect(x-w/2,y,w,h,4,"#091119");roundedRect(x-w/2,y,w*Math.max(0,hp/max),h,4,team==="blue"?"#56e3b0":"#ff657d");}
  function drawUnit(u,kind){
    const isBlue=u.team==="blue"||kind==="player";const c=isBlue?colors.blue:colors.red;
    ctx.save();ctx.translate(u.x,u.y);
    if(kind==="player"||kind==="foe"){
      ctx.shadowColor=c;ctx.shadowBlur=18;ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,u.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle=kind==="player"?"#183c51":"#53283b";ctx.beginPath();ctx.arc(0,0,u.radius*.59,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=kind==="player"?"#b7fff0":"#ffd3d5";ctx.beginPath();ctx.arc(-4,-5,4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=kind==="player"?"#eaffff":"#ffe6e6";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(7,-14);ctx.lineTo(14,-28);ctx.stroke();
    }else{
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,-u.radius);ctx.lineTo(u.radius,u.radius*.7);ctx.lineTo(-u.radius,u.radius*.7);ctx.closePath();ctx.fill();
      ctx.fillStyle="#f3fff5";ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();drawBar(u.x,u.y-u.radius-11,kind==="minion"?25:42,5,u.hp,u.maxHp,u.team|| (kind==="player"?"blue":"red"));
  }
  function drawTower(t){
    ctx.save();ctx.translate(t.x,t.y);ctx.fillStyle="#d87951";ctx.beginPath();ctx.moveTo(-28,20);ctx.lineTo(-20,-23);ctx.lineTo(0,-39);ctx.lineTo(20,-23);ctx.lineTo(28,20);ctx.closePath();ctx.fill();
    ctx.fillStyle="#ffdb9f";ctx.beginPath();ctx.arc(0,-14,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#412d37";ctx.fillRect(-5,6,10,14);ctx.restore();drawBar(t.x,t.y+28,70,7,t.hp,t.maxHp,"red");
  }
  function drawBase(b){
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.PI/4);ctx.shadowColor="#ff596e";ctx.shadowBlur=20;ctx.fillStyle="#f3666f";ctx.fillRect(-21,-21,42,42);ctx.shadowBlur=0;ctx.strokeStyle="#ffd49d";ctx.lineWidth=4;ctx.strokeRect(-13,-13,26,26);ctx.restore();drawBar(b.x,b.y+36,80,7,b.hp,b.maxHp,"red");
  }
  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#173231");g.addColorStop(.48,"#2c5540");g.addColorStop(1,"#17352e");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#102822";ctx.beginPath();ctx.moveTo(65,0);ctx.lineTo(415,0);ctx.lineTo(330,H);ctx.lineTo(150,H);ctx.closePath();ctx.fill();
    ctx.fillStyle="#766846";ctx.beginPath();ctx.moveTo(155,0);ctx.lineTo(325,0);ctx.lineTo(285,H);ctx.lineTo(195,H);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#b4a26b55";ctx.lineWidth=2;ctx.setLineDash([13,16]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<12;i++){const x=i%2?36:444,y=(i*83+28)%H;ctx.fillStyle=i%2?"#285341":"#31593e";ctx.beginPath();ctx.ellipse(x,y,18,30,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#477553";ctx.beginPath();ctx.ellipse(x-3,y-4,9,18,0,0,Math.PI*2);ctx.fill();}
    roundedRect(181,18,118,112,18,"#7c303b");ctx.strokeStyle="#ffb58d";ctx.lineWidth=2;ctx.strokeRect(194,31,92,86);
    ctx.fillStyle="#ffd49d";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("赤方水晶",240,50);
    roundedRect(181,705,118,100,18,"#24547a");ctx.strokeStyle="#7fe8fa";ctx.strokeRect(194,719,92,72);ctx.fillStyle="#c4fbff";ctx.fillText("蓝方泉水",240,741);
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,offsetX,offsetY);drawBackground();
    if(!state)return;
    drawBase(state.base);if(state.tower.hp>0)drawTower(state.tower);
    for(const m of state.minions)drawUnit(m,"minion");
    if(state.foe.hp>0)drawUnit(state.foe,"foe");drawUnit(state.player,"player");
    if(state.flash>0){ctx.fillStyle=`rgba(255,255,220,${state.flash*1.6})`;ctx.fillRect(0,0,W,H);}
  }
  function frame(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);

  ui.startButton.addEventListener("click",newGame);ui.restart.addEventListener("click",newGame);
  function buttonHold(el,down,up){el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);down();});el.addEventListener("pointerup",e=>{e.preventDefault();up();});el.addEventListener("pointercancel",up);}
  buttonHold(ui.attack,()=>{input.attack=true;ui.attack.classList.add("pressed");},()=>{input.attack=false;ui.attack.classList.remove("pressed");});
  ui.q.addEventListener("pointerdown",e=>{e.preventDefault();castQ();});ui.r.addEventListener("pointerdown",e=>{e.preventDefault();castR();});
  let stickPointer=null;
  function setStick(e){const r=ui.joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.max(1,Math.hypot(dx,dy)),max=r.width*.34,k=Math.min(1,len/max);input.x=dx/len*k;input.y=dy/len*k;ui.stick.style.transform=`translate(calc(-50% + ${input.x*max}px),calc(-50% + ${input.y*max}px))`;}
  ui.joystick.addEventListener("pointerdown",e=>{e.preventDefault();stickPointer=e.pointerId;ui.joystick.setPointerCapture(e.pointerId);setStick(e);});
  ui.joystick.addEventListener("pointermove",e=>{if(stickPointer===e.pointerId)setStick(e);});
  function resetStick(){stickPointer=null;input.x=input.y=0;ui.stick.style.transform="translate(-50%,-50%)";}
  ui.joystick.addEventListener("pointerup",resetStick);ui.joystick.addEventListener("pointercancel",resetStick);
  window.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="q")castQ();if(e.key.toLowerCase()==="r")castR();if(e.code==="Space")input.attack=true;if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")input.x=-1;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")input.x=1;if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")input.y=-1;if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")input.y=1;});
  window.addEventListener("keyup",e=>{if(e.code==="Space")input.attack=false;if(["ArrowLeft","ArrowRight","a","d"].includes(e.key))input.x=0;if(["arrowup","arrowdown","w","s"].includes(e.key.toLowerCase()))input.y=0;});
  function pauseGame() { paused=true; input.attack=false; resetStick(); ui.attack.classList.remove("pressed"); }
  function resumeGame() { paused=false; last=performance.now(); }
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseGame();else resumeGame();});
  window.addEventListener("moba-pause",pauseGame);
  window.addEventListener("moba-resume",resumeGame);
})();
