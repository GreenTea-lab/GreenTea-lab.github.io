import { LANG, t } from './i18n.js';

// Отдельный Canvas: результат виден в истории без загрузки внешних картинок.
export function createRecordStory(record = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Story canvas is unavailable');
  const score = Number.isFinite(record.score) ? Math.max(0, Math.floor(record.score)) : 0;
  const time = Number.isFinite(record.time) ? Math.max(0, Math.floor(record.time)) : 0;
  const gradient = ctx.createLinearGradient(0, 0, 720, 1280);
  gradient.addColorStop(0, '#090f28');
  gradient.addColorStop(0.55, '#190c36');
  gradient.addColorStop(1, '#080a1c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 720, 1280);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#203454';
  for (let x = 0; x <= 720; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1280); ctx.stroke(); }
  for (let y = 0; y <= 1280; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke(); }

  // Центральная карточка оставляет место для элементов интерфейса историй сверху и снизу.
  ctx.fillStyle = '#0d1028';
  ctx.fillRect(45, 210, 630, 850);
  ctx.strokeStyle = '#45eaff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#22dfff';
  ctx.shadowBlur = 24;
  ctx.strokeRect(45, 210, 630, 850);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  function text(value, y, size, color) {
    ctx.fillStyle = color;
    do { ctx.font = `bold ${size--}px "Russo One", "Segoe UI", sans-serif`; }
    while (ctx.measureText(value).width > 560 && size > 18);
    ctx.fillText(value, 360, y);
  }
  text(t('storyTitle'), 300, 44, '#45eaff');
  text(t('storyRecord'), 410, 28, '#c1badb');
  text(score.toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US'), 535, 100, '#ffdd69');
  text(t('storyScore'), 625, 26, '#ffdd69');
  ctx.fillStyle = '#334361';
  ctx.fillRect(170, 695, 380, 2);
  text(t('storyTime'), 755, 24, '#c1badb');
  text(`${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`, 835, 68, '#ffffff');
  text(t('storyChallenge'), 980, 32, '#ff77dc');
  return canvas.toDataURL('image/png');
}
