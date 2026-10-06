import { Injectable, signal, computed } from '@angular/core';
import { EnginePub, Owner, SealedBox, Alert } from './models';
import { keyFrom, openBox } from './vault';

const KEY = 'eng_key', VKEY = 'eng_vkey';
/* THE ENGINE'S DATA. Two sealed files beside the page: the team document and the owner's vault. The
   page holds no data of its own. The first paint comes from what this device already opened; the
   files are re-read when the app opens and whenever it comes back to the front, so a new build
   lands without a new sign in. A box this device cannot open sends it to the door. */
@Injectable({ providedIn: 'root' })
export class EngineService {
  readonly pub = signal<EnginePub | null>(null);
  readonly owner = signal<Owner | null>(null);
  readonly meta = signal<{ generated: string; vault: string; month: string } | null>(null);
  readonly loading = signal(false);
  readonly offline = signal(false);
  readonly error = signal('');
  /* held: money stays on the BB Mac until a strong phrase exists. sealed: published, this device
     has not opened it. open: this device has the owner key. */
  readonly vault = computed<'held' | 'sealed' | 'open'>(() => this.owner() ? 'open' : (this.vaultBox ? 'sealed' : 'held'));
  readonly signedIn = computed(() => !!this.pub());
  readonly alerts = computed<Alert[]>(() => [...(this.pub()?.alerts || []), ...(this.owner()?.alerts || [])]);
  readonly red = computed(() => this.alerts().filter(a => a.level === 'red').length);
  private box: SealedBox | null = null; private vaultBox: SealedBox | null = null;

  constructor(){ (window as any).__engine = { held: () => ({ clients: this.pub()?.clients.length || 0, alerts: this.alerts().length, owner: !!this.owner() }), vault: () => this.vault() }; }

  /* read the three small files. Never throws: a failed read leaves what is on screen and says so. */
  async fetchBoxes(): Promise<boolean> {
    try {
      const t = Date.now();
      const [m, e, v] = await Promise.all([fetch('data/meta.json?t=' + t, { cache: 'no-store' }), fetch('data/engine.enc.json?t=' + t, { cache: 'no-store' }), fetch('data/vault.enc.json?t=' + t, { cache: 'no-store' })]);
      if (!e.ok) throw new Error('no data published yet');
      this.meta.set(m.ok ? await m.json() : null);
      this.box = await e.json();
      this.vaultBox = v.ok ? await v.json() : null;
      this.offline.set(false); return true;
    } catch (err: any) { this.offline.set(true); this.error.set(err?.message === 'no data published yet' ? 'No data published yet. Run the build on the BB Mac.' : ''); return false; }
  }
  /* on open: whatever this device already has the keys for, as fast as the files arrive */
  async restore(): Promise<boolean> {
    if (!await this.fetchBoxes()) return false;
    let k = '', vk = ''; try { k = localStorage.getItem(KEY) || ''; vk = localStorage.getItem(VKEY) || ''; } catch {}
    if (!k || !this.box) return false;
    const p = await openBox<EnginePub>(this.box, k); if (!p) return false;
    this.pub.set(p);
    if (vk && this.vaultBox) { const o = await openBox<Owner>(this.vaultBox, vk); if (o) this.owner.set(o); }
    return true;
  }
  async unlockTeam(pass: string): Promise<'ok' | 'wrong' | 'nodata'> {
    this.error.set('');
    if (!this.box && !await this.fetchBoxes()) return 'nodata';
    if (!this.box) return 'nodata';
    this.loading.set(true);
    try {
      const k = await keyFrom(pass, this.box); const p = await openBox<EnginePub>(this.box, k);
      if (!p) return 'wrong';
      this.pub.set(p); try { localStorage.setItem(KEY, k); } catch {}
      /* one strong phrase opens both: try the vault with the same phrase, quietly */
      if (this.vaultBox) { const vk = await keyFrom(pass, this.vaultBox); const o = await openBox<Owner>(this.vaultBox, vk); if (o) { this.owner.set(o); try { localStorage.setItem(VKEY, vk); } catch {} } }
      return 'ok';
    } finally { this.loading.set(false); }
  }
  async unlockOwner(pass: string): Promise<'ok' | 'wrong' | 'held'> {
    if (!this.vaultBox) return 'held';
    const vk = await keyFrom(pass, this.vaultBox); const o = await openBox<Owner>(this.vaultBox, vk);
    if (!o) return 'wrong';
    this.owner.set(o); try { localStorage.setItem(VKEY, vk); } catch {} return 'ok';
  }
  /* back to the front: new files, same keys */
  async refresh(){ if (!this.pub()) return; const was = this.meta()?.generated; if (await this.fetchBoxes() && this.meta()?.generated !== was) await this.restore(); }
  lockOwner(){ this.owner.set(null); try { localStorage.removeItem(VKEY); } catch {} }
  signOut(){ this.pub.set(null); this.owner.set(null); try { localStorage.removeItem(KEY); localStorage.removeItem(VKEY); } catch {} }
}

/* shared words */
export const fmt = (n: number | null | undefined) => n === null || n === undefined ? '' : Math.round(n).toLocaleString('en-GB');
export const money = (n: number | null | undefined) => n === null || n === undefined ? '' : 'LKR ' + fmt(n);
export const short = (n: number) => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'm' : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
export const pct = (a: number, b: number) => b ? Math.round(a * 1000 / b) / 10 : 0;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(d: Date, withDay = false){ const s = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; return withDay ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] + ', ' + s : s; }
export function niceDate(iso: string | null | undefined){ if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`; }
export function stamp(iso: string | undefined){ if (!iso) return ''; const d = new Date(iso); return isNaN(+d) ? iso : `${longDate(d)} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
