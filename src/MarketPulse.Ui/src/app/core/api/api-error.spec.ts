import { HttpErrorResponse } from '@angular/common/http';
import { throwError, of } from 'rxjs';
import { isNotFound, runMutation, validationErrors } from './api-error';

const error = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

describe('api-error', () => {
  it('detects 404', () => {
    expect(isNotFound(error(404))).toBe(true);
    expect(isNotFound(error(400))).toBe(false);
    expect(isNotFound(new Error('x'))).toBe(false);
  });

  it('extracts validation errors only from 400 problems', () => {
    expect(validationErrors(error(400, { errors: { Name: ['Required'] } }))).toEqual({ Name: ['Required'] });
    expect(validationErrors(error(400, 'bad'))).toBeNull();
    expect(validationErrors(error(500, { errors: {} }))).toBeNull();
  });

  it('maps mutation results', async () => {
    expect(await runMutation(of(null))).toBe('ok');
    expect(await runMutation(throwError(() => error(404)))).toBe('not-found');
    await expect(runMutation(throwError(() => error(500)))).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
