import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

@Component({
  selector: 'app-field-errors',
  template: `
    <div [id]="id()" class="mt-1 text-sm text-red-700">
      @if (visible()) {
        @for (error of field()().errors(); track $index) {
          <p>{{ error.message ?? 'This field is invalid.' }}</p>
        }
      }
    </div>
  `,
})
export class FieldErrors {
  readonly field = input.required<FieldTree<unknown>>();
  readonly id = input.required<string>();
  protected readonly visible = computed(() => this.field()().touched() && this.field()().invalid());
}
