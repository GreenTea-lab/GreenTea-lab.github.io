// Bounded physics shower using the current map's themed meshes.
export class RainDirector {
 constructor(sim){this.sim=sim;this.next=0;this.live=new Set();this.spawned=0;this.templates=sim.map.items.filter(s=>!s.grp&&!s.agent&&s.kind!=='person'&&s.kind!=='animal'&&s.kind!=='car'&&Math.max(...s.size)<2.1);}
 step(){
  const sim=this.sim;
  for(const it of this.live)if(it.st===2||sim.time-it.rainAt>55){if(it.st!==2){sim.remove(it,true);sim.events.push({t:'eat',it,h:null,pts:0});}this.live.delete(it);}
  if(sim.time<this.next||!sim.focus||!this.templates.length)return;
  this.next=sim.time+.65;if(this.live.size>=36||sim.active.size>=sim.maxBodies-4)return;
  const h=sim.focus,a=sim.rnd()*Math.PI*2,r=5+sim.rnd()*11,x=Math.max(-sim.half+4,Math.min(sim.half-4,h.x+Math.cos(a)*r)),z=Math.max(-sim.half+4,Math.min(sim.half-4,h.z+Math.sin(a)*r));
  let blocked=false;sim.query(x,z,2,it=>{if(it.st!==2&&it.grp&&Math.hypot(it.p.x-x,it.p.z-z)<it.footR+1.5)blocked=true;});if(blocked)return;
  const spec=this.templates[Math.floor(sim.rnd()*this.templates.length)],it=sim.addItem({...spec,agent:null,grp:0,x,y:9+sim.rnd()*4,z,ry:sim.rnd()*Math.PI*2});
  it.noRegen=true;it.rainAt=sim.time;sim.added.push(it);sim.activate(it);this.live.add(it);this.spawned++;
 }
}
