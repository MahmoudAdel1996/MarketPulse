import { Component, RESPONSE_INIT, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InstrumentsApi } from './instruments-api';
import { QuoteCard } from './quote-card';
import { isNotFound } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/api/poll';
import { AuthStore } from '../../core/auth/auth-store';
import { ErrorState, LoadingState, NotFoundState } from '../../shared/ui/states';
import { AddToWatchlist } from '../watchlists/add-to-watchlist';
import { Dialog } from '@angular/cdk/dialog';
import { openCreateAlert } from '../alerts/open-create-alert';
import { ToastStore } from '../../core/toast/toast-store';
import { Instrument } from './models';

@Component({
  selector: 'app-instrument-detail-page',
  imports: [RouterLink, QuoteCard, ErrorState, LoadingState, NotFoundState, AddToWatchlist],
  template: `
    @if (notFound()) {
      <app-not-found-state backLink="/instruments" backLabel="Back to instruments" />
    } @else if (instrument.error()) {
      <app-error-state (retry)="instrument.reload()" />
    } @else if (instrument.hasValue()) {
      @let item = instrument.value();
      <h1 class="text-2xl font-semibold">
        {{ item.symbol }} <span class="text-base font-normal text-slate-600">{{ item.name }}</span>
      </h1>
      <p class="mt-1 text-sm text-slate-600">{{ item.assetClass }} · quoted in {{ item.quoteCurrency }}</p>
      <div class="mt-6">
        @if (item.latestQuote; as quote) {
          <app-quote-card [quote]="quote" [currency]="item.quoteCurrency" />
        } @else {
          <p>No quote available yet.</p>
        }
      </div>
      <div class="mt-6 flex gap-3">
        @if (auth.isAuthenticated()) {
          <app-add-to-watchlist [instrument]="item" />
          <button type="button" class="rounded bg-blue-700 px-2 py-1 text-sm text-white" (click)="createAlert(item)">Create alert</button>
        } @else {
          <p><a routerLink="/login" class="text-blue-700 underline">Sign in to create alerts and watchlists</a></p>
        }
      </div>
    } @else {
      <app-loading-state />
    }
  `,
})
export class InstrumentDetailPage {
  protected readonly auth = inject(AuthStore);
  private readonly dialog = inject(Dialog);
  private readonly toasts = inject(ToastStore);
  readonly id = input.required<string>();

  protected readonly instrument = inject(InstrumentsApi).get(() => this.id());
  protected readonly notFound = computed(() => isNotFound(this.instrument.error()));

  constructor() {
    pollWhileVisible(() => {
      if (!this.notFound()) {
        this.instrument.reload();
      }
    });
    const response = inject(RESPONSE_INIT, { optional: true });
    effect(() => {
      if (response && this.notFound()) {
        response.status = 404;
      }
    });
  }

  protected async createAlert(item: Instrument): Promise<void> {
    if (await openCreateAlert(this.dialog, item)) {
      this.toasts.show(`Alert created for ${item.symbol}`);
    }
  }
}
