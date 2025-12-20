"use client";

import { useEffect, useRef } from "react";

interface TradingViewAdvancedChartProps {
  symbol: string;
  height?: number | string;
}

declare global {
  interface Window {
    TradingView?: {
      widget: (options: Record<string, unknown>) => void;
    };
  }
}

export function TradingViewAdvancedChart({
  symbol,
  height = "100%",
}: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef(`tv_advanced_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.id = widgetIdRef.current;
    widget.style.height = "100%";
    widget.style.width = "100%";
    container.appendChild(widget);

    const ensureScript = () =>
      new Promise<void>((resolve) => {
        if (window.TradingView) {
          resolve();
          return;
        }
        const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });

    ensureScript().then(() => {
      if (!window.TradingView) return;
      window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: ["STD;MACD"],
        container_id: widgetIdRef.current,
      });
    });

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
