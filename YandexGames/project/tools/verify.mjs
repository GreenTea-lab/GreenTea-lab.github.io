import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createLocalServer } from './games.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const games = JSON.parse(fs.readFileSync('catalog/games.json', 'utf8'));
const inventory = JSON.parse(fs.readFileSync('catalog/archive-files.json', 'utf8'));
const imported = JSON.parse(fs.readFileSync('catalog/imported-files.json', 'utf8'));
const allowEdits = process.argv.includes('--allow-edits');
const errors = [], edits = [];
const report = { date: new Date().toISOString(), games: games.length, materialFiles: 0, importedWorkingFiles: 0, sourceModules: 0, inlineScripts: 0, localResources: 0, httpPages: 0 };
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const item of inventory.filter((x) => x.localPath)) {
  if (!fs.existsSync(item.localPath) || hash(item.localPath) !== item.sha256) errors.push(`Material differs: ${item.localPath}`);
  report.materialFiles++;
}
for (const item of imported) {
  if (!fs.existsSync(item.path) || hash(item.path) !== item.sha256) {
    (allowEdits ? edits : errors).push(`Working file differs from import: ${item.path}`);
  }
  report.importedWorkingFiles++;
}
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${directory}/${e.name}`) : [`${directory}/${e.name}`]);
}
function checkReference(from, url) {
  if (!url || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url)) return;
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const target = clean.startsWith('/') ? path.join(root, clean) : path.resolve(path.dirname(from), clean);
  if (!fs.existsSync(target)) errors.push(`Missing local resource in ${from}: ${url}`);
  report.localResources++;
}
function checkHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  // HTML strings inside JavaScript contain runtime template expressions, not file references.
  const resourceHtml = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
  if (!/<meta[^>]+charset\s*=\s*["']?utf-8/i.test(html)) errors.push(`Missing UTF-8 declaration: ${file}`);
  for (const m of resourceHtml.matchAll(/<(?:script|img|link|a|audio|video|source)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) checkReference(file, m[1]);
  for (const m of resourceHtml.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)) checkReference(file, m[2]);
  for (const [index, m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()) {
    if (/\bsrc=|type=["'](?:application\/ld\+json|application\/json)/i.test(m[1])) continue;
    try {
      if (/type=["']module/i.test(m[1])) new vm.SourceTextModule(m[2], { identifier: `${file}#${index}` });
      else new vm.Script(m[2], { filename: `${file}#${index}` });
      report.inlineScripts++;
    } catch (e) { errors.push(`Invalid inline script ${file}#${index}: ${e.message}`); }
  }
}
const originalShelf = fs.readFileSync('index.html', 'utf8');
for (const game of games) {
  if (!originalShelf.includes(`href="${game.preview.path}"`)) errors.push(`Shelf does not link current preview: ${game.id}`);
  if (!fs.existsSync(game.source.path)) errors.push(`Missing working source: ${game.source.path}`);
  if (game.kind === 'modular-source') {
    for (const file of walk(`${game.directory}/src`).filter((p) => /\.(?:js|mjs)$/.test(p))) {
      const code = fs.readFileSync(file, 'utf8');
      try { new vm.SourceTextModule(code, { identifier: file }); report.sourceModules++; }
      catch (e) { errors.push(`Invalid source ${file}: ${e.message}`); }
      for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']/g)) checkReference(file, m[1]);
    }
  }
  checkHtml(game.preview.path);
  if (game.preview.generated) {
    const html = fs.readFileSync(game.preview.path, 'utf8');
    for (const f of fs.readdirSync(game.preview.originalPath).filter((p) => p.endsWith('.js'))) {
      const code = fs.readFileSync(`${game.preview.originalPath}/${f}`, 'utf8').replace(/<\/script/gi, '<\\/script');
      if (!html.includes(code)) errors.push(`Generated preview does not preserve ${game.id}/${f}`);
    }
    if (html.includes('src="/sdk.js"')) errors.push(`Generated preview requests external SDK: ${game.id}`);
  }
}
checkHtml('index.html');
const server = createLocalServer();
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of ['index.html', ...games.map((g) => g.preview.path)]) {
    const response = await fetch(`${base}/${file.split('/').map(encodeURIComponent).join('/')}`);
    if (response.status !== 200 || !(response.headers.get('content-type') || '').startsWith('text/html')) errors.push(`HTTP failed for ${file}: ${response.status}`);
    await response.arrayBuffer();
    report.httpPages++;
  }
} finally { await new Promise((resolve) => server.close(resolve)); }
Object.assign(report, { allowEdits, editedFiles: edits, errors, passed: errors.length === 0, limitations: ['No gameplay walkthrough or visual browser testing.', 'Dependencies not installed; module projects not rebuilt.', 'Three dev-kit source projects are not proven identical to standalone previews.'] });
fs.writeFileSync('catalog/verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
