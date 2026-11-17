import { _dicts } from './i18n.js';
import { SKIN_NAMES } from './cosmetics.js';
const RU={
  recordStory:'Рекорд в историю',calmRecordStory:'Спокойный рекорд в историю',rewardsReady:'Можно забрать наград: {n}',
  campaign_clear:'Городская панорама',campaign_mail:'Почтовый маршрут',campaign_seals:'Тайные печати',campaign_unlock:'Связка ключей',
  difficulty_easy:'Легко',difficulty_normal:'Обычно',difficulty_hard:'Сложно',difficultyLegend:'Легко · передышка / Обычно · выбор пар / Сложно · планируйте ходы',
  f_repeat:'Одинаковых плиток стало больше',f_repeat_txt:'Один рисунок теперь встречается на четырёх или шести плитках. Снимайте пары, освобождающие нижние плитки и боковые ряды. Если ходов нет, помогут отмена и перемешивание.',
  travelAlbum:'Коллекция путешествий',brandCaption:'Находите пары. Собирайте впечатления.',nextStop:'Следующая остановка',yourBest:'Рекорд',collectionNav:'Моя коллекция',journeyContinues:'Мир ждёт вас',cityProgressLabel:'Город {n} из {m}',
  subtitle:'20 городов · 1000 уровней',styles:'Оформление',
  continueGame:'Продолжить',playNow:'Играть',map:'Карта путешествия',cityOf20:'20 городов · 1000 уровней',
  postcardAt:'Открытки на уровнях 3, 10, 25 и 50',how4:'Исследуйте 20 городов, по 50 уровней в каждом. Открытки появляются после 3, 10, 25 и 50 побед в городе.',
  toMenuSaved:'В меню · партия сохранена',toMenu:'В меню · партия сохранена',
  progressCard:'До новой открытки',cityComplete:'Коллекция города собрана!',stampsProgress:'Штампы путешествия',
  card0:'Панорама',card1:'Городские улочки',card2:'Вечерний свет',card3:'Маленькие сокровища',
  weekly:'Открытка недели',weeklyGoal:'Решите задачи за 4 разных дня недели. Пропущенные дни можно наверстать.',
  weeklyWon:'Недельная открытка и 150 монет!',catchUp:'Наверстать дни',previousWeek:'Предыдущая неделя',nextWeek:'Следующая неделя',
  weeklyAlbum:'Недельные открытки',weeklyEmpty:'Первая недельная открытка ждёт вас в задаче дня.',
  openCard:'Открыть открытку',claimCard:'Получить открытку',decor:'Мастерская оформления',
  mats:'Игровой стол',frames:'Рамки открыток',effects:'Эффекты совпадений',cosmeticsHint:'Покупки за игровые монеты. Оформление сохраняется и не влияет на сложность.',
  a_routes3:'Исследователь: 3 города',a_routes5:'Исследователь: 5 городов',a_routes10:'Исследователь: 10 городов',
  a_pc10:'Коллекционер открыток',didYouKnow:'Заметка путешественника.',
};
const EN={
  recordStory:'Share record to a story',calmRecordStory:'Share relaxed record',rewardsReady:'Rewards ready to claim: {n}',
  campaign_clear:'City panorama',campaign_mail:'Postal route',campaign_seals:'Secret seals',campaign_unlock:'A ring of keys',
  difficulty_easy:'Easy',difficulty_normal:'Normal',difficulty_hard:'Hard',difficultyLegend:'Easy · a breather / Normal · choose pairs / Hard · plan ahead',
  f_repeat:'More matching tiles',f_repeat_txt:'A symbol can now appear on four or six tiles. Choose the pair that opens more tiles underneath and to the sides. If you get stuck, try undoing a move or shuffling the board.',
  travelAlbum:'A collection of journeys',brandCaption:'Find pairs. Collect memories.',nextStop:'Your next destination',yourBest:'Best',collectionNav:'My collection',journeyContinues:'The world awaits',cityProgressLabel:'City {n} of {m}',
  subtitle:'20 cities · 1000 levels',styles:'Designs',
  continueGame:'Continue',playNow:'Play',map:'Travel map',cityOf20:'20 cities · 1000 levels',
  postcardAt:'Postcards at milestones 3, 10, 25 and 50',how4:'Visit 20 cities with 50 levels each. Earn postcards after 3, 10, 25 and 50 wins in each city.',
  toMenuSaved:'Menu · board saved',toMenu:'Menu · board saved',progressCard:'Next postcard',cityComplete:'City collection complete!',stampsProgress:'Travel stamps',
  card0:'Panorama',card1:'City lanes',card2:'Evening light',card3:'Little treasures',
  weekly:'Weekly postcard',weeklyGoal:'Solve puzzles for 4 different days in the week. You can catch up on missed days.',weeklyWon:'Weekly postcard and 150 coins!',
  catchUp:'Catch up',previousWeek:'Previous week',nextWeek:'Next week',weeklyAlbum:'Weekly postcards',weeklyEmpty:'Your first weekly postcard awaits in the daily puzzle.',openCard:'View postcard',claimCard:'Claim postcard',
  decor:'Design workshop',mats:'Playing table',frames:'Postcard frames',effects:'Match effects',cosmeticsHint:'Use in-game coins. Your choices are saved and do not affect difficulty.',
  a_routes3:'Explorer: 3 cities',a_routes5:'Explorer: 5 cities',a_routes10:'Explorer: 10 cities',a_pc10:'Postcard collector',didYouKnow:'Traveller’s note.',
};
const names={london:['Лондон','London'],prague:['Прага','Prague'],lisbon:['Лиссабон','Lisbon'],barcelona:['Барселона','Barcelona'],vienna:['Вена','Vienna'],marrakesh:['Марракеш','Marrakesh'],newyork:['Нью-Йорк','New York'],singapore:['Сингапур','Singapore'],sydney:['Сидней','Sydney'],santorini:['Санторини','Santorini']};
for(const [id,[ru,en]] of Object.entries(names)){
  RU['c_'+id]=ru;EN['c_'+id]=en;RU['greet_'+id]=ru+' — привет!';EN['greet_'+id]='Greetings from '+en+'!';
  RU['fact_'+id]='Заметьте силуэты, свет на фасадах и маленькие детали этого города. Следующая открытка покажет другой взгляд на путешествие.';
  EN['fact_'+id]='Look for silhouettes, light on the facades and small details. Your next postcard offers another view of the journey.';
  RU['fact2_'+id]=RU['fact_'+id];EN['fact2_'+id]=EN['fact_'+id];
}
for(const [id,[ru,en]] of Object.entries(SKIN_NAMES)){RU['st_'+id]=ru;EN['st_'+id]=en;}
Object.assign(_dicts.RU,RU);Object.assign(_dicts.EN,EN);
