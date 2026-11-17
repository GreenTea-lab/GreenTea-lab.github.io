// Синтезированные звуки, шум прибоя и музыка (WebAudio, без файлов)
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
      this.seaStart();
    }
    if (this.ctx.state === 'suspended' && this.suspendReasons.size === 0) this._resumeSafe();
  }

  _resumeSafe() {
    const c=this.ctx;
    c.resume().then(()=>{ if(this.suspendReasons.size && c.state==='running') c.suspend(); }).catch(()=>{});
  }

  suspend(reason) {
    this.suspendReasons.add(reason);
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }
  resume(reason) {
    this.suspendReasons.delete(reason);
    if (this.ctx && this.suspendReasons.size === 0 && this.ctx.state === 'suspended') this._resumeSafe();
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
        if (this._ok(name, 0.04)) o('sine', 900, 620, 0.06, 0.07);
        break;
      case 'deal':
        if (this._ok(name, 0.03)) n(0.06, 0.06, 'bandpass', 2600, 1800);
        break;
      case 'flip':
        if (this._ok(name, 0.05)) {
          n(0.07, 0.07, 'bandpass', 3000, 1600);
          o('sine', 700, 900, 0.05, 0.03);
        }
        break;
      case 'place':
        if (this._ok(name, 0.03)) {
          n(0.05, 0.08, 'lowpass', 1800, 600);
          o('sine', 260, 180, 0.06, 0.06);
        }
        break;
      case 'draw':
        if (this._ok(name, 0.05)) n(0.12, 0.08, 'bandpass', 1500, 3200);
        break;
      case 'combo': {
        // нота растёт с длиной серии (пентатоника)
        if (!this._ok('combo', 0.02)) break;
        const pent = [0, 2, 4, 7, 9];
        const k = Math.max(0, p);
        const midi = 72 + pent[k % 5] + 12 * Math.floor(k / 5);
        const f = 440 * Math.pow(2, (Math.min(midi, 98) - 69) / 12);
        o('sine', f, f, 0.22, 0.06);
        o('sine', f * 4, f * 4, 0.08, 0.012);
        break;
      }
      case 'deny':
        if (this._ok(name, 0.15)) o('triangle', 230, 180, 0.13, 0.07);
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.1, 0.05);
          o('sine', 2093, 2093, 0.16, 0.04, null, 0.05);
        }
        break;
      case 'unlock':
        if (this._ok(name, 0.2)) {
          o('square', 1200, 1200, 0.03, 0.03);
          [784, 1047, 1319].forEach((f, i) => o('sine', f, f, 0.2, 0.05, null, 0.06 + i * 0.07));
        }
        break;
      case 'wave':
        if (this._ok(name, 0.25)) n(0.5, 0.06, 'lowpass', 1400, 300);
        break;
      case 'undo':
        if (this._ok(name, 0.08)) o('sine', 700, 420, 0.12, 0.06);
        break;
      case 'joker':
        if (this._ok(name, 0.3)) [659, 880, 1109, 1319].forEach((f, i) => o('sine', f, f, 0.22, 0.05, null, i * 0.05));
        break;
      case 'star':
        if (this._ok(name + p, 0.1)) [1047 * (1 + p * 0.12), 1568 * (1 + p * 0.12)].forEach((f, i) => o('sine', f, f, 0.3, 0.06, null, i * 0.07));
        break;
      case 'win':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.32, 0.06, null, i * 0.1));
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 494, 440, 392].forEach((f, i) => o('sine', f, f * 0.99, 0.28, 0.06, null, i * 0.18));
        break;
      case 'build':
        if (this._ok(name, 0.5)) {
          [0, 0.16, 0.32].forEach((d) => {
            n(0.08, 0.12, 'bandpass', 900, 500, null, d);
            o('square', 180, 120, 0.05, 0.03, null, d);
          });
          [784, 988, 1175, 1568].forEach((f, i) => o('sine', f, f, 0.25, 0.05, null, 0.55 + i * 0.08));
        }
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.25, 0.05, null, i * 0.06));
        break;
      case 'gift':
        if (this._ok(name, 0.5)) [659, 784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.3, 0.05, null, i * 0.08));
        break;
      case 'open':
        if (this._ok(name, 0.1)) o('sine', 520, 780, 0.1, 0.05);
        break;
      case 'error':
        if (this._ok(name, 0.2)) o('triangle', 220, 180, 0.15, 0.07);
        break;
    }
  }

  // ---------- шум прибоя: мягкие накаты с паузами ----------
  seaStart() {
    if (!this.ctx || this.sea) return;
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = c.createGain();
    g.gain.value = 0;
    s.connect(f).connect(g).connect(this.sfx);
    s.start();
    this.sea = { s, f, g, next: 0 };
    this.seaTick();
  }
  seaTick() {
    if (!this.sea) return;
    const c = this.ctx;
    const t = c.currentTime;
    const S = this.sea;
    const lvl = this.seaLevel ?? 1;
    const dur = 3 + Math.random() * 2.5;
    // накат: громкость и фильтр поднимаются и спадают
    S.g.gain.cancelScheduledValues(t);
    S.g.gain.setValueAtTime(Math.max(0.0001, S.g.gain.value), t);
    S.g.gain.linearRampToValueAtTime(0.05 * lvl, t + dur * 0.4);
    S.g.gain.linearRampToValueAtTime(0.012 * lvl, t + dur);
    S.f.frequency.cancelScheduledValues(t);
    S.f.frequency.setValueAtTime(380, t);
    S.f.frequency.linearRampToValueAtTime(900, t + dur * 0.4);
    S.f.frequency.linearRampToValueAtTime(420, t + dur);
    clearTimeout(this.seaT);
    this.seaT = setTimeout(() => this.seaTick(), dur * 1000);
  }
  setSea(v) {
    this.seaLevel = v;
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
