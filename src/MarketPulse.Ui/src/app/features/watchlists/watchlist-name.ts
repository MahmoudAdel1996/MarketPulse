import { SchemaPath, maxLength, validate } from '@angular/forms/signals';
import { WATCHLIST_NAME_MAX } from './models';

/** Shared rules for watchlist names: required after trimming, at most WATCHLIST_NAME_MAX characters. */
export function watchlistNameRules(path: SchemaPath<string>): void {
  validate(path, ({ value }) => (value().trim() ? undefined : { kind: 'required', message: 'Name is required.' }));
  maxLength(path, WATCHLIST_NAME_MAX, { message: `Name must be at most ${WATCHLIST_NAME_MAX} characters.` });
}
