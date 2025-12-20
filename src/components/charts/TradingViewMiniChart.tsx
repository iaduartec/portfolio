"use client";

import { useEffect } from "react";

interface TradingViewMiniChartProps {
  symbol: string;
}

export function TradingViewMiniChart({ symbol }: TradingViewMiniChartProps) {
  useEffect(() => {
    const existing = document.querySelector(
      'script[src="https://widgets.tradingview-widget.com/w/en/tv-mini-chart.js"]'
    );
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://widgets.tradingview-widget.com/w/en/tv-mini-chart.js";
    document.body.appendChild(script);
  }, []);

  return (
    <div className="w-full">
      <tv-mini-chart symbol={symbol} theme="dark" />
    </div>
  );
}
