import { Service } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DEFAULT_PAGE_SIZE, PagedResponse, toHttpParams } from '../../core/api/paging';
import { History, HistoryRangeValue, Instrument, InstrumentQuery } from './models';

const BASE = '/api/v1/instruments';

@Service()
export class InstrumentsApi {
  list(query: () => InstrumentQuery | undefined) {
    return httpResource<PagedResponse<Instrument>>(() => {
      const q = query();
      if (!q) {
        return undefined;
      }
      return {
        url: BASE,
        params: toHttpParams({
          search: q.search?.trim(),
          assetClass: q.assetClass,
          page: q.page,
          pageSize: q.pageSize ?? DEFAULT_PAGE_SIZE,
        }),
      };
    });
  }

  get(id: () => string | undefined) {
    return httpResource<Instrument>(() => {
      const value = id();
      return value ? `${BASE}/${value}` : undefined;
    });
  }

  history(id: () => string | undefined, range: () => HistoryRangeValue) {
    return httpResource<History>(() => {
      const value = id();
      return value ? { url: `${BASE}/${value}/history`, params: { range: range() } } : undefined;
    });
  }
}
