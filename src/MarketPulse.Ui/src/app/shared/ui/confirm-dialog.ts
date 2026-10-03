import { Component, inject } from '@angular/core';
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { openDialog } from './open-dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div
      class="w-96 max-w-full rounded-panel bg-surface p-6 text-ink shadow-pop"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <h2 id="confirm-title" class="text-lg font-semibold">{{ data.title }}</h2>
      <p id="confirm-message" class="mt-2 text-ink-muted">{{ data.message }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" data-testid="cancel" class="rounded-pill border border-line px-3 py-1 text-ink" (click)="ref.close(false)">Cancel</button>
        <button type="button" data-testid="confirm" class="rounded-pill bg-down px-3 py-1 text-surface" (click)="ref.close(true)">
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

export async function confirm(dialog: Dialog, options: ConfirmOptions): Promise<boolean> {
  const ref = openDialog<boolean, ConfirmOptions>(dialog, ConfirmDialog, { data: options });
  return (await firstValueFrom(ref.closed)) === true;
}
