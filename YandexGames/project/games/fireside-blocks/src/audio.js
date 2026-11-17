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
    this.intensity = 0;
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
    if (this.ctx.state === 'suspended' && this.suspendReasons.size === 0) this._resumeContext();
  }

  suspend(reason) {
    this.suspendReasons.add(reason);
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume(reason) {
    this.suspendReasons.delete(reason);
    if (this.ctx && this.suspendReasons.size === 0 && this.ctx.state === 'suspended') this._resumeContext();
  }

  _resumeContext() {
    const ctx = this.ctx;
    ctx.resume().then(() => {
      if (this.suspendReasons.size && ctx.state === 'running') return ctx.suspend();
    }).catch(() => {});
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
    // «деревянный» стук: короткий синус с призвуком и щелчок шума
    const wood = (f, vol, d = 0) => {
      o('sine', f, f * 0.92, 0.09, vol, null, d);
      o('triangle', f * 2.7, f * 2.5, 0.035, vol * 0.35, null, d);
      n(0.03, vol * 0.6, 'bandpass', f * 4, f * 3, null, d);
    };
    const pent = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) wood(900, 0.06);
        break;
      case 'pick':
        if (this._ok(name, 0.05)) wood(1300, 0.05);
        break;
      case 'drop':
        // фигура легла на поле
        if (this._ok(name, 0.05)) {
          wood(420, 0.13);
          wood(560, 0.06, 0.035);
        }
        break;
      case 'back':
        if (this._ok(name, 0.1)) o('sine', 500, 380, 0.1, 0.05);
        break;
      case 'deny':
      case 'error':
        if (this._ok('deny', 0.2)) {
          o('sine', 260, 210, 0.14, 0.08);
          n(0.05, 0.05, 'lowpass', 600, 300);
        }
        break;
      case 'clear': {
        // собранные линии: пробег маримбы вверх, длиннее за большее число линий и серию
        if (!this._ok(name, 0.08)) break;
        const lines = Math.max(1, p.lines || 1), combo = Math.max(1, p.combo || 1);
        const base = 72 + Math.min(combo - 1, 6) * 2;
        const cnt = 3 + Math.min(lines, 4) * 2;
        for (let i = 0; i < cnt; i++) {
          const f = mtof(base + pent[i % pent.length]);
          o('sine', f, f, 0.22, 0.05, null, i * 0.045);
          o('sine', f * 3.93, f * 3.93, 0.06, 0.012, null, i * 0.045);
        }
        for (let i = 0; i < 3 + lines; i++) n(0.04, 0.05, 'bandpass', 2500 + i * 300, 1800, null, 0.02 + i * 0.05);
        break;
      }
      case 'praise':
        if (this._ok(name, 0.4)) [76, 79, 83, 88].forEach((m, i) => o('triangle', mtof(m), mtof(m), 0.18, 0.045, null, 0.25 + i * 0.07));
        break;
      case 'allclear':
        if (this._ok(name, 1)) [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => o('sine', mtof(m), mtof(m), 0.3, 0.06, null, 0.3 + i * 0.07));
        break;
      case 'item':
        if (this._ok(name, 0.05)) {
          const f = mtof(84 + (p % 5) * 2);
          o('sine', f, f, 0.15, 0.05);
          o('sine', f * 1.5, f * 1.5, 0.12, 0.03, null, 0.05);
        }
        break;
      case 'goal':
        if (this._ok(name, 0.2)) [79, 84].forEach((m, i) => o('triangle', mtof(m), mtof(m), 0.16, 0.05, null, i * 0.08));
        break;
      case 'new':
        // новые фигуры в лотке
        if (this._ok(name, 0.2)) [0, 0.06, 0.12].forEach((d, i) => wood(700 + i * 120, 0.04, d));
        break;
      case 'hammer':
        if (this._ok(name, 0.15)) {
          o('sine', 180, 80, 0.2, 0.16);
          n(0.12, 0.12, 'lowpass', 1500, 300);
          wood(380, 0.08, 0.02);
        }
        break;
      case 'hint':
        if (this._ok(name, 0.3)) [84, 88, 91].forEach((m, i) => o('sine', mtof(m), mtof(m), 0.2, 0.04, null, i * 0.08));
        break;
      case 'undo':
        if (this._ok(name, 0.2)) [79, 74].forEach((m, i) => o('triangle', mtof(m), mtof(m), 0.12, 0.05, null, i * 0.07));
        break;
      case 'shuffle':
        if (this._ok(name, 0.3)) for (let i = 0; i < 6; i++) wood(600 + ((i * 3) % 5) * 140, 0.035, i * 0.04);
        break;
      case 'nospace':
        if (this._ok(name, 1)) [67, 64, 60, 55].forEach((m, i) => o('triangle', mtof(m), mtof(m) * 0.995, 0.3, 0.06, null, i * 0.2));
        break;
      case 'revive':
        if (this._ok(name, 0.5)) [60, 64, 67, 72, 76].forEach((m, i) => o('sine', mtof(m), mtof(m), 0.2, 0.06, null, i * 0.06));
        break;
      case 'win':
        if (this._ok('win', 1)) [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => o('triangle', mtof(m), mtof(m), 0.25, 0.06, null, i * 0.11));
        break;
      case 'lose':
        if (this._ok(name, 1)) [69, 67, 64, 60].forEach((m, i) => o('triangle', mtof(m), mtof(m), 0.25, 0.06, null, i * 0.18));
        break;
      case 'record':
        if (this._ok(name, 1)) [72, 76, 79, 84, 88, 91, 96, 100].forEach((m, i) => o('sine', mtof(m), mtof(m), 0.25, 0.05, null, i * 0.08));
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
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.15, 0.06, null, i * 0.06));
        break;
      case 'unlock':
        if (this._ok(name, 0.5)) [67, 72, 76, 79, 84].forEach((m, i) => o('sine', mtof(m), mtof(m), 0.3, 0.05, null, i * 0.09));
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
