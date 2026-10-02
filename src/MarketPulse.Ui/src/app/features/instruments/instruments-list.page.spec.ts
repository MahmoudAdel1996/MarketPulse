import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { vi } from 'vitest';
import { InstrumentsListPage } from './instruments-list.page';
import { AuthStore } from '../../core/auth/auth-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('InstrumentsListPage', () => {
  afterEach(() => vi.useRealTimers());

  function setup(inputs: Record<string, unknown> = {}, signedIn = false) {
    TestBed.configureTestingModule({
      imports: [InstrumentsListPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { isAuthenticated: signal(signedIn) } },
      ],
    });
    const fixture = TestBed.createComponent(InstrumentsListPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('loads the page described by the query string and renders rows', async () => {
    const { fixture, http } = setup({ search: 'eu', assetClass: 'Forex', page: '2' });
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(req.request.params.toString()).toBe('search=eu&assetClass=Forex&page=2&pageSize=20');
    req.flush({
      items: [
        {
          id: '1', symbol: 'EURUSD', name: 'Euro', assetClass: 'Forex', quoteCurrency: 'USD',
          latestQuote: { bid: 1.07, ask: 1.0714, updatedAt: '2026-10-03T10:00:00Z', source: 'seed', freshness: 'Delayed' },
        },
      ],
      page: 2, pageSize: 20, totalCount: 21,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('tbody tr')?.textContent).toContain('EURUSD');
    expect(el.textContent).toContain('Page 2 of 2');
    await expectNoAxeViolations(el);
  });

  it('debounces search typing into a single navigation that resets the page', () => {
    vi.useFakeTimers();
    const { fixture } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const input = (fixture.nativeElement as HTMLElement).querySelector('#instrument-search') as HTMLInputElement;
    for (const value of ['b', 'bt', 'btc']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(300);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { search: 'btc', page: null }, queryParamsHandling: 'merge' }));
  });

  it('marks the active asset class filter as pressed', () => {
    const { fixture } = setup({ assetClass: 'Crypto' });
    const pressed = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[aria-pressed="true"]')].map((b) => b.textContent?.trim());
    expect(pressed).toEqual(['Crypto']);
  });

  it('shows the empty state', async () => {
    const { fixture, http } = setup();
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/v1/instruments').flush({ items: [], page: 1, pageSize: 20, totalCount: 0 });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No instruments match your filters.');
  });

  it('offers add-to-watchlist per row only when signed in', async () => {
    const { fixture, http } = setup({}, true);
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/v1/instruments').flush({
      items: [{ id: '1', symbol: 'EURUSD', name: 'Euro', assetClass: 'Forex', quoteCurrency: 'USD', latestQuote: null }],
      page: 1, pageSize: 20, totalCount: 1,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('tbody app-add-to-watchlist')).not.toBeNull();
    await expectNoAxeViolations(el);
  });

  it('does not overwrite what the user is still typing when an earlier search lands', () => {
    vi.useFakeTimers();
    const { fixture } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const input = (fixture.nativeElement as HTMLElement).querySelector('#instrument-search') as HTMLInputElement;
    input.value = 'bit';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    input.value = 'bitc';
    input.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('search', 'bit');
    fixture.detectChanges();
    expect(input.value).toBe('bitc');
  });
});
