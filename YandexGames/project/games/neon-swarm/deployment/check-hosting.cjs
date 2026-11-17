// Read-only verification; does not authorize, upload or change VK settings.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const root = __dirname;
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const expected = hash(fs.readFileSync(path.join(root, 'build', 'game.js')));
const logFile = path.join(root, 'deploy_log.txt');
const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
const found = [...log.matchAll(/https:\/\/(?:prod|stage)-app54817546-[\w-]+\.pages(?:-ac)?\.vk-apps\.ru\/index\.html/g)].map((m) => m[0]);
const fallback = ['https://prod-app54817546-8324a8c65947.pages-ac.vk-apps.ru/index.html', 'https://stage-app54817546-8324a8c65947.pages.vk-apps.ru/index.html'];
const urls = [...new Set(found.length ? found : fallback)];
function read(url) {
  return new Promise((resolve) => {
    const req = https.get(url.replace(/index\.html$/, 'game.js') + '?check=' + Date.now(), { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'NeonSwarm-BuildCheck' } }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ url, status: res.statusCode, sha256: hash(Buffer.concat(chunks)), modified: res.headers['last-modified'] || null }));
      res.on('error', (e) => resolve({ url, error: e.code || e.message }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', (e) => resolve({ url, error: e.code || e.message }));
  });
}
Promise.all(urls.map(read)).then((results) => {
  for (const result of results) {
    result.matchesLocalBuild = result.status === 200 && result.sha256 === expected;
    console.log((result.matchesLocalBuild ? 'СОВПАДАЕТ: ' : 'НЕ ПОДТВЕРЖДЕНО: ') + result.url);
    if (result.modified) console.log('  Дата файла: ' + result.modified);
    if (result.error) console.log('  Ошибка проверки: ' + result.error);
  }
  const passed = results.every((r) => r.matchesLocalBuild);
  fs.writeFileSync(path.join(root, 'hosting-status.json'), JSON.stringify({ checkedAt: new Date().toISOString(), expected, passed, results }, null, 2));
  if (!passed) console.log('На хостинге другая сборка либо сервер не ответил. Подробности: hosting-status.json.');
  process.exitCode = passed ? 0 : 2;
}).catch((e) => { console.error(e.message); process.exitCode = 1; });
