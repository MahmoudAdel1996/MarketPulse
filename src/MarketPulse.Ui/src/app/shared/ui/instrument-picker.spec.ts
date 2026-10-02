import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { InstrumentPicker } from './instrument-picker';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('InstrumentPicker', () => {
  afterEach(() => vi.useRealTimers());

  it('searches after typing and picks with the keyboard', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [InstrumentPicker], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(InstrumentPicker);
    fixture.componentRef.setInput('inputId', 'pick');
    fixture.componentRef.setInput('label', 'Instrument');
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((i) => picked.push(i.symbol));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#pick') as HTMLInputElement;
    input.value = 'eu';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/instruments' && r.params.get('search') === 'eu' && r.params.get('pageSize') === '8')
      .flush({
        items: [{ id: '1', symbol: 'EURUSD', name: 'Euro', assetClass: 'Forex', quoteCurrency: 'USD', latestQuote: null }],
        page: 1, pageSize: 8, totalCount: 1,
      });
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe('pick-option-0');
    await expectNoAxeViolations(fixture.nativeElement);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(picked).toEqual(['EURUSD']);
  });
});
