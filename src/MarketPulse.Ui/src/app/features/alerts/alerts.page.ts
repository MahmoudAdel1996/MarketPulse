import { Component, computed, inject, input, linkedSignal, numberAttribute } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { AlertsApi } from './alerts-api';
import { PriceAlert } from './models';
import { openCreateAlert } from './open-create-alert';
import { totalPages } from '../../core/api/paging';
import { MutationOutcome } from '../../core/api/api-error';
import { ToastStore } from '../../core/toast/toast-store';
import { confirm } from '../../shared/ui/confirm-dialog';
import { PricePipe } from '../../shared/format/price.pipe';
import { Pager } from '../../shared/ui/pager';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';

@Component({
  selector: 'app-alerts-page',
  imports: [RouterLink, LowerCasePipe, PricePipe, Pager, EmptyState, ErrorState, LoadingState],
  template: `
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-3xl font-extrabold">Price alerts</h1>
      <a routerLink="/alerts/history" class="text-brand underline">History</a>
      <button type="button" class="ml-auto rounded-pill bg-brand px-4 py-2 font-semibold text-brand-ink" (click)="create()">New alert</button>
    </div>
    <div class="mt-4">
      <label for="enabled-filter" class="mr-2 text-sm font-medium">Show</label>
      <select id="enabled-filter" class="rounded-pill border border-line bg-surface px-3 py-1 text-ink" [value]="enabledFilter()" (change)="filterEnabled($any($event.target).value)">
        <option value="">All alerts</option>
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
      @if (instrumentId()) {
        <a routerLink="/alerts" class="ml-3 text-sm text-brand underline">Clear instrument filter</a>
      }
    </div>
    <div class="mt-6">
      @if (alerts.error()) {
        <app-error-state (retry)="alerts.reload()" />
      } @else if (alerts.hasValue()) {
        @let page = alerts.value();
        @if (page.items.length === 0) {
          <app-empty-state message="No alerts yet." />
        } @else {
          <ul class="space-y-3">
            @for (alert of page.items; track alert.id) {
              <li class="flex flex-wrap items-center gap-4 rounded-panel bg-surface p-4 shadow-card">
                <p data-testid="condition" class="flex-1 font-semibold">
                  <a [routerLink]="['/instruments', alert.instrumentId]" class="text-ink hover:text-brand">{{ alert.symbol }}</a>
                  <span class="text-ink-muted"> · </span>
                  <span class="rounded-pill bg-surface-muted px-3 py-1 text-sm font-medium">
                    {{ alert.priceSide }} {{ alert.direction | lowercase }} {{ alert.threshold | price }}
                  </span>
                </p>
                <button
                  type="button"
                  role="switch"
                  class="flex items-center gap-2 text-sm text-ink"
                  [attr.aria-checked]="enabledOf(alert)"
                  (click)="toggle(alert)"
                >
                  <span
                    aria-hidden="true"
                    class="relative inline-block h-6 w-11 rounded-pill transition-colors"
                    [class]="enabledOf(alert) ? 'relative inline-block h-6 w-11 rounded-pill bg-brand' : 'relative inline-block h-6 w-11 rounded-pill bg-line'"
                  >
                    <span
                      class="absolute top-0.5 size-5 rounded-pill bg-surface shadow transition-all"
                      [style.left]="enabledOf(alert) ? '1.375rem' : '0.125rem'"
                    ></span>
                  </span>
                  {{ enabledOf(alert) ? 'On' : 'Off' }}<span class="sr-only"> — alert for {{ alert.symbol }}</span>
                </button>
                <button type="button" class="text-sm text-down underline" (click)="remove(alert)">
                  Delete<span class="sr-only"> alert for {{ alert.symbol }}</span>
                </button>
              </li>
            }
          </ul>
          <app-pager [page]="page.page" [totalPages]="pages()" (pageChange)="navigate({ page: $event })" />
        }
      } @else {
        <app-loading-state />
      }
    </div>
  `,
})
export class AlertsPage {
  private readonly api = inject(AlertsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastStore);

  readonly instrumentId = input<string>();
  readonly isEnabled = input<string>();
  readonly page = input(1, { transform: (v: unknown) => numberAttribute(v, 1) });

  protected readonly enabledFilter = computed(() => this.isEnabled() ?? '');
  protected readonly alerts = this.api.list(() => ({
    instrumentId: this.instrumentId(),
    isEnabled: this.isEnabled() === 'true' ? true : this.isEnabled() === 'false' ? false : undefined,
    page: this.page(),
  }));
  protected readonly pages = computed(() => (this.alerts.hasValue() ? totalPages(this.alerts.value()) : 1));

  // Optimistic enabled state per alert; reset whenever the list reloads from the server.
  private readonly overrides = linkedSignal<unknown, ReadonlyMap<string, boolean>>({
    source: () => this.alerts.value(),
    computation: () => new Map<string, boolean>(),
  });

  protected enabledOf(alert: PriceAlert): boolean {
    return this.overrides().get(alert.id) ?? alert.isEnabled;
  }

  protected filterEnabled(value: string): void {
    this.navigate({ isEnabled: value || null, page: null });
  }

  protected navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }

  protected async create(): Promise<void> {
    if (await openCreateAlert(this.dialog)) {
      this.alerts.reload();
    }
  }

  protected async toggle(alert: PriceAlert): Promise<void> {
    const previous = this.enabledOf(alert);
    const set = (value: boolean) => this.overrides.update((map) => new Map(map).set(alert.id, value));
    set(!previous);
    try {
      this.afterMutation(await this.api.setEnabled(alert.id, !previous, { silent: true }));
    } catch {
      set(previous);
      this.toasts.show(`Couldn't update the alert for ${alert.symbol}.`, 'error');
    }
  }

  protected async remove(alert: PriceAlert): Promise<void> {
    const ok = await confirm(this.dialog, {
      title: 'Delete alert?',
      message: `Delete the alert for ${alert.symbol}?`,
      confirmLabel: 'Delete',
    });
    if (ok) {
      this.afterMutation(await this.api.delete(alert.id));
    }
  }

  private afterMutation(outcome: MutationOutcome): void {
    if (outcome === 'not-found') {
      this.toasts.show('This item no longer exists');
    }
    this.alerts.reload();
  }
}
