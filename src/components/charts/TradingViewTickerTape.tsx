"use client";

import { useEffect, useRef } from "react";

const TAPE_SYMBOLS = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
  { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
  { proName: "FOREXCOM:DJI", title: "Dow Jones" },
  { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
  { proName: "FX_IDC:GBPUSD", title: "GBP/USD" },
  { proName: "FX_IDC:USDJPY", title: "USD/JPY" },
  { proName: "NASDAQ:AAPL", title: "Apple" },
  { proName: "NASDAQ:MSFT", title: "Microsoft" },
  { proName: "NASDAQ:NVDA", title: "NVIDIA" },
  { proName: "NYSE:BRK.B", title: "Berkshire" },
  { proName: "BME:ANA", title: "Acciona" },
  { proName: "BME:SAN", title: "Santander" },
  { proName: "BME:IBE", title: "Iberdrola" },
  { proName: "BME:TEF", title: "Telefónica" },
  { proName: "BME:ITX", title: "Inditex" },
  { proName: "BME:REP", title: "Repsol" },
  { proName: "BME:BBVA", title: "BBVA" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
];

export function TradingViewTickerTape() {
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
    span.textContent = "Ticker tape";
    link.appendChild(span);
    const tail = document.createElement("span");
    tail.className = "trademark";
    tail.textContent = " by TradingView";
    copyright.appendChild(link);
    copyright.appendChild(tail);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: TAPE_SYMBOLS,
      colorTheme: "dark",
      locale: "es",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      displayMode: "adaptive",
    });

    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className="tradingview-widget-container" />;
}
