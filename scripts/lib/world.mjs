/* What every Engine runner shares: a server for the built app and the door walk. The door is WALKED,
   never skipped: the runner types the team passcode from ~/.bb-brain-pass (read, never printed), so
   a broken sign in breaks every run (test-the-door-people-walk-through). */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium, webkit } = require(process.env.HOME + '/bb-systems/batch/node_modules/playwright');
export const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const DIST = path.join(ROOT, 'apps/web/dist/web/browser');
export const FOLDER = 'bb-engine';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
export function serve(dir = DIST, port = 0) {
  const srv = http.createServer((q, r) => {
    q.url = q.url.replace(new RegExp('^/' + FOLDER + '(?=/|$)'), '') || '/';
    let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(f));
  }).listen(port);
  return { srv, base: 'http://127.0.0.1:' + srv.address().port + '/' };
}
export function passcode() { try { return fs.readFileSync(path.join(os.homedir(), '.bb-brain-pass'), 'utf8').trim(); } catch { return ''; } }
export const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
export async function context(browser, { width = 390, height = 844, desk = false, dark = false } = {}) {
  const c = await browser.newContext(desk
    ? { viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' }
    : { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: PHONE_UA, colorScheme: dark ? 'dark' : 'light' });
  try { await c.grantPermissions(['clipboard-read', 'clipboard-write']); } catch {}
  await c.addInitScript(d => { try { if (!localStorage.getItem('hub_theme')) localStorage.setItem('hub_theme', d ? 'dark' : 'light'); } catch (e) {} }, dark);
  return c;
}
/* the door, walked: the passcode, Enter */
export async function signIn(p, base) {
  await p.goto(base); await p.waitForSelector('#pass', { timeout: 15000 });
  await p.fill('#pass', passcode());
  await p.locator('.enter').click();
  await p.waitForFunction(() => /#\/engine\/machine/.test(location.hash), null, { timeout: 30000 });
  await p.waitForSelector('.kpi .card', { timeout: 15000 });
}
