// Процедурная музыка: секвенсор «песен» из слоёв (пэд, бас, арпеджио, мелодия, перкуссия).
// Песни описываются данными, мелодии сочиняются по сиду из мотивов. Переключение по «настроению».
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  pentaMinor: [0, 3, 5, 7, 10, 12, 15],
  pentaMajor: [0, 2, 4, 7, 9, 12, 14],
};

// опустить ноту на октавы, пока она выше предела
function fold(m, top) {
  while (m > top) m -= 12;
  return m;
}

function rng(seed) {
  let s = seed * 2654435761 >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- подготовка песни: аккорды и мелодии ----------
function prepare(song) {
  const sc = SCALES[song.scale] || SCALES.minor;
  const deg = (d) => song.key + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  song._deg = deg;
  // аккорды по ступеням: трезвучие + септима
  song._chords = song.prog.map((d) => [deg(d), deg(d + 2), deg(d + 4), deg(d + 6)]);
  song._bars = song.prog.length;
  for (const L of song.layers)
    if (L.t === 'lead' || L.t === 'bell' || L.t === 'flute') {
      L._mel = compose(song, L);
      // всю мелодию целиком сдвигаем вниз на октаву(ы), чтобы её верх не поднимался выше ~880 Гц
      let max = -1;
      for (const row of L._mel) for (const n of row) if (n !== null && n > max) max = n;
      let sh = 0;
      while (max - sh > 81) sh += 12;
      if (sh) L._mel = L._mel.map((row) => row.map((n) => (n === null ? null : n - sh)));
    }
  return song;
}

// мелодия: ритм-мотив, высоты по ступеням лада рядом с предыдущей нотой, сильные доли — звуки аккорда
function compose(song, L) {
  const R = rng((song.seed || 1) * 97 + (L.seed || 0) * 13 + 5);
  const sc = SCALES[song.scale] || SCALES.minor;
  const rhythms = Array.isArray(L.rhythm) ? L.rhythm : [L.rhythm || 'x...x...x.x.x...'];
  const bars = song._bars;
  const out = [];
  let cur = 7 + Math.floor(R() * 3); // ступень относительно тоники, около октавы вверх
  const motif = []; // запоминаем мотив первых двух тактов для повторов
  for (let b = 0; b < bars; b++) {
    const rh = rhythms[b % rhythms.length];
    const chord = song.prog[b];
    const row = new Array(16).fill(null);
    const repeat = b >= 2 && b % 4 !== 3 && R() < 0.55 ? motif[b % 2] : null;
    for (let s = 0; s < 16; s++) {
      if (rh[s] !== 'x' && rh[s] !== 'o') continue;
      let d;
      if (repeat && repeat[s] !== undefined) {
        // повтор мотива, подтянутый к аккорду
        d = repeat[s] + (chord - song.prog[b % 2]);
      } else {
        const strong = s % 4 === 0;
        const step = [-2, -1, -1, 1, 1, 2, 0, 3, -3][Math.floor(R() * 9)];
        d = cur + step;
        if (strong) {
          // к ближайшему звуку аккорда
          const tones = [chord, chord + 2, chord + 4, chord + 7, chord + 9, chord + 11];
          d = tones.reduce((a, t) => (Math.abs(t - d) < Math.abs(a - d) ? t : a), tones[0]);
        }
      }
      d = Math.max(3, Math.min(14, d));
      cur = d;
      row[s] = d;
    }
    // конец фразы — на звук аккорда
    if (b % 4 === 3) {
      const last = row.reduce((a, v, i) => (v !== null ? i : a), -1);
      if (last >= 0) row[last] = chord + 7;
    }
    if (b < 2) motif[b] = Object.fromEntries(row.map((v, i) => [i, v]).filter(([, v]) => v !== null));
    out.push(row.map((d) => (d === null ? null : song.key + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7) + 12 * (L.oct || 0))));
  }
  return out;
}

export class Music {
  constructor(engine) {
    this.e = engine;
    this.lists = {};
    this.mood = 'menu';
    this.song = null;
    this.bus = null;
    this.step = 0;
    this.bar = 0;
    this.loops = 0;
    this.nextTime = 0;
    this.timer = null;
    this.idx = {};
    this.intensity = 0;
  }

  define(lists) {
    for (const k in lists) lists[k].forEach(prepare);
    this.lists = lists;
  }

  get ctx() {
    return this.e.ctx;
  }

  start() {
    if (this.timer || !this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this._switch(true);
    this.timer = setInterval(() => this._schedule(), 30);
  }

  setMood(m) {
    if (!this.lists[m] || m === this.mood) return;
    this.mood = m;
    this.pending = true;
  }

  setIntensity(v) {
    this.intensity = v;
  }

  // плавная смена песни
  _switch(immediate) {
    const list = this.lists[this.mood] || this.lists.game || Object.values(this.lists)[0];
    const i = (this.idx[this.mood] = ((this.idx[this.mood] ?? -1) + 1) % list.length);
    const c = this.ctx;
    if (this.bus) {
      const old = this.bus;
      old.gain.setTargetAtTime(0, c.currentTime, 0.5);
      setTimeout(() => old.disconnect(), 3000);
    }
    this.bus = c.createGain();
    this.bus.gain.setValueAtTime(immediate ? 1 : 0.0001, c.currentTime);
    if (!immediate) this.bus.gain.setTargetAtTime(1, c.currentTime + 0.3, 0.6);
    this.bus.connect(this._tone());
    this.song = list[i];
    this.step = 0;
    this.bar = 0;
    this.loops = 0;
    this.pending = false;
  }

  // общий тон-фильтр музыки: приглушаем верх, чтобы ничего не «резало» уши
  _tone() {
    if (this.toneIn && this.toneIn.context === this.ctx) return this.toneIn;
    const c = this.ctx;
    const shelf = c.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 2800;
    shelf.gain.value = -7;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000;
    lp.Q.value = 0.5;
    shelf.connect(lp).connect(this.e.music);
    this.toneIn = shelf;
    return shelf;
  }

  _schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || !this.song) return;
    if (this.nextTime < c.currentTime - 0.1) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.15) {
      const S = this.song;
      const spb = 60 / S.bpm / 4;
      if (this.step === 0) {
        // смена песни на границе такта
        // смена настроения — на ближайшей границе такта, смена трека — в конце круга
        if (this.pending || (this.bar === 0 && this.loops >= (S.loops || 3))) this._switch(false);
      }
      this._playStep(this.song, this.bar, this.step, this.nextTime);
      this.nextTime += (60 / this.song.bpm / 4) * (this.song.swing && this.step % 2 === 0 ? 1 + this.song.swing : this.song.swing && this.step % 2 ? 1 - this.song.swing : 1);
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
        if (this.bar >= this.song._bars) {
          this.bar = 0;
          this.loops++;
        }
      }
      void spb;
    }
  }

  _playStep(S, bar, s, t) {
    const spb = 60 / S.bpm / 4;
    const chord = S._chords[bar];
    const out = this.bus;
    const I = this.intensity;
    const absBar = this.loops * S._bars + bar;
    for (const L of S.layers) {
      if (L.minI !== undefined && I < L.minI) continue;
      if (L.maxI !== undefined && I > L.maxI) continue;
      if (L.from && absBar < L.from) continue;
      if (L.every && bar % L.every !== (L.on || 0)) continue;
      const v = L.vol * (S.vol || 1);
      const pat = L.pat ? (Array.isArray(L.pat) ? L.pat[bar % L.pat.length] : L.pat) : null;
      switch (L.t) {
        case 'pad':
          // тянущихся аккордов нет: вместо пэда — короткие мягкие «щипки» аккорда на сильные доли
          {
            // ритм щипков можно задать паттерном (pat), по умолчанию — доли 0 и 8
            const hitS = pat ? pat[s] && pat[s] !== '.' : s === 0 || s === 8;
            if (hitS)
              for (const n of chord.slice(0, L.notes || 3)) {
                const m = fold(n + 12 * (L.oct || 0), 72);
                if (L.stab === 'saw')
                  this._voice(m, t, 0.2, v * 1.2, out, { wave: 'sawtooth', attack: 0.003, lp: L.lp || 1400, lpEnv: 2.5, detune: 1.005 });
                else this._voice(m, t + (n - chord[0]) * 0.004, 0.28, v * 1.4, out, { wave: 'triangle', attack: 0.004, lp: 1200, lpEnv: 1.6 });
              }
          }
          break;
        case 'bass': {
          const ch = pat && pat[s];
          if (!ch || ch === '.') break;
          const n = chord[0] + 12 * (L.oct ?? -1) + (ch === 'o' ? 12 : ch === '5' ? 7 : ch === '3' ? chord[1] - chord[0] : 0);
          if (L.punch) {
            // плотный короткий бас для синтвейва: пила под фильтром, очень короткая нота
            this._voice(n, t, Math.min(spb * (L.len || 1.5), 0.18), v, out, { wave: 'sawtooth', attack: 0.004, lp: Math.min(L.lp || 520, 650), lpEnv: 2.2 });
            this._voice(n - 12, t, Math.min(spb * (L.len || 1.5), 0.18), v * 0.7, out, { wave: 'sine', attack: 0.004 });
            break;
          }
          const soft = L.wave === 'sawtooth' || L.wave === 'square';
          this._voice(n, t, Math.min(spb * (L.len || 3), 0.3), v * (soft ? 1.3 : 1), out, { wave: soft ? 'triangle' : L.wave || 'sine', attack: 0.008, lp: Math.min(L.lp || 600, 600) });
          break;
        }
        case 'arp': {
          const ch = pat && pat[s];
          if (!ch || ch === '.') break;
          const k = +ch;
          const n = chord[k % 4] + 12 * Math.floor(k / 4) + 12 * (L.oct || 0);
          this._inst(L.inst || 'pluck', n, t, spb * (L.len || 2), v, out, L);
          break;
        }
        case 'lead':
        case 'bell':
        case 'flute': {
          const n = L._mel[bar][s];
          if (n === null) break;
          // длительность — до следующей ноты (не больше len)
          let k = 1;
          while (s + k < 16 && L._mel[bar][s + k] === null && k < (L.len || 4)) k++;
          this._inst(L.inst || (L.t === 'bell' ? 'bell' : L.t === 'flute' ? 'flute' : 'lead'), n, t, spb * k * 1.1, v, out, L);
          break;
        }
        default: {
          // перкуссия
          const ch = pat && pat[s];
          if (!ch || ch === '.') break;
          this._drum(L.t, t, v * (ch === 'o' ? 0.55 : 1), out, L);
        }
      }
    }
  }

  // ---------- инструменты ----------
  _voice(midi, t, dur, vol, out, o = {}) {
    const c = this.ctx;
    const f = mtof(midi);
    const g = c.createGain();
    let node = g;
    if (o.lp) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lp;
      if (o.lpEnv) {
        lp.frequency.setValueAtTime(o.lp * o.lpEnv, t);
        lp.frequency.exponentialRampToValueAtTime(o.lp, t + Math.min(dur, 0.4));
      }
      g.connect(lp);
      node = lp;
    }
    node.connect(out);
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    if (o.sustain) g.gain.setTargetAtTime(vol * o.sustain, t + a, dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.release || 0));
    const oscs = [];
    const mk = (wave, mult, det, gain) => {
      const osc = c.createOscillator();
      osc.type = wave;
      osc.frequency.value = f * mult * det;
      if (gain !== 1) {
        const gg = c.createGain();
        gg.gain.value = gain;
        osc.connect(gg).connect(g);
      } else osc.connect(g);
      osc.start(t);
      osc.stop(t + dur + (o.release || 0) + 0.05);
      oscs.push(osc);
    };
    mk(o.wave || 'triangle', 1, 1, 1);
    if (o.detune) mk(o.wave || 'triangle', 1, o.detune, 0.7);
    if (o.partial) mk('sine', o.partial, 1, o.partialGain || 0.3);
    if (o.vib) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 5.2;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.006 * o.vib, t + Math.min(0.3, dur));
      lfo.connect(lg);
      oscs.forEach((x) => lg.connect(x.frequency));
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
  }

  // Все мелодические инструменты — короткие, затухающие (щипок, маримба, колокольчик).
  // Протяжных звуков (флейта, синт, медь, пэды с сустейном) нет совсем: они резали уши.
  _inst(name, midi, t, dur, vol, out, L) {
    midi = fold(midi, 81);
    const f = mtof(midi);
    if (f > 520) vol *= Math.sqrt(520 / f);
    const D = 0.3; // максимальная длина любой ноты, с
    switch (name) {
      case 'pluck':
        return this._voice(midi, t, Math.min(L.decay || 0.25, D), vol, out, { wave: 'triangle', attack: 0.003, lp: 1800, lpEnv: 2 });
      case 'lute':
        return this._voice(midi, t, D, vol * 0.9, out, { wave: 'triangle', attack: 0.003, lp: 1500, lpEnv: 2.2, partial: 2, partialGain: 0.15 });
      case 'bell':
        return this._voice(midi, t, D, vol, out, { wave: 'sine', attack: 0.003, partial: 2.76, partialGain: 0.08, lp: 2200 });
      case 'epiano':
        return this._voice(midi, t, D, vol * 1.1, out, { wave: 'sine', attack: 0.004, partial: 2, partialGain: 0.15, lp: 2000 });
      case 'saw':
        // короткий неоновый «сав-щипок» (синтвейв), без сустейна
        return this._voice(midi, t, Math.min(Math.max(dur, 0.14), 0.22), vol, out, { wave: 'sawtooth', attack: 0.003, lp: L.lp || 1900, lpEnv: 2.6, detune: 1.006 });
      case 'chip':
        return this._voice(midi, t, Math.min(Math.max(dur, 0.1), 0.16), vol * 0.8, out, { wave: 'square', attack: 0.003, lp: L.lp || 2000, lpEnv: 1.8 });
      default:
        // lead / flute / synth / brass → мягкая «маримба»: синус с коротким деревянным обертоном
        return this._voice(midi, t, Math.min(Math.max(dur, 0.18), 0.26), vol * 1.25, out, { wave: 'sine', attack: 0.003, partial: 4, partialGain: 0.06, lp: 1800 });
    }
  }

  _noise(t, dur, vol, type, f, out, q) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.e.noise;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    if (q) fl.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  _drum(kind, t, vol, out, L) {
    const c = this.ctx;
    switch (kind) {
      case 'kick': {
        // мягкая бочка: короткий спад высоты, без щелчка
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(L.f || 110, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.32);
        break;
      }
      case 'snare':
        this._noise(t, 0.16, vol, 'bandpass', 1800, out, 0.8);
        this._tonePerc(t, 190, 0.08, vol * 0.5, out);
        break;
      case 'rim':
        this._noise(t, 0.04, vol, 'bandpass', 3200, out, 3);
        break;
      case 'clap':
        [0, 0.012, 0.024].forEach((d) => this._noise(t + d, 0.09, vol * 0.7, 'bandpass', 1400, out, 1.2));
        break;
      case 'hat':
        this._noise(t, 0.035, vol, 'highpass', 7500, out);
        break;
      case 'ohat':
        this._noise(t, 0.2, vol, 'highpass', 6500, out);
        break;
      case 'shaker':
        this._noise(t, 0.07, vol, 'bandpass', 5500, out, 1.5);
        break;
      case 'tom':
        this._tonePerc(t, L.f || 130, 0.25, vol, out, 0.6);
        break;
      case 'tambourine':
        this._noise(t, 0.12, vol, 'bandpass', 8000, out, 2);
        break;
      case 'drum':
        // басовый барабан под средневековую музыку
        this._tonePerc(t, L.f || 90, 0.3, vol, out, 0.5);
        this._noise(t, 0.08, vol * 0.4, 'lowpass', 400, out);
        break;
    }
  }

  _tonePerc(t, f, dur, vol, out, drop = 0.7) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * drop, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
