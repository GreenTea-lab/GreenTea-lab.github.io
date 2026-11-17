// Настройки игры: сектора барабана, призы, подарки ведущему, соперники, награды.

// 18 секторов по 20°, по часовой стрелке от верха. Число — очки, строка — особый сектор.
export const SECTORS = [350, 'B', 500, 250, 'P', 800, 400, '0', 1000, 300, '+', 600, 150, 'x2', 700, 200, 450, 750];
export const SECTOR_DEG = 360 / SECTORS.length;
export const SECTOR_NAMES = { B: 'Банкрот', P: 'Приз', 0: 'Ноль', '+': 'Плюс', x2: '×2' };

export const START_COINS = 300;
export const HINT_COST = 120; // «Помощь зала» за монеты
export const COINS_PER_POINTS = 10; // очки тура → монеты (делитель)
export const SUPER_BONUS = 1500;
export const LOSE_COINS = 40;
export const DAILY_COINS = 120;
export const AD_COINS = 150; // монеты за рекламу в магазине
export const AD_COINS_GAP = 180000; // раз в 3 минуты
export const SUPER_TIME = 90; // секунд в суперигре
export const SUPER_LETTERS = 3;

// Призы с сектора «Приз»
export const PRIZES = [
  { id: 'samovar', name: 'Самовар' },
  { id: 'iron', name: 'Утюг' },
  { id: 'vacuum', name: 'Пылесос' },
  { id: 'tv', name: 'Телевизор' },
  { id: 'kettle', name: 'Чайник' },
  { id: 'grinder', name: 'Мясорубка' },
  { id: 'teaset', name: 'Чайный сервиз' },
  { id: 'clock', name: 'Часы с кукушкой' },
  { id: 'radio', name: 'Радиоприёмник' },
  { id: 'tape', name: 'Магнитофон' },
  { id: 'camera', name: 'Фотоаппарат' },
  { id: 'sewing', name: 'Швейная машинка' },
  { id: 'bike', name: 'Велосипед' },
  { id: 'lamp', name: 'Торшер' },
  { id: 'accordion', name: 'Гармонь' },
  { id: 'carpet', name: 'Ковёр' },
];
// Суперпризы
export const SUPER_PRIZES = [
  { id: 'car', name: 'Автомобиль' },
  { id: 'moto', name: 'Мотоцикл с коляской' },
  { id: 'boat', name: 'Моторная лодка' },
];

// Подарки ведущему: каждый даёт одну открытую букву в начале следующей игры
export const GIFTS = [
  { id: 'pickles', name: 'Банка огурцов', price: 150 },
  { id: 'vobla', name: 'Вобла', price: 200 },
  { id: 'jam', name: 'Малиновое варенье', price: 250 },
  { id: 'pie', name: 'Пирог с капустой', price: 300 },
  { id: 'socks', name: 'Вязаные носки', price: 350 },
  { id: 'honey', name: 'Бочонок мёда', price: 400 },
  { id: 'valenki', name: 'Валенки', price: 600 },
  { id: 'painting', name: 'Картина маслом', price: 900 },
];

// Оформление барабана
export const SKINS = [
  { id: 'classic', name: 'Классический', price: 0, cols: ['#e23b3b', '#f5b82e', '#2f9e5b', '#2c6fd6', '#f07a2a', '#8c4bd1'], ink: '#fff', hub: '#f5c542', rim: '#7a4a1a' },
  { id: 'gold', name: 'Золотой', price: 1200, cols: ['#c9962c', '#f3d27a', '#b07a1e', '#f0c35a'], ink: '#3b2508', hub: '#fff1b8', rim: '#6b4a10' },
  { id: 'khokhloma', name: 'Хохлома', price: 2000, cols: ['#c4161c', '#1d1d1d', '#e8a317'], ink: '#fff6d8', hub: '#e8a317', rim: '#5a1508' },
  { id: 'gzhel', name: 'Гжель', price: 2500, cols: ['#ffffff', '#1f4fb5', '#e6eefc', '#2c63d0'], ink: ['#1f4fb5', '#fff', '#1f4fb5', '#fff'], hub: '#1f4fb5', rim: '#16357a' },
  { id: 'neon', name: 'Вечерний неон', price: 3000, cols: ['#ff3fa4', '#2be4ff', '#9d5bff', '#33ff99', '#ffd23f'], ink: '#14072b', hub: '#14072b', rim: '#2a0e5a' },
];

// Соперники. look: кожа, волосы, причёска, очки, усы/борода, цвет одежды
export const BOTS = [
  { name: 'Нина Петровна', city: 'Самара', job: 'библиотекарь', f: 1, look: { skin: '#f4c9a8', hair: '#9a9aa6', style: 'bun', glasses: 1, cloth: '#c0457a' } },
  { name: 'Виктор Семёнович', city: 'Тула', job: 'слесарь', f: 0, look: { skin: '#e8b48f', hair: '#6b5a48', style: 'short', mus: 1, cloth: '#3f6fb5' } },
  { name: 'Галина Ивановна', city: 'Воронеж', job: 'учитель', f: 1, look: { skin: '#f6d0b0', hair: '#a8452c', style: 'curly', cloth: '#2f9e7a' } },
  { name: 'Анатолий', city: 'Омск', job: 'водитель', f: 0, look: { skin: '#e2a982', hair: '#2f2620', style: 'short', cloth: '#8a5a2b' } },
  { name: 'Тамара', city: 'Казань', job: 'повар', f: 1, look: { skin: '#eebd96', hair: '#3a2a22', style: 'long', cloth: '#d8723a' } },
  { name: 'Пётр Ильич', city: 'Вологда', job: 'пенсионер', f: 0, look: { skin: '#f0c4a0', hair: '#d8d8d8', style: 'bald', glasses: 1, beard: 1, cloth: '#5a6a7a' } },
  { name: 'Людмила', city: 'Ростов-на-Дону', job: 'бухгалтер', f: 1, look: { skin: '#f3cba9', hair: '#e0b45a', style: 'bob', cloth: '#7a4ab5' } },
  { name: 'Сергей', city: 'Пермь', job: 'инженер', f: 0, look: { skin: '#eab995', hair: '#5a4030', style: 'short', glasses: 1, cloth: '#2e7d5b' } },
  { name: 'Валентина', city: 'Курск', job: 'агроном', f: 1, look: { skin: '#e9b892', hair: '#6a3a28', style: 'scarf', cloth: '#c23a3a' } },
  { name: 'Михаил', city: 'Мурманск', job: 'моряк', f: 0, look: { skin: '#dca37e', hair: '#b0b0b0', style: 'short', beard: 1, cloth: '#1f3f7a' } },
  { name: 'Ольга', city: 'Екатеринбург', job: 'врач', f: 1, look: { skin: '#f5d2b5', hair: '#2a1f1a', style: 'bob', glasses: 1, cloth: '#3a8ac4' } },
  { name: 'Геннадий', city: 'Кострома', job: 'пчеловод', f: 0, look: { skin: '#e5ae86', hair: '#8a6a40', style: 'bald', mus: 1, cloth: '#c89a2a' } },
  { name: 'Зинаида', city: 'Псков', job: 'швея', f: 1, look: { skin: '#f2c8a6', hair: '#c8c8d0', style: 'curly', glasses: 1, cloth: '#9a3a8a' } },
  { name: 'Борис', city: 'Новосибирск', job: 'тренер', f: 0, look: { skin: '#e8b08a', hair: '#3a3a3a', style: 'short', cloth: '#d24a3a' } },
  { name: 'Елена', city: 'Ярославль', job: 'почтальон', f: 1, look: { skin: '#f1c7a4', hair: '#7a4a2a', style: 'long', cloth: '#4a9a4a' } },
  { name: 'Аркадий', city: 'Смоленск', job: 'фотограф', f: 0, look: { skin: '#eebb98', hair: '#c0c0c0', style: 'short', glasses: 1, mus: 1, cloth: '#6a4a8a' } },
];

export const PLAYER_LOOKS = [
  { skin: '#f3cba9', hair: '#5a3a28', style: 'short', cloth: '#d8343c' },
  { skin: '#f3cba9', hair: '#8a4a2a', style: 'bob', cloth: '#d8343c' },
  { skin: '#eab995', hair: '#c8c8d0', style: 'bald', glasses: 1, cloth: '#2c6fd6' },
  { skin: '#f2c8a6', hair: '#b0b0b8', style: 'bun', glasses: 1, cloth: '#2f9e5b' },
  { skin: '#e2a982', hair: '#2f2620', style: 'short', mus: 1, cloth: '#8c4bd1' },
  { skin: '#f6d0b0', hair: '#e0b45a', style: 'long', cloth: '#f07a2a' },
];

// Частота букв русского языка (на 1000) — для ботов
export const FREQ = { О: 110, Е: 85, А: 80, И: 74, Н: 67, Т: 63, С: 55, Р: 47, В: 45, Л: 44, К: 35, М: 32, Д: 30, П: 28, У: 26, Я: 20, Ы: 19, Ь: 17, Г: 17, З: 16, Б: 16, Ч: 14, Й: 12, Х: 10, Ж: 9, Ш: 7, Ю: 6, Ц: 5, Щ: 4, Э: 3, Ф: 3, Ъ: 1 };
export const ALPHABET = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
