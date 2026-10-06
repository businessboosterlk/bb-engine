import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { EngineService, longDate, niceDate, pct } from '../../core/engine.service';
import { IconComponent } from '../../ui/icon.component';
import { RingComponent } from '../../ui/ring.component';
import { Machine3dComponent } from './machine3d.component';

/* THE MACHINE: one screen that answers "how is the engine running" without asking anyone.
   Built like the Hub's dashboard: a greeting, four figures that open their screens, the four seats
   as rings, what was made this month, what needs attention, what ends soon. The 3D view is a layer
   on top of this page, never the only door. */
@Component({
  selector: 'bb-machine',
  standalone: true,
  imports: [RouterLink, IconComponent, RingComponent, Machine3dComponent],
  template: `
    @if (p(); as p) {
    <div class="ph"><div>
      <p class="t-small">{{ dateLine }}</p>
      <h1 class="t-h1">{{ p.month.label }} in the machine</h1>
      <p>{{ brief() }}</p>
    </div><div class="ph-right">
      <a class="btn ghost" data-act="machine-view-3d" routerLink="/engine/machine" [queryParams]="{ view: view() === '3d' ? null : '3d' }" [attr.aria-pressed]="view() === '3d'"><bb-icon name="rotate3d"/><span>{{ view() === '3d' ? 'Flat view' : 'See it in 3D' }}</span></a>
    </div></div>

    @if (view() === '3d') { <bb-machine3d [seats]="p.seats" [month]="p.month.label"/> }

    <div class="kpi">
      <a class="card" data-act="kpi-clients" routerLink="/engine/clients"><div class="k-label">Clients</div><div class="k-val">{{ p.counts.clients }}</div><div class="k-sub">{{ soon().length ? soon().length + ' contracts end within 60 days' : 'no contract ends within 60 days' }}</div></a>
      <a class="card" data-act="kpi-capacity" routerLink="/engine/capacity"><div class="k-label">Tightest seat</div><div class="k-val" [class.warn]="tight().pct! >= 85">{{ tight().pct }}%</div><div class="k-sub">{{ tight().label }}: {{ tight().load }} of {{ tight().capacity }} {{ tight().unit }}</div></a>
      <a class="card" data-act="kpi-videos" routerLink="/engine/output"><div class="k-label">Videos this month</div><div class="k-val">{{ out().videos.done }} <small>of {{ out().videos.contracted }}</small></div><div class="k-sub">done, {{ out().videos.open }} in the system</div></a>
      <a class="card" data-act="kpi-posts" routerLink="/engine/output"><div class="k-label">Posts this month</div><div class="k-val">{{ out().posts.done }} <small>of {{ out().posts.contracted }}</small></div><div class="k-sub">approved in the graphic system</div></a>
    </div>

    <div class="sec"><div class="sec-head"><h3>Capacity, seat by seat</h3><a data-act="see-capacity" routerLink="/engine/capacity">Open capacity</a></div>
      <div class="rings">
        @for (s of p.seats; track s.key) {
          <a class="card seat" [attr.data-act]="'seat-' + s.key" routerLink="/engine/capacity" [fragment]="s.key">
            <bb-ring [pct]="s.pct || 0" [warn]="p.rules['near_capacity_pct']" [label]="s.label"/>
            <div class="st"><strong>{{ s.label }}</strong><span>{{ s.load }} of {{ s.capacity }} {{ s.unit }}</span><span>{{ s.people.length }} {{ s.people.length === 1 ? 'person' : 'people' }}</span></div>
          </a>
        }
      </div></div>

    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>Videos by stage</h3><span>{{ out().videos.in_system }} in the video system for {{ p.month.label }}</span></div>
        <div class="card bars">
          @for (s of stages(); track s.key) {
            <div class="bar-row"><span class="bl">{{ s.label }}</span><span class="track"><i [style.width.%]="s.w" [class.done]="s.key === 'add_to_drive'"></i></span><span class="bn num">{{ s.n }}</span></div>
          } @empty { <div class="empty"><strong>Nothing logged yet</strong>No video for {{ p.month.label }} is in the video system.</div> }
        </div></div>
      <div class="sec"><div class="sec-head"><h3>Needs attention</h3><a data-act="see-alerts" routerLink="/engine/alerts">{{ engine.alerts().length }} in all</a></div>
        <div class="card list">
          @for (a of engine.alerts().slice(0, 6); track a.title) {
            <a class="li link" data-act="alert-open" [routerLink]="a.href" [queryParams]="a.q || {}">
              <span class="ic" [class.red]="a.level === 'red'" [class.amber]="a.level === 'amber'"><bb-icon name="alert"/></span>
              <span class="tx"><strong>{{ a.title }}</strong><span>{{ a.why }}</span></span>
              <bb-icon name="chev" class="go"/>
            </a>
          } @empty { <div class="empty"><strong>All clear</strong>Nothing needs you right now.</div> }
        </div></div>
    </div>

    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>Contracts ending in 90 days</h3><span>{{ ninety().length }} of {{ p.clients.length }}</span></div>
        <div class="card list">
          @for (r of ninety(); track r.name) {
            <a class="li link" data-act="renewal-open" routerLink="/engine/clients" [queryParams]="{ open: r.name }">
              <span class="ic" [class.red]="(r.days || 0) <= 14" [class.amber]="(r.days || 0) > 14 && (r.days || 0) <= 60"><bb-icon name="clock"/></span>
              <span class="tx"><strong>{{ r.name }}</strong><span>{{ niceDate(r.date) }} · {{ r.days! < 0 ? (-r.days!) + ' days past' : r.days + ' days' }}</span></span>
              <bb-icon name="chev" class="go"/>
            </a>
          } @empty { <div class="empty"><strong>None</strong>No contract ends in the next 90 days.</div> }
        </div></div>
      <div class="sec"><div class="sec-head"><h3>Shoots booked</h3><span>{{ p.shoots.this_month }} this month in the shoot table</span></div>
        <div class="card list">
          @for (s of p.shoots.upcoming.slice(0, 6); track s.date + s.client) {
            <div class="li"><span class="ic"><bb-icon name="camera"/></span><span class="tx"><strong>{{ s.client }}</strong><span>{{ niceDate(s.date) }} · {{ s.videos || '?' }} videos · {{ s.stage }}</span></span></div>
          } @empty { <div class="empty"><strong>Nothing booked ahead</strong>The shoot table has no date from today on.</div> }
        </div></div>
    </div>
    }`,
  styles: [`
    .k-val small{font-size:14px;font-weight:600;color:var(--muted)}
    .k-val.warn{color:var(--amber)}
    .sec-head a{font-size:12px;color:var(--brand-text);font-weight:600}
    .rings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .seat{display:flex;align-items:center;gap:14px;padding:14px 16px;transition:border-color var(--dur) var(--ease)}
    @media (hover:hover){.seat:hover{border-color:var(--line-2)}}
    .seat bb-ring{--size:76px;flex-shrink:0}
    .st{min-width:0}.st strong{display:block;font-size:14px}.st span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media (max-width:900px){.rings{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (max-width:400px){.rings{grid-template-columns:minmax(0,1fr)}}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media (max-width:900px){.grid2{grid-template-columns:1fr}}
    .bars{padding:8px 16px}
    .bar-row{display:grid;grid-template-columns:118px 1fr 34px;gap:12px;align-items:center;min-height:36px}
    .bl{font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .track{height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden}.track i{display:block;height:100%;background:var(--blue);border-radius:4px}.track i.done{background:var(--green)}
    .bn{text-align:right;font-size:12.5px;font-weight:600}
    .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted);flex-shrink:0}
    .ic.amber{background:var(--amber-soft);color:var(--amber)}.ic.red{background:var(--red-soft);color:var(--red)}`]
})
export class MachineComponent implements OnInit, OnDestroy {
  engine = inject(EngineService); private route = inject(ActivatedRoute);
  p = this.engine.pub; niceDate = niceDate;
  dateLine = longDate(new Date(), true);
  view = signal<'flat' | '3d'>('flat'); private sub: any;
  ngOnInit(){ this.sub = this.route.queryParamMap.subscribe(q => this.view.set(q.get('view') === '3d' ? '3d' : 'flat')); }
  ngOnDestroy(){ this.sub?.unsubscribe(); }
  out = computed(() => this.p()!.output.this_month);
  soon = computed(() => this.p()!.renewals.filter(r => r.days !== null && r.days <= 60));
  ninety = computed(() => this.p()!.renewals.filter(r => r.days !== null && r.days <= 90));
  tight = computed(() => [...this.p()!.seats].sort((a, b) => (b.pct || 0) - (a.pct || 0))[0]);
  stages = computed(() => { const p = this.p()!; const o = p.output.this_month.videos.by_stage; const order: string[] = p.rules['video_stage_order'];
    const max = Math.max(1, ...Object.values(o)); return order.filter(k => o[k]).map(k => ({ key: k, label: p.rules['video_stage_labels'][k] || k, n: o[k], w: Math.round(o[k] * 100 / max) })); });
  brief = computed(() => { const p = this.p()!; const t = this.tight(); const red = this.engine.red();
    return `${p.counts.clients} clients, ${p.counts.videos} videos and ${p.counts.posts} posts a month. ${t.label} is the tightest seat at ${t.pct}%. ${red ? red + ' red ' + (red === 1 ? 'alert' : 'alerts') + '.' : 'No red alerts.'}`; });
}
