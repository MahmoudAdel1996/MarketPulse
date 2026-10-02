import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';
import { safeReturnPath } from './return-url';

export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthStore).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = (route) => {
  if (!inject(AuthStore).isAuthenticated()) {
    return true;
  }
  return inject(Router).parseUrl(safeReturnPath(route.queryParams['returnUrl']));
};
