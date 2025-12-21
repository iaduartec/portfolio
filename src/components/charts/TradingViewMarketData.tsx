"use client";

import { useEffect, useRef } from "react";

interface TradingViewMarketDataProps {
  width?: number | string;
  height?: number | string;
}

export function TradingViewMarketData({ width = 550, height = 550 }: TradingViewMarketDataProps) {
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
    link.href = "https://www.tradingview.com/markets/";
    link.target = "_blank";
    link.rel = "noopener nofollow";
    const span = document.createElement("span");
    span.className = "blue-text";
    span.textContent = "Resumen del mercado";
    link.appendChild(span);
    const tail = document.createElement("span");
    tail.className = "trademark";
    tail.textContent = " por TradingView";
    copyright.appendChild(link);
    copyright.appendChild(tail);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      locale: "es",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      backgroundColor: "#131722",
      support_host: "https://www.tradingview.com",
      width,
      height,
      symbolsGroups: [
        {
          name: "Indices",
          symbols: [
            { name: "FOREXCOM:SPXUSD", displayName: "Indice S&P 500" },
            { name: "FOREXCOM:NSXUSD", displayName: "US 100 CFD al contado" },
            { name: "FOREXCOM:DJI", displayName: "Indice Dow Jones Industrial Average" },
            { name: "INDEX:NKY", displayName: "Japon 225" },
            { name: "INDEX:DEU40", displayName: "Indice DAX" },
            { name: "FOREXCOM:UKXGBP", displayName: "Indice FTSE 100" },
          ],
        },
        {
          name: "Futuros",
          symbols: [
            { name: "BMFBOVESPA:ISP1!", displayName: "S&P 500" },
            { name: "BMFBOVESPA:EUR1!", displayName: "Euro" },
            { name: "CMCMARKETS:GOLD", displayName: "Oro" },
            { name: "PYTH:WTI3!", displayName: "Crudo WTI" },
            { name: "BMFBOVESPA:CCM1!", displayName: "Maiz" },
          ],
        },
        {
          name: "Bonos",
          symbols: [
            { name: "EUREX:FGBL1!", displayName: "Bund europeo" },
            { name: "EUREX:FBTP1!", displayName: "BTP europeo" },
            { name: "EUREX:FGBM1!", displayName: "BOBL europeo" },
          ],
        },
        {
          name: "Divisas",
          symbols: [
            { name: "FX:EURUSD", displayName: "EUR a USD" },
            { name: "FX:GBPUSD", displayName: "GBP a USD" },
            { name: "FX:USDJPY", displayName: "USD a JPY" },
            { name: "FX:USDCHF", displayName: "USD a CHF" },
            { name: "FX:AUDUSD", displayName: "AUD a USD" },
            { name: "FX:USDCAD", displayName: "USD a CAD" },
          ],
        },
      ],
    });

    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [width, height]);

  return <div ref={containerRef} className="tradingview-widget-container" />;
}
