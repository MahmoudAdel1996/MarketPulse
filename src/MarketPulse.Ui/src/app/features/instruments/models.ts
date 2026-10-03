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
  change24h: number | null;
}

export interface InstrumentQuery {
  search?: string;
  assetClass?: AssetClass;
  page: number;
  pageSize?: number;
}

export type HistoryRangeValue = '1h' | '24h' | '7d' | '30d';
export const HISTORY_RANGES: readonly HistoryRangeValue[] = ['1h', '24h', '7d', '30d'];

export interface HistoryPoint {
  t: string;
  bid: number;
  ask: number;
}

export interface History {
  range: HistoryRangeValue;
  points: HistoryPoint[];
}

export const midPrice = (quote: Pick<Quote, 'bid' | 'ask'>) => Math.round(((quote.bid + quote.ask) / 2) * 1e8) / 1e8;
