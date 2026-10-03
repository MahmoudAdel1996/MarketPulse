import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { InstrumentsApi } from '../../features/instruments/instruments-api';
import { Instrument } from '../../features/instruments/models';

@Component({
  selector: 'app-instrument-picker',
  template: `
    <label [for]="inputId()" class="block text-sm font-medium">{{ label() }}</label>
    <div class="relative">
      <input
        [id]="inputId()"
        type="text"
        role="combobox"
        autocomplete="off"
        class="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-ink"
        aria-autocomplete="list"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="inputId() + '-listbox'"
        [attr.aria-activedescendant]="active() >= 0 ? inputId() + '-option-' + active() : null"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKeydown($event)"
        (blur)="close()"
      />
      <ul
        [id]="inputId() + '-listbox'"
        role="listbox"
        [attr.aria-label]="label()"
        class="absolute z-10 mt-1 w-full rounded border bg-surface shadow"
        [class.hidden]="!open()"
      >
        @for (item of options(); track item.id; let i = $index) {
          <li
            [id]="inputId() + '-option-' + i"
            role="option"
            class="cursor-pointer px-3 py-2"
            [class.bg-surface-muted]="i === active()"
            [attr.aria-selected]="i === active()"
            (mousedown)="$event.preventDefault(); pick(item)"
          >
            {{ item.symbol }} — {{ item.name }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class InstrumentPicker {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly picked = output<Instrument>();

  private readonly term = signal('');
  private readonly results = inject(InstrumentsApi).list(() =>
    this.term() ? { search: this.term(), page: 1, pageSize: 8 } : undefined,
  );
  protected readonly options = computed(() => (this.results.hasValue() ? this.results.value().items : []));
  protected readonly active = signal(-1);
  private readonly dismissed = signal(false);
  protected readonly open = computed(() => !this.dismissed() && this.options().length > 0);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(value: string): void {
    clearTimeout(this.timer);
    this.dismissed.set(false);
    this.active.set(-1);
    this.timer = setTimeout(() => this.term.set(value.trim()), 300);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.set((this.active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set((this.active() - 1 + count) % count);
    } else if (event.key === 'Enter' && this.active() >= 0) {
      event.preventDefault();
      this.pick(this.options()[this.active()]);
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  protected pick(item: Instrument): void {
    this.picked.emit(item);
    this.close();
  }

  protected close(): void {
    this.dismissed.set(true);
    this.active.set(-1);
  }
}
