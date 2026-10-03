import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { ThemeStore } from './theme-store';

const media = (dark: boolean) =>
  ((query: string) => ({ matches: dark && query.includes('dark'), addEventListener() {}, removeEventListener() {} })) as never;

describe('ThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => vi.restoreAllMocks());

  it('defaults to system and resolves from prefers-color-scheme', () => {
    window.matchMedia = media(true);
    const store = TestBed.inject(ThemeStore);
    TestBed.tick();
    expect(store.mode()).toBe('system');
    expect(store.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('persists an explicit choice and cycles light → dark → system', () => {
    window.matchMedia = media(false);
    const store = TestBed.inject(ThemeStore);
    store.setMode('light');
    TestBed.tick();
    expect(localStorage.getItem('mp-theme')).toBe('light');
    store.cycle();
    TestBed.tick();
    expect(store.mode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    store.cycle();
    expect(store.mode()).toBe('system');
  });

  it('restores the stored mode', () => {
    localStorage.setItem('mp-theme', 'dark');
    window.matchMedia = media(false);
    expect(TestBed.inject(ThemeStore).mode()).toBe('dark');
  });

  it('ignores garbage in storage', () => {
    localStorage.setItem('mp-theme', 'neon');
    window.matchMedia = media(false);
    expect(TestBed.inject(ThemeStore).mode()).toBe('system');
  });

  it('never touches storage or the DOM on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const store = TestBed.inject(ThemeStore);
    store.setMode('dark');
    TestBed.tick();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
