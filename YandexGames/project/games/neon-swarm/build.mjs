// Сборка: dist/ (для Яндекс Игр) и dist-single/index.html (всё в одном файле для превью)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  outfile: path.join(out, 'game.js'),
  legalComments: 'none',
});

fs.copyFileSync('node_modules/phaser/dist/phaser.min.js', path.join(out, 'phaser.min.js'));
for (const f of ['russo-cyr.woff2', 'russo-lat.woff2']) fs.copyFileSync(path.join('static', f), path.join(out, f));

let html = fs.readFileSync('static/index.html', 'utf8');
const yandexHtml = html.replace('<!--SDK-->', '<script src="/sdk.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), yandexHtml);

// одиночный файл (без SDK) — для быстрого превью/артефакта
const single = 'dist-single';
fs.rmSync(single, { recursive: true, force: true });
fs.mkdirSync(single, { recursive: true });
const b64 = (f) => fs.readFileSync(path.join('static', f)).toString('base64');
let s = html
  .replace('<!--SDK-->', '')
  .replace('url(russo-cyr.woff2)', `url(data:font/woff2;base64,${b64('russo-cyr.woff2')})`)
  .replace('url(russo-lat.woff2)', `url(data:font/woff2;base64,${b64('russo-lat.woff2')})`);
const phaser = fs.readFileSync('node_modules/phaser/dist/phaser.min.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const game = fs.readFileSync(path.join(out, 'game.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
s = s.replace('<script src="phaser.min.js"></script>', () => `<script>${phaser}</script>`);
s = s.replace('<script src="game.js"></script>', () => `<script>${game}</script>`);
fs.writeFileSync(path.join(single, 'index.html'), s);

// VK Игры: та же игра, но SDK — VK Bridge (src/sdk_vk.js) и без скрипта Яндекса
const vkOut = 'dist-vk';
fs.rmSync(vkOut, { recursive: true, force: true });
fs.mkdirSync(vkOut, { recursive: true });
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  outfile: path.join(vkOut, 'game.js'),
  legalComments: 'none',
  plugins: [
    {
      name: 'vk-sdk',
      setup(b) {
        b.onResolve({ filter: /\/sdk\.js$/ }, (args) => (args.importer.includes(path.sep + 'src') ? { path: path.resolve('src/sdk_vk.js') } : null));
      },
    },
  ],
});
fs.copyFileSync('node_modules/phaser/dist/phaser.min.js', path.join(vkOut, 'phaser.min.js'));
for (const f of ['russo-cyr.woff2', 'russo-lat.woff2']) fs.copyFileSync(path.join('static', f), path.join(vkOut, f));
fs.writeFileSync(path.join(vkOut, 'index.html'), html.replace('<!--SDK-->', ''));

const size = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log('game.js', size(path.join(out, 'game.js')), '| vk', size(path.join(vkOut, 'game.js')), '| single', size(path.join(single, 'index.html')));
