import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, RESPONSE_INIT, signal } from '@angular/core';
import { vi } from 'vitest';
import { InstrumentDetailPage } from './instrument-detail.page';
import { AuthStore } from '../../core/auth/auth-store';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { ToastStore } from '../../core/toast/toast-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('InstrumentDetailPage', () => {
  function setup(responseInit?: { status?: number }, signedIn = false, dialogResult: unknown = undefined) {
    TestBed.configureTestingModule({
      imports: [InstrumentDetailPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { isAuthenticated: signal(signedIn) } },
        { provide: Dialog, useValue: { open: () => ({ closed: of(dialogResult) }) } },
        ...(responseInit ? [{ provide: RESPONSE_INIT, useValue: responseInit }] : []),
      ],
    });
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.componentRef.setInput('id', 'abc');
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('renders the quote with spread and a sign-in prompt', async () => {
    const { fixture, http } = setup();
    http.expectOne('/api/v1/instruments/abc').flush({
      id: 'abc', symbol: 'SHIBUSD', name: 'Shiba Inu', assetClass: 'Crypto', quoteCurrency: 'USD',
      latestQuote: { bid: 0.00001734, ask: 0.00001736, updatedAt: '2026-10-03T10:00:00Z', source: 'seed', freshness: 'Live' },
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('SHIBUSD');
    expect(el.textContent).toContain('0.00001734');
    expect(el.textContent).toContain('0.00000002');
    expect(el.textContent).toContain('Sign in to create alerts and watchlists');
    await expectNoAxeViolations(el);
  });

  it('shows not found and sets SSR status 404', async () => {
    const response: { status?: number } = {};
    const { fixture, http } = setup(response);
    http.expectOne('/api/v1/instruments/abc').flush(null, { status: 404, statusText: 'Not Found' });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not found');
    expect(response.status).toBe(404);
  });

  it('creates an alert from the detail page when signed in', async () => {
    const { fixture, http } = setup(undefined, true, { id: 'a1' });
    http.expectOne('/api/v1/instruments/abc').flush({
      id: 'abc', symbol: 'EURUSD', name: 'Euro', assetClass: 'Forex', quoteCurrency: 'USD', latestQuote: null,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-add-to-watchlist')).not.toBeNull();
    const button = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Create alert')) as HTMLButtonElement;
    button.click();
    await new Promise((r) => setTimeout(r));
    expect(TestBed.inject(ToastStore).toasts().map((t) => t.message)).toContain('Alert created for EURUSD');
    await expectNoAxeViolations(el);
  });

  it('stops polling once the instrument is known to be missing', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const { http } = setup();
      http.expectOne('/api/v1/instruments/abc').flush(null, { status: 404, statusText: 'Not Found' });
      await TestBed.inject(ApplicationRef).whenStable();
      vi.advanceTimersByTime(60_000);
      TestBed.tick();
      http.expectNone('/api/v1/instruments/abc');
    } finally {
      vi.useRealTimers();
    }
  });
});
