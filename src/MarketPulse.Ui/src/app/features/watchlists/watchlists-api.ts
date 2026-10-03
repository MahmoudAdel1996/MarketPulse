import { Service, inject } from '@angular/core';
import { HttpClient, HttpContext, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_PAGE_SIZE, PagedResponse, toHttpParams } from '../../core/api/paging';
import { MutationOutcome, runMutation } from '../../core/api/api-error';
import { SKIP_ERROR_TOAST } from '../../core/http/error.interceptor';

export interface MutationOptions {
  /** The caller reports failures itself (no generic error toast). */
  silent?: boolean;
}

export const mutationContext = (options?: MutationOptions) =>
  new HttpContext().set(SKIP_ERROR_TOAST, options?.silent ?? false);
import { Watchlist, WatchlistSummary } from './models';

const BASE = '/api/v1/watchlists';

@Service()
export class WatchlistsApi {
  private readonly http = inject(HttpClient);

  list(page: () => number | undefined, pageSize = DEFAULT_PAGE_SIZE) {
    return httpResource<PagedResponse<WatchlistSummary>>(() => {
      const p = page();
      return p ? { url: BASE, params: toHttpParams({ page: p, pageSize }) } : undefined;
    });
  }

  get(id: () => string | undefined) {
    return httpResource<Watchlist>(() => {
      const value = id();
      return value ? `${BASE}/${value}` : undefined;
    });
  }

  create(name: string): Promise<Watchlist> {
    return firstValueFrom(this.http.post<Watchlist>(BASE, { name }));
  }

  rename(id: string, name: string, options?: MutationOptions): Promise<MutationOutcome> {
    return runMutation(this.http.put(`${BASE}/${id}`, { name }, { context: mutationContext(options) }));
  }

  delete(id: string): Promise<MutationOutcome> {
    return runMutation(this.http.delete(`${BASE}/${id}`));
  }

  addInstrument(id: string, instrumentId: string): Promise<MutationOutcome> {
    return runMutation(this.http.post(`${BASE}/${id}/instruments`, { instrumentId }));
  }

  removeInstrument(id: string, instrumentId: string, options?: MutationOptions): Promise<MutationOutcome> {
    return runMutation(this.http.delete(`${BASE}/${id}/instruments/${instrumentId}`, { context: mutationContext(options) }));
  }
}
