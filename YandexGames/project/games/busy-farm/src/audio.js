// Синтезированные звуки фермы и музыка (WebAudio, без файлов)
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

  // голос с плавным изменением высоты по точкам [время, частота] и вибрато
  _voice(type, pts, dur, vol, opts = {}) {
    const c = this.ctx;
    const t = c.currentTime + (opts.delay || 0);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(pts[0][1], t);
    for (const [tt, f] of pts.slice(1)) o.frequency.linearRampToValueAtTime(f, t + tt);
    let node = o;
    if (opts.vib) {
      const l = c.createOscillator();
      const lg = c.createGain();
      l.frequency.value = opts.vib;
      lg.gain.value = opts.vibAmt || 12;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.lp || 2400;
    o.connect(f);
    node = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack || 0.03));
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name, p = 0) {
    const o = (...a) => this._osc(...a);
    const n = (...a) => this._noise(...a);
    const v = (...a) => this._voice(...a);
    const r = () => 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'click':
        if (this._ok(name, 0.04)) o('sine', 900, 600, 0.06, 0.08);
        break;
      case 'tab':
        if (this._ok(name, 0.05)) o('triangle', 600, 900, 0.08, 0.07);
        break;
      case 'plant':
        if (this._ok(name, 0.05)) {
          n(0.16, 0.07, 'bandpass', 2600, 1200);
          o('sine', 340 * r(), 520, 0.1, 0.06);
          n(0.12, 0.04, 'highpass', 4000, 3000, null, 0.05);
        }
        break;
      case 'nowater':
        if (this._ok(name, 0.3)) [392, 330].forEach((f, i) => o('triangle', f, f, 0.14, 0.07, null, i * 0.12));
        break;
      case 'refill':
        if (this._ok(name, 0.3)) {
          [0, 0.18, 0.36].forEach((d) => o('triangle', 260, 300, 0.08, 0.04, null, d));
          n(0.6, 0.06, 'bandpass', 900, 500, null, 0.1);
        }
        break;
      case 'water':
        if (this._ok(name, 0.3)) {
          n(0.4, 0.08, 'bandpass', 1400, 500);
          [0, 0.07, 0.15].forEach((d, i) => o('sine', 900 + i * 300, 500 + i * 200, 0.08, 0.05, null, d));
        }
        break;
      case 'lay':
        if (this._ok(name, 0.08)) o('sine', 520 * r(), 260, 0.12, 0.09);
        break;
      case 'collect':
        if (this._ok(name, 0.04)) {
          const k = 1 + (p % 4) * 0.06;
          o('sine', 880 * k, 1320 * k, 0.09, 0.07);
          o('sine', 1760 * k, 1760 * k, 0.12, 0.035, null, 0.05);
        }
        break;
      case 'load':
        if (this._ok(name, 0.05)) {
          o('triangle', 300, 200, 0.08, 0.08);
          n(0.08, 0.05, 'lowpass', 900, 400);
        }
        break;
      case 'made':
        if (this._ok(name, 0.15)) [1047, 1319].forEach((f, i) => o('sine', f, f, 0.18, 0.05, null, i * 0.08));
        break;
      case 'build':
        if (this._ok(name, 0.3)) {
          [0, 0.14, 0.28].forEach((d) => {
            o('square', 220, 110, 0.05, 0.03, null, d);
            n(0.06, 0.08, 'bandpass', 1800, 1200, null, d);
          });
          [523, 659, 784].forEach((f, i) => o('triangle', f, f, 0.2, 0.06, null, 0.45 + i * 0.08));
        }
        break;
      case 'buy':
        if (this._ok(name, 0.2)) [659, 784, 988].forEach((f, i) => o('triangle', f, f, 0.16, 0.06, null, i * 0.06));
        break;
      case 'land':
        if (this._ok(name, 0.1)) {
          o('sine', 160, 70, 0.18, 0.12);
          n(0.18, 0.06, 'lowpass', 600, 200);
        }
        break;
      case 'goose':
        if (this._ok(name, 0.3)) {
          const f = 640 * r();
          v('square', [[0, f], [0.06, f * 1.15], [0.16, f * 0.85]], 0.18, 0.035, { lp: 1600 });
          v('square', [[0, f * 1.05], [0.05, f * 1.2], [0.14, f * 0.9]], 0.16, 0.03, { lp: 1600, delay: 0.2 });
        }
        break;
      case 'sheep':
        if (this._ok(name, 0.4)) {
          const f = 420 * r();
          v('triangle', [[0, f], [0.1, f * 1.08], [0.55, f * 0.92]], 0.6, 0.035, { vib: 11, vibAmt: 22, lp: 1300 });
        }
        break;
      case 'cow':
        if (this._ok(name, 0.6)) {
          const f = 150 * r();
          v('triangle', [[0, f * 0.9], [0.25, f * 1.1], [0.9, f * 0.75]], 1.0, 0.05, { lp: 700, attack: 0.12 });
        }
        break;
      case 'cat':
        if (this._ok(name, 0.5)) v('triangle', [[0, 700], [0.15, 1050], [0.4, 640]], 0.45, 0.06, { lp: 3000 });
        break;
      case 'dog':
        if (this._ok(name, 0.3)) {
          [0, 0.22].forEach((d) => {
            v('triangle', [[0, 380], [0.04, 300], [0.1, 180]], 0.12, 0.1, { lp: 1400, delay: d, attack: 0.01 });
            n(0.08, 0.05, 'bandpass', 900, 600, null, d);
          });
        }
        break;
      case 'bear':
        if (this._ok(name, 0.6)) {
          n(0.7, 0.12, 'lowpass', 380, 160);
          v('triangle', [[0, 95], [0.2, 120], [0.65, 80]], 0.7, 0.08, { vib: 25, vibAmt: 10, lp: 500 });
        }
        break;
      case 'cageHit':
        if (this._ok(name, 0.03)) {
          const f = 600 + p * 120;
          o('triangle', f, f, 0.07, 0.07);
          n(0.05, 0.08, 'highpass', 3000, 3000);
        }
        break;
      case 'caged':
        if (this._ok(name, 0.3)) {
          n(0.1, 0.12, 'bandpass', 2500, 1500);
          [784, 988, 1175, 1568].forEach((f, i) => o('triangle', f, f, 0.18, 0.06, null, 0.05 + i * 0.07));
        }
        break;
      case 'truck':
        if (this._ok(name, 0.6)) {
          [0, 0.18].forEach((d) => {
            o('triangle', 440, 440, 0.14, 0.05, null, d);
            o('triangle', 554, 554, 0.14, 0.04, null, d);
          });
          n(0.9, 0.05, 'lowpass', 300, 140, null, 0.3);
        }
        break;
      case 'sold':
        if (this._ok(name, 0.3)) {
          for (let i = 0; i < 6; i++) o('sine', 1568 + (i % 3) * 300, 1568 + (i % 3) * 300, 0.12, 0.04, null, i * 0.06);
          [523, 784, 1047].forEach((f, i) => o('triangle', f, f, 0.2, 0.04, null, 0.4 + i * 0.07));
        }
        break;
      case 'spoil':
        if (this._ok(name, 0.2)) {
          n(0.15, 0.08, 'lowpass', 1200, 300);
          o('sine', 300, 120, 0.12, 0.05);
        }
        break;
      case 'hungry':
      case 'warn':
        if (this._ok('warn', 0.6)) [880, 740].forEach((f, i) => o('triangle', f, f, 0.12, 0.05, null, i * 0.14));
        break;
      case 'starved':
        if (this._ok(name, 1)) [523, 466, 392].forEach((f, i) => o('triangle', f, f * 0.98, 0.22, 0.06, null, i * 0.18));
        break;
      case 'goal':
        if (this._ok(name, 0.3)) [784, 1047].forEach((f, i) => o('sine', f, f, 0.2, 0.07, null, i * 0.09));
        break;
      case 'deny':
        if (this._ok('deny', 0.2)) o('triangle', 220, 170, 0.14, 0.08);
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.12, 0.05);
          o('sine', 2093, 2093, 0.18, 0.04, null, 0.05);
        }
        break;
      case 'star':
        if (this._ok(name, 0.1)) [1047 * (1 + p * 0.12), 1568 * (1 + p * 0.12)].forEach((f, i) => o('sine', f, f, 0.3, 0.07, null, i * 0.07));
        break;
      case 'win':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.3, 0.07, null, i * 0.11));
        break;
      case 'upgrade':
        if (this._ok(name, 0.15)) [660, 880, 1320].forEach((f, i) => o('triangle', f, f, 0.16, 0.06, null, i * 0.05));
        break;
    }
  }

  // бормотание животных время от времени
  ambient(kind) {
    if (Math.random() < 0.5) this.play(kind);
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
