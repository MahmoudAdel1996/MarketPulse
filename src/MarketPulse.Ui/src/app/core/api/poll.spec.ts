import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { pollWhileVisible } from './poll';

describe('pollWhileVisible', () => {
  afterEach(() => vi.useRealTimers());

  function host(action: () => void) {
    @Component({ selector: 'app-host', template: '' })
    class Host {
      constructor() {
        pollWhileVisible(action, 1000);
      }
    }
    return TestBed.createComponent(Host);
  }

  it('polls while visible and stops on destroy', () => {
    vi.useFakeTimers();
    let calls = 0;
    const fixture = host(() => calls++);
    vi.advanceTimersByTime(3000);
    expect(calls).toBe(3);
    fixture.destroy();
    vi.advanceTimersByTime(3000);
    expect(calls).toBe(3);
  });

  it('skips ticks while the tab is hidden', () => {
    vi.useFakeTimers();
    let calls = 0;
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    host(() => calls++);
    vi.advanceTimersByTime(3000);
    expect(calls).toBe(0);
    visibility.mockRestore();
  });

  it('does nothing on the server', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    let calls = 0;
    host(() => calls++);
    vi.advanceTimersByTime(3000);
    expect(calls).toBe(0);
  });
});
