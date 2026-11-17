export const ROOM_UPGRADES=[
 {id:'tea-service',slot:'cup',stars:180},{id:'library-stack',slot:'book',stars:280},
 {id:'knitted-scarf',slot:'yarn',stars:400},{id:'berry-cake',slot:'plate',stars:550},
 {id:'candelabrum',slot:'candle',stars:720},{id:'rose-bouquet',slot:'flowers',stars:920},
 {id:'mantel-clock',slot:'watch',stars:1150},{id:'cat-bed',slot:'cat',stars:1420},
 {id:'berry-basket',slot:'jam',stars:1750},{id:'samovar',slot:'teapot',stars:2100},
 {id:'writing-set',slot:'crossword',stars:2500},{id:'music-box',slot:'scatter',stars:2800},
 {id:'reading-set',slot:'glasses',stars:3000},
];
export const roomSlot=id=>ROOM_UPGRADES.find(x=>x.id===id)?.slot||id;
