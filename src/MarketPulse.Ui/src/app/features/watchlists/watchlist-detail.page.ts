import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
import { PricePipe } from '../../shared/format/price.pipe';
import { FreshnessBadge } from '../../shared/ui/freshness-badge';
import { EmptyState, ErrorState, LoadingState, NotFoundState } from '../../shared/ui/states';

@Component({
  selector: 'app-watchlist-detail-page',
  imports: [
    RouterLink,
    DatePipe,
    FormField,
    FieldErrors,
    InstrumentPicker,
    PricePipe,
    FreshnessBadge,
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
            <input id="rename" class="rounded border px-3 py-2 text-xl" [formField]="nameForm.name" aria-describedby="rename-errors" />
            <app-field-errors [field]="nameForm.name" id="rename-errors" />
          </div>
          <button type="submit" class="rounded bg-blue-700 px-3 py-2 text-white">Save</button>
          <button type="button" class="rounded border px-3 py-2" (click)="editing.set(false)">Cancel</button>
        </form>
      } @else {
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-semibold">{{ w.name }}</h1>
          <button type="button" data-testid="rename-watchlist" class="rounded border px-3 py-1" (click)="startEdit(w.name)">
            Rename
          </button>
          <button
            type="button"
            data-testid="delete-watchlist"
            class="rounded border border-red-300 px-3 py-1 text-red-700"
            (click)="remove()"
          >
            Delete
          </button>
        </div>
      }
      <p class="mt-1 text-sm text-slate-600">Created {{ w.createdAt | date: 'mediumDate' }}</p>

      <div class="mt-6 max-w-md">
        <app-instrument-picker inputId="add-instrument" label="Add instrument" (picked)="addInstrument($event)" />
      </div>

      <div class="mt-6">
        @if (w.instruments.length === 0) {
          <app-empty-state message="This watchlist is empty. Add an instrument above." />
        } @else {
          <table class="w-full text-left text-sm">
            <caption class="sr-only">Instruments in {{ w.name }}</caption>
            <thead>
              <tr class="border-b">
                <th scope="col" class="py-2">Symbol</th>
                <th scope="col">Name</th>
                <th scope="col" class="text-right">Bid</th>
                <th scope="col" class="text-right">Ask</th>
                <th scope="col">Freshness</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (item of w.instruments; track item.instrument.id) {
                <tr class="border-b">
                  <td class="py-2">
                    <a [routerLink]="['/instruments', item.instrument.id]" class="text-blue-700 underline">{{ item.instrument.symbol }}</a>
                  </td>
                  <td>{{ item.instrument.name }}</td>
                  <td class="text-right tabular-nums">{{ item.instrument.latestQuote?.bid | price }}</td>
                  <td class="text-right tabular-nums">{{ item.instrument.latestQuote?.ask | price }}</td>
                  <td>
                    @if (item.instrument.latestQuote; as q) {
                      <app-freshness-badge [freshness]="q.freshness" />
                    } @else {
                      No quote
                    }
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="text-red-700 underline"
                      [attr.data-testid]="'remove-' + item.instrument.id"
                      (click)="removeInstrument(item.instrument.id)"
                    >
                      Remove<span class="sr-only"> {{ item.instrument.symbol }}</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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

  private readonly nameModel = signal({ name: '' });
  protected readonly nameForm = form(this.nameModel, (p) => watchlistNameRules(p.name));

  constructor() {
    pollWhileVisible(() => {
      if (!this.notFound()) {
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
      try {
        this.afterMutation(await this.api.rename(this.id(), f.name().value().trim()));
        this.editing.set(false);
        return undefined;
      } catch (err) {
        const errors = validationErrors(err);
        if (errors) {
          return serverErrors(errors, { name: f.name });
        }
        throw err;
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

  protected async removeInstrument(instrumentId: string): Promise<void> {
    this.afterMutation(await this.api.removeInstrument(this.id(), instrumentId));
  }

  private afterMutation(outcome: MutationOutcome): void {
    if (outcome === 'not-found') {
      this.toasts.show('This item no longer exists');
    }
    this.watchlist.reload();
  }
}
