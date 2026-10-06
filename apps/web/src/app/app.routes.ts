import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { EngineService } from './core/engine.service';
import { LoginComponent } from './pages/login.component';
import { ShellComponent } from './shell/shell.component';
import { MachineComponent } from './pages/engine/machine.component';
import { ClientsComponent } from './pages/engine/clients.component';
import { CapacityComponent } from './pages/engine/capacity.component';
import { OutputComponent } from './pages/engine/output.component';
import { AlertsComponent } from './pages/engine/alerts.component';
import { MoneyComponent } from './pages/owner/money.component';
import { PeopleComponent } from './pages/owner/people.component';
import { ForecastComponent } from './pages/owner/forecast.component';

const signedIn: CanActivateFn = () => inject(EngineService).signedIn() ? true : inject(Router).createUrlTree(['/login']);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'engine/machine' },
  { path: 'login', component: LoginComponent },
  { path: 'engine', component: ShellComponent, canActivate: [signedIn], data: { system: 'engine' }, children: [
    { path: '', pathMatch: 'full', redirectTo: 'machine' },
    { path: 'machine', component: MachineComponent, data: { title: 'The machine' } },
    { path: 'clients', component: ClientsComponent, data: { title: 'Clients' } },
    { path: 'capacity', component: CapacityComponent, data: { title: 'Capacity' } },
    { path: 'output', component: OutputComponent, data: { title: 'Output' } },
    { path: 'alerts', component: AlertsComponent, data: { title: 'Alerts' } }
  ] },
  { path: 'owner', component: ShellComponent, canActivate: [signedIn], data: { system: 'owner' }, children: [
    { path: '', pathMatch: 'full', redirectTo: 'money' },
    { path: 'money', component: MoneyComponent, data: { title: 'Money' } },
    { path: 'people', component: PeopleComponent, data: { title: 'People' } },
    { path: 'forecast', component: ForecastComponent, data: { title: 'Forecast' } }
  ] },
  { path: '**', redirectTo: 'engine/machine' }
];
