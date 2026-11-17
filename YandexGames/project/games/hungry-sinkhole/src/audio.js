// Синтезированные звуки и музыка «Голодной Воронки» (WebAudio, без файлов)
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
      case 'eat': {
        // «бульк» — чем крупнее предмет, тем ниже; серия съеденного поднимает тон
        if (!this._ok(name, 0.045)) break;
        const size = Math.max(0, Math.min(1, p.size || 0));
        const step = Math.min(p.combo || 0, 14);
        const f = (520 - size * 300) * Math.pow(2, step / 24);
        o('sine', f * 1.6, f * 0.7, 0.12, 0.09);
        o('triangle', f * 2.4, f * 2.4, 0.04, 0.02, null, 0.03);
        break;
      }
      case 'bigEat':
        if (this._ok(name, 0.15)) {
          o('sine', 260, 70, 0.35, 0.16);
          n(0.3, 0.06, 'lowpass', 700, 150);
        }
        break;
      case 'crack':
        // хруст разрушения: короткий шум и стук
        if (this._ok(name, 0.06)) {
          n(0.09, 0.07 * (0.5 + p * 0.5), 'bandpass', 1800, 700);
          o('square', 160, 90, 0.05, 0.03);
        }
        break;
      case 'rumble':
        // обрушение дома: низкий гул
        if (this._ok(name, 0.4)) {
          n(0.8, 0.12, 'lowpass', 300, 80);
          o('sine', 70, 40, 0.6, 0.12);
        }
        break;
      case 'boom':
        if (this._ok(name, 0.15)) {
          n(0.9, 0.22, 'lowpass', 1200, 60);
          o('sine', 120, 35, 0.7, 0.25);
        }
        break;
      case 'gulp':
        // дыра съела дыру
        if (this._ok(name, 0.3)) {
          o('sine', 600, 90, 0.4, 0.15);
          [784, 988, 1319].forEach((f, i) => o('triangle', f, f, 0.1, 0.05, null, 0.3 + i * 0.06));
        }
        break;
      case 'eaten':
        if (this._ok(name, 0.6)) [523, 440, 349, 262].forEach((f, i) => o('triangle', f, f * 0.97, 0.18, 0.08, null, i * 0.13));
        break;
      case 'respawn':
        if (this._ok(name, 0.5)) [392, 523, 659].forEach((f, i) => o('sine', f, f, 0.14, 0.06, null, i * 0.07));
        break;
      case 'grow':
        if (this._ok(name, 0.3)) [659, 880, 1175].forEach((f, i) => o('triangle', f, f, 0.12, 0.05, null, i * 0.06));
        break;
      case 'beep':
        if (this._ok(name, 0.1)) o('square', 1000, 1000, 0.05, 0.03);
        break;
      case 'tick':
        if (this._ok(name, 0.3)) o('square', 1200, 1200, 0.04, 0.03);
        break;
      case 'go':
        if (this._ok(name, 0.5)) [523, 659, 784, 1047].forEach((f, i) => o('triangle', f, f, 0.14, 0.07, null, i * 0.07));
        break;
      case 'win':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => o('triangle', f, f, 0.2, 0.07, null, i * 0.09));
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 466, 392, 349].forEach((f, i) => o('triangle', f, f * 0.99, 0.18, 0.07, null, i * 0.16));
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.08, 0.05);
          o('sine', 2093, 2093, 0.12, 0.04, null, 0.05);
        }
        break;
      case 'deny':
        if (this._ok('deny', 0.2)) o('triangle', 220, 180, 0.12, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.15, 0.06, null, i * 0.06));
        break;
      case 'upgrade':
        if (this._ok(name, 0.15)) [660, 880, 1320].forEach((f, i) => o('triangle', f, f, 0.12, 0.06, null, i * 0.05));
        break;
      case 'pick':
        // бонус: светлое арпеджио вверх
        if (this._ok(name, 0.2)) [880, 1109, 1319, 1760].forEach((f, i) => o('sine', f, f, 0.12, 0.05, null, i * 0.045));
        break;
      case 'rise':
        // дом отстроился: мягкий низкий «вжух» без резких частот
        if (this._ok(name, 1.2)) {
          n(0.7, 0.04, 'lowpass', 220, 600);
          o('sine', 110, 165, 0.6, 0.05);
        }
        break;
      case 'level':
        if (this._ok(name, 0.5)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('sine', f, f, 0.16, 0.07, null, i * 0.08));
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
