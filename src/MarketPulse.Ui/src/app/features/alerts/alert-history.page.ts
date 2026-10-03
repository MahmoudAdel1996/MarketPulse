import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AlertsApi } from './alerts-api';
import { ALERT_EVENT_STATUSES, AlertEventStatus } from './models';
import { totalPages } from '../../core/api/paging';
import { PricePipe } from '../../shared/format/price.pipe';
import { Pager } from '../../shared/ui/pager';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';

@Component({
  selector: 'app-alert-history-page',
  imports: [RouterLink, DatePipe, PricePipe, Pager, EmptyState, ErrorState, LoadingState],
  template: `
    <div class="flex items-center gap-3">
      <h1 class="text-3xl font-extrabold">Alert history</h1>
      <a routerLink="/alerts" class="text-brand underline">Back to alerts</a>
    </div>
    <div class="mt-4">
      <label for="status-filter" class="mr-2 text-sm font-medium">Status</label>
      <select
        id="status-filter"
        class="rounded-pill border border-line bg-surface px-3 py-1 text-ink"
        [value]="status() ?? ''"
        (change)="navigate({ status: $any($event.target).value || null, page: null })"
      >
        <option value="">All</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
      @if (alertId()) {
        <a routerLink="/alerts/history" class="ml-3 text-sm text-brand underline">Clear alert filter</a>
      }
    </div>
    <div class="mt-6">
      @if (events.error()) {
        <app-error-state (retry)="events.reload()" />
      } @else if (events.hasValue()) {
        @let page = events.value();
        @if (page.items.length === 0) {
          <app-empty-state message="No alerts have triggered yet." />
        } @else {
          <ol class="relative space-y-4 border-l-2 border-line pl-6">
            @for (event of page.items; track event.id) {
              <li class="relative rounded-panel bg-surface shadow-card">
                <span
                  aria-hidden="true"
                  class="absolute -left-[1.95rem] top-4 size-3 rounded-pill ring-4 ring-canvas-from"
                  [class]="dotClass(event.status)"
                ></span>
                <details>
                  <summary class="cursor-pointer px-4 py-3">
                    {{ event.triggeredAt | date: 'medium' }} — observed {{ event.observedPrice | price }} — {{ event.status }}
                  </summary>
                  <table class="mx-4 mb-3 w-[calc(100%-2rem)] text-left text-sm">
                    <caption class="sr-only">Notification deliveries</caption>
                    <thead>
                      <tr class="border-b">
                        <th scope="col">Channel</th>
                        <th scope="col">Status</th>
                        <th scope="col">Attempts</th>
                        <th scope="col">Sent at</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (d of event.deliveries; track $index) {
                        <tr>
                          <td>{{ d.channel }}</td>
                          <td>{{ d.status }}</td>
                          <td>{{ d.attemptCount }}</td>
                          <td>{{ d.sentAt ? (d.sentAt | date: 'medium') : '—' }}</td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="4">No deliveries yet.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </details>
              </li>
            }
          </ol>
          <app-pager [page]="page.page" [totalPages]="pages()" (pageChange)="navigate({ page: $event })" />
        }
      } @else {
        <app-loading-state />
      }
    </div>
  `,
})
export class AlertHistoryPage {
  private readonly router = inject(Router);
  protected readonly statuses = ALERT_EVENT_STATUSES;

  readonly alertId = input<string>();
  readonly status = input<AlertEventStatus>();
  readonly page = input(1, { transform: (v: unknown) => numberAttribute(v, 1) });

  protected readonly events = inject(AlertsApi).events(() => ({
    alertId: this.alertId(),
    status: this.status(),
    page: this.page(),
  }));
  protected readonly pages = computed(() => (this.events.hasValue() ? totalPages(this.events.value()) : 1));

  protected dotClass(status: AlertEventStatus): string {
    const tone = status === 'Notified' ? 'bg-up' : status === 'Failed' ? 'bg-down' : 'bg-warn-ink';
    return `absolute -left-[1.95rem] top-4 size-3 rounded-pill ring-4 ring-canvas-from ${tone}`;
  }

  protected navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
