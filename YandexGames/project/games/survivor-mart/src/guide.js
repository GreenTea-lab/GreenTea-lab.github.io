// Гайд по всей игре: управление, день, ночь, зомби, люди, вылазки, постройки, оружие, навыки, заряды
import { IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { input } from './input.js';
import { RECIPES, WEAPONS, BUILD, BUILD_IDS, ZOMBIES, Z_IDS, LOCS, ROLES, WAGE, TRAIN_COST, HEAL } from './data.js';
import { itemThumb, zombieThumb, staffThumb } from './thumbs.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (src) => (src ? `<img src="${src}" alt="">` : '');
const kbd = (k) => `<kbd>${esc(k)}</kbd>`;
const p = (s) => `<p>${s}</p>`;
const li = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;

const TXT = {
  ru: {
    title: 'Гайд',
    ch_ctrl: 'Управление', ch_day: 'День в лавке', ch_price: 'Цены и репутация', ch_bench: 'Верстак', ch_night: 'Ночь', ch_z: 'Зомби', ch_staff: 'Люди', ch_trips: 'Вылазки', ch_build: 'Постройки', ch_gear: 'Оружие', ch_skills: 'Уровни и навыки', ch_bat: 'Заряды и бонусы',
    ctrlK: [
      `${kbd('W A S D')} или стрелки: ходить`,
      `${kbd('Пробел')}, ${kbd('E')} или ${kbd('Enter')}: действие. Подсказка с названием действия видна справа внизу, когда стоишь у полки, склада, кассы, машины или раскладушки`,
      `Удар по зомби идёт сам, когда он рядом. ${kbd('Пробел')} тоже бьёт`,
      `${kbd('H')} или ${kbd('Q')}: лечиться бинтом или аптечкой со склада`,
      `${kbd('Esc')} или ${kbd('P')}: пауза. Из паузы открываются планшет, гайд и меню`,
      `Батарейки на кассе и кнопки в окнах нажимаются мышкой`,
    ],
    ctrlT: [
      'Левая половина экрана: джойстик. Коснись и веди пальцем',
      'Большая круглая кнопка справа внизу: действие. На ней написано, что произойдёт: «Склад», «Выложить», «Обыскать», «Чинить», «Лечь спать»',
      'Удар по зомби идёт сам, когда он рядом. Кнопка действия тоже бьёт',
      'Кнопка с аптечкой у полоски здоровья: лечиться',
      'Кнопка с двумя полосками справа вверху: пауза. Оттуда открываются планшет, гайд и меню',
      'Батарейки на кассе нажимаются пальцем',
    ],
    day: [
      'Лавка открыта с 8:00 до 20:00. Часы вверху по центру.',
      `<b>Склад</b> (ящики справа в глубине): подойди и нажми действие, выбери товар. В руках до 6 штук.`,
      `<b>Полки</b>: подойди к полке с тем же товаром или к пустой и нажми действие. Покупатели берут только с полок.`,
      `<b>Касса</b>: встань за прилавок с кассой. Внизу появится окно покупателя: товары, сумма и батарейки, которыми он платит.`,
      `<b>Тестер</b>: нажимай на каждую батарейку со знаком «?». Зелёный процент — рабочая. Красная — дохлая: нажми на неё ещё раз, и покупатель даст другую. Когда все зелёные, жми «Принять».`,
      'Если принять дохлую батарейку, заряд не придёт, а хитрец уйдёт довольный.',
      'Иногда приходит бедолага без зарядов. «Отдать даром» поднимет репутацию, «Отказать» её не тронет.',
      'Покупатель уходит злым, если долго ждёт или нужного товара нет на полках.',
      'Места с блёстками на стоянке (машины, тележки, баки, ящики) можно обыскать: стой рядом с кнопкой действия, пока круг не заполнится. Находки сразу попадают на склад.',
      'Днём со 2-го дня иногда приходят зомби, и с каждым днём чаще. Покупатели от них убегают, поэтому прогоняй сразу.',
      'В 19:00 звенит колокольчик, в 20:00 лавка закрывается. Последние покупатели уходят, потом наступает ночь.',
    ],
    price: [
      'Во вкладке «Цены» на планшете для каждого товара три цены: «Дёшево», «Обычно», «Дорого».',
      'Дёшево: меньше зарядов, но репутация растёт. Дорого: больше зарядов, но репутация падает.',
      'Репутация (значок рукопожатия) от 0 до 100. Чем она выше, тем больше покупателей и тем меньше хитрецов с дохлыми батарейками. С 80 покупатели оставляют чаевые.',
      'Репутацию поднимают вежливые продажи и подарки бедолагам. Роняют её злые покупатели, дохлые батарейки, которые ты пропустил, и украденный товар.',
      'Звания: Барыга, Торгаш, Лавочник, Добрый сосед, Герой квартала.',
    ],
    bench: 'Верстак слева в глубине лавки. Подойди и нажми действие, выбери рецепт. Делается до 4 вещей в очереди, пока ты занят другим. Уровень верстака поднимается во вкладке «Лавка». Рецепты:',
    night: [
      'Ночь длится с 20:00 до 6:00 и кончается по часам. Убивать всех зомби не обязательно.',
      'Двери закрыты на баррикады, но ты проходишь через дверь сам. Можно сидеть внутри, а можно выйти на стоянку.',
      'Снаружи зомби бродят и идут на шум. Драка только вблизи: подойди вплотную, удар идёт сам. Рогатка и гвоздемёт бьют издалека.',
      'Зомби ломают баррикады на двери и окнах. Полоска над проёмом показывает прочность. Подойди изнутри или снаружи и нажми «Чинить», каждый раз тратится 1 доска.',
      'Если баррикада сломана, зомби залезут внутрь и начнут портить товар и заряды. Счётчик зомби вверху краснеет и пишет, сколько их в лавке.',
      `Лечение: ${kbd('H')} или кнопка с аптечкой. Бинт лечит ${HEAL.bandage}, аптечка ${HEAL.medkit}.`,
      'Ночью места на стоянке снова полны: там больше деталей, химии, досок и батареек, чем днём.',
      'Капканы ставятся у входов: подойди к отметке и нажми действие. Капкан срабатывает один раз: держит зомби на месте пару секунд и сильно ранит.',
      'Раскладушка в глубине лавки: «Лечь спать». Ночь идёт в 8 раз быстрее, и ты лечишься. Нельзя уснуть, если рядом зомби. Если зомби ворвутся, сломают баррикаду или укусят, ты проснёшься. «Проснуться» можно и самому.',
      'Каждая 3-я ночь — орда: зомби приходят тремя волнами. Каждая 10-я — Здоровяк.',
      'Если тебя уронили, можно встать за рекламу или ждать утра: пропадёт 15% зарядов и 20% товара со склада.',
    ],
    z: 'Новые виды приходят с определённого дня. Прогноз на ночь во вкладке «План» показывает, кто будет новеньким.',
    zFrom: 'с {n}-го дня', zBoss: 'каждая 10-я ночь',
    staff: [
      'Вкладка «Люди» на планшете. Каждое утро приходят 3 кандидата.',
      'Найм стоит 3 дневные зарплаты. Зарплата списывается каждое утро. Если зарядов не хватило, работник сидит без дела, пока не заплатишь.',
      'Мест в команде: 1 + уровень кроватей (вкладка «Лавка»).',
      'Кнопка со стрелкой вверх у работника: обучить. Уровень поднимает скорость, силу и добычу, но и зарплату.',
      'Раненый работник отдыхает один день.',
      'Крестик: уволить.',
    ],
    roles: { scav: 'Ходит на вылазки, утром уходит, к 18:00 приносит товар и материалы.', cashier: 'Стоит на кассе и проверяет батарейки, пока ты занят.', stocker: 'Носит товар со склада на полки.', guard: 'Днём прогоняет зомби, ночью стоит у двери и бьёт тех, кто подошёл.' },
    trips: [
      'Нужен хотя бы один добытчик. Вкладка «Вылазки»: нажми на место, и добытчики пойдут туда со следующего утра.',
      'Новые места открываются кнопкой «Разведать» за заряды.',
      'Чем опаснее место, тем дороже добыча и тем выше шанс, что добытчик вернётся раненым и пропустит день.',
      'Добытчики возвращаются к 18:00, находки сразу ложатся на склад. Навык «Карты района» увеличивает добычу.',
    ],
    tripsLoc: 'Места:',
    build: 'Вкладка «Лавка» на планшете. Цена растёт с каждым уровнем. Радиовышке нужны ещё и материалы: собери все 5 частей, чтобы подать сигнал и получить концовку и 1000 зарядов.',
    gear: 'Вкладка «Оружие». Купленное оружие остаётся навсегда, «Взять» меняет его в руках. Ближнее бьёт вплотную, лопата и топор задевают нескольких. Рогатка и гвоздемёт стреляют издалека, но каску Прораба почти не пробивают.',
    gearCols: ['Урон', 'Дальность', 'Цена'],
    skills: [
      'Опыт идёт за продажи, убитых зомби и находки. Новый уровень даёт 1 очко навыка.',
      'Вкладка «Навыки»: 4 ветки по 4 ступени, открываются по порядку.',
      '<b>Сервис</b>: быстрее тестер, видно подозрительные батарейки, чаевые, репутация растёт быстрее.',
      '<b>Выживание</b>: больше здоровья, сильнее удар, быстрее бег, ночью лечишься.',
      '<b>Управление</b>: зарплаты ниже, работники быстрее, добытчики приносят больше, покупателей больше.',
      '<b>Мастерство</b>: верстак быстрее, шанс сделать вдвое больше, баррикады прочнее.',
    ],
    bat: [
      'Заряды (значок батарейки вверху слева) — деньги игры. За них нанимают, строят, покупают оружие и места для вылазок.',
      'Утром во вкладке «План»: «Посылка с припасами» раз в день за рекламу.',
      'В итогах дня кнопка «x2» удваивает выручку за рекламу.',
      'В меню: «Подарок дня» (растёт, если заходить каждый день, x3 за рекламу) и магазин с наборами зарядов.',
      'Таблица лучших считает все заработанные заряды.',
    ],
  },
  en: {
    title: 'Guide',
    ch_ctrl: 'Controls', ch_day: 'Running the shop', ch_price: 'Prices & reputation', ch_bench: 'Workbench', ch_night: 'Night', ch_z: 'Zombies', ch_staff: 'Staff', ch_trips: 'Scavenging trips', ch_build: 'Upgrades', ch_gear: 'Weapons', ch_skills: 'Levels & skills', ch_bat: 'Charge & bonuses',
    ctrlK: [
      `${kbd('W A S D')} or arrows: move`,
      `${kbd('Space')}, ${kbd('E')} or ${kbd('Enter')}: action. The action name shows bottom right when you stand at a shelf, storage, register, car or cot`,
      `You hit zombies automatically when they are close. ${kbd('Space')} hits too`,
      `${kbd('H')} or ${kbd('Q')}: heal with a bandage or medkit from storage`,
      `${kbd('Esc')} or ${kbd('P')}: pause. Pause opens the tablet, the guide and the menu`,
      'Click batteries at the register and buttons in windows with the mouse',
    ],
    ctrlT: [
      'Left half of the screen: joystick. Touch and drag',
      'Big round button bottom right: action. It says what will happen: "Storage", "Stock", "Search", "Repair", "Go to sleep"',
      'You hit zombies automatically when they are close. The action button hits too',
      'Medkit button next to the health bar: heal',
      'Button with two bars top right: pause. Pause opens the tablet, the guide and the menu',
      'Tap batteries at the register',
    ],
    day: [
      'The shop is open 8:00 to 20:00. The clock is at the top center.',
      '<b>Storage</b> (boxes at the back right): walk up, press action and pick an item. You carry up to 6.',
      '<b>Shelves</b>: walk up to a shelf with the same item or an empty one and press action. Customers only take from shelves.',
      '<b>Register</b>: stand behind the counter. A customer window opens at the bottom: items, total and the batteries they pay with.',
      '<b>Tester</b>: tap each battery marked "?". A green percent means good. Red means dead: tap it again and the customer swaps it. When all are green, press "Accept".',
      'If you accept a dead battery, you get no charge and the trickster leaves happy.',
      'Sometimes a poor soul has no charge. "Give for free" raises reputation, "Refuse" does not change it.',
      'Customers leave angry if they wait too long or the item they want is not on the shelves.',
      'Sparkling spots in the lot (cars, trolleys, bins, crates) can be searched: stand next to one with the action button until the circle fills. Finds go straight to storage.',
      'From day 2 zombies sometimes show up by day, more often each day. Customers run from them, so chase them off right away.',
      'At 19:00 the bell rings, at 20:00 the shop closes. The last customers leave, then night falls.',
    ],
    price: [
      'The Prices tab on the tablet has three prices per item: "Cheap", "Normal", "Pricey".',
      'Cheap: less charge but reputation grows. Pricey: more charge but reputation drops.',
      'Reputation (handshake icon) goes from 0 to 100. Higher means more customers and fewer tricksters with dead batteries. From 80 customers leave tips.',
      'Reputation grows with good sales and gifts to the poor. It drops with angry customers, dead batteries you missed and stolen goods.',
      'Ranks: Profiteer, Hustler, Shopkeeper, Good neighbor, Block hero.',
    ],
    bench: 'The workbench is at the back left. Walk up, press action and pick a recipe. Up to 4 items queue while you do other things. Upgrade the bench in the Shop tab. Recipes:',
    night: [
      'Night lasts from 20:00 to 6:00 and ends by the clock. You do not have to kill every zombie.',
      'Doors are barricaded, but you can walk through the door yourself. Stay inside or head out into the lot.',
      'Outside, zombies roam and follow noise. Fighting is up close: walk right up and you hit automatically. The slingshot and nail gun hit from range.',
      'Zombies break the barricades on the door and windows. The bar above an opening shows its strength. Walk up from inside or outside and press "Repair", each repair uses 1 plank.',
      'If a barricade breaks, zombies climb in and spoil goods and charge. The zombie counter at the top turns red and shows how many are inside.',
      `Healing: ${kbd('H')} or the medkit button. A bandage heals ${HEAL.bandage}, a medkit ${HEAL.medkit}.`,
      'At night the lot spots fill up again: more parts, chemicals, planks and charge than by day.',
      'Traps go by the entrances: walk up to a mark and press action. A trap fires once: it holds a zombie for a couple of seconds and hurts it badly.',
      'The cot at the back of the shop: "Go to sleep". Night goes 8 times faster and you heal. You cannot fall asleep with zombies nearby. You wake up if zombies break in, break a barricade or bite you. You can also press "Wake up".',
      'Every 3rd night is a horde: zombies come in three waves. Every 10th brings the Big Fella.',
      'If you get knocked out, get up for an ad or wait for morning: you lose 15% of charge and 20% of stored goods.',
    ],
    z: 'New kinds arrive from a certain day. The night forecast in the Plan tab shows who is new.',
    zFrom: 'from day {n}', zBoss: 'every 10th night',
    staff: [
      'The People tab on the tablet. 3 candidates come every morning.',
      'Hiring costs 3 days of wages. Wages are paid every morning. If you are short on charge, the worker idles until paid.',
      'Team slots: 1 + Beds level (Shop tab).',
      'The up-arrow button next to a worker: train. A level makes them faster, stronger and better at finding loot, but raises the wage.',
      'A hurt worker rests for one day.',
      'The cross: fire.',
    ],
    roles: { scav: 'Goes on trips: leaves in the morning, brings goods and materials by 18:00.', cashier: 'Works the register and checks batteries while you are busy.', stocker: 'Carries goods from storage to the shelves.', guard: 'Chases off zombies by day, stands at the door at night and hits whoever comes close.' },
    trips: [
      'You need at least one scavenger. Trips tab: tap a place and scavengers go there from next morning.',
      'New places open with the "Scout" button for charge.',
      'The more dangerous the place, the better the loot and the higher the chance a scavenger comes back hurt and misses a day.',
      'Scavengers return by 18:00 and finds go straight to storage. The "Neighborhood maps" skill boosts loot.',
    ],
    tripsLoc: 'Places:',
    build: 'The Shop tab on the tablet. The price grows with each level. The radio tower also needs materials: build all 5 parts to send a signal and get the ending plus 1000 charge.',
    gear: 'The Weapons tab. Bought weapons stay forever, "Equip" switches what you hold. Melee hits up close, the shovel and axe hit several at once. The slingshot and nail gun shoot from range, but barely dent the Hardhat’s helmet.',
    gearCols: ['Damage', 'Range', 'Price'],
    skills: [
      'You get XP for sales, zombie kills and finds. Each new level gives 1 skill point.',
      'The Skills tab: 4 branches of 4 steps, unlocked in order.',
      '<b>Service</b>: faster tester, see suspicious batteries, tips, faster reputation.',
      '<b>Survival</b>: more health, harder hits, faster running, healing at night.',
      '<b>Management</b>: lower wages, faster workers, better trips, more customers.',
      '<b>Crafting</b>: faster bench, chance to make double, sturdier barricades.',
    ],
    bat: [
      'Charge (battery icon top left) is the money of the game. Use it to hire, build, buy weapons and open trip places.',
      'In the morning, the Plan tab has a "Supply drop" once a day for an ad.',
      'In the day summary, "x2" doubles your sales for an ad.',
      'In the menu: the "Daily gift" (grows if you come back daily, x3 for an ad) and the store with charge packs.',
      'The leaderboard counts all the charge you have ever earned.',
    ],
  },
};

const CH = ['ctrl', 'day', 'price', 'bench', 'night', 'z', 'staff', 'trips', 'build', 'gear', 'skills', 'bat'];
const CH_IC = { ctrl: 'hand', day: 'register', price: 'tag', bench: 'bench', night: 'moon', z: 'zombie', staff: 'staff', trips: 'map', build: 'hammer', gear: 'weapon', skills: 'skill', bat: 'bat' };

export function guideBody(ch) {
  const T = TXT[LANG === 'ru' ? 'ru' : 'en'];
  const ins = (r) => Object.entries(r.in).map(([k, n]) => `${img(itemThumb(k))}${n}`).join(' ');
  switch (ch) {
    case 'ctrl':
      return `<h4>${esc(input.isTouch ? t('gTouch') : t('gKeys'))}</h4>${li(input.isTouch ? T.ctrlT : T.ctrlK)}<h4>${esc(input.isTouch ? t('gKeys') : t('gTouch'))}</h4>${li(input.isTouch ? T.ctrlK : T.ctrlT)}`;
    case 'day':
      return li(T.day);
    case 'price':
      return li(T.price);
    case 'bench':
      return p(T.bench) + `<div class="gtab">${RECIPES.map((r) => `<div class="grow">${img(itemThumb(r.id))}<b>${esc(t('it_' + r.id))}${r.out > 1 ? ' ×' + r.out : ''}</b><span>${ins(r)}</span><small>${esc(t('benchLvl', { n: r.lvl + 1 }))}</small></div>`).join('')}</div>`;
    case 'night':
      return li(T.night);
    case 'z':
      return p(T.z) + `<div class="gtab">${Z_IDS.map((k) => `<div class="grow z">${img(zombieThumb(k))}<div><b>${esc(t('zn_' + k))}</b> <small>${esc(k === 'boss' ? T.zBoss : T.zFrom.replace('{n}', ZOMBIES[k].from))}</small><br>${esc(t('zd_' + k))} <i>${esc(t('zt_' + k))}</i></div></div>`).join('')}</div>`;
    case 'staff':
      return li(T.staff) + `<div class="gtab">${ROLES.map((r, i) => `<div class="grow z">${img(staffThumb(r, 11 + i))}<div><b>${esc(t('role_' + r))}</b><br>${esc(T.roles[r])}</div></div>`).join('')}</div><p class="gnote">${esc(t('gWages', { a: WAGE[1], b: WAGE[5], c: TRAIN_COST[2], d: TRAIN_COST[5] }))}</p>`;
    case 'trips':
      return li(T.trips) + p(`<b>${esc(T.tripsLoc)}</b>`) + `<div class="gtab">${LOCS.map((L) => `<div class="grow"><b>${esc(t('loc_' + L.id))}</b><span>${Object.keys(L.loot).map((k) => img(itemThumb(k))).join('')}</span><small>${L.cost ? fmt(L.cost) + ' ' + IC.bat + ' · ' : ''}${esc(t('danger'))} ${Math.round(L.danger * 100)}%</small></div>`).join('')}</div>`;
    case 'build':
      return p(T.build) + `<div class="gtab">${BUILD_IDS.map((id) => `<div class="grow"><b>${esc(t('b_' + id))}</b><span>${esc(t('b_' + id + '_d'))}</span><small>${BUILD[id].max} × · ${fmt(BUILD[id].cost[0])}–${fmt(BUILD[id].cost[BUILD[id].max - 1])} ${IC.bat}</small></div>`).join('')}</div>`;
    case 'gear':
      return p(T.gear) + `<div class="gtab">${WEAPONS.map((W) => `<div class="grow"><b>${esc(t('w_' + W.id))}</b><span>${esc(T.gearCols[0])} ${W.dmg} · ${esc(W.ranged ? t('ranged') : t('melee'))}${W.arc ? ' · ' + esc(t('arc')) : ''}</span><small>${W.cost ? fmt(W.cost) + ' ' + IC.bat : '—'}</small></div>`).join('')}</div>`;
    case 'skills':
      return li(T.skills);
    case 'bat':
      return li(T.bat);
  }
  return '';
}

export function guideTitle() {
  return TXT[LANG === 'ru' ? 'ru' : 'en'].title;
}
export const guideChapters = () => CH.map((k) => ({ k, ic: CH_IC[k], name: TXT[LANG === 'ru' ? 'ru' : 'en']['ch_' + k] }));
