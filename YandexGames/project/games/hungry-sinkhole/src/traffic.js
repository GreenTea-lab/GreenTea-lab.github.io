// Shared road geometry: generation, driving and respawning use the same lane pose.
export function lanePose(net, a, b, t, lane=1.75) {
  const p=net.nodes[a],q=net.nodes[b],len=Math.hypot(q.x-p.x,q.z-p.z);
  const dx=(q.x-p.x)/len,dz=(q.z-p.z)/len;
  return {x:p.x+(q.x-p.x)*t-dz*lane,z:p.z+(q.z-p.z)*t+dx*lane,yaw:Math.atan2(dx,dz),dx,dz};
}
export function footprintOverlap(a,b,pad=.08) {
  const aa=a.yaw||0,ba=b.yaw||0,ax=[Math.cos(aa),-Math.sin(aa)],az=[Math.sin(aa),Math.cos(aa)],bx=[Math.cos(ba),-Math.sin(ba)],bz=[Math.sin(ba),Math.cos(ba)];
  const x=b.x-a.x,z=b.z-a.z,aw=a.w/2+pad,ad=a.d/2+pad,bw=b.w/2,bd=b.d/2;
  for(const[u,v]of [ax,az,bx,bz]) {
    const r=aw*Math.abs(ax[0]*u+ax[1]*v)+ad*Math.abs(az[0]*u+az[1]*v)+bw*Math.abs(bx[0]*u+bx[1]*v)+bd*Math.abs(bz[0]*u+bz[1]*v);
    if(Math.abs(x*u+z*v)>=r)return false;
  }
  return true;
}
export function turnCurve(net,A,next,length) {
  const p=net.nodes[A.a],b=net.nodes[A.b],c=net.nodes[next];
  const il=Math.hypot(b.x-p.x,b.z-p.z),ol=Math.hypot(c.x-b.x,c.z-b.z);
  const ix=(b.x-p.x)/il,iz=(b.z-p.z)/il,ox=(c.x-b.x)/ol,oz=(c.z-b.z)/ol;
  const trim=Math.min(il*.25,ol*.25,Math.max(4,length*.5+1.2)),lane=A.lane||1.75;
  const start={x:b.x-ix*trim-iz*lane,z:b.z-iz*trim+ix*lane};
  const end={x:b.x+ox*trim-oz*lane,z:b.z+oz*trim+ox*lane};
  // Cubic controls keep both position and heading continuous through a junction.
  const handle=trim*.75;
  const curve={start,end,c1:{x:start.x+ix*handle,z:start.z+iz*handle},c2:{x:end.x-ox*handle,z:end.z-oz*handle},trim,next,length:0};
  let last=start;for(let i=1;i<=24;i++){const p=curvePose(curve,i/24);curve.length+=Math.hypot(p.x-last.x,p.z-last.z);last=p;}
  return curve;
}
export function curvePose(c,t) {
  const u=1-t,x=u*u*u*c.start.x+3*u*u*t*c.c1.x+3*u*t*t*c.c2.x+t*t*t*c.end.x,z=u*u*u*c.start.z+3*u*u*t*c.c1.z+3*u*t*t*c.c2.z+t*t*t*c.end.z;
  const dx=3*u*u*(c.c1.x-c.start.x)+6*u*t*(c.c2.x-c.c1.x)+3*t*t*(c.end.x-c.c2.x),dz=3*u*u*(c.c1.z-c.start.z)+6*u*t*(c.c2.z-c.c1.z)+3*t*t*(c.end.z-c.c2.z);
  return {x,z,yaw:Math.atan2(dx,dz),dx,dz};
}
export function advanceTraffic(net,A,metres,length,choose) {
  if(!A.curve)A.curve=turnCurve(net,A,choose(A.a,A.b),length);
  let budget=metres;
  for(let i=0;i<8&&budget>0;i++){
    if(A.turn!=null){const remain=(1-A.turn)*A.curve.length,step=Math.min(remain,budget);A.turn+=step/A.curve.length;budget-=step;
      if(A.turn<1-1e-9)return curvePose(A.curve,A.turn);
      const trim=A.curve.trim,next=A.curve.next;A.a=A.b;A.b=next;const p=net.nodes[A.a],q=net.nodes[A.b];A.len=Math.hypot(q.x-p.x,q.z-p.z);A.t=trim/A.len;A.turn=null;A.curve=turnCurve(net,A,choose(A.a,A.b),length);
    }else{const end=1-A.curve.trim/A.len,remain=Math.max(0,(end-A.t)*A.len),step=Math.min(remain,budget);A.t+=step/A.len;budget-=step;
      if(A.t<end-1e-9)return lanePose(net,A.a,A.b,A.t,A.lane);
      A.turn=0;
    }
  }
  return A.turn!=null?curvePose(A.curve,A.turn):lanePose(net,A.a,A.b,A.t,A.lane);
}
