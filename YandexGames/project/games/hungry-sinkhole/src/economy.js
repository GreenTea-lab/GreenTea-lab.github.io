// Round income is bounded and time-weighted; daily gifts remain separate.
export function roundCoins({ mode, pts, place=11, stars=0, newStars=0, elapsed=0, gold=0 }) {
  const played=Math.max(0,Math.min(1,elapsed/60));
  const growth=Math.min(24,Math.floor(Math.sqrt(Math.max(0,pts))*.12));
  const podium=mode==='battle'||mode==='royale' ? ([0,12,8,5,3,1][place]||0) : mode==='solo' ? stars*4 : 0;
  const firstStars=mode==='expedition' ? newStars*8 : 0;
  const base=Math.floor((6+growth+podium)*played);
  return Math.min(mode==='expedition'?63:51,base+firstStars+Math.min(9,Math.max(0,gold)*3));
}
