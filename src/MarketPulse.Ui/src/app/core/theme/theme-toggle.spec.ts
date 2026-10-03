import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ThemeToggle } from './theme-toggle';
import { ThemeStore } from './theme-store';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('ThemeToggle', () => {
  it('names the current mode and cycles on click', async () => {
    let cycles = 0;
    TestBed.configureTestingModule({
      imports: [ThemeToggle],
      providers: [{ provide: ThemeStore, useValue: { mode: signal('system'), cycle: () => cycles++ } }],
    });
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Theme: System');
    button.click();
    expect(cycles).toBe(1);
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
