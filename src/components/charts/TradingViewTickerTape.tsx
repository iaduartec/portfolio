"use client";

import { useEffect, useMemo, useState } from "react";

type TapeItem = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
};

type QuotesFallbackItem = {
  ticker?: string;
  price?: number;
  dayChangePercent?: number;
};

const DEFAULT_SYMBOLS = [
  "SPY",
  "QQQ",
  "DIA",
  "AAPL",
  "NVDA",
  "MSFT",
  "TSLA",
  "BTC-USD",
  "ETH-USD",
  "EURUSD=X",
];

const priceFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function TradingViewTickerTape() {
  const [items, setItems] = useState<TapeItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const isNumber = (value: unknown): value is number =>
      typeof value === "number" && Number.isFinite(value);

    const normalizeYahoo = (rows: TapeItem[]): TapeItem[] => {
      const map = new Map(
        rows
          .filter((row) => row?.symbol)
          .map((row) => [
            String(row.symbol).toUpperCase(),
            {
              symbol: String(row.symbol).toUpperCase(),
              price: isNumber(row.price) ? row.price : undefined,
              dayChangePercent: isNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
            } satisfies TapeItem,
          ])
      );
      return DEFAULT_SYMBOLS.map(
        (symbol) => map.get(symbol) ?? { symbol, price: undefined, dayChangePercent: undefined }
      );
    };

    const normalizeFallback = (rows: QuotesFallbackItem[]): TapeItem[] => {
      const map = new Map(
        rows
          .filter((row) => row?.ticker)
          .map((row) => [
            String(row.ticker).toUpperCase(),
            {
              symbol: String(row.ticker).toUpperCase(),
              price: isNumber(row.price) ? row.price : undefined,
              dayChangePercent: isNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
            } satisfies TapeItem,
          ])
      );
      return DEFAULT_SYMBOLS.map(
        (symbol) => map.get(symbol) ?? { symbol, price: undefined, dayChangePercent: undefined }
      );
    };

    const mergeWithPrevious = (nextRows: TapeItem[]) => {
      setItems((prev) => {
        const prevMap = new Map(prev.map((row) => [row.symbol.toUpperCase(), row]));
        return nextRows.map((row) => {
          const prevRow = prevMap.get(row.symbol.toUpperCase());
          return {
            symbol: row.symbol,
            price: row.price ?? prevRow?.price,
            dayChangePercent: row.dayChangePercent ?? prevRow?.dayChangePercent,
          };
        });
      });
    };

    const load = async () => {
      try {
        const res = await fetch(
          `/api/yahoo?action=price&symbols=${encodeURIComponent(DEFAULT_SYMBOLS.join(","))}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error("yahoo-unavailable");
        }
        const json = (await res.json()) as { data?: TapeItem[] };
        const yahooRows = Array.isArray(json.data) ? json.data : [];
        const normalized = normalizeYahoo(yahooRows);
        const hasAnyPrice = normalized.some((row) => row.price !== undefined);

        if (!hasAnyPrice) {
          throw new Error("yahoo-empty");
        }

        if (!cancelled) {
          mergeWithPrevious(normalized);
        }
      } catch {
        try {
          const fallbackRes = await fetch(
            `/api/quotes?tickers=${encodeURIComponent(DEFAULT_SYMBOLS.join(","))}`,
            { cache: "no-store" }
          );
          if (!fallbackRes.ok) {
            throw new Error("quotes-unavailable");
          }
          const fallbackJson = (await fallbackRes.json()) as { quotes?: QuotesFallbackItem[] };
          const fallbackRows = Array.isArray(fallbackJson.quotes) ? fallbackJson.quotes : [];
          const normalized = normalizeFallback(fallbackRows);
          if (!cancelled) {
            mergeWithPrevious(normalized);
          }
        } catch {
          // Preserve last known values if all providers fail.
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const renderItems = useMemo(() => {
    const base: TapeItem[] =
      items.length > 0 ? items : DEFAULT_SYMBOLS.map((symbol) => ({ symbol }));
    return [...base, ...base];
  }, [items]);
  const trackStyle = useMemo(
    () =>
      ({
        animation: "ticker-slide-left 34s linear infinite",
        willChange: "transform",
      }) as const,
    [],
  );

  return (
    <div className="ticker-tape-shell">
      <div className="ticker-tape-track" style={trackStyle}>
        {renderItems.map((item, idx) => {
          const pct = item.dayChangePercent;
          const tone =
            pct === undefined ? "is-flat" : pct > 0 ? "is-up" : pct < 0 ? "is-down" : "is-flat";
          return (
            <span key={`${item.symbol}-${idx}`} className={`ticker-pill ${tone}`}>
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-price">
                {item.price !== undefined ? priceFmt.format(item.price) : "--"}
              </span>
              <span className="ticker-change">
                {pct !== undefined ? `${pct >= 0 ? "+" : ""}${pctFmt.format(pct)}%` : ""}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
