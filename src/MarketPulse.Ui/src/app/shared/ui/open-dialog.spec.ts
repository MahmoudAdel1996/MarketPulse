import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { openDialog } from './open-dialog';

@Component({
  selector: 'app-probe-dialog',
  template: `<input id="probe" [value]="value()" />`,
})
class ProbeDialog {
  protected readonly value = signal('bound');
}

describe('openDialog', () => {
  it('binds the dialog view synchronously so it is interactive as soon as it is visible', () => {
    const ref = openDialog(TestBed.inject(Dialog), ProbeDialog);
    expect((document.querySelector('#probe') as HTMLInputElement).value).toBe('bound');
    ref.close();
  });
});
