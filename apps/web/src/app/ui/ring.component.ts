import { Component, Input } from '@angular/core';

/* A CAPACITY RING: how full a seat is, the number on the centre of the ring. Drawn with CSS, no
   drawing typed by hand. Green under 85%, amber to 100%, red over. The number is measured by its
   ink in ui-precision (every centred glyph is). */
@Component({
  selector: 'bb-ring',
  standalone: true,
  template: `
    <div class="ring" [class.amber]="pct >= warn && pct < 100" [class.red]="pct >= 100" [style.--p]="Math.min(100, Math.max(0, pct)) + '%'" role="img" [attr.aria-label]="label + ' ' + pct + ' percent'">
      <span class="num">{{ pct }}<em>%</em></span>
    </div>`,
  styles: [`
    :host{display:inline-block}
    .ring{--p:0%;--c:var(--green);width:var(--size,88px);height:var(--size,88px);border-radius:50%;display:grid;place-items:center;
      background:conic-gradient(var(--c) var(--p),var(--surface-2) 0)}
    .ring.amber{--c:var(--amber)}.ring.red{--c:var(--red)}
    .ring::before{content:"";grid-area:1/1;width:calc(100% - 16px);height:calc(100% - 16px);border-radius:50%;background:var(--surface)}
    .num{grid-area:1/1;font-size:calc(var(--size,88px) * .24);font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1;color:var(--ink);
      /* the figures are centred on their own box: measured by ink in ui-precision, phone and desk */}
    .num em{font-style:normal;font-size:.55em;font-weight:600;color:var(--muted);margin-left:1px}`]
})
export class RingComponent {
  @Input() pct = 0; @Input() warn = 85; @Input() label = 'Capacity';
  Math = Math;
}
