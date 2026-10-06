import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EngineService, money, fmt, short } from '../../core/engine.service';
import { IconComponent } from '../../ui/icon.component';
import { VaultLockComponent } from '../../ui/vault-lock.component';
import { ChartComponent } from '../../ui/chart.component';

/* THE FORECAST, the owner's screen. Nine cases from the finance scripts (Python computes, this shows):
   pick how many clients are signed and what else is sold, read 2027 month by month against the two
   targets. Every number here was asserted in prediction_2027.py before it reached this file. */
@Component({
  selector: 'bb-forecast',
  standalone: true,
  imports: [FormsModule, IconComponent, VaultLockComponent, ChartComponent],
  template: `
    @if (engine.vault() !== 'open') { <div class="ph"><div><h1 class="t-h1">Forecast</h1><p>2027 in nine cases, for the owner only.</p></div></div><bb-vault-lock/> }
    @else if (!f()) { <div class="ph"><div><h1 class="t-h1">Forecast</h1></div></div><div class="card"><div class="empty"><strong>No forecast published</strong>Run export_engine_forecast.py on the BB Mac, then the Engine build.</div></div> }
    @else { @if (f(); as f) {
    <div class="ph"><div><h1 class="t-h1">Forecast 2027</h1><p>{{ sc().path }}. {{ sc().add }}. Profit kept by 31 December 2027: <strong>{{ money(sc().y27.profit) }}</strong>.</p></div></div>
    <div class="toolbar">
      <label class="fsel"><span class="sr">Clients</span><select [ngModel]="path()" (ngModelChange)="pick($event, add())" data-act="forecast-path" aria-label="How many new clients">
        @for (p of paths; track p.key) { <option [value]="p.key">{{ p.label }}</option> }</select></label>
      <label class="fsel"><span class="sr">Extra work</span><select [ngModel]="add()" (ngModelChange)="pick(path(), $event)" data-act="forecast-add" aria-label="Extra work sold each month">
        @for (a of adds; track a.key) { <option [value]="a.key">{{ a.label }}</option> }</select></label>
    </div>
    <div class="kpi">
      <div class="card"><div class="k-label">2027 revenue</div><div class="k-val">{{ money(sc().y27.revenue) }}</div><div class="k-sub">January to December</div></div>
      <div class="card"><div class="k-label">2027 cost</div><div class="k-val">{{ money(sc().y27.cost) }}</div><div class="k-sub">pay, KPI in full, running costs, {{ sc().sscl_from ? 'SSCL from ' + sc().sscl_from : 'no SSCL' }}</div></div>
      <div class="card"><div class="k-label">2027 profit</div><div class="k-val up">{{ money(sc().y27.profit) }}</div><div class="k-sub">{{ sc().y27.profit >= f.targets.lkr ? '15 million reached' : short(f.targets.lkr - sc().y27.profit) + ' short of 15 million' }}</div></div>
      <div class="card"><div class="k-label">USD 100,000</div><div class="k-val" [class.up]="sc().y27.profit >= f.targets.usd">{{ sc().y27.profit >= f.targets.usd ? 'Reached' : short(f.targets.usd - sc().y27.profit) + ' short' }}</div><div class="k-sub">{{ money(f.targets.usd) }} at {{ f.targets.fx.toFixed(2) }} on {{ f.targets.fx_date }}</div></div>
    </div>
    <div class="sec"><div class="sec-head"><h3>Month by month</h3><span>revenue, cost and profit</span></div>
      <div class="card pad"><bb-chart type="lines" [labels]="f.months" [series]="lines()" [shade]="true" label="Revenue, cost and profit by month" [H]="260" [every]="2"/></div></div>
    <div class="sec"><div class="sec-head"><h3>Profit kept, added up through 2027</h3><span>against the two targets</span></div>
      <div class="card pad"><bb-chart type="bars" [labels]="f.months" [series]="[{ name: 'Kept', values: sc().cum, color: 'var(--green)' }]" [targets]="[{ value: f.targets.lkr, label: '15 million' }, { value: f.targets.usd, label: 'USD 100,000' }]" label="Profit kept, running total" [H]="240" [every]="2"/></div></div>
    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>People this case needs</h3><span>{{ sc().hires.length }}</span></div>
        <div class="card list">@for (h of sc().hires; track h.role + h.start) { <div class="li"><span class="ic"><bb-icon name="user"/></span><span class="tx"><strong>{{ h.role }}</strong><span>from {{ h.start }}</span></span><span class="num amt">{{ money(h.pay) }}</span></div> } @empty { <div class="empty"><strong>Nobody new</strong>The team in place carries this case.</div> }</div></div>
      <div class="sec"><div class="sec-head"><h3>What is assumed</h3></div>
        <div class="card list">@for (n of f.notes; track n) { <div class="li"><span class="tx"><span class="wrap">{{ n }}</span></span></div> }</div></div>
    </div>
    <div class="sec"><div class="sec-head"><h3>Today's 23 clients in 2027</h3><span>{{ money(base27()) }} if all renew</span></div>
      <div class="card list">@for (c of f.base.clients; track c.name) { <div class="li"><span class="avatar">{{ c.name.slice(0, 1) }}</span><span class="tx"><strong>{{ c.name }}</strong><span>{{ c.package }} · {{ money(c.fee_jan) }} from January · ends {{ c.ends }}{{ c.note ? ' · ' + c.note : '' }}</span></span><span class="num amt">{{ fmt(c.y27) }}</span></div> }</div></div>
    <p class="t-small foot">Forecast generated {{ f.generated }} by the finance scripts. An estimate, not a promise.</p>
    } }`,
  styles: [`
    .k-val.up{color:var(--green)}
    .toolbar .fsel{position:relative}.fsel select{min-height:44px;padding:0 44px 0 12px;border:1px solid var(--line-2);border-radius:10px;background-color:var(--surface);font-size:13.5px;font-weight:500;color:var(--ink);max-width:100%}
    .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .pad{padding:16px 18px 10px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:900px){.grid2{grid-template-columns:1fr}}
    .amt{font-weight:600;font-size:13px;flex-shrink:0}
    .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted);flex-shrink:0}
    .tx .wrap{white-space:normal;color:var(--ink-2);font-size:13px;line-height:1.45}
    .foot{margin-top:18px}`]
})
export class ForecastComponent implements OnInit, OnDestroy {
  engine = inject(EngineService); private route = inject(ActivatedRoute); private router = inject(Router);
  money = money; fmt = fmt; short = short;
  f = computed(() => this.engine.owner()?.forecast || null);
  paths = [{ key: 'today', label: "Today's 23 clients only" }, { key: 'one', label: 'Plus one new client a month from January' }, { key: 'seven', label: 'Plus seven from January, 30 clients' }];
  adds = [{ key: 'none', label: 'Clients only' }, { key: 'web', label: 'Plus a 250,000 website a month' }, { key: 'both', label: 'Plus a website and a 40,000 a month system' }];
  path = signal('seven'); add = signal('both'); private sub: any;
  ngOnInit(){ this.sub = this.route.queryParamMap.subscribe(q => { const s = (q.get('s') || '').split(':'); if (s.length === 2 && this.paths.some(p => p.key === s[0]) && this.adds.some(a => a.key === s[1])) { this.path.set(s[0]); this.add.set(s[1]); } }); }
  ngOnDestroy(){ this.sub?.unsubscribe(); }
  pick(p: string, a: string){ this.router.navigate([], { relativeTo: this.route, queryParams: { s: p + ':' + a }, queryParamsHandling: 'merge' }); }
  sc = computed(() => this.f()!.scenarios[this.path() + ':' + this.add()]);
  lines = computed(() => [{ name: 'Revenue', values: this.sc().rev, color: 'var(--green)' }, { name: 'Cost', values: this.sc().cost, color: 'var(--red)' }, { name: 'Profit', values: this.sc().prof, color: 'var(--blue)' }]);
  base27 = computed(() => this.f()!.base.clients.reduce((a, c) => a + c.y27, 0));
}
