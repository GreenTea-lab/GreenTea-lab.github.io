export const EXPANSIONS = [
 {id:1,level:30,stars:12,ru:'Рыбацкая бухта',en:'Fishing bay',scale:1.08},
 {id:2,level:130,stars:30,ru:'Пальмовая роща',en:'Palm grove',scale:1.16},
 {id:3,level:300,stars:55,ru:'Тихая гавань',en:'Quiet harbour',scale:1.24},
 {id:4,level:550,stars:80,ru:'Лазурный мыс',en:'Azure cape',scale:1.32},
 {id:5,level:800,stars:120,ru:'Сад путешествий',en:'Voyagers’ garden',scale:1.4},
];
const entries=[
 ['boathouse',1,[13.5,-.2],'Лодочная станция','Boathouse','boathouse'],
 ['smokehouse',1,[12,5.6],'Коптильня','Smokehouse','kiln'],
 ['fishmarket',1,[8.3,9.8],'Рыбный рынок','Fish market','market'],
 ['hammock',2,[-14.5,-.5],'Гамачная роща','Hammock grove','hammock'],
 ['teahouse',2,[-12.5,-5.8],'Чайный домик','Tea house','tea'],
 ['orchard',2,[-14,5.2],'Фруктовый сад','Orchard','orchard'],
 ['windmill',3,[-5,12],'Мельница','Windmill','mill'],
 ['guesthouse',3,[.5,12.7],'Дом для друзей','Guest house','house'],
 ['fountain',3,[6,12],'Поющий фонтан','Singing fountain','fountain'],
 ['observatory',4,[16.5,-3.3],'Обсерватория','Observatory','observatory'],
 ['library',4,[14,-8.4],'Морская библиотека','Seaside library','library'],
 ['aviary',4,[7.4,-11.1],'Птичий заповедник','Bird sanctuary','aviary'],
 ['pavilion',5,[-14,10],'Павильон встреч','Gathering pavilion','pavilion'],
 ['treasury',5,[-10,-10.8],'Музей находок','Discovery museum','museum'],
 ['statue',5,[17,7],'Памятник путешествию','Voyage monument','statue'],
];
const facing={boathouse:.23,smokehouse:-.3,fishmarket:.14,hammock:-.34,teahouse:.27,
 orchard:-.18,windmill:.27,guesthouse:-.31,observatory:.25,library:-.18,aviary:.32,
 pavilion:-.25,treasury:.19,statue:-.34};
const stageNames={
  boathouse:[['Стапель и каркас','Лодка под навесом','Лодочная мастерская'],['Slipway and frame','Boat under cover','Boat workshop']],
  smokehouse:[['Каменная кладка','Печь с трубой','Коптильня с дровницей'],['Stone foundation','Oven and chimney','Smokehouse with wood store']],
  fishmarket:[['Рыбный лоток','Крытый прилавок','Рынок с фонарями'],['Fish stall','Covered counter','Lantern-lit market']],
  hammock:[['Первый гамак','Тенистая роща','Гамак и уголок отдыха'],['First hammock','Shaded grove','Hammock and seating']],
  teahouse:[['Чайная стойка','Домик с террасой','Чайная под полосатым навесом'],['Tea stall','House with a terrace','Tea house with an awning']],
  orchard:[['Саженцы','Фруктовые деревья','Сад со спелыми плодами'],['Saplings','Fruit trees','Orchard with ripe fruit']],
  windmill:[['Основание башни','Мельница с лопастями','Парусная мельница'],['Tower foundation','Mill with blades','Windmill with cloth sails']],
  guesthouse:[['Каркас дома','Гостевой дом с крыльцом','Дом с черепицей и трубой'],['House frame','Guest house with porch','Tiled roof and chimney']],
  fountain:[['Чаша с водой','Фонтан со струями','Фонтан с подсветкой'],['Water basin','Jet fountain','Lantern-lit fountain']],
  observatory:[['Круглое основание','Купол и телескоп','Обсерватория с фонарём'],['Circular foundation','Dome and telescope','Observatory with a lantern']],
  library:[['Каркас библиотеки','Библиотека с книжными полками','Библиотека с черепичной крышей'],['Library frame','Library with bookshelves','Library with a tiled roof']],
  aviary:[['Скворечник','Вольер с насестами','Крытая птичья беседка'],['Birdhouse','Aviary with roosts','Roofed bird sanctuary']],
  pavilion:[['Каркас и скамья','Скамьи и гирлянда','Крытый павильон с фонарями'],['Frame and bench','Benches and bunting','Roofed pavilion with lanterns']],
  treasury:[['Каркас музея','Зал находок','Музей с колоннами'],['Museum frame','Hall of discoveries','Museum with columns']],
  statue:[['Каменная роза ветров','Бронзовый корабль','Памятник со знаменем'],['Stone compass rose','Bronze ship','Monument with a banner']],
};
export const WORLD_PROJECTS=entries.map(([id,tier,pos,ru,en,kind])=>({
  id,tier,pos,ru,en,kind,r:1.25,rot:facing[id]||0,cost:[8+tier*3,11+tier*4,15+tier*5],
  stages:{ru:stageNames[id][0],en:stageNames[id][1]},
}));
export const worldScale=tier=>EXPANSIONS[Math.max(0,Math.min(5,tier))-1]?.scale||1;
export const projectName=(p,lang)=>lang==='ru'?p.ru:p.en;
