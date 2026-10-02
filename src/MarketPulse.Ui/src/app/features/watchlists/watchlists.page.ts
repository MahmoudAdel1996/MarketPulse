import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { WatchlistsApi } from './watchlists-api';
import { CreateWatchlistDialog } from './create-watchlist.dialog';
import { Watchlist } from './models';
import { totalPages } from '../../core/api/paging';
import { Pager } from '../../shared/ui/pager';
import { openDialog } from '../../shared/ui/open-dialog';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';

@Component({
  selector: 'app-watchlists-page',
  imports: [RouterLink, DatePipe, Pager, EmptyState, ErrorState, LoadingState],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Watchlists</h1>
      <button type="button" class="rounded bg-blue-700 px-3 py-2 text-white" (click)="create()">New watchlist</button>
    </div>
    <div class="mt-6">
      @if (watchlists.error()) {
        <app-error-state (retry)="watchlists.reload()" />
      } @else if (watchlists.hasValue()) {
        @let page = watchlists.value();
        @if (page.items.length === 0) {
          <app-empty-state message="You have no watchlists yet.">
            <button type="button" class="mt-3 rounded bg-blue-700 px-3 py-2 text-white" (click)="create()">
              Create your first watchlist
            </button>
          </app-empty-state>
        } @else {
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of page.items; track item.id) {
              <li class="rounded-lg border p-4">
                <a [routerLink]="['/watchlists', item.id]" class="text-lg font-medium text-blue-700 underline">{{ item.name }}</a>
                <p class="mt-1 text-sm text-slate-700">{{ item.instrumentCount }} instruments</p>
                <p class="text-sm text-slate-600">Created {{ item.createdAt | date: 'mediumDate' }}</p>
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
export class WatchlistsPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  readonly page = input(1, { transform: (v: unknown) => numberAttribute(v, 1) });
  protected readonly watchlists = inject(WatchlistsApi).list(() => this.page());
  protected readonly pages = computed(() => (this.watchlists.hasValue() ? totalPages(this.watchlists.value()) : 1));

  protected async create(): Promise<void> {
    const ref = openDialog<Watchlist>(this.dialog, CreateWatchlistDialog);
    const created = await firstValueFrom(ref.closed);
    if (created) {
      await this.router.navigate(['/watchlists', created.id]);
    }
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
