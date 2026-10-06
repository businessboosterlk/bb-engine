import { Component, inject, computed } from '@angular/core';
import { EngineService } from '../../core/engine.service';
import { RingComponent } from '../../ui/ring.component';

/* CAPACITY IS A PER-PERSON QUESTION, never an average (the Engine Room rule). Every seat: how full,
   who sits in it, what each person carries where a system records it, and the rule it is measured
   against. Then the one number everybody asks for: how many more clients before something is full. */
@Component({
  selector: 'bb-capacity',
  standalone: true,
  imports: [RingComponent],
  template: `
    @if (p(); as p) {
    <div class="ph"><div><h1 class="t-h1">Capacity</h1><p>Room for <strong>{{ room().n }}</strong> more Studio {{ room().n === 1 ? 'client' : 'clients' }} before {{ room().seat }} is full. A Studio client is 8 posts, 4 videos and 12 stories a month.</p></div></div>
    <div class="seats">
      @for (s of p.seats; track s.key) {
        <div class="card seat" [id]="s.key">
          <div class="top"><bb-ring [pct]="s.pct || 0" [warn]="p.rules['near_capacity_pct']" [label]="s.label"/>
            <div><h2 class="t-h2">{{ s.label }}</h2><p class="t-small">{{ s.load }} of {{ s.capacity }} {{ s.unit }} · {{ s.spare >= 0 ? s.spare + ' spare' : (-s.spare) + ' over' }}</p><p class="rule">{{ s.rule }}</p></div></div>
          <div class="people">
            @for (w of who(s.key); track w.name) {
              <div class="row"><span class="avatar">{{ w.name.slice(0, 1) }}</span><span class="nm">{{ w.name }}</span>
                @if (w.load !== null) { <span class="track"><i [style.width.%]="w.w"></i></span><span class="n num">{{ w.load }}<em> {{ w.unit }}</em></span> } @else { <span class="n dim">not measured by a system</span> }
              </div>
            } @empty { <div class="row"><span class="dim">Nobody in this seat on the team list</span></div> }
          </div>
        </div>
      }
    </div>
    <div class="grid2">
      <div class="sec"><div class="sec-head"><h3>What a new Studio client costs each seat</h3></div>
        <div class="card bars">
          @for (r of perClient(); track r.label) { <div class="bar-row"><span class="bl">{{ r.label }}</span><span class="bn">{{ r.text }}</span></div> }
        </div></div>
      <div class="sec"><div class="sec-head"><h3>Development</h3><span>{{ p.devs.length }} {{ p.devs.length === 1 ? 'person' : 'people' }}</span></div>
        <div class="card list">
          @for (d of p.devs; track d) { <div class="li"><span class="avatar">{{ d.slice(0, 1) }}</span><span class="tx"><strong>{{ d }}</strong><span>Websites and systems. One build line each; sold work is not yet measured by a system</span></span></div> }
        </div></div>
    </div>
    }`,
  styles: [`
    .seats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    @media (max-width:900px){.seats{grid-template-columns:minmax(0,1fr)}}
    .seat{padding:18px}
    .top{display:flex;gap:16px;align-items:center}.top bb-ring{--size:92px;flex-shrink:0}
    .rule{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.45}
    .people{margin-top:14px;border-top:1px solid var(--line);padding-top:6px}
    .row{display:grid;grid-template-columns:30px 1fr minmax(60px,120px) auto;gap:10px;align-items:center;min-height:42px}
    .row .nm{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .track{height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden}.track i{display:block;height:100%;background:var(--brand);border-radius:3px}
    .n{font-size:12.5px;font-weight:600;white-space:nowrap}.n em{font-style:normal;font-weight:500;color:var(--muted)}
    .dim{color:var(--muted);font-size:12.5px;font-weight:400;grid-column:3/-1}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media (max-width:900px){.grid2{grid-template-columns:1fr}}
    .bars{padding:8px 16px}.bar-row{display:flex;justify-content:space-between;gap:12px;min-height:40px;align-items:center;border-top:1px solid var(--line)}.bar-row:first-child{border-top:0}
    .bl{font-size:13px}.bn{font-size:12.5px;color:var(--muted);text-align:right}`]
})
export class CapacityComponent {
  engine = inject(EngineService); p = this.engine.pub;
  who = (key: string) => {
    const p = this.p()!; const s = p.seats.find(x => x.key === key)!;
    if (key === 'smm') { const by: Record<string, number> = {}; p.clients.forEach(c => { if (c.smm) by[c.smm] = (by[c.smm] || 0) + 1; }); return s.people.map(n => ({ name: n, load: by[n] || 0, w: Math.min(100, (by[n] || 0) * 100 / p.rules['smm_cap_per_seat']), unit: 'clients' })); }
    if (key === 'edit') { const e = p.output.this_month.by_editor; return s.people.map(n => { const r = e.find(x => x.name === n); const load = r ? r.done + r.open : 0; return { name: n, load, w: Math.min(100, load * 100 / p.rules['editor_videos_per_month']), unit: 'videos this month' }; }); }
    if (key === 'shoot') return s.people.map(n => ({ name: n, load: p.shoots.this_month, w: Math.min(100, p.shoots.this_month * 100 / p.rules['shoot_days_per_month']), unit: 'shoot days this month' }));
    return s.people.map(n => ({ name: n, load: null as number | null, w: 0, unit: '' }));
  };
  room = computed(() => { const p = this.p()!; const by = (k: string) => p.seats.find(s => s.key === k)!;
    const c = [{ seat: 'Social media', n: Math.max(0, by('smm').spare) }, { seat: 'Design', n: Math.max(0, by('design').spare) }, { seat: 'Editing', n: Math.max(0, Math.floor(by('edit').spare / 4)) }];
    return c.sort((a, b) => a.n - b.n)[0]; });
  perClient = computed(() => { const p = this.p()!; return [
    { label: 'Social media', text: `1 of ${p.rules['smm_cap_per_seat']} on a manager's book` },
    { label: 'Design', text: `8 posts and 12 stories, about 1 of ${p.rules['design_clients_per_designer']} on a designer` },
    { label: 'Editing', text: `4 videos of ${p.rules['edit_capacity_videos_per_month']} a month, an editor adds ${p.rules['editor_videos_per_month']}` },
    { label: 'Shooting', text: 'about one shoot day a quarter when shot in a batch' } ]; });
}
