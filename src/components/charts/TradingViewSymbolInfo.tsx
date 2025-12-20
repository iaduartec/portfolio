"use client";

import { useEffect, useRef } from "react";

interface TradingViewSymbolInfoProps {
  symbol: string;
  width?: number | string;
}

export function TradingViewSymbolInfo({ symbol, width = 550 }: TradingViewSymbolInfoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    const link = document.createElement("a");
    link.href = `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`;
    link.target = "_blank";
    link.rel = "noopener nofollow";
    const span = document.createElement("span");
    span.className = "blue-text";
    span.textContent = `${symbol} performance`;
    link.appendChild(span);
    const tail = document.createElement("span");
    tail.className = "trademark";
    tail.textContent = " by TradingView";
    copyright.appendChild(link);
    copyright.appendChild(tail);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      width,
    });

    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, width]);

  return <div ref={containerRef} className="tradingview-widget-container" />;
}
