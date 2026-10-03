import * as T from './vendor/three.module.min.js';

// Original sculpted champions. Each articulated limb is a single vertex-colour
// mesh; geometry is shared between instances instead of hundreds of primitives.
const TAU = Math.PI * 2;
const templates = new Map();
const painted = new T.MeshStandardMaterial({vertexColors:true, roughness:.72, metalness:.22});
const glowPaint = new T.MeshStandardMaterial({vertexColors:true, roughness:.28, metalness:.3, emissive:0x69c6dc, emissiveIntensity:.34});
const C = new T.Color();
const sphere = new T.SphereGeometry(1,10,6);
const diamond = new T.OctahedronGeometry(1);
const barrierGeometry = new T.SphereGeometry(1,20,12);
const themes = {
 blade:{cloth:0x163b60,deep:0x112334,armor:0x526f84,light:0x91aaba,gold:0xcfa96b,hair:0x253a48,accent:0x7ce4f1,skin:0xdbb29a},
 mage:{cloth:0x493369,deep:0x201e3d,armor:0x555e83,light:0xc3bfd9,gold:0xd0b888,hair:0xd7d5e4,accent:0xbc9cf9,skin:0xebc8b8},
 ranger:{cloth:0x28574d,deep:0x1a3030,armor:0x55766d,light:0xb4c5b1,gold:0xc3a777,hair:0xbeb094,accent:0xabe1b0,skin:0xe2bea4},
 warden:{cloth:0x263f52,deep:0x172634,armor:0x697c81,light:0xa9b9b4,gold:0xd7b46d,hair:0x4a3935,accent:0xa2eaf3,skin:0xbd947b},
 shade:{cloth:0x392b4d,deep:0x192331,armor:0x5a607a,light:0xa3abbc,gold:0xb39b93,hair:0x373146,accent:0xd19dce,skin:0xcfae9f},
 tide:{cloth:0x236778,deep:0x173d51,armor:0x669eab,light:0xc7e6e0,gold:0xcbbf91,hair:0x263b52,accent:0x87eadb,skin:0xe4c4b0}
};
function sculpt(rings,n=10){
 const p=[],idx=[];
 for(const r of rings){for(let i=0;i<n;i++){const a=(i/n)*TAU;p.push(Math.sin(a)*r[1],r[0],Math.cos(a)*r[2]+(r[3]||0));}}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;idx.push(a,b,c,b,d,c);}
 for(let i=1;i<n-1;i++){idx.push(0,i+1,i);const o=(rings.length-1)*n;idx.push(o,o+i,o+i+1);}
 if(rings[rings.length-1][0]<rings[0][0])for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function plate(points,depth=.09,bevel=.025){
 const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:3});g.translate(0,0,-depth/2);return g;
}
function tube(points,r=.05){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(6,points.length*2),r,5,false);}
function colorMix(a,b,t){return new T.Color(a).lerp(new T.Color(b),t).getHex();}
// Bake local transform and painted highlights into a rigid batch at construction.
class Batch{
 constructor(){this.p=[];this.n=[];this.c=[];}
 add(geometry,color,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  const m=new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale));g.applyMatrix4(m);
  g.computeBoundingBox();const p=g.attributes.position,n=g.attributes.normal;C.setHex(color);const low=g.boundingBox.min.y,span=Math.max(.04,g.boundingBox.max.y-low);
  for(let i=0;i<p.count;i++){
   this.p.push(p.getX(i),p.getY(i),p.getZ(i));this.n.push(n.getX(i),n.getY(i),n.getZ(i));
   // Broad warm top planes and cool recesses give the materials a painted read.
   const h=(p.getY(i)-low)/span,up=Math.max(0,n.getY(i)),rim=Math.pow(Math.abs(n.getX(i)),2);
   const shade=.73+.17*h+.11*up+.075*Math.max(0,-n.getZ(i))-.04*Math.max(0,n.getZ(i));
   this.c.push(C.r*shade+.011*rim,C.g*shade+.016*rim,C.b*shade+.024*rim);
  }g.dispose();return this;
 }
 mesh(parent,material=painted){if(!this.p.length)return null;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.computeBoundingSphere();const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
}
function bone(parent,name,x=0,y=0,z=0){const b=new T.Group();b.name=name;b.position.set(x,y,z);parent.add(b);return b;}
function orb(b,c,p,s){b.add(sphere,c,p,s);}
function rivet(b,c,p,s=.048){b.add(diamond,c,p,[s,s,s*.5]);}
function leaf(b,c,p,w,h,d=.12,rot=[0,0,0]){const g=plate([[0,h*.52],[w*.48,h*.23],[w*.5,-h*.22],[0,-h*.52],[-w*.5,-h*.22],[-w*.48,h*.23]],d,Math.min(.025,w*.08,h*.08));b.add(g,c,p,[1,1,1],rot);g.dispose();}
function stripe(b,c,points,r){const g=tube(points,r);b.add(g,c);g.dispose();}
function bladeShape(b,c,p,length=2,width=.3,rot=[0,0,0]){
 const outline=[[0,length],[-width*.3,length*.78],[-width*.5,length*.11],[-width*.25,0],[width*.32,0],[width*.5,length*.15],[width*.25,length*.8]];
 const g=plate(outline,.055,.016);b.add(g,c,p,[1,1,1],rot);g.dispose();
}
function capeMesh(width,length,c,topRatio=.66){
 const rows=7,cols=8,p=[],co=[],idx=[];const color=new T.Color(c);
 for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=cols;i++){const q=i/cols*2-1;const fold=Math.cos(q*Math.PI*3)*.075*(.3+t);p.push(q*width*(topRatio+t*(1-topRatio)),-t*length,.11+t*.19+fold);const hem=j===rows||i===0||i===cols;const sh=.74+.24*(1-q*q)+.10*Math.cos(q*Math.PI*3);co.push(color.r*sh+(hem?.075:0),color.g*sh+(hem?.055:0),color.b*sh+(hem?.025:0));}}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(co,3));g.setIndex(idx);g.computeVertexNormals();
 const mat=painted.clone();mat.side=T.DoubleSide;const mesh=new T.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function build(kind,team,palette){
 const original=themes[kind]||themes.blade,p={...original};
 if(palette)p.cloth=colorMix(p.cloth,palette,.7);
 if(team===1){p.cloth=colorMix(p.cloth,0x7a2f49,.62);p.accent=0xffac9e;}
 const root=new T.Group();root.name='hero';const body=bone(root,'body');
 const bulky=kind==='warden',slender=kind==='mage'||kind==='tide';
 const width=bulky?1.24:slender?.91:1;
 const torso=new Batch();
 let g=sculpt([[2.30,.36,.26],[2.53,.40,.28],[2.85,.37,.24],[3.18,.46,.3],[3.55,.57,.32],[3.84,.64,.29],[3.99,.35,.24]],12);
 torso.add(g,p.cloth,[0,0,0],[width,1,1]);g.dispose();
 // Layered fitted breastplate and a narrow waist establish a human silhouette.
 if(kind==='blade'||bulky){
  g=sculpt([[3.08,.34,.255],[3.28,.43,.30],[3.53,.53,.346],[3.77,.57,.30],[3.90,.38,.225]],20);
  torso.add(g,p.armor,[0,0,-.016],[width,1,1]);g.dispose();
  for(const side of [-1,1]){
   leaf(torso,p.light,[side*.28,3.69,-.290],.37,.34,.040,[0,-side*.22,side*.48]);
   stripe(torso,p.gold,[[side*.47*width,3.57,-.20],[side*.29*width,3.40,-.32],[0,3.27,-.325]],.022);
  }
  leaf(torso,p.gold,[0,3.57,-.381],.12,.43,.025);
  leaf(torso,p.deep,[0,3.28,-.343],.21,.25,.025);
 }else if(slender){
  orb(torso,p.cloth,[-.19,3.57,-.10],[.27,.25,.25]);orb(torso,p.cloth,[.19,3.57,-.10],[.27,.25,.25]);
  leaf(torso,p.armor,[0,3.09,-.24],.49,.47,.065);
  for(const side of [-1,1]){
   stripe(torso,p.gold,[[side*.38,3.78,-.25],[side*.30,3.46,-.36],[0,3.20,-.31]],.024);
   leaf(torso,p.light,[side*.20,3.83,-.255],.35,.23,.045,[0,0,side*.39]);
  }
  leaf(torso,p.accent,[0,3.63,-.36],.145,.25,.028);
 }else{
  const leather=kind==='ranger'?0x6b5d43:p.armor;
  for(const side of [-1,1]){
   leaf(torso,leather,[side*.22,3.43,-.29],.40,.67,.055,[0,0,side*.15]);
   stripe(torso,p.gold,[[side*.34,3.75,-.28],[side*.16,3.37,-.355],[side*.10,2.90,-.28]],.027);
  }
  leaf(torso,p.accent,[0,3.69,-.346],.14,.20,.038);
 }
 for(const s of [-1,1]){
  stripe(torso,p.gold,[[s*.12,3.86,-.32],[s*.47*width,3.76,-.35],[s*.38*width,3.39,-.4]],.035);
  leaf(torso,p.armor,[s*.37*width,2.62,-.2],.35,.70,.11,[0,s*.32,s*.15]);
  leaf(torso,p.gold,[s*.36*width,2.72,-.282],.24,.24,.025,[0,s*.32,0]);
 }
 g=sculpt([[2.68,.41,.30],[2.78,.40,.30]],12);torso.add(g,p.gold,[0,0,0],[width,1,1]);g.dispose();
 leaf(torso,p.light,[0,2.73,-.34],.25,.21,.045);rivet(torso,p.accent,[0,2.73,-.39],.075);
 g=sculpt([[3.91,.19,.17],[4.23,.17,.15]],10);torso.add(g,p.skin);g.dispose();
 // Tall split tabards are angular panels rather than cylindrical skirts.
 if(kind!=='shade'&&kind!=='ranger')for(const s of [-1,1]){
  const long=slender?1.92:.67;
  const pan=plate([[-.24,0],[.20,0],[slender?.46:.30,-long*.84],[.03,-long],[slender?-.37:-.24,-long*.86]],.03,.012);
  torso.add(pan,p.cloth,[s*.20,2.67,-.315],[1,1,1],[.05,0,-s*.075]);pan.dispose();
  stripe(torso,p.gold,[[s*.41,2.64,-.35],[s*.47,2.18,-.375],[s*.42,2.67-long,-.39]],.024);
 }
 if(kind==='ranger'){
  const quiver=sculpt([[0,.16,.15],[1.02,.23,.20],[1.12,.27,.21]],8);torso.add(quiver,0x665441,[.38,2.91,.43],[1,1,1],[0,0,-.32]);quiver.dispose();
  for(let i=0;i<3;i++){stripe(torso,p.gold,[[.35+i*.1,3.70,.44],[.45+i*.1,4.28,.45]],.018);leaf(torso,p.light,[.46+i*.10,4.16,.45],.1,.26,.02,[0,0,-.18]);}
 }
 torso.mesh(body);
 // Hip, knee, and ankle are separate pivots; feet roll through the run cycle.
 for(let i=0;i<2;i++){
  const s=i?1:-1,leg=bone(body,'leg'+i,s*(bulky?.31:.255),2.43,0),thigh=new Batch();
  g=sculpt([[.03,.205,.225],[-.27,.238,.238],[-.66,.182,.18],[-1.10,.13,.14]],10);thigh.add(g,p.deep,[0,0,0],[bulky?1.25:1,1,1]);g.dispose();
  leaf(thigh,slender?p.cloth:kind==='ranger'?0x655847:p.armor,[0,-.41,-.177],bulky?.46:.32,.76,.065,[.03,0,s*.08]);
  stripe(thigh,p.gold,[[s*.14,-.12,-.18],[s*.15,-.45,-.23],[s*.08,-.71,-.18]],.022);
  thigh.mesh(leg);
  const knee=bone(leg,'knee'+i,0,-1.04,0),shin=new Batch();
  g=sculpt([[0,.15,.17],[-.25,.19,.20],[-.60,.17,.17],[-1.07,.11,.13]],10);shin.add(g,p.deep);g.dispose();
  leaf(shin,p.armor,[0,-.05,-.155],bulky?.44:.32,.40,.10);
  leaf(shin,slender?p.armor:p.light,[0,-.40,-.17],bulky?.38:.27,slender?.43:.62,.07);
  leaf(shin,p.gold,[0,-.11,-.233],.13,.21,.025);
  // Sloped toe, heel, and ankle; no box boots.
  g=sculpt([[.06,.14,.19],[-.11,.155,.245],[-.23,.18,.26]],10);shin.add(g,p.armor,[0,-1.09,-.075],[bulky?1.2:1,1,1]);g.dispose();
  orb(shin,p.deep,[0,-1.21,-.19],[bulky?.24:.19,.115,.36]);
  leaf(shin,p.gold,[0,-1.17,-.43],.24,.13,.022,[.3,0,0]);shin.mesh(knee);
 }
 // Upper arms and forearms have elbows, wrist guards, and curled grip hands.
 for(let i=0;i<2;i++){
  const s=i?1:-1,arm=bone(body,'arm'+i,s*(bulky?.77:.64),3.84,.005),upper=new Batch();
  g=sculpt([[0,.16,.18],[-.30,.16,.17],[-.71,.12,.13]],10);upper.add(g,slender?p.cloth:p.deep);g.dispose();
  const lightShoulder=(kind==='blade'||kind==='ranger'||kind==='shade')&&i===1;
  orb(upper,slender||lightShoulder?p.cloth:p.armor,[s*.05,-.035,.01],[bulky?.43:slender?.22:lightShoulder?.20:.31,bulky?.25:.20,.27]);
  if(!slender&&!lightShoulder){
   leaf(upper,p.armor,[s*.07,.01,-.23],bulky?.57:.44,.37,.055,[0,0,-s*.20]);
   stripe(upper,p.gold,[[s*.29,-.05,-.12],[s*.14,.13,-.24],[-s*.10,.09,-.21]],.023);
  }else leaf(upper,p.gold,[s*.06,.085,-.165],.28,.19,.035,[0,0,-s*.34]);
  if(bulky)leaf(upper,p.gold,[s*.10,.19,-.02],.32,.40,.11,[.2,0,-s*.55]);
  upper.mesh(arm);
  const elbow=bone(arm,'elbow'+i,0,-.69,0),fore=new Batch();
  g=sculpt([[.01,.115,.13],[-.20,.16,.17],[-.46,.13,.14],[-.64,.09,.115]],10);fore.add(g,p.armor);g.dispose();
  leaf(fore,p.light,[0,-.29,-.14],bulky?.32:.235,.48,.055);
  stripe(fore,p.gold,[[-.13,-.18,-.11],[0,-.13,-.20],[.13,-.18,-.11]],.025);
  orb(fore,p.skin,[0,-.73,-.014],[.11,.145,.12]);
  for(let f=0;f<3;f++)orb(fore,p.skin,[.07,-.68-f*.054,-.09],[.055,.030,.044]);
  if(kind==='warden'&&i===0){
   const shield=plate([[0,.99],[.63,.63],[.57,-.19],[.28,-.84],[0,-1.09],[-.38,-.78],[-.63,.57]],.18,.06);
   fore.add(shield,p.gold,[0,-.30,-.36],[1,1,1],[0,-.15,0]);shield.dispose();
   const inset=plate([[0,.85],[.48,.51],[.40,-.18],[0,-.87],[-.45,-.55],[-.47,.49]],.055,.015);
   fore.add(inset,p.cloth,[0,-.28,-.495]);inset.dispose();
   leaf(fore,p.light,[0,-.30,-.55],.59,1.13,.07);leaf(fore,p.accent,[0,-.25,-.61],.25,.44,.06);
   stripe(fore,p.gold,[[-.35,.04,-.55],[0,.32,-.59],[.36,.04,-.55]],.035);
  }
  if(kind==='shade'){
   const dagger=new Batch();bladeShape(dagger,p.light,[0,-.74,-.1],1.03,.25,[-Math.PI*.67,0,0]);
   stripe(dagger,p.gold,[[-.24,-.77,-.14],[0,-.76,-.15],[.23,-.77,-.14]],.036);
   fore.p.push(...dagger.p);fore.n.push(...dagger.n);fore.c.push(...dagger.c);
  }
  fore.mesh(elbow);
 }
 const head=bone(body,'head',0,4.40,-.015),face=new Batch();
 g=sculpt([[-.25,.105,.14,-.035],[-.16,.188,.181,-.015],[.01,.23,.213],[.20,.224,.215,.013],[.34,.176,.177,.022],[.39,.065,.07,.015]],24);face.add(g,p.skin);g.dispose();
 // Cheek planes, nose bridge, recessed eye sockets, brow and a small mouth.
 for(const s of [-1,1]){
  orb(face,colorMix(p.skin,0x955c51,.15),[s*.104,.07,-.18],[.079,.033,.036]);
  orb(face,0xe0d5c4,[s*.103,.094,-.206],[.047,.018,.012]);
  orb(face,kind==='tide'?0x28777b:0x314657,[s*.099,.095,-.219],[.014,.015,.004]);
  orb(face,0x141c26,[s*.098,.095,-.224],[.006,.009,.002]);
  stripe(face,colorMix(p.hair,0x483829,.35),[[s*.055,.139,-.213],[s*.121,.150,-.208],[s*.160,.137,-.191]],.007);
  orb(face,p.skin,[s*.23,.009,.01],[.040,.097,.06]);
 }
 g=plate([[-.035,.10],[.036,.10],[.051,-.035],[0,-.065],[-.043,-.035]],.05,.008);face.add(g,colorMix(p.skin,0xffe4c9,.15),[0,.002,-.226]);g.dispose();
 stripe(face,colorMix(p.skin,0x844742,.5),[[-.064,-.13,-.190],[0,-.138,-.209],[.059,-.132,-.197]],.010);
 // Swept, layered hair locks are solid sculpted ribbons, never cone spikes.
 const hairCap=sculpt([[.15,.235,.22,.03],[.30,.23,.214,.02],[.40,.177,.17,.01],[.455,.07,.075,.008],[.46,.001,.001,.008]],24);face.add(hairCap,p.hair);hairCap.dispose();
 for(let i=0;i<5;i++){
  const x=(i-2)*.082,lock=sculpt([[.27,.044,.052,.015],[.18,.060,.056,-.020],[.07,.052,.041,-.042],[-.08,.007,.009,-.018]],12);
  face.add(lock,i%2?colorMix(p.hair,0xffffff,.10):p.hair,[x,.22,-.168],[1,1,1],[-.20,-x*.7,-.38+x*.4]);lock.dispose();
 }
 const longHair=kind==='mage'||kind==='tide';
 if(longHair)for(const s of [-1,1]){
  g=sculpt([[.26,.13,.13],[-.04,.15,.14],[-.40,.13,.13],[-.74,.085,.095],[-.94,.024,.025]],8);
  face.add(g,p.hair,[s*.20,.02,.18],[1,1,1],[-.13,0,s*.10]);g.dispose();
  stripe(face,colorMix(p.hair,0xffffff,.18),[[s*.25,.13,.07],[s*.29,-.35,.12],[s*.33,-.77,.2]],.025);
 }
 if(kind==='mage'||kind==='tide'){
  stripe(face,p.gold,[[-.23,.23,-.08],[-.17,.27,-.20],[0,.24,-.255],[.17,.27,-.20],[.23,.23,-.08]],.030);
  leaf(face,p.accent,[0,.23,-.276],.10,.18,.035);
 }
 if(kind==='shade'){
  const mask=plate([[-.195,.035],[.195,.035],[.15,-.14],[0,-.215],[-.155,-.14]],.05,.018);face.add(mask,p.deep,[0,-.026,-.21]);mask.dispose();
  stripe(face,p.gold,[[-.17,.013,-.244],[0,-.026,-.271],[.17,.013,-.244]],.015);
 }
 if(bulky){
  g=sculpt([[.07,.26,.245],[.33,.27,.25],[.48,.18,.20],[.55,.01,.05]],12);face.add(g,p.armor,[0,0,.07]);g.dispose();
  leaf(face,p.gold,[0,.29,-.235],.20,.56,.04);
  for(const s of [-1,1])leaf(face,p.armor,[s*.20,.005,-.135],.17,.50,.075,[0,s*.3,-s*.18]);
  stripe(face,p.light,[[-.22,.23,-.23],[0,.17,-.28],[.22,.23,-.23]],.035);
 }
 face.mesh(head);
 const cape=bone(body,'cape',kind==='blade'?-.13:0,3.87,.29);
 const capeWidth=bulky?.71:kind==='shade'?.47:.65, capeLength=kind==='ranger'?1.1:kind==='shade'?.91:1.24;
 cape.add(capeMesh(capeWidth,capeLength,p.cloth));
 const capeTip=bone(cape,'capeTip',0,-capeLength,.20);capeTip.add(capeMesh(capeWidth*1.03,kind==='mage'||kind==='tide'?1.68:.97,p.cloth,.97));
 const elbow=root.getObjectByName('elbow1'),weapon=bone(elbow,'weapon',0,-.73,-.035),w=new Batch(),glow=new Batch();
 if(kind==='blade'){
  stripe(w,p.deep,[[0,-.15,0],[0,.30,0]],.058);
  stripe(w,p.gold,[[-.38,.24,0],[-.26,.36,0],[0,.29,0],[.27,.35,0],[.40,.28,0]],.058);
  bladeShape(w,0xafcdd9,[0,.34,0],2.05,.31);
  bladeShape(w,0x5ebbc9,[-.006,.41,-.041],1.82,.081);
  leaf(w,p.accent,[0,.43,-.061],.108,.28,.025);
  orb(w,p.gold,[0,-.16,0],[.09,.11,.085]);
  weapon.rotation.set(-.40,0,-.20);
 }else if(kind==='mage'||kind==='tide'){
  stripe(w,p.deep,[[0,-.96,0],[0,1.41,0]],.050);
  stripe(w,p.gold,[[0,-.92,-.01],[.05,-.11,-.015],[0,.67,-.01],[0,1.56,0]],.025);
  for(const s of [-1,1])stripe(w,p.gold,[[0,1.25,0],[s*.33,1.52,0],[s*.39,1.91,0],[s*.17,2.21,0]],.055);
  glow.add(diamond,p.accent,[0,1.83,0],[.21,.40,.13]);
  if(kind==='tide')stripe(w,p.light,[[-.45,1.75,0],[-.26,2.00,0],[0,2.20,0],[.30,2.37,0]],.055);
  leaf(w,p.light,[0,1.32,-.028],.17,.32,.06);weapon.rotation.set(.02,0,-.11);
 }else if(kind==='ranger'){
  for(const s of [-1,1]){
   stripe(w,p.gold,[[0,0,0],[.28,s*.36,0],[.35,s*.81,0],[.14,s*1.26,0],[-.05,s*1.4,0]],.065);
   leaf(w,p.light,[.29,s*.65,-.025],.14,.53,.035,[0,0,-s*.16]);
  }
  stripe(w,p.deep,[[-.05,-1.4,0],[-.12,0,0],[-.05,1.4,0]],.012);
  stripe(w,p.deep,[[.06,-.22,0],[.06,.22,0]],.084);
  weapon.rotation.set(-.18,0,.16);
 }else if(kind==='warden'){
  stripe(w,p.deep,[[0,-.35,0],[0,1.49,0]],.065);stripe(w,p.gold,[[0,-.36,-.017],[0,1.45,-.017]],.025);
  const hammer=plate([[-.57,.25],[-.37,.44],[.40,.42],[.58,.25],[.55,-.20],[.28,-.34],[-.40,-.29],[-.57,-.09]],.56,.075);w.add(hammer,p.armor,[0,1.5,0]);hammer.dispose();
  leaf(w,p.gold,[0,1.54,-.345],.53,.64,.065);leaf(glow,p.accent,[0,1.53,-.397],.23,.31,.042);weapon.rotation.set(-.12,0,-.25);
 }
 w.mesh(weapon);glow.mesh(weapon,glowPaint);
 if(bulky)body.scale.set(1.04,1.015,1.03);
 root.userData.kind=kind;return root;
}

export function createHeroModel(kind,team=0,small=false,palette=null){
 const key=[kind,team,palette||0].join(':');if(!templates.has(key))templates.set(key,build(kind,team,palette));
 const root=templates.get(key).clone(true),get=n=>root.getObjectByName(n);
 const accent=team?0xff9b9f:(themes[kind]||themes.blade).accent;
 const barrier=new T.Mesh(barrierGeometry,new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.13,depthWrite:false,side:T.FrontSide}));barrier.position.y=2.55;barrier.scale.set(1.43,2.64,1.24);barrier.visible=false;root.add(barrier);
 root.userData={kind,body:get('body'),legs:[get('leg0'),get('leg1')],knees:[get('knee0'),get('knee1')],arms:[get('arm0'),get('arm1')],elbows:[get('elbow0'),get('elbow1')],head:get('head'),cape:get('cape'),capeTip:get('capeTip'),weapon:get('weapon'),barrier,phase:0,runBlend:0,attack:0,attackBlend:0,turnReady:false};
 if(small)root.scale.setScalar(.5);return root;
}
export function disposeHeroModel(root){root?.userData?.barrier?.material.dispose();}

export function animateHeroModel(root,{dt=1/60,time=0,moving=false,speed=9,attack,face,alive=true,shield=0,stealth=false,lobby=false}={}){
 const u=root.userData;if(!u.body)return;dt=Math.max(0,Math.min(.1,dt));
 if(attack!==undefined)u.attack=Math.max(0,attack);else u.attack=Math.max(0,u.attack-dt);
 if(face&&(Math.abs(face.x)+Math.abs(face.z)>.001)){
  const target=Math.atan2(-face.x,-face.z);
  if(!u.turnReady){root.rotation.y=target;u.turnReady=true;}else{let d=(target-root.rotation.y+Math.PI)%TAU;if(d<0)d+=TAU;d-=Math.PI;root.rotation.y+=d*(1-Math.exp(-dt*(moving?19:25)));}
 }
 const smoothing=1-Math.exp(-dt*15);u.runBlend+=(moving&&alive?1-u.runBlend:-u.runBlend)*smoothing;
 const b=u.runBlend,rate=2.10+Math.min(1.3,Math.max(0,speed-7)*.10);u.phase+=dt*TAU*rate*(.25+.75*b);
 const stride=Math.sin(u.phase),bounce=Math.cos(u.phase*2),breath=Math.sin(time*1.7);
 const swing=u.attack>0?Math.sin(Math.min(1,u.attack/.30)*Math.PI):0;
 const targetAtk=u.attack>0?1:0;u.attackBlend+=(targetAtk-u.attackBlend)*(1-Math.exp(-dt*25));
 u.body.position.y=.014*breath*(1-b)+(.060+.055*bounce)*b;
 u.body.rotation.x=-.075*b;u.body.rotation.y=stride*.060*b;u.body.rotation.z=stride*.025*b;
 for(let i=0;i<2;i++){
  const s=i?1:-1,q=stride*s,phase=u.phase+(i?0:Math.PI);
  u.legs[i].rotation.set(q*.69*b+.025*(1-b),0,s*.045*(1-b));
  u.knees[i].rotation.x=-(.06+.91*Math.max(0,Math.sin(phase-.50))*b);
  u.arms[i].rotation.set(-q*.40*b-.08*(1-b),s*.035,-s*(.095+.025*breath));
  u.elbows[i].rotation.x=-.22-.32*b+.16*q*b;
 }
 const kind=u.kind;
 if(kind==='blade'||kind==='warden'){
  u.arms[1].rotation.x-=.27+swing*1.36;u.arms[1].rotation.z-=swing*.65;
  u.elbows[1].rotation.x-=.08+swing*.38;u.body.rotation.y+=swing*.45;
  if(kind==='warden'){u.arms[0].rotation.x=-.28+b*.08;u.elbows[0].rotation.x=-.55;}
 }else if(kind==='ranger'){
  u.arms[1].rotation.x=-.50-b*.06-swing*.62;u.arms[1].rotation.z=-.22-swing*.25;u.elbows[1].rotation.x=-.29-swing*.22;
  u.arms[0].rotation.x=-.40-b*.08-swing*1.1;u.arms[0].rotation.y=swing*.35;u.elbows[0].rotation.x=-.44-swing*.83;
 }else if(kind==='mage'||kind==='tide'){
  u.arms[1].rotation.x=-.19-stride*.08*b-swing*.53;u.elbows[1].rotation.x=-.24;
  u.arms[0].rotation.x-=swing*1.30;u.elbows[0].rotation.x-=swing*.25;u.arms[0].rotation.z+=swing*.25;
 }else if(kind==='shade'){
  u.body.rotation.x=-.13*b;u.arms[1].rotation.x-=swing*1.4;u.arms[0].rotation.x+=swing*.42;
  u.arms[1].rotation.z-=swing*.61;u.body.rotation.y+=swing*.55;
 }
 if(lobby){u.body.rotation.z=.028;u.body.rotation.y+=.075;u.legs[0].rotation.z=-.09;u.legs[1].rotation.x=-.045;u.knees[0].rotation.x=-.10;u.arms[0].rotation.z+=.035;}
 u.head.rotation.x=.025*breath+.045*b;u.head.rotation.y=-u.body.rotation.y*.40+(lobby?Math.sin(time*.31)*.085:0);
 u.cape.rotation.x=.05+.18*b+Math.sin(time*2.3)*.025;
 u.cape.rotation.z=Math.sin(time*2.1)*.028+stride*.04*b;
 u.capeTip.rotation.x=.07+.18*b+Math.sin(time*2.3-.8)*.05;
 u.capeTip.rotation.z=Math.sin(time*2.1-.6)*.036+stride*.03*b;
 u.barrier.visible=shield>0||stealth;u.barrier.material.opacity=stealth?.23:.115;
}
