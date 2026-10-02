import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { confirm } from './confirm-dialog';

const click = async (testId: string) => {
  await new Promise((r) => setTimeout(r));
  (document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
};

describe('confirm', () => {
  it('resolves true when confirmed', async () => {
    const result = confirm(TestBed.inject(Dialog), { title: 'Delete?', message: 'Sure?', confirmLabel: 'Delete' });
    await click('confirm');
    expect(await result).toBe(true);
  });

  it('resolves false when cancelled', async () => {
    const result = confirm(TestBed.inject(Dialog), { title: 'Delete?', message: 'Sure?', confirmLabel: 'Delete' });
    await click('cancel');
    expect(await result).toBe(false);
  });
});
