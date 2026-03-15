import { NextResponse } from "next/server";
import { resolveYahooSymbol } from "@/lib/marketSymbols";

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

const normalizeSymbolForYahoo = (ticker: string) => {
  return resolveYahooSymbol(ticker, exchangeSuffixMap);
};

const fetchYahooOHLC = async (ticker: string, interval: string = "1d", range: string = "3mo") => {
  const symbol = normalizeSymbolForYahoo(ticker);
  // Yahoo supports: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
    const quote = result.indicators?.quote?.[0] || {};

    const opens = Array.isArray(quote.open) ? quote.open : [];
    const highs = Array.isArray(quote.high) ? quote.high : [];
    const lows = Array.isArray(quote.low) ? quote.low : [];
    const closes = Array.isArray(quote.close) ? quote.close : [];
    const volumes = Array.isArray(quote.volume) ? quote.volume : [];

    const candles = [];
    const volumesData = [];

    for (let i = 0; i < timestamps.length; i++) {
      const time = new Date(timestamps[i] * 1000).toISOString();
      const isIntraday = interval.endsWith("m") || interval.endsWith("h");
      const timeStr = isIntraday ? time : time.split("T")[0];

      const open = Number(opens[i]);
      const high = Number(highs[i]);
      const low = Number(lows[i]);
      const close = Number(closes[i]);
      const volume = Number(volumes[i] || 0);

      if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue;
      }

      candles.push({ time: timeStr, open, high, low, close });
      volumesData.push({
        time: timeStr,
        value: volume,
        color: close >= open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
      });
    }

    if (candles.length === 0) return null;

    return {
      symbol: result.meta?.symbol || symbol,
      candles,
      volumes: volumesData,
      source: "yahoo-finance",
    };
  } catch (err) {
    console.warn(`[Yahoo OHLC] Failed for ${symbol}:`, err);
    return null;
  }
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get("symbol");
  const intervalParam = searchParams.get("interval") || "1d";
  const rangeParam = searchParams.get("range");

  if (!symbolParam) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const rawSymbol = symbolParam.trim();

  // Map internal intervals to Yahoo's supported values
  let yahooInterval: string;
  let yahooRange: string;

  if (intervalParam === "1wk") {
    yahooInterval = "1wk";
    yahooRange = rangeParam || "2y";
  } else if (intervalParam === "4h") {
    // Yahoo doesn't support 4h natively; fetch 60m and aggregate into 4-candle chunks
    yahooInterval = "60m";
    yahooRange = rangeParam || "1mo";
  } else {
    yahooInterval = "1d";
    yahooRange = rangeParam || "1y";
  }

  try {
    const yahooData = await fetchYahooOHLC(rawSymbol, yahooInterval, yahooRange);
    if (yahooData) {
      if (intervalParam === "4h" && yahooInterval === "60m") {
        const aggregatedCandles = [];
        const aggregatedVolumes = [];
        const chunkSize = 4;

        for (let i = 0; i < yahooData.candles.length; i += chunkSize) {
          const chunk = yahooData.candles.slice(i, i + chunkSize);
          if (chunk.length === 0) continue;

          const first = chunk[0];
          const last = chunk[chunk.length - 1];
          const high = Math.max(...chunk.map((c) => c.high));
          const low = Math.min(...chunk.map((c) => c.low));
          const volSum = chunk.reduce(
            (sum, _c, idx) => sum + (yahooData.volumes[i + idx]?.value || 0),
            0
          );

          aggregatedCandles.push({
            time: first.time,
            open: first.open,
            high,
            low,
            close: last.close,
          });
          aggregatedVolumes.push({
            time: first.time,
            value: volSum,
            color:
              last.close >= first.open
                ? "rgba(0,192,116,0.35)"
                : "rgba(246,70,93,0.35)",
          });
        }

        return NextResponse.json({
          ...yahooData,
          candles: aggregatedCandles,
          volumes: aggregatedVolumes,
          interval: "4h",
        });
      }

      return NextResponse.json({ ...yahooData, interval: intervalParam });
    }
  } catch (err) {
    console.error("Yahoo OHLC fetch failed", err);
  }

  return NextResponse.json(
    { error: `No historical data found for ${rawSymbol}`, candles: [], volumes: [] },
    { status: 404 }
  );
}
