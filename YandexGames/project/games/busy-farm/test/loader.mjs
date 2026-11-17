import { chromium } from 'playwright';
import fs from 'fs';
const html = fs.readFileSync('/home/claude/busy-farm/static/index.html','utf8').replace('<script src="game.js"></script>','');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w,h,loc,tag] of [[1280,720,'ru-RU','d'],[390,844,'en-US','m'],[844,390,'ru-RU','ml']]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, locale:loc });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html.replace(/url\(([a-z-]+\.woff2)\)/g,'url(file:///home/claude/busy-farm/static/$1)'));
  await p.evaluate(()=>window.__ld(0.45));
  await p.waitForTimeout(2600);
  await p.screenshot({ path:`/home/claude/busy-farm/shots/ld-${tag}.png` });
  console.log(tag, errs.join(';')||'ok');
}
await b.close();
