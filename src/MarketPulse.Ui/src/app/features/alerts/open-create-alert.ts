import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { CreateAlertData, CreateAlertDialog } from './create-alert.dialog';
import { PriceAlert } from './models';
import { openDialog } from '../../shared/ui/open-dialog';

export async function openCreateAlert(dialog: Dialog, instrument?: CreateAlertData['instrument']): Promise<PriceAlert | undefined> {
  const ref = openDialog<PriceAlert, CreateAlertData>(dialog, CreateAlertDialog, { data: { instrument } });
  return firstValueFrom(ref.closed);
}
