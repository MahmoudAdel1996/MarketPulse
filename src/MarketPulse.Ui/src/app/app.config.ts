import { ApplicationConfig, PLATFORM_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AuthStore } from './core/auth/auth-store';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideAppInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        return inject(AuthStore).load();
      }
      return undefined;
    }),
  ],
};
