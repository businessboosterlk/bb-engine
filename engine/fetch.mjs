/* READS from the Command Centre's database over PostgREST. Two keys:
     the public anon key (every BB front end ships it) for the tables with anon SELECT;
     the service key, if ~/.bb-secrets/engine.env holds BB_SUPABASE_SERVICE, for costs, invoices and
     pipeline, which are authenticated-only (pg_policies, read 6 Oct 2026).
   With no service key the money tables come from engine/local/money-snapshot.json, taken by hand
   from the database, and the document says so. A table that refuses is a data gap, never a crash.
   THE DATABASE HANDS OVER 1,000 ROWS AT MOST AND SAYS NOTHING: every read pages by Range.
   NEVER select image_url: graphic_projects carries base64 pictures and select=* times out. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function env() {
  const out = { ...process.env };
  try { for (const line of fs.readFileSync(path.join(os.homedir(), '.bb-secrets', 'engine.env'), 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !out[m[1]]) out[m[1]] = m[2].trim(); } } catch {}
  if (!out.BB_SUPABASE_URL || !out.BB_SUPABASE_ANON) throw new Error('engine.env needs BB_SUPABASE_URL and BB_SUPABASE_ANON');
  return out;
}
const PAGE = 1000;
const COLS = {
  graphic_projects: 'id,title,type,client_id,client_name,assigned_designer_id,assigned_designer,current_stage,priority,deadline,is_archived,target_month,target_year,completed_at,created_at,updated_at',
  video_projects: 'id,client_id,shoot_id,title,current_stage,assigned_editor_id,priority,deadline,completed_at,is_archived,type,target_month,target_year,created_at,updated_at',
  clients: 'id,name,package,mrr,health,industry,start_date,renewal,notes,client_type,assigned_smm,monthly_posts,monthly_videos,monthly_stories,status,ended_on',
};
export async function table(name, query = '', { order = 'id', key = 'anon' } = {}) {
  const e = env(); const rows = []; const gaps = [];
  const k = key === 'service' ? e.BB_SUPABASE_SERVICE : e.BB_SUPABASE_ANON;
  if (!k) return { rows, gaps: [`${name}: needs the service key (BB_SUPABASE_SERVICE in ~/.bb-secrets/engine.env)`], denied: true };
  for (let from = 0; ; from += PAGE) {
    const url = `${e.BB_SUPABASE_URL}/rest/v1/${name}?select=${COLS[name] || '*'}${query ? '&' + query : ''}&order=${order}`;
    const r = await fetch(url, { headers: { apikey: k, Authorization: 'Bearer ' + k, Range: `${from}-${from + PAGE - 1}` } });
    if (!r.ok) { gaps.push(`${name}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`); return { rows, gaps }; }
    const page = await r.json(); rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { rows, gaps };
}
/* what the Engine needs, in one pass. ym: the month being measured, as 'YYYY-MM' */
export async function pull(ym, prev) {
  const e = env(); const [y, m] = ym.split('-').map(Number); const [py, pm] = prev.split('-').map(Number);
  const months = [prev, ym, next(ym), next(next(ym))];
  const svc = e.BB_SUPABASE_SERVICE ? 'service' : 'anon';
  const reads = {
    clients: table('clients', 'status=eq.active'),
    team: table('team_members', 'active=eq.true'),
    videos: table('video_projects', `or=(and(target_year.eq.${y},target_month.eq.${m}),and(target_year.eq.${py},target_month.eq.${pm}))&is_archived=not.is.true`),
    graphics: table('graphic_projects', `or=(and(target_year.eq.${y},target_month.eq.${m}),and(target_year.eq.${py},target_month.eq.${pm}))&is_archived=not.is.true`),
    shoots: table('smm_shoots', `shoot_date=gte.${prev}-01`, { order: 'shoot_date' }),
    pipeline: table('pipeline', 'archived_at=is.null', { key: svc }),
    costs: table('costs', `month=in.(${months.join(',')})`, { key: svc }),
    invoices: table('invoices', `month=in.(${[prev2(prev), prev, ym].join(',')})`, { key: svc }),
    lateVideos: table('video_projects', `deadline=lt.${today()}&current_stage=neq.add_to_drive&is_archived=not.is.true`),
  };
  const out = {}; const gaps = []; out.money_source = 'live';
  for (const [k, p] of Object.entries(reads)) { const r = await p; out[k] = r.rows; gaps.push(...r.gaps); }
  /* no service key: the money tables answer nothing to the public key, so the hand-taken snapshot stands in */
  if (svc === 'anon') {
    try {
      const snap = JSON.parse(fs.readFileSync(path.join(HERE, 'local', 'money-snapshot.json'), 'utf8'));
      out.costs = snap.costs.filter(c => months.includes(c.month)); out.invoices = snap.invoices.filter(i => [prev2(prev), prev, ym].includes(i.month));
      out.money_source = 'snapshot ' + String(snap.taken).slice(0, 16).replace('T', ' ');
      out.gaps_money = `costs and invoices are from a snapshot taken ${out.money_source.slice(9)}; the live read needs the service key`;
    } catch { out.gaps_money = 'costs and invoices could not be read: no service key and no snapshot'; }
    if (!out.pipeline.length) out.gaps_pipeline = 'pipeline is authenticated-only; counts need the service key';
  }
  out.gaps = gaps.filter(g => !/needs the service key/.test(g)); return out;
}
export function today() { return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); }
export function next(ym) { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; }
export function prev2(ym) { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; }
