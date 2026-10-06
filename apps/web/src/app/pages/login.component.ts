import { Component, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../core/session.service';
import { EngineService, longDate } from '../core/engine.service';
import { ThemeService } from '../core/theme.service';
import { UpdateService } from '../core/update.service';

/* The door, the Hub's: black and white only, the mark, the name, the date, one field, one button. */
const GROUND = '#08080a';
@Component({
  selector: 'bb-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="door">
      <div class="stack">
        <div class="card">
          <img class="mark" src="assets/bb-logo-600.png" alt="Business Booster" width="834" height="338">
          <h1 class="sys">The Engine</h1>
          <div class="date">{{ today }}</div>
          <form (submit)="go($event)" autocomplete="off">
            <input id="pass" class="big" type="password" autocapitalize="none" autocorrect="off" spellcheck="false"
              enterkeyhint="go" [(ngModel)]="pass" name="pass" placeholder="TEAM PASSCODE" aria-label="Team passcode"
              [attr.aria-invalid]="!!session.error()" (input)="session.error.set('')">
            @if (session.error()) { <p class="err" role="alert">{{ session.error() }}</p> }
            <button class="enter" type="submit" data-act="enter" [disabled]="busy()">{{ busy() ? 'Opening' : 'Enter' }}</button>
          </form>
          <p class="demo">The same passcode that opens the Digital Brain.</p>
        </div>
        <p class="foot">Measured from the Command Centre on the BB Mac. Capacity, output and renewals open for the team. Money opens only for the owner.</p>
        <p class="build">Build {{ update.build }}</p>
      </div>
    </div>`,
  styles: [`
    :host{display:block}
    .door{min-height:100dvh;display:flex;flex-direction:column;background:#08080a;padding:calc(24px + var(--sat)) 20px calc(24px + var(--sab))}
    .stack{margin:clamp(8px,9dvh,96px) auto auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:20px}
    .card{width:100%;max-width:440px;background:#131316;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:54px 44px 36px;box-shadow:0 28px 80px rgba(0,0,0,.6);text-align:center}
    .mark{width:236px;max-width:74%;height:auto;display:block;margin:0 auto}
    .sys{margin-top:16px;color:rgba(255,255,255,.72);font-size:11.5px;font-weight:700;line-height:1.45;letter-spacing:.38em;text-indent:.38em;text-transform:uppercase}
    .date{color:#7c7f88;font-size:13px;margin:14px 0 30px}
    form{display:grid;gap:12px}
    .big{width:100%;min-height:58px;padding:16px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#1b1b1f;color:#f4f4f6;text-align:center;font-size:14px;font-weight:600;letter-spacing:.22em;text-indent:.22em;text-transform:uppercase;transition:border-color 160ms var(--ease),background 160ms var(--ease)}
    .big::placeholder{color:#63666f;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
    .big:focus{outline:none;border-color:rgba(255,255,255,.42);background:#212127}
    .big[aria-invalid="true"]{border-color:rgba(248,113,113,.5)}
    .big:-webkit-autofill,.big:-webkit-autofill:focus{-webkit-text-fill-color:#f4f4f6;-webkit-box-shadow:0 0 0 1000px #1b1b1f inset;transition:background-color 9999s ease-out}
    .enter{width:100%;min-height:58px;border:0;border-radius:12px;background:#f4f4f6;color:#0a0a0c;font-weight:800;font-size:14px;letter-spacing:.24em;text-indent:.24em;text-transform:uppercase;transition:transform 160ms var(--ease),background 160ms var(--ease)}
    @media (hover:hover){.enter:hover{background:#fff}}
    .enter:active{transform:scale(.985)}.enter:disabled{opacity:.55;transform:none}
    .enter:focus-visible,.big:focus-visible{outline:2px solid #f4f4f6;outline-offset:2px}
    .err{margin:0;padding:10px 12px;border-radius:10px;background:rgba(248,113,113,.12);font-size:13px;font-weight:600;line-height:1.4;color:#fca5a5}
    .demo{margin-top:18px;font-size:12px;color:#7c7f88}
    .foot{color:#7c7f88;font-size:12px;text-align:center;max-width:360px;line-height:1.55}
    .build{font-size:11px;color:#8a8d96;font-variant-numeric:tabular-nums}
    @media (max-width:480px){.card{padding:42px 24px 28px}.mark{width:206px}}
    @media (prefers-reduced-motion:reduce){.enter,.big{transition:none}}`]
})
export class LoginComponent implements OnDestroy {
  session = inject(SessionService); engine = inject(EngineService); theme = inject(ThemeService); update = inject(UpdateService); private router = inject(Router);
  pass = ''; busy = signal(false);
  today = longDate(new Date(), true);
  constructor(){
    document.body.classList.add('on-door');
    document.documentElement.style.setProperty('--top', GROUND);
    document.documentElement.style.setProperty('--door-ground', GROUND);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', GROUND);
    if (this.engine.signedIn()) this.router.navigate(['/engine/machine']);
  }
  ngOnDestroy(){ document.body.classList.remove('on-door'); this.theme.apply(); }
  async go(e: Event){
    e.preventDefault(); if (this.busy()) return; this.busy.set(true);
    try { if (await this.session.login(this.pass)) this.router.navigate(['/engine/machine']); }
    finally { this.busy.set(false); }
  }
}
