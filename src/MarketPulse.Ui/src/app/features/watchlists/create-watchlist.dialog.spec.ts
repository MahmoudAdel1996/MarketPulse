import { TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateWatchlistDialog } from './create-watchlist.dialog';
import { WatchlistsApi } from './watchlists-api';
import { Watchlist } from './models';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('CreateWatchlistDialog', () => {
  let closedWith: unknown[] = [];
  let created: string[] = [];
  let createResult: () => Promise<Watchlist> = async () => ({ id: 'w1', name: 'FX', createdAt: '', instruments: [] });

  function setup() {
    TestBed.configureTestingModule({
      imports: [CreateWatchlistDialog],
      providers: [
        { provide: DialogRef, useValue: { close: (v?: unknown) => closedWith.push(v) } },
        {
          provide: WatchlistsApi,
          useValue: {
            create: (name: string) => {
              created.push(name);
              return createResult();
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CreateWatchlistDialog);
    fixture.detectChanges();
    return fixture;
  }

  const submitWith = async (fixture: ReturnType<typeof setup>, name: string) => {
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('#watchlist-name') as HTMLInputElement;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    closedWith = [];
    created = [];
    createResult = async () => ({ id: 'w1', name: 'FX', createdAt: '', instruments: [] });
  });

  it('rejects names over 100 characters client-side', async () => {
    const fixture = setup();
    await submitWith(fixture, 'a'.repeat(101));
    expect(created).toEqual([]);
    expect(fixture.nativeElement.querySelector('#watchlist-name-errors').textContent).toContain('100');
    await expectNoAxeViolations(fixture.nativeElement);
  });

  it('rejects whitespace-only names', async () => {
    const fixture = setup();
    await submitWith(fixture, '   ');
    expect(created).toEqual([]);
    expect(fixture.nativeElement.querySelector('#watchlist-name-errors').textContent).toContain('Name is required.');
  });

  it('creates with a trimmed name and closes with the result', async () => {
    const fixture = setup();
    await submitWith(fixture, '  FX  ');
    expect(created).toEqual(['FX']);
    expect(closedWith).toEqual([expect.objectContaining({ id: 'w1' })]);
  });

  it('shows server validation errors on the field', async () => {
    createResult = async () => {
      throw new HttpErrorResponse({ status: 400, error: { errors: { Name: ['The Name field is required.'] } } });
    };
    const fixture = setup();
    await submitWith(fixture, 'x');
    expect(fixture.nativeElement.querySelector('#watchlist-name-errors').textContent).toContain('The Name field is required.');
  });
});
