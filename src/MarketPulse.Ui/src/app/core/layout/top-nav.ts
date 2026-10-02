import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../auth/auth-store';

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3" aria-label="Main">
      <a routerLink="/instruments" class="text-lg font-bold text-slate-900">MarketPulse</a>
      <button
        type="button"
        class="ml-auto rounded px-2 py-1 sm:hidden"
        [attr.aria-expanded]="open()"
        aria-controls="nav-links"
        (click)="open.set(!open())"
      >
        Menu
      </button>
      <ul
        id="nav-links"
        class="w-full flex-col gap-2 sm:flex sm:w-auto sm:flex-row sm:gap-4"
        [class.hidden]="!open()"
        [class.flex]="open()"
      >
        <li><a routerLink="/instruments" routerLinkActive="font-semibold underline" ariaCurrentWhenActive="page">Instruments</a></li>
        @if (auth.isAuthenticated()) {
          <li><a routerLink="/watchlists" routerLinkActive="font-semibold underline" ariaCurrentWhenActive="page">Watchlists</a></li>
          <li><a routerLink="/alerts" routerLinkActive="font-semibold underline" ariaCurrentWhenActive="page">Alerts</a></li>
        }
      </ul>
      <div class="flex items-center gap-3 sm:ml-auto">
        @if (auth.user(); as user) {
          <span class="text-sm text-slate-700">{{ user.email }}</span>
          <button type="button" class="rounded border border-slate-300 px-3 py-1 text-sm" (click)="signOut()">Sign out</button>
        } @else {
          <a routerLink="/login" class="rounded bg-blue-700 px-3 py-1 text-sm text-white">Sign in</a>
        }
      </div>
    </nav>
  `,
})
export class TopNav {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly open = signal(false);

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/instruments']);
  }
}
