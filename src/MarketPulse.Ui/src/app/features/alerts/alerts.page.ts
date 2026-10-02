import { Component, computed, inject, input, numberAttribute } from '@angular/core';
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
      <h1 class="text-2xl font-semibold">Price alerts</h1>
      <a routerLink="/alerts/history" class="text-blue-700 underline">History</a>
      <button type="button" class="ml-auto rounded bg-blue-700 px-3 py-2 text-white" (click)="create()">New alert</button>
    </div>
    <div class="mt-4">
      <label for="enabled-filter" class="mr-2 text-sm font-medium">Show</label>
      <select id="enabled-filter" class="rounded border px-2 py-1" [value]="enabledFilter()" (change)="filterEnabled($any($event.target).value)">
        <option value="">All alerts</option>
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
      @if (instrumentId()) {
        <a routerLink="/alerts" class="ml-3 text-sm text-blue-700 underline">Clear instrument filter</a>
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
          <table class="w-full text-left text-sm">
            <caption class="sr-only">Your price alerts</caption>
            <thead>
              <tr class="border-b">
                <th scope="col" class="py-2">Symbol</th>
                <th scope="col">Condition</th>
                <th scope="col">Enabled</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (alert of page.items; track alert.id) {
                <tr class="border-b">
                  <td class="py-2">
                    <a [routerLink]="['/instruments', alert.instrumentId]" class="text-blue-700 underline">{{ alert.symbol }}</a>
                  </td>
                  <td>{{ alert.priceSide }} {{ alert.direction | lowercase }} {{ alert.threshold | price }}</td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      class="rounded border px-2 py-1"
                      [attr.aria-checked]="alert.isEnabled"
                      (click)="toggle(alert)"
                    >
                      {{ alert.isEnabled ? 'On' : 'Off' }}<span class="sr-only"> — alert for {{ alert.symbol }}</span>
                    </button>
                  </td>
                  <td class="text-right">
                    <button type="button" class="text-red-700 underline" (click)="remove(alert)">
                      Delete<span class="sr-only"> alert for {{ alert.symbol }}</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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
    this.afterMutation(await this.api.setEnabled(alert.id, !alert.isEnabled));
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
