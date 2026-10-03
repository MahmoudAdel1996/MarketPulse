import { Component, computed, input } from '@angular/core';

export type QuoteFreshness = 'Live' | 'Delayed' | 'Stale';

const STYLES: Record<QuoteFreshness, string> = {
  Live: 'bg-up-soft text-up',
  Delayed: 'bg-warn-soft text-warn-ink',
  Stale: 'bg-down-soft text-down',
};

@Component({
  selector: 'app-freshness-badge',
  template: `<span class="rounded px-2 py-0.5 text-xs font-medium" [class]="style()">{{ freshness() }}</span>`,
})
export class FreshnessBadge {
  readonly freshness = input.required<QuoteFreshness>();
  protected readonly style = computed(() => STYLES[this.freshness()]);
}
