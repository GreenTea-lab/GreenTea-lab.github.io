// Residents have their own opening lines and share everyday island chatter.
const personal={
  robin:[
    ['Каждая доска здесь на счету.','Every plank counts out here.'],
    ['Когда-то здесь был один костёр.','There was just a campfire here once.'],
  ],
  mila:[
    ['У крыльца скоро зацветёт жасмин.','The jasmine by the door will bloom soon.'],
    ['Люблю слушать дождь под крышей.','I love hearing rain from under a roof.'],
  ],
  cap:[
    ['По ветру чую, будет ясный день.','The wind tells me it’ll be a clear day.'],
    ['В бухте тихо. Хорошо бы выйти в море.','The bay is calm. A fine day to sail.'],
  ],
  kid:[
    ['На песке кто-то оставил следы!','Someone left tracks in the sand!'],
    ['Давай устроим гонку до пирса?','Want to race to the pier?'],
  ],
  kid2:[
    ['Вот бы найти розовую ракушку.','I hope I find a pink shell.'],
    ['Слышишь? Чайка мне ответила!','Hear that? The gull answered me!'],
  ],
  lina:[
    ['Я набрала цветных камешков.','I picked up some colourful pebbles.'],
    ['Сплету коврик из пальмовых листьев.','I’ll weave a mat from palm leaves.'],
  ],
  omar:[
    ['Я отмечаю новые тропы на карте.','I’m marking new paths on my map.'],
    ['С мыса видно соседние островки.','You can see the other islets from the cape.'],
  ],
  iris:[
    ['Утром тут столько разных птиц.','So many birds come out in the morning.'],
    ['Хочу зарисовать остров на закате.','I want to sketch the island at sunset.'],
  ],
  fisher:[
    ['На рассвете у берега лучше клёв.','Fish bite near the shore at dawn.'],
    ['Поймал рыбу. Большую, честное слово!','I caught a fish. A big one, I swear!'],
  ],
  cook:[
    ['Сегодня копчу рыбу с розмарином.','I’m smoking fish with rosemary today.'],
    ['Можешь попробовать, только не обожгись.','Have a taste, but mind the heat.'],
  ],
  reader:[
    ['Принесла книгу про созвездия.','I brought a book about constellations.'],
    ['Береги книги от морской сырости.','Keep the books away from the sea air.'],
  ],
  ranger:[
    ['Чьи это следы под пальмой?','Whose tracks are these under the palm?'],
    ['Иди потише. Птицы уже близко.','Walk softly. The birds are close.'],
  ],
  leo:[
    ['У моря канаты быстро изнашиваются.','Ropes wear out quickly by the sea.'],
    ['До прилива успею починить парус.','I’ll mend the sail before high tide.'],
  ],
  agnia:[
    ['Подкину дров, скоро стемнеет.','I’ll add some logs before it gets dark.'],
    ['У огня всегда найдётся место.','There’s always room by the fire.'],
  ],
  yanek:[
    ['Я заточил пилу. Можно браться за дело.','I sharpened the saw. Time to get to work.'],
    ['Поправлю перила у входа.','I’ll fix the railing by the door.'],
  ],
  rita:[
    ['Снимай только спелые плоды.','Pick just the fruit that’s ripe.'],
    ['Первая корзина уже полная!','The first basket’s full already!'],
  ],
  stefan:[
    ['Пойду проверю доски на пирсе.','I’ll go check the planks on the pier.'],
    ['Привяжи лодку покрепче.','Make sure the boat is tied snugly.'],
  ],
  sava:[
    ['Земля рыхлая. Как раз для посева.','The soil is loose. Perfect for sowing.'],
    ['Не тропись. Семена взойдут в свой срок.','Be patient. The seeds will sprout in time.'],
  ],
  ada:[
    ['Рыба с утра. Подходи, выбирай!','Fresh catch this morning. Take your pick!'],
    ['Вечером на рынке особенно людно.','The market gets lively in the evening.'],
  ],
  tariq:[
    ['Подлатаю борт к следующему рейсу.','I’ll patch the hull before the next trip.'],
    ['Слышишь, как лодка поскрипывает?','Can you hear the boat creaking?'],
  ],
  luk:[
    ['Я умею завязывать морской узел!','I can tie a sailor’s knot!'],
    ['Угадаешь, сколько чаек над бухтой?','Guess how many gulls are over the bay!'],
  ],
  sima:[
    ['Для коптильни нужны сухие щепки.','The smokehouse needs dry wood chips.'],
    ['Над крышами пахнет дымком.','There’s a hint of woodsmoke above the roofs.'],
  ],
  nadir:[
    ['У гамака самый прохладный ветерок.','The breeze by the hammock is the coolest.'],
    ['После обеда сяду в тени почитать.','I’ll read in the shade after lunch.'],
  ],
  zoya:[
    ['Заварила чай с мятой. Будешь?','I made mint tea. Would you like some?'],
    ['У окна пока свободный столик.','There’s still a free table by the window.'],
  ],
  faye:[
    ['Пахнет спелыми фруктами. Пора в сад.','I smell ripe fruit. Time to visit the orchard.'],
    ['Верхние ветки оставлю птицам.','I’ll leave the highest branches for the birds.'],
  ],
  pavel:[
    ['Отнесу две корзины за один раз.','I can carry two baskets in one trip.'],
    ['Быстрее всего до сада по этой тропе.','This trail is the quickest way to the orchard.'],
  ],
  irina:[
    ['Слышишь, как крылья мельницы шумят?','Hear the sails turning on the windmill?'],
    ['Жду ветра, чтобы смолоть муку.','I’m waiting for wind to grind the flour.'],
  ],
  matvey:[
    ['В гостевом доме есть комната с видом.','The guesthouse has a room with a view.'],
    ['Вечером зажгу свет у дверей.','I’ll light the lamp by the door tonight.'],
  ],
  sofia:[
    ['Я нашла крабика, но он убежал!','I found a crab, but it ran away!'],
    ['Можно мне помочь с цветами?','Can I help with the flowers?'],
  ],
  kir:[
    ['У фонтана прохладнее всего.','It’s coolest by the fountain.'],
    ['На солнце в брызгах бывает радуга.','The spray makes rainbows in the sun.'],
  ],
  mira:[
    ['Хочу первой заметить новую звезду.','I want to be first to spot a new star.'],
    ['На мысе после заката особенно ясно.','The sky clears beautifully over the cape at dusk.'],
  ],
  boris:[
    ['Записываю истории здешних моряков.','I’m writing down the local sailors’ stories.'],
    ['Верну книги на полку и пройдусь.','I’ll shelve these books and go for a walk.'],
  ],
  polya:[
    ['Попугай узнал мой голос!','The parrot recognised my voice!'],
    ['Собрала семена для птиц.','I gathered some seeds for the birds.'],
  ],
  naomi:[
    ['Сегодня в телескоп видно Сатурн.','Saturn is visible through the telescope tonight.'],
    ['Зарисую луну, пока не набежали облака.','I’ll sketch the moon before the clouds roll in.'],
  ],
  felix:[
    ['В беседке вечером будут играть музыку.','There’ll be music in the pavilion tonight.'],
    ['Я принёс скамейки поближе к сцене.','I moved the benches closer to the stage.'],
  ],
  galina:[
    ['Эту находку принесло приливом.','The tide washed this discovery ashore.'],
    ['Допишу таблички к новым экспонатам.','I’ll finish the labels for the new exhibits.'],
  ],
  aynur:[
    ['Доделаю узор на постаменте.','I’ll finish the pattern on the pedestal.'],
    ['Издалека у статуи совсем другой вид.','The statue looks quite different from afar.'],
  ],
  liza:[
    ['Давай нарисуем мелом прямо на дорожке!','Let’s draw on the path with chalk!'],
    ['Я выучила танец для праздника!','I learned a dance for the festival!'],
  ],
};

const island=[
  ['До чего приятно пройтись перед ужином.','A walk before dinner feels lovely.'],
  ['С моря тянет свежим ветром.','There’s a fresh breeze off the sea.'],
  ['После дождя песок мягче.','The sand feels softer after the rain.'],
  ['Встретимся у берега вечером?','Meet me by the shore this evening?'],
  ['Пойду прогуляюсь другой тропой.','I think I’ll try the other trail today.'],
];

export function residentLines(def){
  const lines=[...(personal[def.id]||[]),...island];
  return {
    ru:[...(def.lines?.ru||[]),...lines.map(([ru])=>ru)],
    en:[...(def.lines?.en||[]),...lines.map(([,en])=>en)],
  };
}
