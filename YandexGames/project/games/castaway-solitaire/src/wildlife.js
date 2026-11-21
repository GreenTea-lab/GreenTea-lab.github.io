export const TURTLE = {id:'turtle',ru:'Черепаха',en:'Sea turtle',requires:['pier',1]};

export const WILDLIFE = [
 {id:'parrot',ru:'Попугай',en:'Parrot',requires:['hut',1],speed:.68,scale:.58},
 {id:'hedgehog',ru:'Ёжик',en:'Hedgehog',requires:['garden',1],speed:.6,scale:.72},
 {id:'monkey',ru:'Обезьянка',en:'Monkey',requires:['garden',2],speed:1.25,scale:.87},
 {id:'dog',ru:'Пёс Боцман',en:'Bosun the dog',requires:['hut',2],speed:1.05,scale:.84},
 {id:'rabbit',ru:'Кролик',en:'Rabbit',requires:['garden',2],speed:.9,scale:.86},
 {id:'goat',ru:'Козочка',en:'Goat',requires:['farm',2],speed:.65,scale:.8},
 {id:'chicken',ru:'Курочка',en:'Hen',requires:['farm',3],speed:.75,scale:.91},
 {id:'deer',ru:'Олень',en:'Deer',requires:['orchard',2],speed:.85,scale:1},
 {id:'squirrel',ru:'Белочка',en:'Squirrel',requires:['orchard',1],speed:1.15,scale:.74},
 {id:'duck',ru:'Утка',en:'Duck',requires:['fountain',2],speed:.65,scale:.78},
 TURTLE,
];
export const wildlifeUnlocked=(def,stages)=>(stages[def.requires[0]]||0)>=def.requires[1];
