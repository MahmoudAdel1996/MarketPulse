import { Component, inject, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormField, form, submit } from '@angular/forms/signals';
import { WatchlistsApi } from './watchlists-api';
import { Watchlist } from './models';
import { watchlistNameRules } from './watchlist-name';
import { validationErrors } from '../../core/api/api-error';
import { serverErrors } from '../../shared/forms/server-errors';
import { FieldErrors } from '../../shared/ui/field-errors';
import { FormAlert } from '../../shared/ui/form-alert';

@Component({
  selector: 'app-create-watchlist-dialog',
  imports: [FormField, FieldErrors, FormAlert],
  template: `
    <form
      class="w-96 max-w-full rounded-panel bg-surface p-6 text-ink shadow-pop"
      novalidate
      aria-labelledby="create-watchlist-title"
      (submit)="onSubmit($event)"
    >
      <h2 id="create-watchlist-title" class="text-lg font-semibold">New watchlist</h2>
      <app-form-alert [form]="f" />
      <label for="watchlist-name" class="mt-4 block text-sm font-medium">Name</label>
      <input
        id="watchlist-name"
        class="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-ink"
        [formField]="f.name"
        aria-describedby="watchlist-name-errors"
        [attr.aria-invalid]="f.name().touched() && f.name().invalid()"
      />
      <app-field-errors [field]="f.name" id="watchlist-name-errors" />
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-pill border border-line px-3 py-1 text-ink" (click)="ref.close()">Cancel</button>
        <button type="submit" class="rounded-pill bg-brand px-3 py-1 text-brand-ink disabled:opacity-60" [disabled]="f().submitting()">
          Create
        </button>
      </div>
    </form>
  `,
})
export class CreateWatchlistDialog {
  protected readonly ref = inject<DialogRef<Watchlist>>(DialogRef);
  private readonly api = inject(WatchlistsApi);

  private readonly model = signal({ name: '' });
  protected readonly f = form(this.model, (p) => watchlistNameRules(p.name));

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.f, async (f) => {
      try {
        this.ref.close(await this.api.create(f.name().value().trim()));
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
}
