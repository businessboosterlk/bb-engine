import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, inject, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seat } from '../../core/models';
import { IconComponent } from '../../ui/icon.component';

/* THE MACHINE IN 3D. Gate 1 of bb-3d-ux, answered: the spatial metaphor carries meaning here, a gear
   for each seat, its SIZE is the seat's capacity, the RING round it is the load, its SPEED is how
   hard the seat turns this month, and the gears mesh because the seats depend on each other. The
   flat page above is the door; this is the layer. The engine loads lazily behind the person's tap,
   never on boot. Words live in the DOM, projected onto the scene. dbg() and step(n) make it an
   instrument a script can read (gate 7). */
@Component({
  selector: 'bb-machine3d',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="stage card" #stage>
      <canvas #canvas aria-hidden="true"></canvas>
      @if (state() === 'loading') { <div class="veil"><span class="spin" aria-hidden="true"></span><span>Loading the machine</span></div> }
      @if (state() === 'failed') { <div class="veil" role="status"><strong>The 3D view could not start.</strong><span>{{ fail() }} The flat view below has every number.</span></div> }
      @if (state() === 'ready') {
        <div class="labels" [class.row]="narrow()">
          @for (l of labels(); track l.key) {
            <button type="button" class="lbl" [class.on]="selected() === l.key" [class.hid]="!narrow() && !l.show" [style.left.px]="narrow() ? null : l.x" [style.top.px]="narrow() ? null : l.y" [attr.data-act]="'gear-' + l.key" (click)="select(l.key)">{{ l.label }}<em>{{ l.pct }}%</em></button>
          }
        </div>
        @if (sel(); as s) {
          <div class="scard card">
            <strong>{{ s.label }}</strong>
            <span>{{ s.load }} of {{ s.capacity }} {{ s.unit }} · {{ s.pct }}%</span>
            <span class="rule">{{ s.rule }}</span>
            <div class="row"><a class="btn sm" data-act="gear-open" routerLink="/engine/capacity" [fragment]="s.key">Open the seat</a><button type="button" class="btn ghost sm" data-act="gear-reset" (click)="reset()">Reset view</button></div>
          </div>
        }
        <p class="hint">Drag to turn, pinch or scroll to zoom. Tap a gear.</p>
        @if (!sel()) { <button type="button" class="btn ghost sm home" data-act="gear-home" (click)="reset()"><bb-icon name="refresh"/><span>Home</span></button> }
      }
    </div>`,
  styles: [`
    :host{display:block;margin-bottom:16px}
    .stage{position:relative;height:min(62vh,520px);min-height:320px;overflow:hidden;background:var(--hero);border:0;touch-action:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .veil{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;font-size:13.5px;padding:24px;text-align:center}
    .veil strong{font-size:15px}.veil span{opacity:.8;max-width:420px}
    .spin{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:sp 900ms linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){.spin{animation:none}}
    .labels{position:absolute;inset:0;pointer-events:none}
    /* on a narrow stage the gears sit too close for floating words: the labels become one row of chips along the top, in gear order */
    .labels.row{inset:auto 12px auto 12px;top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .labels.row .lbl{position:static;transform:none}
    .lbl{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;display:inline-flex;align-items:baseline;gap:6px;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(20,20,23,.72);color:#fff;font-size:12.5px;font-weight:600;backdrop-filter:blur(8px);transition:opacity 160ms var(--ease),background 160ms var(--ease)}
    .lbl em{font-style:normal;font-size:11px;opacity:.75;font-variant-numeric:tabular-nums}
    .lbl.on{background:#fff;color:#141417;border-color:#fff}.lbl.on em{opacity:.7}
    .lbl.hid{opacity:0;pointer-events:none}
    .scard{position:absolute;left:16px;bottom:16px;max-width:min(360px,calc(100% - 32px));padding:14px 16px;display:grid;gap:4px;background:var(--surface);border-color:transparent;box-shadow:var(--sh-lg)}
    .scard strong{font-size:15px}.scard span{font-size:12.5px;color:var(--muted)}.scard .rule{font-size:11.5px}
    .scard .row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
    .hint{position:absolute;right:16px;bottom:16px;margin:0;font-size:11px;color:rgba(255,255,255,.55)}
    .home{position:absolute;right:16px;bottom:16px}
    @media (max-width:640px){.home{bottom:12px;right:12px}}
    @media (max-width:640px){.hint{display:none}.scard{left:12px;right:12px;bottom:12px;max-width:none}}`]
})
export class Machine3dComponent implements AfterViewInit, OnDestroy {
  @Input() seats: Seat[] = []; @Input() month = '';
  @ViewChild('stage') stageRef!: ElementRef<HTMLDivElement>; @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private zone = inject(NgZone);
  state = signal<'loading' | 'ready' | 'failed'>('loading'); fail = signal('');
  selected = signal<string | null>(null);
  labels = signal<{ key: string; label: string; pct: number; x: number; y: number; show: boolean }[]>([]);
  narrow = signal(false);
  sel = () => this.seats.find(s => s.key === this.selected()) || null;
  private T: any; private scene: any; private cam: any; private renderer: any; private controls: any;
  private gears: { key: string; mesh: any; ring: any; speed: number; r: number; x: number; dir: number }[] = [];
  private raf = 0; private alive = true; private home = { pos: [0, 2.2, 7.4], target: [0, 0, 0] }; private tween: any = null; private last = 0;
  private down: { x: number; y: number } | null = null; private visible = true;
  private onVis = () => { this.visible = document.visibilityState === 'visible'; if (this.visible) this.loop(); };

  async ngAfterViewInit(){
    try {
      const canvas = this.canvasRef.nativeElement;
      if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) throw new Error('This browser has no WebGL.');
      const T = await import('three'); const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      this.T = T; if (!this.alive) return;
      this.build(T, OrbitControls);
      this.state.set('ready');
      document.addEventListener('visibilitychange', this.onVis);
      (window as any).__m3d = { dbg: () => this.dbg(), step: (n = 1) => { for (let i = 0; i < n; i++) this.frame(1 / 60, true); return this.dbg(); }, select: (k: string) => this.select(k), reset: () => this.reset() };
      this.zone.runOutsideAngular(() => this.loop());
    } catch (e: any) { this.fail.set(String(e?.message || e)); this.state.set('failed'); }
  }
  private build(T: any, OrbitControls: any){
    const stage = this.stageRef.nativeElement, canvas = this.canvasRef.nativeElement;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
    this.scene = new T.Scene();
    this.cam = new T.PerspectiveCamera(42, 1, .1, 100);
    this.scene.add(new T.HemisphereLight(0xffffff, 0x2a2a30, 1.1));
    const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 6); this.scene.add(key);
    const fill = new T.DirectionalLight(0xffffff, .5); fill.position.set(-5, 2, -3); this.scene.add(fill);
    /* gears: radius from capacity, so the biggest seat is the biggest wheel; teeth every 0.42 units of rim */
    const caps = this.seats.map(s => s.capacity); const maxC = Math.max(1, ...caps);
    let x = 0; const steel = 0x8b9099;
    this.seats.forEach((s, i) => {
      const r = .55 + .95 * Math.sqrt(s.capacity / maxC); const teeth = Math.max(8, Math.round(2 * Math.PI * r / .42));
      const mesh = new T.Mesh(gearGeometry(T, r, teeth), new T.MeshStandardMaterial({ color: steel, metalness: .55, roughness: .42, transparent: true }));
      const prev = this.gears[i - 1]; x = prev ? prev.x + prev.r + r + .02 : 0;
      mesh.position.set(x, 0, 0); mesh.rotation.z = prev ? Math.PI / teeth : 0;
      const pctv = Math.min(1.25, (s.pct || 0) / 100);
      const colour = (s.pct || 0) >= 100 ? 0xe05a4e : (s.pct || 0) >= 85 ? 0xe0a23b : 0x3fb06f;
      const ring = new T.Mesh(new T.TorusGeometry(r + .22, .045, 12, 96, Math.PI * 2 * Math.min(1, pctv)), new T.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: .35, transparent: true }));
      ring.position.copy(mesh.position); ring.rotation.z = Math.PI / 2;
      const base = new T.Mesh(new T.TorusGeometry(r + .22, .02, 8, 96), new T.MeshStandardMaterial({ color: 0x3a3d45, transparent: true })); base.position.copy(mesh.position);
      this.scene.add(mesh, ring, base);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.gears.push({ key: s.key, mesh, ring, speed: reduced ? 0 : .25 + .9 * Math.min(1.2, (s.pct || 0) / 100), r, x, dir: i % 2 ? -1 : 1 });
      (mesh as any).userData = { key: s.key, base };
    });
    /* centre the row on the origin, then the home framing fits the whole row */
    const w = this.gears.length ? this.gears[this.gears.length - 1].x + this.gears[this.gears.length - 1].r + this.gears[0].r : 2;
    const cx = this.gears.length ? (this.gears[0].x - this.gears[0].r + this.gears[this.gears.length - 1].x + this.gears[this.gears.length - 1].r) / 2 : 0;
    this.scene.children.forEach((o: any) => { if (o.isMesh) o.position.x -= cx; }); this.gears.forEach(g => g.x -= cx);
    this.home = { pos: [0, 1.6, Math.max(6, w * 1.15)], target: [0, 0, 0] };
    this.cam.position.set(...this.home.pos); this.cam.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.cam, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = .055; this.controls.enablePan = false;
    this.controls.minDistance = 2.2; this.controls.maxDistance = 20; this.controls.target.set(0, 0, 0);
    canvas.addEventListener('pointerdown', e => { this.down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => { if (!this.down) return; const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y); this.down = null; if (moved > 7) return; this.pick(e); });
    this.resize(); new ResizeObserver(() => this.resize()).observe(stage);
  }
  private resize(){ const s = this.stageRef.nativeElement; const w = s.clientWidth, h = s.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.zone.run(() => this.narrow.set(w < 720)); }
  private pick(e: PointerEvent){
    const T = this.T; const r = this.canvasRef.nativeElement.getBoundingClientRect();
    const m = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster(); rc.setFromCamera(m, this.cam);
    const hit = rc.intersectObjects(this.gears.map(g => g.mesh))[0];
    this.zone.run(() => hit ? this.select(hit.object.userData.key) : this.reset());
  }
  select(key: string){
    const g = this.gears.find(x => x.key === key); if (!g) return;
    this.selected.set(key);
    this.gears.forEach(x => { const on = x === g; [x.mesh, x.ring, x.mesh.userData.base].forEach((o: any) => { o.material.opacity = on ? 1 : .14; }); });
    this.fly([g.x, .6, Math.max(2.6, g.r * 3.4)], [g.x, 0, 0]);
  }
  reset(){ this.selected.set(null); this.gears.forEach(x => [x.mesh, x.ring, x.mesh.userData.base].forEach((o: any) => { o.material.opacity = 1; })); this.fly(this.home.pos, this.home.target); }
  private fly(pos: number[], target: number[]){ const T = this.T; this.tween = { t0: performance.now(), dur: 720, p0: this.cam.position.clone(), p1: new T.Vector3(...pos), t0v: this.controls.target.clone(), t1: new T.Vector3(...target) }; }
  private loop(){ if (!this.alive || !this.visible || !this.renderer) return; this.raf = requestAnimationFrame(() => { const now = performance.now(); const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now; this.frame(dt, false); this.loop(); }); }
  private frame(dt: number, sync: boolean){
    const now = sync ? (this.tween ? this.tween.t0 + this.tween.dur : 0) : performance.now();
    if (this.tween) { const k = Math.min(1, (now - this.tween.t0) / this.tween.dur); const e = 1 - Math.pow(1 - k, 4);
      this.cam.position.lerpVectors(this.tween.p0, this.tween.p1, e); this.controls.target.lerpVectors(this.tween.t0v, this.tween.t1, e); if (k >= 1) { this.cam.position.copy(this.tween.p1); this.controls.target.copy(this.tween.t1); this.tween = null; } }
    this.gears.forEach(g => { g.mesh.rotation.z += g.dir * g.speed * dt; });
    this.controls.update(); this.renderer.render(this.scene, this.cam);
    this.project();
  }
  private project(){
    const r = this.canvasRef.nativeElement.getBoundingClientRect(); const T = this.T;
    const out = this.gears.map(g => { const v = new T.Vector3(g.x, g.r + .55, 0).project(this.cam); const show = v.z < 1;
      const x = Math.min(r.width - 60, Math.max(60, (v.x + 1) / 2 * r.width)), y = Math.min(r.height - 24, Math.max(24, (1 - v.y) / 2 * r.height)) - (this.gears.indexOf(g) % 2 ? 0 : 44);
      const s = this.seats.find(z => z.key === g.key)!; return { key: g.key, label: s.label, pct: s.pct || 0, x, y, show }; });
    this.zone.run(() => this.labels.set(out));
  }
  dbg(){ const c = this.cam?.position, t = this.controls?.target; const lit = this.gears.filter(g => g.mesh.material.opacity > .5).length;
    return { camera: c ? [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)] : null, target: t ? [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)] : null, home: this.home, lit, dimmed: this.gears.length - lit, gears: this.gears.length, selected: this.selected(), tweening: !!this.tween, state: this.state() }; }
  ngOnDestroy(){ this.alive = false; cancelAnimationFrame(this.raf); document.removeEventListener('visibilitychange', this.onVis);
    this.gears.forEach(g => { [g.mesh, g.ring, g.mesh.userData?.base].forEach((o: any) => { o?.geometry?.dispose(); o?.material?.dispose(); }); });
    this.controls?.dispose(); this.renderer?.dispose(); delete (window as any).__m3d; }
}
/* a gear is a cog outline extruded: teeth as a square wave round the rim, a hub hole in the middle */
function gearGeometry(T: any, r: number, teeth: number){
  const shape = new T.Shape(); const depth = .16 * r / 1.2, inner = r - depth, N = teeth * 4;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; const k = i % 4; const rr = k === 0 || k === 1 ? r : inner; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y); }
  const hole = new T.Path(); hole.absarc(0, 0, r * .22, 0, Math.PI * 2, true); shape.holes.push(hole);
  const g = new T.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 });
  g.center(); return g;
}
