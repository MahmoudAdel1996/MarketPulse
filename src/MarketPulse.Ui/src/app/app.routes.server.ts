import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  { path: 'watchlists', renderMode: RenderMode.Client },
  { path: 'watchlists/**', renderMode: RenderMode.Client },
  { path: 'alerts', renderMode: RenderMode.Client },
  { path: 'alerts/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
