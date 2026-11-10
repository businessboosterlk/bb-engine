/* THE ENGINE'S ARITHMETIC. Rows in, two documents out: the TEAM document (clients, capacity, output,
   renewals as dates, alerts as counts) and the OWNER document (every rupee). The model types no sums;
   this file does them, and the self test re-adds every total from the rows.
   Denominator law (the Command Centre's monthly recap): a figure nobody measured reads "not measured",
   never 0, and every derived number says what it was measured on. */
export function compute(raw, rules, forecast, ym, prevYm, nowIso) {
  const [Y, M] = ym.split('-').map(Number); const [PY, PM] = prevYm.split('-').map(Number);
  const today = nowIso.slice(0, 10);
  const days = d => d ? Math.round((new Date(d + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 864e5) : null;
  /* A client is status active AND has a package (owner's decision, 10 Nov 2026). The fee column mrr is locked
     to the public key and the Engine no longer reads it: see DECISIONS.md. */
  const clients = raw.clients.filter(isClient).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const byId = Object.fromEntries(clients.map(c => [c.id, c]));
  const team = raw.team.map(t => ({ id: t.id, name: title(t.name), role: t.role }));
  const roleOf = r => Object.entries(rules.roles).find(([, list]) => list.includes(r))?.[0] || 'other';
  const people = k => team.filter(t => roleOf(t.role) === k).map(t => t.name);
  const editors = Object.fromEntries(raw.team.filter(t => roleOf(t.role) === 'edit' || roleOf(t.role) === 'shoot').map(t => [t.id, title(t.name)]));

  /* ---- output: videos and posts this month and last ---- */
  const vid = (y, m) => raw.videos.filter(v => v.target_year === y && v.target_month === m);
  const gfx = (y, m) => raw.graphics.filter(g => g.target_year === y && g.target_month === m);
  const stageCount = rows => { const o = {}; rows.forEach(r => { o[r.current_stage || 'none'] = (o[r.current_stage || 'none'] || 0) + 1; }); return o; };
  const monthOutput = (y, m) => {
    const v = vid(y, m), g = gfx(y, m);
    const done = v.filter(x => x.current_stage === rules.video_done_stage).length;
    const perClient = {};
    v.forEach(x => { const c = perClient[x.client_id] ||= { videos_done: 0, videos_open: 0 }; x.current_stage === rules.video_done_stage ? c.videos_done++ : c.videos_open++; });
    g.forEach(x => { const c = perClient[x.client_id] ||= {}; if (x.current_stage === rules.graphic_done_stage) c.posts_done = (c.posts_done || 0) + 1; else c.posts_open = (c.posts_open || 0) + 1; });
    const byEditor = {};
    v.forEach(x => { const n = editors[x.assigned_editor_id] || (x.assigned_editor_id ? 'Unknown editor' : 'Unassigned'); const e = byEditor[n] ||= { name: n, done: 0, open: 0 }; x.current_stage === rules.video_done_stage ? e.done++ : e.open++; });
    return { label: label(y, m), videos: { contracted: sum(clients, 'monthly_videos'), done, open: v.length - done, in_system: v.length, by_stage: stageCount(v) },
      posts: { contracted: sum(clients, 'monthly_posts'), done: g.filter(x => x.current_stage === rules.graphic_done_stage).length, in_system: g.length },
      stories: { contracted: sum(clients, 'monthly_stories'), done: null, note: 'No BB system records stories, so they are not measured' },
      by_editor: Object.values(byEditor).sort((a, b) => b.done + b.open - a.done - a.open), per_client: perClient };
  };
  const thisMonth = monthOutput(Y, M), lastMonth = monthOutput(PY, PM);
  const late = raw.lateVideos.filter(v => byId[v.client_id]).map(v => ({ client: byId[v.client_id].name, title: v.title, stage: rules.video_stage_labels[v.current_stage] || v.current_stage, deadline: v.deadline, days: -days(v.deadline), editor: editors[v.assigned_editor_id] || null }))
    .sort((a, b) => b.days - a.days);

  /* ---- capacity, seat by seat ---- */
  const videoDemand = sum(clients, 'monthly_videos');
  const shootDays = raw.shoots.filter(s => (s.shoot_date || '').startsWith(ym)).length;
  const upcoming = raw.shoots.filter(s => s.shoot_date >= today).map(s => ({ client: byId[s.client_id]?.name || s.title, date: s.shoot_date, videos: s.video_count, stage: s.stage || s.status })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  const seat = (key, label, who, capacity, load, unit, rule) => ({ key, label, people: who, capacity, load, unit, spare: capacity - load, pct: capacity ? Math.round(load * 1000 / capacity) / 10 : null, rule });
  /* a person with their own cap (a junior) counts that cap, not the full seat */
  const capOf = (n, seatCap) => (rules.person_caps && n in rules.person_caps) ? rules.person_caps[n] : seatCap;
  const smmJunior = people('smm').filter(n => rules.person_caps && n in rules.person_caps);
  const smmCap = people('smm').reduce((a, n) => a + capOf(n, rules.smm_cap_per_seat), 0);
  const seats = [
    seat('smm', 'Social media', people('smm'), smmCap, clients.length, 'clients', `${rules.smm_cap_per_seat} clients a seat` + (smmJunior.length ? `, ${smmJunior.map(n => n + ' ' + (rules.person_caps[n] || 'not yet counted')).join(', ')}` : `, ${people('smm').length} seats`)),
    seat('design', 'Design', people('design'), people('design').length * rules.design_clients_per_designer, clients.length, 'clients', `about ${rules.design_clients_per_designer} clients a designer, measured in the October sprint`),
    seat('edit', 'Editing', people('edit'), rules.edit_capacity_videos_per_month, videoDemand, 'videos a month', `${rules.edit_capacity_videos_per_month} videos a month, measured from the Oct to Dec edit timetable`),
    seat('shoot', 'Shooting', people('shoot'), rules.shoot_days_per_month, shootDays, 'shoot days this month', `${rules.shoot_days_per_month} shoot days a month for the video head`),
  ];
  const devs = people('dev');

  /* ---- renewals and the roster the team sees (no fees) ---- */
  const roster = clients.map(c => ({ id: c.id, name: title(c.name), package: c.package, smm: title(c.assigned_smm || ''), posts: c.monthly_posts, videos: c.monthly_videos, stories: c.monthly_stories,
    renewal: c.renewal || null, ends_in: days(c.renewal), has_note: !!(c.notes && c.notes.trim()), output: thisMonth.per_client[c.id] || {} }));
  const renewals = roster.filter(r => r.renewal).map(r => ({ name: r.name, date: r.renewal, days: r.ends_in })).sort((a, b) => a.date.localeCompare(b.date));
  const soon = renewals.filter(r => r.days !== null && r.days <= rules.renewal_warning_days);

  /* ---- sales pipeline, counts only for the team ---- */
  const pipe = { open: raw.pipeline.filter(p => !/closed/.test(p.stage || '')).length, by_stage: stageCount(raw.pipeline.map(p => ({ current_stage: p.stage }))) };

  /* ---- intake: clients whose start date falls in this month ---- */
  const intake = { new_this_month: clients.filter(c => (c.start_date || '').startsWith(ym)).map(c => ({ name: title(c.name), date: c.start_date })).sort((a, b) => a.date.localeCompare(b.date)) };

  /* ---- ads: the Meta feed, leads for the team, spend only in the owner document ---- */
  const accName = Object.fromEntries((raw.adsAccounts || []).map(a => [a.account_id, a]));
  const leadsOf = r => { const e = (r.actions || []).find(x => x.action_type === 'lead'); return e ? Number(e.value) || 0 : 0; };
  const byAcc = {};
  (raw.adsDaily || []).forEach(r => { const a = byAcc[r.account_id] ||= { id: r.account_id, leads: 0, impressions: 0, days: new Set(), spend: 0 }; a.leads += leadsOf(r); a.impressions += Number(r.impressions) || 0; a.spend += Number(r.spend) || 0; a.days.add(r.day); });
  const accRows = Object.values(byAcc).map(a => ({ id: a.id, name: accName[a.id]?.name || a.id, client: accName[a.id]?.client_id && byId[accName[a.id].client_id] ? title(byId[accName[a.id].client_id].name) : null, leads: a.leads, impressions: a.impressions, days: a.days.size, spend: Math.round(a.spend * 100) / 100, currency: accName[a.id]?.currency || '' }))
    .sort((a, b) => b.leads - a.leads || b.impressions - a.impressions);
  const lastPull = (raw.adsPull || [])[0] || null;
  const ads = { measured: (raw.adsDaily || []).length > 0 || !!lastPull, form_leads: sum(accRows, 'leads'), accounts: accRows.map(({ spend, currency, ...r }) => r),
    unmapped: (raw.adsAccounts || []).filter(a => a.active && !a.client_id).length, last_pull: lastPull ? { at: lastPull.finished_at || lastPull.started_at, ok: !!lastPull.ok } : null };

  /* ---- the Brain: counts only, read from the Brain's own build on this Mac ---- */
  const brain = raw.brain ? { generated: raw.brain.generated, skills: raw.brain.skills, learnings_this_month: raw.brain.learnings_this_month, decisions: raw.brain.decisions } : null;

  /* ---- where every number comes from, and how fresh it is; times in Colombo ---- */
  const lk = iso => iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '';
  const answered = k => !raw.gaps.some(g => g.startsWith(k + ':'));
  const sources = [
    { key: 'clients', name: 'Clients', from: 'Command Centre, clients', state: answered('clients') ? 'live' : 'down', note: `${clients.length} active with a package` },
    { key: 'team', name: 'Team', from: 'Command Centre, team_members', state: answered('team_members') ? 'live' : 'down', note: `${team.length} active` },
    { key: 'videos', name: 'Videos', from: 'Video system, video_projects', state: answered('video_projects') ? 'live' : 'down', note: `${thisMonth.videos.in_system} for ${label(Y, M)}` },
    { key: 'posts', name: 'Posts', from: 'Graphic system, graphic_projects', state: answered('graphic_projects') ? 'live' : 'down', note: `${thisMonth.posts.in_system} for ${label(Y, M)}` },
    { key: 'shoots', name: 'Shoots', from: 'Shoot planner, smm_shoots', state: answered('smm_shoots') ? 'live' : 'down', note: `${shootDays} shoot days this month` },
    { key: 'ads', name: 'Meta ads', from: 'Ads feed, pulled 06:50 daily', state: ads.last_pull ? (ads.last_pull.ok ? 'live' : 'down') : 'off', note: ads.last_pull ? `last pull ${lk(ads.last_pull.at)} Colombo` : 'no pull recorded' },
    { key: 'brain', name: 'The Brain', from: 'BB Brain build on the Mac', state: brain ? 'live' : 'off', note: brain ? `built ${lk(brain.generated)} Colombo` : 'not found on this Mac' },
    { key: 'money', name: 'Costs and invoices', from: 'Command Centre, finance tables', state: raw.money_source === 'live' ? 'live' : 'snapshot', note: raw.money_source === 'live' ? 'read live' : 'a hand-taken copy until the service key is in' },
    { key: 'leads', name: 'Sales leads', from: 'Leads System, pipeline', state: raw.pipeline.length ? 'live' : 'locked', note: raw.pipeline.length ? `${pipe.open} open` : 'locked to the public key, needs the service key' },
    { key: 'stories', name: 'Stories', from: 'no BB system records them', state: 'off', note: 'not measured' },
  ];

  /* ---- alerts the team can act on ---- */
  const alerts = [];
  soon.forEach(r => alerts.push({ level: r.days <= 14 ? 'red' : 'amber', title: `${r.name} ends ${nice(r.date)}`, why: r.days < 0 ? `${-r.days} days past its end date with no renewal recorded` : `${r.days} days to renew`, href: '/engine/clients', q: { open: r.name } }));
  seats.forEach(s => { if (s.pct !== null && s.pct >= rules.near_capacity_pct) alerts.push({ level: s.pct >= 100 ? 'red' : 'amber', title: `${s.label} is at ${s.pct}%`, why: `${s.load} of ${s.capacity} ${s.unit}. ${s.rule}`, href: '/engine/capacity' }); });
  if (late.length) alerts.push({ level: late.length > 10 ? 'red' : 'amber', title: `${late.length} videos past their deadline`, why: `Oldest: ${late[0].client}, ${late[0].days} days`, href: '/engine/output' });
  if (!upcoming.length) alerts.push({ level: 'amber', title: 'No shoot booked ahead', why: 'smm_shoots has nothing from today on', href: '/engine/output' });
  const unassigned = roster.filter(r => !r.smm); if (unassigned.length) alerts.push({ level: 'amber', title: `${unassigned.length} clients have no social media manager`, why: unassigned.map(r => r.name).join(', '), href: '/engine/clients' });
  if (ads.last_pull && !ads.last_pull.ok) alerts.push({ level: 'amber', title: 'The ads feed failed its last pull', why: `Last tried ${String(ads.last_pull.at).slice(0, 16).replace('T', ' ')}`, href: '/engine/alerts' });
  if (ads.unmapped) alerts.push({ level: 'grey', title: `${ads.unmapped} ad accounts are not matched to a client`, why: 'Their leads count in the total but cannot be credited to a client until they are mapped in the Command Centre', href: '/engine/alerts' });
  raw.gaps.forEach(g => alerts.push({ level: 'grey', title: 'A table did not answer', why: g, href: '/engine/alerts' }));

  /* ---- the owner document: every rupee ---- */
  const costs = raw.costs.filter(c => c.month === ym); const costsNext = raw.costs.filter(c => c.month !== ym);
  const inv = raw.invoices.filter(i => i.month === ym); const invBefore = raw.invoices.filter(i => i.month < ym);
  const paid = i => (i.status || '').toLowerCase() === 'paid';
  const byCat = {}; costs.forEach(c => { byCat[c.category || 'Other'] = (byCat[c.category || 'Other'] || 0) + (c.amount || 0); });
  /* fees are not available: mrr is locked and never read. null, never 0 (the denominator law) */
  const mrr = null;
  const payNames = new Set(costs.filter(c => c.category === 'Salaries').map(c => (c.description || '').split(',')[0].trim().toUpperCase()));
  const unbooked = raw.team.filter(t => !/THULAIB|SHIARA/i.test(t.name) && ![...payNames].some(p => p.startsWith(t.name.toUpperCase()))).map(t => title(t.name));
  const owner = {
    month: label(Y, M), mrr, avg_fee: null, fees_note: 'Not available: the fee column is locked and the Engine does not read it',
    fees: clients.map(c => ({ name: title(c.name), mrr: null, renewal: c.renewal || null, note: c.notes || '' })),
    costs: { total: sum(costs, 'amount'), by_category: byCat, lines: costs.map(c => ({ what: title(c.description || ''), amount: c.amount, category: c.category, paid: !!c.paid })).sort((a, b) => b.amount - a.amount),
      next_months: Object.fromEntries([...new Set(costsNext.map(c => c.month))].sort().map(m => [m, sum(costsNext.filter(c => c.month === m), 'amount')])) },
    invoices: { billed: sum(inv, 'amount'), paid: sum(inv.filter(paid), 'amount'), unpaid: sum(inv.filter(i => !paid(i)), 'amount'), count: inv.length, paid_count: inv.filter(paid).length,
      rows: inv.map(i => ({ client: title(i.client_name || ''), amount: i.amount, status: i.status, due: i.due_date })).sort((a, b) => b.amount - a.amount),
      owed_before: invBefore.filter(i => !paid(i)).map(i => ({ client: title(i.client_name || ''), amount: i.amount, month: i.month })).sort((a, b) => a.month.localeCompare(b.month)) },
    pipeline_value: sum(raw.pipeline.filter(p => !/closed/.test(p.stage || '')), 'estimated_value'),
    renewals_value: soon.map(r => ({ ...r, mrr: null })),
    unbooked_pay: unbooked,
    forecast,
    ads_spend: accRows.map(a => ({ name: a.name, client: a.client, spend: a.spend, currency: a.currency, leads: a.leads })),
  };
  owner.profit = owner.invoices.billed - owner.costs.total;
  owner.profit_on_mrr = null;
  const ownerAlerts = [];
  if (owner.invoices.count && owner.invoices.paid_count / owner.invoices.count < .5) ownerAlerts.push({ level: 'amber', title: `${owner.invoices.count - owner.invoices.paid_count} of ${owner.invoices.count} invoices not ticked paid`, why: `${fmt(owner.invoices.unpaid)} unticked. The tick is the only record BB has, so the cash position is unknown`, href: '/owner/money' });
  if (owner.invoices.owed_before.length) ownerAlerts.push({ level: 'red', title: `${owner.invoices.owed_before.length} earlier invoices still unpaid`, why: fmt(sum(owner.invoices.owed_before, 'amount')) + ' from before ' + label(Y, M), href: '/owner/money' });
  unbooked.forEach(n => ownerAlerts.push({ level: 'amber', title: `${n} has no pay booked this month`, why: 'Active in the team, absent from the cost sheet', href: '/owner/people' }));
  owner.alerts = ownerAlerts;

  const pub = { generated: nowIso, month: { ym, label: label(Y, M), prev: label(PY, PM) }, counts: { clients: clients.length, posts: sum(clients, 'monthly_posts'), videos: videoDemand, stories: sum(clients, 'monthly_stories'), team: team.length },
    clients: roster, team, seats, devs, output: { this_month: thisMonth, last_month: lastMonth, late }, shoots: { this_month: shootDays, upcoming }, renewals, pipeline: pipe, intake, ads, brain, sources, alerts, gaps: raw.gaps, rules,
    owner_alert_count: ownerAlerts.length };
  return { pub, owner };
}
export const isClient = c => c.status === 'active' && String(c.package || '').trim() !== '';
export const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
export const title = s => String(s || '').toLowerCase().replace(/(^|[\s(-])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\bAi\b/g, 'AI').replace(/\bBs\b/g, 'BS').replace(/\bTt\b/g, 'TT').replace(/\bHomedepot\b/, 'Home Depot').replace(/\bBb\b/g, 'BB').replace(/\bSeo\b/g, 'SEO').replace(/\bKpi\b/g, 'KPI');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const label = (y, m) => `${MONTHS[m - 1]} ${y}`;
export const nice = d => { const [y, m, dd] = d.split('-'); return `${Number(dd)} ${MONTHS[Number(m) - 1].slice(0, 3)} ${y}`; };
export const fmt = n => n.toLocaleString('en-GB');
