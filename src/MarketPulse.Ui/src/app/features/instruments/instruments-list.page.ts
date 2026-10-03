import { Component, DestroyRef, computed, inject, input, linkedSignal, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { InstrumentsApi } from './instruments-api';
import { InstrumentCard } from './instrument-card';
import { ASSET_CLASSES, AssetClass, Instrument } from './models';
import { pollWhileVisible } from '../../core/api/poll';
import { totalPages } from '../../core/api/paging';
import { AuthStore } from '../../core/auth/auth-store';
import { ToastStore } from '../../core/toast/toast-store';
import { relativeTime } from '../../shared/format/relative-time';
import { Pager } from '../../shared/ui/pager';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { openCreateAlert } from '../alerts/open-create-alert';

@Component({
  selector: 'app-instruments-list-page',
  imports: [InstrumentCard, Pager, EmptyState, ErrorState, LoadingState],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold">Markets</h1>
        @if (instruments.hasValue()) {
          <p class="text-sm text-ink-muted">{{ instruments.value().totalCount }} instruments · updated {{ updatedText() }}</p>
        }
      </div>
      <div>
        <label for="instrument-search" class="sr-only">Search instruments</label>
        <input
          id="instrument-search"
          type="search"
          placeholder="Search symbol or name"
          class="w-64 rounded-pill border border-line bg-surface px-4 py-2 text-ink shadow-card placeholder:text-ink-muted"
          [value]="searchText()"
          (input)="onSearch($any($event.target).value)"
        />
      </div>
    </div>

    <div role="group" aria-label="Asset class" class="mt-4 flex flex-wrap gap-2">
      <button type="button" [class]="chipClass(!assetClass())" [attr.aria-pressed]="!assetClass()" (click)="setAssetClass(null)">All</button>
      @for (cls of assetClasses; track cls) {
        <button type="button" [class]="chipClass(assetClass() === cls)" [attr.aria-pressed]="assetClass() === cls" (click)="setAssetClass(cls)">
          {{ cls }}
        </button>
      }
    </div>

    <div class="mt-6">
      @if (instruments.error()) {
        <app-error-state (retry)="instruments.reload()" />
      } @else if (instruments.hasValue()) {
        @let page = instruments.value();
        @if (page.items.length === 0) {
          <app-empty-state message="No instruments match your filters." />
        } @else {
          <ul class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            @for (item of page.items; track item.id) {
              <li>
                <app-instrument-card [instrument]="item" [signedIn]="auth.isAuthenticated()" (createAlert)="createAlert($event)" />
              </li>
            }
          </ul>
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

  private readonly now = signal(Date.now());
  protected readonly updatedText = computed(() => {
    const times = this.instruments.hasValue()
      ? this.instruments.value().items.flatMap((i) => (i.latestQuote ? [i.latestQuote.updatedAt] : []))
      : [];
    if (times.length === 0) {
      return '—';
    }
    return relativeTime(times.reduce((a, b) => (a > b ? a : b)), this.now());
  });

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // Follows the URL, except while a debounced search is still pending, so a navigation for an
  // earlier term never overwrites what the user is still typing.
  protected readonly searchText = linkedSignal<string | undefined, string>({
    source: this.search,
    computation: (search, previous) => (this.searchTimer !== undefined && previous ? previous.value : (search ?? '')),
  });

  constructor() {
    pollWhileVisible(() => {
      this.now.set(Date.now());
      this.instruments.reload();
    });
    pollWhileVisible(() => this.now.set(Date.now()), 5_000);
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

  protected chipClass(pressed: boolean): string {
    return pressed
      ? 'rounded-pill bg-brand px-3 py-1 text-sm font-semibold text-brand-ink'
      : 'rounded-pill bg-surface px-3 py-1 text-sm text-ink shadow-card';
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
