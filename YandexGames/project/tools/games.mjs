import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = JSON.parse(fs.readFileSync(path.join(root, 'catalog/games.json'), 'utf8'));
const [command = 'list', arg] = process.argv.slice(2);

export function createLocalServer() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
  return http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      let target = path.resolve(root, '.' + pathname);
      if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end('File not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(target).pipe(res);
    } catch { res.writeHead(400); res.end('Invalid URL'); }
  });
}

// Importing the server helper for verification must not start a server or build.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (command === 'list') {
    for (const game of games) console.log(`${game.id.padEnd(20)} ${game.title} — ${game.source.path}`);
  } else if (command === 'serve') {
    const port = Number(arg || 8080);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a port from 1 to 65535.');
    const server = createLocalServer();
    server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Игровая полка: http://127.0.0.1:${port} (Ctrl+C — остановить)`));
  } else if (command === 'build') {
    const game = games.find((g) => g.id === arg);
    if (!game) throw new Error('Укажите идентификатор игры из npm run list.');
    if (game.kind !== 'modular-source') throw new Error(`Эта игра редактируется напрямую: ${game.source.path}`);
    const cwd = path.join(root, game.directory);
    if (!fs.existsSync(path.join(cwd, 'node_modules', 'esbuild'))) throw new Error(`Сначала установите зависимости: npm ci --prefix ${game.directory}`);
    const child = spawn(process.execPath, ['build.mjs'], { cwd, stdio: 'inherit' });
    child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', (code) => { process.exitCode = code ?? 1; });
  } else {
    throw new Error('Commands: list, serve [port], build <game-id>');
  }
}
