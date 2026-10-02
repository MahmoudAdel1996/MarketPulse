import { Routes } from '@angular/router';

export default [
  { path: 'login', title: 'Sign in · MarketPulse', loadComponent: () => import('./login.page').then((m) => m.LoginPage) },
  { path: 'register', title: 'Create account · MarketPulse', loadComponent: () => import('./register.page').then((m) => m.RegisterPage) },
] satisfies Routes;
