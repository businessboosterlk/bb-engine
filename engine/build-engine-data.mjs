#!/usr/bin/env node
/* BUILD THE ENGINE'S DATA. Reads the Command Centre, computes the two documents, seals them and
   writes them where the app reads them. Run by hand or nightly from bb-end.sh.
     node engine/build-engine-data.mjs            live read, seal, write
     node engine/build-engine-data.mjs --selftest  re-adds every total from the rows and proves the lock
   TEAM document  -> apps/web/public/data/engine.enc.json, under the team passcode (~/.bb-brain-pass)
   OWNER document -> apps/web/public/data/vault.enc.json, ONLY under a strong phrase
                     (~/.bb-brain-pass if lock-policy calls it strong, else ~/.bb-brain-vault-pass),
                     otherwise null and the money stays on this Mac in engine/local/.
   A build that cannot seal must FAIL, not shrug (the Brain's 23 silent days, 23 Aug 2026). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pull, today, prev2 } from './fetch.mjs';
import { compute, sum } from './compute.mjs';
import { seal, unseal, strength, readPhrase } from './seal.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const OUT = path.join(ROOT, 'apps/web/public/data');
const LOCAL = path.join(HERE, 'local');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(LOCAL, { recursive: true });
const rules = JSON.parse(fs.readFileSync(path.join(HERE, 'rules.json'), 'utf8'));
let forecast = null; try { forecast = JSON.parse(fs.readFileSync(path.join(HERE, 'forecast.json'), 'utf8')); } catch { console.log('no forecast.json yet: run python3 ~/bb-consultancy/finance/export_engine_forecast.py'); }

const now = new Date(Date.now() + 5.5 * 3600e3); const nowIso = now.toISOString().replace('Z', '+05:30');
const ym = today().slice(0, 7), prev = prev2(ym);
const raw = await pull(ym, prev);
const { pub, owner } = compute(raw, rules, forecast, ym, prev, nowIso);

/* ---- self test: every total re-added from the rows it came from, and the lock proven both ways ---- */
const checks = [];
const ok = (name, pass, saw) => checks.push([pass, name, saw]);
ok('clients counted equal the active rows with a fee', pub.counts.clients === raw.clients.filter(c => (c.mrr || 0) > 0).length, pub.counts.clients);
ok('MRR is the sum of every client fee', owner.mrr === raw.clients.filter(c => (c.mrr || 0) > 0).reduce((a, c) => a + c.mrr, 0), owner.mrr);
ok('this month cost total equals the sum of its lines', owner.costs.total === owner.costs.lines.reduce((a, l) => a + l.amount, 0), owner.costs.total);
ok('cost categories add up to the total', Object.values(owner.costs.by_category).reduce((a, b) => a + b, 0) === owner.costs.total);
ok('billed equals paid plus unpaid', owner.invoices.billed === owner.invoices.paid + owner.invoices.unpaid, owner.invoices.billed);
ok('profit is billed less cost', owner.profit === owner.invoices.billed - owner.costs.total, owner.profit);
ok('video demand equals the sum of monthly_videos', pub.counts.videos === sum(raw.clients.filter(c => c.mrr > 0), 'monthly_videos'), pub.counts.videos);
ok('every seat has a capacity, a load and a rule', pub.seats.every(s => s.capacity >= 0 && s.load >= 0 && s.rule), pub.seats.map(s => s.key + ':' + s.pct));
ok('this month videos done plus open equal the rows in the system', pub.output.this_month.videos.done + pub.output.this_month.videos.open === pub.output.this_month.videos.in_system);
ok('stories are not measured, never 0', pub.output.this_month.stories.done === null);
ok('no fee, cost or invoice figure in the team document', !JSON.stringify(pub).match(/"(mrr|amount|billed|cost|profit|salary|pay)"\s*:\s*\d/));
const probe = seal({ a: 1 }, 'copper lantern river monsoon kite'); let opened = null, wrong = null;
try { opened = unseal(probe, 'copper lantern river monsoon kite'); } catch {} try { wrong = unseal(probe, 'copper lantern river monsoon bike'); } catch (e) { wrong = 'refused'; }
ok('the lock opens with its phrase and refuses one letter off', opened && opened.a === 1 && wrong === 'refused');
if (forecast) ok('forecast carries the nine scenarios', Object.keys(forecast.scenarios || {}).length === 9);
const bad = checks.filter(c => !c[0]);
checks.forEach(c => console.log((c[0] ? 'PASS ' : 'FAIL ') + c[1] + (c[2] !== undefined ? '  [' + JSON.stringify(c[2]) + ']' : '')));
console.log(`SELFTEST: ${checks.length - bad.length} of ${checks.length} pass`);
if (bad.length) { console.error('REFUSING TO WRITE: a total does not re-add'); process.exit(1); }
if (process.argv.includes('--selftest')) process.exit(0);

/* ---- write: plain copies stay LOCAL (gitignored), sealed copies go to the app ---- */
fs.writeFileSync(path.join(LOCAL, 'engine.json'), JSON.stringify(pub, null, 1));
fs.writeFileSync(path.join(LOCAL, 'owner.json'), JSON.stringify(owner, null, 1));
const teamPass = process.env.BB_PASS || readPhrase('.bb-brain-pass');
if (!teamPass || teamPass.length < 8) { console.error('ENCRYPTION FAILED: no team passcode in ~/.bb-brain-pass. The live Engine is NOT updated.'); process.exit(1); }
let ownerPhrase = strength(teamPass).strong ? teamPass : null;
if (!ownerPhrase) { const vp = process.env.BB_VAULT_PASS || readPhrase('.bb-brain-vault-pass'); if (vp && strength(vp).strong) ownerPhrase = vp; }
pub.vault = { state: ownerPhrase ? 'sealed' : 'held', lock: strength(teamPass).klass };
fs.writeFileSync(path.join(OUT, 'engine.enc.json'), JSON.stringify(seal(pub, teamPass)));
fs.writeFileSync(path.join(OUT, 'vault.enc.json'), ownerPhrase ? JSON.stringify(seal(owner, ownerPhrase)) : 'null');
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ generated: nowIso, vault: pub.vault.state, month: pub.month.label }));
console.log(`wrote ${OUT}/engine.enc.json (${Math.round(fs.statSync(path.join(OUT, 'engine.enc.json')).size / 1024)}KB, ${pub.counts.clients} clients, ${pub.alerts.length} alerts) · vault ${pub.vault.state}` + (ownerPhrase ? '' : ': money stays on this Mac until ~/.bb-brain-vault-pass holds a strong phrase (five random words)'));
if (raw.gaps.length) console.log('data gaps: ' + raw.gaps.join(' | '));
