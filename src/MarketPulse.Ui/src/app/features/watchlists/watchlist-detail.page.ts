import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { FormField, form, submit } from '@angular/forms/signals';
import { WatchlistsApi } from './watchlists-api';
import { watchlistNameRules } from './watchlist-name';
import { MutationOutcome, isNotFound, validationErrors } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/api/poll';
import { ToastStore } from '../../core/toast/toast-store';
import { Instrument } from '../instruments/models';
import { confirm } from '../../shared/ui/confirm-dialog';
import { serverErrors } from '../../shared/forms/server-errors';
import { FieldErrors } from '../../shared/ui/field-errors';
import { InstrumentPicker } from '../../shared/ui/instrument-picker';
import { InstrumentCard } from '../instruments/instrument-card';
import { EmptyState, ErrorState, LoadingState, NotFoundState } from '../../shared/ui/states';

@Component({
  selector: 'app-watchlist-detail-page',
  imports: [
    DatePipe,
    FormField,
    FieldErrors,
    InstrumentPicker,
    InstrumentCard,
    EmptyState,
    ErrorState,
    LoadingState,
    NotFoundState,
  ],
  template: `
    @if (notFound()) {
      <app-not-found-state backLink="/watchlists" backLabel="Back to watchlists" />
    } @else if (watchlist.error()) {
      <app-error-state (retry)="watchlist.reload()" />
    } @else if (watchlist.hasValue()) {
      @let w = watchlist.value();
      @if (editing()) {
        <form class="flex flex-wrap items-start gap-2" novalidate (submit)="saveName($event)">
          <div>
            <label for="rename" class="sr-only">Watchlist name</label>
            <input
              id="rename"
              class="rounded-card border border-line bg-surface px-3 py-2 text-xl text-ink"
              [formField]="nameForm.name"
              aria-describedby="rename-errors"
            />
            <app-field-errors [field]="nameForm.name" id="rename-errors" />
          </div>
          <button type="submit" class="rounded-pill bg-brand px-4 py-2 font-semibold text-brand-ink">Save</button>
          <button type="button" class="rounded-pill border border-line px-4 py-2 text-ink" (click)="editing.set(false)">Cancel</button>
        </form>
      } @else {
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-3xl font-extrabold">{{ name() }}</h1>
          <button type="button" data-testid="rename-watchlist" class="rounded-pill border border-line px-3 py-1 text-sm text-ink" (click)="startEdit(name())">
            Rename
          </button>
          <button
            type="button"
            data-testid="delete-watchlist"
            class="rounded-pill border border-line px-3 py-1 text-sm text-down"
            (click)="remove()"
          >
            Delete
          </button>
        </div>
      }
      <p class="mt-1 text-sm text-ink-muted">Created {{ w.createdAt | date: 'mediumDate' }}</p>

      <div class="mt-6 max-w-md">
        <app-instrument-picker inputId="add-instrument" label="Add instrument" (picked)="addInstrument($event)" />
      </div>

      <div class="mt-6">
        @if (visibleItems().length === 0) {
          <app-empty-state message="This watchlist is empty. Add an instrument above." />
        } @else {
          <ul class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            @for (item of visibleItems(); track item.instrument.id) {
              <li class="flex flex-col gap-2">
                <app-instrument-card [instrument]="item.instrument" />
                <button
                  type="button"
                  class="self-end text-sm text-down underline"
                  [attr.data-testid]="'remove-' + item.instrument.id"
                  (click)="removeInstrument(item.instrument)"
                >
                  Remove<span class="sr-only"> {{ item.instrument.symbol }}</span>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    } @else {
      <app-loading-state />
    }
  `,
})
export class WatchlistDetailPage {
  private readonly api = inject(WatchlistsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastStore);

  readonly id = input.required<string>();
  protected readonly watchlist = this.api.get(() => this.id());
  protected readonly notFound = computed(() => isNotFound(this.watchlist.error()));
  protected readonly editing = signal(false);

  // Optimistic state: follows the server copy and resets whenever it reloads.
  protected readonly name = linkedSignal(() => (this.watchlist.hasValue() ? this.watchlist.value().name : ''));
  private readonly hiddenIds = linkedSignal<unknown, ReadonlySet<string>>({
    source: () => this.watchlist.value(),
    computation: () => new Set<string>(),
  });
  protected readonly visibleItems = computed(() =>
    this.watchlist.hasValue() ? this.watchlist.value().instruments.filter((i) => !this.hiddenIds().has(i.instrument.id)) : [],
  );

  private readonly nameModel = signal({ name: '' });
  protected readonly nameForm = form(this.nameModel, (p) => watchlistNameRules(p.name));

  // Mutations in flight; background polls wait so a stale GET can't undo optimistic state.
  private pending = 0;

  constructor() {
    pollWhileVisible(() => {
      if (!this.notFound() && this.pending === 0) {
        this.watchlist.reload();
      }
    });
  }

  protected startEdit(name: string): void {
    this.nameModel.set({ name });
    this.editing.set(true);
  }

  protected async saveName(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.nameForm, async (f) => {
      const previous = this.name();
      const next = f.name().value().trim();
      this.name.set(next);
      this.editing.set(false);
      this.pending++;
      try {
        this.afterMutation(await this.api.rename(this.id(), next, { silent: true }));
        return undefined;
      } catch (err) {
        this.name.set(previous);
        const errors = validationErrors(err);
        if (errors) {
          this.editing.set(true);
          return serverErrors(errors, { name: f.name });
        }
        this.toasts.show("Couldn't rename the watchlist.", 'error');
        return undefined;
      } finally {
        this.pending--;
      }
    });
  }

  protected async remove(): Promise<void> {
    const ok = await confirm(this.dialog, { title: 'Delete watchlist?', message: 'This cannot be undone.', confirmLabel: 'Delete' });
    if (!ok) {
      return;
    }
    if ((await this.api.delete(this.id())) === 'not-found') {
      this.toasts.show('This item no longer exists');
    }
    await this.router.navigate(['/watchlists']);
  }

  protected async addInstrument(instrument: Instrument): Promise<void> {
    this.afterMutation(await this.api.addInstrument(this.id(), instrument.id));
  }

  protected async removeInstrument(instrument: Instrument): Promise<void> {
    const hide = (hidden: boolean) =>
      this.hiddenIds.update((ids) => {
        const next = new Set(ids);
        if (hidden) {
          next.add(instrument.id);
        } else {
          next.delete(instrument.id);
        }
        return next;
      });
    hide(true);
    this.pending++;
    try {
      this.afterMutation(await this.api.removeInstrument(this.id(), instrument.id, { silent: true }));
    } catch {
      hide(false);
      this.toasts.show(`Couldn't remove ${instrument.symbol}.`, 'error');
    } finally {
      this.pending--;
    }
  }

  private afterMutation(outcome: MutationOutcome): void {
    if (outcome === 'not-found') {
      this.toasts.show('This item no longer exists');
    }
    this.watchlist.reload();
  }
}
