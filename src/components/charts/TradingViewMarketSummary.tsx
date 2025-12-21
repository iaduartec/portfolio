"use client";

import { useEffect } from "react";

interface TradingViewMarketSummaryProps {
  direction?: "horizontal" | "vertical";
}

export function TradingViewMarketSummary({ direction = "horizontal" }: TradingViewMarketSummaryProps) {
  useEffect(() => {
    const existing = document.querySelector(
      'script[src="https://widgets.tradingview-widget.com/w/es/tv-market-summary.js"]'
    );
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://widgets.tradingview-widget.com/w/es/tv-market-summary.js";
    document.body.appendChild(script);
  }, []);

  return (
    <div className="w-full">
      <tv-market-summary direction={direction} theme="dark" />
    </div>
  );
}
