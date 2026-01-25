import { NextResponse } from "next/server";
import { resolveExchange, resolveYahooSymbol } from "@/lib/marketSymbols";

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
const YAHOO_NEGATIVE_TTL_MS = 1000 * 60 * 15;
const yahooNegativeCache = new Map<string, number>();

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
};

const exchangeYahooSuffixMap: Record<string, string> = {
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
};

const normalizeSymbolForFinnhub = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const normalizedExchange = exchange ? resolveExchange(exchange) : "";
  const suffix = normalizedExchange ? exchangeSuffixMap[normalizedExchange] ?? "" : "";
  return `${rawSymbol}${suffix}`;
};

const normalizeSymbolForYahoo = (ticker: string) =>
  resolveYahooSymbol(ticker, exchangeYahooSuffixMap);

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
  const raw = await res.text();
  let json: MetricPayload;
  try {
    json = JSON.parse(raw) as MetricPayload;
  } catch {
    return null;
  }
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

const fmpHeaders = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

const fetchFmpJson = async (url: string) => {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, headers: fmpHeaders });
    const raw = await res.text();
    if (!raw) return { json: null, limited: false };
    const parsed = JSON.parse(raw) as { "Error Message"?: string } | unknown;
    const limited =
      typeof parsed === "object" &&
      parsed !== null &&
      "Error Message" in parsed &&
      typeof (parsed as { "Error Message"?: string })["Error Message"] === "string" &&
      (parsed as { "Error Message": string })["Error Message"].includes("Limit Reach");
    if (limited) {
      return { json: null, limited: true };
    }
    return { json: parsed, limited: false };
  } catch {
    return { json: null, limited: false };
  }
};

const fetchFmpStableProfile = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<{ data: FundamentalPoint | null; limited: boolean }> => {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const { json, limited } = await fetchFmpJson(url);
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return { data: null, limited };
  return {
    data: {
      ticker,
      symbol,
      pe: toNumber(row.pe),
      beta: toNumber(row.beta),
    },
    limited,
  };
};

const fetchFmpStableRatios = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<{ data: FundamentalPoint | null; limited: boolean }> => {
  const url = `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const { json, limited } = await fetchFmpJson(url);
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return { data: null, limited };
  return {
    data: {
      ticker,
      symbol,
      pe: toNumber(row.priceEarningsRatioTTM),
      ps: toNumber(row.priceToSalesRatioTTM),
      pb: toNumber(row.priceToBookRatioTTM),
    },
    limited,
  };
};

const fetchFmpStableHistory = async (
  symbol: string,
  apiKey: string
): Promise<{ data: number[] | null; limited: boolean }> => {
  const url = `https://financialmodelingprep.com/stable/historical-price-full?symbol=${encodeURIComponent(
    symbol
  )}&timeseries=30&apikey=${encodeURIComponent(apiKey)}`;
  const { json, limited } = await fetchFmpJson(url);
  const history = Array.isArray((json as { historical?: unknown[] } | null)?.historical)
    ? (json as { historical: Array<{ close?: number }> }).historical
    : null;
  if (!history || history.length === 0) return { data: null, limited };
  const closes = history
    .map((row: { close?: number }) => Number(row.close))
    .filter((value: number) => Number.isFinite(value));
  return { data: closes.length > 0 ? closes.reverse() : null, limited };
};

const computeRsi = (closes: number[], period = 14) => {
  if (closes.length <= period) return undefined;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const shouldSkipYahoo = (ticker: string) => {
  const key = ticker.toUpperCase();
  const until = yahooNegativeCache.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    yahooNegativeCache.delete(key);
    return false;
  }
  return true;
};

const markYahooMiss = (ticker: string) => {
  const key = ticker.toUpperCase();
  if (!yahooNegativeCache.has(key)) {
    yahooNegativeCache.set(key, Date.now() + YAHOO_NEGATIVE_TTL_MS);
  }
};

const fetchFmpStableFundamentals = async (
  ticker: string,
  symbol: string,
  apiKey: string
): Promise<{ data: FundamentalPoint | null; limited: boolean }> => {
  const [profileResult, ratiosResult] = await Promise.allSettled([
    fetchFmpStableProfile(ticker, symbol, apiKey),
    fetchFmpStableRatios(ticker, symbol, apiKey),
  ]);
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value.data : null;
  const ratios =
    ratiosResult.status === "fulfilled" ? ratiosResult.value.data : null;
  const limited =
    (profileResult.status === "fulfilled" && profileResult.value.limited) ||
    (ratiosResult.status === "fulfilled" && ratiosResult.value.limited);
  const point: FundamentalPoint = {
    ticker,
    symbol,
    pe: profile?.pe ?? ratios?.pe,
    beta: profile?.beta,
    ps: ratios?.ps,
    pb: ratios?.pb,
  };
  const hasAny = Object.values(point).some((value) => typeof value === "number");
  return { data: hasAny ? point : null, limited };
};

const YAHOO_BASE_URLS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const fetchYahooJson = async (path: string, headers: Record<string, string>) => {
  let lastError: unknown;
  for (const baseUrl of YAHOO_BASE_URLS) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { next: { revalidate: 3600 }, headers });
      if (!res.ok) continue;
      const json = await res.json();
      return { json, baseUrl };
    } catch (err) {
      lastError = err;
    }
  }
  return { json: null, baseUrl: null, error: lastError };
};

const fetchYahooFundamentals = async (
  ticker: string,
  symbol: string
): Promise<FundamentalPoint | null> => {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
  };
  
  // 1. Try Quote API (v7) - lightweight and reliable for basic stats
  const quotePath = `/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

  try {
    const { json: quoteJson } = await fetchYahooJson(quotePath, headers);
    const item = quoteJson?.quoteResponse?.result?.[0];
    if (item) {
      console.log(`[Yahoo v7] Found data for ${ticker} (${symbol})`);
      return {
        ticker,
        symbol,
        pe: toNumber(item.trailingPE),
        ps: toNumber(item.priceToSalesTrailing12Months),
        pb: toNumber(item.priceToBook),
        beta: toNumber(item.beta),
        // eps: toNumber(item.epsTrailingTwelveMonths),
      };
    }
  } catch (err) {
    console.warn(`[Yahoo v7] Failed for ${ticker}:`, err);
  }

  // 2. Fallback to Summary API (v10) - deeper data but sometimes rate-limited
  const summaryPath = `/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=summaryDetail,defaultKeyStatistics,financialData`;
  
  try {
    const { json } = await fetchYahooJson(summaryPath, headers);
    const result = json?.quoteSummary?.result?.[0];
    if (result) {
      console.log(`[Yahoo v10] Found summary for ${ticker} (${symbol})`);
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
  } catch (err) {
    console.warn(`[Yahoo v10] Failed for ${ticker}:`, err);
  }

  return null;
};

// Helper to delay requests and avoid rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    // We proceed to try Yahoo
  }
  if (tickers.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const results: FundamentalPoint[] = [];
  let fmpLimited = false;

  for (const ticker of tickers) {
    const cached = getCached(ticker);
    if (cached) {
      results.push(cached);
      continue;
    }
    const symbol = normalizeSymbolForFinnhub(ticker);
    try {
      let dataFound = false;

      // 1. Try FMP if key exists
      if (fmpKey) {
        const fmpResult = await fetchFmpStableFundamentals(ticker, symbol, fmpKey);
        if (fmpResult.limited) {
          fmpLimited = true;
        }
        if (fmpResult.data) {
          const history = await fetchFmpStableHistory(symbol, fmpKey);
          if (history.limited) {
            fmpLimited = true;
          }
          const rsi = history.data ? computeRsi(history.data) : undefined;
          const merged: FundamentalPoint = {
            ...fmpResult.data,
            rsi,
          };
          setCached(ticker, merged);
          results.push(merged);
          dataFound = true;
        }
      }

      // 2. Try Finnhub if key exists and no data yet
      if (!dataFound && apiKey) {
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
          dataFound = true;
        }
      }
      
      // 3. Try Yahoo as fallback (or primary if no keys)
      if (!dataFound) {
        // Add a small delay to be polite to Yahoo's public API and avoid rate limits
        if (tickers.length > 1) await delay(250);

        if (!shouldSkipYahoo(ticker)) {
          const yahooSymbol = normalizeSymbolForYahoo(ticker);
          const yahooData = await fetchYahooFundamentals(ticker, yahooSymbol);
          if (yahooData) {
            setCached(ticker, yahooData);
            results.push(yahooData);
            dataFound = true;
          } else {
            console.log(`[Yahoo] No data found for ${ticker} (${yahooSymbol})`);
            markYahooMiss(ticker);
          }
        }
      }

      // If still no data, we do NOT return mock data anymore to avoid misleading users.
      // The frontend will show empty/default values.

    } catch (err) {
      console.error("Fundamentals fetch error", { ticker, err });
    }
  }

  return NextResponse.json({ data: results, meta: { fmpLimited } });
}
