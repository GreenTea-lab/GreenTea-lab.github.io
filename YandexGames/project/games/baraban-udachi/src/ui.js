// Интерфейс в DOM: сцена фиксированного виртуального размера (масштабируется под экран),
// раскладка для горизонтального и вертикального экрана, табло, игроки, ведущий, клавиатура, окна.
import { ICONS } from './art.js';
import { Studio } from './studio.js';
import { ALPHABET } from './data.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const norm = (ch) => (ch === 'Ё' ? 'Е' : ch);
const $ = (sel, root = document) => root.querySelector(sel);

export class UI {
  constructor(game) {
    this.g = game;
    this.W = 1600;
    this.H = 900;
    this.port = false;
  }

  init() {
    this.stage = $('#stage');
    this.stage.innerHTML = `
<div id="top"><div class="tl"><button class="chip" id="coins">${ICONS.coin}<span>0</span><i class="plus">+</i></button></div><div class="stagelbl hide" id="stagelbl"></div><div class="tr"><button class="tbtn" id="bsound" aria-label="Звук">${ICONS.sound}</button><button class="tbtn hide" id="bpause" aria-label="Пауза">${ICONS.pause}</button></div></div>
<div id="qbox" class="hide"><div class="qt"></div></div>
<div id="board" class="hide"></div>
<div id="players" class="hide"></div>
<div id="acts" class="hide"></div>
<div id="menu"><div id="logo"><b>Барабан удачи</b><i>Капитал-шоу</i></div><div id="mbtns"></div></div>
<div id="bubble" class="hide"></div>
`;
    this.studio = new Studio($('#wrap'));
    this.drumEl = this.studio.renderer.domElement;
    this.bubbleEl = $('#bubble');
    this.boardEl = $('#board');
    this.playersEl = $('#players');
    this.actsEl = $('#acts');
    this.qEl = $('#qbox');
    $('#coins').onclick = () => this.g.openShop();
    $('#bsound').onclick = () => this.g.openSound();
    $('#bpause').onclick = () => this.g.pauseMenu();
    this.bubbleEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.g.skipLine(); });
    window.addEventListener('resize', () => this.layout());
    this.layout();
    this.says = [];
  }

  setDrumSkin(skin) {
    this.studio.setSkin(skin);
  }
  setDrumAngle(a) {
    this.studio.setDrumAngle(a);
  }
  flap() {
    this.studio.flap();
  }
  // виртуальные координаты сцены ↔ пиксели окна
  toCss(x, y) {
    return [this.offX + x * this.scale, this.offY + y * this.scale];
  }
  toStage(px, py) {
    return [(px - this.offX) / this.scale, (py - this.offY) / this.scale];
  }
  // свободная от интерфейса область (виртуальные координаты) → центр кадра 3D-студии
  setFocusBox(x0, y0, x1, y1) {
    const [a, b] = this.toCss(x0, y0), [c, d] = this.toCss(x1, y1);
    this.studio.setFocus((a + c) / 2, (b + d) / 2, c - a, d - b);
  }
  // каждый кадр: облачка следуют за головами персонажей
  frame() {
    const st = this.studio;
    const hb = this.bubbleEl;
    if (!hb.classList.contains('hide')) {
      const hp = st.headPos('host');
      const p = hp && st.project(hp.add({ x: 0, y: 0.55, z: 0, isVector3: true }));
      const bw = hb.offsetWidth, bh = hb.offsetHeight;
      let x, y, ok = false;
      if (p && p.vis) {
        [x, y] = this.toStage(p.x, p.y);
        ok = x > -40 && x < this.W + 40 && y > 60 && y < this.H;
      }
      let L, T;
      if (ok) { L = x - 60; T = y - bh - 10; }
      else if (this.port) { L = 24; T = this.g.state === 'menu' ? 330 : 590; }
      else { L = 24; T = 300; }
      const minT = this.port ? (this.g.state === 'menu' ? 300 : 420) : this.g.state === 'menu' ? 230 : 300;
      L = Math.max(16, Math.min(this.W - bw - (this.port || this.g.state === 'menu' ? 16 : 470), L));
      T = Math.max(minT, Math.min(this.H - bh - 20, T));
      hb.style.left = L + 'px';
      hb.style.top = T + 'px';
      hb.style.bottom = '';
      hb.style.setProperty('--tx', Math.max(30, Math.min(bw - 40, (ok ? x : L + 60) - L)) + 'px');
    }
    for (const s of this.says) {
      const hp = st.headPos(s.i);
      const p = hp && st.project(hp.add({ x: 0, y: 0.62, z: 0, isVector3: true }));
      if (!p || !p.vis) continue;
      const [x, y] = this.toStage(p.x, p.y);
      s.el.style.left = Math.max(10 + s.el.offsetWidth / 2, Math.min(this.W - 10 - s.el.offsetWidth / 2, x)) + 'px';
      s.el.style.top = Math.max(150, y) + 'px';
    }
  }

  // ---------- раскладка ----------
  layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const port = vh > vw * 1.05;
    let W, H;
    if (port) {
      W = 900;
      H = Math.max(1450, Math.min(2000, (900 * vh) / vw));
    } else {
      H = 900;
      W = Math.max(1280, Math.min(2000, (900 * vw) / vh));
    }
    const s = Math.min(vw / W, vh / H);
    this.W = W;
    this.H = H;
    this.port = port;
    this.scale = s;
    const st = this.stage;
    st.style.width = W + 'px';
    st.style.height = H + 'px';
    this.offX = (vw - W * s) / 2;
    this.offY = (vh - H * s) / 2;
    st.style.transform = `translate(${this.offX}px,${this.offY}px) scale(${s})`;
    if (this.studio) this.studio.resize();
    st.classList.toggle('port', port);
    st.classList.toggle('land', !port);
    this.place();
  }

  // положение элементов в виртуальных координатах сцены
  place() {
    const { W, H, port } = this;
    const menu = this.g.state === 'menu';
    const set = (el, o) => {
      for (const k of ['left', 'top', 'right', 'bottom', 'width', 'height']) el.style[k] = o[k] === undefined ? '' : typeof o[k] === 'number' ? o[k] + 'px' : o[k];
    };
    const logo = $('#logo'), mb = $('#mbtns');
    if (port) {
      if (menu) {
        const ex = H - 1450;
        set(logo, { top: 110 + ex * 0.06 });
        $('#logo b').style.fontSize = '104px';
        set(mb, { left: 0, right: 0, bottom: 40 });
        this.setFocusBox(0, 330 + ex * 0.1, W, H - 420);
      } else {
        this.setFocusBox(0, 560, W, H - 240);
      }
      set(this.qEl, { left: 20, right: 20, top: 104, height: 150 });
      set($('#stagelbl'), {});
      set(this.boardEl, { left: 0, right: 0, top: 272 });
      this.boardEl.style.margin = '0 auto';
      this.boardEl.style.width = 'max-content';
      set(this.playersEl, { left: 16, right: 16, top: 416 });
      set(this.actsEl, { left: 20, right: 20, bottom: 36 });
    } else {
      if (menu) {
        set(logo, { top: 40 });
        $('#logo b').style.fontSize = '120px';
        set(mb, { left: 40, width: 560, top: 262 });
        this.setFocusBox(600, 230, W, H);
      } else {
        this.setFocusBox(0, 300, W - 460, H);
      }
      const qw = Math.min(1240, W - 2 * 330);
      set(this.qEl, { left: (W - qw) / 2, width: qw, top: 18, height: 120 });
      set($('#stagelbl'), { left: 0, top: 96 });
      set(this.boardEl, { left: 0, right: 0, top: 152 });
      this.boardEl.style.margin = '0 auto';
      this.boardEl.style.width = 'max-content';
      set(this.playersEl, { right: 24, top: 296, width: 420 });
      this.playersEl.style.flexDirection = 'column';
      set(this.actsEl, { right: 24, width: 420, top: 640 });
    }
    if (port) this.playersEl.style.flexDirection = 'row';
    this.playersEl.querySelectorAll('.plate').forEach((p) => (p.style.flex = port ? '1 1 0' : ''));
    // ширина ячеек табло
    if (this.cells) this.sizeBoard();
    this.place2 && this.place2();
  }

  // ---------- верх ----------
  setCoins(n) {
    $('#coins span').textContent = n.toLocaleString('ru-RU');
  }
  setStageLabel(t) {
    const e = $('#stagelbl');
    e.textContent = t || '';
    e.classList.toggle('hide', !t);
  }
  showPause(on) {
    $('#bpause').classList.toggle('hide', !on);
  }

  // ---------- режимы ----------
  showMenu(buttons) {
    this.stage.classList.add('inmenu');
    $('#menu').classList.remove('hide');
    for (const id of ['qbox', 'board', 'players', 'acts']) $('#' + id).classList.add('hide');
    this.setStageLabel('');
    this.showPause(false);
    const mb = $('#mbtns');
    mb.innerHTML = buttons;
    this.place();
  }
  showPlay() {
    this.stage.classList.remove('inmenu');
    $('#menu').classList.add('hide');
    this.showPause(true);
    this.place();
  }

  // ---------- облачко ведущего ----------
  bubble(text) {
    const b = this.bubbleEl;
    b.textContent = text;
    b.classList.remove('hide');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
  }
  hideBubble() {
    this.bubbleEl.classList.add('hide');
  }
  // рот ведущего двигается по громкости голоса
  talk(level, on, voiced) {
    const h = this.studio.host;
    h.level = voiced ? level : -1;
    if (on && !voiced) h.talk(0.1);
  }

  // ---------- задание и табло ----------
  setQuestion(q) {
    this.qEl.classList.remove('hide');
    $('.qt', this.qEl).textContent = q;
    const n = q.length;
    this.qEl.style.fontSize = (this.port ? (n > 120 ? 27 : 31) : n > 120 ? 26 : 30) + 'px';
  }
  buildBoard(word) {
    this.cells = [...word];
    this.boardEl.classList.remove('hide');
    this.boardEl.innerHTML = this.cells.map((ch, i) => `<div class="cell" data-i="${i}"><div class="ci"><div class="cf"></div><div class="cb">${esc(ch)}</div></div></div>`).join('');
    this.sizeBoard();
    this.boardEl.querySelectorAll('.cell').forEach((c) => (c.onclick = () => this.g.onCell(+c.dataset.i)));
  }
  sizeBoard() {
    const n = this.cells.length;
    const maxW = this.port ? 860 : Math.min(this.W - 120, 1100);
    const cs = Math.min(this.port ? 72 : 84, Math.floor((maxW - 32 - (n - 1) * 8) / n));
    this.boardEl.style.setProperty('--cs', cs + 'px');
  }
  openCell(i, flash = true) {
    const c = this.boardEl.children[i];
    if (!c) return;
    c.classList.add('open');
    if (flash) c.classList.add('flash');
  }
  setPickable(on) {
    this.boardEl.querySelectorAll('.cell').forEach((c) => c.classList.toggle('pick', on && !c.classList.contains('open')));
  }

  // ---------- игроки ----------
  setPlayers(ps) {
    this.playersEl.classList.remove('hide');
    this.playersEl.innerHTML = ps
      .map((p, i) => `<div class="plate${p.me ? ' me' : ''}" data-i="${i}" style="animation-delay:${i * 0.15}s"><div class="av"><img src="${this.studio.portrait(p)}" alt=""></div><div class="pi"><div class="pn">${esc(p.name)}</div><div class="pc">${p.me ? '<b class="you">Вы</b> ' : ''}${esc(p.sub)}</div></div><div class="ps">0</div></div>`)
      .join('');
    this.place();
  }
  updatePlayers(ps, turn) {
    [...this.playersEl.children].forEach((el, i) => {
      el.classList.toggle('on', i === turn);
      el.classList.toggle('out', !!ps[i].out);
      $('.ps', el).textContent = ps[i].score.toLocaleString('ru-RU');
    });
  }
  // реплика игрока: облачко над головой 3D-персонажа
  playerSay(i, html, ms = 1600) {
    for (const s of this.says.filter((x) => x.i === i)) s.el.remove();
    this.says = this.says.filter((x) => x.i !== i);
    const el = document.createElement('div');
    el.className = 'say3';
    el.innerHTML = html;
    this.stage.appendChild(el);
    const s = { i, el };
    this.says.push(s);
    this.studio.talk(i, Math.min(1.2, ms / 1600));
    this.frame();
    setTimeout(() => { el.remove(); this.says = this.says.filter((x) => x !== s); }, ms);
  }

  // ---------- значение сектора ----------
  sectorBadge(text, cls = '') {
    const old = $('#sector');
    if (old) old.remove();
    if (!text) return;
    const e = document.createElement('div');
    e.id = 'sector';
    e.className = cls;
    e.textContent = text;
    const [x, y] = this.toStage(this.studio.focus.x, this.studio.focus.y);
    e.style.top = (this.port ? y + 120 : y + 130) + 'px';
    e.style.left = x + 'px';
    this.stage.appendChild(e);
  }

  // ---------- кнопки хода ----------
  setActions(html) {
    this.actsEl.innerHTML = html;
    this.actsEl.classList.toggle('hide', !html);
  }

  // ---------- клавиатура ----------
  // opts: { title, used:Set, hint, yes:Set, onKey(ch), extra: html кнопок снизу, line: html строки слова }
  keyboard(opts) {
    this.closeKeyboard();
    const k = document.createElement('div');
    k.id = 'kbd';
    const { W, H, port } = this;
    const w = port ? 880 : Math.min(980, W - 760);
    Object.assign(k.style, port ? { left: (W - w) / 2 + 'px', width: w + 'px', bottom: '20px' } : { left: (W - w) / 2 - 30 + 'px', width: w + 'px', bottom: '16px' });
    const keys = ALPHABET.map((ch) => {
      const cls = opts.yes && opts.yes.has(ch) ? 'yes' : opts.used && opts.used.has(ch) ? 'used' : opts.hint === ch ? 'hint' : opts.sel && opts.sel.has(ch) ? 'sel' : '';
      return `<button class="k ${cls}" data-k="${ch}"${cls === 'used' || cls === 'yes' ? ' disabled' : ''}>${ch}</button>`;
    }).join('');
    k.innerHTML = `${opts.title ? `<div class="kt">${esc(opts.title)}</div>` : ''}${opts.line || ''}<div class="keys">${keys}</div>${opts.extra ? `<div class="krow">${opts.extra}</div>` : ''}`;
    k.querySelectorAll('.k').forEach((b) => (b.onclick = () => opts.onKey(b.dataset.k, b)));
    if (opts.bind) opts.bind(k);
    k.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.stage.appendChild(k);
    this.kbdEl = k;
    return k;
  }
  closeKeyboard() {
    if (this.kbdEl) this.kbdEl.remove();
    this.kbdEl = null;
  }

  // ---------- окна ----------
  modal(html, { wide = false, close = null, bind = null, cls = '' } = {}) {
    this.closeModal();
    const m = document.createElement('div');
    m.id = 'modal';
    m.innerHTML = `<div class="panel ${wide ? 'wide' : ''} ${cls}">${html}</div>`;
    const x = m.querySelector('.ph .x');
    if (x) x.onclick = () => { this.g.click(); this.closeModal(); close && close(); };
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.stage.appendChild(m);
    this.modalEl = m;
    if (bind) bind(m);
    return m;
  }
  closeModal() {
    if (this.modalEl) this.modalEl.remove();
    this.modalEl = null;
  }
  get modalOpen() {
    return !!this.modalEl;
  }
  head(title, closable = true) {
    return `<div class="ph"><h2>${esc(title)}</h2>${closable ? `<button class="x" aria-label="Закрыть">${ICONS.close}</button>` : ''}</div>`;
  }

  toast(text, ms = 2200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.stage.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  confetti(n = 90) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const cols = ['#f5c542', '#e23b3b', '#2c6fd6', '#2f9e5b', '#ff8fd0', '#fff'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = cols[i % cols.length];
      p.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
      p.style.animationDelay = Math.random() * 1.2 + 's';
      c.appendChild(p);
    }
    this.stage.appendChild(c);
    setTimeout(() => c.remove(), 6500);
  }
}
