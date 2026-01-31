"use client";

import { useEffect } from "react";

export function TradingViewTickerTape() {
  useEffect(() => {
    const load = () => {
      const existing = document.querySelector(
        'script[src="https://widgets.tradingview-widget.com/w/es/tv-ticker-tape.js"]'
      );
      if (existing) return;
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://widgets.tradingview-widget.com/w/es/tv-ticker-tape.js";
      document.body.appendChild(script);
    };

    // Defer loading to avoid blocking first paint.
    // requestIdleCallback isn't universal; we fall back to a short timeout.
    const ric = (window as Window & { requestIdleCallback?: (_cb: () => void) => number })
      .requestIdleCallback;

    if (ric) {
      ric(load);
      return;
    }

    const t = window.setTimeout(load, 350);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="w-full">
      <tv-ticker-tape direction="horizontal" show-hover theme="dark" />
    </div>
  );
}
