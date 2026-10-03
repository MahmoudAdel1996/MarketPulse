import { ComponentType } from '@angular/cdk/portal';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

/**
 * Opens a CDK dialog and renders it immediately. Without this, the dialog's bindings
 * (including Signal Forms' [formField]) are only applied on the next scheduled change
 * detection, so input typed in that window is lost (NG0950).
 */
export function openDialog<R, D = unknown, C = unknown>(
  dialog: Dialog,
  component: ComponentType<C>,
  config?: DialogConfig<D, DialogRef<R, C>>,
): DialogRef<R, C> {
  const ref = dialog.open<R, D, C>(component, { panelClass: 'mp-dialog', maxWidth: '100vw', ...config });
  ref.componentRef?.changeDetectorRef.detectChanges();
  return ref;
}
