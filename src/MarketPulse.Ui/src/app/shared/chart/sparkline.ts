import { Component, computed, input } from '@angular/core';
import { ChartPoint, ChartTone, buildPath, toneTextClass } from './chart-math';

@Component({
  selector: 'app-sparkline',
  template: `
    @if (path(); as p) {
      <svg viewBox="0 0 100 28" class="h-7 w-full" [class]="color()" preserveAspectRatio="none" aria-hidden="true">
        <path [attr.d]="p.line" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>
    }
  `,
})
export class Sparkline {
  readonly points = input.required<ChartPoint[]>();
  readonly tone = input<ChartTone>('neutral');
  protected readonly path = computed(() => buildPath(this.points(), 100, 28, 3));
  protected readonly color = computed(() => `h-7 w-full ${toneTextClass(this.tone())}`);
}
