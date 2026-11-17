// новые бонусы, золотая цель, скины, лента карт на телефоне
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/maps';
const [w, h] = [+(process.argv[2] || 1280), +(process.argv[3] || 720)];
const tag = w < h ? 'phone' : 'pc';
const errs = await run({ w, h, mobile: w < h, steps: async (page) => {
  await page.evaluate(() => { const d = window.__save.data; d.level = 20; d.tutDone = true; d.map = 'winter'; d.coins = 5000; window.__game.menu(); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${tag}_menu.png` });
  await page.evaluate(() => window.__game.play());
  await page.waitForTimeout(2500);
  // бонусы вокруг игрока и золотая цель вдали
  await page.evaluate(() => {
    const g = window.__game, s = g.sim, me = g.me;
    const T = ['speed', 'magnet', 'x2', 'giant', 'shield', 'freeze'];
    T.forEach((type, i) => s.pickups.push({ id: 90000 + i, type, x: me.x + Math.cos(i) * 7, z: me.z + Math.sin(i) * 7, life: 30 }));
    s.goldT = 0;
    s.holes.forEach((h) => { if (h !== me) h.x += 0; });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}_picks.png` });
  const gold = await page.evaluate(() => { const G = window.__game.sim.gold; return G ? { look: G.look, x: G.p.x, z: G.p.z, pts: G.pts } : null; });
  console.log('gold', JSON.stringify(gold));
  // заберём щит и холод
  await page.evaluate(() => { const g = window.__game, me = g.me; me.eff.shield = 10; me.eff.freeze = 6; me.eff.slow = 3; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}_effs.png` });
  // подъедем к золотой цели
  await page.evaluate(() => { const g = window.__game, G = g.sim.gold, me = g.me; if (G) { me.x = G.p.x + 6; me.z = G.p.z + 6; me.mass = Math.max(me.mass, 40); } });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}_gold.png` });
  await page.evaluate(() => window.__game.menu());
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__game.ui.openSkins());
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${tag}_skins.png` });
} });
done(errs);
