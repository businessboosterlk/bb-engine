import { Injectable, computed, inject, signal } from '@angular/core';
import { EngineService } from './engine.service';

/* Who is at the keyboard: the team passcode opens the Engine; the owner's phrase opens the money. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private engine = inject(EngineService);
  readonly error = signal('');
  readonly user = computed(() => this.engine.owner() ? 'Owner' : this.engine.pub() ? 'Team' : '');
  readonly role = computed(() => this.engine.owner() ? 'Every rupee open' : this.engine.vault() === 'held' ? 'Money kept on the BB Mac' : 'Money sealed');
  initial(){ return (this.user() || '?').slice(0, 1); }
  async login(pass: string): Promise<boolean> {
    this.error.set('');
    const r = await this.engine.unlockTeam(pass.trim());
    if (r === 'ok') return true;
    this.error.set(r === 'nodata' ? 'No data has been published yet. Run the build on the BB Mac.' : 'That passcode did not open the Engine.');
    return false;
  }
  logout(){ this.engine.signOut(); }
}
