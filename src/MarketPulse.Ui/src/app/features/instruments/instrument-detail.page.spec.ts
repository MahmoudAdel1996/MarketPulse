import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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

const flushHistory = (http: HttpTestingController) =>
  http.match((r) => r.url.endsWith('/history')).forEach((r) => !r.cancelled && r.flush({ range: '24h', points: [] }));

describe('InstrumentDetailPage', () => {
  function setup(responseInit?: { status?: number }, signedIn = false, dialogResult: unknown = undefined, inputs: Record<string, string> = {}) {
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
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
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
    flushHistory(http);
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
    flushHistory(http);
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
    flushHistory(http);
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
      flushHistory(http);
      await TestBed.inject(ApplicationRef).whenStable();
      vi.advanceTimersByTime(60_000);
      TestBed.tick();
      http.expectNone('/api/v1/instruments/abc');
      http.expectNone((r) => r.url.endsWith('/history'));
    } finally {
      vi.useRealTimers();
    }
  });

  const instrument = {
    id: 'abc', symbol: 'XAUUSD', name: 'Gold Spot', assetClass: 'Commodity', quoteCurrency: 'USD', change24h: 0.48,
    latestQuote: { bid: 2650.4, ask: 2650.9, updatedAt: new Date().toISOString(), source: 'seed', freshness: 'Live' },
  };
  const history = {
    range: '24h',
    points: [
      { t: '2026-10-03T10:00:00Z', bid: 100, ask: 102 },
      { t: '2026-10-03T11:00:00Z', bid: 105, ask: 106 },
      { t: '2026-10-03T12:00:00Z', bid: 110, ask: 110 },
    ],
  };

  async function loaded(inputs: Record<string, string> = {}, historyStatus = 200) {
    const ctx = setup(undefined, false, undefined, inputs);
    ctx.http.expectOne('/api/v1/instruments/abc').flush(instrument);
    const range = inputs['range'] ?? '24h';
    ctx.http
      .expectOne((r) => r.url === '/api/v1/instruments/abc/history' && r.params.get('range') === range)
      .flush(historyStatus === 200 ? history : null, { status: historyStatus, statusText: 'x' });
    await TestBed.inject(ApplicationRef).whenStable();
    ctx.fixture.detectChanges();
    return { ...ctx, el: ctx.fixture.nativeElement as HTMLElement };
  }

  it('charts the 24h mid series by default and shows stat tiles', async () => {
    const { el } = await loaded();
    expect(el.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe('Gold Spot mid, last 24 hours');
    expect(el.querySelector('[data-testid="series-change"]')?.textContent?.trim()).toBe('▲ +8.91%');
    const tiles = el.querySelector('dl')!.textContent!;
    expect(tiles).toContain('Bid');
    expect(tiles).toContain('2,650.40');
    expect(tiles).toContain('Spread');
    expect(tiles).toContain('0.50');
    expect(tiles).toContain('Updated');
    await expectNoAxeViolations(el);
  });

  it('follows the selected side for the chart and the change badge', async () => {
    const { el } = await loaded({ side: 'bid' });
    expect(el.querySelector('[data-testid="series-change"]')?.textContent?.trim()).toBe('▲ +10.00%');
    expect(el.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe('Gold Spot bid, last 24 hours');
    expect(el.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim()).toBe('Bid');
  });

  it('requests the selected range and navigates when another is chosen', async () => {
    const { el } = await loaded({ range: '7d' });
    expect(el.querySelector('[aria-pressed="true"]')?.textContent?.trim()).toBe('7D');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    ([...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === '30D') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { range: '30d' }, queryParamsHandling: 'merge' }));
  });

  it('falls back to 24h for an unknown range', () => {
    const { http } = setup(undefined, false, undefined, { range: 'bogus' });
    http.expectOne('/api/v1/instruments/abc').flush(instrument);
    http.expectOne((r) => r.url === '/api/v1/instruments/abc/history' && r.params.get('range') === '24h');
  });

  it('keeps the quote when history is unavailable', async () => {
    const { el } = await loaded({}, 503);
    expect(el.textContent).toContain('History unavailable');
    expect(el.querySelector('dl')?.textContent).toContain('2,650.40');
  });
});
