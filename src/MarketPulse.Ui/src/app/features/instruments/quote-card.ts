import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PricePipe } from '../../shared/format/price.pipe';
import { FreshnessBadge } from '../../shared/ui/freshness-badge';
import { Quote } from './models';

@Component({
  selector: 'app-quote-card',
  imports: [DatePipe, PricePipe, FreshnessBadge],
  template: `
    <dl class="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3">
      <div>
        <dt class="text-sm text-slate-600">Bid</dt>
        <dd class="text-xl tabular-nums">{{ quote().bid | price }} {{ currency() }}</dd>
      </div>
      <div>
        <dt class="text-sm text-slate-600">Ask</dt>
        <dd class="text-xl tabular-nums">{{ quote().ask | price }} {{ currency() }}</dd>
      </div>
      <div>
        <dt class="text-sm text-slate-600">Spread</dt>
        <dd class="text-xl tabular-nums">{{ spread() | price }}</dd>
      </div>
      <div>
        <dt class="text-sm text-slate-600">Source</dt>
        <dd>{{ quote().source }}</dd>
      </div>
      <div>
        <dt class="text-sm text-slate-600">Updated</dt>
        <dd>{{ quote().updatedAt | date: 'medium' }}</dd>
      </div>
      <div>
        <dt class="text-sm text-slate-600">Freshness</dt>
        <dd><app-freshness-badge [freshness]="quote().freshness" /></dd>
      </div>
    </dl>
  `,
})
export class QuoteCard {
  readonly quote = input.required<Quote>();
  readonly currency = input.required<string>();
  // Rounding to 1e-8 avoids float artefacts like 2.0000000000000003e-8.
  protected readonly spread = computed(() => Math.round((this.quote().ask - this.quote().bid) * 1e8) / 1e8);
}
