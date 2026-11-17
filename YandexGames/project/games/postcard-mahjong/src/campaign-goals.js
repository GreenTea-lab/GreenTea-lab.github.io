import {rng} from './core.js';

// Stable tile IDs survive undo, shuffle, and exact saved-board restoration.
export function campaignTargets(game,L){
  if(L.mission==='seals')return game.tiles.filter(t=>t.hidden).map(t=>t.id).slice(0,6);
  if(L.mission==='unlock')return game.tiles.filter(t=>t.lock).map(t=>t.id);
  if(L.mission==='mail'){
    const a=game.tiles.filter(t=>t.f!=='key').map(t=>t.id),R=rng((game.opts.seed||1)+L.idx*3571+28411);
    for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a.slice(0,6);
  }
  return [];
}
export function campaignGoal(game,L,ids=[]){
  const kind=L.mission||'clear',pairs=(game.tiles.length-game.left)/2,minPairs=L.missionMin||game.tiles.length/2;
  if(kind==='clear')return {kind,goal:game.tiles.length/2,value:pairs,pairs,minPairs,done:game.left===0};
  const goal=ids.length;
  const value=ids.filter(i=>!game.alive[i]||(kind==='seals'&&(game.tiles[i].seen||game.free(i)))).length;
  return {kind,goal,value,pairs,minPairs,done:goal>0&&value>=goal&&pairs>=minPairs};
}
