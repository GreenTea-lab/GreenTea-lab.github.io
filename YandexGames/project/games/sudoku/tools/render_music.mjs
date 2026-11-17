// Рендер примеров музыки в WAV (OfflineAudioContext в Chromium): node tools/render_music.mjs [папка] [секунд]
// Для каждого настроения — первая пьеса. Печатает пиковый уровень и громкость, чтобы не было перегруза.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 'release/music';
const secs = +(process.argv[3] || 40);
fs.mkdirSync(out, { recursive: true });
const js = (await build({ stdin: { contents: `import { ZenMusic, PIECES, Composer } from './src/zen.js'; window.Z = { ZenMusic, PIECES, Composer };`, resolveDir: '.' }, bundle: true, write: false, format: 'iife' })).outputFiles[0].text;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: js });
const jobs = [['menu', 0], ['game', 0], ['game', 1], ['night', 0]];
for (const [mood, i] of jobs) {
  const res = await page.evaluate(async ([mood, i, secs]) => {
    const { ZenMusic, PIECES, Composer } = window.Z;
    const sr = 44100;
    const c = new OfflineAudioContext(2, sr * secs, sr);
    const music = c.createGain();
    music.gain.value = 0.7 * 0.45; // громкость музыки по умолчанию в игре
    const comp = c.createDynamicsCompressor();
    music.connect(comp).connect(c.destination);
    const noise = c.createBuffer(1, sr, sr);
    const nd = noise.getChannelData(0);
    for (let k = 0; k < sr; k++) nd[k] = Math.random() * 2 - 1;
    const M = new ZenMusic({ ctx: c, music, noise });
    M._fx();
    const P = PIECES[mood][i];
    const bus = c.createGain();
    bus.connect(M.input);
    if (P.stream) M._stream(bus);
    const C = new Composer(P, 3);
    let t = 0.2;
    while (t < secs - 3) {
      for (const e of C.barEvents()) M.play(e, t + Math.max(0, e.t), bus);
      t += 4 * C.beat;
    }
    const buf = await c.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0;
    for (let k = 0; k < L.length; k++) { peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k])); sum += L[k] * L[k]; }
    // 16-бит WAV
    const n = L.length, b = new ArrayBuffer(44 + n * 4), v = new DataView(b);
    const w = (o, s) => [...s].forEach((ch, j) => v.setUint8(o + j, ch.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    for (let k = 0; k < n; k++) { v.setInt16(44 + k * 4, Math.max(-1, Math.min(1, L[k])) * 32767, true); v.setInt16(46 + k * 4, Math.max(-1, Math.min(1, R[k])) * 32767, true); }
    let bin = ''; const u = new Uint8Array(b);
    for (let k = 0; k < u.length; k += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
    return { name: P.name, peak, rms: Math.sqrt(sum / n), wav: btoa(bin) };
  }, [mood, i, secs]);
  const file = `${out}/${mood}_${res.name.replace(/\W+/g, '_')}.wav`;
  fs.writeFileSync(file, Buffer.from(res.wav, 'base64'));
  console.log(file, 'пик', res.peak.toFixed(3), 'RMS', (20 * Math.log10(res.rms)).toFixed(1), 'дБ');
}
await browser.close();
