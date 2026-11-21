import { PROJECTS } from './data.js';
import { EXPANSIONS } from './world-data.js';
import { setLang, t } from './i18n.js';
import { Island } from './island.js';
import { initThumbs, projThumb } from './thumbs.js';

setLang('ru');
const canvas = document.querySelector('#island');
const details = document.querySelector('#coast-details');
const error = document.querySelector('#error');
const coasts = ['Стартовый остров', ...EXPANSIONS.map(coast => coast.ru)];
let tier = 0;
let stage = 3;
let island;
let yaw = 0.25;

function draw() {
  if (!island) return;
  const { width, height } = canvas.getBoundingClientRect();
  island.resize(Math.max(1, width), Math.max(1, height));
  Object.assign(island.cam, { yaw, dist: island.baseDist() * 1.08 });
  island.applyCam();
  island.render();
}

function showCoast(next) {
  tier = next;
  const coast = EXPANSIONS[tier - 1];
  const projects = PROJECTS.filter(project => (project.tier || 0) <= tier);
  const lots=projects.filter(project=>!project.beach).length;
  details.textContent = coast
    ? `После уровня ${coast.level} · ${coast.stars} звёзд за расширение · ${lots} площадок и береговая линия`
    : `${lots} площадок и береговая линия · доступен с начала игры`;
  try {
    if (island?.expansion !== tier) {
      island?.dispose();
      island = new Island(canvas, 'mid', tier);
      initThumbs(island.renderer);
    }
    island.setStages(Object.fromEntries(projects.map(project => [project.id, stage])));
    island.update(0);
    draw();
    error.hidden = true;
  } catch (cause) {
    console.error(cause);
    error.textContent = 'Для просмотра моделей нужен браузер с поддержкой WebGL.';
    error.hidden = false;
  }
}

function buttons(id, labels, selected, change) {
  const group = document.getElementById(id);
  labels.forEach((label, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(i === selected));
    button.onclick = () => {
      for (const item of group.children) item.setAttribute('aria-pressed', String(item === button));
      change(i);
    };
    group.append(button);
  });
}

buttons('coasts', coasts, tier, showCoast);
buttons('stages', ['Пустые площадки', 'Стадия 1', 'Стадия 2', 'Стадия 3'], stage, next => {
  stage = next;
  showCoast(tier);
});
document.querySelector('#left').onclick = () => { yaw -= Math.PI / 6; draw(); };
document.querySelector('#right').onclick = () => { yaw += Math.PI / 6; draw(); };
new ResizeObserver(draw).observe(canvas.parentElement);
showCoast(0);

const observer = new IntersectionObserver(entries => {
  for (const { isIntersecting, target } of entries) {
    if (!isIntersecting || !island) continue;
    target.src = projThumb(target.dataset.project, Number(target.dataset.stage));
    observer.unobserve(target);
  }
}, { rootMargin: '160px' });
const buildings = document.querySelector('#buildings');
for (const [index, coast] of coasts.entries()) {
  const title = document.createElement('h2');
  title.textContent = coast;
  title.style.gridColumn = '1 / -1';
  buildings.append(title);
  for (const project of PROJECTS.filter(p => (p.tier || 0) === index)) {
    const article = document.createElement('article');
    article.innerHTML = `<h3>${t('p_' + project.id)}</h3><div class="models"></div>`;
    for (const level of [1, 2, 3]) {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const label = t(`p_${project.id}_${level}`);
      image.alt = label;
      image.dataset.project = project.id;
      image.dataset.stage = level;
      const caption = document.createElement('figcaption');
      caption.textContent = `${level}. ${label} · ★ ${project.cost[level - 1]}`;
      figure.append(image, caption);
      article.querySelector('.models').append(figure);
      observer.observe(image);
    }
    buildings.append(article);
  }
}
