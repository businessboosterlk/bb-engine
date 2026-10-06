#!/usr/bin/env node
/* UI PRECISION for the Engine: every glyph meant to sit in the centre of its shape is measured by its
   INK, in day and night, on a 390px phone at 3x and a 1440px desk at 2x. The measuring lives in
   ~/bb-systems/qa/optical.mjs, one copy for every system. node scripts/ui-precision.mjs  exits 1 on a miss. */
import { report, measure } from '/Users/thulaibhassen/bb-systems/qa/optical.mjs';
import { execFileSync } from 'node:child_process';
import { chromium, serve, context, signIn, FOLDER } from './lib/world.mjs';
const TOL = 0.5;
const { srv, base: root } = serve(); const base = root + FOLDER + '/'; const b = await chromium.launch(); let bad = 0, total = 0; const out = [];
for (const s of ['icon-centre.mjs', 'build-icons.mjs']) {
  try { out.push(execFileSync('node', [new URL('./' + s, import.meta.url).pathname, '--check'], { encoding: 'utf8' }).trim()); }
  catch (e) { out.push(String(e.stdout || e.stderr || e.message).trim()); bad++; }
  total++;
}
{ const p = await (await b.newContext({ deviceScaleFactor: 3 })).newPage();
  const fx = shift => `<div style="width:120px;height:120px;border-radius:50%;background:#16161a;display:grid;place-items:center;margin:20px"><div style="width:30px;height:30px;background:#c9dd2b;transform:translate(0,${shift}px)"></div></div>`;
  await p.setContent(`<body style="margin:0;background:#fff"><div id="a">${fx(0)}</div><div id="b">${fx(3)}</div></body>`);
  const a = await measure(p, '#a > div', { shape: 'circle', inset: 6 }), m = await measure(p, '#b > div', { shape: 'circle', inset: 6 });
  const ok = Math.abs(a.dy) < .2 && Math.abs(m.dy - 3) < .2;
  out.push(`${ok ? 'PASS' : 'FAIL'}  the check itself: centred reads ${a.dy}, moved 3px reads ${m.dy}`); if (!ok) bad++; total++;
  await p.context().close(); }
/* the icon itself, not the button: the active screen's dot under the icon is ink too, and it sits below on purpose */
const tabs = [0, 1, 2, 3, 4].map(i => ({ name: `tab bar icon ${i + 1}`, sel: '.bm-btn bb-icon', index: i, inset: 0, desk: false }));
const plan = [
  ['/engine/machine', [
    { name: 'the number on the centre of a capacity ring', sel: '.seat bb-ring .ring', inset: 10, shape: 'circle', text: true },
    { name: 'the alert icon in its tile', sel: '.list .li .ic', index: 0, inset: 2 },
    { name: 'the one letter on the rail avatar', sel: '.r-foot .avatar', inset: 2, shape: 'circle', text: true, desk: true },
    { name: 'the B on the rail mark', sel: '.r-mono', inset: 1, text: true, desk: true },
    ...tabs ]],
  ['/engine/machine?view=3d', [ { name: 'the words on the centre of a gear label', sel: '.lbl', index: 0, inset: 2, text: true, baseline: true, open: async p => { await p.waitForFunction(() => window.__m3d && window.__m3d.dbg().state === 'ready', null, { timeout: 30000 }); } } ]],
  ['/engine/capacity', [ { name: 'the number on a capacity ring, capacity screen', sel: '.seat .top bb-ring .ring', inset: 12, shape: 'circle', text: true }, { name: 'a letter on a person\'s avatar', sel: '.people .avatar', index: 0, inset: 2, shape: 'circle', text: true } ]],
  ['/engine/clients', [ { name: 'the search icon in its field', sel: '.fb-q bb-icon', inset: 1 }, { name: 'a client\'s initial on its avatar', sel: '.card .avatar', index: 0, inset: 2, shape: 'circle', text: true } ]],
];
for (const [tag, opt] of [['phone', {}], ['desk', { desk: true, width: 1440 }]]) for (const dark of [false, true]) {
  const c = await context(b, { ...opt, dark }); const p = await c.newPage(); await signIn(p, base);
  for (const [hash, items] of plan) {
    await p.evaluate(h => { location.hash = h; }, '#' + hash); await p.waitForTimeout(500);
    for (const it of items) if (it.open) { await it.open(p); break; }
    for (const it of items) {
      if (it.desk === true && !opt.desk) continue; if (it.desk === false && opt.desk) continue;
      if (!(await p.locator(it.sel).count())) { out.push(`FAIL  ${tag} ${dark ? 'night' : 'day'} ${hash} · ${it.name}: nothing found at ${it.sel}`); bad++; total++; continue; }
      const el = p.locator(it.sel).nth(it.index || 0); await el.evaluate(n => n.scrollIntoView({ block: 'center' })).catch(() => {}); await p.waitForTimeout(150);
      if (!(await el.isVisible())) { out.push(`FAIL  ${tag} ${dark ? 'night' : 'day'} ${hash} · ${it.name}: ${it.sel} is on the page but not visible`); bad++; total++; continue; }
      const r = await report(p, [{ ...it, name: `${tag} ${dark ? 'night' : 'day'} ${hash} · ${it.name}` }], TOL); out.push(...r.rows); bad += r.bad; total++;
    }
  }
  await c.close();
}
await b.close(); srv.close();
out.forEach(l => console.log(l));
console.log(bad ? `RESULT: ${bad} of ${total} readings miss` : `RESULT: ALL ${total} PRECISION READINGS PASS`); process.exit(bad ? 1 : 0);
