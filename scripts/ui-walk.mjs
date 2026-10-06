#!/usr/bin/env node
/* EVERY SCREEN, MEASURED AND PHOTOGRAPHED. Walks the door, every screen, the client sheet, the filter
   sheet, the rail and the bottom menu at 390, 320 and 1440, in day and in night. The gap audit runs on
   each and a photograph goes to evidence/gallery for a person to LOOK at.
   node scripts/ui-walk.mjs [out-folder]      exits 1 on any fault */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, serve, context, signIn, ROOT, FOLDER } from './lib/world.mjs';
import { AUDIT } from './lib/audit.mjs';
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'evidence/gallery')); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const { srv, base: root } = serve(); const base = root + FOLDER + '/'; const browser = await chromium.launch();
const faults = []; let surfaces = 0; const errors = []; const words = new Set();
async function walk(tag, width, desk, dark) {
  const c = await context(browser, { width, desk, dark }); const p = await c.newPage();
  p.on('pageerror', e => errors.push(tag + ' ' + String(e))); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(tag + ' ' + m.text()); });
  const shoot = width !== 320; let n = 0;
  const see = async name => { await p.waitForTimeout(420); surfaces++;
    const hits = await p.evaluate(AUDIT); hits.forEach(x => faults.push(tag + ' ' + name + ': ' + x));
    (await p.evaluate(() => [...document.body.innerText.split('\n'), ...[...document.querySelectorAll('[placeholder]')].map(e => e.getAttribute('placeholder')), ...[...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'))].map(x => (x || '').replace(/ /g, ' ').trim()).filter(Boolean))).forEach(w => words.add(w));
    if (shoot) await p.screenshot({ path: path.join(OUT, tag + '-' + String(++n).padStart(2, '0') + '-' + name + '.png') }); };
  const tap = s => desk ? p.locator(s).first().click({ timeout: 6000 }) : p.locator(s).first().tap({ timeout: 6000 });
  const step = async (name, fn) => { try { await fn(); } catch (e) { faults.push(tag + ' ' + name + ': COULD NOT WALK: ' + String(e.message).split('\n')[0].slice(0, 140)); await p.screenshot({ path: path.join(OUT, tag + '-STUCK-' + name + '.png') }).catch(() => {}); await p.keyboard.press('Escape').catch(() => {}); } };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(300); };
  const shut = async () => { for (let i = 0; i < 3; i++) { if (!(await p.locator('.drawer.on').count())) break; await p.keyboard.press('Escape'); await p.waitForTimeout(320); } };

  await p.goto(base); await p.waitForSelector('#pass'); await see('door');
  await p.fill('#pass', '0000'); await p.locator('.enter').click(); await p.waitForFunction(() => (document.querySelector('.door .err')?.textContent || '').trim().length > 0, null, { timeout: 20000 }); await see('door-refused');
  await signIn(p, base); await see('machine');
  await step('machine-3d', async () => { await go('#/engine/machine?view=3d'); await p.waitForSelector('.stage'); await p.waitForFunction(() => window.__m3d && window.__m3d.dbg().state !== 'loading', null, { timeout: 30000 }); await see('machine-3d'); });
  for (const s of ['clients', 'capacity', 'output', 'alerts']) { await go('#/engine/' + s); await p.waitForSelector('.page h1'); await see('engine-' + s); }
  await step('output-last', async () => { await go('#/engine/output?m=last'); await p.waitForSelector('.page h1'); await see('output-last-month'); });
  await step('clients-filtered', async () => { await go('#/engine/clients?f=soon'); await p.waitForSelector('.page h1'); await see('clients-ending-soon'); });
  await step('sheet-client', async () => { await go('#/engine/clients'); await tap('[data-act="client-open"]'); await p.waitForSelector('.drawer.on'); await see('sheet-client'); await shut(); });
  if (!desk) {
    await step('sheet-filters', async () => { await go('#/engine/clients'); await tap('[data-act="filter-open"]'); await p.waitForSelector('.drawer.on'); await see('sheet-filters'); await shut(); });
    await go('#/engine/machine');
    await step('rail', async () => { await tap('[data-act="menu"]'); await p.waitForSelector('.rail.open'); await see('rail'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); });
    await step('bottom-menu', async () => { await tap('[data-act="tab-output"]'); await p.waitForSelector('.bm-sub.on'); await see('bottom-menu'); await p.keyboard.press('Escape'); });
  }
  for (const s of ['money', 'people', 'forecast']) { await go('#/owner/' + s); await p.waitForSelector('.page h1'); await see('owner-' + s); }
  await c.close();
}
for (const dark of [false, true]) { const t = dark ? 'night' : 'day';
  await walk('phone390-' + t, 390, false, dark); await walk('phone320-' + t, 320, false, dark); await walk('desk1440-' + t, 1440, true, dark); }
await browser.close(); srv.close();
fs.writeFileSync(path.join(OUT, 'words.txt'), [...words].sort().join('\n') + '\n');
const kind = f => f.replace(/^\S+ /, '').replace(/ "[^"]*"/g, '');
const kinds = [...new Set(faults.map(kind))];
console.log('EVERY SCREEN: ' + surfaces + ' surfaces measured at three widths in day and night. ' + faults.length + ' faults of ' + kinds.length + ' kinds.');
kinds.forEach(k => console.log('   ' + k + '   [' + [...new Set(faults.filter(f => kind(f) === k).map(f => f.split(' ')[0]))].join(',') + ']'));
if (errors.length) { console.log('PAGE ERRORS: ' + errors.length); [...new Set(errors)].slice(0, 8).forEach(e => console.log('   ' + e)); }
console.log('WORDS: ' + words.size + ' different lines a person can read, written to ' + path.join(OUT, 'words.txt'));
console.log((faults.length || errors.length ? 'FAIL' : 'PASS') + '  ' + surfaces + ' surfaces, ' + faults.length + ' faults, ' + errors.length + ' page errors. Photographs in ' + OUT);
process.exit(faults.length || errors.length ? 1 : 0);
