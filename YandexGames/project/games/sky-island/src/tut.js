// Пошаговое обучение на пустом острове: лесопилка → домик → первые жители.
// Шаг определяется по состоянию острова, поэтому обучение не ломается от «неправильных» действий.
import * as E from './econ.js';
import { t as tr } from './i18n.js';
import { audio } from './audio.js';

export class Tutorial {
  constructor(game) {
    this.g = game;
    this.bubble = document.createElement('div');
    this.bubble.className = 'tut hidden';
    this.arrow = document.createElement('div');
    this.arrow.className = 'tut-arrow hidden';
    document.getElementById('ui').append(this.bubble, this.arrow);
    this.hl = null;
    this.lastKey = '';
  }

  get active() {
    const t = this.g.s.tut;
    return !t.done;
  }

  // состояние острова для обучения
  info(type) {
    const list = this.g.s.buildings.filter((b) => b.type === type);
    return { has: list.length > 0, done: list.some((b) => E.effLvl(b) > 0) };
  }

  update() {
    const g = this.g;
    const s = g.s;
    const T = s.tut;
    if (T.done) return this.hide();
    const ui = g.ui;
    if (!T.welcome) {
      if (!ui.modalOpen) this.welcome();
      return this.hide();
    }
    if (ui.modalOpen) return this.hide();
    const saw = this.info('sawmill');
    const hut = this.info('hut');
    let step;
    if (!saw.has) step = this.pick('sawmill', 'prod', tr('tutSawmill'));
    else if (!saw.done) step = { key: 'waitSaw', text: tr('tutWait'), pos: 'top' };
    else if (!hut.has) step = this.pick('hut', 'house', tr('tutHouse'));
    else if (!hut.done) step = { key: 'waitHut', text: tr('tutWait'), pos: 'top' };
    else {
      // первые жители появились
      if (!T.claimed) {
        T.claimed = true;
        // награды за первые две цели обучения
        for (let i = 0; i < 2 && s.goal < 2; i++) {
          const before = s.goal;
          g.claimGoal();
          if (s.goal === before) break;
        }
        audio.play('resident');
        g.save();
      }
      if (!ui.modalOpen && g.people.length) this.people();
      return this.hide();
    }
    this.show(step);
  }

  // шаги «открой меню → выбери здание → поставь»
  pick(type, tab, text) {
    const g = this.g;
    const ui = g.ui;
    if (g.mode && g.mode.kind === 'b' && g.mode.type === type) return { key: 'place-' + type, text: tr('tutPlace'), pos: 'top', target: () => ui.placeBar.querySelector('[data-a="ok"]') };
    const drawerOpen = !ui.drawer.classList.contains('hidden');
    if (drawerOpen) {
      if (ui.tab !== tab && !this['tabSet' + type]) {
        this['tabSet' + type] = true;
        ui.tab = tab;
        ui.renderDrawer();
      }
      return { key: 'card-' + type, text: tr('tutPick', { b: tr('b_' + type) }), pos: 'top', target: () => ui.drawer.querySelector(`.card[data-type="${type}"]`) };
    }
    this['tabSet' + type] = false;
    return { key: 'build-' + type, text, pos: 'bottom', target: () => ui.buildBtn };
  }

  welcome() {
    const ui = this.g.ui;
    const m = ui.modal(`<h2>${tr('tutWelcomeT')}</h2><p>${tr('tutWelcome')}</p><div class="mb"><button class="btn green" data-a="go">${tr('tutStart')}</button></div>`, { closable: false });
    m.querySelector('[data-a="go"]').addEventListener('click', () => {
      audio.unlock();
      audio.startMusic();
      audio.play('click');
      this.g.s.tut.welcome = true;
      this.g.save();
      ui.closeModal();
    });
  }

  people() {
    const g = this.g;
    const ui = g.ui;
    const m = ui.modal(`<h2>${tr('tutPeopleT')}</h2><p>${tr('tutPeople')}</p><div class="mb"><button class="btn green" data-a="ok">${tr('tutOk')}</button></div>`, { closable: false });
    m.querySelector('[data-a="ok"]').addEventListener('click', () => {
      audio.play('click');
      g.s.tut.done = true;
      g.save(true);
      ui.closeModal();
    });
  }

  show(step) {
    if (step.key !== this.lastKey) {
      this.lastKey = step.key;
      this.bubble.textContent = step.text;
      this.bubble.className = 'tut ' + step.pos;
    }
    const el = step.target ? step.target() : null;
    if (el !== this.hl) {
      if (this.hl) this.hl.classList.remove('tut-hl');
      this.hl = el;
      if (el) el.classList.add('tut-hl');
    }
    if (el) {
      const r = el.getBoundingClientRect();
      this.arrow.classList.remove('hidden');
      const below = r.top < 140;
      this.arrow.className = 'tut-arrow' + (below ? ' up' : '');
      this.arrow.style.left = r.left + r.width / 2 + 'px';
      this.arrow.style.top = (below ? r.bottom + 6 : r.top - 34) + 'px';
    } else this.arrow.classList.add('hidden');
  }

  hide() {
    this.bubble.classList.add('hidden');
    this.arrow.classList.add('hidden');
    if (this.hl) this.hl.classList.remove('tut-hl');
    this.hl = null;
    this.lastKey = '';
  }
}
