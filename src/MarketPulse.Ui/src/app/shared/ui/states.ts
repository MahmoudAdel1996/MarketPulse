import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-loading-state',
  template: `
    <div role="status" class="space-y-2">
      @for (row of [1, 2, 3]; track row) {
        <div class="h-6 animate-pulse rounded bg-slate-200"></div>
      }
      <span class="sr-only">Loading…</span>
    </div>
  `,
})
export class LoadingState {}

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="rounded border border-dashed border-slate-300 p-6 text-center text-slate-700">
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
}

@Component({
  selector: 'app-error-state',
  template: `
    <div role="alert" class="rounded border border-red-300 bg-red-50 p-4 text-red-800">
      <p>We couldn't load this. Please try again.</p>
      <button type="button" class="mt-2 rounded bg-red-700 px-3 py-1 text-white" (click)="retry.emit()">Retry</button>
    </div>
  `,
})
export class ErrorState {
  readonly retry = output<void>();
}

@Component({
  selector: 'app-not-found-state',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold">Not found</h1>
    <p class="mt-2 text-slate-700">This item doesn't exist or you don't have access to it.</p>
    <a [routerLink]="backLink()" class="mt-4 inline-block text-blue-700 underline">{{ backLabel() }}</a>
  `,
})
export class NotFoundState {
  readonly backLink = input.required<string>();
  readonly backLabel = input.required<string>();
}
