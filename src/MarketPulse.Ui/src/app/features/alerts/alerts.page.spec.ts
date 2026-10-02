import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertsPage } from './alerts.page';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('AlertsPage', () => {
  function setup(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ imports: [AlertsPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AlertsPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('toggles an alert and reloads', async () => {
    const { fixture, http } = setup();
    http.expectOne((r) => r.url === '/api/v1/alerts').flush({
      items: [
        { id: 'a1', instrumentId: 'i1', symbol: 'EURUSD', priceSide: 'Bid', direction: 'Above', threshold: 1.1, isEnabled: true, createdAt: '2026-10-03T00:00:00Z' },
      ],
      page: 1, pageSize: 20, totalCount: 1,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('tbody')?.textContent).toContain('Bid above 1.10');
    const toggle = el.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await expectNoAxeViolations(el);
    toggle.click();
    http.expectOne({ method: 'POST', url: '/api/v1/alerts/a1/disable' }).flush(null, { status: 204, statusText: 'x' });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/v1/alerts');
  });

  it('passes query-string filters to the API', () => {
    const { http } = setup({ isEnabled: 'false', instrumentId: 'i1' });
    expect(http.expectOne((r) => r.url === '/api/v1/alerts').request.params.toString()).toBe('instrumentId=i1&isEnabled=false&page=1&pageSize=20');
  });
});
