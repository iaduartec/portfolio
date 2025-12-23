import { NextResponse } from "next/server";

const ALPHA_ENDPOINT = "https://www.alphavantage.co/query";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ALPHAVANTAGE_API_KEY" }, { status: 500 });
  }

  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
    apikey: apiKey,
  });

  const response = await fetch(`${ALPHA_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 300 },
  });
  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: "Alpha Vantage request failed" }, { status: 502 });
  }

  if (payload["Error Message"]) {
    return NextResponse.json({ error: payload["Error Message"] }, { status: 502 });
  }

  if (payload["Note"]) {
    return NextResponse.json({ error: payload["Note"] }, { status: 429 });
  }

  const series = payload["Time Series (Daily)"];
  if (!series) {
    return NextResponse.json({ error: "No time series data" }, { status: 502 });
  }

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
    symbol,
    candles,
    volumes,
    source: "alpha-vantage",
  });
}
