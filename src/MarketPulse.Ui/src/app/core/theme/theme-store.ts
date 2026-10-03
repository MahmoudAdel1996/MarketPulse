import { DOCUMENT, PLATFORM_ID, Service, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'mp-theme';
const ORDER: readonly ThemeMode[] = ['light', 'dark', 'system'];

@Service()
export class ThemeStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly prefersDark = signal(this.browser && (this.darkQuery()?.matches ?? false));
  private readonly current = signal<ThemeMode>(this.readStored());

  readonly mode = this.current.asReadonly();
  readonly resolved = computed<'light' | 'dark'>(() => {
    const mode = this.current();
    return mode === 'system' ? (this.prefersDark() ? 'dark' : 'light') : mode;
  });

  constructor() {
    if (!this.browser) {
      return;
    }
    this.darkQuery()?.addEventListener('change', (event) => this.prefersDark.set(event.matches));
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.resolved();
      try {
        localStorage.setItem(STORAGE_KEY, this.current());
      } catch {
        // Storage can be unavailable (private mode); the theme still applies for this session.
      }
    });
  }

  setMode(mode: ThemeMode): void {
    this.current.set(mode);
  }

  cycle(): void {
    this.current.set(ORDER[(ORDER.indexOf(this.current()) + 1) % ORDER.length]);
  }

  private darkQuery(): MediaQueryList | undefined {
    return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;
  }

  private readStored(): ThemeMode {
    if (!this.browser) {
      return 'system';
    }
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
    } catch {
      return 'system';
    }
  }
}
