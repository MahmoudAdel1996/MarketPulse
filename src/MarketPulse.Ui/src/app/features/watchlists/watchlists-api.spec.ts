import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WatchlistsApi } from './watchlists-api';

describe('WatchlistsApi', () => {
  let api: WatchlistsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(WatchlistsApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('creates', async () => {
    const result = api.create('FX');
    const req = http.expectOne({ method: 'POST', url: '/api/v1/watchlists' });
    expect(req.request.body).toEqual({ name: 'FX' });
    req.flush({ id: 'w1', name: 'FX', createdAt: '2026-10-03T00:00:00Z', instruments: [] });
    expect((await result).id).toBe('w1');
  });

  it('renames with a PUT', async () => {
    const result = api.rename('w1', 'Metals');
    const req = http.expectOne({ method: 'PUT', url: '/api/v1/watchlists/w1' });
    expect(req.request.body).toEqual({ name: 'Metals' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(await result).toBe('ok');
  });

  it('maps 404 on mutations to not-found', async () => {
    const result = api.delete('w1');
    http.expectOne({ method: 'DELETE', url: '/api/v1/watchlists/w1' }).flush(null, { status: 404, statusText: 'x' });
    expect(await result).toBe('not-found');
  });

  it('adds and removes instruments', async () => {
    const add = api.addInstrument('w1', 'i1');
    const req = http.expectOne({ method: 'POST', url: '/api/v1/watchlists/w1/instruments' });
    expect(req.request.body).toEqual({ instrumentId: 'i1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(await add).toBe('ok');

    const remove = api.removeInstrument('w1', 'i1');
    http.expectOne({ method: 'DELETE', url: '/api/v1/watchlists/w1/instruments/i1' }).flush(null, { status: 204, statusText: 'No Content' });
    expect(await remove).toBe('ok');
  });

  it('lists nothing until a page is provided', () => {
    TestBed.runInInjectionContext(() => api.list(() => undefined));
    TestBed.tick();
    http.expectNone(() => true);
  });
});
