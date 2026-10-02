import { Component, computed, input } from '@angular/core';

export type QuoteFreshness = 'Live' | 'Delayed' | 'Stale';

const STYLES: Record<QuoteFreshness, string> = {
  Live: 'bg-green-100 text-green-800',
  Delayed: 'bg-amber-100 text-amber-900',
  Stale: 'bg-red-100 text-red-800',
};

@Component({
  selector: 'app-freshness-badge',
  template: `<span class="rounded px-2 py-0.5 text-xs font-medium" [class]="style()">{{ freshness() }}</span>`,
})
export class FreshnessBadge {
  readonly freshness = input.required<QuoteFreshness>();
  protected readonly style = computed(() => STYLES[this.freshness()]);
}
