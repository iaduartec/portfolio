import { NextResponse } from "next/server";
import { resolveExchange, resolveYahooSymbol } from "@/lib/marketSymbols";

type Quote = {
  ticker: string;
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
  asOf?: string;
  sourceSymbol?: string;
};

const CACHE_TTL_MS = 60_000;
const quoteCache = new Map<string, { quote: Quote; expiresAt: number }>();

const exchangeSuffixMap: Record<string, string> = {
  NASDAQ: ".US",
  NYSE: ".US",
  AMEX: ".US",
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
};

const exchangeRegionMap: Record<string, string> = {
  BME: "Spain",
  MIL: "Italy",
  XETR: "Germany",
  FRA: "Germany",
  LSE: "United Kingdom",
  SWX: "Switzerland",
};

const exchangeYahooSuffixMap: Record<string, string> = {
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
};

const normalizeSymbolForStooq = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol.toLowerCase();
  const normalizedExchange = exchange ? resolveExchange(exchange) : "";
  const suffix = normalizedExchange ? exchangeSuffixMap[normalizedExchange] ?? ".US" : ".US";
  return `${rawSymbol}${suffix}`.toLowerCase();
};

const normalizeSymbolForAlpha = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const normalizedExchange = exchange ? resolveExchange(exchange) : "";
  const suffix = normalizedExchange ? exchangeSuffixMap[normalizedExchange] ?? "" : "";
  return `${rawSymbol}${suffix}`;
};

const normalizeSymbolForYahoo = (ticker: string) =>
  resolveYahooSymbol(ticker, exchangeYahooSuffixMap);

const findBestMatchSymbol = (
  matches: Array<Record<string, string>>,
  coreSymbol: string,
  regionHint?: string
) => {
  const normalized = coreSymbol.toUpperCase();
  const exact = matches.find((match) => match["1. symbol"]?.toUpperCase() === normalized);
  if (exact) return exact["1. symbol"];
  if (regionHint) {
    const byRegion = matches.find(
      (match) => match["4. region"]?.toLowerCase() === regionHint.toLowerCase()
    );
    if (byRegion) return byRegion["1. symbol"];
  }
  const starts = matches.find((match) =>
    match["1. symbol"]?.toUpperCase().startsWith(normalized)
  );
  return starts?.["1. symbol"] ?? matches[0]?.["1. symbol"];
};

const parseStooqCsv = (raw: string) => {
  const lines = raw.trim().split("\n");
  if (lines.length <= 1) return [];
  const rows: Quote[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [symbol, date, time, open, , , close] = lines[i].split(",");
    const price = Number(close);
    if (!Number.isFinite(price)) continue;
    const openPrice = Number(open);
    const dayChange = Number.isFinite(openPrice) ? price - openPrice : undefined;
    const dayChangePercent =
      Number.isFinite(openPrice) && openPrice !== 0 ? (dayChange! / openPrice) * 100 : undefined;
    rows.push({
      ticker: symbol.toUpperCase(),
      price,
      dayChange,
      dayChangePercent,
      asOf: [date, time].filter(Boolean).join(" "),
      sourceSymbol: symbol,
    });
  }
  return rows;
};

const getCachedQuote = (ticker: string) => {
  const key = ticker.toUpperCase();
  const entry = quoteCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    quoteCache.delete(key);
    return null;
  }
  return entry.quote;
};

const setCachedQuote = (quote: Quote) => {
  const key = quote.ticker.toUpperCase();
  quoteCache.set(key, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
};

const fetchStooqQuote = async (ticker: string): Promise<Quote | null> => {
  const symbol = normalizeSymbolForStooq(ticker);
  if (!/^[a-z0-9.]+$/i.test(symbol)) return null;
  const url = `https://stooq.pl/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const csv = await res.text();
    const parsed = parseStooqCsv(csv);
    if (parsed.length === 0) return null;
    const quote = parsed[0];
    if (!Number.isFinite(quote.price)) return null;
    return {
      ...quote,
      ticker,
    };
  } catch (err) {
    console.error("stooq fetch failed", { ticker, err });
    return null;
  }
};

const fetchAlphaQuote = async (ticker: string, apiKey: string): Promise<Quote | null> => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  const symbol = normalizeSymbolForAlpha(ticker);
  if (!/^[A-Z0-9.]+$/.test(symbol)) return null;
  const fetchGlobalQuote = async (targetSymbol: string) => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      targetSymbol
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();
    const data = json?.["Global Quote"] ?? {};
    const price = Number(data["05. price"]);
    if (!Number.isFinite(price)) return null;
    const prevClose = Number(data["08. previous close"]);
    const dayChange = Number.isFinite(prevClose) ? price - prevClose : undefined;
    const dayChangePercent =
      Number.isFinite(prevClose) && prevClose !== 0 ? (dayChange! / prevClose) * 100 : undefined;
    return {
      ticker,
      price,
      dayChange,
      dayChangePercent,
      asOf: data["07. latest trading day"] ?? undefined,
      sourceSymbol: targetSymbol,
    };
  };
  try {
    const directQuote = await fetchGlobalQuote(symbol);
    if (directQuote) return directQuote;
    const normalizedExchange = exchange ? resolveExchange(exchange) : "";
    const regionHint = normalizedExchange ? exchangeRegionMap[normalizedExchange] : undefined;
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
      rawSymbol
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 60 } });
    const searchJson = await searchRes.json();
    const matches = Array.isArray(searchJson?.bestMatches) ? searchJson.bestMatches : [];
    const matchSymbol =
      matches.length > 0 ? findBestMatchSymbol(matches, rawSymbol, regionHint) : undefined;
    if (!matchSymbol) return null;
    return await fetchGlobalQuote(matchSymbol);
  } catch (err) {
    console.error("alphavantage fetch failed", { ticker, err });
    return null;
  }
};

const fetchYahooQuote = async (ticker: string): Promise<Quote | null> => {
  const symbol = normalizeSymbolForYahoo(ticker);
  if (!/^[A-Z0-9.]+$/.test(symbol)) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=5d`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(timestamps) || !Array.isArray(closes)) return null;
    const lastIndex = closes.length - 1;
    const lastClose = Number(closes[lastIndex]);
    if (!Number.isFinite(lastClose)) return null;
    const prevClose = Number(meta?.previousClose);
    const dayChange = Number.isFinite(prevClose) ? lastClose - prevClose : undefined;
    const dayChangePercent =
      Number.isFinite(prevClose) && prevClose !== 0 ? (dayChange! / prevClose) * 100 : undefined;
    return {
      ticker,
      price: lastClose,
      dayChange,
      dayChangePercent,
      asOf: meta?.regularMarketTime ? String(meta.regularMarketTime) : undefined,
      sourceSymbol: symbol,
    };
  } catch (err) {
    console.error("yahoo fetch failed", { ticker, err });
    return null;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const cachedQuotes = tickers.map((ticker) => getCachedQuote(ticker)).filter(Boolean) as Quote[];
  const missingTickers = tickers.filter((ticker) => !getCachedQuote(ticker));
  const alphaKey = process.env.ALPHAVANTAGE_API_KEY;

  try {
    const results: Quote[] = [];

    for (const ticker of missingTickers) {
      const stooqQuote = await fetchStooqQuote(ticker);
      if (stooqQuote) {
        setCachedQuote(stooqQuote);
        results.push(stooqQuote);
        continue;
      }
      const yahooQuote = await fetchYahooQuote(ticker);
      if (yahooQuote) {
        setCachedQuote(yahooQuote);
        results.push(yahooQuote);
        continue;
      }
      if (alphaKey) {
        const alphaQuote = await fetchAlphaQuote(ticker, alphaKey);
        if (alphaQuote) {
          setCachedQuote(alphaQuote);
          results.push(alphaQuote);
        }
      }
    }

    return NextResponse.json({ quotes: [...cachedQuotes, ...results] });
  } catch (err) {
    return NextResponse.json({ quotes: [] }, { status: 200, statusText: String(err) });
  }
}
