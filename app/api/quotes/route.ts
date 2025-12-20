import { NextResponse } from "next/server";

type Quote = {
  ticker: string;
  price: number;
  asOf?: string;
  sourceSymbol?: string;
};

const exchangeSuffixMap: Record<string, string> = {
  NASDAQ: ".US",
  NYSE: ".US",
  AMEX: ".US",
  BME: ".MC",
  BMEF: ".MC",
  BOL: ".MC",
  MIL: ".MI",
  MILAN: ".MI",
  XETRA: ".DE",
  FRA: ".DE",
  LSE: ".L",
  SWX: ".SW",
  SIX: ".SW",
};

const normalizeSymbol = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":")
    ? cleaned.split(":")
    : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol.toLowerCase();
  const suffix = exchangeSuffixMap[exchange] ?? ".US";
  return `${rawSymbol}${suffix}`.toLowerCase();
};

const parseStooqCsv = (raw: string) => {
  const lines = raw.trim().split("\n");
  if (lines.length <= 1) return [];
  const rows: Quote[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [symbol, date, time, , , , close] = lines[i].split(",");
    const price = Number(close);
    if (!Number.isFinite(price)) continue;
    rows.push({
      ticker: symbol.toUpperCase(),
      price,
      asOf: [date, time].filter(Boolean).join(" "),
      sourceSymbol: symbol,
    });
  }
  return rows;
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

  const symbolPairs = tickers.map((ticker) => ({
    ticker,
    symbol: normalizeSymbol(ticker),
  }));
  const stooqSymbols = symbolPairs.map((pair) => pair.symbol);
  const url = `https://stooq.pl/q/l/?s=${stooqSymbols.join(",")}&f=sd2t2ohlcv&h&e=csv`;

  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    const csv = await response.text();
    const quotes = parseStooqCsv(csv).map((quote) => {
      const match = symbolPairs.find(
        (pair) => pair.symbol.toUpperCase() === quote.ticker.toUpperCase()
      );
      return {
        ...quote,
        ticker: match?.ticker ?? quote.ticker,
      };
    });
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ quotes: [] }, { status: 200 });
  }
}
