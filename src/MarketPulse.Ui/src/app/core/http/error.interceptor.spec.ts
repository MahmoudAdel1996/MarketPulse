import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';
import { AuthStore } from '../auth/auth-store';
import { ToastStore } from '../toast/toast-store';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  const call = (url: string, status: number) => {
    const result = firstValueFrom(http.get(url)).catch((e) => e);
    backend.expectOne(url).flush(null, { status, statusText: 'x' });
    return result;
  };

  it('redirects to login on 401 and clears the user', async () => {
    const clear = vi.spyOn(TestBed.inject(AuthStore), 'clear');
    await call('/api/v1/watchlists', 401);
    expect(clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('does not redirect for 401 from /auth/me or /auth/login', async () => {
    await call('/api/v1/auth/me', 401);
    await call('/api/v1/auth/login', 401);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('toasts when a mutation fails with 5xx', async () => {
    const toast = vi.spyOn(TestBed.inject(ToastStore), 'show');
    const result = firstValueFrom(http.post('/api/v1/alerts', {})).catch((e) => e);
    backend.expectOne('/api/v1/alerts').flush(null, { status: 500, statusText: 'x' });
    await result;
    expect(toast).toHaveBeenCalledWith('Something went wrong. Please try again.', 'error');
  });

  it('does not toast for failed reads, which pages show inline (and polling would repeat)', async () => {
    const toast = vi.spyOn(TestBed.inject(ToastStore), 'show');
    await call('/api/v1/instruments', 500);
    await call('/api/v1/instruments', 0);
    await call('/api/v1/instruments/x', 404);
    expect(toast).not.toHaveBeenCalled();
  });
});
