import { TestBed } from '@angular/core/testing';
import { ApplicationRef, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InstrumentsApi } from './instruments-api';
import { InstrumentQuery } from './models';

describe('InstrumentsApi', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  it('requests the list with only non-empty params and cancels stale requests', async () => {
    const http = TestBed.inject(HttpTestingController);
    const query = signal<InstrumentQuery>({ search: 'eu', page: 1 });
    const ref = TestBed.runInInjectionContext(() => TestBed.inject(InstrumentsApi).list(query));

    TestBed.tick();
    const first = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(first.request.params.toString()).toBe('search=eu&page=1&pageSize=20');

    query.set({ search: 'eur', page: 1 });
    TestBed.tick();
    expect(first.cancelled).toBe(true);
    http.expectOne((r) => r.params.get('search') === 'eur').flush({ items: [], page: 1, pageSize: 20, totalCount: 0 });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(ref.value()?.totalCount).toBe(0);
  });

  it('makes no request when the query is undefined', () => {
    TestBed.runInInjectionContext(() => TestBed.inject(InstrumentsApi).list(() => undefined));
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('gets one instrument by id', () => {
    TestBed.runInInjectionContext(() => TestBed.inject(InstrumentsApi).get(() => 'abc'));
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/instruments/abc');
  });
});
