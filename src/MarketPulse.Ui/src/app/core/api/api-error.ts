import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface ValidationProblem {
  title?: string;
  status?: number;
  errors: Record<string, string[]>;
}

export type MutationOutcome = 'ok' | 'not-found';

const hasStatus = (err: unknown, status: number) => err instanceof HttpErrorResponse && err.status === status;

export const isNotFound = (err: unknown) => hasStatus(err, 404);
export const isUnauthorized = (err: unknown) => hasStatus(err, 401);

export function validationErrors(err: unknown): Record<string, string[]> | null {
  if (!hasStatus(err, 400)) {
    return null;
  }
  const body = (err as HttpErrorResponse).error as Partial<ValidationProblem> | null;
  return body && typeof body === 'object' && body.errors ? body.errors : null;
}

export async function runMutation(request: Observable<unknown>): Promise<MutationOutcome> {
  try {
    await firstValueFrom(request, { defaultValue: null });
    return 'ok';
  } catch (err) {
    if (isNotFound(err)) {
      return 'not-found';
    }
    throw err;
  }
}
