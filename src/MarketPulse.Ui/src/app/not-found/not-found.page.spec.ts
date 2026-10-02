import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RESPONSE_INIT } from '@angular/core';
import { NotFoundPage } from './not-found.page';
import { expectNoAxeViolations } from '../../testing/axe';

describe('NotFoundPage', () => {
  it('renders a heading and a link home', async () => {
    TestBed.configureTestingModule({ imports: [NotFoundPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Page not found');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/instruments');
    await expectNoAxeViolations(el);
  });

  it('sets the SSR response status to 404', () => {
    const response: { status?: number } = {};
    TestBed.configureTestingModule({ imports: [NotFoundPage], providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: response }] });
    TestBed.createComponent(NotFoundPage);
    expect(response.status).toBe(404);
  });
});
