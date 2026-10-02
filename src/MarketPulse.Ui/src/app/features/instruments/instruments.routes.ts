import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Instruments · MarketPulse',
    loadComponent: () => import('./instruments-list.page').then((m) => m.InstrumentsListPage),
  },
  {
    path: ':id',
    title: 'Instrument · MarketPulse',
    loadComponent: () => import('./instrument-detail.page').then((m) => m.InstrumentDetailPage),
  },
] satisfies Routes;
