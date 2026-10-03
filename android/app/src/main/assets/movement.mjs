// Frame-rate independent locomotion. No renderer/browser state belongs here.
const SKIN=.002, BODY=.8, LIMIT=59, RESPONSE=.035;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const graphs=new WeakMap();

export function resetMotion(u){u.velocityX=0;u.velocityZ=0;u._navigation=null;}

// Integrate the exponential response exactly, rather than multiplying its final
// velocity by dt. A 30 Hz device travels the same distance as a 120 Hz device.
export function analogDisplacement(u,x,z,speed,dt){
  const magnitude=Math.hypot(x,z);
  if(!Number.isFinite(magnitude)||magnitude<=.0001||dt<=0){u.velocityX=0;u.velocityZ=0;return {x:0,z:0};}
  const scale=speed/Math.max(1,magnitude),tx=x*scale,tz=z*scale;
  const decay=Math.exp(-dt/RESPONSE),integral=RESPONSE*(1-decay);
  const vx=u.velocityX||0,vz=u.velocityZ||0;
  u.velocityX=tx+(vx-tx)*decay;u.velocityZ=tz+(vz-tz)*decay;
  return {x:tx*dt+(vx-tx)*integral,z:tz*dt+(vz-tz)*integral};
}

export function confineUnit(u,blockers=[]){
  u.x=clamp(u.x,-LIMIT,LIMIT);u.z=clamp(u.z,-LIMIT,LIMIT);
  if(u.type!=='hero')return;
  for(let pass=0;pass<3;pass++)for(const b of blockers){
    const dx=u.x-b.x,dz=u.z-b.z,n=Math.hypot(dx,dz),r=b.r+BODY+SKIN;
    if(n<r){u.x=b.x+(n>1e-8?dx/n:1)*r;u.z=b.z+(n>1e-8?dz/n:0)*r;}
  }
  u.x=clamp(u.x,-LIMIT,LIMIT);u.z=clamp(u.z,-LIMIT,LIMIT);
}

// Sweep the whole displacement: even a dash cannot tunnel through a rock.
// At contact remove only the inward component, preserving motion along walls.
export function moveWithCollision(u,dx,dz,blockers=[]){
  const before={x:u.x,z:u.z};confineUnit(u,blockers);
  if(u.type!=='hero'){u.x+=dx;u.z+=dz;confineUnit(u,blockers);return distance(before,u);}
  for(let iteration=0;iteration<4&&Math.hypot(dx,dz)>1e-7;iteration++){
    let contact=null,fraction=1;
    const a=dx*dx+dz*dz;
    for(const b of blockers){
      const ox=u.x-b.x,oz=u.z-b.z,r=b.r+BODY+SKIN;
      const projection=ox*dx+oz*dz;
      if(projection>=0)continue;
      const c=ox*ox+oz*oz-r*r,disc=projection*projection-a*c;
      if(disc<0)continue;
      const t=(-projection-Math.sqrt(disc))/a;
      if(t>=-1e-6&&t<fraction){fraction=Math.max(0,t);contact=b;}
    }
    u.x+=dx*fraction;u.z+=dz*fraction;
    if(!contact)break;
    const n=distance(u,contact),nx=(u.x-contact.x)/n,nz=(u.z-contact.z)/n;
    dx*=1-fraction;dz*=1-fraction;
    const inward=Math.min(0,dx*nx+dz*nz);dx-=inward*nx;dz-=inward*nz;
  }
  confineUnit(u,blockers);return distance(before,u);
}

function clearSegment(a,b,blockers){
  const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
  for(const rock of blockers){
    const t=den?clamp(((rock.x-a.x)*dx+(rock.z-a.z)*dz)/den,0,1):0;
    if(Math.hypot(a.x+dx*t-rock.x,a.z+dz*t-rock.z)<rock.r+BODY+SKIN-.0001)return false;
  }
  return true;
}

// A tiny static visibility graph is built once for the eight existing rocks.
// Its edges use clearance beyond the collision circle, including chord sag.
function graphFor(blockers){
  if(graphs.has(blockers))return graphs.get(blockers);
  const nodes=[];
  for(const b of blockers)for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,r=(b.r+BODY+.08)/Math.cos(Math.PI/16);
    const p={x:b.x+Math.cos(angle)*r,z:b.z+Math.sin(angle)*r};
    if(clearSegment(p,p,blockers))nodes.push(p);
  }
  const edges=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(clearSegment(nodes[i],nodes[j],blockers)){
    const cost=distance(nodes[i],nodes[j]);edges[i].push([j,cost]);edges[j].push([i,cost]);
  }
  const graph={nodes,edges};graphs.set(blockers,graph);return graph;
}

function routeBetween(start,goal,blockers){
  const {nodes,edges}=graphFor(blockers),n=nodes.length;
  const costs=new Float64Array(n+1).fill(Infinity),previous=new Int16Array(n+1).fill(-1),closed=new Uint8Array(n+1);
  for(let i=0;i<n;i++)if(clearSegment(start,nodes[i],blockers))costs[i]=distance(start,nodes[i]);
  for(let step=0;step<=n;step++){
    let current=-1,best=Infinity;
    for(let i=0;i<=n;i++)if(!closed[i]&&costs[i]<best){current=i;best=costs[i];}
    if(current<0)break;
    if(current===n){const route=[goal];let p=previous[n];while(p!==-1){route.unshift(nodes[p]);p=previous[p];}return route;}
    closed[current]=1;
    const relax=(to,cost)=>{if(best+cost<costs[to]){costs[to]=best+cost;previous[to]=current;}};
    for(const [to,cost] of edges[current])if(!closed[to])relax(to,cost);
    if(clearSegment(nodes[current],goal,blockers))relax(n,distance(nodes[current],goal));
  }
  return [goal];
}

export function waypointFor(u,target,blockers,time){
  const goal={x:clamp(target.x,-LIMIT,LIMIT),z:clamp(target.z,-LIMIT,LIMIT),type:'hero'};
  confineUnit(goal,blockers);
  if(clearSegment(u,goal,blockers)){u._navigation=null;return goal;}
  let cache=u._navigation;
  if(!cache||cache.targetId!==target.id||distance(cache.goal,goal)>2||!cache.points.length||!clearSegment(u,cache.points[0],blockers)){
    cache=u._navigation={goal,targetId:target.id,created:time,points:routeBetween(u,goal,blockers)};
  }
  // Skip obsolete corners whenever a later waypoint becomes directly visible.
  for(let i=cache.points.length-1;i>0;i--)if(clearSegment(u,cache.points[i],blockers)){cache.points.splice(0,i);break;}
  if(cache.points.length>1&&distance(u,cache.points[0])<.15)cache.points.shift();
  return cache.points[0];
}

export function separateUnits(units,dt,blockers){
  const response=1-Math.exp(-12*dt);
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
    const u=units[i],v=units[j];if(u.type!==v.type)continue;
    const n=distance(u,v),minimum=u.type==='hero'?2:1;if(n>=minimum)continue;
    // Releasing the joystick anchors the player; nearby bots take the correction.
    const uw=u.isPlayer&&!u._moveIntent?0:1,vw=v.isPlayer&&!v._moveIntent?0:1,total=uw+vw;if(!total)continue;
    const nx=n>1e-7?(v.x-u.x)/n:((u.id+v.id)%2?1:-1),nz=n>1e-7?(v.z-u.z)/n:0;
    const correction=(minimum-n)*response;
    moveWithCollision(u,-nx*correction*uw/total,-nz*correction*uw/total,blockers);
    moveWithCollision(v,nx*correction*vw/total,nz*correction*vw/total,blockers);
  }
}
