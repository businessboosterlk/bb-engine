import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seat } from '../../core/models';
import { IconComponent } from '../../ui/icon.component';

/* THE MACHINE IN 3D, AS A FACTORY FLOOR. Thulaib, 7 Oct 2026: "show it like a factory, it needs to look
   premium", then the art direction he brought back the same morning: a precision industrial sculpture
   photographed in a dark studio. One production line runs left to right in the order work really moves:
   shoot, edit, design, social. Each seat is a station. Its WIDTH is the seat's capacity, the TANK on its
   roof fills to its load, the tank and the slot carry its state (green, amber, red, nothing else in the
   machine is coloured), and its PRESS stamps more often the harder the seat runs, resting between stamps.
   On a phone the line is too wide to read whole, so the phone looks through a window at one station, the
   neighbours at the edges, a swipe moves along the line and the switcher sits under the stage.
   Opening the view runs one wake up: the camera settles, each station wakes in turn, its tank rises to
   the measured level, a light runs the rail. Once only, never for reduced motion.
   Kept from bb-3d-ux: authored home framing fitted to the stage, selection dims the rest, THE SWITCH,
   tap versus drag at 7px, DOM captions, lazy load, paused when hidden, everything disposed on destroy.
   dbg() and step(n) keep it an instrument. */
export interface Flow { clients: number; videosDone: number; videosContracted: number; postsDone: number; postsContracted: number; newClients?: number; }
const ORDER = ['shoot', 'edit', 'design', 'smm'];
const C = { bg: 0x07080a, floor: 0x0c0e11, body: 0x181b20, face: 0x0c0e12, trim: 0x858b94, glass: 0xcbd4df, belt: 0x0e1013, parcel: 0xd3cfc6 };
@Component({
  selector: 'bb-machine3d',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="stage" #stage>
      <canvas #canvas aria-hidden="true"></canvas>
      @if (state() === 'loading') { <div class="veil"><span class="spin" aria-hidden="true"></span><span>Starting the floor</span></div> }
      @if (state() === 'failed') { <div class="veil" role="status"><strong>The 3D view could not start.</strong><span>{{ fail() }} The flat view below has every number.</span></div> }
      @if (state() === 'ready') {
        @if (!narrow()) {
          <div class="caps" [class.away]="!!selected()">
            @for (l of labels(); track l.key) {
              <button type="button" class="cap" [style.left.px]="l.x" [style.top.px]="l.y" [attr.data-act]="'gear-' + l.key" (click)="select(l.key)">
                <span class="cn"><i class="dot" [class.amber]="l.pct >= 85 && l.pct < 100" [class.red]="l.pct >= 100"></i>{{ l.label }}</span>
                <span class="cp">{{ l.pct }}<em>%</em></span>
                <span class="cs">{{ l.sub }}</span>
              </button>
            }
            @if (intake(); as t) { <div class="tag" [style.left.px]="t.x" [style.top.px]="t.y">{{ t.text }}</div> }
          </div>
          @if (sel(); as s) {
            <div class="scard">
              <span class="sk">Station {{ place(s.key) }} of {{ line().length }}</span>
              <strong>{{ s.label }}</strong>
              <span class="big"><i class="dot lg" [class.amber]="(s.pct || 0) >= 85 && (s.pct || 0) < 100" [class.red]="(s.pct || 0) >= 100"></i>{{ s.pct }}%</span>
              <span>{{ s.load }} of {{ s.capacity }} {{ s.unit }}, {{ s.spare >= 0 ? s.spare + ' spare' : (-s.spare) + ' over' }}</span>
              <span class="rule">{{ s.rule }}</span>
              <div class="others" role="group" aria-label="Switch station">
                @for (o of line(); track o.key) { @if (o.key !== s.key) { <button type="button" class="oth" [attr.data-act]="'gear-' + o.key" (click)="select(o.key)">{{ o.label }}<em>{{ o.pct }}%</em></button> } }
              </div>
              <div class="row"><a class="btn sm" data-act="gear-open" routerLink="/engine/capacity" [fragment]="s.key">Open the station</a><button type="button" class="btn sm ghost-dark" data-act="gear-reset" (click)="reset()">Whole floor</button></div>
            </div>
          }
        }
        @if (hint()) { <p class="hint">{{ narrow() ? 'Swipe to move along the line' : 'Drag to look round. Tap a station to open it' }}</p> }
        <button type="button" class="home" data-act="gear-home" (click)="reset()" aria-label="Home view"><bb-icon name="refresh"/></button>
      }
    </div>
    @if (state() === 'ready' && narrow()) {
      <div class="pane">
        @if (shown(); as s) {
          <div class="pl">
            <span class="pn"><i class="dot" [class.amber]="(s.pct || 0) >= 85 && (s.pct || 0) < 100" [class.red]="(s.pct || 0) >= 100"></i>{{ s.label }}<span class="pk">Station {{ place(s.key) }} of {{ line().length }}</span></span>
            <span class="pp">{{ s.pct }}<em>%</em></span>
            <span class="ps">{{ s.load }} of {{ s.capacity }} {{ s.unit }}, {{ s.spare >= 0 ? s.spare + ' spare' : (-s.spare) + ' over' }}</span>
          </div>
          @if (selected()) { <div class="row"><a class="btn sm" data-act="gear-open" routerLink="/engine/capacity" [fragment]="s.key">Open the station</a><button type="button" class="btn sm ghost" data-act="gear-reset" (click)="reset()">Light all four</button></div> }
        }
        <div class="steps" role="group" aria-label="Stations in order">
          @for (o of line(); track o.key) {
            <button type="button" class="step" [class.on]="shown()?.key === o.key" [attr.data-act]="'gear-' + o.key" (click)="select(o.key)">
              <i class="dot" [class.amber]="(o.pct || 0) >= 85 && (o.pct || 0) < 100" [class.red]="(o.pct || 0) >= 100"></i><span>{{ o.label }}</span>
            </button>
          }
        </div>
      </div>
    }`,
  styles: [`
    :host{display:block;margin-bottom:16px}
    .stage{position:relative;height:min(58vh,540px);min-height:380px;overflow:hidden;border-radius:16px;background:#07080a;touch-action:none;isolation:isolate}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .veil{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;font-size:13.5px;padding:24px;text-align:center}
    .veil strong{font-size:15px}.veil span{opacity:.8;max-width:420px}
    .spin{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;animation:sp 900ms linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){.spin{animation:none}}
    .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#55c990;flex-shrink:0}.dot.amber{background:#dea844}.dot.red{background:#dd625c}
    /* captions: one baseline in front of the line; the number is white, the dot and the tank carry the state */
    .caps{position:absolute;inset:0;pointer-events:none}
    .caps.away{display:none}
    .cap{position:absolute;transform:translate(-50%,0);pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:128px;padding:8px 12px;border:1px solid transparent;border-radius:12px;background:transparent;color:#fff;text-align:center;transition:background 160ms var(--ease),border-color 160ms var(--ease)}
    @media (hover:hover){.cap:hover{background:rgba(255,255,255,.035);border-color:rgba(255,255,255,.06)}}
    .cap:focus-visible{background:rgba(255,255,255,.035);border-color:rgba(226,185,138,.5);outline:none}
    .cn{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:rgba(255,255,255,.72);letter-spacing:.06em;text-transform:uppercase}
    .cp{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;font-variant-numeric:tabular-nums;color:#fff}
    .cp em,.pp em{font-style:normal;font-size:.5em;font-weight:600;margin-left:1px;color:rgba(255,255,255,.55)}
    .cs{font-size:12px;font-weight:500;color:rgba(255,255,255,.55);white-space:nowrap;font-variant-numeric:tabular-nums}
    .tag{position:absolute;transform:translate(-50%,0);font-size:11.5px;font-weight:600;color:rgba(255,255,255,.62);white-space:nowrap;font-variant-numeric:tabular-nums}
    /* the selected station reads inside the scene, top left */
    .scard{position:absolute;left:16px;top:16px;width:min(300px,calc(100% - 88px));padding:14px 16px;display:grid;gap:3px;border-radius:14px;background:rgba(12,13,16,.82);border:1px solid rgba(255,255,255,.06);color:#fff;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
    .scard .sk{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.04em}
    .scard strong{font-size:16px}
    .scard .big{display:inline-flex;align-items:center;gap:9px;font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.15;color:#fff;font-variant-numeric:tabular-nums}
    .dot.lg{width:9px;height:9px}
    .scard span{font-size:12.5px;color:rgba(255,255,255,.72)}.scard .rule{font-size:11.5px;color:rgba(255,255,255,.5)}
    .scard .row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    /* THE SWITCH (bb-3d-ux gate 3): from one station straight to another, no close step */
    .others{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .oth{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.82);font-size:12px;font-weight:600}
    .oth em{font-style:normal;font-weight:500;color:rgba(255,255,255,.5);font-variant-numeric:tabular-nums}
    @media (hover:hover){.oth:hover{background:rgba(255,255,255,.06)}}
    @media (pointer:coarse){.oth{min-height:40px}}
    .ghost-dark{background:transparent;color:#fff;border-color:rgba(255,255,255,.12)}
    @media (hover:hover){.ghost-dark:hover{background:rgba(255,255,255,.08)}}
    .hint{position:absolute;left:18px;top:18px;margin:0;font-size:12px;color:rgba(255,255,255,.45);animation:hint 4.2s var(--ease) forwards;pointer-events:none}
    @keyframes hint{0%,80%{opacity:1}100%{opacity:0}}
    @media (prefers-reduced-motion:reduce){.hint{animation:none}}
    .home{position:absolute;right:14px;top:14px;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.75);display:grid;place-items:center;--ico:16px}
    @media (hover:hover){.home:hover{background:rgba(255,255,255,.06);color:#fff}}
    @media (pointer:coarse){.home{width:44px;height:44px;right:10px;top:10px}}
    /* phone: the window on the line, then one label and the four steps under the stage */
    @media (max-width:719px){.stage{height:470px;min-height:0}}
    .pane{margin-top:12px;display:grid;gap:12px}
    .pl{display:grid;justify-items:center;gap:2px;text-align:center}
    .pn{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
    .pk{letter-spacing:0;text-transform:none;font-weight:500;opacity:.8}
    .pp{font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.1;font-variant-numeric:tabular-nums;color:var(--ink)}
    .pp em{color:var(--muted)}
    .ps{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}
    .pane .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .pane .row .btn{width:100%;justify-content:center;min-height:44px}
    .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:4px;border-radius:14px;background:var(--surface-2)}
    .step{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:52px;padding:6px 4px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-size:11.5px;font-weight:600;line-height:1.15;text-align:center}
    .step span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .step.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.12)}`]
})
export class Machine3dComponent implements AfterViewInit, OnDestroy {
  @Input() seats: Seat[] = []; @Input() month = ''; @Input() flow: Flow | null = null;
  @ViewChild('stage') stageRef!: ElementRef<HTMLDivElement>; @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private zone = inject(NgZone);
  state = signal<'loading' | 'ready' | 'failed'>('loading'); fail = signal('');
  selected = signal<string | null>(null);
  focus = signal<string | null>(null);
  narrow = signal(false); hint = signal(true);
  labels = signal<{ key: string; label: string; pct: number; sub: string; x: number; y: number }[]>([]);
  intake = signal<{ text: string; x: number; y: number } | null>(null);
  /* the seats in the order work moves down the line; a seat the order does not know goes last */
  line = () => [...this.seats].sort((a, b) => rank(a.key) - rank(b.key));
  place = (key: string) => this.line().findIndex(s => s.key === key) + 1;
  sel = () => this.seats.find(s => s.key === this.selected()) || null;
  shown = (): Seat | null => this.seats.find(s => s.key === (this.selected() || this.focus())) || this.line()[0] || null;
  private T: any; private scene: any; private cam: any; private renderer: any; private controls: any; private pmrem: any;
  private stations: { key: string; body: any; parts: any[]; head: any; fill: any; level: number; slot: any; period: number; x: number; w: number; phase: number; wakeAt: number }[] = [];
  private parcels: any[] = []; private beltTex: any = null; private sweep: any = null;
  private raf = 0; private alive = true; private home = { pos: [0, 4, 12], target: [0, 1, 0] }; private tween: any = null; private last = 0; private clock = 0;
  private wake = { t0: 0, dur: 1800, done: false };
  private down: { x: number; y: number } | null = null; private visible = true; private reduced = false;
  private span = { left: -6, right: 6 }; private beltY = .62; private beltZ = .55; private intakeX = -6; private hintTimer: any;
  private onVis = () => { this.visible = document.visibilityState === 'visible'; if (this.visible) this.loop(); };

  async ngAfterViewInit(){
    try {
      const canvas = this.canvasRef.nativeElement;
      if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) throw new Error('This browser has no WebGL.');
      const T = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
      this.T = T; if (!this.alive) return;
      this.build(T, OrbitControls, RoomEnvironment, RoundedBoxGeometry);
      this.state.set('ready');
      this.hintTimer = setTimeout(() => this.hint.set(false), 4300);
      document.addEventListener('visibilitychange', this.onVis);
      (window as any).__m3d = { dbg: () => this.dbg(), step: (n = 1) => { for (let i = 0; i < n; i++) this.frame(1 / 60, true); return this.dbg(); }, select: (k: string) => this.select(k), reset: () => this.reset() };
      this.zone.runOutsideAngular(() => this.loop());
    } catch (e: any) { this.fail.set(String(e?.message || e)); this.state.set('failed'); }
  }
  private stateHex(pct: number){ return pct >= 100 ? 0xdd625c : pct >= 85 ? 0xdea844 : 0x55c990; }
  /* one cycle a press: 3.2s when there is room, 2s near the limit, 1.2s over it */
  private period(pct: number){ return pct >= 100 ? 1.2 : pct >= 85 ? 2.0 : 3.2; }
  private build(T: any, OrbitControls: any, RoomEnvironment: any, RBox: any){
    const stage = this.stageRef.nativeElement, canvas = this.canvasRef.nativeElement;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = stage.clientWidth < 720;
    const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = .88;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    r.setClearColor(C.bg, 1);
    const scene = this.scene = new T.Scene();
    this.pmrem = new T.PMREMGenerator(r);
    scene.environment = this.pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environmentIntensity = .28;
    scene.fog = new T.Fog(C.bg, 18, 46);
    this.cam = new T.PerspectiveCamera(phone ? 34 : 28, 1, .1, 160);

    /* materials: one hero (the steel trim), quiet bodies, clear glass, matte belt and parcels; colour only for state */
    const trim = new T.MeshPhysicalMaterial({ color: C.trim, metalness: .92, roughness: .24, clearcoat: .12, transparent: true });
    const body = new T.MeshPhysicalMaterial({ color: C.body, metalness: .45, roughness: .42, clearcoat: .15, transparent: true });
    const face = new T.MeshStandardMaterial({ color: C.face, metalness: .12, roughness: .62, transparent: true });
    const glass = new T.MeshPhysicalMaterial({ color: C.glass, metalness: 0, roughness: .08, ior: 1.45, transparent: true, opacity: .11, side: T.DoubleSide, depthWrite: false });
    const rubber = new T.MeshStandardMaterial({ color: C.belt, metalness: 0, roughness: .94 });
    const parcelMat = new T.MeshStandardMaterial({ color: C.parcel, metalness: 0, roughness: .72, transparent: true });
    const own = (o: any) => { o.castShadow = true; o.receiveShadow = true; return o; };

    /* STATIONS: laid out left to right in workflow order, width from capacity */
    const line = this.line(); const maxC = Math.max(1, ...line.map(s => s.capacity));
    const widths = line.map(s => 1.55 + 1.15 * Math.sqrt(s.capacity / maxC));
    const GAP = .8, BAY = 1.1, H = 1.25, D = 1.15, Z = -.85;
    let x = 0; const xs: number[] = [];
    widths.forEach((w, i) => { if (i > 0) x += widths[i - 1] / 2 + GAP + w / 2; xs.push(x); });
    const first = xs.length ? xs[0] - widths[0] / 2 : 0, lastX = xs.length ? xs[xs.length - 1] + widths[widths.length - 1] / 2 : 0;
    const cx = (first + lastX) / 2;
    line.forEach((s, i) => {
      const w = widths[i], sx = xs[i] - cx, pct = s.pct || 0, hex = this.stateHex(pct);
      const bodyM = own(new T.Mesh(new RBox(w, H, D, 4, .07), body.clone())); bodyM.position.set(sx, H / 2 + .04, Z);
      const plinth = own(new T.Mesh(new RBox(w + .12, .08, D + .12, 2, .025), trim.clone())); plinth.position.set(sx, .04, Z);
      const lid = own(new T.Mesh(new RBox(w + .04, .06, D + .04, 2, .025), trim.clone())); lid.position.set(sx, H + .07, Z);
      const faceM = own(new T.Mesh(new RBox(w - .3, H - .46, .05, 2, .02), face.clone())); faceM.position.set(sx, H / 2 + .1, Z + D / 2 + .01);
      const slot = new T.Mesh(new T.BoxGeometry(w - .6, .035, .02), new T.MeshBasicMaterial({ color: hex, toneMapped: false, transparent: true }));
      slot.position.set(sx, H - .27, Z + D / 2 + .045);
      /* the tank: glass, the liquid at the seat's measured level, a steel cap and collar */
      const TR = Math.min(.34, w * .16), TH = 1.1, ty = H + .1;
      const tank = new T.Mesh(new T.CylinderGeometry(TR, TR, TH, 56, 1, true), glass.clone()); tank.position.set(sx, ty + TH / 2, Z);
      const level = Math.max(.02, Math.min(1, pct / 100));
      const fillGeo = new T.CylinderGeometry(TR * .9, TR * .9, TH * .96, 56); fillGeo.translate(0, TH * .48, 0);
      const fill = new T.Mesh(fillGeo, new T.MeshStandardMaterial({ color: hex, roughness: .28, metalness: 0, emissive: hex, emissiveIntensity: .08, transparent: true }));
      fill.position.set(sx, ty + .02, Z); fill.scale.y = this.reduced ? level : .001;
      const cap = own(new T.Mesh(new T.CylinderGeometry(TR * 1.07, TR * 1.07, .06, 56), trim.clone())); cap.position.set(sx, ty + TH + .03, Z);
      const collar = own(new T.Mesh(new T.CylinderGeometry(TR * 1.12, TR * 1.12, .07, 56), trim.clone())); collar.position.set(sx, ty + .02, Z);
      /* the press: an arm out over the belt and a head that stamps, then rests */
      const armY = H + .03;
      const arm = own(new T.Mesh(new RBox(.18, .14, 1.55, 2, .035), trim.clone())); arm.position.set(sx + w * .26, armY, Z + .7);
      const rod = own(new T.Mesh(new T.CylinderGeometry(.04, .04, .5, 20), trim.clone()));
      const plate = own(new T.Mesh(new RBox(.32, .09, .32, 2, .025), body.clone())); plate.position.y = -.25;
      const head = new T.Group(); head.add(rod, plate); head.position.set(sx + w * .26, armY - .22, this.beltZ);
      scene.add(bodyM, plinth, lid, faceM, slot, tank, fill, cap, collar, arm, head);
      const parts = [bodyM, plinth, lid, faceM, slot, tank, fill, cap, collar, arm, rod, plate];
      parts.forEach(o => o.userData = { key: s.key });
      this.stations.push({ key: s.key, body: bodyM, parts, head, fill, level, slot, period: this.period(pct), x: sx, w, phase: i * .7, wakeAt: (i + .4) / (line.length + 1) });
    });
    const left = first - cx, right = lastX - cx;
    this.intakeX = left - GAP - BAY / 2; const outputX = right + GAP + BAY / 2;
    this.span = { left: this.intakeX - BAY / 2, right: outputX + BAY / 2 };

    /* THE BELT: matte rubber that moves, a steel rail each side, a few legs */
    const L = this.span.right - this.span.left, BW = .78;
    this.beltTex = beltTexture(T); this.beltTex.repeat.set(L / .5, 1);
    const beltMat = new T.MeshStandardMaterial({ color: 0xffffff, map: this.beltTex, metalness: 0, roughness: .94 });
    const belt = own(new T.Mesh(new T.BoxGeometry(L, .08, BW), [rubber, rubber, beltMat, rubber, rubber, rubber])); belt.position.set(0, this.beltY - .04, this.beltZ);
    const railA = own(new T.Mesh(new RBox(L + .08, .1, .06, 2, .02), trim)); railA.position.set(0, this.beltY + .02, this.beltZ - BW / 2 - .045);
    const railB = railA.clone(); railB.position.z = this.beltZ + BW / 2 + .045;
    const frame = own(new T.Mesh(new RBox(L, .2, BW + .08, 2, .035), body)); frame.position.set(0, this.beltY - .18, this.beltZ);
    scene.add(belt, railA, railB, frame);
    const legs = Math.max(2, Math.round(L / 3.4));
    for (let k = 0; k <= legs; k++) { const lx = this.span.left + .3 + k * (L - .6) / legs;
      const leg = own(new T.Mesh(new RBox(.1, this.beltY - .28, BW - .1, 1, .02), body)); leg.position.set(lx, (this.beltY - .28) / 2, this.beltZ); scene.add(leg); }
    /* the light that runs the rail once, on waking */
    this.sweep = new T.Mesh(new T.BoxGeometry(.9, .012, .02), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, depthWrite: false }));
    this.sweep.position.set(this.span.left, this.beltY + .072, this.beltZ + BW / 2 + .078); this.sweep.visible = !this.reduced; scene.add(this.sweep);
    /* the two bays: low steel plinths, one parcel waiting at the intake */
    for (const bx of [this.intakeX, outputX]) {
      const bay = own(new T.Mesh(new RBox(BAY, .36, 1.1, 3, .05), body)); bay.position.set(bx, .2, Z + .05);
      const top = own(new T.Mesh(new RBox(BAY + .04, .04, 1.14, 2, .015), trim)); top.position.set(bx, .4, Z + .05);
      scene.add(bay, top);
    }
    const waiting = own(new T.Mesh(new RBox(.28, .22, .3, 2, .03), parcelMat)); waiting.position.set(this.intakeX, .53, Z + .05); scene.add(waiting);
    /* parcels on the belt: how many shows how much of the month has left the floor; hidden until the floor wakes */
    const f = this.flow; const share = f ? Math.min(1, (f.videosDone + f.postsDone) / Math.max(1, f.videosContracted + f.postsContracted)) : .5;
    const n = 3 + Math.round(5 * share);
    for (let k = 0; k < n; k++) { const p = own(new T.Mesh(new RBox(.26, .2, .3, 2, .03), parcelMat)); p.userData = { t: k / n }; p.visible = this.reduced; scene.add(p); this.parcels.push(p); }
    this.placeParcels(0);

    /* the floor: dark, matte, a grid so faint it only shows near the line */
    const floor = new T.Mesh(new T.PlaneGeometry(140, 140), new T.MeshStandardMaterial({ color: C.floor, metalness: .03, roughness: .82 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new T.Mesh(new T.PlaneGeometry(L * 1.6, L * 1.6), new T.MeshBasicMaterial({ map: gridTexture(T), transparent: true, depthWrite: false }));
    grid.rotation.x = -Math.PI / 2; grid.position.y = .003; scene.add(grid);

    /* three lights: a warm key that casts, a cool fill from the sky, a copper rim from behind */
    const key = new T.DirectionalLight(0xfff5ea, 2.0); key.position.set(-5, 9, 6); key.castShadow = true;
    const map = phone ? 512 : 1024; key.shadow.mapSize.set(map, map); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 5;
    const sc = key.shadow.camera; sc.left = this.span.left - 2; sc.right = this.span.right + 2; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 30;
    const fillL = new T.HemisphereLight(0xc7d1de, 0x050608, .18);
    const rim = new T.DirectionalLight(0xe2b98a, .3); rim.position.set(7, 4, -6);
    scene.add(key, key.target, fillL, rim);

    this.controls = new OrbitControls(this.cam, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = .06; this.controls.enablePan = false; this.controls.enableZoom = !phone;
    this.controls.minDistance = 3; this.controls.maxPolarAngle = Math.PI * .46; this.controls.minPolarAngle = Math.PI * .2;
    canvas.addEventListener('pointerdown', e => { this.down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => { if (!this.down) return; const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y; this.down = null;
      /* a phone swipe moves along the line, one station a swipe */
      if (this.narrow() && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { this.zone.run(() => this.nudge(dx < 0 ? 1 : -1)); return; }
      if (Math.hypot(dx, dy) > 7) return; this.pick(e); });
    /* the phone window starts on the tightest seat: the station that needs looking at */
    const tight = [...line].sort((a, b) => (b.pct || 0) - (a.pct || 0))[0]; this.focus.set(tight?.key || null);
    this.resize(); new ResizeObserver(() => this.resize()).observe(stage);
    /* the wake up: from a wider, higher view into home, once */
    this.wake = { t0: performance.now(), dur: phone ? 1100 : 1800, done: this.reduced };
    if (!this.reduced) { const T3 = new T.Vector3(...this.home.target), P = new T.Vector3(...this.home.pos); const from = T3.clone().add(P.clone().sub(T3).multiplyScalar(1.35)); from.y += 1.2;
      this.cam.position.copy(from); this.tween = { t0: performance.now(), dur: this.wake.dur, p0: from, p1: P, t0v: T3.clone(), t1: T3.clone() }; }
  }
  private placeParcels(dt: number){
    const a = this.span.left + .25, b = this.span.right - .25, len = b - a;
    this.parcels.forEach(p => { p.userData.t = (p.userData.t + dt / 12) % 1; p.position.set(a + p.userData.t * len, this.beltY + .1, this.beltZ); });
  }
  /* DESK HOME: the camera backs off along one authored direction, about 20 degrees above the line, until the
     whole line sits inside the room the captions leave, then the line is centred in that room */
  private fitDesk(){
    const T = this.T, cam = this.cam; const dir = new T.Vector3(.2, .37, 1).normalize();
    const box = [this.span.left, this.span.right].flatMap(x => [0, 2.5].flatMap(y => [-1.45, 1.0].map(z => new T.Vector3(x, y, z))));
    const room = { x: .86, lo: -.5, hi: .7 };
    const target = new T.Vector3(0, 1.0, -.2);
    const at = (d: number) => { cam.position.copy(target).addScaledVector(dir, d); cam.lookAt(target); cam.updateMatrixWorld(); return box.map((v: any) => v.clone().project(cam)); };
    let d = 4;
    for (; d < 140; d += .1) { const pts = at(d); const ys = pts.map((p: any) => p.y);
      if (Math.max(...pts.map((p: any) => Math.abs(p.x))) <= room.x && Math.max(...ys) - Math.min(...ys) <= room.hi - room.lo) break; }
    for (let k = 0; k < 3; k++) { const ys = at(d).map((p: any) => p.y); target.y += ((Math.max(...ys) + Math.min(...ys)) / 2 - (room.hi + room.lo) / 2) * d * Math.tan(cam.fov * Math.PI / 360); }
    return { pos: target.clone().addScaledVector(dir, d), target, d };
  }
  /* PHONE HOME: a window on one station, the neighbours showing at the edges */
  private fitPhone(key: string | null){
    const T = this.T, cam = this.cam; const s = this.stations.find(x => x.key === key) || this.stations[0];
    const dir = new T.Vector3(.1, .42, 1).normalize(); const target = new T.Vector3(s ? s.x : 0, .88, -.3);
    const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * cam.aspect;
    const half = (s ? s.w / 2 : 1) + .55;
    const d = Math.max(half / th, 1.75 / tv) + .4;
    return { pos: target.clone().addScaledVector(dir, d), target, d };
  }
  private fit(){ return this.narrow() ? this.fitPhone(this.focus()) : this.fitDesk(); }
  private resize(){ const s = this.stageRef.nativeElement; const w = s.clientWidth, h = s.clientHeight; if (!w || !h) return;
    const narrow = w < 720; this.narrow.set(narrow);
    this.renderer.setSize(w, h, false); this.cam.fov = narrow ? 34 : 28; this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const save = { p: this.cam.position.clone(), t: this.controls.target.clone() };
    const fit = this.fit(); this.home = { pos: round3(fit.pos), target: round3(fit.target) };
    if (!this.selected() && !this.tween) { this.cam.position.set(...this.home.pos); this.controls.target.set(...this.home.target); }
    else { this.cam.position.copy(save.p); this.controls.target.copy(save.t); }
    this.cam.lookAt(this.controls.target);
    this.controls.enableRotate = !narrow; this.controls.maxDistance = Math.max(24, fit.d * 1.6);
    if (this.scene.fog) { this.scene.fog.near = fit.d * 1.3; this.scene.fog.far = fit.d * 3.2; }
    this.zone.run(() => this.narrow.set(narrow)); }
  private pick(e: PointerEvent){
    const T = this.T; const r = this.canvasRef.nativeElement.getBoundingClientRect();
    const m = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster(); rc.setFromCamera(m, this.cam);
    const hit = rc.intersectObjects(this.stations.flatMap(s => s.parts))[0];
    this.zone.run(() => hit && hit.object.userData.key ? this.select(hit.object.userData.key) : this.reset());
  }
  private nudge(step: number){ const ks = this.line().map(s => s.key); const cur = ks.indexOf(this.selected() || this.focus() || ks[0]); const nx = ks[Math.max(0, Math.min(ks.length - 1, cur + step))]; if (nx) this.select(nx); }
  select(key: string){
    const g = this.stations.find(x => x.key === key); if (!g) return;
    this.selected.set(key); this.hint.set(false);
    this.stations.forEach(x => x.parts.forEach((o: any) => { const base = o.userData.base ?? (o.userData.base = o.material.opacity); o.material.opacity = x === g ? base : base * .14; }));
    if (this.narrow()) { this.focus.set(key); const f = this.fitPhone(key); this.home = { pos: round3(f.pos), target: round3(f.target) }; this.fly(this.home.pos, this.home.target); return; }
    /* the card sits top left on a desk, so the chosen station is framed a little right of centre, moved only enough to reframe it */
    const d = Math.max(6.4, g.w * 2.6), off = d * .17;
    this.fly([g.x - off + d * .18, 1.3 + d * .36, -.3 + d], [g.x - off, 1.25, -.3]);
  }
  reset(){ this.selected.set(null); this.stations.forEach(x => x.parts.forEach((o: any) => { o.material.opacity = o.userData.base ?? o.material.opacity; })); this.fly(this.home.pos, this.home.target); }
  private fly(pos: number[], target: number[]){ const T = this.T; this.tween = { t0: performance.now(), dur: 900, p0: this.cam.position.clone(), p1: new T.Vector3(...pos), t0v: this.controls.target.clone(), t1: new T.Vector3(...target) }; }
  private loop(){ if (!this.alive || !this.visible || !this.renderer) return; this.raf = requestAnimationFrame(() => { const now = performance.now(); const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now; this.frame(dt, false); this.loop(); }); }
  private frame(dt: number, sync: boolean){
    const now = sync ? (this.tween ? this.tween.t0 + this.tween.dur : 0) : performance.now();
    if (this.tween) { const k = Math.min(1, (now - this.tween.t0) / this.tween.dur); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.cam.position.lerpVectors(this.tween.p0, this.tween.p1, e); this.controls.target.lerpVectors(this.tween.t0v, this.tween.t1, e); if (k >= 1) { this.cam.position.copy(this.tween.p1); this.controls.target.copy(this.tween.t1); this.tween = null; } }
    /* the wake up: each station's tank rises to its level as the light reaches it */
    if (!this.wake.done) {
      const k = sync ? 1 : Math.min(1, (performance.now() - this.wake.t0) / this.wake.dur);
      this.stations.forEach(s => { const local = Math.max(0, Math.min(1, (k - s.wakeAt + .18) / .42)); s.fill.scale.y = Math.max(.001, s.level * (1 - Math.pow(1 - local, 3))); s.slot.visible = local > 0; });
      this.sweep.position.x = this.span.left + k * (this.span.right - this.span.left); this.sweep.material.opacity = Math.sin(Math.PI * k) * .55;
      if (k >= 1) { this.wake.done = true; this.sweep.visible = false; this.parcels.forEach(p => p.visible = true); this.stations.forEach(s => { s.fill.scale.y = s.level; s.slot.visible = true; }); }
    }
    if (!this.reduced && this.wake.done) {
      this.clock += dt;
      /* a press goes down in 180ms, holds 120ms, returns in 260ms, then rests for the rest of its cycle */
      this.stations.forEach(s => { const t = ((this.clock + s.phase) % s.period); const k = t < .18 ? t / .18 : t < .3 ? 1 : t < .56 ? 1 - (t - .3) / .26 : 0;
        s.head.position.y = (1.28 - .22) - .14 * (k * k * (3 - 2 * k)); });
      if (this.beltTex) this.beltTex.offset.x -= dt / 12 * ((this.span.right - this.span.left) / .5);
      this.placeParcels(dt);
    }
    this.controls.update(); this.renderer.render(this.scene, this.cam);
    if (!this.narrow()) this.project();
  }
  /* captions sit on ONE baseline in front of the belt, each centred under its station; a quiet tag over the intake names new clients */
  private lastKey = '';
  private project(){
    const r = this.canvasRef.nativeElement.getBoundingClientRect(); const T = this.T;
    const at = (x: number, y = 0, z = 1.3) => { const v = new T.Vector3(x, y, z).project(this.cam); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height }; };
    const out = this.stations.map(g => { const p = at(g.x); const s = this.seats.find(z => z.key === g.key)!;
      return { key: g.key, label: s.label, pct: s.pct || 0, sub: `${s.load} of ${s.capacity} ${s.unit.replace(' this month', '').replace(' a month', '')}`, x: Math.round(Math.min(r.width - 72, Math.max(72, p.x))), y: Math.round(Math.min(r.height - 96, Math.max(12, p.y + 8))) }; });
    const base = Math.max(...out.map(o => o.y)); out.forEach(o => o.y = base);
    const nNew = this.flow?.newClients || 0; const ip = at(this.intakeX, .9, -.8);
    const tag = nNew ? { text: `${nNew} new ${nNew === 1 ? 'client' : 'clients'} this month`, x: Math.round(ip.x), y: Math.round(ip.y - 28) } : null;
    const keep = tag && tag.x > 80 && tag.y > 50 ? tag : null;
    const k = out.map(o => o.x + ',' + o.y).join('|') + '#' + (keep ? keep.x + ',' + keep.y : ''); if (k === this.lastKey) return; this.lastKey = k;
    this.zone.run(() => { this.labels.set(out); this.intake.set(keep); });
  }
  dbg(){ const c = this.cam?.position, t = this.controls?.target; const lit = this.stations.filter(g => g.body.material.opacity > .5).length;
    return { camera: c ? [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)] : null, target: t ? [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)] : null, home: this.home, lit, dimmed: this.stations.length - lit,
      gears: this.stations.length, stations: this.stations.map(s => s.key), focus: this.focus(), awake: this.wake.done, parcels: this.parcels.length, selected: this.selected(), tweening: !!this.tween, state: this.state() }; }
  ngOnInit(){ this.labels.set(this.line().map(s => ({ key: s.key, label: s.label, pct: s.pct || 0, sub: '', x: 0, y: 0 }))); }
  ngOnDestroy(){ this.alive = false; cancelAnimationFrame(this.raf); clearTimeout(this.hintTimer); document.removeEventListener('visibilitychange', this.onVis);
    const all: any[] = []; this.scene?.traverse((o: any) => all.push(o));
    all.forEach((o: any) => { o?.geometry?.dispose(); [].concat(o?.material || []).forEach((m: any) => { m?.map?.dispose(); m?.dispose(); }); });
    this.scene?.environment?.dispose(); this.pmrem?.dispose(); this.controls?.dispose(); this.renderer?.dispose(); delete (window as any).__m3d; }
}
function rank(k: string){ const i = ORDER.indexOf(k); return i < 0 ? 99 : i; }
function round3(v: any){ return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]; }
/* the belt's surface: fine cross ribs so its movement reads */
function beltTexture(T: any){
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#0e1013'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#16181c'; x.fillRect(0, 0, 8, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}
/* a grid at 1.8% white that is gone well before the edge of the stage */
function gridTexture(T: any){
  const S = 1024, cells = 24, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d')!;
  x.strokeStyle = 'rgba(255,255,255,0.018)'; x.lineWidth = 1.5;
  for (let i = 0; i <= cells; i++) { const p = Math.round(i * S / cells) + .5; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, S); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(S, p); x.stroke(); }
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.35, 'rgba(0,0,0,.6)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
