// Синтезированные звуки, мотор и музыка (WebAudio, без файлов)
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
      case 'beep':
        if (this._ok(name, 0.3)) o('square', 660, 660, 0.22, 0.05);
        break;
      case 'go':
        if (this._ok(name, 0.5)) {
          o('square', 1320, 1320, 0.45, 0.05);
          o('triangle', 660, 660, 0.45, 0.06);
        }
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.12, 0.05);
          o('sine', 2093, 2093, 0.18, 0.04, null, 0.05);
        }
        break;
      case 'boost':
        if (this._ok(name, 0.3)) {
          n(0.6, 0.18, 'bandpass', 500, 3000);
          o('sawtooth', 200, 600, 0.4, 0.035);
        }
        break;
      case 'turbo1':
        if (this._ok(name, 0.3)) {
          n(0.35, 0.12, 'bandpass', 900, 2600);
          o('triangle', 500, 900, 0.2, 0.05);
        }
        break;
      case 'turbo2':
        if (this._ok(name, 0.3)) {
          n(0.55, 0.16, 'bandpass', 700, 3200);
          o('triangle', 500, 1100, 0.3, 0.06);
          o('triangle', 750, 1500, 0.3, 0.04, null, 0.06);
        }
        break;
      case 'nitro':
        if (this._ok(name, 0.5)) {
          n(1.2, 0.22, 'bandpass', 300, 2400);
          o('sawtooth', 120, 420, 0.9, 0.04);
        }
        break;
      case 'hit':
        if (this._ok(name, 0.12)) {
          o('sine', 140, 60, 0.18, 0.12 * Math.min(1.5, 0.4 + p));
          n(0.16, 0.12 * Math.min(1.5, 0.4 + p), 'lowpass', 1400, 300);
        }
        break;
      case 'lap':
        if (this._ok(name, 1)) [784, 988, 1175].forEach((f, i) => o('triangle', f, f, 0.22, 0.06, null, i * 0.09));
        break;
      case 'finalLap':
        if (this._ok(name, 1)) [659, 784, 988, 1319].forEach((f, i) => o('triangle', f, f, 0.26, 0.07, null, i * 0.1));
        break;
      case 'win':
        if (this._ok(name, 1)) {
          [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.4, 0.075, null, i * 0.11));
          [523, 784, 1047].forEach((f) => o('triangle', f / 2, f / 2, 0.6, 0.03, null, 0.55));
        }
        break;
      case 'finish':
        if (this._ok(name, 1)) [587, 740, 880].forEach((f, i) => o('triangle', f, f, 0.35, 0.07, null, i * 0.12));
        break;
      case 'lose':
        if (this._ok(name, 1)) [523, 494, 440, 392].forEach((f, i) => o('triangle', f, f * 0.99, i === 3 ? 0.7 : 0.25, 0.07, null, i * 0.22));
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
      case 'whoosh':
        if (this._ok(name, 0.25)) n(0.35, 0.08, 'bandpass', 500, 1800);
        break;
    }
  }

  // ---------- мотор и визг шин ----------
  // мотор: мягкое «мурчание» игрушечной машинки (синусы + пульсация), без пилы и скачков передач
  engineStart() {
    if (!this.ctx || this.eng) return;
    const c = this.ctx;
    if (!this.engBus) {
      this.engBus = c.createGain();
      this.engBus.gain.value = this.engVol ?? 0.35;
      this.engBus.connect(this.sfx);
    }
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(this.engBus);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.4;
    // пульсация тона — «мурчит», а не жужжит
    const am = c.createGain();
    am.gain.value = 0.75;
    am.connect(lp).connect(out);
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 9;
    const lfoG = c.createGain();
    lfoG.gain.value = 0.25;
    lfo.connect(lfoG).connect(am.gain);
    lfo.start();
    const mk = (type, gain) => {
      const o = c.createOscillator();
      o.type = type;
      const g = c.createGain();
      g.gain.value = gain;
      o.connect(g).connect(am);
      o.start();
      return o;
    };
    const o1 = mk('sine', 0.9);
    const o2 = mk('sine', 0.55); // лёгкая расстройка — тёплый хорус
    const o3 = mk('triangle', 0.3); // октава вверх: чтобы мотор было слышно и в динамике телефона
    // шорох дороги: шум через низкий фильтр
    const rn = c.createBufferSource();
    rn.buffer = this.noise;
    rn.loop = true;
    const rf = c.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 160;
    const rg = c.createGain();
    rg.gain.value = 0;
    rn.connect(rf).connect(rg).connect(this.engBus);
    rn.start();
    // шины в дрифте: мягкое шипение, без визга
    const sq = c.createBufferSource();
    sq.buffer = this.noise;
    sq.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.2;
    const sg = c.createGain();
    sg.gain.value = 0;
    sq.connect(bp).connect(sg).connect(this.engBus);
    sq.start();
    // поток воздуха при ускорении
    const wn = c.createBufferSource();
    wn.buffer = this.noise;
    wn.loop = true;
    const wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 700;
    wf.Q.value = 0.6;
    const wg = c.createGain();
    wg.gain.value = 0;
    wn.connect(wf).connect(wg).connect(this.sfx);
    wn.start();
    this.eng = { out, lp, lfo, o1, o2, o3, rn, rg, sq, sg, wn, wg, f: 60 };
  }

  // v — скорость, vmax — максимальная; drift 0/1; boost 0/1
  engineUpdate(v, vmax, drift, boost) {
    const e = this.eng;
    if (!e) return;
    const t = this.ctx.currentTime;
    const k = Math.max(0, Math.min(1.3, v / vmax));
    const f = 82 + k * 92 + (boost ? 16 : 0);
    e.o1.frequency.setTargetAtTime(f, t, 0.12);
    e.o2.frequency.setTargetAtTime(f * 1.006, t, 0.12);
    e.o3.frequency.setTargetAtTime(f * 2, t, 0.12);
    e.lfo.frequency.setTargetAtTime(7 + k * 10, t, 0.15);
    e.lp.frequency.setTargetAtTime(420 + k * 320 + (boost ? 140 : 0), t, 0.15);
    e.out.gain.setTargetAtTime(0.05 + k * 0.03, t, 0.15);
    e.rg.gain.setTargetAtTime(0.05 * Math.min(1, k), t, 0.2);
    e.sg.gain.setTargetAtTime(drift ? 0.022 : 0, t, 0.08);
    e.wg.gain.setTargetAtTime(boost ? 0.05 : 0.006 * k, t, 0.15);
  }

  engineStop() {
    const e = this.eng;
    if (!e) return;
    this.eng = null;
    const t = this.ctx.currentTime;
    e.out.gain.setTargetAtTime(0, t, 0.08);
    e.rg.gain.setTargetAtTime(0, t, 0.05);
    e.sg.gain.setTargetAtTime(0, t, 0.05);
    e.wg.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => {
      for (const n of [e.o1, e.o2, e.o3, e.lfo, e.rn, e.sq, e.wn]) {
        try {
          n.stop();
        } catch (er) {}
      }
    }, 500);
  }

  setEngVol(v) {
    this.engVol = Math.max(0, Math.min(1, v));
    if (this.engBus) this.engBus.gain.setTargetAtTime(this.engVol, this.ctx.currentTime, 0.05);
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
