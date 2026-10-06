import { Component, inject, computed } from '@angular/core';
import { EngineService, money, fmt, niceDate } from '../../core/engine.service';
import { ScreenService } from '../../core/screen.service';
import { IconComponent } from '../../ui/icon.component';
import { VaultLockComponent } from '../../ui/vault-lock.component';

/* MONEY, the owner's screen. Billed, paid, cost and what is left this month, every line traceable to a
   row, the way bb-finance reports: billed, costs by category, surplus, then collected, then owed. */
@Component({
  selector: 'bb-money',
  standalone: true,
  imports: [IconComponent, VaultLockComponent],
  template: `
    @if (engine.vault() !== 'open') { <div class="ph"><div><h1 class="t-h1">Money</h1><p>Every rupee, for the owner only.</p></div></div><bb-vault-lock/> }
    @else { @if (o(); as o) {
    <div class="ph"><div><h1 class="t-h1">Money, {{ o.month }}</h1><p>Billed {{ money(o.invoices.billed) }} against {{ money(o.costs.total) }} of cost. {{ o.profit >= 0 ? money(o.profit) + ' left' : money(-o.profit) + ' short' }}, before tax.</p></div></div>
    <div class="kpi">
      <div class="card"><div class="k-label">Monthly fees</div><div class="k-val">{{ money(o.mrr) }}</div><div class="k-sub">{{ o.fees.length }} clients, average {{ money(o.avg_fee) }}</div></div>
      <div class="card"><div class="k-label">Billed this month</div><div class="k-val">{{ money(o.invoices.billed) }}</div><div class="k-sub">{{ o.invoices.count }} invoices</div></div>
      <div class="card"><div class="k-label">Cost this month</div><div class="k-val">{{ money(o.costs.total) }}</div><div class="k-sub">{{ o.costs.lines.length }} lines, founders' draw inside</div></div>
      <div class="card"><div class="k-label">Left</div><div class="k-val" [class.up]="o.profit > 0" [class.down]="o.profit < 0">{{ money(o.profit) }}</div><div class="k-sub">billed less cost · on fees alone {{ money(o.profit_on_mrr) }}</div></div>
    </div>
    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>Collected</h3><span>the tick is the only record BB has</span></div>
        <div class="card pad">
          <div class="collect"><div><strong>{{ money(o.invoices.paid) }}</strong><span>ticked paid, {{ o.invoices.paid_count }} of {{ o.invoices.count }}</span></div><div><strong>{{ money(o.invoices.unpaid) }}</strong><span>not ticked</span></div></div>
          <div class="track"><i [style.width.%]="o.invoices.billed ? o.invoices.paid * 100 / o.invoices.billed : 0"></i></div>
          <p class="t-small">Until the ticks are kept, the cash position is unknown, not bad.</p>
        </div></div>
      <div class="sec"><div class="sec-head"><h3>Cost by category</h3><span>{{ money(o.costs.total) }}</span></div>
        <div class="card bars">
          @for (c of cats(); track c.name) { <div class="bar-row"><span class="bl">{{ c.name }}</span><span class="track"><i [style.width.%]="c.w"></i></span><span class="bn num">{{ fmt(c.v) }}</span></div> }
        </div></div>
    </div>
    @if (o.invoices.owed_before.length) {
      <div class="sec"><div class="sec-head"><h3>Owed from earlier months</h3><span>{{ money(owedTotal()) }} across {{ o.invoices.owed_before.length }} invoices</span></div>
        <div class="card list">@for (r of o.invoices.owed_before; track r.client + r.month) { <div class="li"><span class="ic red"><bb-icon name="alert"/></span><span class="tx"><strong>{{ r.client }}</strong><span>{{ r.month }}</span></span><span class="num amt">{{ fmt(r.amount) }}</span></div> }</div></div>
    }
    <div class="sec"><div class="sec-head"><h3>Invoices this month</h3><span>{{ o.invoices.count }}</span></div>
      <div class="card list">@for (r of o.invoices.rows; track r.client + r.amount) { <div class="li"><span class="avatar">{{ r.client.slice(0, 1) }}</span><span class="tx"><strong>{{ r.client }}</strong><span>{{ r.status }}{{ r.due ? ' · due ' + niceDate(r.due) : '' }}</span></span><span class="num amt">{{ fmt(r.amount) }}</span></div> }</div></div>
    <div class="sec"><div class="sec-head"><h3>Every cost line</h3><span>{{ o.costs.lines.length }}</span></div>
      <div class="card list">@for (l of o.costs.lines; track l.what + l.amount) { <div class="li"><span class="tx"><strong>{{ l.what }}</strong><span>{{ l.category }}{{ l.paid ? ' · paid' : '' }}</span></span><span class="num amt">{{ fmt(l.amount) }}</span></div> }</div></div>
    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>Contracts ending in 60 days, with fees</h3><span>{{ money(renewTotal()) }} a month</span></div>
        <div class="card list">@for (r of o.renewals_value; track r.name) { <div class="li"><span class="tx"><strong>{{ r.name }}</strong><span>{{ niceDate(r.date) }}</span></span><span class="num amt">{{ fmt(r.mrr) }}</span></div> } @empty { <div class="empty"><strong>None</strong>No contract ends in the next 60 days.</div> }</div></div>
      <div class="sec"><div class="sec-head"><h3>Costs booked ahead</h3><span>from the cost sheet</span></div>
        <div class="card list">@for (m of nextMonths(); track m.month) { <div class="li"><span class="tx"><strong>{{ m.month }}</strong></span><span class="num amt">{{ fmt(m.total) }}</span></div> } @empty { <div class="empty"><strong>Nothing booked ahead</strong>Costs are entered at month end.</div> }</div></div>
    </div>
    <p class="t-small foot">Fees from the Command Centre's clients table. Costs and invoices {{ source() }}. No tax, EPF or ETF is in these figures. Confirm this with BB's chartered accountant before acting.</p>
    } }`,
  styles: [`
    .k-val.up{color:var(--green)}.k-val.down{color:var(--red)}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:900px){.grid2{grid-template-columns:1fr}}
    .pad{padding:16px 18px}
    .collect{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.collect strong{display:block;font-size:18px;font-weight:700;letter-spacing:-.01em}.collect span{font-size:12px;color:var(--muted)}
    .collect div:last-child{text-align:right}
    .track{height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden}.track i{display:block;height:100%;background:var(--green);border-radius:4px}
    .pad .t-small{margin-top:10px}
    .bars{padding:8px 16px}.bar-row{display:grid;grid-template-columns:118px 1fr 70px;gap:12px;align-items:center;min-height:36px}
    .bl{font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bars .track i{background:var(--brand)}
    .bn{text-align:right;font-size:12.5px;font-weight:600}
    .amt{font-weight:600;font-size:13px;flex-shrink:0}
    .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted);flex-shrink:0}.ic.red{background:var(--red-soft);color:var(--red)}
    .foot{margin-top:18px;line-height:1.5}`]
})
export class MoneyComponent {
  engine = inject(EngineService); screen = inject(ScreenService); o = this.engine.owner;
  money = money; fmt = fmt; niceDate = niceDate;
  cats = computed(() => { const o = this.o()!; const e = Object.entries(o.costs.by_category).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...e.map(x => x[1])); return e.map(([name, v]) => ({ name, v, w: Math.round(v * 100 / max) })); });
  owedTotal = computed(() => this.o()!.invoices.owed_before.reduce((a, r) => a + r.amount, 0));
  renewTotal = computed(() => this.o()!.renewals_value.reduce((a, r) => a + r.mrr, 0));
  nextMonths = computed(() => Object.entries(this.o()!.costs.next_months).map(([month, total]) => ({ month, total })));
  source = computed(() => { const m = this.engine.meta(); return (this.o() as any)?.source ? 'from ' + (this.o() as any).source : 'from the Command Centre on ' + (m?.generated || '').slice(0, 10); });
}
