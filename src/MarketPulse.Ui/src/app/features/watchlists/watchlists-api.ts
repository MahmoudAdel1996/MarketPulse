import { Service, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_PAGE_SIZE, PagedResponse, toHttpParams } from '../../core/api/paging';
import { MutationOutcome, runMutation } from '../../core/api/api-error';
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

  rename(id: string, name: string): Promise<MutationOutcome> {
    return runMutation(this.http.put(`${BASE}/${id}`, { name }));
  }

  delete(id: string): Promise<MutationOutcome> {
    return runMutation(this.http.delete(`${BASE}/${id}`));
  }

  addInstrument(id: string, instrumentId: string): Promise<MutationOutcome> {
    return runMutation(this.http.post(`${BASE}/${id}/instruments`, { instrumentId }));
  }

  removeInstrument(id: string, instrumentId: string): Promise<MutationOutcome> {
    return runMutation(this.http.delete(`${BASE}/${id}/instruments/${instrumentId}`));
  }
}
