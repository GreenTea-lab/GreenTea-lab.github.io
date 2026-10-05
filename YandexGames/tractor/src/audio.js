// Синтезированные звуки фермы и мотор трактора (WebAudio, без файлов)
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
    if (!this.ctx) return;
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
      case 'tool':
        // орудие опускается: металлический стук
        if (this._ok(name, 0.3)) {
          this._osc('triangle', 300, 140, 0.18, 0.08, 0, 1200);
          this._noise(0.12, 0.06, 'bandpass', 900, 0.05);
        }
        break;
      case 'done':
        if (this._ok(name, 0.4)) [659, 784, 988, 1319].forEach((f, i) => this._osc('triangle', f, f, 0.28, 0.06, i * 0.08, 2600));
        break;
      case 'coin':
        if (this._ok(name, 0.05)) {
          this._osc('sine', 1568, 1568, 0.14, 0.04);
          this._osc('sine', 2093, 2093, 0.18, 0.03, 0.05);
        }
        break;
      case 'sell':
        if (this._ok(name, 0.4)) [1047, 1319, 1568, 2093].forEach((f, i) => this._osc('sine', f, f, 0.2, 0.045, i * 0.07));
        break;
      case 'level':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this._osc('triangle', f, f, i === 5 ? 0.5 : 0.25, 0.07, i * 0.1, 2400));
        break;
      case 'wrong':
        if (this._ok(name, 0.3)) this._osc('triangle', 240, 190, 0.18, 0.07, 0, 800);
        break;
      case 'moo':
        if (this._ok(name, 4)) {
          this._osc('sawtooth', 150, 120, 0.9, 0.035, 0, 500);
          this._osc('sawtooth', 152, 118, 0.9, 0.025, 0.02, 420);
        }
        break;
      case 'cluck':
        if (this._ok(name, 2)) [0, 0.12].forEach((d) => this._osc('square', 900, 600, 0.06, 0.02, d, 1800));
        break;
      case 'ripe':
        if (this._ok(name, 1)) [988, 1319, 1568].forEach((f, i) => this._osc('sine', f, f, 0.25, 0.04, i * 0.09));
        break;
    }
  }

  // мотор: очень тихий мягкий «бархатный» шум, только низы (никаких пил и средних частот).
  // Громкость чуть растёт со скоростью; на месте почти не слышно.
  engine(on, speed) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx;
    if (!this.eng) {
      // коричневый шум: интегрированный белый — мягкий, без шипения
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 140;
      lp.Q.value = 0.3;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(lp).connect(g).connect(this.sfx);
      src.start();
      this.eng = { lp, g };
    }
    const e = this.eng,
      t = c.currentTime;
    const k = Math.min(1, speed / 7);
    e.lp.frequency.setTargetAtTime(110 + k * 70, t, 0.4);
    e.g.gain.setTargetAtTime(on ? 0.012 + k * 0.03 : 0, t, 0.4);
  }
}

export const audio = new AudioEngine();
