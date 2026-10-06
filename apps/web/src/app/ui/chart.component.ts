import { Component, Input, computed, signal } from '@angular/core';

/* THE ONE CHART. Data drawn as SVG, the only drawing in the app typed by hand, and named as such in
   the gate (hand-svg --allow). Colours are tokens, so day and night both read. Every bar and point
   carries its value in a title for a screen reader; the figure beside the chart is the record.
     type bars   grouped bars, one per series
     type stack  stacked bars
     type lines  lines with points, optional shade between the first two series */
export interface Series { name: string; values: number[]; color?: string; }
@Component({
  selector: 'bb-chart',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" [attr.height]="H" role="img" [attr.aria-label]="label" preserveAspectRatio="none" class="ch">
      @for (g of grid(); track g.y) {
        <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" [class.zero]="g.v === 0"/>
        <text [attr.x]="L - 6" [attr.y]="g.y + 3.5" text-anchor="end" class="tx">{{ g.label }}</text>
      }
      @if (type === 'stack' || type === 'bars') {
        @for (col of cols(); track col.i) {
          @for (b of col.bars; track b.k) { <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [style.fill]="b.color" rx="1.5"><title>{{ b.title }}</title></rect> }
        }
      }
      @if (type === 'lines') {
        @if (shade && paths().length > 1) { <polygon [attr.points]="shadePts()" [style.fill]="paths()[0].color" class="sh"/> }
        @for (p of paths(); track p.name) {
          <polyline [attr.points]="p.pts" fill="none" [style.stroke]="p.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
          @for (d of p.dots; track d.i) { <circle [attr.cx]="d.x" [attr.cy]="d.y" r="2.4" [style.fill]="p.color"><title>{{ d.title }}</title></circle> }
        }
      }
      @for (t of targetLines(); track t.label) {
        <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="t.y" [attr.y2]="t.y" class="tl"/>
        <text [attr.x]="L + 4" [attr.y]="t.y - 4" class="tx b">{{ t.label }}</text>
      }
      @for (x of xlabels(); track x.i) { <text [attr.x]="x.x" [attr.y]="H - 6" text-anchor="middle" class="tx">{{ x.label }}</text> }
    </svg>`,
  styles: [`
    :host{display:block}
    .ch{display:block;font-family:inherit;overflow:visible}
    .gl{stroke:var(--line);stroke-width:1}.gl.zero{stroke:var(--ink-2)}
    .tl{stroke:var(--ink);stroke-width:1;stroke-dasharray:4 3}
    .tx{font-size:10px;fill:var(--muted)}.tx.b{font-weight:700;fill:var(--ink)}
    .sh{opacity:.14}`]
})
export class ChartComponent {
  @Input() type: 'bars' | 'stack' | 'lines' = 'bars';
  @Input() set labels(v: string[]) { this._labels.set(v || []); }
  @Input() set series(v: Series[]) { this._series.set(v || []); }
  @Input() set targets(v: { value: number; label: string }[]) { this._targets.set(v || []); }
  @Input() label = 'Chart';
  @Input() shade = false;
  @Input() H = 220; W = 640; L = 44; R = 12; T = 10; B = 22;
  @Input() fmt: (n: number) => string = n => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  @Input() every = 1;
  _labels = signal<string[]>([]); _series = signal<Series[]>([]); _targets = signal<{ value: number; label: string }[]>([]);
  private palette = ['var(--green)', 'var(--red)', 'var(--blue)', 'var(--amber)', 'var(--purple)', 'var(--ink-2)'];
  colorOf = (s: Series, i: number) => s.color || this.palette[i % this.palette.length];
  private N = computed(() => this._labels().length || Math.max(...this._series().map(s => s.values.length), 0));
  private range = computed(() => {
    const vals: number[] = [];
    if (this.type === 'stack') for (let i = 0; i < this.N(); i++) vals.push(this._series().reduce((a, s) => a + (s.values[i] || 0), 0));
    else this._series().forEach(s => vals.push(...s.values));
    this._targets().forEach(t => vals.push(t.value));
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals); if (hi === lo) hi = lo + 1;
    const step = niceStep((hi - lo) / 4); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    return { lo, hi, step };
  });
  private Y = (v: number) => { const { lo, hi } = this.range(); return this.T + (this.H - this.T - this.B) * (hi - v) / (hi - lo); };
  private X = (i: number) => this.L + (this.W - this.L - this.R) * (i + .5) / Math.max(1, this.N());
  private Xl = (i: number) => this.L + (this.W - this.L - this.R) * i / Math.max(1, this.N() - 1);
  grid = computed(() => { const { lo, hi, step } = this.range(); const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push({ v, y: this.Y(v), label: this.fmt(v) }); return out; });
  cols = computed(() => {
    const n = this.N(), S = this._series(), gw = (this.W - this.L - this.R) / Math.max(1, n), out = [];
    for (let i = 0; i < n; i++) {
      const bars: any[] = [];
      if (this.type === 'stack') { let base = 0; S.forEach((s, k) => { const v = s.values[i] || 0; if (v) { bars.push({ k, x: this.X(i) - gw * .34, w: gw * .68, y: this.Y(base + v), h: this.Y(base) - this.Y(base + v), color: this.colorOf(s, k), title: `${this._labels()[i] || i + 1}: ${s.name} ${this.fmt(v)}` }); base += v; } }); }
      else { const bw = gw * .7 / Math.max(1, S.length); S.forEach((s, k) => { const v = s.values[i] || 0; bars.push({ k, x: this.X(i) - gw * .35 + k * bw, w: bw - 1, y: Math.min(this.Y(v), this.Y(0)), h: Math.abs(this.Y(0) - this.Y(v)), color: this.colorOf(s, k), title: `${this._labels()[i] || i + 1}: ${s.name} ${this.fmt(v)}` }); }); }
      out.push({ i, bars });
    }
    return out;
  });
  paths = computed(() => this._series().map((s, k) => ({ name: s.name, color: this.colorOf(s, k), pts: s.values.map((v, i) => `${this.Xl(i).toFixed(1)},${this.Y(v).toFixed(1)}`).join(' '),
    dots: s.values.map((v, i) => ({ i, x: this.Xl(i), y: this.Y(v), title: `${this._labels()[i] || i + 1}: ${s.name} ${this.fmt(v)}` })) })));
  shadePts = computed(() => { const [a, b] = this._series(); if (!a || !b) return ''; const top = a.values.map((v, i) => `${this.Xl(i).toFixed(1)},${this.Y(v).toFixed(1)}`); const bot = b.values.map((v, i) => `${this.Xl(i).toFixed(1)},${this.Y(v).toFixed(1)}`).reverse(); return [...top, ...bot].join(' '); });
  targetLines = computed(() => this._targets().map(t => ({ label: t.label, y: this.Y(t.value) })));
  xlabels = computed(() => this._labels().map((label, i) => ({ i, label, x: this.type === 'lines' ? this.Xl(i) : this.X(i) })).filter(x => x.i % this.every === 0));
}
function niceStep(raw: number){ const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
