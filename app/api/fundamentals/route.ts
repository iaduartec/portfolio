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

const exchangeYahooSuffixMap: Record<string, string> = {
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

const normalizeSymbolForYahoo = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const suffix = exchangeYahooSuffixMap[exchange] ?? "";
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

const fetchFmpStableProfile = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<FundamentalPoint | null> => {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const json = await res.json();
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return null;
  return {
    ticker,
    symbol,
    pe: toNumber(row.pe),
    beta: toNumber(row.beta),
  };
};

const fetchFmpStableRatios = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<FundamentalPoint | null> => {
  const url = `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const json = await res.json();
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return null;
  return {
    ticker,
    symbol,
    pe: toNumber(row.priceEarningsRatioTTM),
    ps: toNumber(row.priceToSalesRatioTTM),
    pb: toNumber(row.priceToBookRatioTTM),
  };
};

const fetchFmpStableKeyMetrics = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<FundamentalPoint | null> => {
  const url = `https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const json = await res.json();
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return null;
  return {
    ticker,
    symbol,
    evEbitda: toNumber(row.enterpriseValueOverEBITDATTM),
  };
};

const fetchFmpStableFundamentals = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<FundamentalPoint | null> => {
  const [profile, ratios, keyMetrics] = await Promise.all([
    fetchFmpStableProfile(ticker, symbol, apiKey),
    fetchFmpStableRatios(ticker, symbol, apiKey),
    fetchFmpStableKeyMetrics(ticker, symbol, apiKey),
  ]);
  const point: FundamentalPoint = {
    ticker,
    symbol,
    pe: profile?.pe ?? ratios?.pe,
    beta: profile?.beta,
    ps: ratios?.ps,
    pb: ratios?.pb,
    evEbitda: keyMetrics?.evEbitda,
  };
  const hasAny = Object.values(point).some((value) => typeof value === "number");
  return hasAny ? point : null;
};

const fetchYahooFundamentals = async (
  ticker: string,
  symbol: string
): Promise<FundamentalPoint | null> => {
  const headers = { "User-Agent": "Mozilla/5.0" };
  const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=summaryDetail,defaultKeyStatistics,financialData`;
  try {
    const res = await fetch(summaryUrl, { next: { revalidate: 3600 }, headers });
    if (res.ok) {
      const json = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (result) {
        const summaryDetail = result.summaryDetail ?? {};
        const keyStats = result.defaultKeyStatistics ?? {};
        const financialData = result.financialData ?? {};
        return {
          ticker,
          symbol,
          pe: toNumber(keyStats.trailingPE?.raw ?? summaryDetail.trailingPE?.raw),
          ps: toNumber(summaryDetail.priceToSalesTrailing12Months?.raw),
          pb: toNumber(keyStats.priceToBook?.raw),
          evEbitda: toNumber(
            keyStats.enterpriseToEbitda?.raw ?? financialData.enterpriseToEbitda?.raw
          ),
          beta: toNumber(keyStats.beta?.raw),
        };
      }
    }
  } catch {
    // fall through to quote endpoint
  }

  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbol
  )}`;
  const quoteRes = await fetch(quoteUrl, { next: { revalidate: 3600 }, headers });
  if (!quoteRes.ok) return null;
  const quoteJson = await quoteRes.json();
  const item = quoteJson?.quoteResponse?.result?.[0];
  if (!item) return null;
  return {
    ticker,
    symbol,
    pe: toNumber(item.trailingPE),
    ps: toNumber(item.priceToSalesTrailing12Months),
    pb: toNumber(item.priceToBook),
    beta: toNumber(item.beta),
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const apiKey = process.env.FINNHUB_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!apiKey && !fmpKey) {
    return NextResponse.json(
      { data: [], error: "Missing FINNHUB_API_KEY and FMP_API_KEY" },
      { status: 500 }
    );
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
      if (apiKey) {
        const data = await fetchFundamentals(ticker, symbol, apiKey);
        const hasMetrics =
          data !== null &&
          (Number.isFinite(data.pe) ||
            Number.isFinite(data.ps) ||
            Number.isFinite(data.pb) ||
            Number.isFinite(data.evEbitda) ||
            Number.isFinite(data.beta) ||
            Number.isFinite(data.rsi));
        if (hasMetrics && data) {
          setCached(ticker, data);
          results.push(data);
          continue;
        }
      }
      if (fmpKey) {
        const fmpData = await fetchFmpStableFundamentals(ticker, symbol, fmpKey);
        if (fmpData) {
          setCached(ticker, fmpData);
          results.push(fmpData);
          continue;
        }
      }
      const yahooSymbol = normalizeSymbolForYahoo(ticker);
      const yahooData = await fetchYahooFundamentals(ticker, yahooSymbol);
      if (yahooData) {
        setCached(ticker, yahooData);
        results.push(yahooData);
      }
    } catch (err) {
      console.error("finnhub fundamentals failed", { ticker, err });
    }
  }

  return NextResponse.json({ data: results });
}
