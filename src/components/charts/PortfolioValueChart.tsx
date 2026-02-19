'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  LineStyle,
  createChart,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { Card } from "@/components/ui/card";
import {
  buildAnalysis,
  type CandlePoint,
  type Pattern,
  type VolumePoint,
} from "@/lib/technical-analysis";

interface PortfolioValueChartProps {
  ticker: string;
  name?: string;
  showProjectionInsights?: boolean;
  chartHeight?: number;
  range?: "3mo" | "6mo" | "1y" | "2y" | "3y" | "5y" | "10y" | "ytd" | "max";
}

type SignalDirection = "bullish" | "bearish";

type MarkerWithConfidence = SeriesMarker<Time> & { confidence?: number };

type AiPattern = {
  name: string;
  type: "double_top" | "double_bottom" | "head_shoulders" | "resistance" | "support" | "trendline";
  points: { time: string | number; price: number }[];
  confidence: number;
  description: string;
};

type AiAuditResult = {
  patterns: AiPattern[];
  summary: string;
  entry?: string;
  target?: string;
  stopLoss?: string;
};

type PatternSignal = {
  name: string;
  confidence: number;
  direction: SignalDirection;
  projection?: number;
  stopLoss?: number;
};

type TechnicalOutlook = {
  direction: SignalDirection;
  probability: number;
  target: number;
  stopLoss: number;
  lastPrice: number;
  riskReward?: number;
  reasons: string[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const isPatternSignal = (signal: PatternSignal | null): signal is PatternSignal => signal !== null;

const bullishKinds = new Set<Pattern["kind"]>([
  "double-bottom",
  "triple-bottom",
  "inverse-head-shoulders",
  "falling-wedge",
  "bullish-flag",
  "bullish-pennant",
  "cup-handle",
  "ascending-triangle",
  "falling-channel",
  "bullish-engulfing",
  "hammer",
  "inverted-hammer",
]);

const bearishKinds = new Set<Pattern["kind"]>([
  "double-top",
  "triple-top",
  "head-shoulders",
  "rising-wedge",
  "bearish-flag",
  "bearish-pennant",
  "descending-triangle",
  "rising-channel",
  "bearish-engulfing",
  "hanging-man",
  "shooting-star",
]);

const inferDirectionFromProjection = (
  projection: number | undefined,
  lastPrice: number
): SignalDirection | null => {
  if (projection === undefined) return null;
  if (projection > lastPrice * 1.003) return "bullish";
  if (projection < lastPrice * 0.997) return "bearish";
  return null;
};

const inferDirectionFromKind = (kind: Pattern["kind"]): SignalDirection | null => {
  if (bullishKinds.has(kind)) return "bullish";
  if (bearishKinds.has(kind)) return "bearish";
  return null;
};

const inferDirectionFromAiPattern = (pattern: AiPattern): SignalDirection | null => {
  if (pattern.type === "double_bottom" || pattern.type === "support") return "bullish";
  if (pattern.type === "double_top" || pattern.type === "head_shoulders" || pattern.type === "resistance") {
    return "bearish";
  }
  const text = `${pattern.name} ${pattern.description}`.toLowerCase();
  if (text.includes("alcista")) return "bullish";
  if (text.includes("bajista")) return "bearish";
  return null;
};

const calculateRiskReward = (entry: number, target: number, stopLoss: number) => {
  const risk = Math.abs(entry - stopLoss);
  if (risk < 1e-6) return undefined;
  const reward = Math.abs(target - entry);
  return reward / risk;
};

export function PortfolioValueChart({
  ticker,
  name,
  showProjectionInsights = false,
  chartHeight = 500,
  range = "1y",
}: PortfolioValueChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [liveSeries, setLiveSeries] = useState<{ candles: CandlePoint[]; volumes: VolumePoint[] }>({
    candles: [],
    volumes: [],
  });
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [aiResult, setAiResult] = useState<AiAuditResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const safeChartHeight = clamp(Math.round(chartHeight), 360, 980);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setStatus("loading");
      setAiResult(null);
      setAiError(null);
      try {
        const res = await fetch(
          `/api/market/ohlc?symbol=${encodeURIComponent(ticker)}&range=${encodeURIComponent(range)}`
        );
        const payload = await res.json();
        if (!res.ok || !Array.isArray(payload.candles)) {
          throw new Error("No data");
        }
        if (!ignore) {
          setLiveSeries({ candles: payload.candles, volumes: payload.volumes ?? [] });
          setStatus("idle");
        }
      } catch {
        if (!ignore) setStatus("error");
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, [ticker, range]);

  const handleAiAudit = async () => {
    if (liveSeries.candles.length === 0) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/market/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candles: liveSeries.candles, symbol: ticker }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo completar la auditoría IA.");
      }
      setAiResult(data as AiAuditResult);
    } catch (err) {
      console.error("AI Audit failed:", err);
      setAiResult(null);
      setAiError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const analysis = useMemo(() => buildAnalysis(liveSeries.candles, liveSeries.volumes), [liveSeries]);

  const aiChartPatterns = useMemo(() => {
    return (aiResult?.patterns ?? [])
      .map((pattern, idx) => {
        const points = pattern.points
          .map((point) => ({ time: String(point.time), value: point.price }))
          .filter((point) => point.time && Number.isFinite(point.value));
        return {
          kind: pattern.type,
          name: pattern.name,
          description: pattern.description,
          confidence: pattern.confidence,
          markers: [] as SeriesMarker<Time>[],
          lines: points.length > 1
            ? [
                {
                  id: `ai-${pattern.name}-${idx}`,
                  name: pattern.name,
                  points,
                  color:
                    pattern.type.includes("top") || pattern.type.includes("resistance")
                      ? "#f6465d"
                      : "#00c074",
                  width: 3,
                  style: LineStyle.Solid,
                },
              ]
            : [],
        };
      })
      .filter((pattern) => pattern.lines.length > 0);
  }, [aiResult]);

  const patternsForChart = useMemo(() => {
    return [...analysis.patterns, ...aiChartPatterns].map((pattern) => {
      const times = pattern.lines.flatMap((line) => line.points.map((point) => String(point.time)));
      const lastTime = [...times].sort().reverse()[0] || "";
      return { ...pattern, lastTime };
    });
  }, [analysis.patterns, aiChartPatterns]);

  const technicalOutlook = useMemo<TechnicalOutlook | null>(() => {
    if (!showProjectionInsights || liveSeries.candles.length < 20) return null;

    const lastPrice = liveSeries.candles[liveSeries.candles.length - 1].close;
    const localSignals: PatternSignal[] = analysis.patterns
      .map<PatternSignal | null>((pattern) => {
        const direction =
          inferDirectionFromProjection(pattern.projection, lastPrice) ??
          inferDirectionFromKind(pattern.kind);
        if (!direction) return null;
        return {
          name: pattern.name,
          confidence: clamp(pattern.confidence, 0.5, 0.99),
          direction,
          projection: pattern.projection,
          stopLoss: pattern.stopLoss,
        };
      })
      .filter(isPatternSignal);

    const aiSignals: PatternSignal[] = (aiResult?.patterns ?? [])
      .map<PatternSignal | null>((pattern) => {
        const direction = inferDirectionFromAiPattern(pattern);
        if (!direction) return null;
        return {
          name: pattern.name,
          confidence: clamp(pattern.confidence, 0.5, 0.95),
          direction,
        };
      })
      .filter(isPatternSignal);

    const allSignals = [...localSignals, ...aiSignals];
    if (allSignals.length === 0) return null;

    const bullish = allSignals.filter((signal) => signal.direction === "bullish");
    const bearish = allSignals.filter((signal) => signal.direction === "bearish");
    const bullishScore = bullish.reduce((sum, signal) => sum + signal.confidence, 0);
    const bearishScore = bearish.reduce((sum, signal) => sum + signal.confidence, 0);
    const direction: SignalDirection = bullishScore >= bearishScore ? "bullish" : "bearish";
    const dominant = direction === "bullish" ? bullish : bearish;
    const opposite = direction === "bullish" ? bearish : bullish;

    if (dominant.length === 0) return null;

    const dominantWeight = dominant.reduce((sum, signal) => sum + signal.confidence, 0);
    const oppositeWeight = opposite.reduce((sum, signal) => sum + signal.confidence, 0);
    const consensus = dominantWeight / Math.max(dominantWeight + oppositeWeight, 0.0001);
    const avgDominant = dominantWeight / dominant.length;
    const probability = clamp(consensus * 0.62 + avgDominant * 0.38, 0.52, 0.94);

    const projectedSignals = dominant.filter((signal) => {
      if (signal.projection === undefined) return false;
      return direction === "bullish"
        ? signal.projection > lastPrice
        : signal.projection < lastPrice;
    });

    const weightedProjection = projectedSignals.length
      ? projectedSignals.reduce(
          (acc, signal) => acc + (signal.projection ?? lastPrice) * signal.confidence,
          0
        ) / projectedSignals.reduce((acc, signal) => acc + signal.confidence, 0)
      : null;

    const stopSignals = dominant.filter((signal) => {
      if (signal.stopLoss === undefined) return false;
      return direction === "bullish"
        ? signal.stopLoss < lastPrice
        : signal.stopLoss > lastPrice;
    });

    const weightedStop = stopSignals.length
      ? stopSignals.reduce(
          (acc, signal) => acc + (signal.stopLoss ?? lastPrice) * signal.confidence,
          0
        ) / stopSignals.reduce((acc, signal) => acc + signal.confidence, 0)
      : null;

    const recentCandles = liveSeries.candles.slice(-20);
    const averageRange =
      recentCandles.reduce((acc, candle) => acc + (candle.high - candle.low), 0) /
      recentCandles.length;
    const fallbackTarget =
      direction === "bullish" ? lastPrice + averageRange * 2.2 : lastPrice - averageRange * 2.2;
    const fallbackStop =
      direction === "bullish" ? lastPrice - averageRange * 1.1 : lastPrice + averageRange * 1.1;

    const target = weightedProjection ?? fallbackTarget;
    const stopLoss = weightedStop ?? fallbackStop;
    const riskReward = calculateRiskReward(lastPrice, target, stopLoss);
    const reasons = dominant
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((signal) => signal.name);

    return { direction, probability, target, stopLoss, lastPrice, riskReward, reasons };
  }, [showProjectionInsights, liveSeries.candles, analysis.patterns, aiResult]);

  useEffect(() => {
    if (!containerRef.current || status !== "idle" || liveSeries.candles.length === 0) return;

    containerRef.current.innerHTML = "";
    const chart = createChart(containerRef.current, {
      height: safeChartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cfd6e6",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "rgba(41,98,255,0.2)", width: 1, style: 2 },
        horzLine: { color: "rgba(41,98,255,0.1)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.05)",
        scaleMargins: { top: 0.2, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.05)",
        timeVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00c074",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#00c074",
      wickDownColor: "#f6465d",
    });
    candleSeries.setData(liveSeries.candles);

    const allMarkers: MarkerWithConfidence[] = [];

    patternsForChart.forEach((pattern) => {
      pattern.lines.forEach((line) => {
        const series = chart.addLineSeries({
          color: line.color,
          lineWidth: 3,
          lineStyle: line.style ?? LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(line.points);
      });

      if (pattern.markers.length > 0) {
        allMarkers.push(
          ...pattern.markers.map((marker) => ({ ...marker, confidence: pattern.confidence }))
        );
      }

      if (pattern.lastTime && pattern.confidence > 0.6) {
        allMarkers.push({
          time: pattern.lastTime,
          position: "aboveBar",
          color: pattern.lines[0]?.color || "#3b82f6",
          shape: "circle",
          text: pattern.name,
          confidence: pattern.confidence,
        });
      }
    });

    if (showProjectionInsights && technicalOutlook) {
      const lastTime = liveSeries.candles[liveSeries.candles.length - 1].time;
      allMarkers.push({
        time: lastTime,
        position: technicalOutlook.direction === "bullish" ? "belowBar" : "aboveBar",
        color: technicalOutlook.direction === "bullish" ? "#00c074" : "#f6465d",
        shape: technicalOutlook.direction === "bullish" ? "arrowUp" : "arrowDown",
        text: `Prob ${Math.round(technicalOutlook.probability * 100)}%`,
        confidence: technicalOutlook.probability,
      });
    }

    const groupedMarkers = new Map<string, MarkerWithConfidence>();
    allMarkers.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    allMarkers.forEach((marker) => {
      const key = String(marker.time);
      if (!groupedMarkers.has(key)) {
        groupedMarkers.set(key, { ...marker });
        return;
      }
      const existing = groupedMarkers.get(key);
      if (!existing) return;
      if (!existing.text && marker.text) existing.text = marker.text;
      if (marker.shape && marker.shape !== "circle") existing.shape = marker.shape;
    });

    candleSeries.setMarkers(
      Array.from(groupedMarkers.values()).sort((a, b) => String(a.time).localeCompare(String(b.time)))
    );

    analysis.support.forEach((line) => {
      const series = chart.addLineSeries({
        color: line.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(line.points);
    });

    if (showProjectionInsights && technicalOutlook) {
      const startTime = liveSeries.candles[Math.max(0, liveSeries.candles.length - 90)].time;
      const endTime = liveSeries.candles[liveSeries.candles.length - 1].time;
      const targetColor = technicalOutlook.direction === "bullish" ? "#00c074" : "#f8c12e";
      const stopColor = "#f6465d";

      const targetSeries = chart.addLineSeries({
        color: targetColor,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      targetSeries.setData([
        { time: startTime, value: technicalOutlook.target },
        { time: endTime, value: technicalOutlook.target },
      ]);

      const stopSeries = chart.addLineSeries({
        color: stopColor,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      stopSeries.setData([
        { time: startTime, value: technicalOutlook.stopLoss },
        { time: endTime, value: technicalOutlook.stopLoss },
      ]);

      const entrySeries = chart.addLineSeries({
        color: "rgba(133,148,170,0.7)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      entrySeries.setData([
        { time: startTime, value: technicalOutlook.lastPrice },
        { time: endTime, value: technicalOutlook.lastPrice },
      ]);
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [status, liveSeries, analysis, patternsForChart, technicalOutlook, showProjectionInsights, safeChartHeight]);

  const displayPatterns = useMemo(() => {
    const combined = [
      ...analysis.patterns.map((pattern) => {
        const times = pattern.lines.flatMap((line) => line.points.map((point) => String(point.time)));
        return {
          name: pattern.name,
          confidence: pattern.confidence,
          description: pattern.description,
          isAi: false,
          lastTime: [...times].sort().reverse()[0] || "",
        };
      }),
      ...(aiResult?.patterns ?? []).map((pattern) => {
        const times = pattern.points.map((point) => String(point.time));
        return {
          name: pattern.name,
          confidence: pattern.confidence,
          description: pattern.description,
          isAi: true,
          lastTime: [...times].sort().reverse()[0] || "",
        };
      }),
    ].sort((a, b) => b.lastTime.localeCompare(a.lastTime));

    if (combined.length === 0) return [];
    const latest = combined[0];
    const others = combined
      .slice(1)
      .filter((pattern) => pattern.confidence > 0.85)
      .sort((a, b) => b.confidence - a.confidence);
    return [latest, ...others].slice(0, 3);
  }, [analysis.patterns, aiResult]);

  return (
    <Card
      title={name || ticker}
      subtitle={
        status === "idle"
          ? aiResult
            ? "Análisis IA completo"
            : showProjectionInsights
              ? "Análisis técnico con proyección"
              : name
                ? ticker
                : "Análisis técnico"
          : "Cargando..."
      }
      className="overflow-hidden"
    >
      {status === "loading" && (
        <div style={{ height: safeChartHeight }} className="flex items-center justify-center text-xs text-muted">
          Cargando...
        </div>
      )}
      {status === "error" && (
        <div style={{ height: safeChartHeight }} className="flex items-center justify-center text-xs text-danger">
          Error al cargar datos
        </div>
      )}
      <div ref={containerRef} style={{ height: safeChartHeight }} className="w-full" />

      {showProjectionInsights && status === "idle" && (
        <div className="mt-4 rounded-xl border border-border/60 bg-surface/35 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Sugerencia por patrones
              </p>
              <p className="mt-1 text-sm font-semibold text-text">
                {technicalOutlook
                  ? technicalOutlook.direction === "bullish"
                    ? "Sesgo alcista"
                    : "Sesgo bajista"
                  : "Sin señal dominante"}
              </p>
            </div>
            <div
              className={`text-2xl font-bold ${
                technicalOutlook
                  ? technicalOutlook.direction === "bullish"
                    ? "text-success"
                    : "text-danger"
                  : "text-muted"
              }`}
            >
              {technicalOutlook ? `${Math.round(technicalOutlook.probability * 100)}%` : "--"}
            </div>
          </div>

          {technicalOutlook ? (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted/70">
                <div
                  className={`h-full rounded-full ${
                    technicalOutlook.direction === "bullish" ? "bg-success/80" : "bg-danger/80"
                  }`}
                  style={{ width: `${Math.round(technicalOutlook.probability * 100)}%` }}
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/50 bg-surface/45 p-2">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">Precio actual</p>
                  <p className="text-xs font-semibold text-text">{technicalOutlook.lastPrice.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/45 p-2">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">Objetivo</p>
                  <p
                    className={`text-xs font-semibold ${
                      technicalOutlook.direction === "bullish" ? "text-success" : "text-accent"
                    }`}
                  >
                    {technicalOutlook.target.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/45 p-2">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">Stop técnico</p>
                  <p className="text-xs font-semibold text-danger">{technicalOutlook.stopLoss.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/45 p-2">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted">R/R estimado</p>
                  <p className="text-xs font-semibold text-text">
                    {technicalOutlook.riskReward !== undefined
                      ? technicalOutlook.riskReward.toFixed(2)
                      : "--"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted">
                Basado en figuras detectadas: {technicalOutlook.reasons.join(", ")}.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted">
              No hay suficientes patrones confirmados para estimar probabilidad y proyección.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Patrones detectados
          </h4>
          <div className="flex flex-col gap-2">
            {displayPatterns.length > 0 ? (
              displayPatterns.map((pattern, idx) => (
                <div
                  key={`${pattern.name}-${idx}`}
                  className="flex items-center justify-between rounded border border-border/50 bg-surface/50 p-2"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-text">{pattern.name}</span>
                      {pattern.isAi && (
                        <span className="rounded bg-accent/10 px-1 py-0.5 text-[8px] font-bold text-accent">
                          IA
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-1 text-[9px] text-muted">{pattern.description}</span>
                  </div>
                  <span className="text-[10px] font-bold text-accent">
                    {(pattern.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[10px] italic text-muted">No se han detectado patrones claros.</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">Análisis Pro</h4>
            <button
              onClick={handleAiAudit}
              disabled={isAiLoading || status !== "idle"}
              className="rounded bg-accent px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {isAiLoading ? "Analizando..." : "Iniciar Auditoría IA"}
            </button>
          </div>

          {aiError ? (
            <div className="flex h-[100px] flex-col items-center justify-center rounded border border-danger/40 bg-danger/5 px-4">
              <p className="text-center text-[10px] text-danger">{aiError}</p>
            </div>
          ) : aiResult ? (
            <div className="space-y-4">
              <p className="rounded border border-border/50 bg-surface/50 p-3 text-[11px] italic leading-relaxed text-text/80">
                &quot;{aiResult.summary}&quot;
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-success/10 bg-success/5 p-2">
                  <p className="mb-0.5 text-[8px] uppercase tracking-tighter text-success/60">Entrada</p>
                  <p className="text-[11px] font-bold text-success">{aiResult.entry || "-"}</p>
                </div>
                <div className="rounded border border-accent/10 bg-accent/5 p-2">
                  <p className="mb-0.5 text-[8px] uppercase tracking-tighter text-accent/60">Objetivo</p>
                  <p className="text-[11px] font-bold text-accent">{aiResult.target || "-"}</p>
                </div>
                <div className="rounded border border-danger/10 bg-danger/5 p-2">
                  <p className="mb-0.5 text-[8px] uppercase tracking-tighter text-danger/60">Stop Loss</p>
                  <p className="text-[11px] font-bold text-danger">{aiResult.stopLoss || "-"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[100px] flex-col items-center justify-center rounded border border-dashed border-border/50 bg-surface/30">
              <p className="px-4 text-center text-[10px] text-muted">
                Haz clic en &quot;Iniciar Auditoría IA&quot; para obtener un análisis detallado y puntos de
                entrada/salida.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
