import { HttpParams } from '@angular/common/http';

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export function totalPages(page: PagedResponse<unknown>): number {
  return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
}

export function toHttpParams(query: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    params = params.set(key, String(value));
  }
  return params;
}
