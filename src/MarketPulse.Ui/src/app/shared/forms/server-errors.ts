import { FieldTree, ValidationError } from '@angular/forms/signals';

export function serverErrors(
  errors: Record<string, string[]>,
  fields: Record<string, FieldTree<unknown>>,
): ValidationError.WithOptionalFieldTree[] {
  const result: ValidationError.WithOptionalFieldTree[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const match = Object.keys(fields).find((name) => key.toLowerCase().includes(name.toLowerCase()));
    for (const message of messages) {
      result.push(match ? { kind: 'server', message, fieldTree: fields[match] } : { kind: 'server', message });
    }
  }
  return result;
}
