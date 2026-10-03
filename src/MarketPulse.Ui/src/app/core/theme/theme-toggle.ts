import { Component, computed, inject } from '@angular/core';
import { ThemeMode, ThemeStore } from './theme-store';

const LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const ICONS: Record<ThemeMode, string> = { light: '☀', dark: '☾', system: '◐' };

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="grid size-9 place-items-center rounded-pill bg-surface text-ink shadow-card"
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="theme.cycle()"
    >
      <span aria-hidden="true">{{ icon() }}</span>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeStore);
  protected readonly label = computed(() => `Theme: ${LABELS[this.theme.mode()]}`);
  protected readonly icon = computed(() => ICONS[this.theme.mode()]);
}
