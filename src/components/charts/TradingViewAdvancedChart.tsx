'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewAdvancedChartProps {
  symbol?: string;
}

export const TradingViewAdvancedChart = memo(function TradingViewAdvancedChart({ symbol = "NASDAQ:AAPL" }: TradingViewAdvancedChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous content
    const widgetContainer = container.current.querySelector('#tradingview_advanced_chart');
    if (widgetContainer) {
      widgetContainer.innerHTML = '';
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "es",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "hide_side_toolbar": false,
      "container_id": "tradingview_advanced_chart"
    });

    if (widgetContainer) {
      widgetContainer.appendChild(script);
    }
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-[600px] w-full" ref={container}>
      <div id="tradingview_advanced_chart" className="h-full w-full"></div>
      <div className="tradingview-widget-copyright mt-2 text-center text-[10px] text-muted">
        <a href="https://es.tradingview.com/" rel="noopener nofollow" target="_blank" className="hover:text-text transition-colors">
          Gráficos de TradingView
        </a>
      </div>
    </div>
  );
});
