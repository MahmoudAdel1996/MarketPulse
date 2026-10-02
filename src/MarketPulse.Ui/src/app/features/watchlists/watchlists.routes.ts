import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Watchlists · MarketPulse', loadComponent: () => import('./watchlists.page').then((m) => m.WatchlistsPage) },
  {
    path: ':id',
    title: 'Watchlist · MarketPulse',
    loadComponent: () => import('./watchlist-detail.page').then((m) => m.WatchlistDetailPage),
  },
] satisfies Routes;
