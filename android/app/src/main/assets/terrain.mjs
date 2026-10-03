import * as T from './vendor/three.module.min.js';
import {LANES,BASES,BLOCKERS,BRUSHES} from './engine.mjs';

// One baked canvas means the painterly terrain costs a single draw, including
// soft bank shadows and paths. The atlas replaces this texture asynchronously.
export function createTerrainTexture(onReady){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=4096;
 const ctx=canvas.getContext('2d'),s=16,p=v=>(v+64)*s;
 // Keep the painting coordinates stable while doubling the actual texel count.
 ctx.scale(2,2);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.userData.owned=true;
 function paint(image){
  let seed=238711;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const patterns=[];
  if(image)for(let i=0;i<4;i++){
   const patch=document.createElement('canvas');patch.width=patch.height=512;
   patch.getContext('2d').drawImage(image,(i%2)*image.width/2,Math.floor(i/2)*image.height/2,image.width/2,image.height/2,0,0,512,512);
   // Reflect adjoining tiles so painted edges meet without a visible grid.
   const tile=document.createElement('canvas');tile.width=tile.height=1024;const tc=tile.getContext('2d');
   for(let x=0;x<2;x++)for(let y=0;y<2;y++){tc.save();tc.translate(x?1024:0,y?1024:0);tc.scale(x?-1:1,y?-1:1);tc.drawImage(patch,0,0);tc.restore();}
   const pattern=ctx.createPattern(tile,'repeat');pattern.setTransform(new DOMMatrix().scale(.5));patterns.push(pattern);
  }
  ctx.fillStyle=patterns[0]||'#395e42';ctx.fillRect(0,0,2048,2048);
  // Broad glades and shadows break repeated texture at gameplay scale.
  for(let i=0;i<105;i++){
   const x=rand()*2048,z=rand()*2048,r=70+rand()*150,g=ctx.createRadialGradient(x,z,0,x,z,r);
   g.addColorStop(0,i%3?'#102f3326':'#b1af6723');g.addColorStop(1,'#45674c00');ctx.fillStyle=g;ctx.fillRect(x-r,z-r,r*2,r*2);
  }
  const path=(points,width,color)=>{ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(p(v.x),p(v.z)):ctx.moveTo(p(v.x),p(v.z)));ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width*s;ctx.strokeStyle=color;ctx.stroke();};
  const river=[];for(let i=0;i<=32;i++){const t=-62+i*124/32,n=Math.sin(t*.074)*1.0;river.push({x:t+n,z:t-n});}
  path(river,12,'#173c3928');path(river,10.5,'#3b5c4988');path(river,8.8,'#668166');path(river,7.6,'#30585c');
  path(river,6.8,patterns[3]||'#23545b');path(river,6.8,'#08798835');
  // Vary both banks in world space; a wide black stroke reads as an artificial
  // canal. These textured turf tongues retain the river's playable footprint.
  ctx.save();ctx.shadowColor='#193d4066';ctx.shadowBlur=3;
  for(let i=0;i<170;i++){const t=-62+i*124/170,n=Math.sin(t*.074);if(Math.abs(t)<5||Math.abs(Math.abs(t)-50)<5)continue;for(const side of [-1,1]){const normal=side*(3.5+Math.sin(t*.67)*.4+rand()*.35)*.707,x=p(t+n+normal),z=p(t-n-normal);ctx.fillStyle=patterns[0]||'#456949';ctx.beginPath();ctx.ellipse(x,z,(.55+rand()*.55)*s,(.28+rand()*.3)*s,-Math.PI/4+(rand()-.5)*.6,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
  // Multiple narrower strokes give a feathered dirt shoulder without geometry.
  for(const lane of LANES){
   path(lane,10.8,'#27372f30');path(lane,10,'#4c533c45');path(lane,9.1,'#6c725457');path(lane,8.2,'#89937d');path(lane,7.6,patterns[1]||'#83908b');path(lane,7.6,'#536b6b33');
  }
  if(!image){
   for(let i=0;i<8500;i++){const x=rand()*2048,y=rand()*2048;ctx.fillStyle=i%2?'#91a87912':'#092c3820';ctx.fillRect(x,y,rand()*6+1,rand()*3+1);}
   for(const lane of LANES)for(let j=1;j<lane.length;j++){
    const a=lane[j-1],b=lane[j],d=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.z-a.z)/d,nz=-(b.x-a.x)/d;
    for(let t=0;t<d;t+=1.8)for(let k=-2;k<=2;k++){
     const x=a.x+(b.x-a.x)*t/d+nx*k*1.2,z=a.z+(b.z-a.z)*t/d+nz*k*1.2;
     ctx.save();ctx.translate(p(x),p(z));ctx.rotate(Math.atan2(b.z-a.z,b.x-a.x));ctx.fillStyle=['#a8ada2aa','#74888790','#8e9b9599'][Math.floor(rand()*3)];ctx.fillRect(-8,-7,14+rand()*5,13);ctx.restore();
    }
   }
  }
  // Both fountains use the same playable radius; decoration never changes it.
  for(const [i,b] of BASES.entries()){
   const x=p(b.x),z=p(b.z),g=ctx.createRadialGradient(x,z,7*s,x,z,12*s);g.addColorStop(0,'#172e3b66');g.addColorStop(1,'#182e3200');ctx.fillStyle=g;ctx.fillRect(x-12*s,z-12*s,24*s,24*s);
   ctx.beginPath();ctx.arc(x,z,9.4*s,0,Math.PI*2);ctx.fillStyle=patterns[1]||'#7b8d8d';ctx.fill();ctx.strokeStyle='#344d55';ctx.lineWidth=5;ctx.stroke();
   for(const r of [7.8,8.8]){ctx.beginPath();ctx.arc(x,z,r*s,0,Math.PI*2);ctx.strokeStyle=i?'#c47b6922':'#68d4d82c';ctx.lineWidth=4;ctx.stroke();}
   for(let k=0;k<12;k++){const a=k*Math.PI/6;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*7.8*s,z+Math.sin(a)*7.8*s);ctx.lineTo(x+Math.cos(a)*9.3*s,z+Math.sin(a)*9.3*s);ctx.strokeStyle='#344c4e70';ctx.lineWidth=2;ctx.stroke();}
  }
  for(const b of BLOCKERS){const x=p(b.x),z=p(b.z),r=(b.r+2)*s,g=ctx.createRadialGradient(x,z,b.r*.4*s,x,z,r);g.addColorStop(0,'#122d32e8');g.addColorStop(.65,'#102e34a8');g.addColorStop(1,'#102f3300');ctx.fillStyle=g;ctx.fillRect(x-r,z-r,r*2,r*2);}
  // Brush grows out of the surrounding turf, without an opaque circle under it.
  for(const b of BRUSHES){
   for(let k=0;k<11;k++){const a=k*2.399,r=Math.sqrt(rand())*b.r*.72,x=p(b.x+Math.cos(a)*r),z=p(b.z+Math.sin(a)*r),size=(1.3+rand())*s,g=ctx.createRadialGradient(x,z,0,x,z,size);g.addColorStop(0,'#27493670');g.addColorStop(.6,'#426a3e30');g.addColorStop(1,'#34563800');ctx.fillStyle=g;ctx.fillRect(x-size,z-size,size*2,size*2);}
  }
  // Fine hand-painted grass and broken river stones prevent large uniform swaths.
  for(let i=0;i<5200;i++){
   const x=rand()*120-60,z=rand()*120-60;if(Math.abs(x-z)<6||LANES.some(lane=>lane.some((b,j)=>{if(!j)return false;const a=lane[j-1],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<4.9;})))continue;
   ctx.strokeStyle=i%3?'#a3b67c23':'#153e3629';ctx.lineWidth=.5+rand()*.45;ctx.beginPath();ctx.moveTo(p(x),p(z));ctx.quadraticCurveTo(p(x)+1,p(z)-2,p(x)+rand()*3-1,p(z)-3-rand()*3);ctx.stroke();
  }
  for(let i=0;i<100;i++){const t=-59+i*1.19,n=Math.sin(t*.074),side=i%2?1:-1,x=p(t+n+side*(2.9+rand()*.6)),z=p(t-n-side*(2.9+rand()*.6));if(Math.abs(t)<6||Math.abs(Math.abs(t)-50)<6)continue;ctx.save();ctx.translate(x,z);ctx.rotate(-.7);ctx.fillStyle=i%3?'#b5bea66a':'#314d4588';ctx.beginPath();ctx.ellipse(0,0,3+rand()*6,2+rand()*2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  // The edges fade into the outer forest rather than a floating board.
  for(let i=0;i<50;i++){ctx.strokeStyle=`rgba(16,35,38,${.003+i*.00015})`;ctx.lineWidth=8;ctx.strokeRect(i*2,i*2,2048-i*4,2048-i*4);}
  texture.needsUpdate=true;
 }
 paint(null);
 const image=new Image();image.onload=()=>{paint(image);onReady?.(texture,image);};image.onerror=()=>onReady?.(texture);image.src='./art/terrain-atlas-v5.png';
 return texture;
}

export function createRiverGeometry(){
 const points=[],uv=[],indices=[];
 for(let i=0;i<=48;i++){
  const t=-63+i*126/48,n=Math.sin(t*.074),width=3.3+Math.sin(t*.17)*.3;
  for(const side of [-1,1]){points.push(t+n+side*width*.707,.032,t-n-side*width*.707);uv.push(side<0?0:1,i/48);}
  if(i<48){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData.owned=true;return geometry;
}
