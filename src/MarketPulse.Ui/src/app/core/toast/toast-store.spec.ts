import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastStore } from './toast-store';

describe('ToastStore', () => {
  afterEach(() => vi.useRealTimers());

  it('shows and auto-dismisses after 5s', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(ToastStore);
    store.show('Saved');
    expect(store.toasts().map((t) => t.message)).toEqual(['Saved']);
    vi.advanceTimersByTime(5000);
    expect(store.toasts()).toEqual([]);
  });

  it('dismisses by id', () => {
    const store = TestBed.inject(ToastStore);
    store.show('A', 'error');
    store.dismiss(store.toasts()[0].id);
    expect(store.toasts()).toEqual([]);
  });
});
