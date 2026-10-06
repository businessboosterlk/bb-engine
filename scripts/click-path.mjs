#!/usr/bin/env node
/* CLICK PATH. Every action the Engine can take is COUNTED from the source, every one is PRESSED by a
   real tap or click in a real browser, and the ones never pressed are NAMED. After every sheet: Back
   once closes it and leaves the screen where it was, Back twice leaves the screen. The question after
   each press is bb-click-path's: is the screen in the state the label promised?
     node scripts/click-path.mjs        exits 1 on any action not pressed or any promise not kept */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, serve, context, signIn, ROOT, FOLDER, passcode } from './lib/world.mjs';

/* ── 1. COUNT, from the source ── */
const SRC = path.join(ROOT, 'apps/web/src/app');
const files = (d => { const out = []; const walk = x => fs.readdirSync(x, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(x, e.name)) : /\.ts$/.test(e.name) && !/generated|selftest/.test(e.name) && out.push(path.join(x, e.name))); walk(d); return out; })(SRC);
const src = Object.fromEntries(files.map(f => [path.relative(SRC, f), fs.readFileSync(f, 'utf8')]));
const ALL = new Set();
Object.values(src).forEach(s => [...s.matchAll(/data-act="([a-z0-9-]+)"/g)].forEach(m => ALL.add(m[1])));
const shell = src['shell/shell.component.ts'];
[...shell.matchAll(/\{ path: '([a-z]+)', label:/g)].map(m => m[1]).forEach(p => { ALL.add('rail-' + p); ALL.add('tab-' + p); });
['engine', 'owner'].forEach(g => ALL.add('rail-group-' + g));
[...shell.matchAll(/\{ id: '([a-z0-9-]+)', label:/g)].forEach(m => ALL.add('menu-' + m[1]));
[...src['pages/engine/clients.component.ts'].matchAll(/\{ key: '([a-z]+)', label: '[^']+', all:/g)].forEach(m => { ALL.add('filter-' + m[1]); ALL.add('filter-sheet-' + m[1]); });
[...src['pages/engine/clients.component.ts'].matchAll(/\{ key: '([a-z]+)', label: '[^']+'(?:, num: true)? \}/g)].forEach(m => ALL.add('sort-' + m[1]));
['smm', 'design', 'edit', 'shoot'].forEach(k => { ALL.add('seat-' + k); ALL.add('gear-' + k); });
/* owner-only actions need the vault open; on this Mac it is held, so they are counted as known-unreachable, not as pressed */
const OWNER_ONLY = new Set(['menu-money-lock', 'forecast-path', 'forecast-add', 'menu-forecast-today', 'menu-forecast-one', 'menu-forecast-seven', 'vault-open']);
/* reachable only with more rows than the roster has today: named, so the day it appears it is pressed */
const UNREACHABLE = { 'show-more': 'the list window is 30 and BB has fewer clients than that' };
const unnamed = [];
Object.entries(src).forEach(([f, s]) => [...s.matchAll(/<(button|a|tr|select)\b[^>]*?(?:\(click\)=|\(change\)=|\(ngModelChange\)=|routerLink|\[href\]|href=)[^>]*>/g)].forEach(m => { if (!/data-act/.test(m[0])) unnamed.push(f + ': ' + m[0].slice(0, 90)); }));

/* ── 2. PRESS ── */
const results = []; const pressed = new Set(); const errors = [];
const check = (name, pass, saw) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (saw !== undefined ? '  [saw: ' + (typeof saw === 'string' ? saw : JSON.stringify(saw)) + ']' : '')); };
const { srv, base: root } = serve(); const base = root + FOLDER + '/'; const browser = await chromium.launch();
async function world(desk) {
  const c = await context(browser, { width: desk ? 1440 : 390, desk });
  await c.exposeBinding('__pressed', (s, a) => { pressed.add(a); });
  await c.addInitScript(() => { const rec = e => { const el = e.target && e.target.closest && e.target.closest('[data-act]'); if (el && window.__pressed) window.__pressed(el.dataset.act); }; document.addEventListener('click', rec, true); document.addEventListener('change', rec, true); });
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text()); });
  const settle = (ms = 400) => p.waitForTimeout(ms);
  const state = () => p.evaluate(() => ({ hash: location.hash.split('?')[0], q: location.hash.split('?')[1] || '', sheets: document.querySelectorAll('.drawer.on').length, locked: document.body.classList.contains('sheet-open'), rail: !!document.querySelector('.rail.open'), menu: !!document.querySelector('.bm-sub.on') }));
  const loc = (act, scope) => p.locator((scope ? scope + ' ' : '') + '[data-act="' + act + '"]:visible');
  const press = async (act, { scope = '', nth = 0, wait = 400 } = {}) => { const el = loc(act, scope).nth(nth); await el.waitFor({ state: 'visible', timeout: 8000 }); await el.evaluate(n => n.scrollIntoView({ block: 'center', inline: 'center' })); await p.waitForTimeout(60); desk ? await el.click({ timeout: 6000 }) : await el.tap({ timeout: 6000 }); await settle(wait); };
  const pick = async (act, value, scope = '') => { const el = loc(act, scope).first(); await el.waitFor({ state: 'visible', timeout: 6000 }); await el.selectOption(value); await settle(); };
  const back = async () => { await p.evaluate(() => history.back()); await settle(450); };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await settle(420); };
  const flow = async (name, fn) => { try { await fn(); } catch (e) { check('flow "' + name + '" could be walked to its end', false, String(e.message).split('\n').slice(0, 2).join(' | ').slice(0, 240)); await p.keyboard.press('Escape').catch(() => {}); await settle(); } };
  const sheetBack = async (name, from, screen, open) => flow(name, async () => {
    await go(from); await go(screen); const before = await state(); await open(); const o = await state();
    check(name + ': the sheet opens and the page behind is held', o.sheets === 1 && o.locked, o);
    await back(); const a = await state(); check(name + ': Back once closes the sheet and the screen stays', a.sheets === 0 && !a.locked && a.hash === before.hash, a);
    await back(); const b = await state(); check(name + ': Back twice leaves the screen for the one before', b.hash === from.split('?')[0] && b.sheets === 0, b);
  });
  return { c, p, press, pick, back, go, state, flow, sheetBack, settle, loc };
}

/* ═══ PHONE ═══ */
{ const w = await world(false); const { p, press, pick, back, go, state, flow, sheetBack, settle, loc } = w;
  await flow('the door', async () => {
    await p.goto(base); await p.waitForSelector('#pass'); await p.fill('#pass', '0000'); await press('enter', { wait: 1500 });
    const msg = await p.locator('.door .err').textContent().catch(() => '');
    const order = await p.evaluate(() => { const e = document.querySelector('.door .err'), b = document.querySelector('.door .enter'); return !!e && !!b && e.getBoundingClientRect().bottom <= b.getBoundingClientRect().top; });
    check('door: a wrong passcode is refused in words, above the button they explain', /did not open/.test(msg || '') && order && /#\/login/.test(p.url()), msg);
    await p.fill('#pass', passcode()); await press('enter', { wait: 2500 });
    check('door: the team passcode opens the machine', (await state()).hash === '#/engine/machine', (await state()).hash);
  });
  await flow('the machine', async () => {
    for (const [act, hash] of [['kpi-clients', '#/engine/clients'], ['kpi-capacity', '#/engine/capacity'], ['kpi-videos', '#/engine/output'], ['kpi-posts', '#/engine/output'], ['see-capacity', '#/engine/capacity'], ['see-alerts', '#/engine/alerts']]) {
      await go('#/engine/machine'); await press(act); const a = await state(); await back(); const b = await state();
      check('machine: ' + act + ' opens ' + hash + ' and Back returns', a.hash === hash && b.hash === '#/engine/machine', [a.hash, b.hash]); }
    let s;
    for (const k of ['smm', 'design', 'edit', 'shoot']) { await go('#/engine/machine'); await press('seat-' + k); s = await state(); check('machine: the ' + k + ' ring opens capacity at that seat', s.hash.startsWith('#/engine/capacity') && new RegExp('#' + k + '$').test(p.url()), p.url()); }
    await go('#/engine/machine'); if (await loc('alert-open').count()) { await press('alert-open'); s = await state(); check('machine: an alert opens the screen it names', /#\/engine\//.test(s.hash) && !s.hash.startsWith('#/engine/machine'), s.hash); await p.keyboard.press('Escape').catch(() => {}); }
    await go('#/engine/machine'); if (await loc('renewal-open').count()) { await press('renewal-open'); s = await state(); const open = await p.locator('.drawer.on').count(); check('machine: a renewal opens that client\'s sheet', s.hash.startsWith('#/engine/clients') && open === 1, [s.hash, open]); await p.keyboard.press('Escape'); await settle(); }
    await go('#/engine/machine'); await press('machine-view-3d', { wait: 600 }); s = await state(); check('machine: See it in 3D turns the layer on in the address', /view=3d/.test(s.q), s.q);
    await p.waitForFunction(() => window.__m3d && window.__m3d.dbg().state !== 'loading', null, { timeout: 30000 });
    const d0 = await p.evaluate(() => window.__m3d.dbg());
    check('3D: the engine starts and draws every seat as a gear', d0.state === 'ready' && d0.gears === 4 && d0.lit === 4, d0);
    const home = await p.evaluate(() => { const d = window.__m3d.step(3); return { cam: d.camera, home: d.home.pos }; });
    check('3D: HOME, the camera rests exactly on the home framing', home.cam.every((v, i) => Math.abs(v - home.home[i]) < .01), home);
    await press('gear-edit', { wait: 100 }); const d1 = await p.evaluate(() => window.__m3d.step(90));
    check('3D: SELECT dims the rest and settles the camera on the chosen gear', d1.selected === 'edit' && d1.lit === 1 && d1.dimmed === 3 && !d1.tweening, d1);
    await press('gear-smm', { wait: 100 }); const d2 = await p.evaluate(() => window.__m3d.step(90));
    check('3D: THE SWITCH, selecting another gear while one is open works in one motion', d2.selected === 'smm' && d2.lit === 1 && !d2.tweening, d2);
    await press('gear-reset', { wait: 100 }); const d3 = await p.evaluate(() => window.__m3d.step(90));
    check('3D: RESET returns every gear and the camera home exactly', d3.selected === null && d3.lit === 4 && d3.camera.every((v, i) => Math.abs(v - d3.home.pos[i]) < .01), d3);
    for (const k of ['design', 'shoot']) await press('gear-' + k, { wait: 100 });
    await press('gear-smm', { wait: 100 }); await press('gear-open'); s = await state(); check('3D: Open the seat lands on capacity', s.hash.startsWith('#/engine/capacity'), s.hash);
    await go('#/engine/machine?view=3d'); await p.waitForFunction(() => window.__m3d && window.__m3d.dbg().state === 'ready', null, { timeout: 30000 }); await press('gear-home'); await press('machine-view-3d', { wait: 600 }); s = await state(); check('machine: Flat view takes the layer off', !/view=3d/.test(s.q), s.q);
  });
  await flow('clients', async () => {
    await go('#/engine/clients'); await press('clients-copy'); check('clients: Copy as text says Copied', /Copied/.test(await loc('clients-copy').textContent()));
    await sheetBack('client sheet', '#/engine/machine', '#/engine/clients', () => press('client-open'));
    await sheetBack('filter sheet', '#/engine/machine', '#/engine/clients', () => press('filter-open'));
    await go('#/engine/clients'); await press('filter-open'); await pick('filter-sheet-ends', 'soon'); const n = await p.locator('.drawer.on [data-act="filter-show"]').textContent(); await press('filter-show'); const rows = await p.locator('.list.phone .li').count();
    check('clients: the filter sheet shows the count it promised', new RegExp('^Show ' + rows + ' ').test(n.trim()), [n.trim(), rows]);
    await press('filter-open'); await pick('filter-sheet-smm', { index: 1 }); await pick('filter-sheet-package', { index: 1 }); await press('filter-clear-all'); await p.keyboard.press('Escape'); await settle();
    await go('#/engine/clients'); await p.fill('[data-act="filter-open"] ~ input, .fb-q input', 'zzzz'); await settle(); check('clients: a search with no match shows the empty state, not a blank table', (await p.locator('.empty').count()) === 1); await p.fill('.fb-q input', ''); await settle();
  });
  await flow('output and alerts', async () => {
    await go('#/engine/output'); await press('output-last'); let s = await state(); check('output: Last month switches the month in the address and marks itself pressed', /m=last/.test(s.q) && (await loc('output-last').getAttribute('aria-pressed')) === 'true', s.q);
    await press('output-this'); s = await state(); check('output: This month switches back', /m=this/.test(s.q), s.q);
    await go('#/engine/alerts'); if (await loc('alert-open').count()) { await press('alert-open'); s = await state(); check('alerts: an alert opens the screen it names', s.hash !== '#/engine/alerts', s.hash); await back(); }
    await go('#/engine/alerts'); check('alerts: the money note is there while the vault is shut', (await loc('alerts-money').count()) === 1);
    await press('alerts-money'); s = await state(); check('alerts: the money note opens the owner screen, which says where the money is', s.hash === '#/owner/money' && (await p.locator('[data-vault]').count()) === 1, s.hash);
    for (const k of ['people', 'forecast', 'money']) { await press('tab-' + k); s = await state(); check('tab bar, owner: ' + k + ' goes there', s.hash === '#/owner/' + k, s.hash); if (s.menu) await p.keyboard.press('Escape'); }
  });
  await flow('the shell', async () => {
    await go('#/engine/machine'); await press('menu'); let s = await state(); check('menu: the rail opens and the page behind is held', s.rail && s.locked, s);
    const exp = () => loc('rail-group-owner').getAttribute('aria-expanded'); const e0 = await exp(); await press('rail-group-owner'); const e1 = await exp();
    check('rail: the Owner group unfolds and says so', e0 === 'false' && e1 === 'true', [e0, e1]);
    await press('rail-group-engine'); await press('rail-group-engine'); await press('rail-theme'); await press('rail-theme');
    for (const k of ['money', 'people', 'forecast']) { if (!(await state()).rail) await press('menu'); await press('rail-' + k); s = await state(); check('rail: ' + k + ' goes there, closes the rail and lets the page go', s.hash === '#/owner/' + k && !s.rail && !s.locked, s); }
    for (const k of ['machine', 'clients', 'capacity', 'output', 'alerts']) { await press('menu'); if (k === 'machine') { await press('rail-group-engine'); } await press('rail-' + k); s = await state(); check('rail: ' + k + ' goes there, closes the rail and lets the page go', s.hash === '#/engine/' + k && !s.rail && !s.locked, s); }
    const cur = await loc('tab-alerts').getAttribute('aria-current'); check('tab bar: the current screen is marked for a screen reader', cur === 'page', cur);
    await press('tab-output'); s = await state(); check('tab bar: a tap on Output goes there AND opens its quick actions', s.hash === '#/engine/output' && s.menu, s);
    await press('menu-output-last'); s = await state(); check('quick action: Last month lands in the address', /m=last/.test(s.q) && !s.menu, s);
    await press('tab-output'); await press('menu-output-this'); await press('tab-clients'); await press('menu-clients-soon'); s = await state(); check('quick action: Ending in 60 days filters the list', /f=soon/.test(s.q), s.q);
    await press('tab-clients'); await press('menu-clients-all'); await press('tab-machine'); await press('menu-machine-alerts'); s = await state(); check('quick action: Alerts from the machine menu lands on alerts', s.hash === '#/engine/alerts', s.hash);
    await press('tab-machine'); await press('menu-machine-3d', { wait: 600 }); s = await state(); check('quick action: See it in 3D lands on the machine with the layer on', s.hash === '#/engine/machine' && /view=3d/.test(s.q), s);
    await press('tab-machine'); await press('menu-machine-flat', { wait: 600 }); await press('tab-capacity'); await press('tab-alerts');
    await press('menu'); await press('rail-home'); s = await state(); check('rail: Business Booster goes home to the machine', s.hash === '#/engine/machine' && !s.locked, s);
    await press('theme'); const ap = await loc('theme').getAttribute('aria-pressed'); await press('theme'); check('top bar: the theme button says which theme is on', ap === 'true' || ap === 'false', ap);
    await press('menu'); await press('rail-sign-out', { wait: 700 }); s = await state(); const kept = await p.evaluate(() => !!localStorage.getItem('eng_key')); check('rail: Sign out lands on the door and the key is gone from the device', s.hash === '#/login' && !kept, [s.hash, kept]);
  });
  await w.c.close(); }

/* ═══ DESK ═══ */
{ const w = await world(true); const { p, press, back, go, state, flow, loc } = w;
  await signIn(p, base);
  await flow('desk sorting and sheets', async () => {
    await go('#/engine/clients'); await press('sort-renewal'); const a = await loc('sort-renewal').getAttribute('aria-sort'); await press('sort-renewal'); const b = await loc('sort-renewal').getAttribute('aria-sort');
    check('clients: a column sorts one way, then the other, and says so', a === 'ascending' && b === 'descending', [a, b]);
    for (const k of ['name', 'smm', 'posts', 'done']) await press('sort-' + k);
    await press('client-open'); let s = await state(); check('clients: a row opens its sheet', s.sheets === 1, s); await press('sheet-close'); s = await state(); check('clients: the close button closes it and lets the page go', s.sheets === 0 && !s.locked, s);
    await press('filter-smm'); await p.locator('[data-act="filter-smm"]:visible').first().selectOption({ index: 1 }); await p.waitForTimeout(300); check('clients: a desk filter narrows the list and Clear appears', (await loc('filter-clear').count()) === 1); await press('filter-clear');
    await press('filter-ends'); await press('filter-package');
    await go('#/engine/clients'); await press('clients-print', { wait: 200 });
    await go('#/engine/machine'); await press('see-capacity'); s = await state(); check('desk: links work by click as well', s.hash === '#/engine/capacity', s.hash); await back();
    await go('#/owner/money'); check('owner: the money screen says where the money is', (await p.locator('[data-vault]').count()) === 1);
    if (await loc('vault-open').count()) { await p.fill('#vpass', 'wrong words here'); await press('vault-open', { wait: 1200 }); check('owner: a wrong phrase is refused in words', /did not open/.test(await p.locator('.lockcard .err').textContent())); }
    await press('rail-sign-out', { wait: 700 });
  });
  await w.c.close(); }

await browser.close(); srv.close();
/* ── 3. THE ONES NEVER PRESSED ── */
const never = [...ALL].filter(a => !pressed.has(a) && !OWNER_ONLY.has(a) && !UNREACHABLE[a]).sort();
Object.entries(UNREACHABLE).forEach(([a, why]) => console.log('SKIP ' + a + ': ' + why));
check('every action in the source was pressed', never.length === 0, never.length ? never.length + ' never pressed: ' + never.join(', ') : ALL.size + ' actions, ' + pressed.size + ' pressed');
check('nothing a finger can press goes unnamed', unnamed.length === 0, unnamed.length ? unnamed.slice(0, 5).join(' || ') : 'every acting tag carries data-act');
check('no page error during the walk', errors.length === 0, [...new Set(errors)].slice(0, 3));
const bad = results.filter(r => !r.pass);
console.log(`\nCLICK PATH: ${results.length - bad.length} of ${results.length} promises kept · ${ALL.size} actions counted, ${pressed.size} pressed` + (OWNER_ONLY.size ? `, ${OWNER_ONLY.size} owner-only skipped while the vault is held` : ''));
process.exit(bad.length ? 1 : 0);
