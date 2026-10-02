import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard, guestGuard } from './auth.guard';
import { AuthStore } from './auth-store';

function run(guard: typeof authGuard, url: string, queryParams: Record<string, string> = {}) {
  return TestBed.runInInjectionContext(() => guard({ queryParams } as never, { url } as never));
}

describe('guards', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: { isAuthenticated: authenticated } }],
    });
  });

  it('authGuard redirects anonymous users to login with returnUrl', () => {
    authenticated.set(false);
    const result = run(authGuard, '/alerts') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Falerts');
  });

  it('authGuard allows signed-in users', () => {
    authenticated.set(true);
    expect(run(authGuard, '/alerts')).toBe(true);
  });

  it('guestGuard sends signed-in users to a safe returnUrl', () => {
    authenticated.set(true);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(run(guestGuard, '/login', { returnUrl: '/alerts' }) as UrlTree)).toBe('/alerts');
    expect(router.serializeUrl(run(guestGuard, '/login', { returnUrl: '//evil.com' }) as UrlTree)).toBe('/instruments');
  });

  it('guestGuard lets anonymous users through', () => {
    authenticated.set(false);
    expect(run(guestGuard, '/login')).toBe(true);
  });
});
