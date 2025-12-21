"use client";

import { useEffect, useRef } from "react";

interface TradingViewMarketOverviewProps {
  width?: number | string;
  height?: number | string;
}

export function TradingViewMarketOverview({
  width = 400,
  height = 550,
}: TradingViewMarketOverviewProps) {
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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      dateRange: "12M",
      locale: "es",
      largeChartUrl: "",
      isTransparent: false,
      showFloatingTooltip: false,
      plotLineColorGrowing: "rgba(41, 98, 255, 1)",
      plotLineColorFalling: "rgba(41, 98, 255, 1)",
      gridLineColor: "rgba(240, 243, 250, 0)",
      scaleFontColor: "#DBDBDB",
      belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
      belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
      symbolActiveColor: "rgba(41, 98, 255, 0.12)",
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "Indice S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "US 100 CFD al contado" },
            { s: "FOREXCOM:DJI", d: "Indice Dow Jones Industrial Average" },
            { s: "INDEX:NKY", d: "Japon 225" },
            { s: "INDEX:DEU40", d: "Indice DAX" },
            { s: "FOREXCOM:UKXGBP", d: "Indice FTSE 100" },
          ],
          originalTitle: "Indices",
        },
        {
          title: "Futuros",
          symbols: [
            { s: "BMFBOVESPA:ISP1!", d: "S&P 500" },
            { s: "BMFBOVESPA:EUR1!", d: "Euro" },
            { s: "CMCMARKETS:GOLD", d: "Oro" },
            { s: "PYTH:WTI3!", d: "Crudo WTI" },
            { s: "BMFBOVESPA:CCM1!", d: "Maiz" },
          ],
          originalTitle: "Futures",
        },
        {
          title: "Bonos",
          symbols: [
            { s: "EUREX:FGBL1!", d: "Bund europeo" },
            { s: "EUREX:FBTP1!", d: "BTP europeo" },
            { s: "EUREX:FGBM1!", d: "BOBL europeo" },
          ],
          originalTitle: "Bonds",
        },
        {
          title: "Divisas",
          symbols: [
            { s: "FX:EURUSD", d: "EUR a USD" },
            { s: "FX:GBPUSD", d: "GBP a USD" },
            { s: "FX:USDJPY", d: "USD a JPY" },
            { s: "FX:USDCHF", d: "USD a CHF" },
            { s: "FX:AUDUSD", d: "AUD a USD" },
            { s: "FX:USDCAD", d: "USD a CAD" },
          ],
          originalTitle: "Forex",
        },
      ],
      support_host: "https://www.tradingview.com",
      backgroundColor: "#131722",
      width,
      height,
      showSymbolLogo: true,
      showChart: true,
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
