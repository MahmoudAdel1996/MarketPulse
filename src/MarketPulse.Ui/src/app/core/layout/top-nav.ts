import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../auth/auth-store';
import { ThemeToggle } from '../theme/theme-toggle';

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <nav
      class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 rounded-panel bg-surface/75 px-4 py-2.5 shadow-card backdrop-blur-md"
      aria-label="Main"
    >
      <a routerLink="/instruments" class="bg-linear-to-r from-brand to-accent bg-clip-text text-lg font-extrabold text-transparent">
        MarketPulse
      </a>
      <button
        type="button"
        class="ml-auto rounded-pill px-3 py-1 text-ink sm:hidden"
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
        <li><a routerLink="/instruments" class="text-ink-muted hover:text-ink" routerLinkActive="font-semibold text-brand!" ariaCurrentWhenActive="page">Instruments</a></li>
        @if (auth.isAuthenticated()) {
          <li><a routerLink="/watchlists" class="text-ink-muted hover:text-ink" routerLinkActive="font-semibold text-brand!" ariaCurrentWhenActive="page">Watchlists</a></li>
          <li><a routerLink="/alerts" class="text-ink-muted hover:text-ink" routerLinkActive="font-semibold text-brand!" ariaCurrentWhenActive="page">Alerts</a></li>
        }
      </ul>
      <div class="flex items-center gap-3 sm:ml-auto">
        <app-theme-toggle />
        @if (auth.user(); as user) {
          <span class="text-sm text-ink-muted">{{ user.email }}</span>
          <button type="button" class="rounded-pill border border-line px-3 py-1 text-sm text-ink" (click)="signOut()">Sign out</button>
        } @else {
          <a routerLink="/login" class="rounded-pill bg-brand px-4 py-1.5 text-sm font-semibold text-brand-ink">Sign in</a>
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
