// Exclusive scenery collections. Shared utility equipment and actors stay shared.
export const THEME_NAMES={town:'Город',beach:'Курорт',port:'Порт',metro:'Мегаполис',winter:'Зима',castle:'Замок',fair:'Луна-парк',japan:'Япония',oasis:'Оазис',botanical:'Ботанический сад',farm:'Ферма',autumn:'Осень',canyon:'Каньон',candyland:'Сладкий город',aurora:'Полярная бухта',neoncity:'Неон-сити'};
export const ROLES=['tree','plant','light','barrier','border','marker','seat','cargo','canopy','feature','stall','relic'];
export const ROLE_SIZE={tree:[2.2,4.5,2.2],plant:[1.1,.9,1.1],light:[.5,3.6,.5],barrier:[2,1,.18],border:[1.8,.8,.65],marker:[.55,.8,.55],seat:[1.8,.9,.75],cargo:[1.1,1.1,1.1],canopy:[2.1,2.5,2.1],feature:[1.5,1.7,1.3],stall:[2.3,2.5,1.5],relic:[.8,1.1,.8]};
export const ROLE_LABELS={tree:'Растение',plant:'Клумба',light:'Светильник',barrier:'Ограда',border:'Бордюр',marker:'Столбик',seat:'Место отдыха',cargo:'Груз',canopy:'Навес',feature:'Декорация',stall:'Лавка',relic:'Находка'};
export const themeId=(map,role)=>'theme_'+map+'_'+role;
export const THEMED_PROPS=Object.fromEntries(Object.keys(THEME_NAMES).flatMap(map=>ROLES.map(role=>[themeId(map,role),{shape:'box',size:ROLE_SIZE[role],pts:{tree:25,plant:5,light:10,barrier:3,border:5,marker:3,seat:8,cargo:8,canopy:15,feature:15,stall:30,relic:7}[role]}])));
const OWNED={
 town:['tree','bench','hydrant','bin','mailbox','slide','swing','bike','scooter','recycle','newspaper','streetclock','coffee'],
 beach:['palm','parasol','sunbed','lifeguard','surfboard','beachball','sandcastle','boat','beachshower','beachbag','luggage'],
 port:['crate','pallet','forklift','bollard','buoy','barrel','pump','cone','dumpster','anchor','lifering','drill'],
 metro:['lamp','tlight','busstop','kiosk','phone','charger','vending'],
 winter:['pine','snowpine','snowman','xtree','sled','gift','snowmobile','ski'],
 castle:['statue','torch','anvil','armor'],fair:['horse','popcorn','balloons','gondola','icecart'],
 japan:['sakura','slantern','plantern','bamboo','koi','pot','table','bonsai'],
 oasis:['cactus','umbrella','well','stall','teapot'],botanical:['mushroom','bush','hedge','flowers','fountain','wateringcan'],
 farm:['fence','hay','cart','beehive'],autumn:['pumpkin','picnic'],canyon:['crystal','sign','treasure'],
 candyland:['lollipop','candy','donut','cupcake'],aurora:['satellite','icebox'],neoncity:['billboard','motorbike'],
};
export const MODEL_OWNER=Object.fromEntries(Object.entries(OWNED).flatMap(([map,ids])=>ids.map(id=>[id,map])));
const GROUPS={
 tree:['tree','pine','palm','sakura','snowpine','xtree','bamboo','cactus','crystal','lollipop'],
 plant:['bush','pot','flowers','mushroom','pumpkin','bonsai','wateringcan'],
 light:['lamp','tlight','torch','plantern','slantern','streetclock'],barrier:['fence'],border:['hedge'],
 marker:['bollard','hydrant','bin','cone','buoy','recycle','lifering'],seat:['bench','sunbed','table','picnic','sled'],
 cargo:['crate','pallet','barrel','hay','gift','luggage','icebox','treasure'],canopy:['umbrella','parasol'],
 stall:['stall','kiosk','busstop','icecart','coffee','popcorn','lifeguard','gondola'],
 relic:['beachball','sandcastle','teapot','donut','cupcake','candy'],
};
const ROLE_OF=Object.fromEntries(Object.entries(GROUPS).flatMap(([role,ids])=>ids.map(id=>[id,role])));
export function themedLook(map,look){
 if(!MODEL_OWNER[look]||MODEL_OWNER[look]===map)return look;
 return themeId(map,ROLE_OF[look]||'feature');
}
export function modelOwner(look){return look.startsWith('theme_')?look.slice(6,look.lastIndexOf('_')):MODEL_OWNER[look];}
export function sourceLook(it){
 if(it.look.startsWith('theme_')){const role=it.look.slice(it.look.lastIndexOf('_')+1);if(role==='tree')return 'tree';if(role==='cargo')return 'crate';}
 return it.sourceLook||it.look;
}
