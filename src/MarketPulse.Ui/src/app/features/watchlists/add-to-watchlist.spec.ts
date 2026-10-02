import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AddToWatchlist } from './add-to-watchlist';
import { ToastStore } from '../../core/toast/toast-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('AddToWatchlist', () => {
  it('loads watchlists only when opened and adds the instrument', async () => {
    TestBed.configureTestingModule({ imports: [AddToWatchlist], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AddToWatchlist);
    fixture.componentRef.setInput('instrument', { id: 'i1', symbol: 'EURUSD' });
    fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectNone(() => true);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/v1/watchlists' && r.params.get('pageSize') === '100')
      .flush({ items: [{ id: 'w1', name: 'FX', createdAt: '', instrumentCount: 0 }], page: 1, pageSize: 100, totalCount: 1 });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await expectNoAxeViolations(fixture.nativeElement);
    (fixture.nativeElement.querySelector('[data-testid="add-to-w1"]') as HTMLButtonElement).click();
    http.expectOne({ method: 'POST', url: '/api/v1/watchlists/w1/instruments' }).flush(null, { status: 204, statusText: 'x' });
    await TestBed.inject(ApplicationRef).whenStable();
    await new Promise((r) => setTimeout(r));
    expect(TestBed.inject(ToastStore).toasts().map((t) => t.message)).toContain('Added EURUSD to FX');
  });
});
