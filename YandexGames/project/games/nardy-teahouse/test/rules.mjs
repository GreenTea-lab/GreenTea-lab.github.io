import { newGame, startTurn, legalSteps, playStep, allTurns, primeViolation, clone } from '../src/rules.js';
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
// длинные: обычный ход — одна шашка с головы
let s = newGame('long');
let t = startTurn(s, 0, 5, 2);
let L = allTurns(clone(s), 0, t.dice, t.head);
ok(L.every((x) => x.steps.filter((st) => st.from === 0).length === 1), 'long: one from head');
ok(L.length === 1, 'long 5-2 first move: single checker to 7 -> ' + L.length);
// первый ход 6-6: две с головы
t = startTurn(s, 0, 6, 6);
L = allTurns(clone(s), 0, t.dice, t.head);
ok(L.length === 1 && L[0].steps.length === 2, '6-6 first: two from head, rest blocked: ' + JSON.stringify(L.map((x) => x.steps)));
t = startTurn(s, 0, 4, 4);
L = allTurns(clone(s), 0, t.dice, t.head);
ok(L.every((x) => x.steps.filter((st) => st.from === 0).length === 2), '4-4 first: two from head ' + L.length);
// второй ход 4-4: одна с головы
s.moved[0] = 1;
t = startTurn(s, 0, 4, 4);
L = allTurns(clone(s), 0, t.dice, t.head);
ok(L.every((x) => x.steps.filter((st) => st.from === 0).length === 1), '4-4 later: one from head');
// заслон из 6
s = newGame('long');
s.n[0][0] = 9; for (const k of [2, 3, 4, 5]) s.n[0][k] = 1; s.n[0][7] = 2;
// чёрные: все на голове (их дорожка 0 = мой пункт 12), впереди заслона (мои 1..6 = их 13..18) никого
s.moved = [1, 1];
t = startTurn(s, 0, 1, 2);
const steps = legalSteps(s, 0, t);
ok(!steps.some((m) => m.from === 0 && m.to === 1) && steps.some((m) => m.from === 0), 'prime of 6 forbidden: ' + JSON.stringify(steps.map((m) => m.from + '>' + m.to)));
// короткие: бар и бой
s = newGame('short');
s.n[1][0] = 1; s.n[1][23 - 20] = 0; // одиночка чёрных
s.bar[0] = 1; s.n[0][0] = 1;
t = startTurn(s, 0, 3, 5);
const st2 = legalSteps(s, 0, t);
ok(st2.every((m) => m.from === -1), 'bar first: ' + JSON.stringify(st2));
