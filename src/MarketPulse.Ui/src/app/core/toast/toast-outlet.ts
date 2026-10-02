import { Component, inject } from '@angular/core';
import { ToastStore } from './toast-store';

@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="false">
      @for (toast of store.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg"
          [class]="toast.kind === 'error' ? 'bg-red-700 text-white' : 'bg-slate-800 text-white'"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <span>{{ toast.message }}</span>
          <button type="button" class="underline" (click)="store.dismiss(toast.id)">Dismiss</button>
        </div>
      }
    </div>
  `,
})
export class ToastOutlet {
  protected readonly store = inject(ToastStore);
}
