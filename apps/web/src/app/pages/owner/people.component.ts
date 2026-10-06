import { Component, inject, computed } from '@angular/core';
import { EngineService, money } from '../../core/engine.service';
import { VaultLockComponent } from '../../ui/vault-lock.component';

/* PEOPLE, the owner's screen: who is on the team, what each is paid this month, and who has no pay
   booked at all. Pay comes from the cost sheet lines that start with the person's name. */
@Component({
  selector: 'bb-people',
  standalone: true,
  imports: [VaultLockComponent],
  template: `
    @if (engine.vault() !== 'open') { <div class="ph"><div><h1 class="t-h1">People</h1><p>Pay and KPI, for the owner only.</p></div></div><bb-vault-lock/> }
    @else { @if (o(); as o) {
    <div class="ph"><div><h1 class="t-h1">People, {{ o.month }}</h1><p>{{ rows().length }} on the team. Pay booked this month {{ money(payTotal()) }}. {{ o.unbooked_pay.length ? o.unbooked_pay.join(' and ') + ' have no pay booked.' : 'Everyone has pay booked.' }}</p></div></div>
    @for (t of teams(); track t.name) {
      <div class="sec"><div class="sec-head"><h3>{{ t.name }}</h3><span>{{ money(t.total) }}</span></div>
        <div class="card list">
          @for (r of t.rows; track r.name) {
            <div class="li"><span class="avatar">{{ r.name.slice(0, 1) }}</span>
              <span class="tx"><strong>{{ r.name }}</strong><span>{{ r.role }}{{ r.kpi ? ' · KPI from ' + r.kpi : '' }}</span></span>
              @if (r.pay) { <span class="num amt">{{ money(r.pay) }}</span> } @else { <span class="pill amber">No pay booked</span> }
            </div>
          }
        </div></div>
    }
    <p class="t-small foot">Pay is this month's cost sheet. KPI start months come from the offer letters in the forecast. Founders' draw sits under Founders.</p>
    } }`,
  styles: [`
    .amt{font-weight:600;font-size:13px;flex-shrink:0}
    .pill.amber{background:var(--amber-soft);color:var(--amber);border-color:transparent}
    .foot{margin-top:18px}`]
})
export class PeopleComponent {
  engine = inject(EngineService); o = this.engine.owner; money = money;
  rows = computed(() => { const o = this.o()!; const p = this.engine.pub()!; const kpi = Object.fromEntries((o.forecast?.people || []).map(x => [x.name.toUpperCase(), x.kpi_from]));
    const pay = (n: string) => o.costs.lines.filter(l => l.category === 'Salaries' && l.what.toUpperCase().split(',')[0].trim().startsWith(n.toUpperCase())).reduce((a, l) => a + l.amount, 0);
    const list = p.team.map(t => ({ name: t.name, role: roleWord(t.role), team: teamOf(t.role), pay: pay(t.name), kpi: kpi[t.name.toUpperCase()] || null }));
    list.unshift({ name: 'Thulaib and Shiara', role: 'Founders', team: 'Founders', pay: o.costs.lines.filter(l => /FOUNDERS/i.test(l.what)).reduce((a, l) => a + l.amount, 0), kpi: null });
    return list.filter((r, i, a) => !/^(THULAIB|SHIARA)$/i.test(r.name)); });
  payTotal = computed(() => this.rows().reduce((a, r) => a + r.pay, 0));
  teams = computed(() => { const by: Record<string, any[]> = {}; this.rows().forEach(r => (by[r.team] ||= []).push(r));
    return ['Founders', 'Video', 'Graphics', 'Social media', 'Development', 'Other'].filter(k => by[k]).map(name => ({ name, rows: by[name], total: by[name].reduce((a, r) => a + r.pay, 0) })); });
}
function teamOf(role: string){ return /video|editor/i.test(role) ? 'Video' : /graphic/i.test(role) ? 'Graphics' : /social/i.test(role) ? 'Social media' : /dev/i.test(role) ? 'Development' : /CEO|COO/.test(role) ? 'Founders' : 'Other'; }
function roleWord(role: string){ return ({ editor: 'Editor', video_head: 'Video head', 'Dev Head': 'Head of development' } as Record<string, string>)[role] || role; }
