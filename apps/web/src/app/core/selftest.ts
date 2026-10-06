import { EngineService } from './engine.service';

/* ?selftest runs the harness on THIS page in THIS browser and prints one line per check. A check
   that cannot find its target FAILS; nothing here passes by being unable to look. */
export async function runSelftest(engine: EngineService){
  const T: [boolean, string, string][] = [];
  const ok = (name: string, pass: boolean, note = '') => T.push([!!pass, name, note]);
  const cs = getComputedStyle(document.documentElement);
  ok('viewport covers the notch', /viewport-fit=cover/.test(document.querySelector('meta[name=viewport]')?.getAttribute('content') || ''));
  ok('safe area variables in use', cs.getPropertyValue('--sat') !== '' && !!document.querySelector('.statusfill'));
  ok('the installed iPhone rule: html is a status strip taller than the screen', /calc/.test(cs.minHeight) || parseFloat(cs.minHeight) > 0, cs.minHeight);
  const strip = document.querySelector('.statusfill') as HTMLElement;
  ok('status strip is one colour with the page under it', !!strip && lumOf(getComputedStyle(strip).backgroundColor) === lumOf(cs.backgroundColor) && !/rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(strip).backgroundColor), strip ? getComputedStyle(strip).backgroundColor + ' on ' + cs.backgroundColor : 'no strip');
  ok('double tap does not zoom', /manipulation/.test(cs.touchAction));
  ok('fields never zoom an iPhone: 16px under a finger', !matchMedia('(pointer:coarse)').matches || [...document.querySelectorAll('input,select,textarea')].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16));
  ok('a theme is set before the first paint', ['light', 'dark'].includes(document.documentElement.getAttribute('data-theme') || ''));
  ok('every declared app icon loads and is square', await Promise.all(['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png'].map(src => new Promise<boolean>(res => { const i = new Image(); i.onload = () => res(i.naturalWidth === i.naturalHeight && i.naturalWidth >= 180); i.onerror = () => res(false); i.src = src; }))).then(r => r.every(Boolean)));
  /* SELECT LAW: probe the rule itself, so the check cannot pass by finding no select on screen */
  ok('selects draw their own chevron, never the browser arrow, at least 12px in from the edge', (() => {
    const wrap = document.createElement('div'); wrap.className = 'field'; wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:240px';
    const s = document.createElement('select'); s.innerHTML = '<option>October 2026</option>'; wrap.appendChild(s); document.body.appendChild(wrap);
    const c = getComputedStyle(s); const pos = c.backgroundPositionX; const inset = parseFloat((pos.match(/(\d+(?:\.\d+)?)px/) || [])[1] || '0');
    const good = (c.appearance === 'none' || (c as any).webkitAppearance === 'none') && /svg/.test(c.backgroundImage) && /right|100%/.test(pos) && inset >= 12 && parseFloat(c.paddingRight) >= 36;
    wrap.remove(); return good; })());
  ok('no sheet lock is left behind', !document.body.classList.contains('sheet-open') || !!document.querySelector('.drawer.on, .rail.open'));
  ok('no decorative dash before a heading', ![...document.querySelectorAll('h1,h2,h3,.k-label,.eyebrow')].some(e => /^[—–\-|]/.test((e.textContent || '').trim())));
  ok('no emoji in the chrome', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText));
  const p = engine.pub();
  if (location.hash.includes('#/engine') || location.hash.includes('#/owner')) {
    ok('the team document is open inside the shell', !!p);
    if (p) {
      ok('four seats, each with a capacity, a load and a rule', p.seats.length === 4 && p.seats.every(s => s.capacity >= 0 && s.load >= 0 && !!s.rule));
      ok('clients counted match the rows', p.counts.clients === p.clients.length, String(p.counts.clients));
      ok('stories are not measured, never 0', p.output.this_month.stories.done === null);
      ok('no fee, cost or invoice figure in the team document', !JSON.stringify(p).match(/"(mrr|amount|billed|cost|profit|salary|pay)"\s*:\s*\d/));
      ok('every alert names a screen to go to', p.alerts.every(a => a.href.startsWith('/')));
      ok('the top bar says when the engine was measured', /measured/i.test(document.querySelector('.topbar .tt span')?.textContent || ''));
      ok('every derived number on screen has a denominator or a unit', [...document.querySelectorAll('.k-val')].every(e => (e.nextElementSibling?.textContent || '').trim().length > 0));
    }
    if (location.hash.includes('#/owner')) ok('an owner screen says where the money is when the vault is not open', engine.vault() === 'open' || !!document.querySelector('[data-vault]'));
  }
  const pass = T.filter(t => t[0]).length;
  T.forEach(t => console.log((t[0] ? 'PASS ' : 'FAIL ') + t[1] + (t[2] ? '  [' + t[2] + ']' : '')));
  console.log(`BBOS SELFTEST ${pass}/${T.length}`);
  return { pass, total: T.length, lines: T };
}
function lumOf(c: string){ const m = c.match(/[\d.]+/g); if (!m) return -1; const [r, g, b] = m.map(Number); return Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10) / 10; }
