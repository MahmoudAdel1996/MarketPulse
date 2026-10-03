import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { ToastStore } from '../toast/toast-store';

/** Set on requests whose caller shows its own failure message (e.g. optimistic updates that roll back). */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

const SILENT_401 = ['/api/v1/auth/me', '/api/v1/auth/login'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthStore);
  const toasts = inject(ToastStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && !SILENT_401.some((url) => req.url.startsWith(url))) {
          auth.clear();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        } else if (req.method !== 'GET' && !req.context.get(SKIP_ERROR_TOAST) && (err.status === 0 || err.status >= 500)) {
          // Failed reads are shown inline by each page (with Retry); toasting them too would repeat on every poll.
          toasts.show('Something went wrong. Please try again.', 'error');
        }
      }
      return throwError(() => err);
    }),
  );
};
