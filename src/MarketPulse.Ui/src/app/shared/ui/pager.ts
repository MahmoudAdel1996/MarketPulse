import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pager',
  template: `
    <nav class="mt-4 flex items-center gap-3" aria-label="Pagination">
      <button type="button" class="rounded border px-3 py-1 disabled:opacity-50" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">
        Previous
      </button>
      <span aria-live="polite">Page {{ page() }} of {{ totalPages() }}</span>
      <button
        type="button"
        class="rounded border px-3 py-1 disabled:opacity-50"
        [disabled]="page() >= totalPages()"
        (click)="pageChange.emit(page() + 1)"
      >
        Next
      </button>
    </nav>
  `,
})
export class Pager {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
}
