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
    this.mus.setMood(v > 0.5 ? this.gameMood || 'day' : 'menu');
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
      case 'take':
        // коробка в руки: картонный «шурх» и короткий тон
        if (this._ok('take', 0.06)) {
          n(0.08, 0.06, 'bandpass', 1400, 700);
          o('triangle', 520, 700, 0.07, 0.05, null, 0.02);
        }
        break;
      case 'place':
        if (this._ok(name, 0.06)) {
          o('sine', 260, 180, 0.08, 0.1);
          n(0.06, 0.05, 'lowpass', 900, 300);
          o('triangle', 880, 880, 0.05, 0.03, null, 0.05);
        }
        break;
      case 'grab':
        if (this._ok(name, 0.12)) {
          n(0.07, 0.05, 'bandpass', 1800, 900);
          o('sine', 660, 990, 0.06, 0.04, null, 0.03);
        }
        break;
      case 'sale': {
        // касса: «дзынь» и монетки
        if (!this._ok(name, 0.15)) break;
        o('sine', 1319, 1319, 0.25, 0.07);
        o('sine', 1760, 1760, 0.3, 0.05, null, 0.08);
        const k = Math.min(6, Math.round((p && p.n ? p.n : 10) / 10));
        for (let i = 0; i < k; i++) o('sine', 2093 + ((i * 3) % 5) * 120, 2093 + ((i * 3) % 5) * 120, 0.05, 0.025, null, 0.18 + i * 0.045);
        break;
      }
      case 'coStart':
        if (this._ok(name, 0.3)) [784, 988].forEach((f, i) => o('triangle', f, f, 0.08, 0.05, null, i * 0.07));
        break;
      case 'test':
        // тестер жужжит коротким «бип-бип»
        if (this._ok(name, 0.1)) [0, 0.09, 0.18].forEach((d) => o('square', 1500, 1500, 0.035, 0.018, null, d));
        break;
      case 'batOk':
        if (this._ok(name, 0.1)) [1047, 1568].forEach((f, i) => o('sine', f, f, 0.12, 0.06, null, i * 0.06));
        break;
      case 'batBad':
        if (this._ok(name, 0.2)) {
          o('square', 300, 220, 0.14, 0.035);
          o('square', 300, 200, 0.18, 0.035, null, 0.16);
        }
        break;
      case 'swap':
        if (this._ok(name, 0.15)) [659, 880, 1175].forEach((f, i) => o('triangle', f, f, 0.08, 0.05, null, i * 0.05));
        break;
      case 'scammed':
        if (this._ok(name, 0.5)) [494, 440, 370].forEach((f, i) => o('triangle', f, f * 0.98, 0.14, 0.06, null, i * 0.12));
        break;
      case 'gift':
        if (this._ok(name, 0.3)) [784, 988, 1175, 1568].forEach((f, i) => o('sine', f, f, 0.14, 0.05, null, i * 0.07));
        break;
      case 'search':
        // шарит по багажнику: шорохи
        if (this._ok(name, 0.22)) {
          n(0.12, 0.05, 'bandpass', 900 + Math.random() * 900, 500);
          n(0.08, 0.035, 'bandpass', 2200, 1200, null, 0.1);
        }
        break;
      case 'loot':
        if (this._ok(name, 0.2)) {
          n(0.15, 0.06, 'bandpass', 1200, 500);
          [880, 1109, 1319].forEach((f, i) => o('triangle', f, f, 0.1, 0.05, null, 0.08 + i * 0.06));
        }
        break;
      case 'repair':
        // молоток по доске
        if (this._ok(name, 0.18)) {
          o('sine', 420, 160, 0.06, 0.13);
          n(0.05, 0.08, 'bandpass', 2400, 1200);
        }
        break;
      case 'trapSet':
        if (this._ok(name, 0.3)) {
          o('square', 1300, 900, 0.03, 0.04);
          o('square', 1500, 1100, 0.03, 0.04, null, 0.07);
        }
        break;
      case 'trap':
        if (this._ok(name, 0.15)) {
          o('square', 1800, 600, 0.05, 0.05);
          n(0.1, 0.07, 'highpass', 2500, 1500);
          o('sine', 200, 90, 0.12, 0.1, null, 0.02);
        }
        break;
      case 'swing':
        if (this._ok(name, 0.12)) n(0.13, 0.07, 'bandpass', 700, 2400);
        break;
      case 'shoot':
        if (this._ok(name, 0.09)) {
          if (p && p.w === 'nailgun') {
            o('square', 900, 300, 0.05, 0.04);
            n(0.05, 0.06, 'highpass', 3000, 2000);
          } else {
            // рогатка и выстрел охранника: мягкий «тюньк»
            o('triangle', 500, 1200, 0.07, 0.05);
            n(0.06, 0.04, 'bandpass', 1800, 900);
          }
        }
        break;
      case 'zhit':
        if (this._ok(name, 0.07)) {
          o('sine', 220, 110, 0.09, 0.11);
          n(0.06, 0.05, 'lowpass', 900, 300);
        }
        break;
      case 'zdie':
        // зомби «пуф» и смешной вздох
        if (this._ok(name, 0.1)) {
          n(0.22, 0.07, 'bandpass', 1400, 400);
          o('triangle', 330, 180, 0.22, 0.05, null, 0.03);
        }
        break;
      case 'zspawn':
        // далёкое «уууу»: короткая волна вниз
        if (this._ok(name, 0.6)) o('triangle', 260, 190, 0.3, 0.04);
        break;
      case 'boom':
        if (this._ok(name, 0.15)) {
          o('sine', 140, 40, 0.45, 0.2);
          n(0.45, 0.12, 'lowpass', 1200, 120);
        }
        break;
      case 'slam':
        if (this._ok(name, 0.3)) {
          o('sine', 110, 35, 0.5, 0.22);
          n(0.3, 0.1, 'lowpass', 700, 100);
        }
        break;
      case 'barHit':
        if (this._ok(name, 0.18)) {
          o('sine', 170, 90, 0.08, 0.1);
          n(0.06, 0.05, 'bandpass', 700, 400);
        }
        break;
      case 'barBreak':
        if (this._ok(name, 0.4)) {
          n(0.35, 0.11, 'bandpass', 900, 200);
          [0, 0.07, 0.15].forEach((d, i) => o('sine', 300 - i * 50, 90, 0.1, 0.1, null, d));
        }
        break;
      case 'hurt':
        if (this._ok(name, 0.3)) {
          o('triangle', 600, 260, 0.22, 0.09);
          n(0.08, 0.05, 'lowpass', 1200, 400);
        }
        break;
      case 'ko':
      case 'staffKo':
        if (this._ok('ko', 1)) [523, 466, 392, 330].forEach((f, i) => o('triangle', f, f * 0.99, 0.16, 0.06, null, i * 0.14));
        break;
      case 'staffHurt':
        if (this._ok(name, 0.6)) o('triangle', 520, 300, 0.18, 0.06);
        break;
      case 'revive':
        if (this._ok(name, 1)) [392, 523, 659, 784].forEach((f, i) => o('triangle', f, f, 0.14, 0.06, null, i * 0.08));
        break;
      case 'scream':
        // покупатель убегает: короткий писк
        if (this._ok(name, 0.6)) {
          o('triangle', 900, 1400, 0.1, 0.04);
          o('triangle', 1300, 900, 0.12, 0.035, null, 0.1);
        }
        break;
      case 'craftStart':
        if (this._ok(name, 0.2)) [0, 0.1].forEach((d) => {
          o('sine', 380, 200, 0.05, 0.08, null, d);
          n(0.04, 0.05, 'bandpass', 2600, 1500, null, d);
        });
        break;
      case 'crafted':
      case 'craft':
        if (this._ok('crafted', 0.3)) [659, 880, 1319].forEach((f, i) => o('triangle', f, f, 0.12, 0.06, null, i * 0.06));
        break;
      case 'lvl':
        if (this._ok(name, 1)) [523, 659, 784, 1047, 1319].forEach((f, i) => o('triangle', f, f, 0.16, 0.07, null, i * 0.07));
        break;
      case 'scavBack':
        // свист: «вернулся!»
        if (this._ok(name, 0.6)) {
          o('sine', 1200, 1800, 0.12, 0.05);
          o('sine', 1500, 1100, 0.14, 0.05, null, 0.16);
        }
        break;
      case 'horn':
        // тревога перед ордой: три коротких гудка
        if (this._ok(name, 1)) [0, 0.25, 0.5].forEach((d) => {
          o('square', 330, 320, 0.16, 0.025, null, d);
          o('triangle', 440, 430, 0.16, 0.04, null, d);
        });
        break;
      case 'night':
        if (this._ok(name, 1)) [440, 392, 330].forEach((f, i) => o('sine', f, f, 0.25, 0.06, null, i * 0.2));
        break;
      case 'dusk':
        if (this._ok(name, 1)) [659, 587, 523].forEach((f, i) => o('triangle', f, f, 0.18, 0.05, null, i * 0.15));
        break;
      case 'bell':
        // колокольчик над дверью
        if (this._ok(name, 0.5)) {
          o('sine', 1568, 1568, 0.3, 0.05);
          o('sine', 2093, 2093, 0.25, 0.03, null, 0.12);
        }
        break;
      case 'rooster':
        // петух: «ку-ка-ре-ку» короткими слогами
        if (this._ok(name, 2)) [[700, 900], [900, 1100], [1100, 1000], [1000, 700]].forEach(([a, b], i) => o('triangle', a, b, 0.11, 0.05, null, i * 0.13));
        break;
      case 'win':
        if (this._ok('win', 1)) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => o('triangle', f, f, 0.2, 0.07, null, i * 0.09));
        break;
      case 'coin':
        if (this._ok(name, 0.04)) {
          o('sine', 1568, 1568, 0.08, 0.05);
          o('sine', 2093, 2093, 0.12, 0.04, null, 0.05);
        }
        break;
      case 'error':
      case 'deny':
        if (this._ok('deny', 0.2)) o('triangle', 220, 180, 0.12, 0.08);
        break;
      case 'buy':
        if (this._ok(name, 0.3)) [784, 988, 1319, 1568].forEach((f, i) => o('sine', f, f, 0.15, 0.06, null, i * 0.06));
        break;
      case 'zgrowl':
        // низкое ворчание: зомби заметил
        if (this._ok(name, 1.2)) {
          o('sawtooth', 95, 70, 0.32, 0.035);
          n(0.3, 0.05, 'lowpass', 500, 180);
        }
        break;
      case 'zscream':
        // крикун: короткий вопль, без тянущихся нот
        if (this._ok(name, 1)) {
          o('triangle', 700, 1100, 0.14, 0.05);
          o('triangle', 1050, 600, 0.22, 0.045, null, 0.12);
          n(0.3, 0.05, 'bandpass', 2200, 900);
        }
        break;
      case 'spit':
        if (this._ok(name, 0.3)) {
          n(0.12, 0.08, 'bandpass', 1600, 500);
          o('sine', 300, 140, 0.1, 0.05);
        }
        break;
      case 'splat':
        if (this._ok(name, 0.2)) {
          n(0.18, 0.09, 'lowpass', 1200, 200);
          o('sine', 180, 80, 0.12, 0.06, null, 0.02);
        }
        break;
      case 'steal':
      case 'thief':
        if (this._ok('steal', 0.5)) {
          n(0.1, 0.06, 'bandpass', 1500, 700);
          o('triangle', 500, 380, 0.1, 0.05, null, 0.06);
        }
        break;
      case 'thiefGone':
        if (this._ok(name, 1)) [392, 349, 294].forEach((f, i) => o('triangle', f, f, 0.12, 0.05, null, i * 0.11));
        break;
      case 'recovered':
        if (this._ok(name, 0.4)) [784, 1047, 1319].forEach((f, i) => o('sine', f, f, 0.1, 0.05, null, i * 0.06));
        break;
      case 'heal':
        if (this._ok(name, 0.4)) {
          n(0.15, 0.04, 'highpass', 3000, 2000);
          [523, 659, 784].forEach((f, i) => o('sine', f, f, 0.14, 0.05, null, 0.05 + i * 0.07));
        }
        break;
      case 'sleep':
        if (this._ok(name, 1)) [523, 440, 349].forEach((f, i) => o('sine', f, f, 0.2, 0.05, null, i * 0.18));
        break;
      case 'wake':
        // будильник: частые короткие писки
        if (this._ok(name, 1)) for (let i = 0; i < 6; i++) o('square', 1320, 1320, 0.05, 0.018, null, i * 0.09);
        break;
      case 'dayZombie':
        if (this._ok(name, 2)) [0, 0.22].forEach((d) => o('triangle', 520, 500, 0.14, 0.05, null, d));
        break;
      case 'dawnSoon':
        if (this._ok(name, 2)) [659, 784].forEach((f, i) => o('sine', f, f, 0.16, 0.04, null, i * 0.16));
        break;
      case 'upgrade':
        if (this._ok(name, 0.15)) [660, 880, 1320].forEach((f, i) => o('triangle', f, f, 0.12, 0.06, null, i * 0.05));
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
