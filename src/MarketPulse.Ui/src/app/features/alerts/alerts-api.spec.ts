import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertsApi } from './alerts-api';

describe('AlertsApi', () => {
  let api: AlertsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AlertsApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('lists with filters including isEnabled=false', () => {
    TestBed.runInInjectionContext(() => api.list(signal({ isEnabled: false, page: 1 })));
    TestBed.tick();
    expect(http.expectOne((r) => r.url === '/api/v1/alerts').request.params.toString()).toBe('isEnabled=false&page=1&pageSize=20');
  });

  it('creates', async () => {
    const result = api.create({ instrumentId: 'i1', priceSide: 'Ask', direction: 'Below', threshold: 2 });
    const req = http.expectOne({ method: 'POST', url: '/api/v1/alerts' });
    expect(req.request.body).toEqual({ instrumentId: 'i1', priceSide: 'Ask', direction: 'Below', threshold: 2 });
    req.flush({ id: 'a1' });
    expect((await result).id).toBe('a1');
  });

  it('enables and disables via the right endpoint', async () => {
    const on = api.setEnabled('a1', true);
    http.expectOne({ method: 'POST', url: '/api/v1/alerts/a1/enable' }).flush(null, { status: 204, statusText: 'x' });
    expect(await on).toBe('ok');
    const off = api.setEnabled('a1', false);
    http.expectOne({ method: 'POST', url: '/api/v1/alerts/a1/disable' }).flush(null, { status: 404, statusText: 'x' });
    expect(await off).toBe('not-found');
  });

  it('lists events with status filter', () => {
    TestBed.runInInjectionContext(() => api.events(signal({ status: 'Failed', page: 2 })));
    TestBed.tick();
    expect(http.expectOne((r) => r.url === '/api/v1/alert-events').request.params.toString()).toBe('status=Failed&page=2&pageSize=20');
  });
});
