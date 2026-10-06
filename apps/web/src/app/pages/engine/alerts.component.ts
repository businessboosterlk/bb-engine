import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngineService } from '../../core/engine.service';
import { IconComponent } from '../../ui/icon.component';

/* EVERY ALERT, red first, each with why and where to go. Owner alerts ride in once the vault is open;
   until then the count says they exist. Data gaps are alerts too: a table that did not answer is news. */
@Component({
  selector: 'bb-alerts',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    @if (p(); as p) {
    <div class="ph"><div><h1 class="t-h1">Alerts</h1><p>{{ list().length }} in all: {{ count('red') }} red, {{ count('amber') }} amber, {{ count('grey') }} about the data.</p></div></div>
    @for (lvl of levels; track lvl.key) {
      @if (count(lvl.key)) {
        <div class="sec"><div class="sec-head"><h3>{{ lvl.label }}</h3><span>{{ count(lvl.key) }}</span></div>
          <div class="card list">
            @for (a of byLevel(lvl.key); track a.title) {
              <a class="li link" data-act="alert-open" [routerLink]="a.href" [queryParams]="a.q || {}">
                <span class="ic" [class.red]="a.level === 'red'" [class.amber]="a.level === 'amber'"><bb-icon [name]="a.level === 'grey' ? 'offline' : 'alert'"/></span>
                <span class="tx"><strong>{{ a.title }}</strong><span>{{ a.why }}</span></span><bb-icon name="chev" class="go"/>
              </a>
            }
          </div></div>
      }
    }
    @if (!list().length) { <div class="card"><div class="empty"><strong>All clear</strong>Nothing needs you right now.</div></div> }
    @if (engine.vault() !== 'open' && p.owner_alert_count) {
      <div class="sec"><div class="card note" data-vault="locked"><bb-icon name="lock"/><span>{{ p.owner_alert_count }} more {{ p.owner_alert_count === 1 ? 'alert is' : 'alerts are' }} about money. <a data-act="alerts-money" routerLink="/owner/money">Open the owner's screens</a> to see {{ p.owner_alert_count === 1 ? 'it' : 'them' }}.</span></div></div>
    }
    <div class="sec"><div class="sec-head"><h3>How the engine was measured</h3></div>
      <div class="card list">
        <div class="li"><span class="tx"><strong>Clients</strong><span>Active rows with a fee in the Command Centre: {{ p.counts.clients }}</span></span></div>
        <div class="li"><span class="tx"><strong>Videos and posts</strong><span>Rows in the video and graphic systems for {{ p.month.label }}, done means the last stage</span></span></div>
        <div class="li"><span class="tx"><strong>Capacity</strong><span>{{ p.rules['smm_cap_per_seat'] }} clients a social media seat, about {{ p.rules['design_clients_per_designer'] }} a designer, {{ p.rules['edit_capacity_videos_per_month'] }} videos a month in editing, {{ p.rules['shoot_days_per_month'] }} shoot days</span></span></div>
        <div class="li"><span class="tx"><strong>Stories</strong><span>Not recorded by any BB system, so never counted as done</span></span></div>
      </div></div>
    }`,
  styles: [`
    .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted);flex-shrink:0}
    .ic.amber{background:var(--amber-soft);color:var(--amber)}.ic.red{background:var(--red-soft);color:var(--red)}
    .note{display:flex;gap:10px;align-items:center;padding:14px 16px;font-size:13.5px;color:var(--ink-2)}.note bb-icon{--ico:16px;color:var(--muted);flex-shrink:0}
    .note a{color:var(--brand-text);font-weight:600;text-decoration:underline;text-underline-offset:3px}`]
})
export class AlertsComponent {
  engine = inject(EngineService); p = this.engine.pub;
  levels = [{ key: 'red', label: 'Act today' }, { key: 'amber', label: 'This week' }, { key: 'grey', label: 'About the data' }];
  list = computed(() => this.engine.alerts());
  byLevel = (k: string) => this.list().filter(a => a.level === k);
  count = (k: string) => this.byLevel(k).length;
}
