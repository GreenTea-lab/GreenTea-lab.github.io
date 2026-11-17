// Скины дыр, улучшения, карты и награды
export const SKINS = [
  {id:'metroSteel',price:0,mastery:'metro',rim:[0xb6c8db,0x416799],wall:0x22334a,glow:0x7acaff},
  {id:'cityBrick',price:0,mastery:'town',rim:[0xf08c69,0xffe0a3],wall:0x402e2d,glow:0xffc292},
  {id:'coralPearl',price:0,mastery:'beach',rim:[0xffb39c,0x78e4dc,0xfff2dd],wall:0x25414a,glow:0x8fffee},
  {id:'portAnchor',price:0,mastery:'port',rim:[0x355f9c,0xf7df9a],wall:0x192a40,glow:0x89c9ff},
  {id:'snowCrystal',price:0,mastery:'winter',rim:[0xe6faff,0x829ee8],wall:0x283853,glow:0xc7edff,stars:true},
  {id:'royalRuby',price:0,mastery:'castle',rim:[0xc95c75,0xffd471],wall:0x382339,glow:0xff98bf},
  {id:'fairWheel',price:0,mastery:'fair',rim:[0xffa06b,0xaa9aff,0x8ce8d3],wall:0x3c2c53,glow:0xffd6fa,spin:true},
  {id:'jadeGate',price:0,mastery:'japan',rim:[0x80c8b0,0xffd1dc,0xfff3d8],wall:0x253832,glow:0xc7ffe6},
  {id:'artisanLeaf',price:0,craft:4,rim:[0x6acb8c,0xf8dfac],wall:0x233d30,glow:0xafffc8},
  {id:'artisanCopper',price:0,craft:8,rim:[0xd49463,0x91c9b3],wall:0x3b2c29,glow:0xffc095},
  {id:'artisanCandy',price:0,craft:12,rim:[0xffabd5,0xa5e4ff,0xffe6a2],wall:0x3f2e53,glow:0xffc8ee},
  {id:'festivalBloom',price:0,festival:true,rim:[0xffaedb,0x93e1b1],wall:0x352c44,glow:0xffcaee},
  {id:'festivalSun',price:0,festival:true,rim:[0xffd47e,0xff9469],wall:0x403323,glow:0xffeea6},
  {id:'festivalMoon',price:0,festival:true,rim:[0xa6a8ff,0x8de2df],wall:0x252641,glow:0xc0c6ff,stars:true},
  {id:'festivalFrost',price:0,festival:true,rim:[0xc7efff,0xc9b9ff],wall:0x253349,glow:0xd5fbff,stars:true},
  {id:'desert',price:0,mastery:'oasis',rim:[0xf0c878,0x66c9c6],wall:0x43362a,glow:0x8aeee0},
  {id:'petal',price:0,mastery:'botanical',rim:[0xffd4e0,0x8dd9b0],wall:0x303846,glow:0xc9ffe1},
  {id:'harvest',price:0,mastery:'farm',rim:[0xf3c66b,0x81ac51],wall:0x343323,glow:0xffe49c},
  {id:'amber',price:0,mastery:'autumn',rim:[0xffbd5a,0xc96037],wall:0x402d22,glow:0xffb757},
  {id:'quartz',price:0,mastery:'canyon',rim:[0xb5f0f4,0x9b8fd6],wall:0x242f45,glow:0xa0edff},
  {id:'macaron',price:0,mastery:'candyland',rim:[0xffb3d9,0xbeb6ff,0xfff2c4],wall:0x3a2645,glow:0xffbded},
  {id:'polar',price:0,mastery:'aurora',rim:[0x78e9ce,0xc8dcff],wall:0x192a40,glow:0x9dffe9,stars:true},
  {id:'cyber',price:0,mastery:'neoncity',rim:[0x89ffff,0xff94e6],wall:0x1b193e,glow:0x91eaff,spin:true},
  { id: 'classic', price: 0, rim: [0xffffff], wall: 0x30364a, glow: 0x9fd8ff },
  { id: 'hazard', price: 600, rim: [0xffcc22, 0x2a2a30], wall: 0x3a3424, glow: 0xffd24a },
  { id: 'candy', price: 900, rim: [0xff6aa8, 0xffffff], wall: 0x4a2a44, glow: 0xff9ad0 },
  { id: 'mint', price: 900, rim: [0x5ae0b0, 0xe8fff6], wall: 0x1e3a3a, glow: 0x8af0d0 },
  { id: 'ocean', price: 1500, rim: [0x3a8ae8, 0x6ac0f0, 0xffffff], wall: 0x14284a, glow: 0x6ac0ff },
  { id: 'lava', price: 2200, rim: [0xff5a1a, 0xffb02a], wall: 0x4a1a0a, glow: 0xff7a2a, hot: true },
  { id: 'toxic', price: 2200, rim: [0x8ae03a, 0x2a3a1a], wall: 0x1e3a10, glow: 0xb0ff4a, hot: true },
  { id: 'galaxy', price: 3500, rim: [0x9a6ae0, 0x3a2a6a, 0xffffff], wall: 0x1a1240, glow: 0xb08aff, stars: true },
  { id: 'gold', price: 5000, rim: [0xffd24a, 0xffeaa0, 0xc8961a], wall: 0x3a2a10, glow: 0xffe070 },
  { id: 'rainbow', price: 8000, rim: [0xff4a4a, 0xffa02a, 0xffe02a, 0x5ad05a, 0x3a9ae8, 0x9a5ae0], wall: 0x2a2a3a, glow: 0xffffff, spin: true },
  { id: 'ice', price: 0, ad: 3, rim: [0xbfeaff, 0xffffff, 0x8ad0f0], wall: 0x1e3a50, glow: 0xd0f4ff },
  { id: 'pizza', price: 0, ad: 5, rim: [0xffc23a, 0xe84a3a, 0xffc23a, 0x8a4a2a], wall: 0x4a2a14, glow: 0xffd070 },
  { id: 'zebra', price: 1000, rim: [0xffffff, 0x1d2240], wall: 0x1d2240, glow: 0xffffff },
  { id: 'beachy', price: 1200, rim: [0xffd24a, 0x4ab8e8], wall: 0x14324a, glow: 0x8ad8ff },
  { id: 'grape', price: 1200, rim: [0x9a5ae0, 0x5a2a9a], wall: 0x24123a, glow: 0xc08aff },
  { id: 'honey', price: 1400, rim: [0xffb020, 0xffe080], wall: 0x4a2a0a, glow: 0xffd060 },
  { id: 'melon', price: 1600, rim: [0x3fae5a, 0xffffff, 0xff5a6a], wall: 0x5a1a20, glow: 0xff8a8a },
  { id: 'snowy', price: 1800, rim: [0xffffff, 0xbfe6ff], wall: 0x2a3a50, glow: 0xe8f6ff, stars: true },
  { id: 'sakura', price: 2600, rim: [0xffb8d0, 0xffffff], wall: 0x4a2a3a, glow: 0xffc8dc },
  { id: 'emerald', price: 3000, rim: [0x2ad08a, 0x0a7a4a], wall: 0x0a2a1a, glow: 0x6af0b0 },
  { id: 'sunset', price: 4000, rim: [0xff7a3a, 0xff4a8a, 0x9a5ae0], wall: 0x2a1030, glow: 0xff9a6a },
  { id: 'neon', price: 6000, rim: [0x3affd0, 0xff3ad0], wall: 0x101020, glow: 0x7affea, spin: true },
  { id: 'carnival', price: 0, ad: 4, rim: [0xe84a3a, 0xffd24a, 0x3f8fe8, 0x5cc06a], wall: 0x2a2a3a, glow: 0xffe070, spin: true },
].sort((a, b) => (a.mastery||a.craft||a.festival ? 2e6 : a.ad ? 1e6 + a.ad : a.price) - (b.mastery||b.craft||b.festival ? 2e6 : b.ad ? 1e6 + b.ad : b.price)); // по цене, скины за видео в конце

// постоянные улучшения за монеты: стартовый размер, скорость, затягивание, время в одиночном режиме
export const UPGRADES = [
  { id: 'size', max: 5, cost: (l) => 250 + l * l * 220, val: (l) => l * 0.12 },
  { id: 'speed', max: 5, cost: (l) => 250 + l * l * 220, val: (l) => l * 0.04 },
  { id: 'suck', max: 5, cost: (l) => 200 + l * l * 180, val: (l) => l * 0.35 },
  { id: 'time', max: 5, cost: (l) => 300 + l * l * 260, val: (l) => l * 10 },
];

export const ROUND_TIME = 120;
export const BOTS = 10;
export const XP_LEVEL = (lvl) => 300 + lvl * 150; // опыта до следующего уровня

// Характеры ботов: у каждого своя скорость реакции, жадность до еды и смелость
// skill — насколько умно ищет еду и рулит; aggro — тяга охотиться на дыры; fear — с какого расстояния удирает;
// hunt — дальность погони; lead — упреждение цели; lazy — шанс отвлечься и побродить
export const BOT_TYPES = {
  rookie: { skill: 0.25, aggro: 0.15, fear: 0.4, hunt: 10, lead: 0, lazy: 0.25, speed: -0.08, size: 0 },
  casual: { skill: 0.55, aggro: 0.45, fear: 0.8, hunt: 16, lead: 0.2, lazy: 0.1, speed: 0, size: 0.05 },
  gatherer: { skill: 0.9, aggro: 0.05, fear: 1.4, hunt: 8, lead: 0, lazy: 0, speed: 0.03, size: 0.1 },
  hunter: { skill: 0.7, aggro: 1, fear: 0.6, hunt: 30, lead: 0.6, lazy: 0, speed: 0.08, size: 0.1, likesPlayer: true },
  pro: { skill: 1, aggro: 0.7, fear: 1.1, hunt: 24, lead: 0.5, lazy: 0, speed: 0.06, size: 0.2 },
};
// состав матча по уровню игрока: сначала больше новичков, потом больше охотников и профи
export function botLineup(level, n) {
  const k = Math.min(1, Math.max(0, (level - 1) / 14));
  const want = {
    rookie: 4 - 3 * k,
    casual: 3.5 - 0.5 * k,
    gatherer: 1 + 1 * k,
    hunter: 1 + 1.3 * k,
    pro: 0.5 + 2.2 * k,
  };
  const tot = Object.values(want).reduce((a, b) => a + b, 0);
  const out = [];
  for (const [t, w] of Object.entries(want)) for (let i = 0; i < Math.round((w / tot) * n); i++) out.push(t);
  while (out.length < n) out.push('casual');
  out.length = n;
  return out;
}
