import { NextResponse } from "next/server";

type MetricPayload = {
  metric?: Record<string, number | string | null>;
};

type FundamentalPoint = {
  ticker: string;
  symbol: string;
  pe?: number;
  ps?: number;
  pb?: number;
  evEbitda?: number;
  beta?: number;
  rsi?: number;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const fundamentalsCache = new Map<string, { data: FundamentalPoint; expiresAt: number }>();

const exchangeSuffixMap: Record<string, string> = {
  NASDAQ: "",
  NYSE: "",
  AMEX: "",
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
  SIX: ".SW",
};

const normalizeSymbolForFinnhub = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const suffix = exchangeSuffixMap[exchange] ?? "";
  return `${rawSymbol}${suffix}`;
};

const getCached = (key: string) => {
  const entry = fundamentalsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fundamentalsCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCached = (key: string, data: FundamentalPoint) => {
  fundamentalsCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const fetchFundamentals = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<FundamentalPoint | null> => {
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
    symbol
  )}&metric=all&token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const json = (await res.json()) as MetricPayload;
  const metric = json?.metric ?? {};
  const point: FundamentalPoint = {
    ticker,
    symbol,
    pe: toNumber(metric.peTTM ?? metric.peNormalizedAnnual),
    ps: toNumber(metric.psTTM),
    pb: toNumber(metric.pbAnnual),
    evEbitda: toNumber(metric.evEbitdaTTM),
    beta: toNumber(metric.beta),
    rsi: toNumber(metric.rsi14),
  };
  return point;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const apiKey = process.env.FINNHUB_API_KEY;

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!apiKey) {
    return NextResponse.json({ data: [], error: "Missing FINNHUB_API_KEY" }, { status: 500 });
  }
  if (tickers.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const results: FundamentalPoint[] = [];

  for (const ticker of tickers) {
    const cached = getCached(ticker);
    if (cached) {
      results.push(cached);
      continue;
    }
    const symbol = normalizeSymbolForFinnhub(ticker);
    try {
      const data = await fetchFundamentals(ticker, symbol, apiKey);
      if (data) {
        setCached(ticker, data);
        results.push(data);
      }
    } catch (err) {
      console.error("finnhub fundamentals failed", { ticker, err });
    }
  }

  return NextResponse.json({ data: results });
}
