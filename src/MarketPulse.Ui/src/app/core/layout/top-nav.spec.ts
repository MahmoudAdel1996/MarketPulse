import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TopNav } from './top-nav';
import { AuthStore } from '../auth/auth-store';
import { expectNoAxeViolations } from '../../../testing/axe';

function setup(user: { email: string } | null) {
  TestBed.configureTestingModule({
    imports: [TopNav],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { user: signal(user), isAuthenticated: signal(!!user), logout: async () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(TopNav);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('TopNav', () => {
  it('shows only public links and sign in when anonymous', async () => {
    const el = setup(null);
    const links = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(links).toContain('Instruments');
    expect(links).not.toContain('Watchlists');
    expect(links).toContain('Sign in');
    await expectNoAxeViolations(el);
  });

  it('shows account links and the user email when signed in', async () => {
    const el = setup({ email: 'me@x.io' });
    const links = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(expect.arrayContaining(['Watchlists', 'Alerts']));
    expect(el.textContent).toContain('me@x.io');
    await expectNoAxeViolations(el);
  });
});
