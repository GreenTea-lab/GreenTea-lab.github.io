// Участники шоу: люди, звери и гости из космоса. f: 1 — женский род (для «отгадала»).
// kind — вид (голова в chars.js), skin — кожа/мех, top — одежда, acc — аксессуары.
export const ROSTER = [
  { id: 'barsik', name: 'Кот Барсик', from: 'Казань', job: 'повар', kind: 'cat', skin: '#f0a050', skin2: '#fff4e6', top: '#f4f0e8', pants: '#3a4a6a', acc: ['apron', 'bow'], apronc: '#e8e0d0', tail: '#e08a3a' },
  { id: 'zhuchka', name: 'Собака Жучка', f: 1, from: 'Тула', job: 'почтальон', kind: 'dog', skin: '#d9b07a', ear: '#8a5a32', top: '#2c63d0', acc: ['cap'], capc: '#1f4fb5' },
  { id: 'potap', name: 'Медведь Потап', from: 'Тайга', job: 'пасечник', kind: 'bear', skin: '#8a5a32', skin2: '#d9b07a', top: '#c0392b', pants: '#3a3a5a', acc: ['hat'], hatc: '#4a3a2a' },
  { id: 'alisa', name: 'Лиса Алиса', f: 1, from: 'Смоленск', job: 'модельер', kind: 'fox', skin: '#ef7a2a', top: '#8c4bd1', dress: 1, acc: ['beads', 'ribbon'], ribc: '#ffd23a' },
  { id: 'stepan', name: 'Заяц Степан', from: 'Рязань', job: 'фермер', kind: 'rabbit', skin: '#c9c3cf', top: '#3a9a5a', pants: '#2a5a8a', acc: ['scarf'], scarfc: '#f5c542' },
  { id: 'pin', name: 'Панда Пин', from: 'Харбин', job: 'путешественник', kind: 'bear', skin: '#fafafa', ear: '#1d1d24', patch: '#1d1d24', skin2: '#ffffff', hands: '#1d1d24', top: '#e23b3b', pants: '#1d1d24', acc: ['cap'], capc: '#f5c542' },
  { id: 'hryunya', name: 'Свинка Хрюня', f: 1, from: 'Вологда', job: 'кондитер', kind: 'pig', skin: '#ffb3c1', top: '#ff7aa8', dress: 1, acc: ['ribbon'], ribc: '#ffffff' },
  { id: 'kvakusha', name: 'Лягушка Квакуша', f: 1, from: 'Псков', job: 'певица', kind: 'frog', skin: '#6cc24a', skin2: '#d9f2a0', top: '#ffd23a', dress: 1, acc: ['beads'] },
  { id: 'matrena', name: 'Сова Матрёна', f: 1, from: 'Ярославль', job: 'библиотекарь', kind: 'owl', skin: '#9a6a42', skin2: '#f2e2c4', top: '#2a8a8a', dress: 1, acc: ['glasses', 'beads'] },
  { id: 'pingvin', name: 'Пингвин Пётр', from: 'Антарктида', job: 'полярник', kind: 'penguin', skin: '#22263a', belly: '#ffffff', top: '#22263a', hands: '#22263a', pants: '#22263a', shoes: '#f2a02a', bare: 1, acc: ['scarf'], scarfc: '#e23b3b' },
  { id: 'piskunya', name: 'Мышка Пискунья', f: 1, from: 'Тверь', job: 'сыровар', kind: 'mouse', skin: '#a8a4b4', top: '#f07a2a', dress: 1, acc: ['flower'] },
  { id: 'arkadiy_lev', name: 'Лев Аркадий', from: 'Сочи', job: 'спасатель', kind: 'lion', skin: '#f0b84a', mane: '#b5561c', top: '#d8343c', acc: ['medal'] },
  { id: 'boris_slon', name: 'Слон Борис', from: 'Калуга', job: 'грузчик', kind: 'elephant', skin: '#9aa8c4', top: '#3f6fb5', scale: 1.08, acc: ['tie'], tiec: '#f5c542' },
  { id: 'erofey', name: 'Енот Ерофей', from: 'Пермь', job: 'механик', kind: 'raccoon', skin: '#8a8a96', top: '#e0a030', pants: '#2a4a7a', acc: ['cap'], capc: '#2a4a7a', tail: '#5a5a66' },
  { id: 'kolyuchkin', name: 'Ёж Колючкин', from: 'Брянск', job: 'грибник', kind: 'hedgehog', skin: '#e8c8a0', spikes: '#6a4a30', top: '#4a8a3a', acc: ['scarf'], scarfc: '#c23a3a' },
  { id: 'zorg', name: 'Зорг', from: 'планета Зоргон', job: 'межгалактический турист', kind: 'alien', skin: '#7ad65a', top: '#b8c4d8', pants: '#8a96b0', acc: ['medal'] },
  { id: 'yyh', name: 'Ыых', from: 'туманность Андромеды', job: 'учёный', kind: 'cyclops', skin: '#9a6ae0', top: '#2ab8a8', acc: ['tie'], tiec: '#ff6fa8' },
  { id: 'lilia', name: 'Лилия с Венеры', f: 1, from: 'Венера', job: 'звёздная певица', kind: 'alien', skin: '#ff9ad0', top: '#7a4ae0', dress: 1, acc: ['beads'] },
  { id: 'robot', name: 'Робот Тимофей', from: 'Сколково', job: 'инженер', kind: 'robot', skin: '#b8c2d0', top: '#7a8aa0', shoes: '#4a5468', acc: [] },
  { id: 'nina', name: 'Нина Петровна', f: 1, from: 'Самара', job: 'библиотекарь', kind: 'human', skin: '#f4c9a8', hair: '#9a9aa6', style: 'bun', top: '#c0457a', dress: 1, acc: ['glasses', 'beads'] },
  { id: 'viktor', name: 'Виктор Семёнович', from: 'Тула', job: 'слесарь', kind: 'human', skin: '#e8b48f', hair: '#6b5a48', style: 'short', mus: 1, top: '#3f6fb5', acc: ['tie'], tiec: '#c4161c' },
  { id: 'galina', name: 'Галина Ивановна', f: 1, from: 'Воронеж', job: 'учитель', kind: 'human', skin: '#f6d0b0', hair: '#a8452c', style: 'curly', top: '#2f9e7a', dress: 1, acc: ['beads'] },
  { id: 'petr', name: 'Пётр Ильич', from: 'Вологда', job: 'пенсионер', kind: 'human', skin: '#f0c4a0', hair: '#d8d8d8', style: 'bald', beard: 1, top: '#5a6a7a', acc: ['glasses'] },
  { id: 'tamara', name: 'Тамара', f: 1, from: 'Казань', job: 'повар', kind: 'human', skin: '#eebd96', hair: '#3a2a22', style: 'long', top: '#d8723a', dress: 1, acc: ['flower'] },
  { id: 'mihail', name: 'Михаил', from: 'Мурманск', job: 'моряк', kind: 'human', skin: '#dca37e', hair: '#b0b0b0', style: 'short', beard: 1, top: '#1f3f7a', acc: ['cap'], capc: '#ffffff' },
  { id: 'ludmila', name: 'Людмила', f: 1, from: 'Ростов-на-Дону', job: 'бухгалтер', kind: 'human', skin: '#f3cba9', hair: '#e0b45a', style: 'bob', top: '#7a4ab5', dress: 1, acc: ['beads'] },
  { id: 'valentina', name: 'Валентина', f: 1, from: 'Курск', job: 'агроном', kind: 'human', skin: '#e9b892', hair: '#6a3a28', style: 'scarf', scarf: '#c23a3a', top: '#f5b82e', dress: 1, acc: [] },
  { id: 'sergey', name: 'Сергей', from: 'Пермь', job: 'инженер', kind: 'human', skin: '#eab995', hair: '#5a4030', style: 'short', top: '#2e7d5b', acc: ['glasses', 'tie'] },
];

// Ведущий — свой персонаж студии
export const HOST_DEF = { id: 'host', name: 'Ведущий', kind: 'human', skin: '#f2c4a0', hair: '#4a3426', style: 'short', iris: '#4a6a8a', top: '#7a1630', pants: '#2a1020', shoes: '#1a1012', acc: ['tux'], bowc: '#f5c542', scale: 1.12 };
