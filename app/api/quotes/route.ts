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

const normalizeSymbolForYahoo = (ticker: string) => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (rawSymbol.includes(".")) return rawSymbol.toUpperCase();
  const suffix = exchangeSuffixMap[exchange] ?? "";
  return `${rawSymbol}${suffix}`;
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

  const yahooSymbols = Array.from(
    new Set(
      tickers
        .map((ticker) => ({ ticker, symbol: normalizeSymbolForYahoo(ticker) }))
        .filter((pair) => pair.symbol)
    )
  );

  const stooqPairs = tickers.map((ticker) => ({
    ticker,
    symbol: normalizeSymbolForStooq(ticker),
  }));
  const stooqSymbols = stooqPairs.map((pair) => pair.symbol);
  const stooqUrl = `https://stooq.pl/q/l/?s=${stooqSymbols.join(",")}&f=sd2t2ohlcv&h&e=csv`;

  try {
    const [yahooRes, stooqRes] = await Promise.allSettled([
      fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
          yahooSymbols.map((s) => s.symbol).join(",")
        )}`,
        {
          headers: { "User-Agent": "MyInvestView/1.0", Accept: "application/json" },
          next: { revalidate: 60 },
        }
      ),
      fetch(stooqUrl, { next: { revalidate: 60 } }),
    ]);

    const yahooQuotesPromise: Promise<Quote[]> = (() => {
      if (yahooRes.status !== "fulfilled") return Promise.resolve([]);
      return yahooRes.value
        .json()
        .then((yahooJson) => {
          return (
            yahooJson?.quoteResponse?.result
              ?.map((item: any) => {
                const price = Number(item?.regularMarketPrice ?? item?.postMarketPrice);
                if (!Number.isFinite(price)) return null;
                const symbol = String(item?.symbol ?? "").toUpperCase();
                const original = yahooSymbols.find((p) => p.symbol === symbol);
                return {
                  ticker: (original?.ticker ?? symbol).toUpperCase(),
                  price,
                  asOf: item?.regularMarketTime
                    ? new Date(item.regularMarketTime * 1000).toISOString()
                    : undefined,
                  sourceSymbol: symbol,
                } as Quote;
              })
              .filter(Boolean) ?? []
          );
        })
        .catch(() => []);
    })();

    const stooqQuotesPromise: Promise<Quote[]> = (() => {
      if (stooqRes.status !== "fulfilled") return Promise.resolve([]);
      return stooqRes.value
        .text()
        .then((csv) =>
          parseStooqCsv(csv).map((quote) => {
            const match = stooqPairs.find(
              (pair) => pair.symbol.toUpperCase() === quote.ticker.toUpperCase()
            );
            return {
              ...quote,
              ticker: match?.ticker ?? quote.ticker,
            };
          })
        )
        .catch(() => []);
    })();

    const [yahooResolved, stooqResolved] = await Promise.all([yahooQuotesPromise, stooqQuotesPromise]);

    const merged = [...yahooResolved];
    stooqResolved.forEach((quote) => {
      const exists = merged.some((q) => q.ticker.toUpperCase() === quote.ticker.toUpperCase());
      if (!exists) merged.push(quote);
    });

    return NextResponse.json({ quotes: merged });
  } catch (err) {
    return NextResponse.json({ quotes: [] }, { status: 200, statusText: String(err) });
  }
}
