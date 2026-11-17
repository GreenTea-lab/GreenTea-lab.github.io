import { drawCity, CITY_IDS } from '../../src/cities.js';
const W = +new URLSearchParams(location.search).get('w') || 640, H = +new URLSearchParams(location.search).get('h') || 360;
document.body.style.margin = 0;
for (const id of CITY_IDS) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.style.cssText = 'display:inline-block;margin:2px'; document.body.appendChild(c); try { drawCity(c.getContext('2d'), id, W, H); } catch (e) { console.log('ERR', id, e.message); } }
window.done = true;
