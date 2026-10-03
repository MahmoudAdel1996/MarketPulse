import { DestroyRef, Directive, ElementRef, PLATFORM_ID, effect, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Briefly tints the host when a polled price moves up or down (see .flash-up/.flash-down in styles.css). */
@Directive({ selector: '[appPriceFlash]' })
export class PriceFlash {
  readonly appPriceFlash = input.required<number | null | undefined>();

  private previous: number | null | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));

    effect(() => {
      const value = this.appPriceFlash();
      const before = this.previous;
      this.previous = value;
      if (!browser || before == null || value == null || value === before) {
        return;
      }
      el.classList.remove('flash-up', 'flash-down');
      el.classList.add(value > before ? 'flash-up' : 'flash-down');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 600);
    });
  }
}
