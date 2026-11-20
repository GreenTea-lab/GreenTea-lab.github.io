// Audio recordings and the original WebAudio score share volume and pause controls.
import { Music } from './music.js';
import { SONGS } from './songs.js';
import islandLoop from '../static/audio/island.ogg';
import bassaLoop from '../static/audio/bassa.mp3';
import bossaLoop from '../static/audio/bossa.mp3';
import drawRecording from '../static/audio/draw.wav';
import placeRecording from '../static/audio/place.wav';
import flipRecording from '../static/audio/flip.wav';
import shuffleRecording from '../static/audio/deal.wav';
import waveRecording from '../static/audio/wave.flac';
import clickRecording from '../static/audio/ui-click.wav';
import errorRecording from '../static/audio/ui-error.wav';
import openRecording from '../static/audio/menu-open.wav';
import buildRecording from '../static/audio/craft.wav';
import buyRecording from '../static/audio/buy.wav';
import giftRecording from '../static/audio/chest-open.wav';
import decorRecording from '../static/audio/place-item.wav';
import unlockRecording from '../static/audio/jingle-quest-complete.wav';

const RECORDINGS = {
  island: islandLoop, bassa: bassaLoop, bossa: bossaLoop,
  draw: drawRecording, place: placeRecording, flip: flipRecording,
  shuffle: shuffleRecording, wave: waveRecording,
  click: clickRecording, error: errorRecording, open: openRecording, build: buildRecording,
  buy: buyRecording, gift: giftRecording, decor: decorRecording, unlock: unlockRecording,
};
const PLAYLIST = ['island', 'bassa', 'bossa'];
const ACTOR_CALLS = {
  parrot: ['sawtooth',820,1260,.105],
  gull: ['triangle',450,710,.19],
  monkey: ['triangle',360,640,.15],
  dog: ['square',180,79,.09],
  rabbit: ['sine',690,890,.055],
  goat: ['triangle',270,220,.18],
  chicken: ['triangle',440,270,.065],
  duck: ['square',380,160,.135],
  hedgehog: ['triangle',540,330,.065],
  deer: ['sine',175,105,.20],
  squirrel: ['square',860,610,.075],
};
const SFX_RECORDINGS = {
  draw: ['draw', .4, .09], deal: ['draw', .2, .085], place: ['place', .39, .05],
  flip: ['flip', .25, .07], shuffle: ['shuffle', .22, .3], wave: ['wave', .11, .25, 1.25],
  click: ['click', .21, .06], deny: ['error', .27, .15], error: ['error', .27, .2],
  open: ['open', .32, .1], build: ['build', .44, .5], buy: ['buy', .43, .3],
  gift: ['gift', .4, .35], decor: ['decor', .4, .2], unlock: ['unlock', .39, .6],
  win: ['unlock', .39, 1],
};

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
    this.musicPack = this.soundPack = 'island';
    this.recordings = {};
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
      this.loadRecordings();
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

  startMusic() {
    this.wantMusic = true;
    if (!this.ctx) return;
    if (this.musicPack === 'island') {
      if (this.recordedMusic || this.playNextRecording()) return;
    }
    if (this.recordedMusic) {
      this.recordedMusic.stop();
      this.recordedMusic = null;
      this.recordedTrack = null;
    }
    this.mus.start();
  }

  playNextRecording() {
    const tracks = PLAYLIST.filter(name => this.recordings[name]);
    if (!tracks.length) return false;
    const track = tracks[(tracks.indexOf(this.recordedTrack) + 1) % tracks.length];
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.recordings[track];
    const start = this.ctx.currentTime;
    const end = start + source.buffer.duration;
    const fade = Math.min(.3, source.buffer.duration / 4);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.4, start + fade);
    gain.gain.setValueAtTime(.4, end - fade);
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain).connect(this.music);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.recordedMusic !== source) return;
      this.recordedMusic = null;
      this.startMusic();
    };
    this.mus.stop();
    this.recordedMusic = source;
    this.recordedTrack = track;
    source.start(start);
    return true;
  }
  setPacks(music, sound) {
    this.musicPack = music === 'classic' ? 'classic' : 'island';
    this.soundPack = sound === 'classic' ? 'classic' : 'island';
    if (this.ctx) this.loadRecordings();
    if (this.wantMusic) this.startMusic();
  }
  loadRecordings() {
    for (const [name, url] of Object.entries(RECORDINGS)) {
      const music = PLAYLIST.includes(name);
      if ((music ? this.musicPack : this.soundPack) !== 'island' ||
          Object.hasOwn(this.recordings, name)) continue;
      this.recordings[name] = null;
      fetch(url).then(response => response.arrayBuffer()).then(bytes => this.ctx.decodeAudioData(bytes))
        .then(buffer => {
          this.recordings[name] = buffer;
          if (music && this.wantMusic) this.startMusic();
        }).catch(() => { /* The corresponding synthesized sound stays available. */ });
    }
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

  actorSound(species) {
    if(!this._ok('actor',.18))return;
    if(species==='turtle'){
      this._noise(.32,.12,'bandpass',1350,440);
      this._osc('sine',370,145,.2,.065);
    }else if(species==='crab'){
      this._noise(.065,.12,'bandpass',2750,1380);
      this._noise(.065,.1,'bandpass',2150,1060,undefined,.1);
    }else{
      const [voice,high,low,time]=ACTOR_CALLS[species]??['sine',495,690,.14];
      this._osc(voice,high,low,time,.06);
      this._osc(voice,high*1.16,low*.87,time*.72,.042,undefined,time+.04);
    }
  }

  play(name, p = 0) {
    const preset = this.soundPack === 'island' && SFX_RECORDINGS[name];
    const buffer = preset && this.recordings[preset[0]];
    if (buffer) {
      const [, volume, gap, limit] = preset;
      if (!this._ok(name, gap)) return;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      if (name === 'deal' || name === 'place') source.playbackRate.value = .95 + Math.random() * .12;
      source.connect(gain).connect(this.sfx);
      const now = this.ctx.currentTime;
      const duration = Math.min(buffer.duration, limit ?? Infinity);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      source.start(now, 0, duration);
      return;
    }
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
      case 'decor':
        return this.play('place');
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
    const lvl = (this.seaLevel ?? 1) * (this.soundPack === 'island' ? .58 : 1);
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
