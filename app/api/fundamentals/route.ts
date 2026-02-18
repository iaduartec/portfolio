import { NextResponse } from "next/server";
import { resolveExchange, resolveYahooSymbol } from "@/lib/marketSymbols";

type MetricPayload = {
  metric?: Record<string, number | string | null>;
};

type FundamentalPoint = {
  ticker: string;
  symbol: string;
  sector?: string;
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
const YAHOO_DISABLED_TTL_MS = 1000 * 60 * 10;
const LOG_YAHOO_MISS = process.env.LOG_YAHOO_MISS === "true";

type YahooCacheStore = {
  __yahooNegativeCache?: Map<string, number>;
  __yahooDisabledUntil?: number;
};

const yahooStore = globalThis as YahooCacheStore;
const yahooNegativeCache = yahooStore.__yahooNegativeCache ?? new Map<string, number>();
if (!yahooStore.__yahooNegativeCache) {
  yahooStore.__yahooNegativeCache = yahooNegativeCache;
}

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

const exchangeStooqSuffixMap: Record<string, string> = {
  NASDAQ: ".US",
  NYSE: ".US",
  AMEX: ".US",
  BME: ".ES",
  MIL: ".IT",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".UK",
  SWX: ".CH",
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

const normalizeSymbolForStooq = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchangeRaw, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (!rawSymbol) return "";
  if (rawSymbol.includes(".")) return rawSymbol.toLowerCase();
  const exchange = exchangeRaw ? resolveExchange(exchangeRaw) : "";
  const suffix = exchange ? exchangeStooqSuffixMap[exchange] ?? ".US" : ".US";
  return `${rawSymbol}${suffix}`.toLowerCase();
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

const hasNumericMetrics = (point: FundamentalPoint | null) => {
  if (!point) return false;
  return (
    Number.isFinite(point.pe) ||
    Number.isFinite(point.ps) ||
    Number.isFinite(point.pb) ||
    Number.isFinite(point.evEbitda) ||
    Number.isFinite(point.beta) ||
    Number.isFinite(point.rsi)
  );
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
      sector: typeof row.sector === "string" ? row.sector : undefined,
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

const fetchStooqHistoryCloses = async (ticker: string): Promise<number[] | null> => {
  const symbol = normalizeSymbolForStooq(ticker);
  if (!symbol || !/^[a-z0-9.]+$/.test(symbol)) return null;
  const url = `https://stooq.pl/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/csv" },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    if (!raw || raw.includes("Brak danych")) return null;
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) return null;

    const closes = lines
      .slice(1)
      .map((line) => line.split(",")[4])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return closes.length > 14 ? closes : null;
  } catch {
    return null;
  }
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

const isYahooDisabled = () => {
  const until = yahooStore.__yahooDisabledUntil;
  if (!until) return false;
  if (Date.now() > until) {
    yahooStore.__yahooDisabledUntil = undefined;
    return false;
  }
  return true;
};

const disableYahooTemporarily = () => {
  yahooStore.__yahooDisabledUntil = Date.now() + YAHOO_DISABLED_TTL_MS;
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
    sector: profile?.sector,
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
      if (!res.ok) {
        if ([401, 403, 429, 999].includes(res.status)) {
          disableYahooTemporarily();
          break;
        }
        continue;
      }
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
  if (isYahooDisabled()) {
    return null;
  }
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
  };

  const point: FundamentalPoint = { ticker, symbol };

  // 1. Try Quote API (v7) - lightweight and reliable for basic stats
  const quotePath = `/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  try {
    const { json: quoteJson } = await fetchYahooJson(quotePath, headers);
    const item = quoteJson?.quoteResponse?.result?.[0];
    if (item) {
      point.pe = toNumber(item.trailingPE);
      point.ps = toNumber(item.priceToSalesTrailing12Months);
      point.pb = toNumber(item.priceToBook);
      point.beta = toNumber(item.beta);
    }
  } catch {
    // ignore and continue with other Yahoo endpoints
  }

  // 2. Fallback/complement to Summary API (v10) - deeper data but sometimes rate-limited
  const summaryPath = `/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile`;

  try {
    const { json } = await fetchYahooJson(summaryPath, headers);
    const result = json?.quoteSummary?.result?.[0];
    if (result) {
      const summaryDetail = result.summaryDetail ?? {};
      const keyStats = result.defaultKeyStatistics ?? {};
      const financialData = result.financialData ?? {};
      const assetProfile = result.assetProfile ?? {};
      point.sector =
        typeof assetProfile.sector === "string" && assetProfile.sector.trim()
          ? assetProfile.sector
          : point.sector;
      point.pe = point.pe ?? toNumber(keyStats.trailingPE?.raw ?? summaryDetail.trailingPE?.raw);
      point.ps = point.ps ?? toNumber(summaryDetail.priceToSalesTrailing12Months?.raw);
      point.pb = point.pb ?? toNumber(keyStats.priceToBook?.raw);
      point.evEbitda =
        point.evEbitda ??
        toNumber(keyStats.enterpriseToEbitda?.raw ?? financialData.enterpriseToEbitda?.raw);
      point.beta = point.beta ?? toNumber(keyStats.beta?.raw);
    }
  } catch {
    // ignore and continue with chart endpoint
  }

  // 3. Get RSI from chart history (v8)
  if (!Number.isFinite(point.rsi)) {
    const chartPath = `/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=3mo&interval=1d&includePrePost=false&events=div%2Csplits`;
    try {
      const { json } = await fetchYahooJson(chartPath, headers);
      const closesRaw = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
      if (Array.isArray(closesRaw)) {
        const closes = closesRaw
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value));
        if (closes.length > 14) {
          point.rsi = computeRsi(closes, 14);
        }
      }
    } catch {
      // ignore and try Stooq fallback
    }
  }

  // 4. RSI fallback via Stooq history when Yahoo chart is rate-limited
  if (!Number.isFinite(point.rsi)) {
    const stooqCloses = await fetchStooqHistoryCloses(ticker);
    if (stooqCloses && stooqCloses.length > 14) {
      point.rsi = computeRsi(stooqCloses, 14);
    }
  }

  return hasNumericMetrics(point) ? point : null;
};

const enrichWithFallbackRsi = async (ticker: string, point: FundamentalPoint) => {
  if (Number.isFinite(point.rsi)) return point;
  if (shouldSkipYahoo(ticker) || isYahooDisabled()) {
    const stooqCloses = await fetchStooqHistoryCloses(ticker);
    if (stooqCloses && stooqCloses.length > 14) {
      return { ...point, rsi: computeRsi(stooqCloses, 14) };
    }
    return point;
  }

  const yahooSymbol = normalizeSymbolForYahoo(ticker);
  const yahooData = await fetchYahooFundamentals(ticker, yahooSymbol);
  if (yahooData && Number.isFinite(yahooData.rsi)) {
    return { ...point, rsi: yahooData.rsi };
  }
  if (!yahooData) {
    markYahooMiss(ticker);
  }

  const stooqCloses = await fetchStooqHistoryCloses(ticker);
  if (stooqCloses && stooqCloses.length > 14) {
    return { ...point, rsi: computeRsi(stooqCloses, 14) };
  }
  return point;
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
    if (cached && hasNumericMetrics(cached) && Number.isFinite(cached.rsi)) {
      results.push(cached);
      continue;
    }
    if (cached && (!hasNumericMetrics(cached) || !Number.isFinite(cached.rsi))) {
      fundamentalsCache.delete(ticker);
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
          const mergedBase: FundamentalPoint = {
            ...fmpResult.data,
            rsi,
          };
          const merged = await enrichWithFallbackRsi(ticker, mergedBase);
          setCached(ticker, merged);
          results.push(merged);
          dataFound = true;
        }
      }

      // 2. Try Finnhub if key exists and no data yet
      if (!dataFound && apiKey) {
        const data = await fetchFundamentals(ticker, symbol, apiKey);
        if (hasNumericMetrics(data) && data) {
          const withRsi = await enrichWithFallbackRsi(ticker, data);
          setCached(ticker, withRsi);
          results.push(withRsi);
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
            if (LOG_YAHOO_MISS && !isYahooDisabled()) {
              console.log(`[Yahoo] No data found for ${ticker} (${yahooSymbol})`);
            }
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
