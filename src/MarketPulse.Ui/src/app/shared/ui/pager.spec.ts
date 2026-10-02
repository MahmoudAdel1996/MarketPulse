import { TestBed } from '@angular/core/testing';
import { Pager } from './pager';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('Pager', () => {
  it('emits next/previous and disables at the edges', async () => {
    TestBed.configureTestingModule({ imports: [Pager] });
    const fixture = TestBed.createComponent(Pager);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 3);
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => emitted.push(p));
    fixture.detectChanges();
    const [prev, next] = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(prev.disabled).toBe(true);
    next.click();
    expect(emitted).toEqual([2]);
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 3');
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
