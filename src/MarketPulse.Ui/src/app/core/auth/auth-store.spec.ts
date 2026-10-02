import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from './auth-store';

describe('AuthStore', () => {
  let store: AuthStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('loads the current user', async () => {
    const done = store.load();
    http.expectOne('/api/v1/auth/me').flush({ id: '1', email: 'a@b.c', hasPassword: true, externalLogins: [] });
    await done;
    expect(store.isAuthenticated()).toBe(true);
    expect(store.status()).toBe('ready');
  });

  it('treats 401 from /me as signed out without throwing', async () => {
    const done = store.load();
    http.expectOne('/api/v1/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(store.user()).toBeNull();
    expect(store.status()).toBe('ready');
  });

  it('logs in then reloads the user', async () => {
    const done = store.login('a@b.c', 'pw');
    http.expectOne({ method: 'POST', url: '/api/v1/auth/login' }).flush(null);
    await new Promise((r) => setTimeout(r));
    http.expectOne('/api/v1/auth/me').flush({ id: '1', email: 'a@b.c', hasPassword: true, externalLogins: [] });
    await done;
    expect(store.user()?.email).toBe('a@b.c');
  });

  it('builds the google sign-in url with an absolute return url', () => {
    expect(store.googleSignInUrl('/alerts')).toBe(
      `/api/v1/auth/google/login?returnUrl=${encodeURIComponent(location.origin + '/alerts')}`,
    );
  });
});
