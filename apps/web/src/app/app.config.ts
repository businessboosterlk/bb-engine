import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { EngineService } from './core/engine.service';

/* Boot: the sealed files, opened with the keys this device already holds. No key means the door.
   The hash is the router so GitHub Pages deep-links without rewrites. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideAppInitializer(async () => { await inject(EngineService).restore(); })
  ]
};
