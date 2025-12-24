import { NextResponse } from "next/server";

const ALPHA_ENDPOINT = "https://www.alphavantage.co/query";

type AlphaSeries = Record<
  string,
  {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  }
>;

const exchangeSuffixMap: Record<string, string> = {
  BME: ".MC",
  MIL: ".MI",
  XETR: ".DE",
  FRA: ".DE",
  LSE: ".L",
  AMS: ".AS",
  BRU: ".BR",
  PAR: ".PA",
  STO: ".ST",
  SWX: ".SW",
  OSL: ".OL",
  HEL: ".HE",
  CPH: ".CO",
  ICE: ".IR",
  TSE: ".TO",
};

const exchangeRegionMap: Record<string, string> = {
  BME: "Spain",
  MIL: "Italy",
  XETR: "Germany",
  LSE: "United Kingdom",
  AMS: "Netherlands",
  BRU: "Belgium",
  PAR: "France",
  STO: "Sweden",
  SWX: "Switzerland",
  OSL: "Norway",
  HEL: "Finland",
  CPH: "Denmark",
  ICE: "Ireland",
  TSE: "Canada",
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

const buildUrl = (params: Record<string, string>) => {
  const query = new URLSearchParams(params);
  return `${ALPHA_ENDPOINT}?${query.toString()}`;
};

const fetchSeries = async (symbol: string, apiKey: string) => {
  const response = await fetch(
    buildUrl({
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: "compact",
      apikey: apiKey,
    }),
    { next: { revalidate: 300 } }
  );
  const payload = await response.json();
  return { response, payload };
};

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

const normalizeSymbolForYahoo = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol;
  const suffix = exchangeYahooSuffixMap[exchange] ?? "";
  return `${rawSymbol}${suffix}`;
};

const fetchYahooOHLC = async (ticker: string) => {
  const symbol = normalizeSymbolForYahoo(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=3mo`;
  
  try {
    const res = await fetch(url, { 
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    
    if (!res.ok) return null;
    
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const candles = [];
    const volumesData = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (!opens[i] || !highs[i] || !lows[i] || !closes[i]) continue;
      
      const time = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      const open = Number(opens[i]);
      const high = Number(highs[i]);
      const low = Number(lows[i]);
      const close = Number(closes[i]);
      const volume = Number(volumes[i] || 0);

      candles.push({ time, open, high, low, close });
      volumesData.push({
        time,
        value: volume,
        color: close >= open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
      });
    }

    if (candles.length === 0) return null;

    return {
      symbol: result.meta?.symbol || symbol,
      candles,
      volumes: volumesData,
      source: "yahoo-finance"
    };
  } catch (err) {
    console.warn(`[Yahoo OHLC] Failed for ${symbol}:`, err);
    return null;
  }
};

// Generate mock data for demonstration when API key is missing AND Yahoo fails
const generateMockData = (symbol: string, days = 100) => {
  const candles = [];
  const volumes = [];
  let price = 150.0;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const time = date.toISOString().split('T')[0];
    const volatility = price * 0.02;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    candles.push({ time, open, high, low, close });
    volumes.push({
      time,
      value: volume,
      color: close >= open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)"
    });
    
    price = close;
  }
  
  return { symbol, candles, volumes, source: "mock-data" };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get("symbol");
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  if (!symbolParam) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const rawSymbol = symbolParam.trim();

  // 1. Try Yahoo Finance First (or if Key is missing)
  // This is better for UX as it provides real data without keys
  try {
    const yahooData = await fetchYahooOHLC(rawSymbol);
    if (yahooData) {
      return NextResponse.json(yahooData);
    }
  } catch (err) {
    console.error("Yahoo OHLC fetch failed", err);
  }

  // 2. Try AlphaVantage if Key exists
  if (apiKey) {
    try {
      const [exchange, coreSymbol] = rawSymbol.includes(":")
        ? rawSymbol.split(":").map((part) => part.trim())
        : ["", rawSymbol];
      const needsSuffix = exchange && !coreSymbol.includes(".");
      const suffix = needsSuffix ? exchangeSuffixMap[exchange.toUpperCase()] ?? "" : "";
      const symbol = `${coreSymbol}${suffix}`.trim();

      const initial = await fetchSeries(symbol, apiKey);
      let payload = initial.payload as Record<string, unknown>;
      let series: AlphaSeries | undefined = payload["Time Series (Daily)"] as AlphaSeries | undefined;
      let resolvedSymbol = symbol;

      if (!series && !payload["Note"] && !payload["Information"]) {
        // ... search logic ...
        const searchResponse = await fetch(
          buildUrl({
            function: "SYMBOL_SEARCH",
            keywords: coreSymbol,
            apikey: apiKey,
          }),
          { next: { revalidate: 300 } }
        );
        const searchPayload = (await searchResponse.json()) as Record<string, unknown>;
        const matches = Array.isArray(searchPayload?.bestMatches)
          ? (searchPayload.bestMatches as Array<Record<string, string>>)
          : [];
        const regionHint = exchange ? exchangeRegionMap[exchange.toUpperCase()] : undefined;
        const matchSymbol = matches.length > 0 ? findBestMatchSymbol(matches, coreSymbol, regionHint) : undefined;
        if (matchSymbol) {
          const retry = await fetchSeries(matchSymbol, apiKey);
          payload = retry.payload as Record<string, unknown>;
          series = payload["Time Series (Daily)"] as AlphaSeries | undefined;
          resolvedSymbol = matchSymbol;
        }
      }

      if (series) {
        const entries = Object.entries(series)
          .map(([time, value]) => ({
            time,
            open: Number(value["1. open"]),
            high: Number(value["2. high"]),
            low: Number(value["3. low"]),
            close: Number(value["4. close"]),
            volume: Number(value["5. volume"]),
          }))
          .filter((point) => Number.isFinite(point.open))
          .sort((a, b) => (a.time > b.time ? 1 : -1));

        const candles = entries.map((point) => ({
          time: point.time,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        }));

        const volumes = entries.map((point) => ({
          time: point.time,
          value: point.volume,
          color: point.close >= point.open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
        }));

        return NextResponse.json({
          symbol: resolvedSymbol,
          candles,
          volumes,
          source: "alpha-vantage",
        });
      }
    } catch (err) {
      console.error("AlphaVantage fetch failed", err);
    }
  }

  // 3. Fallback to Mock Data only if everything else failed
  console.warn(`No data found for ${rawSymbol}, returning mock data`);
  return NextResponse.json(generateMockData(rawSymbol));
}
