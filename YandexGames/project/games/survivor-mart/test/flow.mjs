// Проверка интеграции с SDK: ready, gameplay, реклама, покупки, сохранения, лидерборд
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const catalog = [
  { id: 'coins_1000', title: '1000 зарядов', description: 'Коробка батареек', price: 19 },
  { id: 'coins_3500', title: '3500 зарядов', description: 'Ящик батареек', price: 59 },
  { id: 'coins_10000', title: '10000 зарядов', description: 'Генератор', price: 149 },
  { id: 'disable_ads', title: 'Без рекламы', description: 'Отключает полноэкранную рекламу навсегда', price: 99 },
];
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, quality: 'low' },
  pre: `window.__MOCK_CATALOG = ${JSON.stringify(catalog)};`,
  steps: async (page) => {
    const calls = () => page.evaluate(() => window.__calls.slice());
    const bat = () => page.evaluate(() => window.__save.data.bat);
    const gp = async () => (await calls()).filter((c) => c.startsWith('gp.')).slice(-1).join('');
    console.log('старт:', (await calls()).join(' | '));
    // магазин: покупка зарядов и отключение рекламы
    await page.click('[data-a="store"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shots/store.png' });
    const b0 = await bat();
    await page.click('.iap-buy[data-id="coins_1000"]');
    await page.waitForTimeout(900);
    console.log('покупка 1000:', b0, '->', await bat(), '|', (await calls()).slice(-3).join(' | '));
    await page.click('.iap-buy[data-id="disable_ads"]');
    await page.waitForTimeout(900);
    console.log('без рекламы:', await page.evaluate(() => window.__save.data.noAds), '| кнопки:', await page.evaluate(() => Array.from(document.querySelectorAll('.iap-buy')).map((b) => b.dataset.id || b.textContent).join(',')));
    // ролик за награду
    const b1 = await bat();
    await page.click('[data-free]');
    await page.waitForTimeout(1200);
    console.log('ролик в магазине:', b1, '->', await bat(), '|', (await calls()).slice(-2).join(' | '));
    await page.evaluate(() => window.__game.ui.closeModal());
    // подарок дня x3
    await page.evaluate(() => window.__game.ui.daily());
    await page.waitForTimeout(300);
    const b2 = await bat();
    await page.click('[data-x3]');
    await page.waitForTimeout(1200);
    console.log('подарок x3:', b2, '->', await bat());
    // утро: планшет, посылка за рекламу, открыть лавку
    await page.click('[data-a="play"]');
    await page.waitForTimeout(800);
    const st0 = await page.evaluate(() => JSON.stringify(window.__save.data.stock));
    await page.click('[data-crate]');
    await page.waitForTimeout(1200);
    console.log('посылка:', st0 !== (await page.evaluate(() => JSON.stringify(window.__save.data.stock))) ? 'склад пополнен' : 'НЕ пополнен', '| gameplay:', await gp());
    await page.click('[data-open]');
    await page.waitForTimeout(600);
    console.log('открыли лавку:', await gp());
    await page.evaluate(() => window.__game.ui.pause());
    await page.waitForTimeout(300);
    console.log('пауза:', await gp());
    await page.click('[data-r]');
    await page.waitForTimeout(300);
    console.log('продолжили:', await gp());
    // нокаут и подъём за рекламу
    await page.evaluate(() => { const w = window.__game.w; w.P.ko = true; w.P.hp = 0; w.emit('ko'); window.__game.handleFx(); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shots/ko.png' });
    await page.click('[data-rv]');
    await page.waitForTimeout(1200);
    console.log('подъём (ko,hp):', await page.evaluate(() => [window.__game.w.P.ko, Math.round(window.__game.w.P.hp)].join(',')));
    // конец дня: итоги, x2, interstitial не показывается после покупки
    await page.evaluate(() => { const w = window.__game.w; w.sum.sales = 50; w.dawn(); window.__game.handleFx(); });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: 'shots/summary.png' });
    const b3 = await bat();
    await page.click('[data-x2]');
    await page.waitForTimeout(1200);
    console.log('x2 выручки:', b3, '->', await bat());
    const n0 = (await calls()).length;
    await page.click('[data-n]');
    await page.waitForTimeout(1500);
    console.log('новый день:', await page.evaluate(() => window.__save.data.day), '| вызовы:', (await calls()).slice(n0).join(' | '));
    // лидерборд
    await page.evaluate(() => window.__game.toMenu());
    await page.waitForTimeout(500);
    await page.click('[data-a="lb"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shots/lb.png' });
    console.log('лидерборд:', await page.evaluate(() => document.querySelector('.lb').innerText.replace(/\n/g, ' ').slice(0, 120)));
    await page.evaluate(() => window.__game.ui.closeModal());
    // сохранение пережило перезагрузку
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.ui && !document.getElementById('loader'), null, { timeout: 40000 });
    console.log('после перезагрузки: день', await page.evaluate(() => window.__save.data.day), 'noAds', await page.evaluate(() => window.__save.data.noAds));
  },
});
done(errs);
