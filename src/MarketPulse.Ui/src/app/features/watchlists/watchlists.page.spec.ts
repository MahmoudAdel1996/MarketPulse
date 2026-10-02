import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WatchlistsPage } from './watchlists.page';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('WatchlistsPage', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [WatchlistsPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(WatchlistsPage);
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('renders watchlist cards with counts', async () => {
    const { fixture, http } = setup();
    http
      .expectOne((r) => r.url === '/api/v1/watchlists')
      .flush({ items: [{ id: 'w1', name: 'FX', createdAt: '2026-10-03T00:00:00Z', instrumentCount: 2 }], page: 1, pageSize: 20, totalCount: 1 });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/watchlists/w1"]')?.textContent).toContain('FX');
    expect(el.textContent).toContain('2 instruments');
    await expectNoAxeViolations(el);
  });

  it('shows an empty state with a create action', async () => {
    const { fixture, http } = setup();
    http.expectOne((r) => r.url === '/api/v1/watchlists').flush({ items: [], page: 1, pageSize: 20, totalCount: 0 });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You have no watchlists yet.');
  });
});
