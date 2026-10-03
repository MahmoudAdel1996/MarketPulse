import { TestBed } from '@angular/core/testing';
import { PriceChart } from './price-chart';
import { expectNoAxeViolations } from '../../../testing/axe';

const points = [
  { t: '2026-10-03T10:00:00Z', value: 1.5 },
  { t: '2026-10-03T11:00:00Z', value: 2.25 },
  { t: '2026-10-03T12:00:00Z', value: 1.75 },
];

function setup(data = points) {
  TestBed.configureTestingModule({ imports: [PriceChart] });
  const fixture = TestBed.createComponent(PriceChart);
  fixture.componentRef.setInput('points', data);
  fixture.componentRef.setInput('label', 'Gold mid, last 24 hours');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('PriceChart', () => {
  it('renders an accessible chart', async () => {
    const { el } = setup();
    const svg = el.querySelector('svg[role="img"]')!;
    expect(svg.getAttribute('aria-label')).toBe('Gold mid, last 24 hours');
    expect(el.querySelectorAll('path').length).toBe(2);
    await expectNoAxeViolations(el);
  });

  it('moves the crosshair with the keyboard and announces the value', () => {
    const { fixture, el } = setup();
    const svg = el.querySelector('svg')!;
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('2.25');
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('1.75');
    expect(el.querySelector('circle')).not.toBeNull();
  });

  it('toggles a data table with the same series', async () => {
    const { fixture, el } = setup();
    const toggle = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Show data table'))!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
    await expectNoAxeViolations(el);
  });

  it('shows an empty state for fewer than two points', () => {
    const { el } = setup([points[0]]);
    expect(el.textContent).toContain('Not enough history yet');
    expect(el.querySelector('path')).toBeNull();
  });

  it('does not crash when the series shrinks while a point is selected', () => {
    const { fixture, el } = setup();
    el.querySelector('svg')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    fixture.componentRef.setInput('points', points.slice(0, 2));
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(el.querySelectorAll('path').length).toBe(2);
  });
});
