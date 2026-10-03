import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PriceFlash } from './price-flash';

@Component({
  selector: 'app-flash-host',
  imports: [PriceFlash],
  template: `<span [appPriceFlash]="value()">{{ value() }}</span>`,
})
class Host {
  readonly value = signal<number | null>(1);
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const span = fixture.nativeElement.querySelector('span') as HTMLElement;
  const set = (v: number | null) => {
    fixture.componentInstance.value.set(v);
    fixture.detectChanges();
  };
  return { span, set };
}

describe('PriceFlash', () => {
  afterEach(() => vi.useRealTimers());

  it('flashes up and down on changes, not on the first value', () => {
    vi.useFakeTimers();
    const { span, set } = setup();
    expect(span.className).toBe('');
    set(2);
    expect(span.classList.contains('flash-up')).toBe(true);
    vi.advanceTimersByTime(600);
    expect(span.classList.contains('flash-up')).toBe(false);
    set(1);
    expect(span.classList.contains('flash-down')).toBe(true);
  });

  it('never flashes on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { span, set } = setup();
    set(5);
    expect(span.className).toBe('');
  });
});
