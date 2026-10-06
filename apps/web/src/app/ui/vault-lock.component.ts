import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EngineService } from '../core/engine.service';
import { IconComponent } from './icon.component';

/* WHERE THE MONEY IS, never an empty screen. held: on the BB Mac until a strong phrase exists.
   sealed: published, this device has not opened it: one field, one button. */
@Component({
  selector: 'bb-vault-lock',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="card lockcard" [attr.data-vault]="engine.vault()">
      <span class="ic"><bb-icon name="lock"/></span>
      @if (engine.vault() === 'held') {
        <h2 class="t-h2">The money is kept on the BB Mac</h2>
        <p>Capacity, output and renewals travel under the team passcode. Every rupee travels only under a strong phrase. The Brain's lock policy says the team passcode is too short for that. The owner document is written on the Mac and not published.</p>
        <p class="steps"><strong>To open money here:</strong> pick five random words, write them on paper, put them in <code>~/.bb-brain-vault-pass</code> on the Mac and run the Engine build. The screens fill in on the next open.</p>
      } @else {
        <h2 class="t-h2">Money is sealed</h2>
        <p>Enter the owner's phrase once on this device. The key stays here, the phrase does not.</p>
        <form (submit)="go($event)" class="row" autocomplete="off">
          <input id="vpass" type="password" [(ngModel)]="pass" name="vpass" placeholder="Owner's phrase" aria-label="Owner's phrase" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" (input)="err.set('')" [attr.aria-invalid]="!!err()">
          @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
          <button class="btn" type="submit" data-act="vault-open" [disabled]="busy()">{{ busy() ? 'Opening' : 'Open' }}</button>
        </form>
      }
    </div>`,
  styles: [`
    :host{display:block}
    .lockcard{padding:26px 24px;max-width:560px;margin:8px auto 0;text-align:center}
    .ic{width:44px;height:44px;border-radius:12px;background:var(--surface-2);display:grid;place-items:center;margin:0 auto 14px;color:var(--muted);--ico:20px}
    p{color:var(--muted);font-size:13.5px;margin-top:10px;line-height:1.55;text-align:left}
    .steps{background:var(--surface-2);border-radius:10px;padding:12px 14px}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--surface);padding:1px 6px;border-radius:5px;border:1px solid var(--line)}
    .row{display:grid;gap:10px;margin-top:16px}
    .row input{width:100%;min-height:48px;padding:0 14px;border:1px solid var(--line-2);border-radius:10px;background:var(--surface);font-size:14px;text-align:center}
    .row input:focus{outline:none;border-color:var(--brand)}
    .row input[aria-invalid="true"]{border-color:var(--red)}
    .err{margin:0;padding:8px 10px;border-radius:8px;background:var(--red-soft);color:var(--red);font-size:12.5px;font-weight:600;text-align:center}
    .btn{min-height:48px}`]
})
export class VaultLockComponent {
  engine = inject(EngineService); pass = ''; err = signal(''); busy = signal(false);
  async go(e: Event){ e.preventDefault(); if (this.busy()) return; this.busy.set(true);
    try { const r = await this.engine.unlockOwner(this.pass.trim()); if (r !== 'ok') this.err.set(r === 'held' ? 'The money is not published yet.' : 'That phrase did not open it.'); }
    finally { this.busy.set(false); } }
}
