import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/';
const errs = await run({ w: 1280, h: 720, dpr: 1, pre: `try{localStorage.clear()}catch(e){}`, steps: async (p) => {
  await p.addStyleTag({ content: '#ui{display:none!important}' });
  const cfg = [['evening', 'walnut', 'ebony'], ['autumn', 'lace', 'wood'], ['winter', 'felt', 'gzhel'], ['summer', 'chintz', 'cherry'], ['summer', 'oak', 'jade'], ['evening', 'oilcloth', 'pearl']];
  for (const [pl, tb, sk] of cfg) {
    await p.evaluate(([pl, tb, sk]) => { const g = window.__game; g.applyPlace(pl); g.applyTable(tb); g.applySkin(sk); }, [pl, tb, sk]);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}p_${pl}_${tb}.png` });
  }
}});
done(errs);
