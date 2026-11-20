export const WILDLIFE = [
 {id:'parrot',ru:'Попугай',en:'Parrot',requires:['hut',0],count:1,speed:.68,scale:1.35},
 {id:'hedgehog',ru:'Ёжик',en:'Hedgehog',requires:['garden',0],count:1,speed:.6,scale:1.5},
 {id:'monkey',ru:'Обезьянки',en:'Monkeys',requires:['garden',1],count:2,speed:1.25,scale:1.22},
 {id:'dog',ru:'Пёс Боцман',en:'Bosun the dog',requires:['hut',2],count:1,speed:1.05,scale:1.25},
 {id:'rabbit',ru:'Кролики',en:'Rabbits',requires:['garden',2],count:2,speed:.9,scale:1.25},
 {id:'goat',ru:'Козочки',en:'Goats',requires:['farm',2],count:2,speed:.65,scale:1.1},
 {id:'chicken',ru:'Курочки',en:'Chickens',requires:['farm',3],count:3,speed:.75,scale:1.3},
 {id:'deer',ru:'Олени',en:'Deer',requires:['orchard',2],count:2,speed:.85,scale:1.3},
 {id:'squirrel',ru:'Белочка',en:'Squirrel',requires:['orchard',1],count:1,speed:1.15,scale:1.3},
 {id:'duck',ru:'Утки',en:'Ducks',requires:['fountain',2],count:2,speed:.65,scale:1.3},
];
export const wildlifeUnlocked=(def,stages)=>(stages[def.requires[0]]||0)>=def.requires[1];
