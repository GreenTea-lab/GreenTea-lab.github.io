// Соперники: имена и рисованные портреты (SVG из «семени»)
import { LANG } from './i18n.js';

const NAMES_RU = [
  ['Николай', 'm'], ['Валентина', 'f'], ['Михалыч', 'm'], ['Галина', 'f'], ['Сергей П.', 'm'], ['Людмила', 'f'], ['Виктор', 'm'], ['Тамара', 'f'],
  ['Анатолий', 'm'], ['Ольга В.', 'f'], ['Пётр Ильич', 'm'], ['Нина', 'f'], ['Геннадий', 'm'], ['Зинаида', 'f'], ['Борис', 'm'], ['Светлана', 'f'],
  ['Юрий', 'm'], ['Надежда', 'f'], ['Василий', 'm'], ['Раиса', 'f'], ['Аркадий', 'm'], ['Лариса', 'f'], ['Степаныч', 'm'], ['Вера', 'f'],
];
const NAMES_EN = [
  ['Frank', 'm'], ['Martha', 'f'], ['George', 'm'], ['Linda', 'f'], ['Walter', 'm'], ['Helen', 'f'], ['Arthur', 'm'], ['Peggy', 'f'],
  ['Harold', 'm'], ['Susan', 'f'], ['Bob', 'm'], ['Dorothy', 'f'], ['Earl', 'm'], ['Betty', 'f'], ['Ray', 'm'], ['Judy', 'f'],
  ['Ted', 'm'], ['Carol', 'f'], ['Hank', 'm'], ['Nancy', 'f'], ['Lou', 'm'], ['Joan', 'f'], ['Gus', 'm'], ['Ruth', 'f'],
];

function rand(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// подобрать n разных соперников
export function pickBots(n, seed) {
  const list = LANG === 'ru' ? NAMES_RU : NAMES_EN;
  const r = rand(seed);
  const idx = list.map((_, i) => i).sort(() => r() - 0.5);
  return idx.slice(0, n).map((i) => ({ name: list[i][0], g: list[i][1], av: Math.floor(r() * 100000) + i * 7 }));
}

const SKIN = ['#f6d3b3', '#efc19a', '#e3a97c', '#c98b62', '#f9dcc4'];
const HAIR_M = ['#d9d9d9', '#bfbfbf', '#8a6a4a', '#5a3e2a', '#f2f2f2', '#3a2a20'];
const HAIR_F = ['#c9c2d8', '#a0603a', '#e8c48a', '#6a4030', '#d9d4d0', '#b0442e'];
const SHIRT = ['#4a78c2', '#c2453f', '#3f9a5a', '#e0a23a', '#7a5ab8', '#2f8f9a', '#d86a8a', '#6a7a8a'];

// портрет: g — 'm' | 'f'
export function avatarSVG(seed, g = 'm', me = false) {
  const r = rand(seed + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const skin = pick(SKIN);
  const hair = pick(g === 'f' ? HAIR_F : HAIR_M);
  const shirt = me ? '#2f8f9a' : pick(SHIRT);
  const O = '#3a2a1e';
  const glasses = r() < 0.45;
  const hat = g === 'm' ? r() < 0.35 : false;
  const scarf = g === 'f' ? r() < 0.3 : false;
  const mustache = g === 'm' && r() < 0.45;
  const bald = g === 'm' && !hat && r() < 0.35;
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="cp${seed}"><circle cx="50" cy="50" r="48"/></clipPath></defs>`;
  s += `<g clip-path="url(#cp${seed})"><rect width="100" height="100" fill="${me ? '#fdf0c8' : '#f3ead8'}"/>`;
  // плечи
  s += `<path d="M10 100c2-20 18-30 40-30s38 10 40 30z" fill="${shirt}" stroke="${O}" stroke-width="3"/>`;
  s += `<path d="M40 72l10 10 10-10" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  // шея и голова
  s += `<rect x="42" y="58" width="16" height="14" fill="${skin}" stroke="${O}" stroke-width="3"/>`;
  if (g === 'f' && !scarf) s += `<path d="M24 52c-4-22 8-36 26-36s30 14 26 36c-2 8-4 14-8 18H32c-4-4-6-10-8-18z" fill="${hair}" stroke="${O}" stroke-width="3"/>`;
  s += `<ellipse cx="50" cy="44" rx="20" ry="22" fill="${skin}" stroke="${O}" stroke-width="3"/>`;
  // уши
  s += `<ellipse cx="30" cy="46" rx="4" ry="6" fill="${skin}" stroke="${O}" stroke-width="2.5"/><ellipse cx="70" cy="46" rx="4" ry="6" fill="${skin}" stroke="${O}" stroke-width="2.5"/>`;
  // волосы
  if (g === 'm' && !hat) {
    if (bald) s += `<path d="M31 40c0-6 3-10 6-12M69 40c0-6-3-10-6-12" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/>`;
    else s += `<path d="M30 40c-2-14 8-20 20-20s22 6 20 20c-4-6-10-9-20-9s-16 3-20 9z" fill="${hair}" stroke="${O}" stroke-width="3"/>`;
  }
  if (g === 'f' && !scarf) s += `<path d="M30 38c2-12 10-18 20-18s18 6 20 18c-6-8-14-10-20-6-6-4-14-2-20 6z" fill="${hair}" stroke="${O}" stroke-width="3"/>`;
  if (scarf) {
    const sc = pick(['#d8383c', '#3a6ab8', '#e8a23a', '#7a4ab8']);
    s += `<path d="M26 50c-4-26 10-36 24-36s28 10 24 36c-6-10-14-16-24-16s-18 6-24 16z" fill="${sc}" stroke="${O}" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="${36 + i * 9}" cy="${24 + (i % 2) * 3}" r="2.2" fill="#fff" opacity=".85"/>`;
    s += `<path d="M30 58l-6 14M70 58l6 14" stroke="${sc}" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (hat) {
    const hc = pick(['#6a7a8a', '#8a6a4a', '#3a4a5a', '#e8e0c8']);
    s += `<path d="M26 32c0-12 10-18 24-18s24 6 24 18z" fill="${hc}" stroke="${O}" stroke-width="3"/><path d="M22 32h40c6 0 12 2 14 4H22z" fill="${hc}" stroke="${O}" stroke-width="3"/>`;
  }
  // глаза, брови, румянец, улыбка
  s += `<circle cx="42" cy="45" r="2.8" fill="${O}"/><circle cx="58" cy="45" r="2.8" fill="${O}"/>`;
  s += `<path d="M37 38q5-3 9 0M54 38q5-3 9 0" fill="none" stroke="${g === 'm' ? hair === '#f2f2f2' ? '#bbb' : hair : O}" stroke-width="2.5" stroke-linecap="round"/>`;
  s += `<circle cx="36" cy="53" r="3.6" fill="#ff8a8a" opacity=".45"/><circle cx="64" cy="53" r="3.6" fill="#ff8a8a" opacity=".45"/>`;
  if (mustache) s += `<path d="M40 56q5-4 10 0q5-4 10 0q-5 4-10 1q-5 3-10-1z" fill="${hair === '#3a2a20' ? hair : '#9a8a7a'}" stroke="${O}" stroke-width="1.5"/>`;
  else s += `<path d="M44 57q6 5 12 0" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>`;
  if (glasses) s += `<g fill="rgba(200,230,255,.35)" stroke="${O}" stroke-width="2.5"><circle cx="42" cy="45" r="6.5"/><circle cx="58" cy="45" r="6.5"/><path d="M48.5 45h3"/></g>`;
  s += `</g><circle cx="50" cy="50" r="48" fill="none" stroke="${O}" stroke-width="4"/></svg>`;
  return s;
}
