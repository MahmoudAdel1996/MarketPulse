import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it.each([
    [5_000, 'just now'],
    [42_000, '42s ago'],
    [180_000, '3m ago'],
    [7_200_000, '2h ago'],
    [-5_000, 'just now'],
  ])('%i ms ago → %s', (ms, expected) => expect(relativeTime(ago(ms), now)).toBe(expected));
});
