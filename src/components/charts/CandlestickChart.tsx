'use client';

import { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";

interface CandleChartProps {
  ticker: string;
  price?: number;
  height?: number;
}

type CandlePoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const buildMockSeries = (basePrice: number): CandlePoint[] => {
  const points: CandlePoint[] = [];
  let prevClose = basePrice * 0.92;
  for (let i = 0; i < 30; i += 1) {
    const open = prevClose;
    const delta = (Math.sin(i / 3) + 0.8) * 2.2;
    const close = Math.max(1, open + delta);
    const high = close + 2 + Math.random() * 3;
    const low = Math.max(1, Math.min(open, close) - (2 + Math.random() * 2));
    const day = 15 + i;
    points.push({
      time: `2025-06-${day.toString().padStart(2, "0")}`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });
    prevClose = close;
  }
  return points;
};

export function CandlestickChart({ ticker, price = 150, height = 220 }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const data = useMemo(() => buildMockSeries(price), [price]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#1b1f2a" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00c074",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#00c074",
      wickDownColor: "#f6465d",
    });
    candleSeries.setData(data);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, height]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-muted">
        <span>{ticker}</span>
        <span>Mock candles</span>
      </div>
      <div ref={containerRef} className="w-full rounded-lg border border-border/60 bg-surface-muted/50" />
    </div>
  );
}
