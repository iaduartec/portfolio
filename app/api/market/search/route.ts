import { NextResponse } from "next/server";
import marketSearchIndex from "@/data/market-search-index.json";
import type { MarketSearchEntry, MarketSearchIndexFile, MarketSearchResult } from "@/types/marketSearch";

const MAX_RESULTS = 8;

const normalizeSearchValue = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

type PreparedEntry = MarketSearchEntry & {
  normalizedTicker: string;
  normalizedSymbol: string;
  normalizedName: string;
  normalizedTags: string[];
};

const preparedEntries: PreparedEntry[] = (marketSearchIndex as MarketSearchIndexFile).entries.map((entry) => ({
  ...entry,
  normalizedTicker: normalizeSearchValue(entry.ticker),
  normalizedSymbol: normalizeSearchValue(entry.symbol),
  normalizedName: normalizeSearchValue(entry.name),
  normalizedTags: entry.tags.map((tag) => normalizeSearchValue(tag)),
}));

const toScore = (entry: PreparedEntry, query: string): number => {
  if (!query) return 0;

  if (entry.normalizedTicker === query || entry.normalizedSymbol === query) return 2200;
  if (entry.normalizedTicker.startsWith(query)) return 1800;
  if (entry.normalizedSymbol.startsWith(query)) return 1700;
  if (entry.normalizedName.startsWith(query)) return 1400;
  if (entry.normalizedTags.some((tag) => tag === query)) return 1200;
  if (entry.normalizedName.includes(query)) return 900;
  if (entry.normalizedTicker.includes(query) || entry.normalizedSymbol.includes(query)) return 800;
  if (entry.normalizedTags.some((tag) => tag.includes(query))) return 500;
  return 0;
};

const stripInternalFields = (entry: PreparedEntry): MarketSearchResult => ({
  ticker: entry.ticker,
  market: entry.market,
  symbol: entry.symbol,
  name: entry.name,
  tags: entry.tags,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryParam = searchParams.get("query") ?? "";
  const marketParam = searchParams.get("market") ?? "";

  let marketFilter = normalizeSearchValue(marketParam);
  let query = normalizeSearchValue(queryParam);

  if (query.includes(":")) {
    const [queryMarket, queryRest] = query.split(":", 2);
    marketFilter = queryMarket || marketFilter;
    query = queryRest ?? "";
  }

  if (!query) {
    return NextResponse.json({ results: [] satisfies MarketSearchResult[] });
  }

  const matches = preparedEntries
    .filter((entry) => (marketFilter && marketFilter !== "NONE" ? entry.market === marketFilter : true))
    .map((entry) => ({ entry, score: toScore(entry, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.ticker.localeCompare(right.entry.ticker);
    })
    .slice(0, MAX_RESULTS)
    .map((item) => stripInternalFields(item.entry));

  return NextResponse.json({ results: matches });
}
