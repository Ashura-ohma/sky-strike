import * as T from './vendor/three.module.min.js';
import * as Battle from './engine.mjs';
import {createHeroModel,animateHeroModel,disposeHeroModel} from './hero-models.mjs';
import {createTerrainTexture,createRiverGeometry} from './terrain.mjs';
const {HEROES,LANES,BASES,BLOCKERS}=Battle;
const BLUE=0x59d6f2, RED=0xff6c86;
const G={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,12,8),cyl:new T.CylinderGeometry(1,1,1,12),cone:new T.ConeGeometry(1,1,8),oct:new T.OctahedronGeometry(1),rock:new T.DodecahedronGeometry(1,0),leaf:new T.SphereGeometry(1,7,4),ring:new T.RingGeometry(.87,1,48),plane:new T.PlaneGeometry(1,1)};
const mats=new Map();
function mat(color,metal=.05,rough=.8,emissive=0){const key=[color,metal,rough,emissive].join();if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive,emissiveIntensity:.6}));return mats.get(key);}
function part(root,type,color,pos,size,options={}){const m=new T.Mesh(G[type],mat(color,options.metal||0,options.rough??.8,options.emissive||0));m.position.set(...pos);m.scale.set(...size);m.castShadow=options.shadow===true;m.receiveShadow=true;root.add(m);return m;}
function ring(root,r,color,y=.12){const m=new T.Mesh(G.ring,new T.MeshBasicMaterial({color,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.scale.setScalar(r);m.position.y=y;m.material.userData.owned=true;root.add(m);return m;}
function gem(root,color,pos,size){const m=part(root,'oct',color,pos,size,{metal:.3,rough:.2,emissive:color});return m;}
// Rigid pieces share one vertex-colour material and one geometry per model kind.
const rigidMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.06});
const rigidCache=new Map();
function mergeRigid(root,cacheKey=null){
 root.updateMatrixWorld(true);const meshes=[];root.traverse(m=>{if(m.isMesh&&!m.material.transparent&&!m.userData.dynamic&&!m.userData.preserveMaterial)meshes.push(m);});
 let geometry=cacheKey&&rigidCache.get(cacheKey);
 if(!geometry){const positions=[],normals=[],colors=[],inverse=new T.Matrix4().copy(root.matrixWorld).invert();
  for(const mesh of meshes){const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));const a=g.attributes.position,n=g.attributes.normal,c=mesh.material.color;
   for(let i=0;i<a.count;i++){positions.push(a.getX(i),a.getY(i),a.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}g.dispose();}
  geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();
  if(cacheKey)rigidCache.set(cacheKey,geometry);else geometry.userData.owned=true;
 }
 for(const mesh of meshes)mesh.removeFromParent();const mesh=new T.Mesh(geometry,rigidMaterial);mesh.receiveShadow=true;root.add(mesh);return root;
}
function tower(team){
 const root=new T.Group(),color=team===0?BLUE:RED,stone=team===0?0x667e87:0x786f79,trim=0xb8ae88;
 part(root,'cyl',0x384f59,[0,.3,0],[2.3,.6,2.3]);part(root,'cyl',0x7b8e90,[0,.7,0],[1.98,.35,1.98]);part(root,'rock',stone,[0,1.55,0],[1.35,1.25,1.35]);
 part(root,'cyl',0x4c6572,[0,2.55,0],[1.0,2.2,1.0]);part(root,'cyl',trim,[0,3.5,0],[1.45,.18,1.45]);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,arm=new T.Group();arm.position.set(Math.sin(a)*1.15,0,Math.cos(a)*1.15);arm.rotation.y=a;root.add(arm);
  const buttress=part(arm,'rock',stone,[0,2.75,0],[.55,2.1,.72]);buttress.rotation.x=-.16;
  const claw=part(arm,'cone',0x9aaba9,[0,4.35,-.35],[.35,1.8,.45]);claw.rotation.x=.35;
  part(arm,'box',trim,[0,3.65,-.8],[.18,1.1,.13]);
 }
 part(root,'cyl',0x243f4b,[0,4.05,0],[1.05,.28,1.05]);mergeRigid(root,`tower-${team}`);
 const crystal=gem(root,color,[0,4.85,0],[.68,1.45,.68]);crystal.userData.dynamic=true;root.userData.crystal=crystal;root.userData.crystalY=4.85;
 const halo=ring(root,1.55,color,.075);halo.material.opacity=.36;return root;
}
function base(team){
 const root=new T.Group(),color=team===0?BLUE:RED,stone=team===0?0x6a828d:0x7c737e;
 part(root,'cyl',0x344b58,[0,.25,0],[4.9,.5,4.9]);part(root,'cyl',stone,[0,.6,0],[4.05,.35,4.05]);part(root,'cyl',0x2e4855,[0,.84,0],[3.5,.22,3.5]);part(root,'cyl',0x8b9a95,[0,.96,0],[2.9,.18,2.9]);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,claw=new T.Group();claw.position.set(Math.sin(a)*2.8,0,Math.cos(a)*2.8);claw.rotation.y=a;root.add(claw);
  const stonepiece=part(claw,'rock',stone,[0,1.4,0],[.7,1.4,.85]);stonepiece.rotation.x=-.15;
  part(claw,'box',0xbcb38e,[0,1.65,-.73],[.22,1.2,.13]);const tip=part(claw,'cone',0x9daea7,[0,2.65,-.3],[.38,1.3,.45]);tip.rotation.x=.25;
 }
 mergeRigid(root,`base-${team}`);const crystal=gem(root,color,[0,3.7,0],[1.42,2.15,1.42]);root.userData={crystal,crystalY:3.7};ring(root,4.25,color,.09).material.opacity=.32;return root;
}
function minion(u){
 const root=new T.Group(),color=u.team===0?0x3d9db7:0xac4f63,armor=u.team===0?0x728e9b:0x887985;
 if(u.siege){part(root,'box',0x344955,[0,.7,0],[1.25,.6,1.65]);for(const x of [-.8,.8])for(const z of [-.65,.65]){const wheel=part(root,'cyl',0x293e4a,[x,.48,z],[.42,.2,.42]);wheel.rotation.z=Math.PI/2;}part(root,'rock',armor,[0,1.35,0],[1.15,.7,1.2]);const barrel=part(root,'cyl',color,[0,1.65,-.95],[.35,1.55,.35]);barrel.rotation.x=Math.PI/2;part(root,'rock',0xa3d5de,[0,1.9,0],[.35,.5,.35]);}
 else{for(const x of [-.28,.28])part(root,'box',0x304550,[x,.4,0],[.36,.7,.5]);part(root,'cyl',color,[0,1.14,0],[.6,.9,.43]);part(root,'rock',armor,[0,1.72,0],[.65,.54,.52]);part(root,'box',0xe7cbae,[0,1.73,-.42],[.39,.24,.15]);part(root,'box',0x283c49,[0,1.8,-.51],[.3,.045,.035]);const hood=part(root,'cone',color,[0,2.15,.1],[.48,.7,.45]);hood.rotation.x=.2;part(root,'rock',armor,[-.66,1.22,-.1],[.24,.46,.55]);const blade=part(root,'box',0xc5dce0,[.66,1.25,-.4],[.1,u.ranged?1.15:.75,.18]);blade.rotation.x=u.ranged?.1:-.3;}
 mergeRigid(root,`minion-${u.team}-${!!u.siege}-${!!u.ranged}`);return root;
}
function disposeObject(root){
 if(root.userData.heroModel){disposeHeroModel(root);}
 root.traverse(object=>{if(!object.isMesh)return;if(object.geometry?.userData?.owned)object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])if(material?.userData?.owned){if(material.map?.userData?.owned)material.map.dispose();material.dispose();}});
 root.removeFromParent();
}
let contactTexture;
function contactShadow(root,radius=1.5){
 if(!contactTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#071e28aa');g.addColorStop(.4,'#09222b80');g.addColorStop(1,'#0c253000');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);contactTexture=new T.CanvasTexture(c);}
 const material=new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,opacity:.72});material.userData.owned=true;
 const shadow=new T.Mesh(G.plane,material);shadow.rotation.x=-Math.PI/2;shadow.scale.set(radius*2,radius*1.6,1);shadow.position.y=.055;root.add(shadow);return shadow;
}
function monster(u){if(u?.boss)return dragon();const root=new T.Group();part(root,'oct',0x65776d,[0,1.7,0],[2,2.2,1.3]);part(root,'box',0x637c70,[0,3.3,-.05],[1.45,1.3,1.25]);for(const x of [-.44,.44])gem(root,0xb6ee8a,[x,3.4,-.72],[.13,.13,.08]);for(const x of [-2.2,2.2])part(root,'oct',0x748577,[x,1.9,0],[.8,1.5,.75]);for(const x of [-.9,.9])part(root,'box',0x54685e,[x,.6,0],[.85,1.2,.9]);gem(root,u?.camp==='blue'?0x77bdff:0xffa074,[0,2,-1.1],[.3,.6,.2]);mergeRigid(root,`monster-${u?.camp}`);return root;}
function dragon(){const root=new T.Group(),wings=[];part(root,'sphere',0x4f426a,[0,2.3,0],[2.3,1.6,3]);part(root,'cone',0x796591,[0,2,-4],[1.1,1.6,1.4]).rotation.x=-Math.PI/2;part(root,'box',0x68567b,[0,3,-2.7],[1.4,1.2,1.7]);for(const x of [-.8,.8]){gem(root,0xffcb79,[x,3.3,-3.1],[.16,.16,.2]);part(root,'cone',0xe3c593,[x,4,-2],[.22,1.8,.22]);}for(const x of [-1.5,1.5])for(const z of [-1.8,1.8]){part(root,'cyl',0x594567,[x,1,z],[.5,1.5,.6]);for(let i=-1;i<=1;i++)part(root,'cone',0xebd9b0,[x+i*.23,.35,z-.6],[.12,.7,.15]).rotation.x=-Math.PI/2;}for(const side of [-1,1]){const wing=new T.Group();wing.position.set(side*1.4,3,0);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,side*6,2,-1,side*4,0,3,0,0,0,side*4,0,3,0,-.3,2],3));g.computeVertexNormals();wing.add(new T.Mesh(g,new T.MeshStandardMaterial({color:0x856292,side:T.DoubleSide,roughness:.8})));const bone=part(wing,'cyl',0xc6a1ac,[side*3,1,-.5],[.12,6.5,.12]);bone.rotation.z=-side*1.25;root.add(wing);wings.push(wing);}for(let i=0;i<5;i++)part(root,'cone',0x756080,[0,1.8-i*.25,3+i*.7],[1-i*.15,1.5,1-i*.15]).rotation.x=Math.PI/2;for(const wing of wings)wing.traverse(m=>m.userData.dynamic=true);mergeRigid(root,'dragon-body');for(let i=0;i<wings.length;i++){wings[i].traverse(m=>m.userData.dynamic=false);mergeRigid(wings[i],`dragon-wing-${i}`);}root.userData.wings=wings;return root;}
function mergeStatic(root){
 root.updateMatrixWorld(true);const groups=new Map();const inverse=new T.Matrix4().copy(root.matrixWorld).invert();root.traverse(m=>{if(!m.isMesh||m.material.transparent||m.userData.dynamic)return;const key=m.material.uuid;if(!groups.has(key))groups.set(key,{material:m.material,meshes:[]});groups.get(key).meshes.push(m);});
 for(const group of groups.values()){if(group.meshes.length<2)continue;const data={position:[],normal:[],uv:[]};let count=0;for(const m of group.meshes){const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));count+=geometry.attributes.position.count;for(const name of Object.keys(data))data[name].push(geometry.attributes[name]?.array||new Float32Array(geometry.attributes.position.count*(name==='uv'?2:3)));m.parent.remove(m);geometry.dispose();}const geometry=new T.BufferGeometry();for(const name of Object.keys(data)){const size=name==='uv'?2:3,arr=new Float32Array(count*size);let offset=0;for(const a of data[name]){arr.set(a,offset);offset+=a.length;}geometry.setAttribute(name,new T.BufferAttribute(arr,size));}const mesh=new T.Mesh(geometry,group.material);geometry.userData.owned=true;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
}
function shrine(){
 const root=new T.Group(),trim=0xb5bda7;
 part(root,'cyl',0x435b62,[0,.25,0],[3.4,.5,3.4]);part(root,'cyl',0x8b9b92,[0,.6,0],[2.75,.3,2.75]);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const pillar=part(root,'box',trim,[Math.sin(a)*2.3,1.2,Math.cos(a)*2.3],[.4,1.6,.55],{metal:.25});pillar.rotation.y=a;gem(root,0xbce7e3,[Math.sin(a)*2.3,2.12,Math.cos(a)*2.3],[.2,.3,.2]);}
 mergeStatic(root);
 const core=gem(root,0xaee6dc,[0,2.5,0],[.8,1.15,.8]),halo=ring(root,1.4,0xc7f8e7,2.4);halo.rotation.x=-Math.PI/2+.35;
 const boundary=ring(root,5,0x93c7b5,.09);boundary.material.opacity=.25;
 const beam=new T.Mesh(new T.CylinderGeometry(.15,.5,7,12,1,true),new T.MeshBasicMaterial({color:0xb6f9e0,transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide}));beam.position.y=4.4;root.add(beam);
 const progress=new T.Mesh(new T.RingGeometry(.93,1,64),new T.MeshBasicMaterial({color:BLUE,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));progress.rotation.x=-Math.PI/2;progress.position.y=.16;progress.scale.setScalar(4.7);root.add(progress);
 root.userData={core,halo,boundary,beam,progress};return root;
}
function ward(team){
 const root=new T.Group(),color=team===0?0x8af8d5:RED;part(root,'cyl',0x657879,[0,.2,0],[.7,.4,.7]);part(root,'cyl',0xb4b08e,[0,1,0],[.16,1.5,.16],{metal:.5});
 for(const x of [-.4,.4]){const arm=part(root,'box',0xc4ba92,[x,1.75,0],[.15,.8,.2],{metal:.6});arm.rotation.z=x>0?-.5:.5;}
 const eye=gem(root,color,[0,2.15,0],[.42,.55,.42]);const life=ring(root,.85,color,.13);const pulse=ring(root,1.4,color,.1);pulse.material.opacity=.2;root.userData={eye,life,pulse};return root;
}
export class WorldView {
 constructor(canvas,overlay){
 this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 this.deviceRatio=window.devicePixelRatio||1;this.quality='auto';this.pixelRatio=Math.min(this.deviceRatio,1.15);this.renderer.setPixelRatio(this.pixelRatio);
 this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
 this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.04;
 this.stats={fps:60,smoothedFPS:60,pixelRatio:this.pixelRatio,quality:'auto',qualityLabel:'自动',drawCalls:0,triangles:0};this.qualityTimer=0;
 this.scene=new T.Scene();this.scene.background=new T.Color(0x11232f);this.scene.fog=new T.Fog(0x6a9290,72,155);this.camera=new T.PerspectiveCamera(42,1,.1,230);
 this.scene.add(new T.HemisphereLight(0xbbe0ee,0x354b36,1.65));const sun=new T.DirectionalLight(0xffe9c4,2.5);sun.position.set(-35,65,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;sun.shadow.camera.far=155;sun.shadow.bias=-.0005;sun.shadow.normalBias=.05;this.scene.add(sun);this.scene.add(sun.target);this.sun=sun;
 this.map=new T.Group();this.scene.add(this.map);this.lobby=new T.Group();this.scene.add(this.lobby);this.models=new Map();this.projectiles=new Map();this.fx=new Map();this.meteors=new Map();this.floaters=[];this.mode='lobby';this.target=new T.Vector3();this.desiredTarget=new T.Vector3();this.ray=new T.Raycaster();this.floor=new T.Plane(new T.Vector3(0,1,0),0);this.vec=new T.Vector3();this.pointerNdc=new T.Vector2();this.pointA=new T.Vector3();this.pointB=new T.Vector3();this.simulationPositions=new Map();this.viewFrustum=new T.Frustum();this.viewMatrix=new T.Matrix4();this.boundSphere=new T.Sphere(new T.Vector3(),4);this.contactTransform=new T.Object3D();
 this.buildMap();this.buildDetails();this.buildBrushes();this.mergeMapRegions();this.buildTactics();this.buildLobby();
 const contact=contactShadow(new T.Group(),1);this.contactBatch=new T.InstancedMesh(G.plane,contact.material,256);this.contactBatch.instanceMatrix.setUsage(T.DynamicDrawUsage);this.contactBatch.frustumCulled=false;this.contactBatch.count=0;this.map.add(this.contactBatch);
 this.resize();this.renderer.shadowMap.needsUpdate=true;
 }
 setQuality(value='auto'){
 this.quality=['auto','smooth','high'].includes(value)?value:'auto';this.pixelRatio=Math.min(this.deviceRatio,this.quality==='smooth'?.9:this.quality==='high'?1.5:1.15);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.shadowMap.enabled=this.quality==='high';this.renderer.shadowMap.needsUpdate=true;this.qualityTimer=0;this.stats.quality=this.quality;this.stats.qualityLabel={auto:'自动',smooth:'流畅',high:'高清'}[this.quality];this.stats.pixelRatio=this.pixelRatio;
 }
 samplePerformance(dt){
 if(dt<=0||dt>.3)return;const instantaneous=Math.min(144,1/Math.max(.004,dt));this.stats.fps+=(instantaneous-this.stats.fps)*(1-Math.exp(-dt*1.8));this.stats.smoothedFPS=this.stats.fps;this.qualityTimer+=dt;
 if(this.quality==='auto'&&this.qualityTimer>2.5){this.qualityTimer=0;let ratio=this.pixelRatio;if(this.stats.fps<43)ratio=Math.max(Math.min(.85,this.deviceRatio),ratio-.1);else if(this.stats.fps>57)ratio=Math.min(this.deviceRatio,1.25,ratio+.05);if(Math.abs(ratio-this.pixelRatio)>.02){this.pixelRatio=ratio;this.renderer.setPixelRatio(ratio);this.stats.pixelRatio=ratio;}}
 this.stats.drawCalls=this.renderer.info.render.calls;this.stats.triangles=this.renderer.info.render.triangles;
 }
 captureSimulation(){
 if(!this.arena)return;const tick=this.arena.time;if(this.lastCapturedTick===tick)return;this.lastCapturedTick=tick;
 for(const u of this.arena.units){let s=this.simulationPositions.get(u.id);if(!s){s={px:u.x,pz:u.z,x:u.x,z:u.z,tick};this.simulationPositions.set(u.id,s);}else{s.px=s.x;s.pz=s.z;s.x=u.x;s.z=u.z;s.tick=tick;if(Math.hypot(s.x-s.px,s.z-s.pz)>6){s.px=s.x;s.pz=s.z;}}}
 for(const [id,s] of this.simulationPositions)if(s.tick!==tick)this.simulationPositions.delete(id);
 }
 buildMap(){
 const groundMaterial=new T.MeshStandardMaterial({roughness:1});
 this.cliffMaterial=new T.MeshStandardMaterial({color:0xa2b5a7,roughness:1});
 const groundTexture=createTerrainTexture((texture,image)=>{groundMaterial.map=texture;groundMaterial.needsUpdate=true;if(image){const crop=document.createElement('canvas');crop.width=crop.height=512;crop.getContext('2d').drawImage(image,0,image.height/2,image.width/2,image.height/2,0,0,512,512);const t=new T.CanvasTexture(crop);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;this.cliffMaterial.map=t;this.cliffMaterial.needsUpdate=true;}this.renderer.shadowMap.needsUpdate=true;});groundMaterial.map=groundTexture;
 const ground=new T.Mesh(new T.PlaneGeometry(128,128),groundMaterial);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.userData.keepSeparate=true;this.map.add(ground);
 let seed=987;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const tree=(x,z,size=1)=>{
  const root=new T.Group();root.position.set(x,0,z);root.rotation.y=rand()*6.28;root.scale.setScalar(size);
  const trunk=part(root,'cyl',0x3d4b42,[0,1.5,0],[.36,3,.43],{shadow:true});trunk.rotation.z=.1;
  for(let j=0;j<3;j++){const a=j*2.1;const branch=part(root,'cyl',0x52634b,[Math.cos(a)*.4,2.8,Math.sin(a)*.4],[.16,1.9,.2]);branch.rotation.z=Math.cos(a)*.5;branch.rotation.x=Math.sin(a)*.5;const rootlet=part(root,'rock',0x3c5047,[Math.cos(a)*.6,.28,Math.sin(a)*.6],[1.1,.33,.45]);rootlet.rotation.y=-a;}
  for(let j=0;j<6;j++){const a=j*2.4,r=j===5?0:1.2;const leaf=part(root,'leaf',[0x244a43,0x2b5c48,0x386f50,0x527e52][j%4],[Math.cos(a)*r,3.8+(j%3)*.55,Math.sin(a)*r],[1.7+(j%2)*.25,1.15,1.6],{shadow:true});leaf.rotation.y=a;leaf.rotation.z=(rand()-.5)*.3;}
  const crown=part(root,'leaf',0x65875a,[-.5,5.35,-.1],[1.5,.7,1.3],{shadow:true});crown.rotation.y=.6;this.map.add(root);
 };
 // Each jungle island is bounded by the exact gameplay collider. Its mossy
 // wall and leaning trees leave every route at the original width.
 for(const b of BLOCKERS){
  const cliff=new T.Group();cliff.position.set(b.x,0,b.z);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=b.r*.55,h=1.5+rand()*1.1;const rock=new T.Mesh(G.rock,this.cliffMaterial);rock.position.set(Math.cos(a)*r,h*.6,Math.sin(a)*r);rock.scale.set(2,h,1.7);rock.rotation.set(.1,rand()*3,.12);rock.castShadow=rock.receiveShadow=true;rock.userData.preserveMaterial=true;cliff.add(rock);const moss=part(cliff,'leaf',0x49664a,[Math.cos(a)*r,h*1.12,Math.sin(a)*r],[1.6,.28,1.3]);moss.rotation.y=a;}
  this.map.add(cliff);
  for(let i=0;i<3;i++){const a=i*2.1+rand()*.5,r=1.1;tree(b.x+Math.cos(a)*r,b.z+Math.sin(a)*r,.85+rand()*.18);}
 }
 for(let i=0;i<48;i++){const side=i%4,t=-59+Math.floor(i/4)*10.5;tree(side<2?(side===0?-62:62):t,side>=2?(side===2?-62:62):t,.85+rand()*.22);}
 // Small bank rocks are low enough to read as water edges, never blockers.
 for(let i=0;i<32;i++){const t=-57+i*3.65;if(Math.abs(t)<7||Math.abs(t-50)<8||Math.abs(t+50)<8)continue;const n=Math.sin(t*.074);for(const side of [-1,1]){const rock=part(this.map,'rock',i%2?0x5e7c72:0x6f8977,[t+n+side*3.5,.28,t-n-side*3.5],[.7,.42,1.15]);rock.rotation.y=-.75;}}
 for(let i=0;i<45;i++){const x=rand()*104-52,z=rand()*104-52;if(Math.abs(x-z)<8||Math.abs(x+z)<8||Math.abs(x)>44||Math.abs(z)>44)continue;const cluster=new T.Group();cluster.position.set(x,0,z);for(let k=0;k<4;k++){const fern=part(cluster,'leaf',k%2?0x6d894e:0x416c48,[(k%2)*.32,.2,Math.floor(k/2)*.25],[.44,.09,.17]);fern.rotation.y=k*1.7;}this.map.add(cluster);}
 }
 buildDetails(){
 const river=new T.Mesh(createRiverGeometry(),new T.MeshStandardMaterial({color:0x5bc9cc,transparent:true,opacity:.16,roughness:.38,metalness:.15,depthWrite:false}));river.userData.keepSeparate=true;this.map.add(river);
 // Bridges sit only on lane crossings and retain exactly the same routes.
 for(const t of [-50,0,50]){const bridge=new T.Group();bridge.position.set(t,.10,t);bridge.rotation.y=-Math.PI/4;
  for(let i=-3;i<=3;i++){const tile=part(bridge,'box',i%2?0x84938d:0x71868a,[0,.05,i*1.1],[8.2,.25,1.0]);tile.rotation.y=i%2?.012:-.012;}
  for(const x of [-4.3,4.3])for(const z of [-3.7,3.7]){part(bridge,'rock',0x516d77,[x,.35,z],[.48,.65,.48]);part(bridge,'cyl',0xb6b596,[x,.8,z],[.32,.12,.32]);}this.map.add(bridge);
 }
 for(const [x,z,c] of [[-25,-22,0x82baff],[25,22,0xffa175],[-33,24,0xffa175],[33,-24,0x82baff],[19,19,0xc6a2ed]]){
  const site=new T.Group();site.position.set(x,.03,z);ring(site,x===19?6.2:4.0,c,.02).material.opacity=.14;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const stone=part(site,'rock',0x647f77,[Math.cos(a)*4.4,.33,Math.sin(a)*4.4],[.55,.55,.8]);stone.rotation.y=-a;}
  this.map.add(site);
 }
 }
 mergeMapRegions(){
 const regions=new Map();for(const child of [...this.map.children]){if(child.userData.keepSeparate)continue;const key=`${Math.floor((child.position.x+64)/32)},${Math.floor((child.position.z+64)/32)}`;let region=regions.get(key);if(!region){region=new T.Group();regions.set(key,region);}region.add(child);}
 for(const region of regions.values()){this.map.add(region);mergeStatic(region);region.traverse(m=>{if(m.isMesh&&m.material===this.cliffMaterial)m.userData.preserveMaterial=true;});mergeRigid(region);region.updateMatrixWorld(true);region.traverse(o=>{if(o.isMesh&&!o.material.transparent)o.castShadow=true;o.updateMatrix();o.matrixAutoUpdate=false;});}
 this.staticRegions=regions;
 }
 buildBrushes(){
 let seed=2143;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(const b of Battle.BRUSHES||[]){
  const patch=new T.Group();patch.position.set(b.x,0,b.z);const soil=new T.Mesh(new T.CircleGeometry(b.r,24),mat(0x395c4c));soil.rotation.x=-Math.PI/2;soil.position.y=.065;soil.receiveShadow=true;patch.add(soil);
  for(let i=0;i<Math.round(b.r*12);i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*b.r,h=.75+rand()*.7,x=Math.cos(a)*r,z=Math.sin(a)*r;const reed=part(patch,'cone',i%3?0x6d955d:0x9ea965,[x,h/2,z],[.16,h,.18],{shadow:false});reed.rotation.z=(rand()-.5)*.4;if(i%4===0){const stalk=part(patch,'cyl',0xabb680,[x,h+.1,z],[.045,.6,.045],{shadow:false});part(patch,'cyl',0xb3b47a,[x,h+.45,z],[.085,.25,.085],{shadow:false});}}
  this.map.add(patch);
 }
 }
 buildTactics(){
 this.zoom=1;this.wardModels=new Map();this.impacts=[];this.lastFogAt=-1;this.focusTarget=null;
 this.shrine=shrine();this.shrine.position.set(-19,0,-19);this.shrine.userData.core.material=this.shrine.userData.core.material.clone();this.map.add(this.shrine);
 this.rangeMarker=ring(this.map,5,0xc6f7ed,.18);this.rangeMarker.geometry=new T.RingGeometry(.988,1,80);this.rangeMarker.material.opacity=.24;
 this.focusMarker=ring(this.map,2.1,0xffddad,.21);this.focusMarker.visible=false;
 this.moveMarker=new T.Group();ring(this.moveMarker,.8,0xa9f9d3,.22);ring(this.moveMarker,1.2,0xa9f9d3,.17).material.opacity=.3;const arrow=part(this.moveMarker,'cone',0xcdffde,[0,1,0],[.25,.6,.25],{emissive:0x70e6bd,shadow:false});arrow.rotation.z=Math.PI;this.map.add(this.moveMarker);this.moveMarker.visible=false;
 this.fogCanvas=document.createElement('canvas');this.fogCanvas.width=this.fogCanvas.height=256;this.fogContext=this.fogCanvas.getContext('2d');this.exploredCanvas=document.createElement('canvas');this.exploredCanvas.width=this.exploredCanvas.height=256;this.exploredContext=this.exploredCanvas.getContext('2d');
 this.fogTexture=new T.CanvasTexture(this.fogCanvas);this.fogTexture.minFilter=T.LinearFilter;this.fogTexture.magFilter=T.LinearFilter;this.fogTexture.generateMipmaps=false;
 this.fogPlane=new T.Mesh(new T.PlaneGeometry(128,128),new T.MeshBasicMaterial({map:this.fogTexture,transparent:true,depthWrite:false,toneMapped:false}));this.fogPlane.rotation.x=-Math.PI/2;this.fogPlane.position.y=.28;this.fogPlane.renderOrder=2;this.map.add(this.fogPlane);
 const positions=new Float32Array(64*3),seeds=[];for(let i=0;i<64;i++){const t=((i*17)%97)/97,a=i*2.399963;seeds.push({x:-43+t*86+Math.cos(a)*4,z:-43+t*86+Math.sin(a)*4,phase:a});}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));this.ambient=new T.Points(geo,new T.PointsMaterial({color:0xcdfade,size:.18,transparent:true,opacity:.5,depthWrite:false}));this.ambient.frustumCulled=false;this.ambient.userData.seeds=seeds;this.map.add(this.ambient);
 }
 setZoom(value){this.zoom=Math.max(.85,Math.min(1.25,Number(value)||1));}
 canSeeUnit(u){return !!u&&(u.team===0||!this.arena?.canSee||this.arena.canSee(0,u));}
 pointVisible(x,z){return !this.arena?.isPointVisible||this.arena.isPointVisible(0,x,z);}
 updateFog(){
 const a=this.arena;this.fogPlane.visible=a.options?.fog!==false;if(!this.fogPlane.visible)return;if(a.time-this.lastFogAt<.25&&this.lastFogAt>=0)return;this.lastFogAt=a.time;
 const sources=a.getVisionSources?a.getVisionSources(0):[{x:a.player.x,z:a.player.z,r:18}],ctx=this.fogContext,explored=this.exploredContext;
 for(const s of sources){explored.fillStyle='#fff';explored.beginPath();explored.arc((s.x+64)*2,(s.z+64)*2,Math.max(0,s.r*2),0,Math.PI*2);explored.fill();}
 ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,256,256);ctx.fillStyle='rgba(8,18,31,.68)';ctx.fillRect(0,0,256,256);ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.3;ctx.drawImage(this.exploredCanvas,0,0);ctx.globalAlpha=1;
 for(const s of sources){const x=(s.x+64)*2,z=(s.z+64)*2,r=s.r*2;if(r<=0)continue;const fade=ctx.createRadialGradient(x,z,r*.78,x,z,r);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=fade;ctx.beginPath();ctx.arc(x,z,r,0,Math.PI*2);ctx.fill();}
 ctx.globalCompositeOperation='source-over';this.fogTexture.needsUpdate=true;
 }
 updateTactics(time){
 const a=this.arena,p=a.player,r=a.relic;this.updateFog();
 this.rangeMarker.visible=p.alive&&(this.models.get(p.id)?.userData.attack>0||this.focusTarget?.until>a.time);this.rangeMarker.position.set(p.x,.18,p.z);this.rangeMarker.scale.setScalar(p.range||5);this.rangeMarker.material.opacity=.23;
 this.moveMarker.visible=p.alive&&!!p.moveGoal;if(p.moveGoal){this.moveMarker.position.set(p.moveGoal.x,.1,p.moveGoal.z);this.moveMarker.rotation.y=time;this.moveMarker.children[2].position.y=.95+Math.sin(time*5)*.12;}
 const focus=this.focusTarget&&a.byId(this.focusTarget.id);this.focusMarker.visible=!!(focus?.alive&&a.time<this.focusTarget.until&&this.canSeeUnit(focus));if(this.focusMarker.visible){this.focusMarker.position.set(focus.x,.21,focus.z);this.focusMarker.scale.setScalar((focus.radius||1.2)+.6);this.focusMarker.material.opacity=.55+Math.sin(time*8)*.15;}
 this.shrine.visible=!!r;if(r){const ud=this.shrine.userData,c=r.owner===0?BLUE:r.owner===1?RED:0xb8edd7;this.shrine.position.set(r.x,0,r.z);ud.core.rotation.y=time*.55;ud.core.position.y=2.5+Math.sin(time*1.8)*.15;ud.core.material.color.set(c);ud.core.material.emissive.set(c);ud.core.material.emissiveIntensity=r.active?.8:.15;ud.halo.rotation.z=time*.3;ud.halo.material.color.set(c);ud.halo.material.opacity=r.active?.7:.22;ud.beam.visible=!!r.active;ud.beam.material.color.set(c);ud.beam.material.opacity=.1+Math.sin(time*2)*.025;ud.boundary.material.color.set(c);const progress=Math.max(...(r.progress||[0,0]));ud.progress.visible=r.active&&r.owner<0&&progress>0;if(ud.progress.visible){ud.progress.material.color.set(r.progress[0]>=r.progress[1]?BLUE:RED);ud.progress.geometry.setDrawRange(0,Math.floor(Math.min(1,progress/5)*64)*6);}}
 const wardIds=new Set();for(const w of a.wards||[]){wardIds.add(w.id);let m=this.wardModels.get(w.id);if(!m){m=ward(w.team);this.wardModels.set(w.id,m);this.map.add(m);}m.position.set(w.x,0,w.z);m.visible=w.until>a.time&&(w.team===0||this.pointVisible(w.x,w.z));m.userData.eye.rotation.y=time;m.userData.eye.position.y=2.15+Math.sin(time*3+w.id)*.09;m.userData.life.material.opacity=.18+.6*Math.min(1,(w.until-a.time)/45);const pulse=(time*.5+w.id*.13)%1;m.userData.pulse.scale.setScalar(.75+pulse);m.userData.pulse.material.opacity=(1-pulse)*.3;}
 for(const [id,m] of this.wardModels)if(!wardIds.has(id)){disposeObject(m);this.wardModels.delete(id);}
 const positions=this.ambient.geometry.attributes.position;for(let i=0;i<64;i++){const s=this.ambient.userData.seeds[i];positions.setXYZ(i,s.x+Math.sin(time*.35+s.phase)*.8,.7+Math.sin(time*.5+s.phase)*.45,s.z+Math.cos(time*.3+s.phase)*.5);}positions.needsUpdate=true;
 }
 buildLobby(){part(this.lobby,'cyl',0x253844,[0,-.28,0],[4.5,.55,4.5]);part(this.lobby,'cyl',0x4d646b,[0,.01,0],[3.7,.16,3.7],{metal:.5});ring(this.lobby,3.5,0x9cdbe6,.12);ring(this.lobby,4.2,0xb5a783,.05);for(let i=0;i<8;i++){const a=i*Math.PI/4;const r=part(this.lobby,'box',0xaeb4a2,[Math.cos(a)*3.6,.16,Math.sin(a)*3.6],[.17,.08,.65]);r.rotation.y=-a;}
 const backdrop=new T.Group();backdrop.position.z=-5;for(let i=0;i<5;i++){const x=(i-2)*2.4;const p=part(backdrop,'box',0x22343f,[x,2.5,0],[1,5+Math.abs(i-2)*.8,1]);p.rotation.y=.4;}this.lobby.add(backdrop);this.setHero('blade');}
 setHero(kind,palette=this.palette){this.palette=palette;if(this.heroModel)disposeObject(this.heroModel);this.heroModel=createHeroModel(kind,0,false,palette);this.heroModel.userData.heroModel=true;this.heroModel.scale.setScalar(1.3);this.heroModel.rotation.y=Math.PI+.3;contactShadow(this.heroModel,1.4);this.lobby.add(this.heroModel);}
 resize(){this.width=window.innerWidth;this.height=window.innerHeight;this.renderer.setSize(this.width,this.height,false);const overlayRatio=Math.min(window.devicePixelRatio||1,1.5);this.overlay.width=Math.round(this.width*overlayRatio);this.overlay.height=Math.round(this.height*overlayRatio);this.ctx.setTransform(overlayRatio,0,0,overlayRatio,0,0);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();}
 start(arena){
 this.mode='game';this.arena=arena;this.map.visible=true;this.lobby.visible=false;this.scene.fog.color.set(0x6a9290);this.scene.background.set(0x517a76);
 for(const collection of [this.models,this.projectiles,this.fx,this.meteors,this.wardModels]){for(const m of collection.values())disposeObject(m);collection.clear();}
 this.floaters=[];this.impacts=[];this.focusTarget=null;this.simulationPositions.clear();this.lastCapturedTick=-1;this.captureSimulation();this.exploredContext.clearRect(0,0,256,256);this.lastFogAt=-1;this.target.set(arena.player.x,0,arena.player.z);this.updateFog();this.renderer.shadowMap.needsUpdate=true;
 }
 showLobby(kind){this.mode='lobby';this.map.visible=false;this.lobby.visible=true;this.scene.background.set(0x0b1924);this.scene.fog.color.set(0x0b1924);this.setHero(kind);}
 point(x,y){this.pointerNdc.set(x/this.width*2-1,1-y/this.height*2);this.ray.setFromCamera(this.pointerNdc,this.camera);return this.ray.ray.intersectPlane(this.floor,this.pointA)?{x:this.pointA.x,z:this.pointA.z}:null;}
 screenVector(dx,dy){
 if(!dx&&!dy)return {x:0,z:0};this.camera.updateMatrixWorld();this.pointerNdc.set(0,0);this.ray.setFromCamera(this.pointerNdc,this.camera);if(!this.ray.ray.intersectPlane(this.floor,this.pointA))return {x:dx,z:dy};
 this.pointerNdc.set(dx/this.width*2,-dy/this.height*2);this.ray.setFromCamera(this.pointerNdc,this.camera);if(!this.ray.ray.intersectPlane(this.floor,this.pointB))return {x:dx,z:dy};const x=this.pointB.x-this.pointA.x,z=this.pointB.z-this.pointA.z,n=Math.hypot(x,z)||1;return {x:x/n,z:z/n};
 }
 aimVector(dx,dy){return this.screenVector(dx,dy);}
 project(x,y,z){this.vec.set(x,y,z).project(this.camera);return {x:(this.vec.x+1)*this.width/2,y:(1-this.vec.y)*this.height/2,visible:this.vec.z<1&&this.vec.z>-1&&Math.abs(this.vec.x)<1.25&&Math.abs(this.vec.y)<1.25};}
 events(events){for(const e of events){
 if(e.type==='hit'&&e.amount>0){const u=this.arena.byId(e.id);if(u&&this.canSeeUnit(u)){this.floaters.push({id:u.id,x:u.x,z:u.z,y:u.type==='hero'?5:3,text:e.amount,color:e.spell?'#c9abff':e.source===this.arena.player.id?'#ffe5a0':'#fff3e7',life:.8,maxLife:.8});if(this.impacts.length<24)this.impacts.push({id:u.id,x:u.x,z:u.z,y:u.type==='hero'?2:1.5,color:e.spell?'#d3bdff':'#fff0bd',life:.22,maxLife:.22,seed:e.id*.9});}}
 if(e.type==='attack'||e.type==='cast'){const u=this.arena.byId(e.id),m=this.models.get(e.id);if(m&&this.canSeeUnit(u))m.userData.attack=.3;if(e.type==='attack'&&e.id===this.arena.player.id)this.focusTarget={id:e.target,until:this.arena.time+.85};}
 }}
 draw(dt,time,aim=null,alpha=1){
 const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);this.samplePerformance(dt);
 if(this.mode==='lobby'){
  this.map.visible=false;this.lobby.visible=true;this.camera.position.set(4.5,7.15,16.8);this.camera.lookAt(0,3.05,0);this.camera.setViewOffset(this.width,this.height,-this.width*.09,0,this.width,this.height);
  this.heroModel.rotation.y=Math.PI+.3+Math.sin(time*.23)*.15;animateHeroModel(this.heroModel,{dt,time,lobby:true});this.renderer.render(this.scene,this.camera);return;
 }
 this.camera.clearViewOffset();const a=this.arena,p=a.player;this.captureSimulation();alpha=Math.max(0,Math.min(1,alpha));const playerState=this.simulationPositions.get(p.id),playerX=playerState?playerState.px+(playerState.x-playerState.px)*alpha:p.x,playerZ=playerState?playerState.pz+(playerState.z-playerState.pz)*alpha:p.z;
 this.desiredTarget.set(playerX,0,playerZ);if(this.target.distanceToSquared(this.desiredTarget)>64)this.target.copy(this.desiredTarget);else if(dt>0)this.target.lerp(this.desiredTarget,1-Math.exp(-dt*30));
 this.camera.position.set(this.target.x,33*this.zoom,this.target.z+26*this.zoom);this.camera.lookAt(this.target.x,0,this.target.z-1.7);this.camera.updateMatrixWorld();this.viewMatrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.viewFrustum.setFromProjectionMatrix(this.viewMatrix);
 const existing=this.existingIds||(this.existingIds=new Set()),visible=this.visibleIds||(this.visibleIds=new Set());existing.clear();visible.clear();let contactCount=0;
 for(const u of a.units){
  existing.add(u.id);let m=this.models.get(u.id);const state=this.simulationPositions.get(u.id),x=state?state.px+(state.x-state.px)*alpha:u.x,z=state?state.pz+(state.z-state.pz)*alpha:u.z;
  this.boundSphere.center.set(x,u.type==='tower'?3.5:2,z);this.boundSphere.radius=u.type==='base'?7:u.boss?8:u.type==='tower'?5:u.type==='hero'?4:2.5;
  const inView=this.canSeeUnit(u)&&this.viewFrustum.intersectsSphere(this.boundSphere)&&(u.alive||(u.deadAt!==undefined&&a.time-u.deadAt<.6));
  if(!inView){if(m)m.visible=false;continue;}
  visible.add(u.id);
  if(!m){
   m=u.type==='hero'?createHeroModel(u.kind,u.team,false,u.isPlayer?this.palette:null):u.type==='tower'?tower(u.team):u.type==='base'?base(u.team):u.type==='monster'?monster(u):minion(u);
   if(u.type==='hero')m.userData.heroModel=true;if(u.face)m.rotation.y=Math.atan2(-u.face.x,-u.face.z);
   m.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});
   if(u.isPlayer){m.userData.selection=ring(m,1.55,0xc7ebe5,.11);m.userData.selection.material.opacity=.5;}
   this.models.set(u.id,m);this.map.add(m);
  }
  m.position.set(x,0,z);m.visible=true;
  if(!u.alive){m.scale.y=Math.max(.05,1-(a.time-u.deadAt)*2);continue;}m.scale.y=1;
  const ud=m.userData;
  if(u.type==='hero'){
   const moveSpeed=state&&dt>0?Math.min(18,Math.hypot(state.x-state.px,state.z-state.pz)*60):u.speed||9;
   animateHeroModel(m,{dt,time,moving:!!u.moving,speed:moveSpeed||u.speed||9,face:ud.attack>0&&u.attackFace?u.attackFace:u.face,shield:u.shield,stealth:u.stealthUntil>a.time});
  }else if(u.face){const angle=Math.atan2(-u.face.x,-u.face.z),difference=Math.atan2(Math.sin(angle-m.rotation.y),Math.cos(angle-m.rotation.y));m.rotation.y+=difference*(1-Math.exp(-dt*18));}
  if(ud.wings)for(let i=0;i<ud.wings.length;i++)ud.wings[i].rotation.z=Math.sin(time*2)*.2*(i?1:-1);
  if(ud.crystal){ud.crystal.rotation.y=time*.7;ud.crystal.position.y=ud.crystalY+Math.sin(time*2+u.id)*.13;}
  if(contactCount<256){const radius=u.type==='hero'?1.5:u.type==='base'?4.4:u.type==='tower'?2.0:u.boss?4:u.type==='monster'?2.2:u.siege?1.3:.85;this.contactTransform.position.set(x,.065,z);this.contactTransform.rotation.set(-Math.PI/2,0,0);this.contactTransform.scale.set(radius*2,radius*1.7,1);this.contactTransform.updateMatrix();this.contactBatch.setMatrixAt(contactCount++,this.contactTransform.matrix);}
 }
 this.contactBatch.count=contactCount;this.contactBatch.instanceMatrix.needsUpdate=true;
 for(const [id,m] of this.models)if(!existing.has(id)){disposeObject(m);this.models.delete(id);}
 const shotIds=this.shotIds||(this.shotIds=new Set());shotIds.clear();for(const s of a.shots){shotIds.add(s.id);let m=this.projectiles.get(s.id);if(!m){m=new T.Group();const color=s.team===0?(s.kind==='star'?0xc6abff:BLUE):RED;gem(m,color,[0,0,0],[s.kind==='tower'?.35:.17,.2,s.kind==='arrow'?.85:.5]);const trail=part(m,'cone',color,[0,0,.7],[.17,1.4,.17],{emissive:color,shadow:false});trail.rotation.x=Math.PI/2;mergeRigid(m,`shot-${s.team}-${s.kind}`);this.map.add(m);this.projectiles.set(s.id,m);}m.position.set(s.x,2.3,s.z);m.visible=this.pointVisible(s.x,s.z);m.rotation.y=Math.atan2(-s.dir.x,-s.dir.z);}
 for(const [id,m] of this.projectiles)if(!shotIds.has(id)){disposeObject(m);this.projectiles.delete(id);}
 const fxIds=this.fxIds||(this.fxIds=new Set());fxIds.clear();for(const e of a.effects){fxIds.add(e.id);let m=this.fx.get(e.id);if(!m){m=ring(this.map,e.radius,e.kind==='heal'?0xa3ff9c:e.team===0?0x9eeeff:0xff8792,.3);this.fx.set(e.id,m);}m.position.set(e.x,.3,e.z);const progress=1-e.life/e.maxLife;m.scale.setScalar(e.radius*(e.kind==='meteor'?1:.4+progress*.8));m.material.opacity=(1-progress)*.8;if(e.kind==='meteor'){m.material.opacity=.5+Math.sin(time*15)*.2;let meteor=this.meteors.get(e.id);if(!meteor){meteor=new T.Group();gem(meteor,0xc6b2ff,[0,0,0],[1.2,2.3,1.2]);const tail=part(meteor,'cone',0x9dbfff,[0,3,0],[1,6,1],{emissive:0x9dbfff,shadow:false});mergeRigid(meteor,'meteor');this.map.add(meteor);this.meteors.set(e.id,meteor);}meteor.position.set(e.x,Math.max(.5,20*(1-progress*e.maxLife/.65)),e.z);meteor.rotation.y=time*2;meteor.visible=!e.fired;}}
 for(const [id,m] of this.fx)if(!fxIds.has(id)){disposeObject(m);this.fx.delete(id);}
 for(const [id,m] of this.meteors)if(!fxIds.has(id)){disposeObject(m);this.meteors.delete(id);}this.updateTactics(time);this.renderer.render(this.scene,this.camera);
 if(aim&&p.alive){const end=this.project(p.x+aim.x*12,.2,p.z+aim.z*12),start=this.project(p.x,.2,p.z);ctx.strokeStyle='#c1faff';ctx.fillStyle='#b7f6ff22';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(end.x,end.y,33,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
 for(const u of a.units){if(!u.alive||!visible.has(u.id))continue;const rendered=this.models.get(u.id)?.position;const q=this.project(rendered?.x??u.x,u.type==='tower'?7.2:u.type==='base'?7:u.type==='hero'?5.5:u.type==='monster'?5:2.8,rendered?.z??u.z);if(!q.visible)continue;const w=u.type==='hero'?58:u.type==='minion'?27:65,h=u.type==='hero'?6:4;ctx.fillStyle='#10242ddd';ctx.fillRect(q.x-w/2-1,q.y-1,w+2,h+2);ctx.fillStyle=u.team===0?'#6be0d4':u.team===1?'#f37387':'#e0c07f';ctx.fillRect(q.x-w/2,q.y,w*u.health/u.maxHealth,h);if(u.shield>0){ctx.fillStyle='#e9ffff';ctx.fillRect(q.x-w/2,q.y,w*Math.min(1,u.shield/u.maxHealth),2);}if(u.boss){ctx.font='600 11px BattleNoto, sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1d9a8';ctx.fillText('远古龙王',q.x,q.y-7);}if(u.type==='hero'){ctx.fillStyle='#589fed';ctx.fillRect(q.x-w/2,q.y+h+2,w*u.mana/u.maxMana,2);ctx.font='600 10px BattleNoto, sans-serif';ctx.textAlign='center';ctx.fillStyle=u.isPlayer?'#ffedb9':'#f1f6f4';ctx.shadowColor='#10232b';ctx.shadowBlur=3;ctx.fillText(`${u.isPlayer?'你':u.name} · ${u.level}${u.stunUntil>a.time?' 晕':''}`,q.x,q.y-5);ctx.shadowBlur=0;}}
 for(const f of this.floaters){f.life-=dt;if(!this.canSeeUnit(a.byId(f.id)))continue;const q=this.project(f.x,f.y+(1-f.life/f.maxLife)*3,f.z);ctx.globalAlpha=Math.max(0,f.life/f.maxLife);ctx.font='bold 17px sans-serif';ctx.fillStyle=f.color;ctx.strokeStyle='#152834';ctx.lineWidth=2;ctx.textAlign='center';ctx.strokeText(f.text,q.x,q.y);ctx.fillText(f.text,q.x,q.y);}ctx.globalAlpha=1;this.floaters=this.floaters.filter(f=>f.life>0);
 for(const hit of this.impacts){hit.life-=dt;if(hit.life<=0||!this.canSeeUnit(a.byId(hit.id)))continue;const q=this.project(hit.x,hit.y,hit.z);if(!q.visible)continue;const t=1-hit.life/hit.maxLife;ctx.strokeStyle=hit.color;ctx.lineWidth=2;ctx.globalAlpha=1-t;for(let i=0;i<5;i++){const angle=i*Math.PI*2/5+hit.seed,r=5+t*17;ctx.beginPath();ctx.moveTo(q.x+Math.cos(angle)*r,q.y+Math.sin(angle)*r*.6);ctx.lineTo(q.x+Math.cos(angle)*(r+5),q.y+Math.sin(angle)*(r+5)*.6);ctx.stroke();}}this.impacts=this.impacts.filter(h=>h.life>0);ctx.globalAlpha=1;
 const relic=a.relic;if(relic&&this.pointVisible(relic.x,relic.z)){const q=this.project(relic.x,5,relic.z);if(q.visible){ctx.textAlign='center';ctx.font='600 11px BattleNoto, sans-serif';ctx.fillStyle=relic.owner===0?'#a1f2ff':relic.owner===1?'#ffa4b5':'#e0f1ce';ctx.shadowBlur=3;ctx.shadowColor='#17303b';const label=!relic.active?'圣坛 · '+Math.max(0,Math.ceil(relic.spawnAt-a.time))+' 秒':relic.owner<0?'圣坛 · 站入圆环占领':(relic.owner===0?'我方圣坛':'敌方圣坛')+' · '+Math.max(0,Math.ceil(relic.until-a.time))+' 秒';ctx.fillText(label,q.x,q.y);ctx.shadowBlur=0;}}
 if(p.recall>0){const q=this.project(p.x,0,p.z);ctx.strokeStyle='#85e7ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(q.x,q.y,35,17,0,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p.recall/3.2));ctx.stroke();}
 }
}
