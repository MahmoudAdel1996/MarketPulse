import { Component, computed, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChartPoint, ChartTone, buildPath, toneTextClass } from './chart-math';
import { PricePipe } from '../format/price.pipe';

let nextId = 0;

@Component({
  selector: 'app-price-chart',
  imports: [DatePipe, PricePipe],
  template: `
    @if (path(); as p) {
      <svg
        viewBox="0 0 600 220"
        preserveAspectRatio="none"
        role="img"
        tabindex="0"
        [class]="svgClass()"
        [attr.aria-label]="label()"
        (keydown)="onKey($event)"
        (pointermove)="onPointer($event)"
        (pointerleave)="active.set(null)"
        (blur)="active.set(null)"
      >
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.3" />
            <stop offset="1" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path [attr.d]="p.area" [attr.fill]="'url(#' + gradientId + ')'" />
        <path [attr.d]="p.line" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke" />
        @if (active() !== null) {
          @let c = p.coords[active()!];
          <line [attr.x1]="c.x" [attr.x2]="c.x" y1="0" y2="220" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4" vector-effect="non-scaling-stroke" />
          <circle [attr.cx]="c.x" [attr.cy]="c.y" r="5" fill="currentColor" />
        }
      </svg>
      <p class="sr-only" aria-live="polite">
        @if (active() !== null) {
          {{ points()[active()!].t | date: 'medium' }}: {{ points()[active()!].value | price }}
        }
      </p>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p class="text-ink-muted" aria-hidden="true">
          @if (active() !== null) {
            {{ points()[active()!].t | date: 'short' }} ·
            <span class="font-semibold text-ink tabular-nums">{{ points()[active()!].value | price }}</span>
          } @else {
            Hover or use ← → to inspect
          }
        </p>
        <button
          type="button"
          class="text-brand underline"
          [attr.aria-expanded]="showTable()"
          [attr.aria-controls]="tableId"
          (click)="showTable.set(!showTable())"
        >
          {{ showTable() ? 'Hide data table' : 'Show data table' }}
        </button>
      </div>
      @if (showTable()) {
        <div class="mt-2 max-h-64 overflow-auto">
          <table [id]="tableId" class="w-full text-left text-sm">
            <caption class="sr-only">{{ label() }}</caption>
            <thead>
              <tr class="text-ink-muted">
                <th scope="col">Time</th>
                <th scope="col" class="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              @for (point of points(); track point.t) {
                <tr>
                  <td>{{ point.t | date: 'short' }}</td>
                  <td class="text-right tabular-nums">{{ point.value | price }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <p class="grid h-56 place-items-center rounded-card bg-surface-muted text-ink-muted">Not enough history yet</p>
    }
  `,
})
export class PriceChart {
  readonly points = input.required<ChartPoint[]>();
  readonly tone = input<ChartTone>('neutral');
  readonly label = input.required<string>();

  protected readonly gradientId = `chart-fill-${nextId}`;
  protected readonly tableId = `chart-table-${nextId++}`;
  protected readonly path = computed(() => buildPath(this.points(), 600, 220, 12));
  // Selected point; cleared whenever the series changes (range switch or poll) so it can never point past the end.
  protected readonly active = linkedSignal<ChartPoint[], number | null>({ source: this.points, computation: () => null });
  protected readonly showTable = signal(false);
  protected readonly svgClass = computed(
    () => `h-56 w-full rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneTextClass(this.tone())}`,
  );

  protected onKey(event: KeyboardEvent): void {
    const last = this.points().length - 1;
    const current = this.active() ?? -1;
    const next =
      event.key === 'ArrowRight' ? Math.min(current + 1, last)
      : event.key === 'ArrowLeft' ? Math.max(current - 1, 0)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next !== null) {
      event.preventDefault();
      this.active.set(next);
    }
  }

  protected onPointer(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    this.active.set(Math.round(ratio * (this.points().length - 1)));
  }
}
