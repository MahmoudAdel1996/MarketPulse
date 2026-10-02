import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Alerts · MarketPulse', loadComponent: () => import('./alerts.page').then((m) => m.AlertsPage) },
  {
    path: 'history',
    title: 'Alert history · MarketPulse',
    loadComponent: () => import('./alert-history.page').then((m) => m.AlertHistoryPage),
  },
] satisfies Routes;
