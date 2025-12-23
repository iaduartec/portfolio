'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  LineStyle,
  createChart,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MemoizedMarkdown } from "@/components/ai/memoized-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

type SwingPoint = {
  index: number;
  time: string;
  price: number;
  type: "high" | "low";
};

type PatternLine = {
  id: string;
  name: string;
  points: { time: string; value: number }[];
  color: string;
  style?: LineStyle;
  width?: number;
};

type Pattern = {
  kind: "double-top" | "double-bottom" | "head-shoulders" | "ascending-triangle";
  name: string;
  description: string;
  confidence: number;
  lines: PatternLine[];
  markers: SeriesMarker<Time>[];
};

type AnalysisResult = {
  candles: CandlePoint[];
  volumes: VolumePoint[];
  patterns: Pattern[];
  support: PatternLine[];
};

const buildDemoSeries = (basePrice: number): { candles: CandlePoint[]; volumes: VolumePoint[] } => {
  const anchors = [
    { i: 0, v: basePrice * 0.85 },
    { i: 10, v: basePrice * 0.92 },
    { i: 20, v: basePrice * 1.05 },
    { i: 30, v: basePrice * 0.96 },
    { i: 40, v: basePrice * 1.05 },
    { i: 50, v: basePrice * 0.95 },
    { i: 60, v: basePrice * 1.02 },
    { i: 70, v: basePrice * 1.1 },
    { i: 80, v: basePrice * 1.02 },
    { i: 90, v: basePrice * 0.98 },
    { i: 110, v: basePrice * 1.04 },
    { i: 119, v: basePrice * 1.08 },
  ];

  const points: CandlePoint[] = [];
  const volumes: VolumePoint[] = [];
  const startDate = new Date("2025-06-01T00:00:00Z");
  let prevClose = anchors[0].v;
  let anchorIndex = 0;

  for (let i = 0; i < 120; i += 1) {
    if (anchorIndex < anchors.length - 1 && i > anchors[anchorIndex + 1].i) {
      anchorIndex += 1;
    }
    const current = anchors[anchorIndex];
    const next = anchors[Math.min(anchorIndex + 1, anchors.length - 1)];
    const span = Math.max(1, next.i - current.i);
    const t = Math.min(1, (i - current.i) / span);
    const target = current.v + (next.v - current.v) * t;
    const wiggle = Math.sin(i * 0.35) * basePrice * 0.006;
    const close = target + wiggle;
    const open = prevClose;
    const high = Math.max(open, close) + basePrice * (0.01 + Math.abs(Math.sin(i * 0.7)) * 0.004);
    const low = Math.min(open, close) - basePrice * (0.01 + Math.abs(Math.cos(i * 0.55)) * 0.004);
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + i);
    const time = currentDate.toISOString().slice(0, 10);
    points.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(Math.max(1, low).toFixed(2)),
      close: Number(close.toFixed(2)),
    });
    volumes.push({
      time,
      value: Math.floor(140000 + i * 1000 + Math.abs(wiggle) * 4000),
      color: close >= open ? "rgba(0,192,116,0.35)" : "rgba(246,70,93,0.35)",
    });
    prevClose = close;
  }

  return { candles: points, volumes };
};

const buildAnalysis = (candles: CandlePoint[], volumes: VolumePoint[]): AnalysisResult => {
  const swings = findSwings(candles, 3);
  const patterns: Pattern[] = [];

  const doubleTop = detectDoubleTop(candles, swings);
  if (doubleTop) patterns.push(doubleTop);

  const doubleBottom = detectDoubleBottom(candles, swings);
  if (doubleBottom) patterns.push(doubleBottom);

  const headShoulders = detectHeadAndShoulders(candles, swings);
  if (headShoulders) patterns.push(headShoulders);

  const ascendingTriangle = detectAscendingTriangle(candles, swings);
  if (ascendingTriangle) patterns.push(ascendingTriangle);

  const supportLines = buildSupportResistance(candles, swings);

  return { candles, volumes, patterns, support: supportLines };
};

const findSwings = (candles: CandlePoint[], window: number): SwingPoint[] => {
  const swings: SwingPoint[] = [];
  for (let i = window; i < candles.length - window; i += 1) {
    const current = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = i - window; j <= i + window; j += 1) {
      if (candles[j].high > current.high) isHigh = false;
      if (candles[j].low < current.low) isLow = false;
    }
    if (isHigh) swings.push({ index: i, time: current.time, price: current.high, type: "high" });
    if (isLow) swings.push({ index: i, time: current.time, price: current.low, type: "low" });
  }
  return swings;
};

const detectDoubleTop = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  for (let i = 0; i < highs.length - 1; i += 1) {
    for (let j = i + 1; j < highs.length; j += 1) {
      const left = highs[i];
      const right = highs[j];
      const gap = right.index - left.index;
      if (gap < 8 || gap > 35) continue;
      const avg = (left.price + right.price) / 2;
      const diff = Math.abs(left.price - right.price) / avg;
      if (diff > 0.015) continue;
      const valley = candles
        .slice(left.index, right.index)
        .reduce((min, point) => Math.min(min, point.low), Number.POSITIVE_INFINITY);
      if ((avg - valley) / avg < 0.03) continue;
      const markers: SeriesMarker<Time>[] = [
        { time: left.time, position: "aboveBar", color: "#f6c343", shape: "circle", text: "DT 1" },
        { time: right.time, position: "aboveBar", color: "#f6c343", shape: "circle", text: "DT 2" },
      ];
      return {
        kind: "double-top",
        name: "Doble techo",
        description: "Dos maximos similares con retroceso intermedio.",
        confidence: Number((1 - diff).toFixed(2)),
        markers,
        lines: [
          {
            id: "double-top-peak",
            name: "Zona de techo",
            points: [
              { time: left.time, value: left.price },
              { time: right.time, value: right.price },
            ],
            color: "rgba(246,195,67,0.95)",
            style: LineStyle.Solid,
            width: 2,
          },
          {
            id: "double-top-valley",
            name: "Soporte intermedio",
            points: [
              { time: left.time, value: valley },
              { time: right.time, value: valley },
            ],
            color: "rgba(246,195,67,0.55)",
            style: LineStyle.Dashed,
            width: 1,
          },
        ],
      };
    }
  }
  return null;
};

const detectDoubleBottom = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const lows = swings.filter((swing) => swing.type === "low");
  for (let i = 0; i < lows.length - 1; i += 1) {
    for (let j = i + 1; j < lows.length; j += 1) {
      const left = lows[i];
      const right = lows[j];
      const gap = right.index - left.index;
      if (gap < 8 || gap > 35) continue;
      const avg = (left.price + right.price) / 2;
      const diff = Math.abs(left.price - right.price) / avg;
      if (diff > 0.015) continue;
      const peak = candles
        .slice(left.index, right.index)
        .reduce((max, point) => Math.max(max, point.high), Number.NEGATIVE_INFINITY);
      if ((peak - avg) / avg < 0.03) continue;
      const markers: SeriesMarker<Time>[] = [
        { time: left.time, position: "belowBar", color: "#43c6f6", shape: "circle", text: "DB 1" },
        { time: right.time, position: "belowBar", color: "#43c6f6", shape: "circle", text: "DB 2" },
      ];
      return {
        kind: "double-bottom",
        name: "Doble suelo",
        description: "Dos minimos similares con rebote intermedio.",
        confidence: Number((1 - diff).toFixed(2)),
        markers,
        lines: [
          {
            id: "double-bottom-floor",
            name: "Zona de suelo",
            points: [
              { time: left.time, value: left.price },
              { time: right.time, value: right.price },
            ],
            color: "rgba(67,198,246,0.95)",
            style: LineStyle.Solid,
            width: 2,
          },
          {
            id: "double-bottom-peak",
            name: "Resistencia intermedia",
            points: [
              { time: left.time, value: peak },
              { time: right.time, value: peak },
            ],
            color: "rgba(67,198,246,0.55)",
            style: LineStyle.Dashed,
            width: 1,
          },
        ],
      };
    }
  }
  return null;
};

const detectHeadAndShoulders = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  for (let i = 0; i < highs.length - 2; i += 1) {
    const left = highs[i];
    const head = highs[i + 1];
    const right = highs[i + 2];
    if (head.index - left.index < 6 || right.index - head.index < 6) continue;
    const shoulderAvg = (left.price + right.price) / 2;
    if (Math.abs(left.price - right.price) / shoulderAvg > 0.02) continue;
    if (head.price < shoulderAvg * 1.03) continue;
    const low1 = candles
      .slice(left.index, head.index)
      .reduce((min, point) => Math.min(min, point.low), Number.POSITIVE_INFINITY);
    const low2 = candles
      .slice(head.index, right.index)
      .reduce((min, point) => Math.min(min, point.low), Number.POSITIVE_INFINITY);
    const necklineDrop = Math.min(low1, low2);
    if ((shoulderAvg - necklineDrop) / shoulderAvg < 0.02) continue;
    const markers: SeriesMarker<Time>[] = [
      { time: left.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "H1" },
      { time: head.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "H2" },
      { time: right.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "H3" },
    ];
    return {
      kind: "head-shoulders",
      name: "Hombro Cabeza Hombro",
      description: "Tres picos con el central dominante y neckline definido.",
      confidence: Number(((head.price - shoulderAvg) / shoulderAvg).toFixed(2)),
      markers,
      lines: [
        {
          id: "hs-neckline",
          name: "Neckline",
          points: [
            { time: left.time, value: low1 },
            { time: right.time, value: low2 },
          ],
          color: "rgba(246,109,109,0.7)",
          style: LineStyle.Dashed,
          width: 2,
        },
        {
          id: "hs-shoulders",
          name: "Linea de hombros",
          points: [
            { time: left.time, value: left.price },
            { time: head.time, value: head.price },
            { time: right.time, value: right.price },
          ],
          color: "rgba(246,109,109,0.9)",
          style: LineStyle.Solid,
          width: 2,
        },
      ],
    };
  }
  return null;
};

const detectAscendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  const tailStart = Math.max(0, candles.length - 40);
  const recentHighs = highs.filter((point) => point.index >= tailStart);
  const recentLows = lows.filter((point) => point.index >= tailStart);
  if (recentHighs.length < 3 || recentLows.length < 2) return null;
  const lastHighs = recentHighs.slice(-3);
  const highValues = lastHighs.map((point) => point.price);
  const highAvg = highValues.reduce((sum, value) => sum + value, 0) / highValues.length;
  const highSpread = (Math.max(...highValues) - Math.min(...highValues)) / highAvg;
  if (highSpread > 0.012) return null;
  const lastLows = recentLows.slice(-2);
  if (lastLows[1].price <= lastLows[0].price) return null;
  return {
    kind: "ascending-triangle",
    name: "Triangulo ascendente",
    description: "Maximos planos y minimos ascendentes.",
    confidence: Number((1 - highSpread).toFixed(2)),
    markers: [
      {
        time: lastHighs[lastHighs.length - 1].time,
        position: "aboveBar",
        color: "#7aa7ff",
        shape: "circle",
        text: "TA",
      },
    ],
    lines: [
      {
        id: "triangle-ceiling",
        name: "Resistencia plana",
        points: [
          { time: lastHighs[0].time, value: highAvg },
          { time: lastHighs[lastHighs.length - 1].time, value: highAvg },
        ],
        color: "rgba(122,167,255,0.85)",
        style: LineStyle.Solid,
        width: 2,
      },
      {
        id: "triangle-rising",
        name: "Soporte ascendente",
        points: [
          { time: lastLows[0].time, value: lastLows[0].price },
          { time: lastLows[1].time, value: lastLows[1].price },
        ],
        color: "rgba(122,167,255,0.6)",
        style: LineStyle.Dashed,
        width: 2,
      },
    ],
  };
};

const buildSupportResistance = (candles: CandlePoint[], swings: SwingPoint[]): PatternLine[] => {
  const highs = swings.filter((swing) => swing.type === "high").slice(-5);
  const lows = swings.filter((swing) => swing.type === "low").slice(-5);
  if (highs.length === 0 || lows.length === 0) return [];
  const resistance =
    highs.reduce((sum, point) => sum + point.price, 0) / highs.length;
  const support = lows.reduce((sum, point) => sum + point.price, 0) / lows.length;
  const firstTime = candles[0].time;
  const lastTime = candles[candles.length - 1].time;
  return [
    {
      id: "resistance",
      name: "Resistencia IA",
      points: [
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ],
      color: "rgba(255,136,0,0.5)",
      style: LineStyle.Dotted,
      width: 1,
    },
    {
      id: "support",
      name: "Soporte IA",
      points: [
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ],
      color: "rgba(0,190,130,0.5)",
      style: LineStyle.Dotted,
      width: 1,
    },
  ];
};

const confidenceLabel = (value: number) => {
  if (value >= 0.9) return "Alta";
  if (value >= 0.75) return "Media";
  return "Baja";
};

export function PatternAnalysisLab() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ticker, setTicker] = useState("AAPL");
  const [dataMode, setDataMode] = useState<"demo" | "live">("live");
  const [filters, setFilters] = useState({
    "double-top": true,
    "double-bottom": true,
    "head-shoulders": true,
    "ascending-triangle": true,
  });
  const tickers = useMemo(
    () => [
      { symbol: "AAPL", basePrice: 185 },
      { symbol: "MSFT", basePrice: 420 },
      { symbol: "TSLA", basePrice: 240 },
      { symbol: "NVDA", basePrice: 118 },
      { symbol: "AMD", basePrice: 165 },
    ],
    []
  );
  const selected = tickers.find((item) => item.symbol === ticker) ?? tickers[0];
  const demoSeries = useMemo(() => buildDemoSeries(selected.basePrice), [selected.basePrice]);
  const [liveSeries, setLiveSeries] = useState<{ candles: CandlePoint[]; volumes: VolumePoint[] }>(
    { candles: [], volumes: [] }
  );
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "error">("idle");
  const [liveError, setLiveError] = useState<string | null>(null);
  const series = dataMode === "live" ? liveSeries : demoSeries;
  const analysis = useMemo(() => buildAnalysis(series.candles, series.volumes), [series]);

  const activePatterns = useMemo(
    () => analysis.patterns.filter((pattern) => filters[pattern.kind]),
    [analysis.patterns, filters]
  );

  const aiChat = useMemo(
    () => new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) }),
    []
  );
  const { messages, status, error, sendMessage, setMessages } = useChat({
    chat: aiChat,
    experimental_throttle: 50,
    onError: (err: Error) => {
      console.error("AI analysis error:", err);
    },
  });
  const isLoading = status === "submitted" || status === "streaming";
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const latestText = latestAssistant
    ? (() => {
        const parts = Array.isArray(latestAssistant.parts)
          ? latestAssistant.parts.filter((part: { type?: string }) => part.type === "text")
          : [];
        const partsText = parts.map((part: { text?: string }) => part.text ?? "").join("\n");
        return (
          partsText ||
          (typeof latestAssistant.content === "string" ? latestAssistant.content : "") ||
          (typeof (latestAssistant as { text?: string }).text === "string"
            ? (latestAssistant as { text?: string }).text
            : "")
        );
      })()
    : "";

  const aiPrompt = useMemo(() => {
    const patternNames = activePatterns.map((pattern) => pattern.name).join(", ") || "ninguno";
    if (dataMode === "tradingview") {
      return [
        "Eres un analista tecnico.",
        `Analiza el ticker ${selected.symbol} con enfoque educativo.`,
        "No tienes OHLC en vivo desde el embed, asi que describe un checklist de patrones y niveles.",
        "Devuelve un resumen breve, niveles clave hipoteticos y un plan de validacion.",
      ].join(" ");
    }
    const recent = analysis.candles.slice(-20).map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    return [
      "Eres un analista tecnico.",
      `Ticker simulado: ${selected.symbol}.`,
      `Patrones detectados: ${patternNames}.`,
      "Usa las ultimas 20 velas simuladas para comentar estructura, sesgo y niveles.",
      "Devuelve un resumen breve y niveles de soporte/resistencia.",
      `Velas: ${JSON.stringify(recent)}`,
    ].join(" ");
  }, [activePatterns, analysis.candles, dataMode, selected.symbol]);

  useEffect(() => {
    if (!containerRef.current || dataMode !== "demo") return;
    const chart = createChart(containerRef.current, {
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "#161a22" },
        textColor: "#cfd6e6",
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
    candleSeries.setData(analysis.candles);

    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(41,98,255,0.25)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeries.setData(analysis.volumes);

    const markers = activePatterns
      .flatMap((pattern) => pattern.markers)
      .sort((a, b) => {
        if (a.time === b.time) return 0;
        return a.time > b.time ? 1 : -1;
      });
    if (markers.length > 0) {
      candleSeries.setMarkers(markers);
    }

    [...analysis.support, ...activePatterns.flatMap((pattern) => pattern.lines)].forEach(
      (line) => {
        const series = chart.addLineSeries({
          color: line.color,
          lineWidth: line.width ?? 2,
          lineStyle: line.style ?? LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(line.points);
      }
    );

    chart.timeScale().fitContent();
    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [analysis, activePatterns, dataMode]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2.1fr,1fr]">
      <Card
        title="Grafico de prueba"
        subtitle={
          dataMode === "demo"
            ? "Serie simulada con patrones conocidos y overlays IA."
            : "Datos en vivo desde TradingView."
        }
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <label className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1 text-xs text-muted">
            <span className="uppercase tracking-[0.2em]">Ticker</span>
            <select
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              className="rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text"
            >
              {tickers.map((item) => (
                <option key={item.symbol} value={item.symbol}>
                  {item.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1 text-xs text-muted">
            <span className="uppercase tracking-[0.2em]">Fuente</span>
            <select
              value={dataMode}
              onChange={(event) =>
                setDataMode(event.target.value === "demo" ? "demo" : "tradingview")
              }
              className="rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text"
            >
              <option value="tradingview">TradingView</option>
              <option value="demo">IA demo</option>
            </select>
          </label>
          {([
            { id: "double-top", label: "Doble techo" },
            { id: "double-bottom", label: "Doble suelo" },
            { id: "head-shoulders", label: "H-C-H" },
            { id: "ascending-triangle", label: "Triangulo" },
          ] as const).map((item) => (
            <label
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 transition",
                filters[item.id] ? "bg-surface text-text" : "text-muted",
                dataMode === "tradingview" && "opacity-50"
              )}
            >
              <input
                type="checkbox"
                checked={filters[item.id]}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, [item.id]: event.target.checked }))
                }
                className="accent-accent"
                disabled={dataMode === "tradingview"}
              />
              {item.label}
            </label>
          ))}
        </div>
        {dataMode === "demo" ? (
          <div ref={containerRef} className="w-full rounded-lg border border-border/60 bg-surface-muted/40" />
        ) : (
          <div className="h-[420px] w-full overflow-hidden rounded-lg border border-border/60 bg-surface-muted/40">
            <TradingViewAdvancedChart symbol={selected.tvSymbol} height="100%" />
          </div>
        )}
      </Card>

      <Card
        title="Deteccion IA"
        subtitle={
          dataMode === "demo"
            ? "Heuristicas rapidas sobre puntos de giro."
            : "TradingView embebido no expone velas, usa el modo IA demo para overlays."
        }
      >
        <div className="flex flex-col gap-4 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                setMessages([]);
                await sendMessage({ text: aiPrompt });
              }}
              disabled={isLoading}
              className="bg-accent text-white hover:brightness-110"
            >
              {isLoading ? "Analizando..." : "Analizar con IA"}
            </Button>
            {error && (
              <span className="text-xs text-danger">
                No se pudo conectar con la IA. Revisa la clave API.
              </span>
            )}
          </div>

          {activePatterns.length === 0 ? (
            <p>No hay patrones activos. Activa un filtro para ver resultados.</p>
          ) : (
            activePatterns.map((pattern) => (
              <div key={pattern.kind} className="rounded-lg border border-border/60 bg-surface-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text">{pattern.name}</p>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs">
                    {confidenceLabel(pattern.confidence)} ({Math.round(pattern.confidence * 100)}%)
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{pattern.description}</p>
                <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                  Lineas: {pattern.lines.length}
                </div>
              </div>
            ))
          )}

          <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Resumen IA</p>
            {latestText ? (
              <div className="mt-2 text-sm text-text">
                <MemoizedMarkdown id="pattern-ia" content={latestText} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Ejecuta la analisis para recibir un resumen.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
