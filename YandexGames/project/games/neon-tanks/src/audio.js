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
    switch (name) {
      case 'shoot': {
        // мягкий «пух»: крупнее пуля — ниже звук
        if (!this._ok(name, 0.055)) break;
        const k = Math.max(0.5, Math.min(2.4, (p || 10) / 10));
        this._osc('sine', 330 / Math.sqrt(k), 120 / Math.sqrt(k), 0.09 * Math.sqrt(k), 0.05);
        this._noise(0.05 * Math.sqrt(k), 0.025, 'lowpass', 1800 / k, 500, null);
        break;
      }
      case 'shoot2':
        if (this._ok(name, 0.11)) this._osc('sine', 260, 120, 0.07, 0.012);
        break;
      case 'pop':
        if (this._ok(name, 0.04)) {
          this._osc('triangle', 520 + Math.random() * 80, 260, 0.08, 0.045);
          this._noise(0.07, 0.03, 'bandpass', 2200, 900);
        }
        break;
      case 'pop2':
        if (this._ok(name, 0.08)) [440, 660, 880].forEach((f, i) => this._osc('triangle', f, f * 1.01, 0.12, 0.045, null, i * 0.05));
        break;
      case 'boom':
        if (this._ok(name, 0.08)) {
          this._noise(0.35, 0.12 * (p || 1), 'lowpass', 1600, 120);
          this._osc('sine', 140, 45, 0.3, 0.1 * (p || 1));
        }
        break;
      case 'bigboom':
        if (this._ok(name, 0.3)) {
          this._noise(0.8, 0.2, 'lowpass', 2000, 80);
          this._osc('sine', 110, 35, 0.7, 0.16);
        }
        break;
      case 'kill':
        if (this._ok(name, 0.2)) [523, 784, 1046].forEach((f, i) => this._osc('triangle', f, f, 0.12, 0.06, null, i * 0.06));
        break;
      case 'levelup':
        if (this._ok(name, 0.15)) [659, 988].forEach((f, i) => this._osc('sine', f, f, 0.12, 0.055, null, i * 0.06));
        break;
      case 'upgrade':
        if (this._ok(name, 0.04)) this._osc('triangle', 600 + p * 60, 900 + p * 60, 0.07, 0.06);
        break;
      case 'class':
        if (this._ok(name, 0.3)) [523, 659, 784, 1046, 1318].forEach((f, i) => this._osc('triangle', f, f, 0.16, 0.055, null, i * 0.06));
        break;
      case 'hurt':
        if (this._ok(name, 0.12)) {
          this._osc('triangle', 200, 80, 0.14, 0.07);
          this._noise(0.1, 0.05, 'lowpass', 1200, 300);
        }
        break;
      case 'death':
        if (this._ok(name, 1)) [392, 311, 262, 196].forEach((f, i) => this._osc('triangle', f, f * 0.98, 0.28, 0.08, null, i * 0.16));
        break;
      case 'bossWarn':
        if (this._ok(name, 2)) [0, 0.3, 0.6].forEach((d) => this._osc('triangle', 330, 247, 0.22, 0.07, null, d));
        break;
      case 'notify':
        if (this._ok(name, 0.5)) [880, 1175].forEach((f, i) => this._osc('sine', f, f, 0.14, 0.04, null, i * 0.08));
        break;
      case 'click':
        if (this._ok(name, 0.05)) this._osc('sine', 660, 880, 0.05, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.1)) [660, 990, 1320].forEach((f, i) => this._osc('triangle', f, f, 0.1, 0.08, null, i * 0.06));
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
