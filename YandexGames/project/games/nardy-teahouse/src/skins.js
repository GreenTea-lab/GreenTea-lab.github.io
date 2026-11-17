// Стили: доски, шашки, кубики. Цены в монетах. Первая позиция в каждом списке бесплатная.
export const BOARDS = [
  { id: 'walnut', price: 0, frame: ['#5b3a22', '#3a2314', '#7a5233'], field: ['#d8b47f', '#b98d55', '#ecd2a2'], pA: '#7b2330', pB: '#3b2618', line: '#d8a845', orn: '#8c2b33', inlay: '#e2bc6a', metal: '#d4a64a' },
  { id: 'mahogany', price: 800, frame: ['#6e2a1b', '#45170e', '#8f4129'], field: ['#e9d0a2', '#cfae78', '#f6e4c0'], pA: '#1f5f5b', pB: '#8b552b', line: '#c9963c', orn: '#1f5f5b', inlay: '#ecc77c', metal: '#d4a64a' },
  { id: 'pearl', price: 1500, frame: ['#2a201b', '#140f0c', '#3d302a'], field: ['#cdbca2', '#b39f81', '#e0d3bd'], pA: '#221a16', pB: '#ede6d6', line: '#b9c0c8', orn: '#4b3a33', inlay: '#e6e2dc', metal: '#c8ced6' },
  { id: 'birch', price: 2500, frame: ['#b37c40', '#8a5a26', '#cf9a5c'], field: ['#f2ddb2', '#dfc08a', '#fbecc9'], pA: '#9c3d24', pB: '#2e4a3a', line: '#7b4a1e', orn: '#9c3d24', inlay: '#5a3a1a', metal: '#b98a3e' },
  { id: 'malachite', price: 4000, frame: ['#2c201a', '#17100c', '#46342a'], field: ['#1f5a46', '#164536', '#2b7059'], pA: '#e6d1a0', pB: '#6d1c22', line: '#e0b24e', orn: '#e0b24e', inlay: '#e0b24e', metal: '#e0b24e', felt: true },
  { id: 'sandal', price: 6000, frame: ['#8d5a33', '#61391c', '#ab7347'], field: ['#edd3a6', '#d6b47e', '#f8e6c4'], pA: '#c4692a', pB: '#563468', line: '#5a2f12', orn: '#563468', inlay: '#f2cf86', metal: '#e0b24e' },
];

// w — светлая сторона (игрок), b — тёмная (соперник). metal — металлический блеск
export const CHECKERS = [
  { id: 'classic', price: 0, w: ['#f2e8d3', '#cdbb98', '#a88f66'], b: ['#2d221c', '#16100c', '#6b5544'] },
  { id: 'amber', price: 600, w: ['#f3b64c', '#c9852a', '#fde3a6'], b: ['#7b1826', '#4d0c15', '#c2505e'] },
  { id: 'jade', price: 1200, w: ['#9cd8b9', '#5ca684', '#e3f5ea'], b: ['#1f2b2b', '#0f1616', '#4d6464'] },
  { id: 'lapis', price: 2000, w: ['#f6f3ee', '#d9d3c8', '#ffffff'], b: ['#22408c', '#132757', '#6d8fd6'], sheen: true },
  { id: 'royal', price: 3500, w: ['#e7c35e', '#b98d2a', '#fff0b5'], b: ['#a3abb5', '#6d7580', '#e9eef4'], metal: true },
  { id: 'honey', price: 5000, w: ['#f7d792', '#d9ab55', '#fff2cf'], b: ['#5b3421', '#331b0f', '#9a6a4d'] },
];

export const DICE = [
  { id: 'bone', price: 0, body: '#f7f0e0', pip: '#2b1a12', edge: '#d9ccb1' },
  { id: 'ruby', price: 400, body: '#b31f30', pip: '#fff1d6', edge: '#7a121e' },
  { id: 'jade', price: 800, body: '#2f8f6f', pip: '#f8efd6', edge: '#1d6650' },
  { id: 'sapphire', price: 1500, body: '#24468f', pip: '#f3c95b', edge: '#152d61' },
  { id: 'gold', price: 2500, body: '#e6bd52', pip: '#4a2a14', edge: '#b88a2a', metal: true },
  { id: 'ebony', price: 4000, body: '#251c17', pip: '#f2d27a', edge: '#110c0a' },
];

export const SKINS = { board: BOARDS, checkers: CHECKERS, dice: DICE };
export const find = (kind, id) => SKINS[kind].find((x) => x.id === id) || SKINS[kind][0];
