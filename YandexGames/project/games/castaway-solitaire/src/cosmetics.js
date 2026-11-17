import { save } from './save.js';
export const THEMES = [
  {id:'island',ru:'Ваш остров',en:'Your island',price:0},
  {id:'lagoon',ru:'Тихая лагуна',en:'Quiet lagoon',price:0},
  {id:'sunset',ru:'Закатная бухта',en:'Sunset bay',price:250},
  {id:'moon',ru:'Лунный берег',en:'Moonlit shore',price:350},
];
export const BACKS = [
  {id:'sea',ru:'Морской бриз',en:'Sea breeze',price:0,colors:['#2fb6c7','#1d86b0']},
  {id:'coral',ru:'Коралловый риф',en:'Coral reef',price:150,colors:['#ff9c76','#b84767']},
  {id:'jungle',ru:'Пальмовая роща',en:'Palm grove',price:150,colors:['#7bbd69','#246957']},
  {id:'royal',ru:'Капитанская колода',en:'Captain’s deck',price:250,colors:['#7974b0','#303957']},
];
export function cosmeticState() {
  const d=save.data;
  if(!d.cosmetics || typeof d.cosmetics!=='object' || Array.isArray(d.cosmetics)) d.cosmetics={owned:['island','lagoon','sea'],theme:'island',back:'sea',motion:true};
  const c=d.cosmetics;
  c.owned=Array.from(new Set(['island','lagoon','sea',...(Array.isArray(c.owned)?c.owned:[])]));
  if (!THEMES.some(x=>x.id===c.theme) || !c.owned.includes(c.theme)) c.theme='island';
  if(!c.islandDefaultApplied){if(c.theme==='lagoon'&&!c.themeChosen)c.theme='island';c.islandDefaultApplied=true;}
  if (!BACKS.some(x=>x.id===c.back) || !c.owned.includes(c.back)) c.back='sea';
  if (typeof c.motion!=='boolean') c.motion=true;
  return c;
}
export function applyCosmetics(game) {
  const c=cosmeticState();
  document.documentElement.dataset.theme=c.theme;
  document.documentElement.dataset.motion=c.motion?'on':'off';
  if (game?.table) { game.table.art.backColors=BACKS.find(x=>x.id===c.back).colors; game.table.art.backStyle=c.back; game.table.art.cache.clear(); }
}
export function selectCosmetic(id, kind, game) {
  const item=(kind==='theme'?THEMES:BACKS).find(x=>x.id===id);
  if (!item) return false;
  const c=cosmeticState();
  if (!c.owned.includes(id)) {
    if (save.data.coins<item.price) return false;
    save.data.coins-=item.price;c.owned.push(id);
  }
  c[kind]=id;if(kind==='theme')c.themeChosen=true;save.write();applyCosmetics(game);return true;
}
