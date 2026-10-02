export function safeReturnPath(value: string | null | undefined, fallback = '/instruments'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
