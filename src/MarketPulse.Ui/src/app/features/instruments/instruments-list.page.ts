import { Component, DestroyRef, computed, inject, input, linkedSignal, numberAttribute } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InstrumentsApi } from './instruments-api';
import { ASSET_CLASSES, AssetClass } from './models';
import { pollWhileVisible } from '../../core/api/poll';
import { totalPages } from '../../core/api/paging';
import { AuthStore } from '../../core/auth/auth-store';
import { PricePipe } from '../../shared/format/price.pipe';
import { FreshnessBadge } from '../../shared/ui/freshness-badge';
import { Pager } from '../../shared/ui/pager';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { AddToWatchlist } from '../watchlists/add-to-watchlist';
import { Dialog } from '@angular/cdk/dialog';
import { openCreateAlert } from '../alerts/open-create-alert';
import { ToastStore } from '../../core/toast/toast-store';
import { Instrument } from './models';

@Component({
  selector: 'app-instruments-list-page',
  imports: [RouterLink, DatePipe, PricePipe, FreshnessBadge, Pager, EmptyState, ErrorState, LoadingState, AddToWatchlist],
  template: `
    <h1 class="text-2xl font-semibold">Instruments</h1>
    <div class="mt-4 flex flex-wrap items-end gap-4">
      <div>
        <label for="instrument-search" class="block text-sm font-medium">Search</label>
        <input
          id="instrument-search"
          type="search"
          class="mt-1 rounded border px-3 py-2"
          [value]="searchText()"
          (input)="onSearch($any($event.target).value)"
        />
      </div>
      <div role="group" aria-label="Asset class" class="flex flex-wrap gap-2">
        <button type="button" class="rounded-full border px-3 py-1" [attr.aria-pressed]="!assetClass()" (click)="setAssetClass(null)">
          All
        </button>
        @for (cls of assetClasses; track cls) {
          <button type="button" class="rounded-full border px-3 py-1" [attr.aria-pressed]="assetClass() === cls" (click)="setAssetClass(cls)">
            {{ cls }}
          </button>
        }
      </div>
    </div>

    <div class="mt-6">
      @if (instruments.error()) {
        <app-error-state (retry)="instruments.reload()" />
      } @else if (instruments.hasValue()) {
        @let page = instruments.value();
        @if (page.items.length === 0) {
          <app-empty-state message="No instruments match your filters." />
        } @else {
          <table class="w-full text-left text-sm">
            <caption class="sr-only">Instruments and latest quotes</caption>
            <thead>
              <tr class="border-b">
                <th scope="col" class="py-2">Symbol</th>
                <th scope="col">Name</th>
                <th scope="col">Class</th>
                <th scope="col" class="text-right">Bid</th>
                <th scope="col" class="text-right">Ask</th>
                <th scope="col">Updated</th>
                <th scope="col">Freshness</th>
                @if (auth.isAuthenticated()) {
                  <th scope="col"><span class="sr-only">Actions</span></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of page.items; track item.id) {
                <tr class="border-b">
                  <td class="py-2">
                    <a [routerLink]="['/instruments', item.id]" class="font-medium text-blue-700 underline">{{ item.symbol }}</a>
                  </td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.assetClass }}</td>
                  <td class="text-right tabular-nums">{{ item.latestQuote?.bid | price }}</td>
                  <td class="text-right tabular-nums">{{ item.latestQuote?.ask | price }}</td>
                  <td>{{ item.latestQuote ? (item.latestQuote.updatedAt | date: 'short') : '—' }}</td>
                  <td>
                    @if (item.latestQuote; as q) {
                      <app-freshness-badge [freshness]="q.freshness" />
                    } @else {
                      No quote
                    }
                  </td>
                  @if (auth.isAuthenticated()) {
                    <td class="flex justify-end gap-2 py-2">
                      <app-add-to-watchlist [instrument]="item" />
                    <button type="button" class="rounded bg-blue-700 px-2 py-1 text-sm text-white" (click)="createAlert(item)">Create alert<span class="sr-only"> for {{ item.symbol }}</span></button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
          <app-pager [page]="page.page" [totalPages]="pages()" (pageChange)="goToPage($event)" />
        }
      } @else {
        <app-loading-state />
      }
    </div>
  `,
})
export class InstrumentsListPage {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);
  private readonly dialog = inject(Dialog);
  private readonly toasts = inject(ToastStore);
  protected readonly assetClasses = ASSET_CLASSES;

  readonly search = input<string>();
  readonly assetClass = input<AssetClass>();
  readonly page = input(1, { transform: (v: unknown) => numberAttribute(v, 1) });

  protected readonly instruments = inject(InstrumentsApi).list(() => ({
    search: this.search(),
    assetClass: this.assetClass(),
    page: this.page(),
  }));
  protected readonly pages = computed(() => (this.instruments.hasValue() ? totalPages(this.instruments.value()) : 1));

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // Follows the URL, except while a debounced search is still pending, so a navigation for an
  // earlier term never overwrites what the user is still typing.
  protected readonly searchText = linkedSignal<string | undefined, string>({
    source: this.search,
    computation: (search, previous) => (this.searchTimer !== undefined && previous ? previous.value : (search ?? '')),
  });

  constructor() {
    pollWhileVisible(() => this.instruments.reload());
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected onSearch(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      this.navigate({ search: value || null, page: null });
    }, 300);
  }

  protected setAssetClass(value: AssetClass | null): void {
    this.navigate({ assetClass: value, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }

  protected async createAlert(item: Instrument): Promise<void> {
    if (await openCreateAlert(this.dialog, item)) {
      this.toasts.show(`Alert created for ${item.symbol}`);
    }
  }
}
