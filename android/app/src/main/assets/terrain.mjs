import * as T from './vendor/three.module.min.js';
import {LANES,BASES,BLOCKERS} from './engine.mjs';

// One baked canvas means the painterly terrain costs a single draw, including
// soft bank shadows and paths. The atlas replaces this texture asynchronously.
export function createTerrainTexture(onReady){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
 const ctx=canvas.getContext('2d'),s=16,p=v=>(v+64)*s;
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=4;texture.userData.owned=true;
 function paint(image){
  let seed=238711;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const patterns=[];
  if(image)for(let i=0;i<4;i++){
   const patch=document.createElement('canvas');patch.width=patch.height=256;
   patch.getContext('2d').drawImage(image,(i%2)*image.width/2,Math.floor(i/2)*image.height/2,image.width/2,image.height/2,0,0,256,256);
   // Reflect adjoining tiles so painted edges meet without a visible grid.
   const tile=document.createElement('canvas');tile.width=tile.height=512;const tc=tile.getContext('2d');
   for(let x=0;x<2;x++)for(let y=0;y<2;y++){tc.save();tc.translate(x?512:0,y?512:0);tc.scale(x?-1:1,y?-1:1);tc.drawImage(patch,0,0);tc.restore();}
   patterns.push(ctx.createPattern(tile,'repeat'));
  }
  ctx.fillStyle=patterns[0]||'#395e42';ctx.fillRect(0,0,2048,2048);
  // Broad glades and shadows break repeated texture at gameplay scale.
  for(let i=0;i<105;i++){
   const x=rand()*2048,z=rand()*2048,r=70+rand()*150,g=ctx.createRadialGradient(x,z,0,x,z,r);
   g.addColorStop(0,i%3?'#102f3326':'#b1af6723');g.addColorStop(1,'#45674c00');ctx.fillStyle=g;ctx.fillRect(x-r,z-r,r*2,r*2);
  }
  const path=(points,width,color)=>{ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(p(v.x),p(v.z)):ctx.moveTo(p(v.x),p(v.z)));ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width*s;ctx.strokeStyle=color;ctx.stroke();};
  const river=[];for(let i=0;i<=32;i++){const t=-62+i*124/32,n=Math.sin(t*.074)*1.0;river.push({x:t+n,z:t-n});}
  path(river,12,'#173c3935');path(river,10.5,'#162c32b0');path(river,8.8,'#5b7357');path(river,7.6,'#254951');
  path(river,6.8,patterns[3]||'#23545b');path(river,6.8,'#08798835');
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
