import { Component, RESPONSE_INIT, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { InstrumentsApi } from './instruments-api';
import { changeLabel, changeTone, toneClass } from './instrument-card';
import { HISTORY_RANGES, HistoryRangeValue, Instrument, Quote, midPrice } from './models';
import { isNotFound } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/api/poll';
import { AuthStore } from '../../core/auth/auth-store';
import { ToastStore } from '../../core/toast/toast-store';
import { PriceChart } from '../../shared/chart/price-chart';
import { PricePipe } from '../../shared/format/price.pipe';
import { relativeTime } from '../../shared/format/relative-time';
import { ErrorState, LoadingState, NotFoundState } from '../../shared/ui/states';
import { PriceFlash } from '../../shared/ui/price-flash';
import { AddToWatchlist } from '../watchlists/add-to-watchlist';
import { openCreateAlert } from '../alerts/open-create-alert';

type Side = 'bid' | 'ask' | 'mid';
const SIDES: { value: Side; label: string }[] = [
  { value: 'bid', label: 'Bid' },
  { value: 'ask', label: 'Ask' },
  { value: 'mid', label: 'Mid' },
];
const RANGE_LABELS: Record<HistoryRangeValue, string> = { '1h': 'hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' };

const asRange = (value: unknown): HistoryRangeValue =>
  HISTORY_RANGES.includes(value as HistoryRangeValue) ? (value as HistoryRangeValue) : '24h';
const asSide = (value: unknown): Side => (value === 'bid' || value === 'ask' ? value : 'mid');

@Component({
  selector: 'app-instrument-detail-page',
  imports: [RouterLink, PriceChart, PricePipe, PriceFlash, ErrorState, LoadingState, NotFoundState, AddToWatchlist],
  template: `
    @if (notFound()) {
      <app-not-found-state backLink="/instruments" backLabel="Back to instruments" />
    } @else if (instrument.error()) {
      <app-error-state (retry)="instrument.reload()" />
    } @else if (instrument.hasValue()) {
      @let item = instrument.value();
      <a routerLink="/instruments" class="text-sm text-ink-muted hover:text-ink">← Markets</a>
      <header class="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold">
            <span [style.view-transition-name]="'instrument-' + item.id">{{ item.symbol }}</span>
            <span class="text-base font-medium text-ink-muted"> {{ item.name }} · {{ item.assetClass }}</span>
          </h1>
          @if (item.latestQuote; as q) {
            <p class="mt-1 text-4xl font-extrabold tabular-nums" [appPriceFlash]="sideValue(q)">
              {{ sideValue(q) | price }}
              <span data-testid="series-change" class="text-base font-semibold" [class]="seriesChangeClass()">{{ seriesChangeText() }}</span>
            </p>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          @if (auth.isAuthenticated()) {
            <app-add-to-watchlist [instrument]="item" />
            <button type="button" class="rounded-pill bg-brand px-4 py-1.5 text-sm font-semibold text-brand-ink" (click)="createAlert(item)">
              Create alert
            </button>
          } @else {
            <a routerLink="/login" class="rounded-pill bg-surface px-4 py-1.5 text-sm text-brand shadow-card underline">
              Sign in to create alerts and watchlists
            </a>
          }
        </div>
      </header>

      <section class="mt-4 rounded-panel bg-surface p-4 shadow-card" aria-labelledby="chart-heading">
        <h2 id="chart-heading" class="sr-only">Price history</h2>
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Range" class="flex gap-1">
            @for (r of ranges; track r) {
              <button type="button" [attr.aria-pressed]="range() === r" [class]="segmentClass(range() === r)" (click)="setRange(r)">
                {{ r.toUpperCase() }}
              </button>
            }
          </div>
          <div role="radiogroup" aria-label="Price side" class="ml-auto flex gap-1">
            @for (s of sides; track s.value) {
              <button type="button" role="radio" [attr.aria-checked]="side() === s.value" [class]="segmentClass(side() === s.value)" (click)="setSide(s.value)">
                {{ s.label }}
              </button>
            }
          </div>
        </div>
        @if (history.error()) {
          <p class="grid h-56 place-items-center rounded-card bg-surface-muted text-ink-muted">History unavailable</p>
        } @else if (history.hasValue()) {
          <app-price-chart [points]="series()" [tone]="seriesTone()" [label]="item.name + ' ' + side() + ', last ' + rangeLabel()" />
        } @else {
          <div class="h-56 animate-pulse rounded-card bg-surface-muted"></div>
        }
      </section>

      @if (item.latestQuote; as q) {
        <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-card bg-surface p-3 shadow-card">
            <dt class="text-xs text-ink-muted">Bid</dt>
            <dd class="font-bold tabular-nums">{{ q.bid | price }}</dd>
          </div>
          <div class="rounded-card bg-surface p-3 shadow-card">
            <dt class="text-xs text-ink-muted">Ask</dt>
            <dd class="font-bold tabular-nums">{{ q.ask | price }}</dd>
          </div>
          <div class="rounded-card bg-surface p-3 shadow-card">
            <dt class="text-xs text-ink-muted">Spread</dt>
            <dd class="font-bold tabular-nums">{{ spread(q) | price }}</dd>
          </div>
          <div class="rounded-card bg-surface p-3 shadow-card">
            <dt class="text-xs text-ink-muted">Updated</dt>
            <dd class="font-bold">{{ updated(q) }}</dd>
          </div>
        </dl>
      } @else {
        <p class="mt-4 text-ink-muted">No quote available yet.</p>
      }
    } @else {
      <app-loading-state />
    }
  `,
})
export class InstrumentDetailPage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(InstrumentsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastStore);

  protected readonly ranges = HISTORY_RANGES;
  protected readonly sides = SIDES;

  readonly id = input.required<string>();
  readonly range = input<HistoryRangeValue, unknown>('24h', { transform: asRange });
  readonly side = input<Side, unknown>('mid', { transform: asSide });

  protected readonly instrument = this.api.get(() => this.id());
  protected readonly notFound = computed(() => isNotFound(this.instrument.error()));
  protected readonly history = this.api.history(
    () => (this.notFound() ? undefined : this.id()),
    () => this.range(),
  );

  protected readonly series = computed(() => {
    if (!this.history.hasValue()) {
      return [];
    }
    const side = this.side();
    return this.history.value().points.map((p) => ({
      t: p.t,
      value: side === 'bid' ? p.bid : side === 'ask' ? p.ask : (p.bid + p.ask) / 2,
    }));
  });
  private readonly seriesChange = computed(() => {
    const points = this.series();
    if (points.length < 2 || points[0].value === 0) {
      return null;
    }
    return Math.round(((points.at(-1)!.value - points[0].value) / points[0].value) * 10_000) / 100;
  });
  protected readonly seriesTone = computed(() => changeTone(this.seriesChange()));
  protected readonly seriesChangeText = computed(() => (this.seriesChange() == null ? '' : changeLabel(this.seriesChange())));
  protected readonly seriesChangeClass = computed(() => `text-base font-semibold ${toneClass(this.seriesTone())}`);
  protected readonly rangeLabel = computed(() => RANGE_LABELS[this.range()]);

  private readonly now = signal(Date.now());

  constructor() {
    pollWhileVisible(() => {
      if (!this.notFound()) {
        this.now.set(Date.now());
        this.instrument.reload();
        this.history.reload();
      }
    });
    const response = inject(RESPONSE_INIT, { optional: true });
    effect(() => {
      if (response && this.notFound()) {
        response.status = 404;
      }
    });
  }

  protected sideValue(quote: Quote): number {
    const side = this.side();
    return side === 'bid' ? quote.bid : side === 'ask' ? quote.ask : midPrice(quote);
  }

  protected spread(quote: Quote): number {
    return Math.round((quote.ask - quote.bid) * 1e8) / 1e8;
  }

  protected updated(quote: Quote): string {
    return relativeTime(quote.updatedAt, this.now());
  }

  protected segmentClass(active: boolean): string {
    return active ? 'rounded-lg bg-surface-muted px-3 py-1 text-sm font-semibold text-brand' : 'rounded-lg px-3 py-1 text-sm text-ink-muted';
  }

  protected setRange(range: HistoryRangeValue): void {
    void this.router.navigate([], { queryParams: { range }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected setSide(side: Side): void {
    void this.router.navigate([], { queryParams: { side }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected async createAlert(item: Instrument): Promise<void> {
    if (await openCreateAlert(this.dialog, item)) {
      this.toasts.show(`Alert created for ${item.symbol}`);
    }
  }
}
