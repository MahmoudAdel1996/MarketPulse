import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InstrumentCard } from './instrument-card';
import { Instrument } from './models';
import { expectNoAxeViolations } from '../../../testing/axe';

const base: Instrument = {
  id: '1',
  symbol: 'EURUSD',
  name: 'Euro / US Dollar',
  assetClass: 'Forex',
  quoteCurrency: 'USD',
  latestQuote: { bid: 1.0712, ask: 1.0714, updatedAt: '2026-10-03T10:00:00Z', source: 'seed', freshness: 'Live' },
  change24h: 0.21,
};

function render(instrument: Instrument, signedIn = false) {
  TestBed.configureTestingModule({
    imports: [InstrumentCard],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(InstrumentCard);
  fixture.componentRef.setInput('instrument', instrument);
  fixture.componentRef.setInput('signedIn', signedIn);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('InstrumentCard', () => {
  it('shows symbol link, mid price and an up change', async () => {
    const { el } = render(base);
    expect(el.querySelector('a[href="/instruments/1"]')?.textContent).toContain('EURUSD');
    expect(el.textContent).toContain('1.0713');
    const change = el.querySelector('[data-testid="change"]')!;
    expect(change.textContent?.trim()).toBe('▲ +0.21% 24h');
    expect(change.className).toContain('text-up');
    expect(el.querySelector('button')).toBeNull();
    await expectNoAxeViolations(el);
  });

  it('shows a down change', () => {
    const change = render({ ...base, change24h: -1.04 }).el.querySelector('[data-testid="change"]')!;
    expect(change.textContent?.trim()).toBe('▼ −1.04% 24h');
    expect(change.className).toContain('text-down');
  });

  it('shows a dash when the change is unknown', () => {
    expect(render({ ...base, change24h: null }).el.querySelector('[data-testid="change"]')?.textContent?.trim()).toBe('— 24h');
  });

  it('offers watchlist and alert actions when signed in', async () => {
    const { fixture, el } = render(base, true);
    const emitted: string[] = [];
    fixture.componentInstance.createAlert.subscribe((i) => emitted.push(i.symbol));
    expect(el.textContent).toContain('Add to watchlist');
    const alert = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Create alert for EURUSD'))!;
    alert.click();
    expect(emitted).toEqual(['EURUSD']);
    await expectNoAxeViolations(el);
  });
});
