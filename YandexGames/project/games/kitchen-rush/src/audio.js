// Синтезированные звуки, шумы кухни и музыка (WebAudio, без файлов)
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
    const o = (...a) => this._osc(...a);
    const n = (...a) => this._noise(...a);
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) o('sine', 900, 600, 0.06, 0.08);
        break;
      case 'select':
        if (this._ok(name, 0.05)) o('triangle', 600, 900, 0.08, 0.08);
        break;
      case 'pick':
        if (this._ok(name, 0.05)) o('sine', 420, 760, 0.08, 0.1);
        break;
      case 'drop':
        if (this._ok(name, 0.05)) o('sine', 520, 260, 0.09, 0.11);
        break;
      case 'plop':
        if (this._ok(name, 0.05)) {
          o('sine', 300, 140, 0.12, 0.12);
          n(0.12, 0.05, 'lowpass', 900, 300);
        }
        break;
      case 'combine':
        if (this._ok(name, 0.05)) o('triangle', 660, 990, 0.1, 0.08);
        break;
      case 'pour':
        if (this._ok(name, 0.1)) {
          n(0.3, 0.08, 'bandpass', 700, 1600);
          o('triangle', 500, 800, 0.15, 0.06);
        }
        break;
      case 'chop':
        if (this._ok(name, 0.06)) {
          o('square', 220, 120, 0.04, 0.05);
          n(0.05, 0.12, 'highpass', 2500, 2500);
        }
        break;
      case 'chopped':
        if (this._ok(name, 0.1)) [880, 1175].forEach((f, i) => o('triangle', f, f, 0.1, 0.06, null, i * 0.06));
        break;
      case 'wash':
        if (this._ok(name, 0.1)) n(0.25, 0.08, 'bandpass', 1400, 600);
        break;
      case 'washed':
        if (this._ok(name, 0.1)) o('sine', 1320, 1760, 0.12, 0.05);
        break;
      case 'cooked':
        if (this._ok(name, 0.2)) [1047, 1319].forEach((f, i) => o('sine', f, f, 0.18, 0.06, null, i * 0.1));
        break;
      case 'warn':
        if (this._ok(name, 0.3)) [880, 880].forEach((f, i) => o('square', f, f, 0.08, 0.035, null, i * 0.14));
        break;
      case 'burnt':
        if (this._ok(name, 0.3)) {
          n(0.6, 0.15, 'lowpass', 900, 200);
          o('sawtooth', 200, 80, 0.4, 0.03);
        }
        break;
      case 'fire':
        if (this._ok(name, 0.5)) n(0.8, 0.2, 'lowpass', 1200, 300);
        break;
      case 'extinguished':
        if (this._ok(name, 0.3)) n(0.4, 0.12, 'highpass', 3000, 1500);
        break;
      case 'serve':
        if (this._ok(name, 0.2)) {
          o('sine', 2093, 2093, 0.6, 0.06);
          o('sine', 2637, 2637, 0.5, 0.03);
          [784, 988, 1175].forEach((f, i) => o('triangle', f, f, 0.18, 0.05, null, 0.08 + i * 0.07));
        }
        break;
      case 'order':
        if (this._ok(name, 0.3)) [659, 880].forEach((f, i) => o('sine', f, f, 0.16, 0.06, null, i * 0.09));
        break;
      case 'miss':
        if (this._ok(name, 0.4)) [440, 349].forEach((f, i) => o('triangle', f, f * 0.98, 0.25, 0.07, null, i * 0.18));
        break;
      case 'wrong':
      case 'deny':
        if (this._ok('deny', 0.2)) o('triangle', 220, 170, 0.14, 0.08);
        break;
      case 'trash':
        if (this._ok(name, 0.15)) {
          n(0.2, 0.1, 'lowpass', 1500, 300);
          o('sine', 180, 90, 0.15, 0.08);
        }
        break;
      case 'switch':
        if (this._ok(name, 0.1)) {
          n(0.18, 0.05, 'bandpass', 600, 2000);
          o('triangle', 500, 900, 0.1, 0.05);
        }
        break;
      case 'tick':
        if (this._ok(name, 0.3)) o('square', 1200, 1200, 0.04, 0.03);
        break;
      case 'beep':
        if (this._ok(name, 0.3)) o('triangle', 660, 660, 0.2, 0.07);
        break;
      case 'go':
        if (this._ok(name, 0.5)) [523, 659, 784, 1047].forEach((f, i) => o('triangle', f, f, 0.22, 0.07, null, i * 0.07));
        break;
      case 'end':
        if (this._ok(name, 1)) {
          o('square', 1760, 1760, 0.12, 0.04);
          o('square', 1760, 1760, 0.12, 0.04, null, 0.18);
          o('square', 1760, 1760, 0.35, 0.04, null, 0.36);
        }
        break;
      case 'star':
        if (this._ok(name, 0.1)) [1047 * (1 + p * 0.12), 1568 * (1 + p * 0.12)].forEach((f, i) => o('sine', f, f, 0.3, 0.07, null, i * 0.07));
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.12, 0.05);
          o('sine', 2093, 2093, 0.18, 0.04, null, 0.05);
        }
        break;
      case 'win':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.35, 0.07, null, i * 0.11));
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 494, 440, 392].forEach((f, i) => o('triangle', f, f * 0.99, 0.25, 0.07, null, i * 0.2));
        break;
      case 'error':
        if (this._ok(name, 0.2)) o('triangle', 220, 180, 0.15, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.25, 0.06, null, i * 0.06));
        break;
      case 'upgrade':
        if (this._ok(name, 0.15)) [660, 880, 1320].forEach((f, i) => o('triangle', f, f, 0.16, 0.06, null, i * 0.05));
        break;
    }
  }

  // ---------- фоновые петли кухни: шкворчание, бульканье, огонь ----------
  loopsStart() {
    if (!this.ctx || this.loops) return;
    const c = this.ctx;
    const mk = (type, f, q) => {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const fl = c.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q;
      const g = c.createGain();
      g.gain.value = 0;
      s.connect(fl).connect(g).connect(this.sfx);
      s.start();
      return { s, g, fl };
    };
    this.loops = { sizzle: mk('highpass', 3500, 0.7), boil: mk('lowpass', 500, 4), fire: mk('lowpass', 900, 1), spray: mk('bandpass', 2400, 0.8) };
  }

  // уровни 0..1
  loopsSet(v) {
    const L = this.loops;
    if (!L) return;
    const t = this.ctx.currentTime;
    const crackle = 0.5 + Math.random() * 0.5;
    L.sizzle.g.gain.setTargetAtTime(Math.min(1, v.sizzle) * 0.035 * crackle, t, 0.05);
    L.boil.g.gain.setTargetAtTime(Math.min(1, v.boil) * 0.05 * (0.6 + Math.random() * 0.4), t, 0.08);
    L.fire.g.gain.setTargetAtTime(Math.min(1, v.fire) * 0.09 * crackle, t, 0.05);
    L.spray.g.gain.setTargetAtTime(v.spray ? 0.06 : 0, t, 0.04);
  }

  loopsStop() {
    const L = this.loops;
    if (!L) return;
    this.loops = null;
    const t = this.ctx.currentTime;
    for (const k in L) L[k].g.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => {
      for (const k in L)
        try {
          L[k].s.stop();
        } catch (e) {}
    }, 400);
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
