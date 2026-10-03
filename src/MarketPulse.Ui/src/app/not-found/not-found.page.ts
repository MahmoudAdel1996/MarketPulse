import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <p class="mt-2 text-ink-muted">The page you are looking for does not exist.</p>
    <a routerLink="/instruments" class="mt-4 inline-block text-brand underline">Go to instruments</a>
  `,
})
export class NotFoundPage {
  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
  }
}
