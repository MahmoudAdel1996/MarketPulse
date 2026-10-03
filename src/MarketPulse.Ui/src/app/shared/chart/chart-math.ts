export interface ChartPoint {
  t: string;
  value: number;
}

export interface ChartPath {
  line: string;
  area: string;
  coords: { x: number; y: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Scales points into a width×height box (min at the bottom, max at the top). Null when there is nothing to draw. */
export function buildPath(points: ChartPoint[], width: number, height: number, pad = 8): ChartPath | null {
  if (points.length < 2) {
    return null;
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: round(i * step),
    y: span === 0 ? height / 2 : round(pad + (1 - (p.value - min) / span) * (height - pad * 2)),
  }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  return { line, area: `${line} L${width},${height} L0,${height} Z`, coords };
}

export type ChartTone = 'up' | 'down' | 'neutral';

export const toneTextClass = (tone: ChartTone) => (tone === 'down' ? 'text-down' : tone === 'up' ? 'text-up' : 'text-brand');
