export type MarketSearchTag = "IBEX35" | "NASDAQ" | "NYSE" | "SP500";

export interface MarketSearchEntry {
  ticker: string;
  market: string;
  symbol: string;
  name: string;
  tags: MarketSearchTag[];
  searchText: string;
}

export interface MarketSearchIndexFile {
  generatedAt: string;
  sources: string[];
  entryCount: number;
  entries: MarketSearchEntry[];
}

export interface MarketSearchResult {
  ticker: string;
  market: string;
  symbol: string;
  name: string;
  tags: MarketSearchTag[];
}
