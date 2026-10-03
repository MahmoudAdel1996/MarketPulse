import { Component, inject, input, signal } from '@angular/core';
import { WatchlistsApi } from './watchlists-api';
import { WatchlistSummary } from './models';
import { ToastStore } from '../../core/toast/toast-store';

let nextId = 0;

@Component({
  selector: 'app-add-to-watchlist',
  host: { class: 'relative inline-block', '(keydown.escape)': 'open.set(false)' },
  template: `
    <button
      type="button"
      class="rounded border px-2 py-1 text-sm"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
    >
      Add to watchlist<span class="sr-only"> ({{ instrument().symbol }})</span>
    </button>
    @if (open()) {
      <div [id]="panelId" class="absolute right-0 z-10 mt-1 min-w-48 rounded border bg-surface py-1 shadow-pop">
        @if (watchlists.hasValue()) {
          <ul>
            @for (w of watchlists.value().items; track w.id) {
              <li>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left hover:bg-surface-muted"
                  [attr.data-testid]="'add-to-' + w.id"
                  (click)="add(w)"
                >
                  {{ w.name }}
                </button>
              </li>
            } @empty {
              <li class="px-3 py-2 text-sm text-ink-muted">No watchlists yet.</li>
            }
          </ul>
        } @else if (watchlists.error()) {
          <p class="px-3 py-2 text-sm text-down">Couldn't load watchlists.</p>
        } @else {
          <p class="px-3 py-2 text-sm text-ink-muted" role="status">Loading…</p>
        }
      </div>
    }
  `,
})
export class AddToWatchlist {
  readonly instrument = input.required<{ id: string; symbol: string }>();
  private readonly api = inject(WatchlistsApi);
  private readonly toasts = inject(ToastStore);
  protected readonly panelId = `add-to-watchlist-${nextId++}`;
  protected readonly open = signal(false);
  private readonly everOpened = signal(false);
  // Only fetch once the panel has been opened.
  protected readonly watchlists = this.api.list(() => (this.everOpened() ? 1 : undefined), 100);

  protected toggle(): void {
    this.everOpened.set(true);
    this.open.set(!this.open());
  }

  protected async add(watchlist: WatchlistSummary): Promise<void> {
    this.open.set(false);
    const outcome = await this.api.addInstrument(watchlist.id, this.instrument().id);
    if (outcome === 'ok') {
      this.toasts.show(`Added ${this.instrument().symbol} to ${watchlist.name}`);
    } else {
      this.toasts.show('This item no longer exists');
      this.watchlists.reload();
    }
  }
}
