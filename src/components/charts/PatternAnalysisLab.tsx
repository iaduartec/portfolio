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
import { usePortfolioData } from "@/hooks/usePortfolioData";

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
  kind:
    | "double-top"
    | "double-bottom"
    | "head-shoulders"
    | "ascending-triangle"
    | "descending-triangle"
    | "symmetrical-triangle"
    | "rising-channel"
    | "falling-channel"
    | "bullish-engulfing"
    | "bearish-engulfing";
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

const buildAnalysis = (candles: CandlePoint[], volumes: VolumePoint[]): AnalysisResult => {
  if (candles.length === 0) {
    return { candles: [], volumes: [], patterns: [], support: [] };
  }
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

  const descendingTriangle = detectDescendingTriangle(candles, swings);
  if (descendingTriangle) patterns.push(descendingTriangle);

  const symmetricalTriangle = detectSymmetricalTriangle(candles, swings);
  if (symmetricalTriangle) patterns.push(symmetricalTriangle);

  const risingChannel = detectChannel(candles, swings, "rising");
  if (risingChannel) patterns.push(risingChannel);

  const fallingChannel = detectChannel(candles, swings, "falling");
  if (fallingChannel) patterns.push(fallingChannel);

  const bullishEngulfing = detectEngulfing(candles, "bullish");
  if (bullishEngulfing) patterns.push(bullishEngulfing);

  const bearishEngulfing = detectEngulfing(candles, "bearish");
  if (bearishEngulfing) patterns.push(bearishEngulfing);

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

const detectDescendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  const tailStart = Math.max(0, candles.length - 40);
  const recentHighs = highs.filter((point) => point.index >= tailStart);
  const recentLows = lows.filter((point) => point.index >= tailStart);
  if (recentHighs.length < 2 || recentLows.length < 3) return null;
  const lastLows = recentLows.slice(-3);
  const lowValues = lastLows.map((point) => point.price);
  const lowAvg = lowValues.reduce((sum, value) => sum + value, 0) / lowValues.length;
  const lowSpread = (Math.max(...lowValues) - Math.min(...lowValues)) / lowAvg;
  if (lowSpread > 0.012) return null;
  const lastHighs = recentHighs.slice(-2);
  if (lastHighs[1].price >= lastHighs[0].price) return null;
  return {
    kind: "descending-triangle",
    name: "Triangulo descendente",
    description: "Minimos planos y maximos descendentes.",
    confidence: Number((1 - lowSpread).toFixed(2)),
    markers: [
      {
        time: lastLows[lastLows.length - 1].time,
        position: "belowBar",
        color: "#ff9f6b",
        shape: "circle",
        text: "TD",
      },
    ],
    lines: [
      {
        id: "triangle-floor",
        name: "Soporte plano",
        points: [
          { time: lastLows[0].time, value: lowAvg },
          { time: lastLows[lastLows.length - 1].time, value: lowAvg },
        ],
        color: "rgba(255,159,107,0.85)",
        style: LineStyle.Solid,
        width: 2,
      },
      {
        id: "triangle-falling",
        name: "Resistencia descendente",
        points: [
          { time: lastHighs[0].time, value: lastHighs[0].price },
          { time: lastHighs[1].time, value: lastHighs[1].price },
        ],
        color: "rgba(255,159,107,0.6)",
        style: LineStyle.Dashed,
        width: 2,
      },
    ],
  };
};

const detectSymmetricalTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  const tailStart = Math.max(0, candles.length - 45);
  const recentHighs = highs.filter((point) => point.index >= tailStart).slice(-3);
  const recentLows = lows.filter((point) => point.index >= tailStart).slice(-3);
  if (recentHighs.length < 2 || recentLows.length < 2) return null;
  const highSlope =
    (recentHighs[recentHighs.length - 1].price - recentHighs[0].price) /
    (recentHighs[recentHighs.length - 1].index - recentHighs[0].index);
  const lowSlope =
    (recentLows[recentLows.length - 1].price - recentLows[0].price) /
    (recentLows[recentLows.length - 1].index - recentLows[0].index);
  if (!(highSlope < 0 && lowSlope > 0)) return null;
  const startGap = recentHighs[0].price - recentLows[0].price;
  const endGap =
    recentHighs[recentHighs.length - 1].price - recentLows[recentLows.length - 1].price;
  if (endGap >= startGap * 0.85) return null;
  return {
    kind: "symmetrical-triangle",
    name: "Triangulo simetrico",
    description: "Maximos descendentes y minimos ascendentes con compresion.",
    confidence: Number((1 - endGap / startGap).toFixed(2)),
    markers: [
      {
        time: recentHighs[recentHighs.length - 1].time,
        position: "aboveBar",
        color: "#9a7dff",
        shape: "circle",
        text: "TS",
      },
    ],
    lines: [
      {
        id: "triangle-upper",
        name: "Resistencia",
        points: [
          { time: recentHighs[0].time, value: recentHighs[0].price },
          { time: recentHighs[recentHighs.length - 1].time, value: recentHighs[recentHighs.length - 1].price },
        ],
        color: "rgba(154,125,255,0.7)",
        style: LineStyle.Solid,
        width: 2,
      },
      {
        id: "triangle-lower",
        name: "Soporte",
        points: [
          { time: recentLows[0].time, value: recentLows[0].price },
          { time: recentLows[recentLows.length - 1].time, value: recentLows[recentLows.length - 1].price },
        ],
        color: "rgba(154,125,255,0.6)",
        style: LineStyle.Dashed,
        width: 2,
      },
    ],
  };
};

const detectChannel = (
  candles: CandlePoint[],
  swings: SwingPoint[],
  direction: "rising" | "falling"
): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  const tailStart = Math.max(0, candles.length - 50);
  const recentHighs = highs.filter((point) => point.index >= tailStart).slice(-2);
  const recentLows = lows.filter((point) => point.index >= tailStart).slice(-2);
  if (recentHighs.length < 2 || recentLows.length < 2) return null;
  const highSlope =
    (recentHighs[1].price - recentHighs[0].price) / (recentHighs[1].index - recentHighs[0].index);
  const lowSlope =
    (recentLows[1].price - recentLows[0].price) / (recentLows[1].index - recentLows[0].index);
  if (direction === "rising" && !(highSlope > 0 && lowSlope > 0)) return null;
  if (direction === "falling" && !(highSlope < 0 && lowSlope < 0)) return null;
  const slopeGap = Math.abs(highSlope - lowSlope) / Math.max(Math.abs(highSlope), Math.abs(lowSlope));
  if (!Number.isFinite(slopeGap) || slopeGap > 0.35) return null;
  const name = direction === "rising" ? "Canal ascendente" : "Canal descendente";
  const color = direction === "rising" ? "rgba(0,190,130,0.7)" : "rgba(246,70,93,0.7)";
  return {
    kind: direction === "rising" ? "rising-channel" : "falling-channel",
    name,
    description: "Dos bandas paralelas que guian el movimiento del precio.",
    confidence: Number((1 - slopeGap).toFixed(2)),
    markers: [
      {
        time: recentHighs[1].time,
        position: "aboveBar",
        color,
        shape: "circle",
        text: direction === "rising" ? "CA" : "CD",
      },
    ],
    lines: [
      {
        id: `${direction}-channel-top`,
        name: "Banda superior",
        points: [
          { time: recentHighs[0].time, value: recentHighs[0].price },
          { time: recentHighs[1].time, value: recentHighs[1].price },
        ],
        color,
        style: LineStyle.Solid,
        width: 2,
      },
      {
        id: `${direction}-channel-bottom`,
        name: "Banda inferior",
        points: [
          { time: recentLows[0].time, value: recentLows[0].price },
          { time: recentLows[1].time, value: recentLows[1].price },
        ],
        color,
        style: LineStyle.Dashed,
        width: 2,
      },
    ],
  };
};

const detectEngulfing = (
  candles: CandlePoint[],
  direction: "bullish" | "bearish"
): Pattern | null => {
  if (candles.length < 2) return null;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(curr.close - curr.open);
  if (prevBody === 0 || currBody === 0) return null;
  if (direction === "bullish") {
    if (!(prev.close < prev.open && curr.close > curr.open)) return null;
    if (!(curr.open <= prev.close && curr.close >= prev.open)) return null;
    return {
      kind: "bullish-engulfing",
      name: "Engulfing alcista",
      description: "Vela verde que envuelve el cuerpo de la previa.",
      confidence: Number(Math.min(1, currBody / prevBody).toFixed(2)),
      markers: [
        {
          time: curr.time,
          position: "belowBar",
          color: "#2ecc71",
          shape: "arrowUp",
          text: "EA",
        },
      ],
      lines: [],
    };
  }
  if (!(prev.close > prev.open && curr.close < curr.open)) return null;
  if (!(curr.open >= prev.close && curr.close <= prev.open)) return null;
  return {
    kind: "bearish-engulfing",
    name: "Engulfing bajista",
    description: "Vela roja que envuelve el cuerpo de la previa.",
    confidence: Number(Math.min(1, currBody / prevBody).toFixed(2)),
    markers: [
      {
        time: curr.time,
        position: "aboveBar",
        color: "#e74c3c",
        shape: "arrowDown",
        text: "EB",
      },
    ],
    lines: [],
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
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({
    "double-top": true,
    "double-bottom": true,
    "head-shoulders": true,
    "ascending-triangle": true,
    "descending-triangle": true,
    "symmetrical-triangle": true,
    "rising-channel": true,
    "falling-channel": true,
    "bullish-engulfing": true,
    "bearish-engulfing": true,
  });
  const { holdings } = usePortfolioData();
  const portfolioTickers = useMemo(() => {
    const symbols = holdings.map((holding) => holding.ticker.toUpperCase()).filter(Boolean);
    return Array.from(new Set(symbols)).sort();
  }, [holdings]);
  const fallbackTickers = useMemo(
    () => ["AAPL", "MSFT", "TSLA", "NVDA", "AMD"],
    []
  );
  const allTickers = useMemo(() => {
    const merged = new Set([...portfolioTickers, ...fallbackTickers]);
    return Array.from(merged).sort();
  }, [portfolioTickers, fallbackTickers]);
  const selected = { symbol: ticker };
  const [liveSeries, setLiveSeries] = useState<{ candles: CandlePoint[]; volumes: VolumePoint[] }>(
    { candles: [], volumes: [] }
  );
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "error">("idle");
  const [liveError, setLiveError] = useState<string | null>(null);
  const series = liveSeries;
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
  const canAnalyze = liveStatus === "idle" && analysis.candles.length > 0 && !isLoading;
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
    const recent = analysis.candles.slice(-20).map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    return [
      "Eres un analista tecnico.",
      `Ticker: ${selected.symbol}.`,
      "Fuente de datos: Alpha Vantage.",
      `Patrones detectados: ${patternNames}.`,
      "Usa las ultimas 20 velas para comentar estructura, sesgo y niveles.",
      "Devuelve un resumen breve y niveles de soporte/resistencia.",
      `Velas: ${JSON.stringify(recent)}`,
    ].join(" ");
  }, [activePatterns, analysis.candles, selected.symbol]);

  useEffect(() => {
    let ignore = false;
    setLiveStatus("loading");
    setLiveError(null);
    fetch(`/api/market/ohlc?symbol=${selected.symbol}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "No data");
        }
        if (!Array.isArray(payload.candles) || payload.candles.length === 0) {
          throw new Error("Sin velas disponibles");
        }
        if (!ignore) {
          setLiveSeries({ candles: payload.candles ?? [], volumes: payload.volumes ?? [] });
          setLiveStatus("idle");
        }
      })
      .catch((err: Error) => {
        if (!ignore) {
          setLiveStatus("error");
          setLiveError(err.message);
        }
      });
    return () => {
      ignore = true;
    };
  }, [selected.symbol]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (analysis.candles.length === 0) return;
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
  }, [analysis, activePatterns]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2.1fr,1fr]">
      <Card
        title="Grafico en vivo"
        subtitle="Datos reales (Alpha Vantage) con overlays IA."
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
              {!allTickers.includes(ticker) && (
                <option value={ticker}>{ticker}</option>
              )}
              {portfolioTickers.length > 0 && (
                <optgroup label="Mi portafolio">
                  {portfolioTickers.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Populares">
                {fallbackTickers.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <form
            className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1"
            onSubmit={(event) => {
              event.preventDefault();
              const next = searchValue.trim().toUpperCase();
              if (!next) return;
              setTicker(next);
              setSearchValue("");
            }}
          >
            <span className="uppercase tracking-[0.2em] text-muted">Buscar</span>
            <input
              list="ticker-list"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Ej: META"
              className="w-24 rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text placeholder:text-muted"
            />
            <button
              type="submit"
              className="rounded-md border border-border/60 px-2 py-1 text-xs text-text transition hover:bg-surface"
            >
              Ir
            </button>
            <datalist id="ticker-list">
              {allTickers.map((symbol) => (
                <option key={symbol} value={symbol} />
              ))}
            </datalist>
          </form>
          {([
            { id: "double-top", label: "Doble techo" },
            { id: "double-bottom", label: "Doble suelo" },
            { id: "head-shoulders", label: "H-C-H" },
            { id: "ascending-triangle", label: "Triangulo asc." },
            { id: "descending-triangle", label: "Triangulo desc." },
            { id: "symmetrical-triangle", label: "Triangulo sim." },
            { id: "rising-channel", label: "Canal asc." },
            { id: "falling-channel", label: "Canal desc." },
            { id: "bullish-engulfing", label: "Engulfing alc." },
            { id: "bearish-engulfing", label: "Engulfing baj." },
          ] as const).map((item) => (
            <label
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 transition",
                filters[item.id] ? "bg-surface text-text" : "text-muted"
              )}
            >
              <input
                type="checkbox"
                checked={filters[item.id]}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, [item.id]: event.target.checked }))
                }
                className="accent-accent"
              />
              {item.label}
            </label>
          ))}
        </div>
        {liveStatus === "loading" && (
          <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-4 text-xs text-muted">
            Cargando datos en vivo...
          </div>
        )}
        {liveStatus === "error" && (
          <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-4 text-xs text-danger">
            Error al cargar datos: {liveError || "intenta nuevamente"}
          </div>
        )}
        <div ref={containerRef} className="w-full rounded-lg border border-border/60 bg-surface-muted/40" />
      </Card>

      <Card title="Deteccion IA" subtitle="Analisis IA sobre velas reales.">
        <div className="flex flex-col gap-4 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                setMessages([]);
                await sendMessage({ text: aiPrompt });
              }}
              disabled={!canAnalyze}
              className="bg-accent text-white hover:brightness-110"
            >
              {isLoading ? "Analizando..." : "Analizar con IA"}
            </Button>
            {!canAnalyze && liveStatus === "loading" && (
              <span className="text-xs text-muted">Esperando datos en vivo...</span>
            )}
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
