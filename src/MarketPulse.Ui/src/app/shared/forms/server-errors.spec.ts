import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { serverErrors } from './server-errors';

describe('serverErrors', () => {
  it('maps keys to fields case-insensitively and keeps the rest form-level', () => {
    TestBed.runInInjectionContext(() => {
      const f = form(signal({ email: '', password: '' }));
      const result = serverErrors(
        { Email: ['Taken'], PasswordTooShort: ['Too short'], General: ['Nope'] },
        { email: f.email, password: f.password },
      );
      expect(result).toEqual([
        { kind: 'server', message: 'Taken', fieldTree: f.email },
        { kind: 'server', message: 'Too short', fieldTree: f.password },
        { kind: 'server', message: 'Nope' },
      ]);
    });
  });
});
