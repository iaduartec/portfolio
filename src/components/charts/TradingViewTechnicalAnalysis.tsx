"use client";

import { useEffect, useRef } from "react";
import { resolveTradingViewSymbol } from "@/lib/marketSymbols";

interface TradingViewTechnicalAnalysisProps {
  symbol: string;
  width?: number | string;
  height?: number | string;
  interval?: string;
  isTransparent?: boolean;
}

export function TradingViewTechnicalAnalysis({
  symbol,
  width = "100%",
  height = "100%",
  interval = "15m",
  isTransparent = false,
}: TradingViewTechnicalAnalysisProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedSymbol = resolveTradingViewSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    const link = document.createElement("a");
    link.href = `https://www.tradingview.com/symbols/${resolvedSymbol.replace(":", "-")}/technicals/`;
    link.target = "_blank";
    link.rel = "noopener nofollow";
    const span = document.createElement("span");
    span.className = "blue-text";
    span.textContent = `${resolvedSymbol} stock analysis`;
    link.appendChild(span);
    const tail = document.createElement("span");
    tail.className = "trademark";
    tail.textContent = " by TradingView";
    copyright.appendChild(link);
    copyright.appendChild(tail);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval,
      width,
      isTransparent,
      height,
      symbol: resolvedSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "es",
      colorTheme: "dark",
    });

    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [resolvedSymbol, width, height, interval, isTransparent]);

  return <div ref={containerRef} className="tradingview-widget-container" />;
}
