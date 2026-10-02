import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CreateAlertDialog } from './create-alert.dialog';
import { AlertsApi } from './alerts-api';
import { CreatePriceAlert, PriceAlert } from './models';
import { expectNoAxeViolations } from '../../../testing/axe';

describe('CreateAlertDialog', () => {
  let closedWith: unknown[] = [];
  let created: CreatePriceAlert[] = [];
  let createResult: () => Promise<PriceAlert> = async () => ({ id: 'a1' }) as PriceAlert;

  function setup(data: unknown = { instrument: { id: 'i1', symbol: 'EURUSD' } }) {
    TestBed.configureTestingModule({
      imports: [CreateAlertDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DialogRef, useValue: { close: (v?: unknown) => closedWith.push(v) } },
        { provide: DIALOG_DATA, useValue: data },
        {
          provide: AlertsApi,
          useValue: {
            create: (body: CreatePriceAlert) => {
              created.push(body);
              return createResult();
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CreateAlertDialog);
    fixture.detectChanges();
    return fixture;
  }

  const submitWithThreshold = async (fixture: ReturnType<typeof setup>, value: string) => {
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('#alert-threshold') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    return el;
  };

  beforeEach(() => {
    closedWith = [];
    created = [];
    createResult = async () => ({ id: 'a1' }) as PriceAlert;
  });

  it('requires a positive threshold', async () => {
    const fixture = setup();
    const el = await submitWithThreshold(fixture, '0');
    expect(created).toEqual([]);
    expect(el.querySelector('#alert-threshold-errors')?.textContent).toContain('greater than 0');
    await expectNoAxeViolations(el);
  });

  it('creates for the prefilled instrument', async () => {
    const fixture = setup();
    await submitWithThreshold(fixture, '1.25');
    expect(created).toEqual([{ instrumentId: 'i1', priceSide: 'Bid', direction: 'Above', threshold: 1.25 }]);
    expect(closedWith).toEqual([{ id: 'a1' }]);
  });

  it('requires an instrument when not prefilled', async () => {
    const fixture = setup({});
    const el = await submitWithThreshold(fixture, '1');
    expect(created).toEqual([]);
    expect(el.textContent).toContain('Choose an instrument.');
    await expectNoAxeViolations(el);
  });

  it('shows a form-level message when the instrument vanished (404)', async () => {
    createResult = async () => {
      throw new HttpErrorResponse({ status: 404 });
    };
    const fixture = setup();
    const el = await submitWithThreshold(fixture, '1');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('This instrument no longer exists.');
  });
});
