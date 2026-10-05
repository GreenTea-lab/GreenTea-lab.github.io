// Сборка: dist/ (для Яндекс Игр) и dist-single/ (один HTML для превью)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: path.join(out, 'game.js'), legalComments: 'none', charset: 'utf8' });
const fonts = fs.readdirSync('static').filter((f) => f.endsWith('.woff2'));
for (const f of fonts) fs.copyFileSync(path.join('static', f), path.join(out, f));
const html = fs.readFileSync('static/index.html', 'utf8');
fs.writeFileSync(path.join(out, 'index.html'), html.replace('<!--SDK-->', '<script src="/sdk.js"></script>'));
// один файл
const single = 'dist-single';
fs.rmSync(single, { recursive: true, force: true });
fs.mkdirSync(single, { recursive: true });
let s = html.replace('<!--SDK-->', '');
for (const f of fonts) s = s.replace(`url(${f})`, `url(data:font/woff2;base64,${fs.readFileSync(path.join('static', f)).toString('base64')})`);
const js = fs.readFileSync(path.join(out, 'game.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
s = s.replace('<script src="game.js"></script>', () => `<script>${js}</script>`);
fs.writeFileSync(path.join(single, 'index.html'), s);
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log('game.js', kb(path.join(out, 'game.js')), '| single', kb(path.join(single, 'index.html')));
