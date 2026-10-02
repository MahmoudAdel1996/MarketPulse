import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { RegisterPage } from './register.page';
import { AuthStore } from '../../core/auth/auth-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('RegisterPage', () => {
  it('maps identity errors onto fields', async () => {
    const register = async () => {
      throw new HttpErrorResponse({
        status: 400,
        error: { errors: { PasswordTooShort: ['Passwords must be at least 6 characters.'], DuplicateUserName: ['Username taken.'] } },
      });
    };
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([]), { provide: AuthStore, useValue: { register, isAuthenticated: signal(false), googleSignInUrl: () => '/g' } }],
    });
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [['#email', 'a@b.co'], ['#password', 'x']]) {
      const input = el.querySelector(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('#password-errors')?.textContent).toContain('at least 6');
    expect(el.querySelector('#email-errors')?.textContent).toContain('Username taken.');
    await expectNoAxeViolations(el);
  });
});
