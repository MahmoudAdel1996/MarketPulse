import { Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { AlertsApi } from './alerts-api';
import { AlertDirection, PriceAlert, PriceSide } from './models';
import { isNotFound, validationErrors } from '../../core/api/api-error';
import { serverErrors } from '../../shared/forms/server-errors';
import { FieldErrors } from '../../shared/ui/field-errors';
import { FormAlert } from '../../shared/ui/form-alert';
import { InstrumentPicker } from '../../shared/ui/instrument-picker';
import { Instrument } from '../instruments/models';

export interface CreateAlertData {
  instrument?: { id: string; symbol: string };
}

@Component({
  selector: 'app-create-alert-dialog',
  imports: [FormField, FieldErrors, FormAlert, InstrumentPicker],
  template: `
    <form
      class="w-[28rem] max-w-full space-y-4 rounded-lg bg-white p-6 shadow-xl"
      novalidate
      aria-labelledby="create-alert-title"
      (submit)="onSubmit($event)"
    >
      <h2 id="create-alert-title" class="text-lg font-semibold">New price alert</h2>
      <app-form-alert [form]="f" />
      @if (symbol(); as s) {
        <p>Instrument: <strong>{{ s }}</strong></p>
      } @else {
        <app-instrument-picker inputId="alert-instrument" label="Instrument" (picked)="pick($event)" />
      }
      <app-field-errors [field]="f.instrumentId" id="alert-instrument-errors" />
      <div>
        <label for="alert-side" class="block text-sm font-medium">Price side</label>
        <select id="alert-side" class="mt-1 w-full rounded border px-3 py-2" [formField]="f.priceSide">
          <option value="Bid">Bid</option>
          <option value="Ask">Ask</option>
        </select>
      </div>
      <div>
        <label for="alert-direction" class="block text-sm font-medium">Trigger when price goes</label>
        <select id="alert-direction" class="mt-1 w-full rounded border px-3 py-2" [formField]="f.direction">
          <option value="Above">Above</option>
          <option value="Below">Below</option>
        </select>
      </div>
      <div>
        <label for="alert-threshold" class="block text-sm font-medium">Threshold</label>
        <input
          id="alert-threshold"
          type="number"
          step="any"
          class="mt-1 w-full rounded border px-3 py-2"
          [formField]="f.threshold"
          aria-describedby="alert-threshold-errors"
          [attr.aria-invalid]="f.threshold().touched() && f.threshold().invalid()"
        />
        <app-field-errors [field]="f.threshold" id="alert-threshold-errors" />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded border px-3 py-1" (click)="ref.close()">Cancel</button>
        <button type="submit" class="rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-60" [disabled]="f().submitting()">
          Create alert
        </button>
      </div>
    </form>
  `,
})
export class CreateAlertDialog {
  protected readonly ref = inject<DialogRef<PriceAlert>>(DialogRef);
  private readonly data = inject<CreateAlertData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly api = inject(AlertsApi);

  protected readonly symbol = signal(this.data.instrument?.symbol ?? '');
  private readonly model = signal({
    instrumentId: this.data.instrument?.id ?? '',
    priceSide: 'Bid' as PriceSide,
    direction: 'Above' as AlertDirection,
    threshold: 0,
  });

  protected readonly f = form(this.model, (p) => {
    required(p.instrumentId, { message: 'Choose an instrument.' });
    validate(p.threshold, ({ value }) =>
      value() > 0 ? undefined : { kind: 'positive', message: 'Threshold must be greater than 0.' },
    );
  });

  protected pick(instrument: Instrument): void {
    this.f.instrumentId().value.set(instrument.id);
    this.symbol.set(instrument.symbol);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.f, async (f) => {
      try {
        this.ref.close(await this.api.create(f().value()));
        return undefined;
      } catch (err) {
        if (isNotFound(err)) {
          return { kind: 'server', message: 'This instrument no longer exists.' };
        }
        const errors = validationErrors(err);
        if (errors) {
          return serverErrors(errors, {
            threshold: f.threshold,
            priceside: f.priceSide,
            direction: f.direction,
            instrument: f.instrumentId,
          });
        }
        throw err;
      }
    });
  }
}
