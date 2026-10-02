import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Me } from './models';

const AUTH = '/api/v1/auth';

@Service()
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<Me | null>(null);
  private readonly state = signal<'unknown' | 'loading' | 'ready'>('unknown');

  readonly user = this.current.asReadonly();
  readonly status = this.state.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.current.set(await firstValueFrom(this.http.get<Me>(`${AUTH}/me`)));
    } catch {
      this.current.set(null);
    } finally {
      this.state.set('ready');
    }
  }

  async login(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH}/login`, { email, password }));
    await this.load();
  }

  async register(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH}/register`, { email, password }));
    await this.load();
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${AUTH}/logout`, null));
    this.clear();
  }

  clear(): void {
    this.current.set(null);
  }

  googleSignInUrl(returnPath: string): string {
    const origin = this.document.location.origin;
    return `${AUTH}/google/login?returnUrl=${encodeURIComponent(origin + returnPath)}`;
  }
}
