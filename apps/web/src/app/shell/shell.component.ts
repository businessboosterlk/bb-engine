import { Component, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from '../core/session.service';
import { EngineService, longDate, stamp } from '../core/engine.service';
import { IconComponent } from '../ui/icon.component';
import { BottomMenuComponent, MenuTab, MenuAction } from './bottom-menu.component';
import { ThemeService } from '../core/theme.service';
import { UpdateService } from '../core/update.service';

export function setTop(color: string){
  document.documentElement.style.setProperty('--top', color);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', color);
}
export function pageColour(){ return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f5f5f7'; }
interface NavItem { path: string; label: string; icon: string; badge?: () => number; }
interface NavGroup { key: 'engine' | 'owner'; label: string; items: NavItem[]; }

/* The Hub's shell, one tenant. Desktop: a 232px rail with TWO groups, the Engine the whole team
   reads and the Owner's money. Phone: a 56px glass topbar and the floating bottom menu. */
@Component({
  selector: 'bb-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, BottomMenuComponent],
  template: `
    <div class="scrim" [class.on]="railOpen()" (click)="setRail(false)"></div>
    <aside class="rail" [class.open]="railOpen()" aria-label="Navigation">
      <div class="r-head">
        <img class="r-mark" src="assets/bb-logo-600.png" alt="Business Booster" width="834" height="338">
        <span class="r-eyebrow">The Engine</span>
        <div class="r-clock" aria-label="Time and date"><strong>{{ time() }}</strong><span>{{ date() }}</span></div>
        <a class="r-client" routerLink="/engine/machine" data-act="rail-home" (click)="setRail(false)" aria-label="Business Booster, the machine">
          <span class="r-mono">B</span><strong>Business Booster</strong>
        </a>
      </div>
      @for (g of groups; track g.key; let last = $last) {
        <div class="grp" [class.off]="collapsed().has(g.key)">
          <button class="grp-h" type="button" [attr.data-act]="'rail-group-' + g.key" (click)="toggle(g.key)" [attr.aria-expanded]="!collapsed().has(g.key)">
            <span>{{ g.label }}@if (g.key === 'owner' && engine.vault() !== 'open') { <bb-icon name="lock" class="lk"/> }</span><bb-icon name="chevd" class="chev"/>
          </button>
          <nav><div>
            @for (it of g.items; track it.path) {
              <a [routerLink]="'/' + g.key + '/' + it.path" routerLinkActive="on" ariaCurrentWhenActive="page" [attr.data-act]="'rail-' + it.path" (click)="setRail(false)">
                <bb-icon [name]="it.icon"/><span>{{ it.label }}</span>
                @if (it.badge && it.badge() > 0) { <span class="nb">{{ it.badge() }}</span> }
              </a>
            }
          </div></nav>
        </div>
        @if (!last) { <hr class="div"> }
      }
      <div class="r-foot">
        <span class="avatar">{{ session.initial() }}</span>
        <span class="who"><strong>{{ session.user() }}</strong><em>{{ session.role() }}</em></span>
        <button class="x" type="button" data-act="rail-theme" (click)="theme.toggle()" [attr.aria-label]="theme.dark() ? 'Day mode' : 'Night mode'" [attr.aria-pressed]="theme.dark()"><bb-icon [name]="theme.dark() ? 'sun' : 'moon'"/></button>
        <button class="x" type="button" data-act="rail-sign-out" (click)="out()" aria-label="Sign out"><bb-icon name="out"/></button>
      </div>
      <p class="r-build">Build {{ update.build }}</p>
    </aside>

    <div class="main">
      <header class="topbar" [class.scrolled]="scrolled()">
        <button class="x hamb" type="button" data-act="menu" (click)="setRail(true)" aria-label="Menu" [attr.aria-expanded]="railOpen()"><bb-icon name="menu"/></button>
        <div class="tt"><strong>{{ title() }}</strong><span>{{ engine.pub()?.month?.label }} · measured {{ measured() }}</span></div>
        <div class="tr">
          @if (engine.offline()) { <em class="off">Could not re-read the files</em> }
          <button class="x theme" type="button" data-act="theme" (click)="theme.toggle()" [attr.aria-label]="theme.dark() ? 'Day mode' : 'Night mode'" [attr.aria-pressed]="theme.dark()"><bb-icon [name]="theme.dark() ? 'sun' : 'moon'"/></button>
        </div>
      </header>
      <main class="page" [class.enter]="entering()">
        <router-outlet/>
      </main>
      <bb-bottom-menu class="tabs" [items]="tabs()" [active]="activeUrl()"/>
    </div>`,
  styles: [`
    :host{display:block}
    .rail{position:fixed;top:0;left:0;bottom:0;width:var(--side-w);background:var(--sidebar);color:var(--sidebar-txt);z-index:85;display:flex;flex-direction:column;padding:calc(18px + var(--sat)) 12px calc(14px + var(--sab));overflow-y:auto;overscroll-behavior:contain;border-right:1px solid var(--sidebar-line)}
    .r-head{display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 4px 14px;margin-bottom:10px;border-bottom:1px solid var(--sidebar-line)}
    .r-mark{width:156px;max-width:82%;height:auto;display:block;opacity:.96}
    .r-eyebrow{margin-top:10px;font-size:10.5px;font-weight:700;letter-spacing:.34em;text-indent:.34em;text-transform:uppercase;color:var(--sidebar-faint)}
    .r-clock{display:flex;flex-direction:column;align-items:center;gap:3px;margin:20px 0 18px}
    .r-clock strong{font-size:30px;font-weight:600;letter-spacing:-.025em;line-height:1;color:#fff;font-variant-numeric:tabular-nums}
    .r-clock span{font-size:12.5px;font-weight:500;color:var(--sidebar-txt)}
    .r-client{display:inline-flex;align-items:center;justify-content:center;gap:9px;max-width:100%;min-height:40px;padding:6px 12px;border-radius:10px;transition:background var(--dur) var(--ease)}
    @media (hover:hover){.r-client:hover{background:rgba(255,255,255,.06)}}
    .r-mono{width:26px;height:26px;border-radius:7px;background:var(--brand);color:var(--on-accent);display:grid;place-items:center;font-size:12.5px;font-weight:700;flex-shrink:0}
    .r-client strong{color:#fff;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .grp-h{display:flex;align-items:center;justify-content:space-between;width:100%;padding:8px 8px 6px;border:0;background:none;color:var(--sidebar-faint);font-size:11.5px;font-weight:600;border-radius:8px}
    .grp-h > span{display:inline-flex;align-items:center;gap:6px}.grp-h .lk{--ico:11px;opacity:.8}
    @media (hover:hover){.grp-h:hover{color:var(--sidebar-txt)}}.grp-h .chev{transition:transform var(--dur) var(--ease);--ico:14px}
    .grp.off .grp-h .chev{transform:rotate(-90deg)}
    .grp>nav{display:grid;grid-template-rows:1fr;transition:grid-template-rows 240ms var(--ease),opacity 200ms var(--ease)}
    .grp.off>nav{grid-template-rows:0fr;opacity:0;pointer-events:none}
    .grp>nav>div{min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:2px}
    nav a{position:relative;display:flex;align-items:center;gap:11px;min-height:40px;padding:0 10px;border-radius:9px;font-size:13.5px;font-weight:500;color:var(--sidebar-txt);transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}
    @media (hover:hover){nav a:hover{background:rgba(255,255,255,.06);color:#fff}}
    nav a.on{background:rgba(255,255,255,.08);color:#fff;font-weight:600}
    nav a.on::before{content:"";position:absolute;left:-12px;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--brand)}
    nav a bb-icon{--ico:17px;opacity:.85}nav a.on bb-icon{opacity:1;color:var(--brand)}
    .nb{margin-left:auto;font-size:11px;font-weight:700;background:var(--red);color:#fff;padding:calc(1px + .05em) 7px calc(1px - .05em);border-radius:999px}
    .div{border:0;border-top:1px solid var(--sidebar-line);margin:10px 4px}
    .r-build{margin:10px 4px 0;font-size:11px;color:var(--sidebar-txt);opacity:.8;font-variant-numeric:tabular-nums;text-align:center}
    .r-foot{margin-top:auto;display:flex;align-items:center;gap:10px;padding:14px 4px 0;border-top:1px solid var(--sidebar-line)}
    .r-foot .avatar{background:var(--brand);color:var(--on-accent)}
    .r-foot .who{flex:1;min-width:0}.r-foot strong{display:block;color:#fff;font-size:13px}.r-foot em{display:block;font-style:normal;font-size:11px;color:var(--sidebar-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .r-foot .x{color:var(--sidebar-faint)}@media (hover:hover){.r-foot .x:hover{background:rgba(255,255,255,.08);color:#fff}}
    .main{margin-left:var(--side-w);min-height:100dvh;display:flex;flex-direction:column}
    .topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;height:calc(var(--top-h) + var(--sat));padding:var(--sat) 24px 0;background:var(--glass);backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);transition:box-shadow 160ms var(--ease)}
    .topbar.scrolled{box-shadow:inset 0 -1px var(--line)}
    .hamb{display:none}
    .tt{flex:1;min-width:0}.tt strong{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tt span{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tr{display:flex;gap:6px;align-items:center}.theme{color:var(--muted)}@media (hover:hover){.theme:hover{color:var(--ink)}}
    .tr .off{font-style:normal;font-size:10.5px;font-weight:600;color:var(--amber);background:var(--amber-soft);padding:3px 8px;border-radius:999px;white-space:nowrap}
    .page{flex:1}
    .page.enter{animation:pageIn 220ms var(--ease) backwards}
    @keyframes pageIn{from{opacity:0}to{opacity:1}}
    @media (prefers-reduced-motion:reduce){.page.enter{animation:none}}
    .tabs{display:none}
    @media (max-width:1019px){
      .rail{transform:translateX(-24px);opacity:0;visibility:hidden;transition:transform 240ms var(--ease),opacity 240ms var(--ease),visibility 0s 240ms;box-shadow:var(--sh-lg)}
      .rail.open{transform:none;opacity:1;visibility:visible;transition:transform 240ms var(--ease),opacity 240ms var(--ease)}
      .main{margin-left:0}
      .hamb{display:grid}
      .topbar{padding:var(--sat) 16px 0 8px}
      .page{padding:12px 16px calc(96px + var(--sab))}
      .tr .off{display:none}
      .tabs{display:block}
    }`]
})
export class ShellComponent implements OnInit, OnDestroy {
  session = inject(SessionService); engine = inject(EngineService); theme = inject(ThemeService); update = inject(UpdateService);
  scrolled = signal(false);
  @HostListener('window:scroll') onScroll(){ if (document.body.classList.contains('sheet-open')) return; const v = scrollY > 2; if (v !== this.scrolled()) this.scrolled.set(v); }
  private route = inject(ActivatedRoute); private router = inject(Router);
  railOpen = signal(false);
  private railLockY = 0;
  setRail(open: boolean){
    if (open === this.railOpen()) return;
    this.railOpen.set(open);
    if (innerWidth >= 1020) return;
    const b = document.body;
    if (open) { this.railLockY = scrollY; b.style.top = `-${this.railLockY}px`; b.classList.add('sheet-open', 'rail-lock'); }
    else if (b.classList.contains('rail-lock')) { b.classList.remove('sheet-open', 'rail-lock'); b.style.top = ''; scrollTo(0, this.railLockY); }
  }
  system = signal<'engine' | 'owner'>('engine');
  title = signal(''); time = signal(''); date = signal('');
  collapsed = signal(new Set<string>());
  private timer: any; private sub: any;
  measured = computed(() => stamp(this.engine.pub()?.generated));
  groups: NavGroup[] = [
    { key: 'engine', label: 'The engine', items: [
      { path: 'machine', label: 'The machine', icon: 'gauge' }, { path: 'clients', label: 'Clients', icon: 'users' },
      { path: 'capacity', label: 'Capacity', icon: 'activity' }, { path: 'output', label: 'Output', icon: 'clapperboard' },
      { path: 'alerts', label: 'Alerts', icon: 'alert', badge: () => this.engine.red() } ] },
    { key: 'owner', label: 'Owner', items: [
      { path: 'money', label: 'Money', icon: 'wallet' }, { path: 'people', label: 'People', icon: 'user' }, { path: 'forecast', label: 'Forecast', icon: 'trend' } ] }
  ];
  activeUrl = signal('');
  entering = signal(false);
  tabs = computed<MenuTab[]>(() => {
    const sys = this.system();
    const menus: Record<string, MenuAction[]> = {
      machine: [ { id: 'machine-3d', label: 'See it in 3D', icon: 'rotate3d', link: '/engine/machine', params: { view: '3d' } }, { id: 'machine-flat', label: 'Flat view', icon: 'grid', link: '/engine/machine', params: {} }, { id: 'machine-alerts', label: 'Alerts', icon: 'alert', link: '/engine/alerts' } ],
      clients: [ { id: 'clients-soon', label: 'Ending in 60 days', icon: 'clock', link: '/engine/clients', params: { f: 'soon' } }, { id: 'clients-all', label: 'All clients', icon: 'users', link: '/engine/clients', params: {} } ],
      capacity: [],
      output: [ { id: 'output-this', label: 'This month', icon: 'calendar', link: '/engine/output', params: { m: 'this' } }, { id: 'output-last', label: 'Last month', icon: 'calendar', link: '/engine/output', params: { m: 'last' } } ],
      alerts: [],
      money: this.engine.vault() === 'open' ? [ { id: 'money-lock', label: 'Lock money on this device', icon: 'lock', run: () => this.engine.lockOwner() } ] : [],
      people: [],
      forecast: [ { id: 'forecast-today', label: "Today's 23 only", icon: 'users', link: '/owner/forecast', params: { s: 'today:none' } }, { id: 'forecast-one', label: 'One a month, web and system', icon: 'trend', link: '/owner/forecast', params: { s: 'one:both' } }, { id: 'forecast-seven', label: '30 clients, web and system', icon: 'trend', link: '/owner/forecast', params: { s: 'seven:both' } } ]
    };
    return this.groups.find(g => g.key === sys)!.items.map(it => ({ ...it, path: '/' + sys + '/' + it.path, menu: menus[it.path] || [] }));
  });
  ngOnInit(){
    document.body.classList.add('in-shell'); setTop(pageColour());
    this.system.set(this.route.snapshot.data['system']);
    this.collapsed.set(new Set([this.system() === 'engine' ? 'owner' : 'engine']));
    this.readTitle(); this.theme.apply();
    this.sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const was = this.activeUrl(); this.readTitle();
      if (was && was !== this.activeUrl()) { scrollTo(0, 0); this.scrolled.set(false); this.entering.set(false); requestAnimationFrame(() => this.entering.set(true)); }
    });
    this.tick(); this.timer = setInterval(() => this.tick(), 15000);
  }
  ngOnDestroy(){ this.setRail(false); document.body.classList.remove('in-shell'); clearInterval(this.timer); this.sub?.unsubscribe(); }
  private readTitle(){ let r = this.route; while (r.firstChild) r = r.firstChild; this.title.set(r.snapshot.data['title'] || ''); this.activeUrl.set(this.router.url.split('?')[0]); }
  private tick(){ const d = new Date(); this.time.set(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`); this.date.set(longDate(d)); }
  toggle(k: string){ const s = new Set(this.collapsed()); s.has(k) ? s.delete(k) : s.add(k); this.collapsed.set(s); }
  out(){ this.setRail(false); this.session.logout(); this.router.navigate(['/login']); }
  @HostListener('document:keydown.escape') esc(){ this.setRail(false); }
}
