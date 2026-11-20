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
 pavilion:-.25,treasury:.19};
export const WORLD_PROJECTS=entries.map(([id,tier,pos,ru,en,kind])=>({id,tier,pos,ru,en,kind,r:1.25,rot:facing[id]||0,cost:[8+tier*3,11+tier*4,15+tier*5]}));
export const worldScale=tier=>EXPANSIONS[Math.max(0,Math.min(5,tier))-1]?.scale||1;
export const projectName=(p,lang)=>lang==='ru'?p.ru:p.en;
export const STAGE_NAMES={ru:['Основание','Обустройство','Последний штрих'],en:['Foundations','Furnishing','Finishing touch']};
