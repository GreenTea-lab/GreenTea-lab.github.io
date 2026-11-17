// Синтезированные звуки и музыка (WebAudio, без файлов)
import { Music } from './music.js';
import { SONGS } from './songs.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.musicVol = 0.7; // 0..1
    this.sfxVol = 0.9;
    this.mus = new Music(this);
    this.mus.define(SONGS);
    this.last = {};
    this.suspendReasons = new Set();
    this.musicPlaying = false;
    this.intensity = 0; // 0 — меню, 1 — игра
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  // Вызывается по первому жесту пользователя
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.comp = c.createDynamicsCompressor();
      this.comp.connect(c.destination);
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.comp);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.6 * this.sfxVol;
      this.sfx.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = 0.7 * this.musicVol;
      this.music.connect(this.master);
      // буфер шума
      const len = c.sampleRate;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.wantMusic) this.startMusic();
    }
    if (this.ctx.state === 'suspended' && this.suspendReasons.size === 0) this.ctx.resume();
  }

  suspend(reason) {
    this.suspendReasons.add(reason);
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume(reason) {
    this.suspendReasons.delete(reason);
    if (this.ctx && this.suspendReasons.size === 0 && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // громкость 0..1 (0 — выключено)
  setMusicVol(v) {
    this.musicVol = Math.max(0, Math.min(1, v));
    this.musicOn = this.musicVol > 0;
    if (this.music) this.music.gain.setTargetAtTime(0.7 * this.musicVol, this.ctx.currentTime, 0.05);
  }
  setSfxVol(v) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    this.sfxOn = this.sfxVol > 0;
    if (this.sfx) this.sfx.gain.setTargetAtTime(0.6 * this.sfxVol, this.ctx.currentTime, 0.05);
  }
  // совместимость со старым вкл/выкл
  setMusic(on) {
    this.setMusicVol(on === true ? this.musicVol || 0.7 : on === false ? 0 : on);
  }
  setSfx(on) {
    this.setSfxVol(on === true ? this.sfxVol || 0.9 : on === false ? 0 : on);
  }

  // ---------- Музыка: несколько треков, переключение по настроению ----------
  startMusic() {
    this.wantMusic = true;
    if (!this.ctx) return;
    this.mus.start();
  }
  // 0 — меню, 1 — игра
  setIntensity(v) {
    this.intensity = v;
    this.mus.setIntensity(v);
    this.mus.setMood(v > 0.5 ? this.gameMood || 'game' : 'menu');
  }
  // особое настроение: 'boss', 'night', мир уровня и т.п.
  setMood(m) {
    if (m !== 'menu' && m !== 'boss') this.gameMood = m;
    this.mus.setMood(m);
  }

  _ok(name, gap) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  _osc(type, f0, f1, dur, vol, out, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, filterType, f0, f1, out, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out || this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  play(name, p = 0) {
    const o = (...a) => this._osc(...a);
    const n = (...a) => this._noise(...a);
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) o('sine', 900, 600, 0.06, 0.08);
        break;
      case 'select':
        if (this._ok(name, 0.05)) o('triangle', 600, 900, 0.08, 0.08);
        break;
      case 'pick': {
        // конфетка: короткий «плинь», выше с каждой подряд
        if (!this._ok(name, 0.035)) break;
        const f = 880 * Math.pow(2, (Math.min(p, 12) % 13) / 12);
        o('sine', f, f * 1.02, 0.09, 0.07);
        o('triangle', f * 2, f * 2, 0.05, 0.02, null, 0.01);
        break;
      }
      case 'knock':
        if (this._ok(name, 0.2)) [0, 0.12].forEach((d) => {
          o('sine', 180, 120, 0.07, 0.16, null, d);
          n(0.05, 0.08, 'lowpass', 800, 400, null, d);
        });
        break;
      case 'treat':
        // дверной звонок «динь-дон» и россыпь конфет
        if (this._ok(name, 0.2)) {
          o('sine', 988, 988, 0.35, 0.08);
          o('sine', 784, 784, 0.45, 0.08, null, 0.18);
          [1319, 1568, 1760, 2093].forEach((f, i) => o('triangle', f, f, 0.08, 0.03, null, 0.35 + i * 0.05));
        }
        break;
      case 'trick':
        // озорное «у-у-у» с хихиканьем
        if (this._ok(name, 0.3)) {
          o('triangle', 520, 330, 0.35, 0.07);
          [0, 0.09, 0.18].forEach((d, i) => o('square', 700 - i * 60, 640 - i * 60, 0.06, 0.025, null, 0.38 + d));
        }
        break;
      case 'full':
        if (this._ok(name, 0.6)) [392, 330].forEach((f, i) => o('triangle', f, f, 0.12, 0.07, null, i * 0.1));
        break;
      case 'bank':
        if (this._ok(name, 0.2)) {
          for (let i = 0; i < 8; i++) o('sine', 1200 + i * 140, 1250 + i * 140, 0.07, 0.035, null, 0.25 + i * 0.045);
          n(0.25, 0.06, 'lowpass', 600, 200, null, 0.55);
          o('sine', 180, 300, 0.15, 0.08, null, 0.6);
        }
        break;
      case 'bonus':
        if (this._ok(name, 0.3)) [784, 988, 1175, 1568].forEach((f, i) => o('triangle', f, f, 0.12, 0.06, null, 0.7 + i * 0.07));
        break;
      case 'hurt':
        if (this._ok(name, 0.3)) {
          o('triangle', 600, 260, 0.25, 0.1);
          for (let i = 0; i < 5; i++) o('sine', 1400 - i * 120, 1300 - i * 120, 0.05, 0.03, null, 0.1 + i * 0.04);
        }
        break;
      case 'power':
        if (this._ok(name, 0.3)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.14, 0.07, null, i * 0.05));
        break;
      case 'powerEnd':
        if (this._ok(name, 0.5)) [988, 784, 587].forEach((f, i) => o('triangle', f, f, 0.1, 0.05, null, i * 0.08));
        break;
      case 'catch': {
        if (!this._ok(name, 0.08)) break;
        const k = Math.pow(2, Math.min(p, 6) / 12);
        o('sine', 300, 900 * k, 0.12, 0.1);
        [1319, 1760].forEach((f, i) => o('triangle', f * k, f * k, 0.09, 0.04, null, 0.08 + i * 0.06));
        n(0.15, 0.05, 'highpass', 3000, 6000);
        break;
      }
      case 'poof':
        if (this._ok(name, 0.1)) n(0.25, 0.08, 'bandpass', 1500, 500);
        break;
      case 'bats':
        if (this._ok(name, 0.5)) for (let i = 0; i < 4; i++) o('sine', 2600 + i * 200, 3200 + i * 150, 0.04, 0.025, null, i * 0.11);
        break;
      case 'alert':
        // стук костей
        if (this._ok(name, 0.25)) for (let i = 0; i < 4; i++) {
          o('square', 1100 - i * 70, 900 - i * 70, 0.025, 0.035, null, i * 0.06);
          n(0.02, 0.05, 'highpass', 3000, 3000, null, i * 0.06);
        }
        break;
      case 'charge':
        if (this._ok(name, 0.3)) n(0.3, 0.07, 'bandpass', 600, 1800);
        break;
      case 'thud':
        if (this._ok(name, 0.12)) {
          o('sine', p ? 120 : 200, 50, p ? 0.3 : 0.18, p ? 0.2 : 0.13);
          n(0.12, 0.06, 'lowpass', 500, 150);
        }
        break;
      case 'spiderWarn':
        if (this._ok(name, 0.3)) o('triangle', 1600, 1400, 0.06, 0.03);
        break;
      case 'spiderDrop':
        if (this._ok(name, 0.2)) o('sine', 1200, 300, 0.12, 0.06);
        break;
      case 'splash':
        if (this._ok(name, 0.3)) {
          n(0.2, 0.05, 'lowpass', 900, 300);
          o('sine', 300, 180, 0.12, 0.05);
        }
        break;
      case 'dash':
        if (this._ok(name, 0.15)) n(0.18, 0.08, 'bandpass', 900, 2600);
        break;
      case 'midnight':
        // часы бьют полночь (короткие удары)
        if (this._ok(name, 2)) [0, 0.35, 0.7].forEach((d) => {
          o('sine', 523, 523, 0.3, 0.07, null, d);
          o('sine', 1307, 1307, 0.15, 0.025, null, d);
        });
        break;
      case 'rain':
        if (this._ok(name, 0.5)) for (let i = 0; i < 7; i++) o('sine', 1568 + ((i * 5) % 7) * 160, 1568 + ((i * 5) % 7) * 160, 0.07, 0.035, null, i * 0.06);
        break;
      case 'party':
        if (this._ok(name, 0.5)) {
          o('square', 440, 660, 0.18, 0.03);
          o('square', 660, 880, 0.12, 0.025, null, 0.18);
        }
        break;
      case 'summon':
        if (this._ok(name, 0.4)) [330, 392, 466].forEach((f, i) => o('triangle', f, f * 0.97, 0.16, 0.06, null, i * 0.09));
        break;
      case 'throw':
        if (this._ok(name, 0.2)) n(0.2, 0.06, 'bandpass', 1200, 2400);
        break;
      case 'aim':
        if (this._ok(name, 0.3)) [880, 880].forEach((f, i) => o('square', f, f, 0.06, 0.03, null, i * 0.15));
        break;
      case 'swoop':
        if (this._ok(name, 0.3)) n(0.4, 0.09, 'bandpass', 500, 2200);
        break;
      case 'bossHit':
        if (this._ok(name, 0.2)) {
          o('sine', 200, 80, 0.3, 0.14);
          [1047, 1319, 1568].forEach((f, i) => o('triangle', f, f, 0.12, 0.05, null, 0.05 + i * 0.05));
        }
        break;
      case 'bossDown':
      case 'win':
        if (this._ok('win', 1)) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => o('triangle', f, f, 0.2, 0.07, null, i * 0.09));
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 466, 392, 349].forEach((f, i) => o('triangle', f, f * 0.99, 0.18, 0.07, null, i * 0.16));
        break;
      case 'tick':
        if (this._ok(name, 0.3)) o('square', 1200, 1200, 0.04, 0.03);
        break;
      case 'go':
        if (this._ok(name, 0.5)) [523, 659, 784, 1047].forEach((f, i) => o('triangle', f, f, 0.14, 0.07, null, i * 0.07));
        break;
      case 'star':
        if (this._ok(name, 0.1)) [1047 * (1 + p * 0.12), 1568 * (1 + p * 0.12)].forEach((f, i) => o('sine', f, f, 0.2, 0.07, null, i * 0.07));
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.08, 0.05);
          o('sine', 2093, 2093, 0.12, 0.04, null, 0.05);
        }
        break;
      case 'error':
      case 'deny':
        if (this._ok('deny', 0.2)) o('triangle', 220, 180, 0.12, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.15, 0.06, null, i * 0.06));
        break;
      case 'upgrade':
        if (this._ok(name, 0.15)) [660, 880, 1320].forEach((f, i) => o('triangle', f, f, 0.12, 0.06, null, i * 0.05));
        break;
    }
  }

  _tone(type, midi, t, dur, vol, out, opts = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = mtof(midi) * (opts.detune || 1);
    let node = o;
    if (opts.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lp;
      o.connect(f);
      node = f;
    }
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }


  _noiseAt(t, dur, vol, type, freq, out) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }
}

export const audio = new AudioEngine();
