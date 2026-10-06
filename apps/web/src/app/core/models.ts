/* The two documents the Engine reads. Shapes follow engine/compute.mjs exactly. */
export interface Seat { key: string; label: string; people: string[]; capacity: number; load: number; unit: string; spare: number; pct: number | null; rule: string; }
export interface ClientRow { id: number; name: string; package: string; smm: string; posts: number; videos: number; stories: number; renewal: string | null; ends_in: number | null; has_note: boolean;
  output: { videos_done?: number; videos_open?: number; posts_done?: number; posts_open?: number }; }
export interface Alert { level: 'red' | 'amber' | 'grey'; title: string; why: string; href: string; q?: Record<string, string>; }
export interface MonthOutput { label: string; videos: { contracted: number; done: number; open: number; in_system: number; by_stage: Record<string, number> };
  posts: { contracted: number; done: number; in_system: number }; stories: { contracted: number; done: null; note: string };
  by_editor: { name: string; done: number; open: number }[]; per_client: Record<string, ClientRow['output']>; }
export interface LateVideo { client: string; title: string; stage: string; deadline: string; days: number; editor: string | null; }
export interface EnginePub {
  generated: string; month: { ym: string; label: string; prev: string };
  counts: { clients: number; posts: number; videos: number; stories: number; team: number };
  clients: ClientRow[]; team: { id: number; name: string; role: string }[]; seats: Seat[]; devs: string[];
  output: { this_month: MonthOutput; last_month: MonthOutput; late: LateVideo[] };
  shoots: { this_month: number; upcoming: { client: string; date: string; videos: number; stage: string }[] };
  renewals: { name: string; date: string; days: number | null }[];
  pipeline: { open: number; by_stage: Record<string, number> };
  alerts: Alert[]; gaps: string[]; rules: Record<string, any>; owner_alert_count: number;
  vault: { state: 'held' | 'sealed'; lock: string };
}
export interface Owner {
  month: string; mrr: number; avg_fee: number | null;
  fees: { name: string; mrr: number; renewal: string | null; note: string }[];
  costs: { total: number; by_category: Record<string, number>; lines: { what: string; amount: number; category: string; paid: boolean }[]; next_months: Record<string, number> };
  invoices: { billed: number; paid: number; unpaid: number; count: number; paid_count: number; rows: { client: string; amount: number; status: string; due: string | null }[]; owed_before: { client: string; amount: number; month: string }[] };
  pipeline_value: number; renewals_value: { name: string; date: string; days: number | null; mrr: number }[];
  unbooked_pay: string[]; profit: number; profit_on_mrr: number; alerts: Alert[];
  forecast: Forecast | null;
}
export interface Scenario { path: string; add: string; rev: number[]; cost: number[]; prof: number[]; cum: number[]; new_rev: number[]; web_rev: number[]; sys_rev: number[];
  hires: { role: string; start: string; pay: number }[]; y27: { revenue: number; cost: number; profit: number }; sscl_from: string | null; vat_from: string | null; }
export interface Forecast {
  generated: string; months: string[]; year27: [number, number];
  base: { name: string; revenue: number[]; lost_revenue: number[]; cost: number[]; profit: number[]; clients: { name: string; package: string; on_file: number; fee_jan: number; y27: number; ends: string; note: string }[] };
  scenarios: Record<string, Scenario>; people: { team: string; name: string; pay: number[]; kpi_from: string | null }[];
  kpi: { full: number; half: number }; targets: { lkr: number; usd: number; fx: number; fx_date: string }; rules: Record<string, number>; notes: string[];
}
export interface SealedBox { v: number; salt: string; iv: string; ct: string; iter: number; }
