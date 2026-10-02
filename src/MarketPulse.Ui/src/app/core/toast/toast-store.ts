import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

@Service()
export class ToastStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.items.asReadonly();

  show(message: string, kind: Toast['kind'] = 'info'): void {
    const toast: Toast = { id: this.nextId++, message, kind };
    this.items.update((list) => [...list, toast]);
    if (this.isBrowser) {
      setTimeout(() => this.dismiss(toast.id), 5000);
    }
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
