// Звук: синтезированные эффекты и музыка (Web Audio) + голос ведущего (заранее озвученные фразы MP3).
import { Music } from './music.js';
import { SONGS } from './songs.js';
import { VOICE } from './voice-data.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.sfxVol = 0.85;
    this.voiceVol = 1;
    this.musicOn = true;
    this.sfxOn = true;
    this.mus = new Music(this);
    this.mus.define(SONGS);
    this.last = {};
    this.suspendReasons = new Set();
    this.buffers = {}; // ключ_вариант → AudioBuffer
    this.decoding = {};
    this.cur = null; // играющая фраза
    this.level = 0; // громкость голоса сейчас (для движения рта)
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.comp = c.createDynamicsCompressor();
      this.comp.connect(c.destination);
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.comp);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.6 * this.sfxVol;
      this.sfx.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = 0.6 * this.musicVol;
      this.duck = c.createGain();
      this.music.connect(this.duck).connect(this.master);
      this.voice = c.createGain();
      this.voice.gain.value = this.voiceVol;
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 512;
      this.voice.connect(this.analyser);
      this.voice.connect(this.master);
      this._abuf = new Float32Array(this.analyser.fftSize);
      const len = c.sampleRate;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.wantMusic) this.startMusic();
      this._preload();
    }
    if (this.ctx.state === 'suspended' && this.suspendReasons.size === 0) this.ctx.resume();
  }

  // фоновая расшифровка всех фраз по очереди
  async _preload() {
    for (const k in VOICE) for (let i = 0; i < VOICE[k].length; i++) await this._buf(k, i);
  }

  _buf(k, i) {
    const id = k + '_' + i;
    if (this.buffers[id]) return Promise.resolve(this.buffers[id]);
    if (this.decoding[id]) return this.decoding[id];
    const b64 = VOICE[k] && VOICE[k][i];
    if (!b64 || !this.ctx) return Promise.resolve(null);
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
    this.decoding[id] = new Promise((res) => {
      try {
        const p = this.ctx.decodeAudioData(u.buffer, (b) => { this.buffers[id] = b; res(b); }, () => res(null));
        if (p && p.catch) p.catch(() => res(null));
      } catch (e) {
        res(null);
      }
    });
    return this.decoding[id];
  }

  // Сказать фразу k (вариант i). Возвращает длительность в секундах (0 — без звука)
  async say(k, i) {
    this.stopVoice();
    if (!this.ctx || this.voiceVol <= 0) return 0;
    const b = await this._buf(k, i);
    if (!b) return 0;
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(this.voice);
    s.start();
    this.cur = s;
    this.duck.gain.setTargetAtTime(0.3, c.currentTime, 0.08);
    s.onended = () => {
      if (this.cur === s) {
        this.cur = null;
        this.duck.gain.setTargetAtTime(1, c.currentTime, 0.4);
      }
    };
    return b.duration;
  }

  stopVoice() {
    if (this.cur) {
      try { this.cur.stop(); } catch (e) {}
      this.cur = null;
      if (this.ctx) this.duck.gain.setTargetAtTime(1, this.ctx.currentTime, 0.3);
    }
  }

  // уровень голоса 0..1 — для анимации рта ведущего
  voiceLevel() {
    if (!this.analyser || !this.cur || this.ctx.state !== 'running') return 0;
    this.analyser.getFloatTimeDomainData(this._abuf);
    let s = 0;
    for (let i = 0; i < this._abuf.length; i++) s += this._abuf[i] * this._abuf[i];
    return Math.min(1, Math.sqrt(s / this._abuf.length) * 5);
  }

  speaking() {
    return !!this.cur;
  }

  suspend(reason) {
    this.suspendReasons.add(reason);
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume(reason) {
    this.suspendReasons.delete(reason);
    if (this.ctx && this.suspendReasons.size === 0 && this.ctx.state === 'suspended') this.ctx.resume();
  }
  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setMusicVol(v) {
    this.musicVol = Math.max(0, Math.min(1, v));
    this.musicOn = this.musicVol > 0;
    if (this.music) this.music.gain.setTargetAtTime(0.6 * this.musicVol, this.ctx.currentTime, 0.05);
  }
  setSfxVol(v) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    this.sfxOn = this.sfxVol > 0;
    if (this.sfx) this.sfx.gain.setTargetAtTime(0.6 * this.sfxVol, this.ctx.currentTime, 0.05);
  }
  setVoiceVol(v) {
    this.voiceVol = Math.max(0, Math.min(1, v));
    if (this.voice) this.voice.gain.setTargetAtTime(this.voiceVol, this.ctx.currentTime, 0.05);
    if (this.voiceVol <= 0) this.stopVoice();
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

  _osc(type, f0, f1, dur, vol, delay = 0, attack = 0.005) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, type, f0, f1, delay = 0, q = 1) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  // нота «медной» фанфары
  _brass(f, delay, dur, vol) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    o2.type = 'sawtooth';
    o.frequency.value = f;
    o2.frequency.value = f * 1.005;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
    lp.frequency.linearRampToValueAtTime(1400, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    g.gain.setValueAtTime(vol * 0.8, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(this.sfx);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.1);
    o2.stop(t + dur + 0.1);
  }

  applause(dur = 2.2, vol = 1) {
    if (!this._ok('applause', 0.8)) return;
    const n = Math.floor(dur * 70);
    for (let i = 0; i < n; i++) {
      const d = Math.random() * dur;
      const env = Math.sin((d / dur) * Math.PI) ** 0.6;
      this._noise(0.05, 0.05 * env * vol * (0.5 + Math.random()), 'bandpass', 900 + Math.random() * 1800, 800, d, 1.2);
    }
    this._noise(dur, 0.02 * vol, 'bandpass', 1500, 1200, 0, 0.5);
  }

  play(name, p = 0) {
    const o = (...a) => this._osc(...a);
    const n = (...a) => this._noise(...a);
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) o('sine', 900, 620, 0.06, 0.07);
        break;
      case 'key':
        if (this._ok(name, 0.03)) { o('triangle', 700, 500, 0.06, 0.06); n(0.03, 0.03, 'highpass', 3000, 3000); }
        break;
      case 'tick':
        // штырёк барабана бьёт по язычку стрелки
        if (this._ok(name, 0.025)) { n(0.025, 0.12 * (p || 1), 'bandpass', 2600, 1900, 0, 2); o('square', 1500, 900, 0.02, 0.025 * (p || 1)); }
        break;
      case 'whoosh':
        if (this._ok(name, 0.3)) n(0.5, 0.06, 'bandpass', 400, 1800, 0, 0.8);
        break;
      case 'open':
        // буква на табло переворачивается: щелчок и звон
        if (this._ok(name + p, 0.05)) { n(0.03, 0.08, 'bandpass', 2000, 2000, 0, 2); o('sine', 1318, 1318, 0.5, 0.06, 0.02); o('sine', 1976, 1976, 0.35, 0.03, 0.03); }
        break;
      case 'wrong':
        if (this._ok(name, 0.4)) { o('square', 180, 160, 0.35, 0.03); o('square', 140, 130, 0.45, 0.025, 0.18); }
        break;
      case 'bankrot':
        if (this._ok(name, 1)) [392, 370, 349, 311].forEach((f, i) => this._brass(f, i * 0.32, i === 3 ? 0.8 : 0.28, 0.05));
        break;
      case 'fanfare':
        if (this._ok(name, 1)) [[523, 0, 0.14], [659, 0.15, 0.14], [784, 0.3, 0.14], [1047, 0.45, 0.6], [784, 0.45, 0.6], [659, 0.45, 0.6]].forEach(([f, d, l]) => this._brass(f, d, l, 0.045));
        break;
      case 'prize':
        if (this._ok(name, 1)) { [[587, 0, 0.12], [740, 0.13, 0.12], [880, 0.26, 0.5], [1175, 0.26, 0.5]].forEach(([f, d, l]) => this._brass(f, d, l, 0.04)); [0, 0.1, 0.2, 0.3].forEach((d, i) => o('sine', 1568 + i * 200, 1568 + i * 200, 0.4, 0.03, 0.3 + d)); }
        break;
      case 'win':
        if (this._ok(name, 1)) { [[523, 0, 0.18], [659, 0.2, 0.18], [784, 0.4, 0.18], [1047, 0.6, 0.9], [784, 0.6, 0.9], [523, 0.6, 0.9]].forEach(([f, d, l]) => this._brass(f, d, l, 0.05)); this.applause(3, 1.2); }
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 494, 440, 392].forEach((f, i) => o('sine', f, f * 0.99, 0.3, 0.05, i * 0.2));
        break;
      case 'coin':
        if (this._ok(name, 0.05)) { o('sine', 1568, 1568, 0.1, 0.05); o('sine', 2093, 2093, 0.18, 0.04, 0.06); }
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.25, 0.05, i * 0.06));
        break;
      case 'box':
        if (this._ok(name, 0.5)) { n(0.2, 0.08, 'lowpass', 1200, 300); o('sine', 220, 440, 0.25, 0.05, 0.1); }
        break;
      case 'timer':
        if (this._ok(name, 0.5)) o('sine', p ? 1200 : 900, p ? 1200 : 900, 0.08, 0.05);
        break;
      case 'drumroll':
        if (this._ok(name, 1)) for (let i = 0; i < 24; i++) n(0.06, 0.04 + i * 0.002, 'bandpass', 900, 600, i * 0.05, 1);
        break;
      case 'deny':
        if (this._ok(name, 0.15)) o('triangle', 230, 180, 0.13, 0.07);
        break;
    }
  }
}

export const audio = new AudioEngine();
