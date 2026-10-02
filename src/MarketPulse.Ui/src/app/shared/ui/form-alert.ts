import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

@Component({
  selector: 'app-form-alert',
  template: `
    @if (messages().length) {
      <div role="alert" class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
        @for (message of messages(); track $index) {
          <p>{{ message }}</p>
        }
      </div>
    }
  `,
})
export class FormAlert {
  readonly form = input.required<FieldTree<unknown>>();
  protected readonly messages = computed(() =>
    this.form()()
      .errors()
      .filter((e) => e.fieldTree === this.form())
      .map((e) => e.message ?? 'Something went wrong.'),
  );
}
