// Ники ботов: смесь русских и английских, как на живом сервере
import { LANG } from './i18n.js';
export const NAMES = [
  'Пельмень', 'КиберЁж', 'Туча', 'Бублик', 'Шрек228', 'Котлета', 'Neo', 'Vortex', 'Shadow', 'xXSniperXx', 'Мармелад', 'ТанкистКот',
  'Капибара', 'Жмых', 'Лёха', 'Nyan', 'Pixel', 'Квадратик', 'Фантом', 'Gloom', 'Zephyr', 'Борщ', 'Сырок', 'Comet', 'Арбуз',
  'Ниндзя', 'Rocket', 'Блинчик', 'Mr. Square', 'Zoom', 'Кракен', 'Огурчик', 'Hydra', 'Сова', 'Тостер', 'Ракета', 'Медведь',
  'Pancake', 'Glitch', 'Ёлка', 'Дракоша', 'Spark', 'Мандарин', 'Echo', 'Ворон', 'Turbo', 'Сникерс', 'Луна', 'Bolt', 'Пончик',
  'Хомяк', 'Wolfy', 'Кекс', 'Raven', 'Груша', 'Frost', 'Бобр', 'Orbit', 'Чебурек', 'Lynx', 'Сосиска', 'Nova', 'Тапок',
  'Pepper', 'Ёжик', 'Atom', 'Вжух', 'Mango', 'Кефир', 'Blaze', 'Шаурма', 'Quark', 'Пряник', 'Viper', 'Кузя', 'Moth',
  'Гроза', 'Nimbus', 'Валера', 'Byte', 'Лис', 'Noodle', 'Компот', 'Storm', 'Кот в танке', 'Inferno', 'Вафля', 'Prism',
  'Морж', 'Kiwi', 'Тигра', 'Zero', 'Батон', 'Hex', 'Гном', 'Mint', 'Дыня', 'Ghost', 'Йогурт', 'Flux', 'Енот', 'Tofu',
  '', '', '', '',
];
export function randomName(used) {
  for (let i = 0; i < 30; i++) {
    const n = NAMES[Math.floor(Math.random() * NAMES.length)];
    // у англоязычных игроков русских ников мало
    if (LANG === 'en' && /[а-яё]/i.test(n) && Math.random() < 0.85) continue;
    if (!used.has(n) || n === '') return n;
  }
  return 'Tank' + Math.floor(Math.random() * 999);
}
