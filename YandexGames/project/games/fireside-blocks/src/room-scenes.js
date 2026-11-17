export const ROOM_SCENES=[
 {"key":"room-0000","stars":0,"reward":null,"objects":["cup","scatter","glasses"]},
 {"key":"room-0003","stars":3,"reward":"book","objects":["cup","scatter","glasses","book"]},
 {"key":"room-0008","stars":8,"reward":"yarn","objects":["cup","scatter","glasses","book","yarn"]},
 {"key":"room-0014","stars":14,"reward":"plate","objects":["cup","scatter","glasses","book","yarn","plate"]},
 {"key":"room-0022","stars":22,"reward":"candle","objects":["cup","scatter","glasses","book","yarn","plate","candle"]},
 {"key":"room-0032","stars":32,"reward":"flowers","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers"]},
 {"key":"room-0044","stars":44,"reward":"watch","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers","watch"]},
 {"key":"room-0058","stars":58,"reward":"cat","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers","watch","cat"]},
 {"key":"room-0074","stars":74,"reward":"jam","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers","watch","cat","jam"]},
 {"key":"room-0092","stars":92,"reward":"teapot","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers","watch","cat","jam","teapot"]},
 {"key":"room-0112","stars":112,"reward":"crossword","objects":["cup","scatter","glasses","book","yarn","plate","candle","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0180","stars":180,"reward":"tea-service","objects":["tea-service","scatter","glasses","book","yarn","plate","candle","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0280","stars":280,"reward":"library-stack","objects":["tea-service","scatter","glasses","library-stack","yarn","plate","candle","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0400","stars":400,"reward":"knitted-scarf","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","plate","candle","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0550","stars":550,"reward":"berry-cake","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candle","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0720","stars":720,"reward":"candelabrum","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","flowers","watch","cat","jam","teapot","crossword"]},
 {"key":"room-0920","stars":920,"reward":"rose-bouquet","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","watch","cat","jam","teapot","crossword"]},
 {"key":"room-1150","stars":1150,"reward":"mantel-clock","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat","jam","teapot","crossword"]},
 {"key":"room-1420","stars":1420,"reward":"cat-bed","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","jam","teapot","crossword"]},
 {"key":"room-1750","stars":1750,"reward":"berry-basket","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","berry-basket","teapot","crossword"]},
 {"key":"room-2100","stars":2100,"reward":"samovar","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","berry-basket","samovar","crossword"]},
 {"key":"room-2500","stars":2500,"reward":"writing-set","objects":["tea-service","scatter","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","berry-basket","samovar","writing-set"]},
 {"key":"room-2800","stars":2800,"reward":"music-box","objects":["tea-service","music-box","glasses","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","berry-basket","samovar","writing-set"]},
 {"key":"room-3000","stars":3000,"reward":"reading-set","objects":["tea-service","music-box","reading-set","library-stack","knitted-scarf","berry-cake","candelabrum","rose-bouquet","mantel-clock","cat-bed","berry-basket","samovar","writing-set"]},
];
export function roomSceneForDecor(ids){
 const set=new Set(ids);return [...ROOM_SCENES].reverse().find(s=>!s.reward||set.has(s.reward))||ROOM_SCENES[0];
}
