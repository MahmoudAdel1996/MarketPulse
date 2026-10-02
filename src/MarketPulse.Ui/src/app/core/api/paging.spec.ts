import { toHttpParams, totalPages } from './paging';

describe('paging', () => {
  it('computes total pages with a minimum of 1', () => {
    expect(totalPages({ items: [], page: 1, pageSize: 20, totalCount: 0 })).toBe(1);
    expect(totalPages({ items: [], page: 1, pageSize: 20, totalCount: 41 })).toBe(3);
  });

  it('drops empty values from params', () => {
    const params = toHttpParams({ search: '', assetClass: undefined, page: 2, isEnabled: false, x: null });
    expect(params.keys()).toEqual(['page', 'isEnabled']);
    expect(params.get('isEnabled')).toBe('false');
  });
});
