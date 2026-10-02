import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { LoginPage } from './login.page';
import { AuthStore } from '../../core/auth/auth-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('LoginPage', () => {
  let calls: [string, string][] = [];
  let outcome: () => Promise<void> = async () => {};
  const login = (email: string, password: string) => {
    calls.push([email, password]);
    return outcome();
  };

  function setup(inputs: Record<string, string | undefined> = {}) {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { login, isAuthenticated: signal(false), googleSignInUrl: (p: string) => `/g?r=${p}` } },
      ],
    });
    const fixture = TestBed.createComponent(LoginPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture;
  }

  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  const submitForm = async (fixture: ReturnType<typeof setup>) => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    calls = [];
    outcome = async () => {};
  });

  it('blocks submit when invalid and shows field errors', async () => {
    const fixture = setup();
    await submitForm(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(calls).toEqual([]);
    expect(el.querySelector('#email-errors')?.textContent).toContain('Email is required');
    await expectNoAxeViolations(el);
  });

  it('logs in and navigates to a safe returnUrl', async () => {
    const fixture = setup({ returnUrl: '/alerts' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;
    type(el, '#email', 'a@b.co');
    type(el, '#password', 'P@ssword1!');
    await submitForm(fixture);
    expect(calls).toEqual([['a@b.co', 'P@ssword1!']]);
    expect(navigate).toHaveBeenCalledWith('/alerts');
  });

  it('ignores an unsafe returnUrl', async () => {
    const fixture = setup({ returnUrl: '//evil.com' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;
    type(el, '#email', 'a@b.co');
    type(el, '#password', 'pw');
    await submitForm(fixture);
    expect(navigate).toHaveBeenCalledWith('/instruments');
  });

  it('shows a form-level error on 401', async () => {
    outcome = async () => {
      throw new HttpErrorResponse({ status: 401 });
    };
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    type(el, '#email', 'a@b.co');
    type(el, '#password', 'wrong');
    await submitForm(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Email or password is incorrect.');
  });

  it('shows google error messages from the query string', () => {
    const fixture = setup({ error: 'missing_email' });
    expect(fixture.nativeElement.textContent).toContain('Google did not share an email address');
  });
});
