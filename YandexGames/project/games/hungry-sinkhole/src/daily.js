// Задания дня и ежедневный подарок
export const GIFTS = [40, 60, 80, 100, 130, 160, 250];

// need и награда растут с уровнем игрока: [новичок, средний, опытный]
const QUESTS = [
  { id: 'cars', need: [12, 25, 40], reward: [60, 90, 130] },
  { id: 'people', need: [30, 60, 100], reward: [50, 80, 120] },
  { id: 'trees', need: [15, 30, 50], reward: [50, 80, 120] },
  { id: 'blocks', need: [80, 200, 400], reward: [70, 100, 150] },
  { id: 'kills', need: [1, 3, 6], reward: [70, 110, 160] },
  { id: 'picks', need: [3, 6, 10], reward: [50, 80, 120] },
  { id: 'rounds', need: [2, 3, 5], reward: [50, 80, 110] },
  { id: 'size', need: [4, 8, 14], reward: [60, 90, 130], max: true },
  { id: 'win', need: [1, 1, 2], reward: [80, 110, 150] },
  { id: 'solo', need: [20, 35, 50], reward: [70, 100, 140], max: true },
  { id: 'gold', need: [1, 2, 3], reward: [60, 90, 130] },
];

export function today(now = new Date()) {
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return today(d);
}

export function normalizeDaily(value){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value.day)||!Array.isArray(value.q)||value.q.length!==3)return null;
  const ids=new Set(),q=[];
  for(const entry of value.q){
    const spec=QUESTS.find(s=>s.id===entry?.id);
    // Some tiers share the same target, e.g. one win, but have different rewards.
    // Preserve a valid saved tier while still replacing arbitrary reward amounts.
    let tier=spec?.need.findIndex((n,i)=>n===entry?.need&&spec.reward[i]===entry?.reward);
    if(tier<0)tier=spec?.need.indexOf(entry?.need);
    if(!spec||tier<0||ids.has(spec.id))return null;
    ids.add(spec.id);
    q.push({id:spec.id,n:Number.isFinite(entry.n)?Math.max(0,Math.min(entry.need,Math.floor(entry.n))):0,need:entry.need,reward:spec.reward[tier],max:!!spec.max,got:entry.got===true});
  }
  return {day:value.day,q};
}

// три задания на день: одинаковые весь день, новые завтра
export function ensureDaily(d) {
  const day = today();
  if (d.daily && d.daily.day === day && Array.isArray(d.daily.q) && d.daily.q.length===3 && d.daily.q.every(q=>q&&typeof q.id==='string'&&Number.isFinite(q.n)&&Number.isFinite(q.need)&&Number.isFinite(q.reward))) return false;
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tier = d.level < 5 ? 0 : d.level < 12 ? 1 : 2;
  const pool = QUESTS.filter((q) => !(q.id === 'solo' && d.level < 2));
  const q = [];
  while (q.length < 3 && pool.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    const [x] = pool.splice(h % pool.length, 1);
    q.push({ id: x.id, n: 0, need: x.need[tier], reward: x.reward[tier], max: !!x.max, got: false });
  }
  d.daily = { day, q };
  return true;
}

// прибавить прогресс; возвращает задания, которые только что выполнились
export function questAdd(d, id, n) {
  if (!d.daily) return [];
  const out = [];
  for (const q of d.daily.q) {
    if (q.id !== id || q.n >= q.need) continue;
    q.n = q.max ? Math.max(q.n, Math.floor(n)) : q.n + n;
    if (q.n >= q.need) {
      q.n = q.need;
      out.push(q);
    }
  }
  return out;
}

export function questsReady(d) {
  return d.daily ? d.daily.q.filter((q) => q.n >= q.need && !q.got).length : 0;
}

// подарок дня: серия заходов подряд, после 7-го дня по кругу
export function giftReady(d) {
  return d.gift.last !== today();
}
export function giftDay(d) {
  return d.gift.last === yesterday() ? d.gift.streak % GIFTS.length : 0;
}
export function takeGift(d) {
  const k = giftDay(d);
  d.gift = { last: today(), streak: k + 1 };
  return GIFTS[k];
}
