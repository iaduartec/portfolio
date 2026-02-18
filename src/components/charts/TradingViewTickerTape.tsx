"use client";

import { useEffect, useMemo, useState } from "react";

type TapeItem = {
  symbol: string;
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

    const load = async () => {
      try {
        const res = await fetch(
          `/api/yahoo?action=price&symbols=${encodeURIComponent(DEFAULT_SYMBOLS.join(","))}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as { data?: TapeItem[] };
        if (!cancelled) {
          setItems(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 60_000);
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

  return (
    <div className="ticker-tape-shell">
      <div className="ticker-tape-track">
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
