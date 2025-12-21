'use client';

import { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";

interface CandleChartProps {
  ticker: string;
  price?: number;
  dayChangePercent?: number;
  height?: number;
}

type CandlePoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type VolumePoint = {
  time: string;
  value: number;
  color: string;
};

const buildMockSeries = (
  basePrice: number
): { candles: CandlePoint[]; volumes: VolumePoint[] } => {
  const points: CandlePoint[] = [];
  const volumes: VolumePoint[] = [];
  let prevClose = basePrice * 0.92;
  const startDate = new Date("2025-06-01T00:00:00Z");
  for (let i = 0; i < 60; i += 1) {
    const open = prevClose;
    const delta = (Math.sin(i / 3) + 0.8) * 2.2;
    const close = Math.max(1, open + delta);
    const high = close + 2 + Math.random() * 3;
    const low = Math.max(1, Math.min(open, close) - (2 + Math.random() * 2));
    const current = new Date(startDate);
    current.setUTCDate(startDate.getUTCDate() + i);
    const time = current.toISOString().slice(0, 10);
    const volume = Math.floor(180000 + Math.random() * 160000 + i * 1200);
    points.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });
    volumes.push({
      time,
      value: volume,
      color: close >= open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
    });
    prevClose = close;
  }
  if (points.length === 0) {
    return { candles: [], volumes: [] };
  }
  const lastClose = points[points.length - 1].close;
  if (!Number.isFinite(lastClose) || lastClose === 0) {
    return { candles: points, volumes };
  }
  const scale = basePrice / lastClose;
  const scaledPoints = points.map((point) => ({
    ...point,
    open: Number((point.open * scale).toFixed(2)),
    high: Number((point.high * scale).toFixed(2)),
    low: Number((point.low * scale).toFixed(2)),
    close: Number((point.close * scale).toFixed(2)),
  }));
  return { candles: scaledPoints, volumes };
};

export function CandlestickChart({
  ticker,
  price = 150,
  dayChangePercent,
  height = 320,
}: CandleChartProps) {
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
      crosshair: {
        mode: 0,
        vertLine: { color: "rgba(41,98,255,0.35)", width: 1, style: 2 },
        horzLine: { color: "rgba(41,98,255,0.2)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.15, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: false,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00c074",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#00c074",
      wickDownColor: "#f6465d",
    });
    candleSeries.setData(data.candles);
    candleSeries.createPriceLine({
      price,
      color: "rgba(0,192,116,0.7)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Actual",
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(41,98,255,0.25)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(data.volumes);

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
  }, [data, height, price]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-muted">
        <span>{ticker}</span>
        <span>
          {dayChangePercent !== undefined
            ? `Día ${dayChangePercent >= 0 ? "+" : ""}${dayChangePercent.toFixed(2)}%`
            : "Velas simuladas"}
        </span>
      </div>
      <div ref={containerRef} className="w-full rounded-lg border border-border/60 bg-surface-muted/50" />
    </div>
  );
}
