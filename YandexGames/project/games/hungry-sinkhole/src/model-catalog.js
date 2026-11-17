export const EXTRA_CARS={
  taxi:[2,1.75,4.08],policecar:[2,1.75,4.08],ambulance:[2.12,2.4,4.68],delivery:[2.12,2.5,4.68],
};
export const EXTRA_PROPS={
  scooter:{shape:'box',size:[.55,1.2,1.5],pts:7},motorbike:{shape:'box',size:[.8,1.3,2],pts:12},
  recycle:{shape:'box',size:[1,1.35,.85],pts:8},charger:{shape:'box',size:[.6,1.8,.45],pts:12},vending:{shape:'box',size:[1.2,2.1,.9],pts:20},newspaper:{shape:'box',size:[.8,1.35,.55],pts:8},
  streetclock:{shape:'cyl',size:[.9,3.7,.6],pts:18},coffee:{shape:'box',size:[1.7,2.4,1.3],pts:20},luggage:{shape:'box',size:[.7,1.15,.45],pts:6},picnic:{shape:'box',size:[2.4,1.1,1.9],pts:16},
  lifering:{shape:'box',size:[1.1,1.7,.45],pts:7},boat:{shape:'box',size:[1.8,1.3,3.4],pts:30},beachshower:{shape:'box',size:[.8,2.6,1],pts:15},beachbag:{shape:'box',size:[.75,.8,.45],pts:5},
  snowmobile:{shape:'box',size:[1.2,1.35,2.5],pts:25},ski:{shape:'box',size:[.8,2.2,.45],pts:7},icebox:{shape:'box',size:[1,.75,.75],pts:7},
  anvil:{shape:'box',size:[1.4,1.15,.8],pts:15},armor:{shape:'box',size:[1.1,2.1,.7],pts:18},treasure:{shape:'box',size:[1.3,1,.9],pts:18},
  bonsai:{shape:'box',size:[1.1,1.2,.8],pts:8},teapot:{shape:'box',size:[.9,.8,.7],pts:6},donut:{shape:'box',size:[1.3,1.3,.6],pts:9},cupcake:{shape:'cyl',size:[1,1.4,1],pts:10},
  beehive:{shape:'box',size:[1,1.3,1.1],pts:10},wateringcan:{shape:'box',size:[1,.85,.6],pts:6},satellite:{shape:'box',size:[1.7,2,1.6],pts:25},drill:{shape:'box',size:[1.6,1.6,1.5],pts:20},
};
export const NEW_MODEL_LABELS={taxi:'Такси',policecar:'Патруль',ambulance:'Скорая',delivery:'Доставка',scooter:'Самокат',motorbike:'Мотоцикл',recycle:'Переработка',charger:'Зарядка',vending:'Автомат',newspaper:'Газетница',streetclock:'Уличные часы',coffee:'Кофейная тележка',luggage:'Чемодан',picnic:'Стол для пикника',lifering:'Спасательный круг',boat:'Лодка',beachshower:'Пляжный душ',beachbag:'Пляжная сумка',snowmobile:'Снегоход',ski:'Лыжи',icebox:'Термобокс',anvil:'Наковальня',armor:'Доспехи',treasure:'Сундук',bonsai:'Бонсай',teapot:'Чайник',donut:'Пончик',cupcake:'Капкейк',beehive:'Улей',wateringcan:'Лейка',satellite:'Спутниковая тарелка',drill:'Буровая установка'};
export const THEME_PROPS={
 town:['scooter','recycle','newspaper','streetclock','coffee'],beach:['boat','lifering','beachshower','beachbag','luggage','icebox'],port:['drill','lifering','boat','charger'],metro:['vending','charger','scooter','motorbike','streetclock'],
 winter:['snowmobile','ski','icebox','coffee'],castle:['anvil','armor','treasure','teapot'],fair:['donut','cupcake','vending','coffee'],japan:['bonsai','teapot','newspaper','scooter'],
 oasis:['teapot','beachshower','treasure','wateringcan'],botanical:['wateringcan','bonsai','beehive','picnic'],farm:['beehive','wateringcan','picnic','icebox'],autumn:['picnic','beehive','coffee','newspaper'],canyon:['drill','treasure','satellite','icebox'],candyland:['donut','cupcake','vending','coffee'],aurora:['satellite','icebox','snowmobile','ski'],neoncity:['satellite','charger','vending','motorbike'],
};
