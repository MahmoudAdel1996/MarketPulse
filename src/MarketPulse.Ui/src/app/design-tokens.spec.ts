import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Guard: components must use design tokens (bg-surface, text-ink, text-up, ...) so both themes work.
const HARD_CODED = /\b(?:bg|text|border|ring|from|to|stroke|fill)-(?:white|black|slate|gray|zinc|blue|red|green|amber|yellow|indigo|pink|rose|emerald)(?:-\d{2,3})?\b/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('design tokens', () => {
  it('no component uses hard-coded palette colours', () => {
    const root = join(process.cwd(), 'src/app');
    const offenders = sourceFiles(root).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(HARD_CODED)].map((m) => `${relative(root, file)}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });
});
