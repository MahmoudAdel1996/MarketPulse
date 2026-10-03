import { buildPath } from './chart-math';

const pts = (values: number[]) => values.map((value, i) => ({ t: `2026-10-03T0${i}:00:00Z`, value }));

describe('buildPath', () => {
  it('returns null for fewer than two points', () => {
    expect(buildPath([], 100, 50)).toBeNull();
    expect(buildPath(pts([1]), 100, 50)).toBeNull();
  });

  it('maps min to the bottom and max to the top within padding', () => {
    const result = buildPath(pts([1, 3, 2]), 100, 50, 5)!;
    expect(result.coords.map((c) => c.x)).toEqual([0, 50, 100]);
    expect(result.coords[0].y).toBe(45);
    expect(result.coords[1].y).toBe(5);
    expect(result.line.startsWith('M0,45')).toBe(true);
    expect(result.area.endsWith('Z')).toBe(true);
  });

  it('centres a flat series instead of dividing by zero', () => {
    const result = buildPath(pts([2, 2, 2]), 100, 50, 5)!;
    expect(result.coords.every((c) => c.y === 25)).toBe(true);
    expect(result.line).not.toContain('NaN');
  });
});
