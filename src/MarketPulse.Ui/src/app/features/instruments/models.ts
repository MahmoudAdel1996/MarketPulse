import { QuoteFreshness } from '../../shared/ui/freshness-badge';

export type { QuoteFreshness };
export type AssetClass = 'Forex' | 'Crypto' | 'Equity' | 'Commodity' | 'Index';
export const ASSET_CLASSES: readonly AssetClass[] = ['Forex', 'Crypto', 'Equity', 'Commodity', 'Index'];

export interface Quote {
  bid: number;
  ask: number;
  updatedAt: string;
  source: string;
  freshness: QuoteFreshness;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quoteCurrency: string;
  latestQuote: Quote | null;
}

export interface InstrumentQuery {
  search?: string;
  assetClass?: AssetClass;
  page: number;
  pageSize?: number;
}
