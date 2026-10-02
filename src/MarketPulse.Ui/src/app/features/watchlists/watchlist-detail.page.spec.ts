import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { WatchlistDetailPage } from './watchlist-detail.page';
import { ToastStore } from '../../core/toast/toast-store';
import { expectNoAxeViolations } from '../../../testing/axe';

const watchlist = {
  id: 'w1',
  name: 'FX',
  createdAt: '2026-10-03T00:00:00Z',
  instruments: [
    {
      addedAt: '2026-10-03T00:00:00Z',
      instrument: {
        id: 'i1', symbol: 'EURUSD', name: 'Euro', assetClass: 'Forex', quoteCurrency: 'USD',
        latestQuote: { bid: 1.07, ask: 1.08, updatedAt: '2026-10-03T00:00:00Z', source: 'seed', freshness: 'Live' },
      },
    },
  ],
};

describe('WatchlistDetailPage', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function configure() {
    TestBed.configureTestingModule({
      imports: [WatchlistDetailPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // Confirm dialogs auto-accept: the dialog itself is covered by confirm-dialog.spec.
        { provide: Dialog, useValue: { open: () => ({ closed: of(true) }) } },
      ],
    });
  }

  async function setup(id = 'w1', body: object | null = watchlist, status = 200) {
    configure();
    const fixture = TestBed.createComponent(WatchlistDetailPage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`/api/v1/watchlists/${id}`).flush(body, { status, statusText: 'x' });
    await settle();
    fixture.detectChanges();
    return { fixture, http, el: fixture.nativeElement as HTMLElement };
  }

  it('lists instruments and passes axe', async () => {
    const { el } = await setup();
    expect(el.querySelector('h1')?.textContent).toContain('FX');
    expect(el.querySelector('tbody')?.textContent).toContain('EURUSD');
    await expectNoAxeViolations(el);
  });

  it('removes an instrument and reloads', async () => {
    const { el, http } = await setup();
    (el.querySelector('[data-testid="remove-i1"]') as HTMLButtonElement).click();
    http.expectOne({ method: 'DELETE', url: '/api/v1/watchlists/w1/instruments/i1' }).flush(null, { status: 204, statusText: 'x' });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    http.expectOne('/api/v1/watchlists/w1');
  });

  it('deletes after confirmation and toasts when it already vanished', async () => {
    const { el, http } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const toasts = TestBed.inject(ToastStore);
    (el.querySelector('[data-testid="delete-watchlist"]') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    http.expectOne({ method: 'DELETE', url: '/api/v1/watchlists/w1' }).flush(null, { status: 404, statusText: 'x' });
    await settle();
    expect(toasts.toasts().map((t) => t.message)).toContain('This item no longer exists');
    expect(navigate).toHaveBeenCalledWith(['/watchlists']);
  });

  it('renames inline', async () => {
    const { fixture, el, http } = await setup();
    (el.querySelector('[data-testid="rename-watchlist"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = el.querySelector('#rename') as HTMLInputElement;
    input.value = ' Majors ';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r));
    const req = http.expectOne({ method: 'PUT', url: '/api/v1/watchlists/w1' });
    expect(req.request.body).toEqual({ name: 'Majors' });
  });

  it('shows not found for a missing watchlist', async () => {
    const { el } = await setup('nope', null, 404);
    expect(el.textContent).toContain('Not found');
  });
});
