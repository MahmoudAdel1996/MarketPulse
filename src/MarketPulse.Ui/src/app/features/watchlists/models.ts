import { Instrument } from '../instruments/models';

export const WATCHLIST_NAME_MAX = 100;

export interface WatchlistSummary {
  id: string;
  name: string;
  createdAt: string;
  instrumentCount: number;
}

export interface WatchlistItem {
  instrument: Instrument;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  createdAt: string;
  instruments: WatchlistItem[];
}
