import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

export function formatPrice(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined): string {
    return formatPrice(value, this.locale);
  }
}
