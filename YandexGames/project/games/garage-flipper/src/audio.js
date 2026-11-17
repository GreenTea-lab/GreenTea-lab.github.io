// Синтезированные звуки гаража (WebAudio, без файлов): деньги, ключ, болгарка, молоток, краскопульт,
// мойка, сообщение, мотор, подъёмник, новый уровень. Всё короткое и мягкое.
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

  // шум с фильтром; f1 — конечная частота фильтра (свип)
  _noise(dur, vol, type, f, delay = 0, f1 = 0, q = 0.8, attack = 0) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    fl.Q.value = q;
    const g = c.createGain();
    if (attack) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
    } else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  play(name, k = 1) {
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) this._osc('sine', 760, 520, 0.06, 0.07);
        break;
      case 'tab':
        if (this._ok(name, 0.05)) this._osc('triangle', 520, 700, 0.07, 0.05, 0, 2000);
        break;
      case 'cash':
        if (this._ok(name, 0.3)) {
          this._noise(0.05, 0.05, 'highpass', 3000);
          [1319, 1760, 2637].forEach((f, i) => this._osc('sine', f, f, 0.22, 0.05, 0.04 + i * 0.06));
        }
        break;
      case 'coin':
        if (this._ok(name, 0.05)) this._osc('sine', 1568, 2093, 0.1, 0.04);
        break;
      case 'wrench':
        if (this._ok(name, 0.06)) for (let i = 0; i < 4; i++) this._noise(0.025, 0.06, 'bandpass', 2600 + i * 120, i * 0.05, 0, 3);
        break;
      case 'grind':
        if (this._ok(name, 0.1)) {
          this._noise(0.28, 0.05, 'bandpass', 3800, 0, 2600, 2.2, 0.02);
          this._osc('sawtooth', 820, 760, 0.28, 0.012, 0, 2400);
        }
        break;
      case 'hammer':
        if (this._ok(name, 0.08)) {
          this._osc('triangle', 520, 180, 0.09, 0.08, 0, 2400);
          this._noise(0.05, 0.05, 'bandpass', 2200, 0, 0, 2);
        }
        break;
      case 'spray':
        if (this._ok(name, 0.1)) this._noise(0.26, 0.045, 'highpass', 4200, 0, 0, 0.7, 0.03);
        break;
      case 'wash':
        if (this._ok(name, 0.09)) {
          this._noise(0.12, 0.03 * k, 'bandpass', 1400, 0, 2400, 1.5, 0.02);
          if (Math.random() < 0.3) this._osc('sine', 1900, 2600, 0.06, 0.012);
        }
        break;
      case 'msg':
        if (this._ok(name, 0.2)) {
          this._osc('sine', 880, 880, 0.1, 0.05);
          this._osc('sine', 1320, 1320, 0.14, 0.04, 0.08);
        }
        break;
      case 'deal':
        if (this._ok(name, 0.5)) [523, 659, 784, 1047].forEach((f, i) => this._osc('triangle', f, f, 0.22, 0.06, i * 0.08, 2600));
        break;
      case 'nope':
        if (this._ok(name, 0.3)) [392, 330].forEach((f, i) => this._osc('triangle', f, f, 0.16, 0.05, i * 0.1, 1500));
        break;
      case 'engine':
        if (this._ok(name, 0.4)) for (let i = 0; i < 6; i++) this._osc('sawtooth', 70 + i * 6, 60 + i * 6, 0.1, 0.03, i * 0.045, 500);
        break;
      case 'lift':
        if (this._ok(name, 0.4)) this._noise(0.3, 0.025, 'lowpass', 600, 0, 1200, 1, 0.08);
        break;
      case 'level':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this._osc('triangle', f, f, 0.26, 0.06, i * 0.09, 2600));
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 1047, 1319, 1568].forEach((f, i) => this._osc('sine', f, f, 0.18, 0.045, i * 0.06));
        break;
      case 'wrong':
        if (this._ok(name, 0.3)) this._osc('triangle', 240, 190, 0.16, 0.06, 0, 800);
        break;
      case 'done':
        if (this._ok(name, 0.2)) [988, 1319].forEach((f, i) => this._osc('sine', f, f, 0.14, 0.05, i * 0.07));
        break;
    }
  }
}

export const audio = new AudioEngine();
