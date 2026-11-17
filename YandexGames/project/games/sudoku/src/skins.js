// Стили поля: покупаются за монеты (золотой — только в наборе «Сад мастера»)
export const SKINS = [
  { id: 'paper', price: 0 },
  { id: 'bamboo', price: 600 },
  { id: 'stone', price: 900 },
  { id: 'sakura', price: 1200 },
  { id: 'ink', price: 1800 },
  { id: 'gold', price: 0, premium: true },
];

export const owns = (D, id) => id === 'paper' || (D.skins || []).includes(id) || (D.premium && !!SKINS.find((s) => s.id === id));

// маленькое поле 3×3 для витрины
export function skinPreview(id) {
  const v = ['5', '', '3', '', '7', '', '9', '', '1'];
  return `<div class="skinpv" data-skin="${id}">${v.map((d, i) => `<i class="${i === 4 ? 'u' : ''}${i === 2 ? ' s' : ''}">${d}</i>`).join('')}</div>`;
}
