import { DOCUMENT, DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const POLL_INTERVAL_MS = 15_000;

export function pollWhileVisible(action: () => void, intervalMs = POLL_INTERVAL_MS): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const document = inject(DOCUMENT);
  const handle = setInterval(() => {
    if (document.visibilityState === 'visible') {
      action();
    }
  }, intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(handle));
}
