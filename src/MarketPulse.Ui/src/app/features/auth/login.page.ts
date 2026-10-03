import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { AuthStore } from '../../core/auth/auth-store';
import { safeReturnPath } from '../../core/auth/return-url';
import { isUnauthorized, validationErrors } from '../../core/api/api-error';
import { serverErrors } from '../../shared/forms/server-errors';
import { FieldErrors } from '../../shared/ui/field-errors';
import { FormAlert } from '../../shared/ui/form-alert';
import { GOOGLE_ERROR_MESSAGES } from './google-errors';

@Component({
  selector: 'app-login-page',
  imports: [FormField, FieldErrors, FormAlert, RouterLink],
  template: `
    <section class="mx-auto max-w-sm">
      <h1 class="text-2xl font-semibold">Sign in</h1>
      @if (googleError(); as message) {
        <p role="alert" class="mt-4 rounded-pill bg-down-soft px-3 py-2 text-sm text-down">{{ message }}</p>
      }
      <form class="mt-6 space-y-4" novalidate (submit)="onSubmit($event)">
        <app-form-alert [form]="f" />
        <div>
          <label for="email" class="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            class="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-ink"
            [formField]="f.email"
            aria-describedby="email-errors"
            [attr.aria-invalid]="f.email().touched() && f.email().invalid()"
          />
          <app-field-errors [field]="f.email" id="email-errors" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            class="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-ink"
            [formField]="f.password"
            aria-describedby="password-errors"
            [attr.aria-invalid]="f.password().touched() && f.password().invalid()"
          />
          <app-field-errors [field]="f.password" id="password-errors" />
        </div>
        <button type="submit" class="w-full rounded-pill bg-brand py-2 text-brand-ink disabled:opacity-60" [disabled]="f().submitting()">
          Sign in
        </button>
      </form>
      <a class="mt-4 block w-full rounded border py-2 text-center" [href]="googleUrl()">Continue with Google</a>
      <p class="mt-4 text-sm">
        No account?
        <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl() }" class="text-brand underline">Create one</a>
      </p>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();
  readonly error = input<string>();

  protected readonly target = computed(() => safeReturnPath(this.returnUrl()));
  protected readonly googleUrl = computed(() => this.auth.googleSignInUrl(this.target()));
  protected readonly googleError = computed(() => GOOGLE_ERROR_MESSAGES[this.error() ?? ''] ?? null);

  private readonly model = signal({ email: '', password: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.email, { message: 'Email is required.' });
    email(p.email, { message: 'Enter a valid email address.' });
    required(p.password, { message: 'Password is required.' });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.f, async (f) => {
      try {
        await this.auth.login(f.email().value(), f.password().value());
      } catch (err) {
        if (isUnauthorized(err)) {
          return { kind: 'server', message: 'Email or password is incorrect.' };
        }
        const errors = validationErrors(err);
        if (errors) {
          return serverErrors(errors, { email: f.email, password: f.password });
        }
        throw err;
      }
      await this.router.navigateByUrl(this.target());
      return undefined;
    });
  }
}
