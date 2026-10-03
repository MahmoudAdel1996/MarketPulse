import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertHistoryPage } from './alert-history.page';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('AlertHistoryPage', () => {
  function setup(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ imports: [AlertHistoryPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AlertHistoryPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('renders events with expandable deliveries', async () => {
    const { fixture, http } = setup({ status: 'Notified' });
    const req = http.expectOne((r) => r.url === '/api/v1/alert-events');
    expect(req.request.params.get('status')).toBe('Notified');
    req.flush({
      items: [
        {
          id: 'e1', priceAlertId: 'a1', observedPrice: 1.5, triggeredAt: '2026-10-03T10:00:00Z', status: 'Notified',
          deliveries: [{ channel: 'Email', status: 'Sent', attemptCount: 1, sentAt: '2026-10-03T10:00:05Z' }],
        },
      ],
      page: 1, pageSize: 20, totalCount: 1,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ol li')?.textContent).toContain('Notified');
    expect(el.querySelector('summary')?.textContent).toContain('1.50');
    expect(el.querySelector('details')?.textContent).toContain('Email');
    expect(el.querySelector('details')?.textContent).toContain('Sent');
    await expectNoAxeViolations(el);
  });

  it('filters by alert id from the query string', () => {
    const { http } = setup({ alertId: 'a1' });
    expect(http.expectOne((r) => r.url === '/api/v1/alert-events').request.params.get('alertId')).toBe('a1');
  });

  it('shows the empty state', async () => {
    const { fixture, http } = setup();
    http.expectOne((r) => r.url === '/api/v1/alert-events').flush({ items: [], page: 1, pageSize: 20, totalCount: 0 });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No alerts have triggered yet.');
  });
});
