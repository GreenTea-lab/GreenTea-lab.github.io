// Синтезированные звуки и уютная музыка (WebAudio, без файлов)
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
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) this._osc('sine', 900, 600, 0.06, 0.08);
        break;
      case 'pop':
        if (this._ok(name, 0.05)) this._osc('sine', 500, 900, 0.08, 0.1);
        break;
      case 'place':
        if (this._ok(name, 0.1)) {
          this._osc('triangle', 300, 180, 0.12, 0.14);
          this._noise(0.08, 0.06, 'lowpass', 900, 300);
        }
        break;
      case 'build':
        if (this._ok(name, 0.2)) [0, 0.1, 0.2].forEach((d) => this._noise(0.06, 0.1, 'bandpass', 600 + Math.random() * 300, 300, null, d));
        break;
      case 'upgrade':
        if (this._ok(name, 0.2)) [659, 784, 988, 1319].forEach((f, i) => this._osc('sine', f, f, 0.35, 0.07, null, i * 0.07));
        break;
      case 'coin':
        if (this._ok(name, 0.06)) {
          this._osc('sine', 1568, 1568, 0.18, 0.04);
          this._osc('sine', 2093, 2093, 0.22, 0.03, null, 0.05);
        }
        break;
      case 'error':
        if (this._ok(name, 0.2)) this._osc('triangle', 220, 180, 0.15, 0.08);
        break;
      case 'levelup':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319].forEach((f, i) => this._osc('triangle', f, f, 0.5, 0.07, null, i * 0.09));
        break;
      case 'chest':
        if (this._ok(name, 0.3)) [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this._osc('sine', f, f, 0.3, 0.05, null, i * 0.05));
        break;
      case 'balloon':
        if (this._ok(name, 0.3)) {
          this._noise(0.12, 0.12, 'highpass', 2000, 4000);
          this._osc('sine', 700, 1400, 0.15, 0.06);
        }
        break;
      case 'resident':
        if (this._ok(name, 0.1)) [880, 1175].forEach((f, i) => this._osc('sine', f, f * 1.05, 0.1, 0.07, null, i * 0.08));
        break;
      case 'plot':
        if (this._ok(name, 0.5)) {
          this._noise(0.5, 0.06, 'bandpass', 300, 2000);
          [523, 784, 1047].forEach((f, i) => this._osc('sine', f, f, 0.5, 0.06, null, 0.25 + i * 0.1));
        }
        break;
      case 'done':
        if (this._ok(name, 0.3)) [784, 1047].forEach((f, i) => this._osc('triangle', f, f, 0.25, 0.07, null, i * 0.1));
        break;
    }
  }

  // фон дождя
  setRain(on) {
    if (!this.ctx) return;
    if (!this.rainSrc) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      this.rainGain = c.createGain();
      this.rainGain.gain.value = 0;
      s.connect(f).connect(this.rainGain).connect(this.sfx);
      s.start();
      this.rainSrc = s;
    }
    this.rainGain.gain.setTargetAtTime(on ? 0.06 : 0, this.ctx.currentTime, 1.2);
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
