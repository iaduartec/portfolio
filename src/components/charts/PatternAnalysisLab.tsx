'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  LineStyle,
  createChart,
} from "lightweight-charts";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MemoizedMarkdown } from "@/components/ai/memoized-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { computeIncrementalTechnicalAnalysis } from "@/lib/incrementalTechnicalEngine";
import {
  EMPTY_INDICATOR_BUNDLE,
  computeIndicatorBundleWithMetrics,
} from "@/lib/indicatorAnalysis";
import { TechnicalAnalysisWorkerClient } from "@/lib/technicalAnalysisWorkerClient";
import type { AnalysisResultPayload } from "@/types/technicalWorker";
import {
  DEFAULT_INDICATOR_FILTERS,
  DEFAULT_PATTERN_FILTERS,
  INDICATOR_FILTER_OPTIONS,
  PATTERN_FILTER_OPTIONS,
  STRATEGY_PRESETS,
  type IndicatorFilterKey,
  type PatternFilterKey,
} from "@/data/strategyPresets";
import {
  type AnalysisResult,
  type CandlePoint,
  type VolumePoint,
  normalizeLineWidth,
  confidenceLabel,
} from "@/lib/technical-analysis";

const ANALYSIS_WORKER_TIMEOUT_MS = 4500;
const EMPTY_ANALYSIS: AnalysisResult = {
  candles: [],
  volumes: [],
  patterns: [],
  support: [],
};
const EMPTY_ANALYSIS_ENGINE_STATE: AnalysisResultPayload = {
  analysis: EMPTY_ANALYSIS,
  metrics: { mode: "full", durationMs: 0 },
  indicatorBundle: EMPTY_INDICATOR_BUNDLE,
  indicatorMetrics: { mode: "full", durationMs: 0 },
};









export function PatternAnalysisLab() {
  const calibrationMode = process.env.NEXT_PUBLIC_SIGNAL_CALIBRATION_MODE ?? "full";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ticker, setTicker] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1d");
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState(DEFAULT_PATTERN_FILTERS);
  const [indicatorFilters, setIndicatorFilters] = useState(DEFAULT_INDICATOR_FILTERS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
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
  const workerClientRef = useRef<TechnicalAnalysisWorkerClient | null>(null);
  const activeWorkerRequestIdRef = useRef<string | null>(null);
  const latestAnalysisRunRef = useRef(0);
  const [analysisEngine, setAnalysisEngine] = useState<AnalysisResultPayload>(EMPTY_ANALYSIS_ENGINE_STATE);
  const analysis = analysisEngine.analysis;

  const activePatterns = useMemo(
    () => analysis.patterns.filter((pattern) => filters[pattern.kind]),
    [analysis.patterns, filters]
  );
  const presetLookup = useMemo(
    () => Object.fromEntries(STRATEGY_PRESETS.map((preset) => [preset.id, preset])),
    []
  );

  const buildPresetState = <T extends string>(
    keys: readonly T[],
    selected: readonly T[]
  ): Record<T, boolean> =>
    keys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: selected.includes(key),
      }),
      {} as Record<T, boolean>
    );

  const applyPreset = (presetId: string) => {
    const preset = presetLookup[presetId];
    if (!preset) return;
    setIndicatorFilters(
      buildPresetState(
        INDICATOR_FILTER_OPTIONS.map((item) => item.id),
        preset.indicators
      ) as Record<IndicatorFilterKey, boolean>
    );
    setFilters(
      buildPresetState(
        PATTERN_FILTER_OPTIONS.map((item) => item.id),
        preset.patterns
      ) as Record<PatternFilterKey, boolean>
    );
    setActivePresetId(preset.id);
  };

  const indicatorBundle = analysisEngine.indicatorBundle;

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
  const indicatorSummary = indicatorBundle.summary;
  const latestText = latestAssistant
    ? (() => {
      const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
        Boolean(
          part &&
          typeof part === "object" &&
          (part as { type?: string }).type === "text" &&
          typeof (part as { text?: string }).text === "string"
        );
      const parts = Array.isArray(latestAssistant.parts)
        ? latestAssistant.parts.filter(isTextPart)
        : [];
      const partsText = parts.map((part) => part.text).join("\n");
      const rawMessage = latestAssistant as unknown;
      const legacyContent =
        rawMessage &&
          typeof rawMessage === "object" &&
          "content" in rawMessage &&
          typeof (rawMessage as { content?: unknown }).content === "string"
          ? (rawMessage as { content: string }).content
          : "";
      const legacyText =
        rawMessage &&
          typeof rawMessage === "object" &&
          "text" in rawMessage &&
          typeof (rawMessage as { text?: unknown }).text === "string"
          ? (rawMessage as { text: string }).text
          : "";
      return partsText || legacyContent || legacyText;
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
    const summary = indicatorBundle.summary;
    const indicatorText = [
      summary.rsi !== undefined ? `RSI14=${summary.rsi.toFixed(1)}` : "",
      summary.mfi !== undefined ? `MFI14=${summary.mfi.toFixed(1)}` : "",
      summary.cmo !== undefined ? `CMO14=${summary.cmo.toFixed(1)}` : "",
      summary.atrPercent !== undefined ? `ATR14%=${summary.atrPercent.toFixed(2)}` : "",
      summary.vwap !== undefined ? `VWAP=${summary.vwap.toFixed(2)}` : "",
      summary.ema200 !== undefined ? `EMA200=${summary.ema200.toFixed(2)}` : "",
      summary.macdLine !== undefined
        ? `MACD=${summary.macdLine.toFixed(2)}`
        : "",
      summary.macdSignal !== undefined
        ? `Signal=${summary.macdSignal.toFixed(2)}`
        : "",
      summary.macdHist !== undefined
        ? `Hist=${summary.macdHist.toFixed(2)}`
        : "",
      summary.supertrend !== undefined
        ? `Supertrend=${summary.supertrend.toFixed(2)}${summary.supertrendDirection ? `(${summary.supertrendDirection})` : ""
        }`
        : "",
      summary.ichimokuTenkan !== undefined
        ? `Tenkan=${summary.ichimokuTenkan.toFixed(2)}`
        : "",
      summary.ichimokuKijun !== undefined ? `Kijun=${summary.ichimokuKijun.toFixed(2)}` : "",
      summary.ichimokuSpanA !== undefined ? `SpanA=${summary.ichimokuSpanA.toFixed(2)}` : "",
      summary.ichimokuSpanB !== undefined ? `SpanB=${summary.ichimokuSpanB.toFixed(2)}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    return [
      "Eres un analista tecnico.",
      `Ticker: ${selected.symbol}.`,
      "Fuente de datos: Alpha Vantage.",
      `Patrones detectados: ${patternNames}.`,
      indicatorText ? `Indicadores: ${indicatorText}.` : "",
      "Usa las ultimas 20 velas para comentar estructura, sesgo y niveles.",
      "Devuelve un resumen breve y niveles de soporte/resistencia.",
      `Velas: ${JSON.stringify(recent)}`,
    ].join(" ");
  }, [activePatterns, analysis.candles, indicatorBundle.summary, selected.symbol]);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      console.log(`[PatternAnalysisLab] Fetching data for: ${selected.symbol}`);
      setLiveStatus("loading");
      setLiveError(null);
      try {
        const res = await fetch(`/api/market/ohlc?symbol=${selected.symbol}&interval=${timeframe}`);
        const payload = await res.json();
        if (!res.ok) {
          const details = [
            payload?.error,
            payload?.resolvedSymbol ? `resuelto: ${payload.resolvedSymbol}` : "",
            payload?.searchedSymbol ? `buscado: ${payload.searchedSymbol}` : "",
          ]
            .filter(Boolean)
            .join(" | ");
          throw new Error(details || "No data");
        }
        if (!Array.isArray(payload.candles) || payload.candles.length === 0) {
          throw new Error("Sin velas disponibles");
        }
        if (!ignore) {
          console.log(`[PatternAnalysisLab] Data loaded for ${selected.symbol}: ${payload.candles.length} candles`);
          setLiveSeries({ candles: payload.candles ?? [], volumes: payload.volumes ?? [] });
          setLiveStatus("idle");
        }
      } catch (err: any) {
        if (!ignore) {
          console.error(`[PatternAnalysisLab] Error fetching ${selected.symbol}:`, err);
          setLiveStatus("error");
          setLiveError(err.message);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [selected.symbol, timeframe]);

  useEffect(() => {
    if (series.candles.length === 0) {
      setAnalysisEngine(EMPTY_ANALYSIS_ENGINE_STATE);
      return;
    }

    const runId = latestAnalysisRunRef.current + 1;
    latestAnalysisRunRef.current = runId;
    const payload = {
      symbol: selected.symbol,
      timeframe,
      candles: series.candles,
      volumes: series.volumes,
      indicatorFilters,
    };
    let canceled = false;
    let requestIdForRun: string | null = null;

    const runAnalysis = async () => {
      if (typeof Worker !== "undefined") {
        if (!workerClientRef.current) {
          workerClientRef.current = new TechnicalAnalysisWorkerClient();
        }

        try {
          const { requestId, promise } = workerClientRef.current.runAnalysis(payload, {
            timeoutMs: ANALYSIS_WORKER_TIMEOUT_MS,
          });
          requestIdForRun = requestId;
          activeWorkerRequestIdRef.current = requestId;
          const workerResult = await promise;

          if (canceled || runId !== latestAnalysisRunRef.current) {
            return;
          }

          if (activeWorkerRequestIdRef.current === requestIdForRun) {
            activeWorkerRequestIdRef.current = null;
          }
          setAnalysisEngine(workerResult);
          return;
        } catch (error) {
          if (activeWorkerRequestIdRef.current === requestIdForRun) {
            activeWorkerRequestIdRef.current = null;
          }

          if (canceled || runId !== latestAnalysisRunRef.current) {
            return;
          }

          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.warn("[PatternAnalysisLab] Falling back to main-thread analysis:", error);
          }
        }
      }

      if (canceled || runId !== latestAnalysisRunRef.current) {
        return;
      }

      const localAnalysis = computeIncrementalTechnicalAnalysis(payload);
      const { indicatorBundle, indicatorMetrics } = computeIndicatorBundleWithMetrics({
        candles: localAnalysis.analysis.candles,
        volumes: localAnalysis.analysis.volumes,
        indicatorFilters,
      });
      setAnalysisEngine({
        ...localAnalysis,
        indicatorBundle,
        indicatorMetrics,
      });
    };

    void runAnalysis();

    return () => {
      canceled = true;
      const requestId = requestIdForRun;
      if (requestId && workerClientRef.current) {
        workerClientRef.current.cancel(requestId);
        if (activeWorkerRequestIdRef.current === requestId) {
          activeWorkerRequestIdRef.current = null;
        }
      }
    };
  }, [selected.symbol, timeframe, series, indicatorFilters]);

  useEffect(() => {
    return () => {
      const requestId = activeWorkerRequestIdRef.current;
      if (requestId && workerClientRef.current) {
        workerClientRef.current.cancel(requestId);
      }

      workerClientRef.current?.dispose();
      workerClientRef.current = null;
      activeWorkerRequestIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous content just in case
    containerRef.current.innerHTML = "";

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

    [
      ...analysis.support,
      ...indicatorBundle.pivotLines,
      ...indicatorBundle.lines,
      ...activePatterns.flatMap((pattern) => pattern.lines),
    ].forEach((line) => {
      const series = chart.addLineSeries({
        color: line.color,
        lineWidth: normalizeLineWidth(line.width),
        lineStyle: line.style ?? LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(line.points);
    });

    chart.timeScale().fitContent();
    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [analysis, activePatterns, indicatorBundle]);

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

          <label className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1 text-xs text-muted">
            <span className="uppercase tracking-[0.2em]">Intervalo</span>
            <select
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value)}
              className="rounded-md border border-border/60 bg-surface px-2 py-1 text-xs text-text"
            >
              <option value="1wk">Semanal</option>
              <option value="1d">Diario</option>
              <option value="4h">4 Horas</option>
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
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Presets
          </span>
          {STRATEGY_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "rounded-full border border-border/60 px-3 py-1 text-xs transition",
                  isActive
                    ? "bg-accent/20 text-text"
                    : "bg-surface-muted/40 text-muted hover:bg-surface"
                )}
                title={preset.description}
              >
                {isActive ? "Aplicado: " : "Aplicar: "}
                {preset.name}
              </button>
            );
          })}
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Indicadores
          </span>
          {INDICATOR_FILTER_OPTIONS.map((item) => (
            <label
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 transition",
                indicatorFilters[item.id] ? "bg-surface text-text" : "text-muted"
              )}
            >
              <input
                type="checkbox"
                checked={indicatorFilters[item.id]}
                onChange={(event) => {
                  setIndicatorFilters((prev) => ({
                    ...prev,
                    [item.id]: event.target.checked,
                  }));
                  setActivePresetId(null);
                }}
                className="accent-accent"
              />
              {item.label}
            </label>
          ))}
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Patrones
          </span>
          {PATTERN_FILTER_OPTIONS.map((item) => (
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
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, [item.id]: event.target.checked }));
                  setActivePresetId(null);
                }}
                className="accent-accent"
              />
              {item.label}
            </label>
          ))}
          <span className="rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted">
            Engine: {analysisEngine.metrics.mode} · {analysisEngine.metrics.durationMs.toFixed(2)}ms
          </span>
          <span className="rounded-full border border-border/60 bg-surface-muted/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted">
            Indicadores: {analysisEngine.indicatorMetrics.mode} · {analysisEngine.indicatorMetrics.durationMs.toFixed(2)}ms
          </span>
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

      <div className="flex flex-col gap-6">
        <Card title="Indicadores" subtitle="Momentum, volatilidad y niveles clave.">
          <div className="flex flex-col gap-3 text-sm text-muted">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "RSI 14",
                  value: indicatorSummary.rsi,
                  hint:
                    indicatorSummary.rsi !== undefined
                      ? indicatorSummary.rsi >= 70
                        ? "Sobrecompra"
                        : indicatorSummary.rsi <= 30
                          ? "Sobreventa"
                          : "Neutral"
                      : "—",
                },
                {
                  label: "MFI 14",
                  value: indicatorSummary.mfi,
                  hint:
                    indicatorSummary.mfi !== undefined
                      ? indicatorSummary.mfi >= 80
                        ? "Sobrecompra"
                        : indicatorSummary.mfi <= 20
                          ? "Sobreventa"
                          : "Neutral"
                      : "—",
                },
                {
                  label: "CMO 14",
                  value: indicatorSummary.cmo,
                  hint:
                    indicatorSummary.cmo !== undefined
                      ? indicatorSummary.cmo >= 50
                        ? "Momentum alcista"
                        : indicatorSummary.cmo <= -50
                          ? "Momentum bajista"
                          : "Lateral"
                      : "—",
                },
                {
                  label: "ATR 14 %",
                  value: indicatorSummary.atrPercent,
                  hint: indicatorSummary.atrPercent ? "Volatilidad" : "—",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/60 bg-surface-muted/40 p-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                    {item.label}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-semibold text-text">
                      {item.value !== undefined ? item.value.toFixed(2) : "--"}
                    </span>
                    <span className="text-xs text-muted">{item.hint}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-xs text-muted">
              <p className="uppercase tracking-[0.2em] text-muted">Niveles</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted">VWAP:</span>{" "}
                  <span className="text-text">
                    {indicatorSummary.vwap !== undefined
                      ? indicatorSummary.vwap.toFixed(2)
                      : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">EMA 200:</span>{" "}
                  <span className="text-text">
                    {indicatorSummary.ema200 !== undefined
                      ? indicatorSummary.ema200.toFixed(2)
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-xs text-muted">
                <p className="uppercase tracking-[0.2em] text-muted">Momentum</p>
                <div className="mt-2 grid gap-2">
                  <div>
                    <span className="text-muted">MACD:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.macdLine !== undefined
                        ? indicatorSummary.macdLine.toFixed(2)
                        : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Signal:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.macdSignal !== undefined
                        ? indicatorSummary.macdSignal.toFixed(2)
                        : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Hist:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.macdHist !== undefined
                        ? indicatorSummary.macdHist.toFixed(2)
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-xs text-muted">
                <p className="uppercase tracking-[0.2em] text-muted">Tendencia</p>
                <div className="mt-2 grid gap-2">
                  <div>
                    <span className="text-muted">Supertrend:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.supertrend !== undefined
                        ? indicatorSummary.supertrend.toFixed(2)
                        : "--"}
                    </span>
                    {indicatorSummary.supertrendDirection && (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-muted">
                        {indicatorSummary.supertrendDirection === "bullish"
                          ? "alcista"
                          : "bajista"}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted">Tenkan/Kijun:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.ichimokuTenkan !== undefined
                        ? indicatorSummary.ichimokuTenkan.toFixed(2)
                        : "--"}
                      {" / "}
                      {indicatorSummary.ichimokuKijun !== undefined
                        ? indicatorSummary.ichimokuKijun.toFixed(2)
                        : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Span A/B:</span>{" "}
                    <span className="text-text">
                      {indicatorSummary.ichimokuSpanA !== undefined
                        ? indicatorSummary.ichimokuSpanA.toFixed(2)
                        : "--"}
                      {" / "}
                      {indicatorSummary.ichimokuSpanB !== undefined
                        ? indicatorSummary.ichimokuSpanB.toFixed(2)
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              activePatterns.map((pattern) => {
                const confidence = pattern.calibratedConfidence ?? pattern.confidence;
                const band = pattern.confidenceBand ?? (confidence >= 0.82 ? "high" : confidence >= 0.66 ? "medium" : "low");
                const rawConfidence = pattern.rawConfidence ?? pattern.confidence;
                const displayConfidence = calibrationMode === "shadow" ? rawConfidence : confidence;
                return (
                  <div
                    key={pattern.kind}
                    className="rounded-lg border border-border/60 bg-surface-muted/40 p-3"
                  >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text">{pattern.name}</p>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs">
                      {confidenceLabel(displayConfidence)} ({Math.round(displayConfidence * 100)}%)
                      {calibrationMode !== "shadow" ? ` · ${band.toUpperCase()}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{pattern.description}</p>
                  {calibrationMode === "dual" ? (
                    <p className="mt-1 text-[11px] text-accent/90">
                      Raw: {Math.round(rawConfidence * 100)}% · Calibrada: {Math.round(confidence * 100)}%
                    </p>
                  ) : null}
                  {calibrationMode !== "shadow" && pattern.calibrationReason ? (
                    <p className="mt-1 text-[11px] text-accent/90">
                      Calibración swing: {pattern.calibrationReason}
                    </p>
                  ) : null}
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                    Lineas: {pattern.lines.length}
                  </div>
                  {(pattern.projection || pattern.stopLoss) && (
                    <div className="mt-2 flex items-center gap-4 text-xs font-medium">
                      {pattern.projection && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted">Meta:</span>
                          <span style={{ color: "#00c074" }}>{pattern.projection}</span>
                        </div>
                      )}
                      {pattern.stopLoss && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted">Stop:</span>
                          <span style={{ color: "#f6465d" }}>{pattern.stopLoss}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })
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
      </div >
    </div >
  );
}
