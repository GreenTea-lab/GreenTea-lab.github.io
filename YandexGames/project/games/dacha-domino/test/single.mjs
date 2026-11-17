import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file:///home/claude/cs/dist-single/index.html');
await p.waitForFunction(() => window.__game && !document.getElementById('loader'), null, { timeout: 40000 });
await p.click('[data-a="play"]'); await p.waitForTimeout(4000);
await p.screenshot({ path: '/tmp/claude-0/single.png' });
console.log(errs.length ? errs.join('\n') : 'NO ERRORS'); await b.close();
