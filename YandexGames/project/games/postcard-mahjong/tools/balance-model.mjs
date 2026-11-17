import {rng} from '../src/core.js';

// A reproducible proxy for ambiguity: uniformly choose legal pairs without planning.
// This is not a forecast of human completion rates.
export function auditDeal(game,runs=48,seed=571903){
  const original=game.alive,R=rng(seed);let wins=0,deadRemaining=0,choiceSum=0,turns=0;
  for(let n=0;n<runs;n++){
    game.alive=original.slice();let left=game.left;
    while(left){
      const moves=game.movesList();choiceSum+=moves.length;turns++;
      if(!moves.length){deadRemaining+=left;break;}
      const pair=moves[Math.floor(R()*moves.length)];game.alive[pair[0]]=game.alive[pair[1]]=false;left-=2;
    }
    if(!left)wins++;
  }
  game.alive=original;
  return {wins,runs,clearRate:wins/runs,meanChoices:Math.round(choiceSum/turns*100)/100,meanDeadTiles:wins===runs?0:Math.round(deadRemaining/(runs-wins)*10)/10};
}
