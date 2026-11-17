// Музыка дзен-сада: генеративные пьесы для кото с колокольчиками ветра, каплями и тихим ручьём.
// Никаких тянущихся звуков: каждая нота — щипок струны, который сам затухает, всё через мягкую реверберацию.
// Ноты сочиняются на лету по пентатоническим японским ладам, поэтому музыка не повторяется.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// пятиступенные лады
export const ZEN_SCALES = {
  yo: [0, 2, 5, 7, 9], // светлый, «рассветный»
  hira: [0, 2, 3, 7, 8], // хирадзоси — классика кото
  in: [0, 1, 5, 7, 8], // мияко-буси — вечерний, задумчивый
  kumoi: [0, 2, 3, 7, 9], // кумои — между светлым и грустным
};

// пьесы: лад, тоника, темп (удары в минуту), плотность мелодии, что звучит вокруг
export const PIECES = {
  menu: [
    { name: 'Moon Over the Garden', scale: 'yo', key: 57, bpm: 58, density: 0.55, bassProg: [0, 3, 0, 4], roll: 16, chimes: 0.5, drops: 0.6, stream: 1 },
    { name: 'Morning Mist', scale: 'kumoi', key: 55, bpm: 54, density: 0.5, bassProg: [0, 0, 3, 2], roll: 20, chimes: 0.7, drops: 0.3, stream: 1 },
    { name: 'Temple Steps', scale: 'hira', key: 52, bpm: 60, density: 0.6, bassProg: [0, 4, 3, 0], roll: 16, chimes: 0.4, drops: 0.5, stream: 0 },
  ],
  game: [
    { name: 'Raked Sand', scale: 'yo', key: 55, bpm: 52, density: 0.42, bassProg: [0, 3, 4, 0], roll: 24, chimes: 0.3, drops: 0.4, stream: 1 },
    { name: 'Koi Pond', scale: 'hira', key: 57, bpm: 56, density: 0.45, bassProg: [0, 0, 3, 4], roll: 24, chimes: 0.3, drops: 0.8, stream: 1 },
    { name: 'Bamboo Shade', scale: 'kumoi', key: 50, bpm: 50, density: 0.4, bassProg: [0, 4, 2, 0], roll: 32, chimes: 0.4, drops: 0.2, stream: 0 },
    { name: 'Stone Lantern', scale: 'yo', key: 53, bpm: 54, density: 0.45, bassProg: [0, 2, 3, 4], roll: 24, chimes: 0.3, drops: 0.3, stream: 1 },
    { name: 'Falling Petals', scale: 'kumoi', key: 60, bpm: 56, density: 0.48, bassProg: [0, 3, 0, 2], roll: 20, chimes: 0.5, drops: 0.3, stream: 0 },
  ],
  night: [
    { name: 'Owl Hour', scale: 'in', key: 50, bpm: 48, density: 0.38, bassProg: [0, 3, 0, 1], roll: 32, chimes: 0.25, drops: 0.5, stream: 1 },
    { name: 'Frost on Bamboo', scale: 'hira', key: 52, bpm: 50, density: 0.4, bassProg: [0, 2, 3, 0], roll: 24, chimes: 0.35, drops: 0.2, stream: 0 },
    { name: 'Temple Night', scale: 'in', key: 55, bpm: 46, density: 0.36, bassProg: [0, 0, 3, 4], roll: 32, chimes: 0.2, drops: 0.6, stream: 1 },
  ],
};

export const LIMITS = { melodyTop: 81, bassTop: 52, chimeTop: 90 }; // A5 ≈ 880 Гц, E3, F#6 (колокольчики очень тихие)

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// Генератор нот для одной пьесы: выдаёт события по тактам (4 доли).
// Событие: { t (с от начала), inst: 'koto'|'bass'|'chime'|'drop', midi, vol, bend? }
export class Composer {
  constructor(piece, seed = 1) {
    this.p = piece;
    this.R = rng(seed * 31 + piece.key);
    this.sc = ZEN_SCALES[piece.scale];
    this.beat = 60 / piece.bpm;
    this.bar = 0;
    // мелодия в диапазоне ступеней 3…10; основу опускаем на октаву, если верх выше ~880 Гц
    this.base = piece.key;
    while (this.note(10) > LIMITS.melodyTop) this.base -= 12;
    this.pos = 5 + Math.floor(this.R() * 3); // ступень мелодии (0 = тоника нижней октавы)
    this.rest = 1; // сколько долей ещё молчит мелодия
    this.last = null; // последняя фраза — для повторов мотива
    this.cur = null; // текущая фраза: [ [длительность в долях, ступень], … ]
  }

  // ступень (может быть отрицательной или больше 5) → MIDI
  note(d, base = this.base) {
    const n = this.sc.length;
    return base + this.sc[((d % n) + n) % n] + 12 * Math.floor(d / n);
  }

  _phrase() {
    const R = this.R;
    // повтор прошлой фразы на ступень выше или ниже — так мелодия запоминается
    if (this.last && R() < 0.4) {
      const sh = [-1, 1, 2, -2][Math.floor(R() * 4)];
      return this.last.map(([len, d]) => [len, Math.max(3, Math.min(10, d + sh))]);
    }
    const lens = [1, 1, 0.5, 0.5, 1.5, 2, 1];
    const n = 3 + Math.floor(R() * 4);
    const out = [];
    let d = this.pos;
    for (let i = 0; i < n; i++) {
      const step = [-2, -1, -1, 1, 1, 2, 0][Math.floor(R() * 7)];
      d = Math.max(3, Math.min(10, d + step));
      out.push([lens[Math.floor(R() * lens.length)], d]);
    }
    // окончание фразы — устойчивая ступень (тоника или квинта), длинная нота
    const end = out[out.length - 1];
    const stable = [5, 7, 10, 3].reduce((a, s) => (Math.abs(s - end[1]) < Math.abs(a - end[1]) ? s : a), 5);
    end[1] = stable;
    end[0] = 2;
    return out;
  }

  // события одного такта (4 доли), время от начала такта
  barEvents() {
    const P = this.p;
    const R = this.R;
    const B = this.beat;
    const ev = [];
    const prog = P.bassProg;
    const root = prog[this.bar % prog.length];
    // бас: низкая струна на первую долю, иногда квинта на третью
    const low = (d) => {
      let m = this.note(d, P.key - 12);
      while (m > LIMITS.bassTop) m -= 12;
      return m;
    };
    ev.push({ t: 0, inst: 'bass', midi: low(root), vol: 0.5 });
    if (R() < 0.35) ev.push({ t: 2 * B, inst: 'bass', midi: low(root + 3), vol: 0.32 });
    // «сукуи»: перебор вверх по струнам в начале раздела
    if (this.bar % P.roll === 0) {
      const r0 = Math.max(3, Math.min(6, this.pos - 2));
      for (let k = 0; k < 5; k++) ev.push({ t: k * 0.09, inst: 'koto', midi: this.note(r0 + k), vol: 0.32 + k * 0.04 });
      this.pos = r0 + 4;
      this.rest = Math.max(this.rest, 2);
    }
    // мелодия
    let t = 0;
    while (t < 4) {
      if (this.rest > 0) {
        const r = Math.min(this.rest, 4 - t);
        this.rest -= r;
        t += r;
        continue;
      }
      if (!this.cur || !this.cur.length) {
        if (this.cur && !this.cur.length) {
          // пауза между фразами: чем ниже плотность, тем дольше тишина
          this.cur = null;
          this.rest = 1 + Math.floor(R() * (1 - P.density) * 8);
          continue;
        }
        this.cur = this._phrase();
        this.last = this.cur.map((x) => x.slice());
      }
      const [len, d] = this.cur.shift();
      this.pos = d;
      const first = this.last && this.cur.length === this.last.length - 1;
      const midi = this.note(d);
      const e = { t: t * B + (R() - 0.5) * 0.02, inst: 'koto', midi, vol: 0.55 + R() * 0.15 };
      // «оси»: на длинной последней ноте струну иногда чуть оттягивают вверх и отпускают
      if (!this.cur.length && R() < 0.3) e.bend = 1;
      ev.push(e);
      // в начале фразы иногда двойная нота — кварта ниже, как на кото
      if (first && d >= 5 && R() < 0.35) ev.push({ t: e.t + 0.03, inst: 'koto', midi: this.note(d - 2), vol: 0.32 });
      t += len;
      if (!this.cur.length) this.cur = [];
    }
    // колокольчики ветра и капли — редко
    if (R() < 0.12 * P.chimes) {
      const t0 = R() * 3 * B;
      const k = 2 + Math.floor(R() * 3);
      for (let i = 0; i < k; i++) {
        let m = this.note(Math.floor(R() * 5), P.key + 24);
        while (m > LIMITS.chimeTop) m -= 12;
        ev.push({ t: t0 + i * (0.18 + R() * 0.2), inst: 'chime', midi: m, vol: 0.5 + R() * 0.3 });
      }
    }
    if (R() < 0.18 * P.drops) ev.push({ t: R() * 4 * B, inst: 'drop', midi: 84 + Math.floor(R() * 8), vol: 0.5 + R() * 0.4 });
    this.bar++;
    return ev;
  }
}

export class ZenMusic {
  constructor(engine) {
    this.e = engine;
    this.mood = 'menu';
    this.idx = { menu: -1, game: -1, night: -1 };
    this.timer = null;
    this.bus = null;
    this.seed = Math.floor(Math.random() * 1e6);
  }

  // совместимость со старым интерфейсом
  define() {}
  setIntensity() {}

  get ctx() {
    return this.e.ctx;
  }

  start() {
    if (this.timer || !this.ctx) return;
    this._fx();
    this._switch(true);
    this.timer = setInterval(() => this._tick(), 120);
  }

  setMood(m) {
    if (!PIECES[m] || m === this.mood) return;
    this.mood = m;
    if (this.timer) this._switch(false);
  }

  // общая цепочка: мягкий фильтр + реверберация «деревянного павильона»
  _fx() {
    const c = this.ctx;
    this.dry = c.createGain();
    this.dry.gain.value = 0.8;
    this.wet = c.createGain();
    this.wet.gain.value = 0.38;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    lp.Q.value = 0.4;
    const conv = c.createConvolver();
    conv.buffer = this._impulse(3.2);
    this.input = c.createGain();
    this.input.connect(lp);
    lp.connect(this.dry).connect(this.e.music);
    lp.connect(conv).connect(this.wet).connect(this.e.music);
  }

  _impulse(sec) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        // сглаженный шум: тёплый хвост без «шипения»
        lp += 0.25 * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
      }
    }
    return buf;
  }

  _switch(immediate) {
    const c = this.ctx;
    const list = PIECES[this.mood];
    const i = (this.idx[this.mood] = (this.idx[this.mood] + 1) % list.length);
    if (this.bus) {
      const old = this.bus;
      const oldStream = this.stream;
      old.gain.setTargetAtTime(0.0001, c.currentTime, 1.2);
      setTimeout(() => {
        old.disconnect();
        if (oldStream) oldStream.stop();
      }, 7000);
    }
    this.bus = c.createGain();
    this.bus.gain.setValueAtTime(immediate ? 1 : 0.0001, c.currentTime);
    if (!immediate) this.bus.gain.setTargetAtTime(1, c.currentTime + 1.5, 1.2);
    this.bus.connect(this.input);
    this.piece = list[i];
    this.comp = new Composer(this.piece, this.seed++);
    this.next = c.currentTime + (immediate ? 0.15 : 1.2);
    this.until = c.currentTime + 150 + Math.random() * 60; // пьеса звучит 2,5–3,5 минуты
    this.stream = this.piece.stream ? this._stream(this.bus) : null;
  }

  _tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || !this.comp) return;
    if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.1;
    if (c.currentTime > this.until) return this._switch(false);
    while (this.next < c.currentTime + 0.6) {
      for (const e of this.comp.barEvents()) this.play(e, this.next + Math.max(0, e.t), this.bus);
      this.next += 4 * this.comp.beat;
    }
  }

  play(e, t, out) {
    switch (e.inst) {
      case 'koto':
        return this._koto(e.midi, t, e.vol, out, e.bend);
      case 'bass':
        return this._koto(e.midi, t, e.vol, out, 0, true);
      case 'chime':
        return this._chime(e.midi, t, e.vol, out);
      case 'drop':
        return this._drop(e.midi, t, e.vol, out);
    }
  }

  // кото: щипок с быстрым ярким началом и естественным затуханием (никакого сустейна)
  _koto(midi, t, vol, out, bend, low) {
    const c = this.ctx;
    const f = mtof(midi);
    const decay = low ? 0.9 : 0.55; // постоянная затухания, с
    const len = decay * 5;
    const amp = (low ? 0.3 : 0.19) * vol * (f > 500 ? Math.sqrt(500 / f) : 1);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.004, decay);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    const bright = low ? 900 : Math.min(3200, f * 6);
    lp.frequency.setValueAtTime(bright, t);
    lp.frequency.setTargetAtTime(low ? 300 : Math.max(600, f * 1.6), t + 0.01, 0.12);
    g.connect(lp).connect(out);
    const parts = low ? [[1, 1], [2, 0.25]] : [[1, 1], [2, 0.42], [3, 0.16], [4.02, 0.06]];
    for (const [m, a] of parts) {
      const o = c.createOscillator();
      o.type = m === 1 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * m, t);
      if (bend) {
        // мягкая подтяжка на полтона и возврат
        o.frequency.setTargetAtTime(f * m * 1.06, t + 0.35, 0.08);
        o.frequency.setTargetAtTime(f * m, t + 0.75, 0.12);
      }
      const og = c.createGain();
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + len);
    }
    // призвук щипка
    if (!low && this.e.noise) {
      const s = c.createBufferSource();
      s.buffer = this.e.noise;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(4000, f * 4);
      bp.Q.value = 1.2;
      const ng = c.createGain();
      ng.gain.setValueAtTime(amp * 0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      s.connect(bp).connect(ng).connect(out);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.04);
    }
  }

  // колокольчик ветра: тихий, с негармоническим обертоном
  _chime(midi, t, vol, out) {
    const c = this.ctx;
    const f = mtof(midi);
    const g = c.createGain();
    const amp = 0.025 * vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.003);
    g.gain.setTargetAtTime(0.0001, t + 0.003, 0.35);
    g.connect(out);
    for (const [m, a] of [[1, 1], [2.76, 0.18]]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const og = c.createGain();
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.8);
    }
  }

  // капля воды: короткий тон, скользящий вверх
  _drop(midi, t, vol, out) {
    const c = this.ctx;
    const f = mtof(midi) * 0.5;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04 * vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.12);
  }

  // ручей: очень тихий тёплый шум, который медленно «дышит»
  _stream(out) {
    const c = this.ctx;
    if (!this.brown) {
      const len = c.sampleRate * 6;
      this.brown = c.createBuffer(1, len, c.sampleRate);
      const d = this.brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      // плавная склейка петли
      const fade = 4000;
      for (let i = 0; i < fade; i++) d[len - fade + i] = d[len - fade + i] * (1 - i / fade) + d[i] * (i / fade);
    }
    const s = c.createBufferSource();
    s.buffer = this.brown;
    s.loop = true;
    s.loopEnd = this.brown.duration - 4000 / c.sampleRate;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 220;
    lfo.connect(lg).connect(bp.frequency);
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.1, c.currentTime + 1, 3);
    s.connect(bp).connect(g).connect(out);
    s.start();
    lfo.start();
    return { stop: () => (s.stop(), lfo.stop()) };
  }
}
