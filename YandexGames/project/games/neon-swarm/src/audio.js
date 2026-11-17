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
      // мягкий компрессор: только срезает пики, не «качает» звук
      this.comp.threshold.value = -14;
      this.comp.knee.value = 20;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.01;
      this.comp.release.value = 0.25;
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

  // осциллятор через резонансный фильтр с проходом частоты — «неоновый» синт-звук
  _zap(type, f0, f1, dur, vol, lp0, lp1, q = 6, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    f.type = 'lowpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(lp0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, lp1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.sfx);
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
      case 'shoot':
        if (this._ok(name, 0.07)) this._osc('square', 900 + Math.random() * 80, 380, 0.07, 0.035);
        break;
      case 'hit':
        if (this._ok(name, 0.045)) this._osc('triangle', 260, 120, 0.05, 0.05);
        break;
      case 'kill':
        if (this._ok(name, 0.04)) {
          this._noise(0.12, 0.09, 'bandpass', 1800, 500);
          this._osc('sine', 320, 70, 0.12, 0.06);
        }
        break;
      case 'pickup':
        if (this._ok(name, 0.035)) this._osc('sine', 700 + Math.min(p, 30) * 22, 1200 + Math.min(p, 30) * 22, 0.06, 0.04);
        break;
      case 'levelup':
        if (this._ok(name, 0.2)) [523, 659, 784, 1046].forEach((f, i) => this._osc('square', f, f, 0.14, 0.05, null, i * 0.07));
        break;
      case 'hurt':
        if (this._ok(name, 0.15)) {
          this._osc('sawtooth', 180, 50, 0.25, 0.12);
          this._noise(0.15, 0.1, 'lowpass', 1500, 300);
        }
        break;
      case 'explode':
        if (this._ok(name, 0.06)) {
          this._noise(0.4, 0.22, 'lowpass', 2400, 120);
          this._osc('sine', 120, 40, 0.3, 0.12);
        }
        break;
      case 'mboom':
        // попадание ракеты: синтовый «пью-бум» с резонансным фильтром, искра и мягкий саб
        if (this._ok(name, 0.07)) {
          this._zap('sawtooth', 260, 50, 0.3, 0.07, 3600, 160, 9);
          this._zap('square', 1320, 520, 0.09, 0.025, 5000, 1500, 3);
          this._osc('sine', 110, 38, 0.24, 0.1);
          this._noise(0.14, 0.04, 'bandpass', 5000, 900);
        }
        break;
      case 'laser':
        if (this._ok(name, 0.09)) {
          this._zap('sawtooth', 1800, 220, 0.2, 0.05, 6000, 700, 7);
          this._osc('sine', 900, 1400, 0.08, 0.02);
        }
        break;
      case 'saw':
        if (this._ok(name, 0.12)) this._zap('triangle', 520, 780, 0.14, 0.04, 2400, 3200, 4);
        break;
      case 'drone':
        if (this._ok(name, 0.09)) this._osc('square', 1500, 820, 0.04, 0.016);
        break;
      case 'nova':
        if (this._ok(name, 0.1)) this._osc('sine', 180, 720, 0.28, 0.09);
        break;
      case 'zap':
        if (this._ok(name, 0.08)) {
          this._noise(0.1, 0.08, 'highpass', 3000, 6000);
          this._osc('square', 1400 + Math.random() * 600, 300, 0.08, 0.03);
        }
        break;
      case 'missile':
        if (this._ok(name, 0.1)) this._noise(0.18, 0.05, 'bandpass', 600, 2400);
        break;
      case 'boss':
        if (this._ok(name, 1)) {
          this._osc('sawtooth', 55, 45, 1.4, 0.16);
          this._osc('sawtooth', 82, 70, 1.4, 0.1);
        }
        break;
      case 'warn':
        if (this._ok(name, 0.5)) [0, 0.25, 0.5].forEach((d) => this._osc('square', 440, 330, 0.18, 0.06, null, d));
        break;
      case 'click':
        if (this._ok(name, 0.05)) this._osc('sine', 660, 880, 0.05, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.1)) [660, 990, 1320].forEach((f, i) => this._osc('triangle', f, f, 0.1, 0.08, null, i * 0.06));
        break;
      case 'revive':
        if (this._ok(name, 0.5)) this._osc('sine', 200, 1600, 0.7, 0.12);
        break;
      case 'gameover':
        if (this._ok(name, 1)) [392, 311, 262, 196].forEach((f, i) => this._osc('triangle', f, f * 0.98, 0.3, 0.09, null, i * 0.18));
        break;
      case 'chest':
        if (this._ok(name, 0.3)) [784, 988, 1175, 1568].forEach((f, i) => this._osc('sine', f, f, 0.2, 0.07, null, i * 0.08));
        break;
    }
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
