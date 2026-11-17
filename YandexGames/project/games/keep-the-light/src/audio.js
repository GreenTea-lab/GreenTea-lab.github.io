// Звуки и музыка на WebAudio (без файлов). Звуки Жильца объёмные — слышно, откуда он идёт.
import { Music } from './music.js';
import { SONGS } from './songs.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.musicVol = 0.7;
    this.sfxVol = 0.9;
    this.mus = new Music(this);
    this.mus.define(SONGS);
    this.last = {};
    this.suspendReasons = new Set();
    this.listener = { x: 0, z: 0, yaw: 0 };
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14;
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
      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // коричневый шум для дождя и грома
      this.brown = c.createBuffer(1, len, c.sampleRate);
      const b = this.brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
      this._rain();
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

  // дождь за окнами — тихий шум, громкость зависит от сцены
  _rain() {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 0.4;
    const f2 = c.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.value = 5000;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0.012;
    s.connect(f).connect(f2).connect(this.rainGain).connect(this.sfx);
    s.start();
  }

  // слушатель (камера)
  setListener(x, z, yaw) {
    this.listener.x = x;
    this.listener.z = z;
    this.listener.yaw = yaw;
  }

  // объёмная точка: панорама + затухание по расстоянию (дешевле PannerNode)
  _at(pos, range = 18) {
    const c = this.ctx;
    const dx = pos.x - this.listener.x,
      dz = pos.z - this.listener.z;
    const d = Math.hypot(dx, dz);
    // вправо от взгляда: (cos yaw, -sin yaw)
    const right = (dx * Math.cos(this.listener.yaw) - dz * Math.sin(this.listener.yaw)) / (d || 1);
    const g = c.createGain();
    g.gain.value = Math.max(0, 1 - d / range) ** 1.6;
    if (g.gain.value < 0.01) return null;
    let node = g;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-0.9, Math.min(0.9, right * 0.9));
      g.connect(p);
      node = p;
    }
    // за стеной глуше
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = pos.muffled ? 700 : 6000;
    node.connect(lp).connect(this.sfx);
    return g;
  }

  _ok(name, gap) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  _osc(type, f0, f1, dur, vol, out, delay = 0, attack = 0.005) {
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
    o.connect(g).connect(out || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  _noise(dur, vol, type, f0, f1, out, delay = 0, buf, q = 1, attack = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = buf || this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    if (attack) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
    } else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out || this.sfx);
    s.start(t, Math.random() * 1);
    s.stop(t + dur + 0.02);
  }

  // скрип: пила через узкий фильтр с дрожанием высоты
  _creak(out, dur = 0.5, f = 380, vol = 0.05, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    for (let i = 1; i < 8; i++) o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.5), t + (dur * i) / 8);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 3;
    bp.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g).connect(out || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name, p = 0, pos = null) {
    if (!this._ok(name + (pos ? 'p' : ''), { step: 0.15, stepRun: 0.12, mStep: 0.2, mStepFast: 0.15, heart: 0.2, tick: 0.3 }[name] ?? 0.05)) return;
    const out = pos ? this._at(pos, { mStep: 22, mStepFast: 24, doorOpen: 18, slam: 30, whisper: 10, tick: 7, growl: 16 }[name] || 16) : this.sfx;
    if (!out) return;
    const o = (...a) => this._osc(...a);
    const n = (...a) => this._noise(...a);
    switch (name) {
      case 'click':
        o('square', 1800, 1200, 0.025, 0.04, out);
        n(0.02, 0.05, 'highpass', 4000, 4000, out);
        break;
      case 'select':
        o('sine', 700, 900, 0.07, 0.06, out);
        break;
      case 'deny':
        o('triangle', 200, 160, 0.14, 0.08, out);
        break;
      case 'step':
        // мягкий шаг по доскам + редкий скрип
        n(0.07, 0.05, 'lowpass', 500, 200, out);
        o('sine', 90, 60, 0.06, 0.05, out);
        if (Math.random() < 0.18) this._creak(out, 0.25, 300 + Math.random() * 200, 0.015);
        break;
      case 'stepRun':
        n(0.08, 0.08, 'lowpass', 700, 250, out);
        o('sine', 100, 55, 0.07, 0.08, out);
        break;
      case 'mStep':
      case 'mStepFast': {
        const fast = name === 'mStepFast';
        o('sine', fast ? 80 : 70, 40, 0.18, fast ? 0.28 : 0.22, out);
        n(0.12, fast ? 0.14 : 0.1, 'lowpass', 400, 150, out);
        if (Math.random() < 0.35) this._creak(out, 0.35, 220 + Math.random() * 120, 0.03, 0.05);
        break;
      }
      case 'pant':
        for (let i = 0; i < 4; i++) n(0.22, 0.05, 'bandpass', 900, 1400, out, i * 0.38, null, 1.5, 0.08);
        break;
      case 'doorOpen':
        this._creak(out, 0.7, 260 + Math.random() * 120, 0.05);
        break;
      case 'doorClose':
        this._creak(out, 0.3, 320, 0.03);
        o('sine', 120, 60, 0.15, 0.15, out, 0.25);
        n(0.1, 0.08, 'lowpass', 600, 200, out, 0.25);
        break;
      case 'slam':
        o('sine', 110, 40, 0.35, 0.35, out);
        n(0.3, 0.25, 'lowpass', 1200, 150, out);
        break;
      case 'key':
        for (let i = 0; i < 5; i++) o('triangle', 2400 + Math.random() * 1600, 2200, 0.08, 0.03, out, i * 0.045);
        o('sine', 1320, 1320, 0.25, 0.04, out, 0.2);
        o('sine', 1760, 1760, 0.3, 0.035, out, 0.32);
        break;
      case 'battery':
        o('square', 1400, 1400, 0.03, 0.03, out);
        o('sine', 400, 1600, 0.3, 0.04, out, 0.05);
        break;
      case 'flash':
        n(0.3, 0.12, 'highpass', 2000, 6000, out);
        o('sine', 3000, 300, 0.4, 0.05, out);
        break;
      case 'stunned':
        // Жилец отшатнулся: рваный шипящий вскрик
        n(0.6, 0.12, 'bandpass', 2400, 700, out, 0, null, 3);
        o('sawtooth', 600, 200, 0.35, 0.03, out);
        break;
      case 'spotted':
        // жало: диссонанс короткими щипками
        [0, 1, 6, 7].forEach((s, i) => o('triangle', 220 * Math.pow(2, s / 12), 220 * Math.pow(2, s / 12), 0.25, 0.05, out, i * 0.02));
        o('sine', 70, 40, 0.4, 0.25, out);
        n(0.25, 0.08, 'highpass', 3000, 8000, out);
        break;
      case 'lost':
        [523, 466, 392].forEach((f, i) => o('sine', f, f, 0.25, 0.03, out, i * 0.12));
        break;
      case 'scream': {
        // скример: громкий шум + кластер с быстрым вибрато (короткий)
        n(0.9, 0.5, 'bandpass', 1800, 900, out, 0, null, 0.8);
        n(0.5, 0.4, 'lowpass', 600, 100, out);
        for (const f of [310, 330, 466, 620]) {
          const os = o('sawtooth', f, f * 0.6, 0.9, 0.08, out);
          const l = this.ctx.createOscillator(),
            lg = this.ctx.createGain();
          l.frequency.value = 28;
          lg.gain.value = f * 0.06;
          l.connect(lg).connect(os.frequency);
          l.start();
          l.stop(this.ctx.currentTime + 1);
        }
        o('sine', 60, 30, 0.8, 0.5, out);
        break;
      }
      case 'heart':
        o('sine', 62, 40, 0.13, 0.25 * (0.5 + p * 0.5), out);
        o('sine', 58, 38, 0.12, 0.18 * (0.5 + p * 0.5), out, 0.2);
        break;
      case 'hide':
        this._creak(out, 0.35, 420, 0.04);
        n(0.15, 0.06, 'lowpass', 800, 300, out, 0.3);
        break;
      case 'unlock':
        for (let i = 0; i < 3; i++) {
          o('square', 900 - i * 120, 600, 0.04, 0.04, out, i * 0.09);
          n(0.05, 0.08, 'highpass', 2500, 2500, out, i * 0.09);
        }
        o('sine', 200, 120, 0.2, 0.15, out, 0.3);
        break;
      case 'locked':
        for (let i = 0; i < 2; i++) {
          o('square', 300, 250, 0.05, 0.05, out, i * 0.12);
          n(0.06, 0.1, 'bandpass', 1500, 1500, out, i * 0.12);
        }
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.35, 0.05, out, 0.4 + i * 0.12));
        this._creak(out, 1.2, 200, 0.05);
        break;
      case 'thunder':
        n(2.6, 0.22, 'lowpass', 300, 60, out, 0, this.brown, 1, 0.08);
        n(0.4, 0.15, 'lowpass', 1200, 200, out, 0.05);
        break;
      case 'whisper':
        for (let i = 0; i < 6; i++) n(0.18 + Math.random() * 0.15, 0.04, 'bandpass', 2500 + Math.random() * 2500, 1800, out, i * 0.22 + Math.random() * 0.1, null, 4, 0.05);
        break;
      case 'growl':
        n(0.8, 0.12, 'lowpass', 220, 120, out, 0, this.brown, 1, 0.1);
        o('sawtooth', 55, 45, 0.7, 0.04, out, 0, 0.1);
        break;
      case 'tick':
        o('square', 2600, 2600, 0.012, 0.02, out);
        break;
      case 'chime':
        [0, 0.9, 1.8].forEach((d) => {
          o('sine', 392, 392, 0.8, 0.06, out, d);
          o('sine', 784 * 1.01, 784, 0.4, 0.02, out, d);
        });
        break;
      case 'drip':
        o('sine', 1800 + Math.random() * 600, 900, 0.06, 0.03, out);
        break;
      case 'ball':
        [0, 0.35, 0.6, 0.78, 0.9].forEach((d, i) => o('sine', 200, 120, 0.08, 0.12 / (i + 1), out, d));
        break;
      case 'coin':
        o('sine', 1568, 1568, 0.08, 0.05, out);
        o('sine', 2093, 2093, 0.12, 0.04, out, 0.05);
        break;
      case 'buy':
        [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.15, 0.06, out, i * 0.06));
        break;
      case 'star':
        [1047 * (1 + p * 0.12), 1568 * (1 + p * 0.12)].forEach((f, i) => o('sine', f, f, 0.2, 0.06, out, i * 0.07));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => o('triangle', f, f * 0.99, 0.22, 0.06, out, i * 0.2));
        break;
    }
  }

  // громкость дождя (тише в подвале)
  setRain(v) {
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.5);
  }
}

export const audio = new AudioEngine();
