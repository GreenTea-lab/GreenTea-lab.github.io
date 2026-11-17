import { t, fmt } from './i18n.js';

export function createRecordStory(record) {
  const c = document.createElement('canvas'); c.width = 720; c.height = 1280;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 720, 1280);
  bg.addColorStop(0, '#aee4ff'); bg.addColorStop(.58, '#f1fbff'); bg.addColorStop(1, '#82c96d');
  g.fillStyle = bg; g.fillRect(0, 0, 720, 1280);
  for (let i = 0; i < 10; i++) {
    const x = i * 85 - 40, h = 100 + (i * 61) % 220;
    g.fillStyle = ['#f1bfae', '#a6d6e6', '#dcc4ee'][i % 3]; g.fillRect(x, 790 - h, 70, h);
    g.fillStyle = '#fff9de'; for (let y = 805 - h; y < 775; y += 28) g.fillRect(x + 12, y, 40, 12);
  }
  g.strokeStyle = '#1d2240'; g.lineWidth = 18; g.fillStyle = '#fffaf0';
  g.beginPath(); g.ellipse(360, 850, 265, 112, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#161c35'; g.beginPath(); g.ellipse(360, 850, 225, 77, 0, 0, Math.PI * 2); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#1d2240'; g.font = '800 48px Rubik, sans-serif';
  const title = t('title').split(' ');
  title.forEach((s, i) => g.fillText(s, 360, 180 + i * 65));
  g.font = '800 30px Rubik, sans-serif'; g.fillText(t('personalRecord'), 360, 390);
  g.font = '800 92px Rubik, sans-serif'; g.fillText(fmt(record.pts || 0), 360, 500);
  g.font = '600 30px Rubik, sans-serif'; g.fillText(t('points'), 360, 548);
  g.fillStyle = '#1d2240'; g.font = '800 32px Rubik, sans-serif';
  g.fillText(t('map_' + (record.map || 'town')), 360, 1055);
  g.font = '600 27px Rubik, sans-serif'; g.fillText(t('storyCTA'), 360, 1120);
  return c.toDataURL('image/png');
}
