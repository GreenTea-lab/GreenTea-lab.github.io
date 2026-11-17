// Настоящая VK-сборка в Chrome; ответы внешней платформы эмулируются родителем iframe.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const out = path.resolve('test-results/moderation');
fs.mkdirSync(out, { recursive: true });
const parent = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden">
<iframe id="f" style="width:100vw;height:100vh;border:0"></iframe>
<script>
const q = new URLSearchParams(location.search);
window.log = []; window.store = JSON.parse(sessionStorage.getItem('cloud') || '{}');
window.adResult = true; window.heldAd = null; window.holdAds = false; window.failKey = '';
window.adCheck = q.get('ads') || 'true';
window.releaseAd = () => { if (heldAd) { const f = heldAd; heldAd = null; f(); } };
addEventListener('message', e => {
  const m = e.data; if (m?.type !== 'vk-connect') return;
  const {handler, params} = m; log.push({handler, params});
  let data = { result: true }, failed = false;
  if (handler === 'VKWebAppStorageGet') data = {keys: params.keys.map(key => ({key, value: store[key] || ''}))};
  if (handler === 'VKWebAppStorageSet') {
    if (params.value.length > 4096 || params.key === failKey) failed = true;
    else { store[params.key] = params.value; sessionStorage.setItem('cloud', JSON.stringify(store)); }
  }
  if (handler === 'VKWebAppShowNativeAds') { failed = adResult === 'error'; data = {result: adResult === true}; }
  if (handler === 'VKWebAppCheckNativeAds') { failed = adCheck === 'error'; data = {result: adCheck === 'true'}; }
  const respond = () => e.source.postMessage({type: handler + (failed ? 'Failed' : 'Result'), data: {...data, request_id: params.request_id, ...(failed ? {error_type:'client_error',error_data:{error_code:1,error_reason:'test'}} : {})}}, '*');
  if (handler === 'VKWebAppShowNativeAds' && holdAds) heldAd = respond;
  else setTimeout(respond, handler === 'VKWebAppCheckNativeAds' && adCheck === 'timeout' ? 6000 : 5);
});
document.querySelector('iframe').src = '/dist-vk/index.html?vk_app_id=123&vk_language=' + (q.get('lang') || 'ru') + '&vk_platform=' + (q.get('platform') || 'desktop_web') + '&vk_client=' + (q.get('client') || 'vk') + '&sign=test';
</script></body></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/parent') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(parent); }
  if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : process.platform === 'win32' ? {channel:'chrome'} : {}) });
const errors = [], report = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loaded(page) {
  const f = page.frames().find(f => f.url().includes('/dist-vk/index.html'));
  assert.ok(f);
  await f.waitForFunction(() => window.__game?.ui && !document.getElementById('loader'));
  return f;
}
async function gesture(page, point, mobile) {
  if (mobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
async function solve(page, f, mobile) {
  for (let n = 0; n < 100; n++) {
    const move = await f.evaluate(() => {
      const A = __game;
      if (A.finished) return null;
      const hint = A.game.hint();
      if (!hint?.safe) throw new Error('No safe solution');
      return hint.pair.map(i => A.view.tileCenter(i));
    });
    if (!move) return;
    for (const p of move) await gesture(page, p, mobile);
  }
  throw new Error('Board did not finish');
}
async function expectStopped(f, delay = 200) {
  const before = await f.evaluate(() => ({time:__game.elapsed,left:__game.game.left}));
  await sleep(delay);
  assert.deepEqual(await f.evaluate(() => ({time:__game.elapsed,left:__game.game.left})), before);
  assert.equal(await f.evaluate(() => __sdk.gameplayOn), false);
}

try {
  for (const cfg of [
    {name:'vk-desktop',w:1280,h:720,mobile:false,platform:'desktop_web'},
    {name:'vk-phone',w:390,h:844,mobile:true,platform:'mobile_android'},
    {name:'vk-ios',w:390,h:844,mobile:true,platform:'mobile_iphone'},
    {name:'ok-small',w:320,h:568,mobile:true,platform:'mobile_iphone',client:'ok'},
    {name:'ok-web',w:1280,h:720,mobile:false,platform:'desktop_web',client:'ok'},
    {name:'ok-android',w:390,h:844,mobile:true,platform:'mobile_android',client:'ok'},
    {name:'vk-landscape-en',w:844,h:390,mobile:true,platform:'mobile_web',lang:'en'},
  ]) {
    const ctx = await browser.newContext({viewport:{width:cfg.w,height:cfg.h},hasTouch:cfg.mobile,isMobile:cfg.mobile,locale:'ru-RU',timezoneId:'Europe/Moscow'});
    await ctx.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      if (NativeAudioContext) window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.__testAudio = this; }
      };
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(cfg.name + ': ' + e.message));
    await page.goto(base + '/parent?' + new URLSearchParams(cfg));
    let f = await loaded(page);
    assert.equal(await f.evaluate(() => __sdk.real), true);
    assert.equal(await f.evaluate(() => innerWidth), cfg.w);
    await page.screenshot({path:path.join(out,cfg.name+'-menu.png')});
    await f.locator('[data-a=journey]').click();
    await f.locator('.lvl.cur').click();
    assert.equal(await f.evaluate(() => __game.game.left), 12);
    await f.locator('[data-go]').click();
    await sleep(500);
    await page.screenshot({path:path.join(out,cfg.name+'-level.png')});
    const initial = await f.evaluate(() => ({tileWidth:__game.view.tw,pairs:__game.game.left/2,par:__game.L.par}));
    if (cfg.name === 'vk-phone') {
      await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppUpdateInsets',data:{top:24,bottom:34,left:0,right:0}},'*'));
      await f.waitForFunction(() => getComputedStyle(document.querySelector('.hbar')).paddingTop === '24px' && __game.view.L.board.y >= 132 && __game.view.L.help.y+__game.view.L.help.h<=innerHeight-34);
      assert.ok(await f.evaluate(()=>__game.view.L.help.y+__game.view.L.help.h<=innerHeight-34));
      await page.screenshot({path:path.join(out,'vk-phone-insets.png')});
      await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppUpdateInsets',data:{top:0,bottom:0,left:0,right:0}},'*'));
      await f.waitForFunction(() => __game.view.L.hud.h === 124);
    }

    // Пауза: реальный жест по ползунку и по фону, попытка нажать плитку под окном.
    await f.locator('[data-a=pause]').click();
    await expectStopped(f);
    const input = f.locator('.vol-in').first();
    await input.scrollIntoViewIfNeeded();
    const box = await input.boundingBox();
    if (cfg.mobile) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.3,y:box.y+box.height/2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.7,y:box.y+box.height/2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.detach();
    } else {
      await page.mouse.move(box.x+box.width*.3,box.y+box.height/2);
      await page.mouse.down(); await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:8}); await page.mouse.up();
    }
    await expectStopped(f);
    const volume = await f.evaluate(() => __save.data.settings.musicVol);
    assert.ok(volume > .4 && volume < .95, 'Volume gesture changed the setting');
    await page.screenshot({path:path.join(out,cfg.name+'-pause.png')});
    const overflow = await f.locator('.mpanel').evaluate(e => e.scrollWidth-e.clientWidth);
    assert.ok(overflow <= 1, 'Pause must not overflow horizontally');
    assert.ok(await f.locator('.vol-box').evaluate(e=>{
      const panel=e.closest('.mpanel').getBoundingClientRect();
      return [...e.querySelectorAll('.vol-v')].every(v=>v.getBoundingClientRect().right<=panel.right-5);
    }), 'Volume percentages must fit inside the panel');
    await gesture(page,{x:2,y:cfg.h/2},cfg.mobile);
    // Прямой pointerdown по canvas тоже должен блокироваться контроллером игры.
    // Экранная координата плитки может совпасть с кнопкой «Продолжить» в самом окне.
    await f.evaluate(() => {
      const tile=__game.view.tileCenter(__game.game.movesList()[0][0]);
      document.getElementById('c').dispatchEvent(new PointerEvent('pointerdown',{clientX:tile.x,clientY:tile.y,bubbles:true}));
    });
    await expectStopped(f);
    assert.equal(await f.evaluate(() => __game.ui.modalOpen), true);

    // Окно правил возвращает именно паузу; фокус/событие платформы не закрывает её.
    await f.locator('[data-a=how]').click();
    await f.locator('.modal .mhead [data-x]').click();
    await expectStopped(f);
    await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppViewRestore',data:{}},'*'));
    await expectStopped(f);
    await f.locator('.modal .mhead [data-x]').click();
    await sleep(100);
    assert.equal(await f.evaluate(() => __game.ui.modalOpen), false);
    await f.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expectStopped(f);
    await f.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expectStopped(f);
    await f.locator('.modal .mhead [data-x]').click();
    await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppViewHide',data:{}},'*'));
    await f.waitForFunction(() => __game.background.has('sdk'));
    await expectStopped(f);
    await page.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppViewRestore',data:{}},'*'));
    await f.waitForFunction(() => !__game.background.has('sdk'));
    await expectStopped(f);
    await f.locator('.modal .mhead [data-x]').click();

    // Первый уровень: снимаем все пары реальными тапами, получаем награду и следующий уровень.
    await solve(page,f,cfg.mobile);
    await f.locator('.result [data-next]').waitFor();
    assert.equal(await f.evaluate(() => __save.data.levels[0].stars > 0), true);
    await f.locator('[data-next]').click();
    assert.equal(await f.evaluate(() => __game.levelIdx), 1);

    // Реклама: запрет второго запроса, остановка таймера/звука/ввода, награда только за true.
    const adsSupported = cfg.client !== 'ok' || cfg.platform === 'mobile_android';
    if (adsSupported) {
    await f.waitForFunction(() => __sdk.canReward());
    await page.evaluate(() => { holdAds = true; });
    await f.evaluate(() => { window.rewards=0; window.done=[]; __sdk.showRewarded(()=>rewards++,ok=>done.push(ok)); });
    await page.waitForFunction(() => !!heldAd);
    await expectStopped(f);
    await f.waitForFunction(() => window.__testAudio?.state === 'suspended');
    assert.equal(await f.evaluate(() => __game.ui.root.inert), true);
    await f.evaluate(() => __sdk.showRewarded(()=>rewards++,ok=>done.push(ok)));
    assert.equal(await f.evaluate(() => rewards), 0);
    await page.evaluate(() => releaseAd());
    await f.waitForFunction(() => !__sdk.adActive);
    assert.equal(await f.evaluate(() => rewards), 1);
    assert.deepEqual(await f.evaluate(() => done), [false,true]);
    assert.equal(await f.evaluate(() => __game.ui.root.inert), false);
    for (const result of [false,'error']) {
      await page.evaluate(result => {holdAds=false;adResult=result;},result);
      const granted = await f.evaluate(() => new Promise(resolve=>__sdk.showRewarded(()=>rewards++,resolve)));
      assert.equal(granted,false); assert.equal(await f.evaluate(() => rewards),1);
    }
    if (cfg.name === 'vk-desktop') {
      // Межэкранная реклама: интервал, покупка отключения и закрытие длинного ролика.
      const before = await page.evaluate(() => log.filter(x => x.handler === 'VKWebAppShowNativeAds').length);
      await f.evaluate(() => {window.interstitialDone = 0; __sdk.lastInterstitial = Date.now(); __sdk.showInterstitial(() => interstitialDone++);});
      await f.evaluate(() => {__sdk.lastInterstitial = 0; __sdk.noAds = true; __sdk.showInterstitial(() => interstitialDone++); __sdk.noAds = false;});
      assert.equal(await page.evaluate(() => log.filter(x => x.handler === 'VKWebAppShowNativeAds').length), before);
      await page.evaluate(() => {holdAds = true; adResult = true;});
      await f.evaluate(() => __sdk.showInterstitial(() => interstitialDone++));
      await page.waitForFunction(() => !!heldAd);
      await expectStopped(f, 5500);
      await f.waitForFunction(() => window.__testAudio?.state === 'suspended');
      await page.evaluate(() => releaseAd());
      await f.waitForFunction(() => !__sdk.adActive);
      assert.equal(await f.evaluate(() => interstitialDone), 3);
      await f.evaluate(() => __sdk.showInterstitial(() => interstitialDone++));
      assert.equal(await f.evaluate(() => interstitialDone), 4);
      assert.equal(await page.evaluate(() => log.filter(x => x.handler === 'VKWebAppShowNativeAds').length), before + 1);
    }
    } else {
      assert.equal(await f.evaluate(() => __sdk.canReward()), false);
      assert.equal(await f.evaluate(() => new Promise(resolve => __sdk.showRewarded(() => { throw new Error('Unsupported reward'); }, resolve))), false);
      assert.ok(!(await page.evaluate(() => log.map(x => x.handler))).some(x => /NativeAds/.test(x)));
    }

    // Крупное сохранение, последовательная запись, обрыв записи до переключения указателя.
    if (cfg.name === 'vk-desktop') {
      await f.evaluate(async () => {
        // Freeze the intended snapshot while the asynchronous cloud writes are exercised.
        __game.ui.pause();
        __game.pair(...__game.game.hint().pair);__game.elapsed=77;__game.checkpoint(false);
        __save.data.styles.push('jade');__game.setStyle('jade');
        __save.data.owned.mat.push('navy');__game.setDecor('mat','navy');
        for(let i=0;i<1000;i++) __save.data.levels[i]={stars:2,time:90};
        __save.data.coins=4321; await __save.flush();
      });
      const store = await page.evaluate(() => store);
      assert.ok(Object.keys(store).length > 10);
      assert.ok(Object.values(store).every(v=>v.length<=4096));
      await page.evaluate(() => {failKey='postcard_mahjong_v1_n';});
      await f.evaluate(async () => {__save.data.coins=9999;await __save.flush();});
      assert.equal(await f.evaluate(async () => (await __sdk.loadData()).coins),4321);
      await page.evaluate(() => {failKey='';});
      await f.evaluate(async () => {
        __save.data.coins=5432; const a=__save.flush();
        __save.data.coins=6543; const b=__save.flush(); await Promise.all([a,b]);
      });
      await f.evaluate(() => localStorage.clear());
      await ctx.addInitScript(()=>{if(location.pathname.endsWith('/dist-vk/index.html'))localStorage.clear();});
      await page.reload(); f=await loaded(page);
      assert.equal(await f.evaluate(() => __save.data.coins),6543);
      assert.equal(await f.evaluate(() => Object.keys(__save.data.levels).length),1000);
      assert.equal(await f.evaluate(()=>__save.data.sessions.level.id),1);
      assert.equal(await f.evaluate(()=>__save.data.sessions.level.elapsed),77);
      assert.equal(await f.evaluate(()=>__save.data.style),'jade');
      assert.equal(await f.evaluate(()=>__save.data.decor.mat),'navy');
      await f.locator('.tile[data-a=store]').click();
      assert.equal(await f.locator('.iap-buy[data-id]').count(),0);
      assert.ok(!(await f.locator('.storem').innerText()).includes('Яндекс'));
      await f.locator('.mhead [data-x]').click();
      await f.locator('[data-a=lb]').click();
      await f.locator('.lb .itxt').filter({hasText:/6543|рекорд/}).first().waitFor();
      assert.ok(!(await f.locator('.lb').innerText()).includes('Яндекс'));
    }

    // Первая открытка: проходим первые 10 уровней без исчерпания помощников/рекламы.
    if (cfg.name === 'vk-phone') {
      await page.evaluate(() => {holdAds=false;adResult=true;});
      for (let i=1;i<10;i++) {
        const intro=f.locator('.intro [data-go]');
        if(await intro.count()) await intro.click();
        await solve(page,f,true);
        if(i<9) { await f.locator('.result [data-next]').click(); }
      }
      await f.locator('.pcm').waitFor();
      assert.equal(await f.evaluate(() => !!__save.data.levels[9]),true);
      await page.screenshot({path:path.join(out,'first-postcard.png')});
      await f.locator('.pcm .mhead [data-x]').click();
      await f.locator('.result [data-lv]').click();
      await f.evaluate(() => {__game.toMenu();__game.ui.album();});
      assert.equal(await f.locator('.albumm .pcard[data-a=pc]').count(),2);
      await page.screenshot({path:path.join(out,'first-album.png')});
    }
    if (cfg.name === 'vk-desktop') {
      // Воспроизводим неудачный выбор пар на первом раскладе, проверяем бесплатный выход.
      await f.evaluate(() => {
        __game.ui.closeModal(); __game.dbg.seed=103; __game.startLevel(0,false);
        __game.ui.closeModal();
        // A saved pre-balance board can still be stuck; new training boards cannot.
        const L=__lib.levels.level(0);
        __game.begin(new __lib.core.Game({pos:L.pos,types:L.types.slice(0,3),seed:103,coins:0,locks:0,hidden:0}),0);
        for (const pair of [[8,11],[4,9],[5,10],[6,7]]) __game.pair(...pair);
        __game.checkStuck();
      });
      const resources=await f.evaluate(()=>({coins:__save.data.coins,boosts:{...__save.data.boosts}}));
      await f.locator('.stuckm [data-sh]').click();
      assert.deepEqual(await f.evaluate(()=>({coins:__save.data.coins,boosts:{...__save.data.boosts}})),resources);
      assert.equal(await f.evaluate(()=>__game.game.canMove()),true);
      await solve(page,f,false);
      await f.locator('.result').waitFor();
    }
    const log=await page.evaluate(()=>log.map(x=>x.handler));
    assert.ok(!log.some(x=>/WallPost|Share|Favorites|Story/.test(x)));
    report.push({name:cfg.name,initial,volume,passed:true});
    console.log('PASS',cfg.name);
    await ctx.close();
  }

  // Нет рекламы, ошибка проверки, молчащий клиент и исчезновение ролика после предложения.
  for (const ads of ['false', 'error', 'timeout', 'lost-false', 'lost-error', 'lost-timeout']) {
    const ctx = await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'});
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('ads-' + ads + ': ' + e.message));
    const offered = ads.startsWith('lost-');
    await page.goto(base + '/parent?ads=' + (offered ? 'true' : ads));
    const f = await loaded(page);
    if (ads === 'timeout') await f.waitForFunction(() => !__sdk._adChecks.reward, null, {timeout:7000});
    else await f.waitForFunction(() => !__sdk._adChecks.reward);
    await f.evaluate(() => __game.ui.store());
    assert.equal(await f.locator('[data-free]').isVisible(), offered);
    if (offered) await page.evaluate(result => {adCheck = result;}, ads.slice(5));
    const coins = await f.evaluate(() => __save.data.coins);
    assert.equal(await f.evaluate(() => new Promise(resolve => __sdk.showRewarded(() => {__save.data.coins += 999;}, resolve))), false);
    assert.equal(await f.evaluate(() => __save.data.coins), coins);
    assert.equal(await f.evaluate(() => __sdk.adActive || __game.ui.root.inert), false);
    assert.equal(await f.locator('[data-free]').isVisible(), false);
    assert.equal(await f.locator('[data-no-reward]').isVisible(), true);
    assert.ok(!(await page.evaluate(() => log.map(x => x.handler))).includes('VKWebAppShowNativeAds'));
    await f.evaluate(() => __game.ui.daily());
    assert.equal(await f.locator('[data-x2]').isVisible(), false);
    await f.locator('[data-take]').click();
    assert.ok(await f.evaluate(() => __save.data.coins) > coins, 'Daily gift must work without advertising');
    await page.screenshot({path:path.join(out,'ads-'+ads+'.png')});
    report.push({name:'ads-'+ads,hiddenUnavailableOffer:true,noShowRequest:true,noFalseReward:true,giftWorks:true,passed:true});
    console.log('PASS ads-' + ads);
    await ctx.close();
  }

  // Автономное превью: быстрое открытие без запросов SDK.
  const ctx=await browser.newContext({locale:'ru-RU',timezoneId:'Europe/Moscow'});
  const p=await ctx.newPage(); const requests=[];
  p.on('request',r=>requests.push(r.url())); p.on('pageerror',e=>errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-14T00:30:00+03:00'));
  await p.goto(base+'/dist-single/index.html');
  await p.waitForFunction(()=>window.__game?.ui);
  assert.ok(!requests.some(u=>u.endsWith('/sdk.js')));
  await p.locator('[data-a=gift]').evaluate(e=>e.click());
  await p.locator('[data-take]').click();
  assert.equal(await p.evaluate(()=>__save.data.daily.day),'2026-11-14');
  await p.reload(); await p.waitForFunction(()=>window.__game?.ui);
  assert.equal(await p.evaluate(()=>__save.data.daily.day),'2026-11-14');
  await ctx.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:new Date().toISOString(),report,errors,platformResponses:'emulated'},null,2));
  console.log('All moderation checks passed.');
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
