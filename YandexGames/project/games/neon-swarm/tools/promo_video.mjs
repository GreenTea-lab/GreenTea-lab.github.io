// Промо-ролик: node tools/promo_video.mjs ru|en  → release/promo/video_<lang>.mp4 (1920×1080, 30 fps, 8 с)
import { recordFrames, recordAudio, encode } from './rec.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const lang = process.argv[2] || 'ru';
const gameDir = process.cwd();
const tmp = `/tmp/promo_${lang}`;
fs.mkdirSync(tmp, { recursive: true });
const ready = "window.__game && window.__game.scene.isActive('Menu')";
const GAME = 6.5; // секунд геймплея + 1,5 с финальная заставка
await recordFrames({
  gameDir, lang, w: 1920, h: 1080, fps: 30, seconds: GAME, out: tmp + '/f', name: lang,
  debugVar: '__NS_DEBUG', debug: { god: true, bot: true, autoPick: true, smartPick: true }, ready,
  init: () => { try { localStorage.setItem('neon_swarm_save_v1', JSON.stringify({ v: 1, ts: Date.now(), crystals: 1240, shop: {}, best: { score: 18450, time: 412, kills: 1130, level: 22 }, settings: { music: true, sfx: true }, tutorialDone: true, runs: 12 })); } catch (e) {} },
  setup: async (page, adv) => {
    await adv(800);
    await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); m.scene.start('Game'); });
    await page.waitForFunction(() => { const g = window.__game.scene.getScene('Game'); return g && g.keys && g.hud && g.hud.ready; }).catch(() => {});
    await adv(500);
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      g.nextBoss = 9999; g.nextSwarm = 9999;
      g.weapons = { blaster: 4, orbit: 4, nova: 3, lightning: 3, missile: 2 };
      g.t = 170;
      for (let i = 0; i < 900; i++) g.step(1 / 30);
      g.spawnBoss();
      g.boss.x = g.p.x + 300; g.boss.y = g.p.y - 190; g.boss.hp *= 0.7;
      g.spawnSwarm(); g.spawnSwarm();
    });
  },
  timeline: [{ t: 3.2, fn: async (page) => { await page.evaluate(() => window.__game.scene.getScene('Game').spawnSwarm()); } }],
});
if (!fs.existsSync(tmp + '/a.webm')) await recordAudio({
  gameDir, lang, debugVar: '__NS_DEBUG', debug: { god: true, bot: true, autoPick: true, smartPick: true }, ready, seconds: 8,
  outFile: tmp + '/a.webm',
  start: async (page) => { await page.evaluate(() => { window.__game.scene.getScene('Menu').scene.start('Game'); }); await page.mouse.click(100, 100); },
});
// финальная заставка 1,5 с с плавным появлением
execSync(`ffmpeg -y -loglevel error -framerate 30 -loop 1 -i release/promo/endcard_${lang}.png -t 1.5 -vf "fade=t=in:st=0:d=0.4,format=yuv420p" -c:v libx264 -crf 18 ${tmp}/end.mp4`);
execSync(`ffmpeg -y -loglevel error -framerate 30 -i ${tmp}/f/%05d.jpg -t ${GAME} -vf "format=yuv420p" -c:v libx264 -crf 18 ${tmp}/game.mp4`);
execSync(`ffmpeg -y -loglevel error -i ${tmp}/game.mp4 -i ${tmp}/end.mp4 -i ${tmp}/a.webm -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]loudnorm=I=-26:TP=-4:LRA=7,afade=t=in:st=0:d=0.4,afade=t=out:st=6.6:d=1.4,apad[a]" -map "[v]" -map "[a]" -t 8 -r 30 -c:v libx264 -profile:v main -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart release/promo/video_${lang}.mp4`);
console.log('video', lang, 'ok');
