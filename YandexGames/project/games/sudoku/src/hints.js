// Умная подсказка: находит следующий логический ход и объясняет его простыми словами
import { Solver, bit, digitsOf } from './sudoku.js';
import { t } from './i18n.js';

// где сейчас ошибки (цифры, не совпадающие с решением)
export function findErrors(B) {
  const out = [];
  for (let i = 0; i < B.G.size; i++) if (!B.givens[i] && B.vals[i] && B.vals[i] !== B.sol[i]) out.push(i);
  return out;
}

const unitWord = (G, u, form) => t(form + '_' + G.types[u]);

function placeText(G, st) {
  const d = st.place[1];
  if (st.tech === 'full') return t('h_full', { u: unitWord(G, st.unit, 'uIn'), d });
  if (st.tech === 'naked') return t('h_naked', { d });
  return t('h_hidden', { u: unitWord(G, st.unit, 'uIn'), d });
}

function elimText(G, st) {
  const ds = st.digits.join(t('and'));
  switch (st.tech) {
    case 'pointing':
      return t('h_pointing', { d: ds, line: unitWord(G, st.unit, 'uOne') });
    case 'claiming':
      return t('h_claiming', { d: ds, u: unitWord(G, st.unit, 'uIn') });
    case 'nakedPair':
    case 'nakedTriple':
    case 'nakedQuad':
      return t('h_nakedSet', { n: st.focus.length, d: ds, u: unitWord(G, st.unit, 'uOf') });
    case 'hiddenPair':
    case 'hiddenTriple':
    case 'hiddenQuad':
      return t('h_hiddenSet', { d: ds, u: unitWord(G, st.unit, 'uIn'), n: st.focus.length });
    case 'xwing':
      return t('h_xwing', { d: ds });
    case 'swordfish':
      return t('h_swordfish', { d: ds });
    default:
      return t('h_wing', { d: ds });
  }
}

// B — доска: { G, givens, vals, sol, sel }
// возвращает { kind: 'error'|'place', target, digit, area: [], focus: [], elim: [], pre: '', text: '' }
export function makeHint(B) {
  const G = B.G;
  const errs = findErrors(B);
  if (errs.length) {
    const target = B.sel !== null && errs.includes(B.sel) ? B.sel : errs[0];
    return { kind: 'error', target, digit: B.sol[target], area: [], focus: [], elim: [], pre: '', text: t('h_error') };
  }
  const S = new Solver(G, B.vals);
  // выбранная пустая клетка: если в ней уже есть простой ход — объясняем именно её
  if (B.sel !== null && !B.vals[B.sel]) {
    const i = B.sel;
    const d = B.sol[i];
    if (S.cand[i] === bit(d)) return finish(G, { tech: 'naked', place: [i, d], cells: [i, ...G.peers[i].filter((p) => S.g[p])] }, null);
    for (const u of G.unitsOf[i]) {
      const n = G.units[u].filter((j) => S.cand[j] & bit(d)).length;
      if (n === 1) return finish(G, { tech: G.types[u] === 'box' ? 'hiddenBox' : 'hidden', place: [i, d], unit: u, cells: G.units[u] }, null);
    }
  }
  let pre = null;
  for (let k = 0; k < 80; k++) {
    const st = S.next(4);
    if (!st) break;
    if (st.place) return finish(G, st, pre);
    pre = st;
    S.apply(st);
  }
  // запасной вариант: клетка с наименьшим числом кандидатов
  let best = -1,
    bn = 99;
  for (let i = 0; i < G.size; i++) if (!B.vals[i] && digitsOf(S.cand[i]).length < bn) ((bn = digitsOf(S.cand[i]).length), (best = i));
  if (best < 0) return null;
  return { kind: 'place', target: best, digit: B.sol[best], area: [], focus: [], elim: [], pre: '', text: t('h_open', { d: B.sol[best] }) };
}

function finish(G, st, pre) {
  const [target, digit] = st.place;
  const h = { kind: 'place', target, digit, area: st.cells || [], focus: [], elim: [], pre: '', text: placeText(G, st) };
  if (st.tech === 'naked') {
    h.area = [];
    h.focus = st.cells.filter((c) => c !== target);
  }
  if (pre) {
    h.pre = elimText(G, pre);
    h.focus = [...new Set([...(h.focus || []), ...pre.focus])];
    h.elim = pre.elim.map((e) => e[0]);
    if (!h.area.length) h.area = pre.cells || [];
  }
  return h;
}
