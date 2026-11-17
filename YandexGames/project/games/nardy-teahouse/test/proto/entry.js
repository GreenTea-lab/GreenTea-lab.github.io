import { Scene3D } from '../../src/scene3d.js';
import { BOARDS, CHECKERS, DICE } from '../../src/skins.js';
import { newGame } from '../../src/rules.js';
const q = new URLSearchParams(location.search);
const cv = document.getElementById('c');
const sc = new Scene3D(cv, 'high');
sc.setBoardSkin(BOARDS[+q.get('b') || 0]);
sc.setCheckerSkin(CHECKERS[+q.get('c') || 0]);
sc.setDiceSkin(DICE[+q.get('d') || 0]);
const s = newGame(q.get('mode') || 'short');
if (q.get('mid')) { s.n[0][0]=8; s.n[0][3]=2; s.n[0][7]=3; s.n[0][12]=1; s.n[0][19]=1; s.off[0]=0; s.n[1][0]=10; s.n[1][5]=2;s.n[1][9]=3; }
sc.layout(s);
sc.resize(innerWidth, innerHeight, { top: +q.get('it') || 0, bottom: +q.get('ib') || 0, left: 0, right: 0 });
sc.setView(q.get('view') || 'game');
sc.placeDice([5, 3], 0);
if (q.get('hl')) sc.highlight({ targets: ['a10', 'a8'], movable: ['a23', 'a12'], sel: 'a12' });
for (let i = 0; i < 120; i++) sc.update(1 / 30);
sc.render(true);
window.__done = true;
