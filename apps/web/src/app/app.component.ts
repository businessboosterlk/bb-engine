import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EngineService } from './core/engine.service';
import { runSelftest } from './core/selftest';
import { ThemeService } from './core/theme.service';
import { UpdateService } from './core/update.service';

@Component({
  selector: 'bb-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet/>`
})
export class AppComponent {
  engine = inject(EngineService); theme = inject(ThemeService); update = inject(UpdateService);
  constructor(){
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !location.hostname.startsWith('localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
    this.update.start();
    /* back to the front: new sealed files, same keys */
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.engine.refresh(); });
    /* how far the phone has slid the page up for the keyboard, so the status strip can stay put */
    const vv = window.visualViewport;
    if (vv) { const f = () => document.documentElement.style.setProperty('--vv-top', Math.max(0, Math.round(vv.offsetTop)) + 'px'); vv.addEventListener('scroll', f); vv.addEventListener('resize', f); f(); }
    if (new URLSearchParams(location.search).has('selftest')) setTimeout(() => runSelftest(this.engine).then(r => (window as any).__bbos = r), 1500);
  }
}
