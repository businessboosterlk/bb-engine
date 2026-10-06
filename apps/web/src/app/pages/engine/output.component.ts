import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EngineService, niceDate } from '../../core/engine.service';
import { ScreenService } from '../../core/screen.service';
import { IconComponent } from '../../ui/icon.component';

/* OUTPUT: what BB made against what it promised, this month or last, by stage, by person, by client.
   The denominator law: stories are not measured by any system, so they read "not measured", never 0. */
@Component({
  selector: 'bb-output',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (p(); as p) {
    <div class="ph"><div><h1 class="t-h1">Output</h1><p>{{ o().label }}: {{ o().videos.done }} of {{ o().videos.contracted }} videos done, {{ o().posts.done }} of {{ o().posts.contracted }} posts approved.</p></div>
      <div class="ph-right"><div class="seg" role="group" aria-label="Month">
        <button type="button" data-act="output-this" [class.on]="which() === 'this'" [attr.aria-pressed]="which() === 'this'" (click)="go('this')">{{ p.month.label }}</button>
        <button type="button" data-act="output-last" [class.on]="which() === 'last'" [attr.aria-pressed]="which() === 'last'" (click)="go('last')">{{ p.month.prev }}</button></div></div></div>
    <div class="kpi">
      <div class="card"><div class="k-label">Videos</div><div class="k-val">{{ o().videos.done }} <small>of {{ o().videos.contracted }}</small></div><div class="k-sub">done · {{ o().videos.in_system }} in the video system</div></div>
      <div class="card"><div class="k-label">Posts</div><div class="k-val">{{ o().posts.done }} <small>of {{ o().posts.contracted }}</small></div><div class="k-sub">approved in the graphic system</div></div>
      <div class="card"><div class="k-label">Stories</div><div class="k-val dim">Not measured</div><div class="k-sub">{{ o().stories.contracted }} contracted. {{ o().stories.note }}</div></div>
      <div class="card"><div class="k-label">Past deadline</div><div class="k-val" [class.warn]="p.output.late.length">{{ p.output.late.length }}</div><div class="k-sub">{{ p.output.late.length ? 'videos late, oldest ' + p.output.late[0].days + ' days' : 'no video past its deadline' }}</div></div>
    </div>
    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>Videos by stage</h3><span>{{ o().videos.in_system }} rows</span></div>
        <div class="card bars">
          @for (s of stages(); track s.key) { <div class="bar-row"><span class="bl">{{ s.label }}</span><span class="track"><i [style.width.%]="s.w" [class.done]="s.key === 'add_to_drive'"></i></span><span class="bn num">{{ s.n }}</span></div> }
          @empty { <div class="empty"><strong>Nothing logged</strong>No video for {{ o().label }} is in the video system.</div> }
        </div></div>
      <div class="sec"><div class="sec-head"><h3>By editor</h3><span>done and open</span></div>
        <div class="card list">
          @for (e of o().by_editor; track e.name) { <div class="li"><span class="avatar">{{ e.name.slice(0, 1) }}</span><span class="tx"><strong>{{ e.name }}</strong><span>{{ e.done }} done, {{ e.open }} open</span></span><span class="pill">{{ e.done + e.open }}</span></div> }
          @empty { <div class="empty"><strong>Nobody assigned</strong>No video for {{ o().label }} carries an editor.</div> }
        </div></div>
    </div>
    @if (p.output.late.length) {
      <div class="sec"><div class="sec-head"><h3>Past their deadline</h3><span>{{ p.output.late.length }}</span></div>
        <div class="card list">
          @for (l of p.output.late.slice(0, 20); track l.title + l.client) { <div class="li"><span class="ic red"><bb-icon name="alert"/></span><span class="tx"><strong>{{ l.client }}: {{ l.title }}</strong><span>{{ l.stage }} · due {{ niceDate(l.deadline) }} · {{ l.days }} days · {{ l.editor || 'unassigned' }}</span></span></div> }
        </div></div>
    }
    <div class="sec"><div class="sec-head"><h3>Client by client</h3><span>{{ o().label }}</span></div>
      <div class="card">
        @if (screen.wide()) {
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Client</th><th class="num">Videos done</th><th class="num">Videos open</th><th class="num">Posts approved</th></tr></thead>
          <tbody>@for (c of perClient(); track c.name) { <tr class="plain"><td><strong>{{ c.name }}</strong></td><td class="num">{{ c.vd }}<span class="dim"> of {{ c.videos }}</span></td><td class="num">{{ c.vo }}</td><td class="num">{{ c.pd }}<span class="dim"> of {{ c.posts }}</span></td></tr> }</tbody></table></div>
        } @else {
          <div class="list">@for (c of perClient(); track c.name) { <div class="li"><span class="tx"><strong>{{ c.name }}</strong><span>{{ c.vd }} of {{ c.videos }} videos done, {{ c.vo }} open · {{ c.pd }} of {{ c.posts }} posts</span></span></div> }</div>
        }
      </div></div>
    <div class="sec"><div class="sec-head"><h3>Shoots ahead</h3><span>{{ p.shoots.upcoming.length }} booked</span></div>
      <div class="card list">
        @for (s of p.shoots.upcoming; track s.date + s.client) { <div class="li"><span class="ic"><bb-icon name="camera"/></span><span class="tx"><strong>{{ s.client }}</strong><span>{{ niceDate(s.date) }} · {{ s.videos || '?' }} videos · {{ s.stage }}</span></span></div> }
        @empty { <div class="empty"><strong>Nothing booked ahead</strong>The shoot table has no date from today on.</div> }
      </div></div>
    }`,
  styles: [`
    .k-val small{font-size:14px;font-weight:600;color:var(--muted)}.k-val.dim{color:var(--muted);font-size:18px}.k-val.warn{color:var(--red)}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:900px){.grid2{grid-template-columns:1fr}}
    .bars{padding:8px 16px}.bar-row{display:grid;grid-template-columns:118px 1fr 34px;gap:12px;align-items:center;min-height:36px}
    .bl{font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .track{height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden}.track i{display:block;height:100%;background:var(--blue);border-radius:4px}.track i.done{background:var(--green)}
    .bn{text-align:right;font-size:12.5px;font-weight:600}.dim{color:var(--muted);font-weight:400}
    .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted);flex-shrink:0}.ic.red{background:var(--red-soft);color:var(--red)}
    .tbl tbody tr.plain{cursor:default}`]
})
export class OutputComponent implements OnInit, OnDestroy {
  engine = inject(EngineService); screen = inject(ScreenService); private route = inject(ActivatedRoute); private router = inject(Router);
  p = this.engine.pub; niceDate = niceDate;
  which = signal<'this' | 'last'>('this'); private sub: any;
  ngOnInit(){ this.sub = this.route.queryParamMap.subscribe(q => this.which.set(q.get('m') === 'last' ? 'last' : 'this')); }
  ngOnDestroy(){ this.sub?.unsubscribe(); }
  go(m: 'this' | 'last'){ this.router.navigate([], { relativeTo: this.route, queryParams: { m }, queryParamsHandling: 'merge' }); }
  o = computed(() => this.which() === 'last' ? this.p()!.output.last_month : this.p()!.output.this_month);
  stages = computed(() => { const p = this.p()!; const o = this.o().videos.by_stage; const order: string[] = p.rules['video_stage_order']; const max = Math.max(1, ...Object.values(o));
    return order.filter(k => o[k]).map(k => ({ key: k, label: p.rules['video_stage_labels'][k] || k, n: o[k], w: Math.round(o[k] * 100 / max) })); });
  perClient = computed(() => { const o = this.o(); return this.p()!.clients.map(c => { const x = o.per_client[String(c.id)] || {}; return { name: c.name, videos: c.videos, posts: c.posts, vd: x.videos_done || 0, vo: x.videos_open || 0, pd: x.posts_done || 0 }; }).sort((a, b) => (b.vd + b.vo + b.pd) - (a.vd + a.vo + a.pd)); });
}
