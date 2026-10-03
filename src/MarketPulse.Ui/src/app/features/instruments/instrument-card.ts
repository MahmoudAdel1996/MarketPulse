import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InstrumentsApi } from './instruments-api';
import { Instrument, midPrice } from './models';
import { ChartTone } from '../../shared/chart/chart-math';
import { Sparkline } from '../../shared/chart/sparkline';
import { PricePipe } from '../../shared/format/price.pipe';
import { FreshnessBadge } from '../../shared/ui/freshness-badge';
import { PriceFlash } from '../../shared/ui/price-flash';
import { AddToWatchlist } from '../watchlists/add-to-watchlist';

export function changeLabel(change: number | null | undefined, suffix = ''): string {
  if (change == null) {
    return `—${suffix}`;
  }
  return `${change >= 0 ? '▲ +' : '▼ −'}${Math.abs(change).toFixed(2)}%${suffix}`;
}

export function changeTone(change: number | null | undefined): ChartTone {
  return change == null || change === 0 ? 'neutral' : change > 0 ? 'up' : 'down';
}

export const toneClass = (tone: ChartTone) => (tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink-muted');

/** Loads the 24h series only once the card scrolls into view (used inside @defer). */
@Component({
  selector: 'app-card-sparkline',
  imports: [Sparkline],
  template: `<app-sparkline [points]="points()" [tone]="tone()" />`,
})
export class CardSparkline {
  readonly instrumentId = input.required<string>();
  readonly tone = input<ChartTone>('neutral');
  private readonly history = inject(InstrumentsApi).history(
    () => this.instrumentId(),
    () => '24h',
  );
  protected readonly points = computed(() =>
    this.history.hasValue() ? this.history.value().points.map((p) => ({ t: p.t, value: (p.bid + p.ask) / 2 })) : [],
  );
}

@Component({
  selector: 'app-instrument-card',
  imports: [RouterLink, PricePipe, FreshnessBadge, PriceFlash, CardSparkline, AddToWatchlist],
  host: { class: 'block h-full' },
  template: `
    <article
      class="relative flex h-full flex-col rounded-panel bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
      [appPriceFlash]="mid()"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-bold">
            <a
              [routerLink]="['/instruments', instrument().id]"
              class="after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand"
              [style.view-transition-name]="'instrument-' + instrument().id"
              >{{ instrument().symbol }}</a
            >
          </h2>
          <p class="text-xs text-ink-muted">{{ instrument().name }}</p>
        </div>
        @if (instrument().latestQuote; as q) {
          <app-freshness-badge [freshness]="q.freshness" />
        }
      </div>
      <p class="mt-3 text-2xl font-extrabold tabular-nums">{{ mid() | price }}</p>
      <p data-testid="change" class="text-sm font-semibold" [class]="changeClass()">{{ changeText() }}</p>
      <div class="mt-2">
        @defer (on viewport) {
          <app-card-sparkline [instrumentId]="instrument().id" [tone]="tone()" />
        } @placeholder {
          <div class="h-7 rounded bg-surface-muted"></div>
        }
      </div>
      <p class="mt-2 flex justify-between text-xs text-ink-muted tabular-nums">
        <span>Bid {{ instrument().latestQuote?.bid | price }}</span>
        <span>Ask {{ instrument().latestQuote?.ask | price }}</span>
      </p>
      @if (signedIn()) {
        <div class="relative z-10 mt-3 flex flex-wrap gap-2">
          <app-add-to-watchlist [instrument]="instrument()" />
          <button
            type="button"
            class="rounded-pill bg-brand px-3 py-1 text-xs font-semibold text-brand-ink"
            (click)="createAlert.emit(instrument())"
          >
            <span aria-hidden="true">🔔 </span>Alert<span class="sr-only"> — Create alert for {{ instrument().symbol }}</span>
          </button>
        </div>
      }
    </article>
  `,
})
export class InstrumentCard {
  readonly instrument = input.required<Instrument>();
  readonly signedIn = input(false);
  readonly createAlert = output<Instrument>();

  protected readonly mid = computed(() => {
    const quote = this.instrument().latestQuote;
    return quote ? midPrice(quote) : null;
  });
  protected readonly tone = computed(() => changeTone(this.instrument().change24h));
  protected readonly changeText = computed(() => changeLabel(this.instrument().change24h, ' 24h'));
  protected readonly changeClass = computed(() => `text-sm font-semibold ${toneClass(this.tone())}`);
}
