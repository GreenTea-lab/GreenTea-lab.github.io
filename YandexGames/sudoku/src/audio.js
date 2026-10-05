// Синтезированные звуки и музыка сада (WebAudio, без файлов)
import { Music } from './music.js';
import { SONGS } from './songs.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.musicVol = 0.5;
    this.sfxVol = 0.8;
    this.mus = new Music(this);
    this.mus.define(SONGS);
    this.last = {};
    this.suspendReasons = new Set();
  }

  // вызывается по первому жесту пользователя
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

  startMusic() {
    this.wantMusic = true;
    if (!this.ctx) return;
    this.mus.start();
  }
  setMood(m) {
    this.mus.setMood(m);
  }

  _ok(name, gap) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  _osc(type, f0, f1, dur, vol, delay = 0, lp = 0) {
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
    let node = o;
    if (lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, type, f, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  play(name) {
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) this._osc('sine', 760, 520, 0.06, 0.07);
        break;
      case 'select':
        if (this._ok(name, 0.03)) this._osc('sine', 620, 620, 0.05, 0.03);
        break;
      case 'place':
        // деревянная колотушка
        if (this._ok(name, 0.03)) {
          this._osc('sine', 980, 720, 0.07, 0.09);
          this._noise(0.03, 0.05, 'bandpass', 1800);
        }
        break;
      case 'note':
        if (this._ok(name, 0.03)) this._osc('triangle', 1320, 1180, 0.05, 0.035, 0, 2600);
        break;
      case 'erase':
        if (this._ok(name, 0.03)) this._noise(0.07, 0.04, 'bandpass', 1100);
        break;
      case 'unit':
        // колокольчики по ладу ё
        if (this._ok(name, 0.15)) [784, 880, 1047, 1175].forEach((f, i) => this._osc('sine', f, f, 0.3, 0.05, i * 0.06));
        break;
      case 'hint':
        if (this._ok(name, 0.15)) [1175, 1568].forEach((f, i) => this._osc('sine', f, f, 0.22, 0.05, i * 0.07));
        break;
      case 'coin':
        if (this._ok(name, 0.06)) {
          this._osc('sine', 1568, 1568, 0.16, 0.04);
          this._osc('sine', 2093, 2093, 0.2, 0.03, 0.05);
        }
        break;
      case 'wrong':
        if (this._ok(name, 0.25)) this._osc('triangle', 240, 190, 0.18, 0.07, 0, 800);
        break;
      case 'win':
        // кото-арпеджио и мягкий гонг
        if (this._ok(name, 1)) {
          [440, 494, 587, 659, 784, 880].forEach((f, i) => this._osc('triangle', f, f * 0.995, 0.35, 0.06, i * 0.09, 2400));
          this._osc('sine', 110, 104, 1.2, 0.08, 0.55);
          this._osc('sine', 277, 272, 0.9, 0.025, 0.55);
        }
        break;
      case 'star':
        if (this._ok(name, 0.1)) this._osc('sine', 1175, 1568, 0.2, 0.05);
        break;
      case 'item':
        // ветряной колокольчик
        if (this._ok(name, 0.5)) [1319, 1568, 1760, 2093, 1760].forEach((f, i) => this._osc('sine', f, f, 0.4, 0.035, i * 0.11));
        break;
    }
  }
}

export const audio = new AudioEngine();
