"use client";

import { useEffect, useRef } from "react";

interface TradingViewTopStoriesProps {
  symbol?: string;
  width?: number | string;
  height?: number | string;
  feedMode?: "all_symbols" | "symbol";
  isTransparent?: boolean;
}

export function TradingViewTopStories({
  symbol,
  width = "100%",
  height = 600,
  feedMode = "symbol",
  isTransparent = false,
}: TradingViewTopStoriesProps) {
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
    link.href = "https://www.tradingview.com/news/top-providers/tradingview/";
    link.target = "_blank";
    link.rel = "noopener nofollow";
    const span = document.createElement("span");
    span.className = "blue-text";
    span.textContent = "Principales noticias";
    link.appendChild(span);
    const tail = document.createElement("span");
    tail.className = "trademark";
    tail.textContent = " por TradingView";
    copyright.appendChild(link);
    copyright.appendChild(tail);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode,
      symbol,
      colorTheme: "dark",
      isTransparent,
      displayMode: "regular",
      width,
      height,
      locale: "es",
    });

    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [width, height, feedMode, isTransparent, symbol]);

  return <div ref={containerRef} className="tradingview-widget-container" />;
}
