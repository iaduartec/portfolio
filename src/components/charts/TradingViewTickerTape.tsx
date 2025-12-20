"use client";

import { useEffect } from "react";

export function TradingViewTickerTape() {
  useEffect(() => {
    const existing = document.querySelector(
      'script[src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"]'
    );
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js";
    document.body.appendChild(script);
  }, []);

  return (
    <div className="w-full">
      <tv-ticker-tape direction="horizontal" show-hover theme="dark" />
    </div>
  );
}
