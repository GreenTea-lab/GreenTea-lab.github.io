// Синтезированные звуки и фэнтези-музыка (WebAudio, без файлов)
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
      case 'arrow':
        if (this._ok(name, 0.06)) {
          this._osc('triangle', 520, 380, 0.08, 0.05);
          this._noise(0.05, 0.04, 'bandpass', 3200, 2000);
        }
        break;
      case 'cannon':
        if (this._ok(name, 0.08)) {
          this._noise(0.35, 0.2, 'lowpass', 900, 90);
          this._osc('sine', 110, 40, 0.3, 0.16);
        }
        break;
      case 'magic':
        if (this._ok(name, 0.08)) {
          this._osc('sine', 600, 1400, 0.16, 0.06);
          this._osc('triangle', 1200, 2000, 0.12, 0.025);
        }
        break;
      case 'frost':
        if (this._ok(name, 0.08)) {
          this._noise(0.12, 0.04, 'highpass', 5000, 7000);
          this._osc('sine', 1900, 1300, 0.12, 0.04);
        }
        break;
      case 'ballista':
        if (this._ok(name, 0.1)) {
          this._osc('triangle', 240, 100, 0.14, 0.12);
          this._noise(0.08, 0.06, 'bandpass', 900, 400);
        }
        break;
      case 'die':
        if (this._ok(name, 0.05)) this._osc('sine', 520, 140, 0.11, 0.07);
        break;
      case 'coin':
        if (this._ok(name, 0.06)) {
          this._osc('square', 1320, 1320, 0.05, 0.025);
          this._osc('square', 1760, 1760, 0.08, 0.025, null, 0.05);
        }
        break;
      case 'build':
        if (this._ok(name, 0.2)) [0, 0.09, 0.18].forEach((d) => this._noise(0.06, 0.12, 'bandpass', 500 + Math.random() * 200, 300, null, d));
        break;
      case 'upgrade':
        if (this._ok(name, 0.2)) [523, 659, 784, 1046].forEach((f, i) => this._osc('triangle', f, f, 0.16, 0.07, null, i * 0.06));
        break;
      case 'sell':
        if (this._ok(name, 0.2)) [1760, 1320, 990].forEach((f, i) => this._osc('square', f, f, 0.06, 0.03, null, i * 0.05));
        break;
      case 'leak':
        if (this._ok(name, 0.2)) this._osc('square', 220, 110, 0.3, 0.06);
        break;
      case 'wave':
        if (this._ok(name, 0.5)) {
          this._horn(293.7, 0, 0.35);
          this._horn(440, 0.3, 0.6);
        }
        break;
      case 'boss':
        if (this._ok(name, 1)) {
          this._horn(146.8, 0, 0.6);
          this._horn(138.6, 0.55, 0.9);
          this._osc('sine', 70, 40, 1.2, 0.18);
        }
        break;
      case 'victory':
        if (this._ok(name, 1)) {
          [523, 659, 784].forEach((f, i) => this._horn(f, i * 0.16, 0.25));
          [523, 659, 784, 1046].forEach((f) => this._horn(f, 0.5, 0.9));
        }
        break;
      case 'defeat':
        if (this._ok(name, 1)) [392, 349, 311, 262].forEach((f, i) => this._horn(f, i * 0.3, 0.4));
        break;
      case 'meteor':
        if (this._ok(name, 0.3)) {
          this._noise(0.5, 0.1, 'bandpass', 400, 2500);
          this._noise(0.6, 0.3, 'lowpass', 1200, 80, null, 0.45);
          this._osc('sine', 90, 30, 0.6, 0.2, null, 0.45);
        }
        break;
      case 'freeze':
        if (this._ok(name, 0.3)) [1568, 2093, 2637, 3136].forEach((f, i) => this._osc('sine', f, f, 0.5, 0.04, null, i * 0.05));
        break;
      case 'click':
        if (this._ok(name, 0.04)) this._osc('triangle', 760, 520, 0.05, 0.1);
        break;
      case 'error':
        if (this._ok(name, 0.2)) this._osc('square', 180, 150, 0.12, 0.05);
        break;
      case 'star':
        if (this._ok(name, 0.1)) [1046, 1568].forEach((f, i) => this._osc('sine', f, f, 0.25, 0.08, null, i * 0.07));
        break;
      case 'heal':
        if (this._ok(name, 0.4)) this._osc('sine', 700, 1100, 0.2, 0.03);
        break;
    }
  }

  _horn(f, delay, dur) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const fl = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    o2.type = 'sawtooth';
    o.frequency.value = f;
    o2.frequency.value = f * 1.006;
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(400, t);
    fl.frequency.linearRampToValueAtTime(1800, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    g.gain.setValueAtTime(0.06, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl);
    o2.connect(fl);
    fl.connect(g).connect(this.sfx);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }



  _tone(type, midi, t, dur, vol, out, opts = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = mtof(midi);
    if (opts.vib) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = mtof(midi) * 0.008;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
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
    if (opts.sustain) g.gain.setValueAtTime(vol, t + dur * 0.6);
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
