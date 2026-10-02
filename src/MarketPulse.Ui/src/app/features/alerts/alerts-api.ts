import { Service, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_PAGE_SIZE, PagedResponse, toHttpParams } from '../../core/api/paging';
import { MutationOutcome, runMutation } from '../../core/api/api-error';
import { AlertEvent, AlertEventQuery, CreatePriceAlert, PriceAlert, PriceAlertQuery } from './models';

@Service()
export class AlertsApi {
  private readonly http = inject(HttpClient);

  list(query: () => PriceAlertQuery) {
    return httpResource<PagedResponse<PriceAlert>>(() => {
      const q = query();
      return {
        url: '/api/v1/alerts',
        params: toHttpParams({ instrumentId: q.instrumentId, isEnabled: q.isEnabled, page: q.page, pageSize: DEFAULT_PAGE_SIZE }),
      };
    });
  }

  create(body: CreatePriceAlert): Promise<PriceAlert> {
    return firstValueFrom(this.http.post<PriceAlert>('/api/v1/alerts', body));
  }

  setEnabled(id: string, enabled: boolean): Promise<MutationOutcome> {
    return runMutation(this.http.post(`/api/v1/alerts/${id}/${enabled ? 'enable' : 'disable'}`, null));
  }

  delete(id: string): Promise<MutationOutcome> {
    return runMutation(this.http.delete(`/api/v1/alerts/${id}`));
  }

  events(query: () => AlertEventQuery) {
    return httpResource<PagedResponse<AlertEvent>>(() => {
      const q = query();
      return {
        url: '/api/v1/alert-events',
        params: toHttpParams({ alertId: q.alertId, status: q.status, page: q.page, pageSize: DEFAULT_PAGE_SIZE }),
      };
    });
  }
}
