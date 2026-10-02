import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'instruments' },
  { path: '', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.routes') },
  { path: 'instruments', loadChildren: () => import('./features/instruments/instruments.routes') },
  { path: 'watchlists', canActivate: [authGuard], loadChildren: () => import('./features/watchlists/watchlists.routes') },
  { path: 'alerts', canActivate: [authGuard], loadChildren: () => import('./features/alerts/alerts.routes') },
  {
    path: '**',
    title: 'Not found · MarketPulse',
    loadComponent: () => import('./not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
