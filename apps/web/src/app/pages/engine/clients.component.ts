import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EngineService, niceDate } from '../../core/engine.service';
import { ScreenService } from '../../core/screen.service';
import { IconComponent } from '../../ui/icon.component';
import { FilterBarComponent, FilterDef } from '../../ui/filter-bar.component';
import { DrawerComponent } from '../../ui/drawer.component';
import { MoreComponent, WINDOW } from '../../ui/more.component';
import { ClientRow } from '../../core/models';

/* EVERY CLIENT, one row each. The floor from bb-build-on-the-best: a filter that matters, search,
   sort on every ordered column, a drill-down, an empty state that says what to do, copy and print.
   No fee on this screen: fees are the owner's. */
@Component({
  selector: 'bb-clients',
  standalone: true,
  imports: [IconComponent, FilterBarComponent, DrawerComponent, MoreComponent],
  template: `
    <div class="ph"><div><h1 class="t-h1">Clients</h1><p>{{ rows().length }} of {{ all().length }} clients. {{ soonCount() }} end within 60 days.</p></div>
      <div class="ph-right"><button class="btn ghost sm" type="button" data-act="clients-copy" (click)="copy()"><bb-icon name="copy"/><span>{{ copied() ? 'Copied' : 'Copy as text' }}</span></button>
      <button class="btn ghost sm" type="button" data-act="clients-print" (click)="print()"><bb-icon name="printer"/><span>Print</span></button></div></div>
    <bb-filter-bar [state]="filters" [query]="query" [defs]="defs()" placeholder="Search clients" [count]="rows().length" noun="client" nouns="clients" store="clients"/>
    <div class="card">
      @if (screen.wide()) {
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>
            @for (c of cols; track c.key) { <th [class.num]="c.num"><button type="button" class="sort" [attr.data-act]="'sort-' + c.key" (click)="sortBy(c.key)" [attr.aria-sort]="sort().key === c.key ? (sort().dir > 0 ? 'ascending' : 'descending') : 'none'">{{ c.label }}@if (sort().key === c.key) { <bb-icon [name]="sort().dir > 0 ? 'chevd' : 'chev'" class="sc" [class.up]="sort().dir < 0"/> }</button></th> }
          </tr></thead>
          <tbody>
            @for (r of shown(); track r.id) {
              <tr data-act="client-open" tabindex="0" (click)="open.set(r)" (keydown.enter)="open.set(r)">
                <td><div class="who"><span class="avatar">{{ r.name.slice(0, 1) }}</span><div><strong>{{ r.name }}</strong><span>{{ r.package }}</span></div></div></td>
                <td>{{ r.smm || 'Nobody' }}</td>
                <td class="num">{{ r.posts }} / {{ r.videos }} / {{ r.stories }}</td>
                <td class="num">{{ r.output.videos_done || 0 }}<span class="dim"> of {{ r.videos }}</span></td>
                <td>@if (r.renewal) { <span class="pill" [class.red]="(r.ends_in || 0) <= 14" [class.amber]="(r.ends_in || 0) > 14 && (r.ends_in || 0) <= 60">{{ niceDate(r.renewal) }}</span> } @else { <span class="dim">No end recorded</span> }</td>
              </tr>
            } @empty { <tr><td colspan="5"><div class="empty"><strong>No client matches</strong>Clear the filters or search for another name.</div></td></tr> }
          </tbody></table></div>
      } @else {
        <div class="list phone">
          @for (r of shown(); track r.id) {
            <button type="button" class="li link" data-act="client-open" (click)="open.set(r)">
              <span class="avatar">{{ r.name.slice(0, 1) }}</span>
              <span class="tx"><strong>{{ r.name }}</strong><span>{{ r.smm || 'Nobody' }} · {{ r.posts }} posts, {{ r.videos }} videos{{ r.renewal ? ' · ends ' + niceDate(r.renewal) : '' }}</span></span>
              <bb-icon name="chev" class="go"/>
            </button>
          } @empty { <div class="empty"><strong>No client matches</strong>Clear the filters or search for another name.</div> }
        </div>
      }
      <bb-more [total]="rows().length" [shown]="shown().length" (more)="limit.set(limit() + 30)"/>
    </div>

    <bb-drawer [title]="open()?.name || ''" [open]="!!open()" (closed)="open.set(null)">
      <ng-template #body>
        @if (open(); as r) {
          <div class="sheet-pills"><span class="pill brand">{{ r.package }}</span>@if (r.renewal) { <span class="pill" [class.amber]="(r.ends_in || 0) <= 60">Ends {{ niceDate(r.renewal) }}</span> }</div>
          <dl class="facts">
            <div class="f"><dt>Social media manager</dt><dd [class.none]="!r.smm">{{ r.smm || 'Nobody assigned' }}</dd></div>
            <div class="f"><dt>Contract ends</dt><dd [class.none]="!r.renewal">{{ r.renewal ? niceDate(r.renewal) + (r.ends_in !== null ? (r.ends_in < 0 ? ', ' + (-r.ends_in) + ' days past' : ', in ' + r.ends_in + ' days') : '') : 'No end date recorded' }}</dd></div>
            <div class="f"><dt>Posts a month</dt><dd>{{ r.posts }}</dd></div>
            <div class="f"><dt>Videos a month</dt><dd>{{ r.videos }}</dd></div>
            <div class="f"><dt>Stories a month</dt><dd>{{ r.stories }}</dd></div>
            <div class="f"><dt>Videos done this month</dt><dd>{{ r.output.videos_done || 0 }} of {{ r.videos }}{{ r.output.videos_open ? ', ' + r.output.videos_open + ' in the system' : '' }}</dd></div>
            <div class="f"><dt>Posts approved this month</dt><dd>{{ r.output.posts_done || 0 }} of {{ r.posts }}</dd></div>
            <div class="f"><dt>Notes in the Command Centre</dt><dd [class.none]="!r.has_note">{{ r.has_note ? 'Yes, read them there' : 'None' }}</dd></div>
          </dl>
        }
      </ng-template>
    </bb-drawer>`,
  styles: [`
    .sort{display:inline-flex;align-items:center;gap:4px;border:0;background:none;padding:0;font:inherit;color:inherit;font-weight:600}
    .sc{--ico:12px;color:var(--muted)}.sc.up{transform:rotate(-90deg)}
    .dim{color:var(--muted);font-weight:400}
    .pill.amber{background:var(--amber-soft);color:var(--amber);border-color:transparent}.pill.red{background:var(--red-soft);color:var(--red);border-color:transparent}
    @media print{.ph-right,bb-filter-bar,bb-more{display:none}}`]
})
export class ClientsComponent implements OnInit, OnDestroy {
  engine = inject(EngineService); screen = inject(ScreenService); private route = inject(ActivatedRoute); private router = inject(Router);
  niceDate = niceDate;
  filters = signal<Record<string, string>>({}); query = signal(''); limit = signal(WINDOW);
  sort = signal<{ key: string; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  open = signal<ClientRow | null>(null); copied = signal(false); private sub: any;
  cols = [{ key: 'name', label: 'Client' }, { key: 'smm', label: 'Manager' }, { key: 'posts', label: 'Posts / videos / stories', num: true }, { key: 'done', label: 'Videos done', num: true }, { key: 'renewal', label: 'Contract ends' }];
  all = computed(() => this.engine.pub()?.clients || []);
  soonCount = computed(() => this.all().filter(r => r.ends_in !== null && r.ends_in <= 60).length);
  defs = computed<FilterDef[]>(() => [
    { key: 'smm', label: 'Manager', all: 'Every manager', options: [...new Set(this.all().map(r => r.smm || 'Nobody'))].sort().map(v => ({ value: v, label: v })) },
    { key: 'ends', label: 'Contract', all: 'Any contract', options: [{ value: 'soon', label: 'Ends within 60 days' }, { value: 'quarter', label: 'Ends within 90 days' }, { value: 'none', label: 'No end recorded' }] },
    { key: 'package', label: 'Package', all: 'Every package', options: [...new Set(this.all().map(r => r.package || 'None'))].sort().map(v => ({ value: v, label: v })) },
  ]);
  rows = computed(() => {
    const f = this.filters(), q = this.query().trim().toLowerCase(); const s = this.sort();
    const val = (r: ClientRow) => s.key === 'done' ? (r.output.videos_done || 0) : s.key === 'renewal' ? (r.renewal || '9999') : s.key === 'posts' ? r.posts : (r as any)[s.key] || '';
    return this.all().filter(r => (!q || r.name.toLowerCase().includes(q) || (r.smm || '').toLowerCase().includes(q) || (r.package || '').toLowerCase().includes(q))
      && (!f['smm'] || (r.smm || 'Nobody') === f['smm']) && (!f['package'] || (r.package || 'None') === f['package'])
      && (!f['ends'] || (f['ends'] === 'none' ? !r.renewal : r.ends_in !== null && r.ends_in <= (f['ends'] === 'soon' ? 60 : 90))))
      .sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * s.dir; });
  });
  shown = computed(() => this.rows().slice(0, this.limit()));
  ngOnInit(){ this.sub = this.route.queryParamMap.subscribe(q => {
    if (q.get('f') === 'soon') this.filters.set({ ...this.filters(), ends: 'soon' }); else if (q.has('f')) this.filters.set({});
    const o = q.get('open'); if (o) { const r = this.all().find(x => x.name === o); if (r) this.open.set(r); } }); }
  ngOnDestroy(){ this.sub?.unsubscribe(); }
  sortBy(key: string){ const s = this.sort(); this.sort.set({ key, dir: s.key === key ? (s.dir > 0 ? -1 : 1) : 1 }); }
  async copy(){ const lines = [['Client', 'Package', 'Manager', 'Posts', 'Videos', 'Stories', 'Videos done', 'Contract ends'].join('\t'), ...this.rows().map(r => [r.name, r.package, r.smm || 'Nobody', r.posts, r.videos, r.stories, r.output.videos_done || 0, r.renewal || 'none'].join('\t'))];
    const text = lines.join('\n'); let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch {} t.remove(); }
    if (ok) { this.copied.set(true); setTimeout(() => this.copied.set(false), 1600); } }
  print(){ window.print(); }
}
