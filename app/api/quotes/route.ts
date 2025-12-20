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

const normalizeSymbolForStooq = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
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

  const stooqPairs = tickers
    .map((ticker) => ({
      ticker,
      symbol: normalizeSymbolForStooq(ticker),
    }))
    .filter((pair) => /^[a-z0-9.]+$/i.test(pair.symbol));

  try {
    const results = await Promise.all(
      stooqPairs.map(async (pair) => {
        const url = `https://stooq.pl/q/l/?s=${pair.symbol}&f=sd2t2ohlcv&h&e=csv`;
        const res = await fetch(url, { next: { revalidate: 60 } });
        const csv = await res.text();
        const parsed = parseStooqCsv(csv);
        if (parsed.length === 0) return null;
        const quote = parsed[0];
        if (!Number.isFinite(quote.price)) return null;
        return {
          ...quote,
          ticker: pair.ticker,
        } as Quote;
      })
    );

    return NextResponse.json({ quotes: results.filter(Boolean) });
  } catch (err) {
    return NextResponse.json({ quotes: [] }, { status: 200, statusText: String(err) });
  }
}
