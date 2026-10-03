import { TestBed } from '@angular/core/testing';
import { Sparkline } from './sparkline';

function render(values: number[]) {
  TestBed.configureTestingModule({ imports: [Sparkline] });
  const fixture = TestBed.createComponent(Sparkline);
  fixture.componentRef.setInput('points', values.map((value, i) => ({ t: String(i), value })));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Sparkline', () => {
  it('draws a decorative line', () => {
    const el = render([1, 2, 1.5]);
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('path').length).toBe(1);
  });

  it('renders nothing for a single point', () => {
    expect(render([1]).querySelector('svg')).toBeNull();
  });
});
