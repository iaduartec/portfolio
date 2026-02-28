import { LineStyle } from "lightweight-charts";
import type { PatternLine, IndicatorSummary, CandlePoint, VolumePoint } from "@/lib/technical-analysis";
import {
  computeSma,
  computeEma,
  computeBollingerBands,
  computeVwap,
  computeAtrSeries,
  computeAtrBands,
  computeMacd,
  computeSupertrend,
  computeIchimoku,
  computeRsi,
  computeMfi,
  computeCmo,
  buildPivotLevels,
} from "@/lib/technical-analysis";

export type IndicatorComputationFilters = {
  sma20: boolean;
  ema50: boolean;
  ema200: boolean;
  bollinger: boolean;
  vwap: boolean;
  macd: boolean;
  atrBands: boolean;
  supertrend: boolean;
  ichimoku: boolean;
  pivots: boolean;
};

export type IndicatorBundle = {
  lines: PatternLine[];
  pivotLines: PatternLine[];
  summary: IndicatorSummary;
};

export type IndicatorEngineMetrics = {
  durationMs: number;
  mode: "cache-hit" | "full";
};

export const EMPTY_INDICATOR_BUNDLE: IndicatorBundle = {
  lines: [],
  pivotLines: [],
  summary: {},
};

export const computeIndicatorBundle = ({
  candles,
  volumes,
  indicatorFilters,
}: {
  candles: CandlePoint[];
  volumes: VolumePoint[];
  indicatorFilters: IndicatorComputationFilters;
}): IndicatorBundle => {
  const lines: PatternLine[] = [];

  if (candles.length === 0) {
    return EMPTY_INDICATOR_BUNDLE;
  }

  if (indicatorFilters.sma20) {
    const points = computeSma(candles, 20);
    if (points.length > 0) {
      lines.push({
        id: "sma-20",
        name: "SMA 20",
        points,
        color: "rgba(122,162,247,0.9)",
        style: LineStyle.Solid,
        width: 2,
      });
    }
  }

  if (indicatorFilters.ema50) {
    const points = computeEma(candles, 50);
    if (points.length > 0) {
      lines.push({
        id: "ema-50",
        name: "EMA 50",
        points,
        color: "rgba(255,184,108,0.9)",
        style: LineStyle.Solid,
        width: 2,
      });
    }
  }

  let ema200Last: number | undefined;
  if (indicatorFilters.ema200) {
    const points = computeEma(candles, 200);
    if (points.length > 0) {
      ema200Last = points[points.length - 1]?.value;
      lines.push({
        id: "ema-200",
        name: "EMA 200",
        points,
        color: "rgba(243,139,168,0.9)",
        style: LineStyle.Solid,
        width: 2,
      });
    }
  }

  if (indicatorFilters.bollinger) {
    const { upper, middle, lower } = computeBollingerBands(candles, 20, 2);
    if (upper.length > 0) {
      lines.push(
        {
          id: "bb-upper",
          name: "Bollinger sup.",
          points: upper,
          color: "rgba(170,170,170,0.6)",
          style: LineStyle.Dotted,
          width: 1,
        },
        {
          id: "bb-middle",
          name: "Bollinger media",
          points: middle,
          color: "rgba(170,170,170,0.35)",
          style: LineStyle.Dashed,
          width: 1,
        },
        {
          id: "bb-lower",
          name: "Bollinger inf.",
          points: lower,
          color: "rgba(170,170,170,0.6)",
          style: LineStyle.Dotted,
          width: 1,
        }
      );
    }
  }

  let vwapLast: number | undefined;
  if (indicatorFilters.vwap) {
    const points = computeVwap(candles, volumes);
    if (points.length > 0) {
      vwapLast = points[points.length - 1]?.value;
      lines.push({
        id: "vwap",
        name: "VWAP",
        points,
        color: "rgba(64,191,255,0.85)",
        style: LineStyle.Solid,
        width: 2,
      });
    }
  }

  const atrSeries = computeAtrSeries(candles, 14);
  const atrLast = atrSeries.length > 0 ? atrSeries[atrSeries.length - 1]?.value : undefined;
  if (indicatorFilters.atrBands && atrSeries.length > 0) {
    const { upper, lower } = computeAtrBands(candles, atrSeries, 2);
    if (upper.length > 0) {
      lines.push(
        {
          id: "atr-upper",
          name: "ATR banda sup.",
          points: upper,
          color: "rgba(0,192,116,0.4)",
          style: LineStyle.Dashed,
          width: 1,
        },
        {
          id: "atr-lower",
          name: "ATR banda inf.",
          points: lower,
          color: "rgba(246,70,93,0.4)",
          style: LineStyle.Dashed,
          width: 1,
        }
      );
    }
  }

  let supertrendValue: number | undefined;
  let supertrendDirection: "bullish" | "bearish" | undefined;
  if (indicatorFilters.supertrend) {
    const supertrend = computeSupertrend(candles, 10, 3);
    supertrendValue = supertrend.last;
    supertrendDirection = supertrend.direction;
    if (supertrend.points.length > 0) {
      lines.push({
        id: "supertrend",
        name: "Supertrend",
        points: supertrend.points.map((point) => ({ time: point.time, value: point.value })),
        color:
          supertrend.direction === "bullish"
            ? "rgba(0,192,116,0.75)"
            : "rgba(246,70,93,0.75)",
        style: LineStyle.Solid,
        width: 2,
      });
    }
  }

  let ichimokuSummary: {
    tenkan?: number;
    kijun?: number;
    spanA?: number;
    spanB?: number;
  } = {};
  if (indicatorFilters.ichimoku) {
    const ichimoku = computeIchimoku(candles);
    ichimokuSummary = ichimoku.last;
    if (ichimoku.tenkan.length > 0) {
      lines.push({
        id: "ichimoku-tenkan",
        name: "Ichimoku Tenkan",
        points: ichimoku.tenkan,
        color: "rgba(94,129,172,0.9)",
        style: LineStyle.Solid,
        width: 1,
      });
    }
    if (ichimoku.kijun.length > 0) {
      lines.push({
        id: "ichimoku-kijun",
        name: "Ichimoku Kijun",
        points: ichimoku.kijun,
        color: "rgba(235,203,139,0.9)",
        style: LineStyle.Solid,
        width: 1,
      });
    }
    if (ichimoku.spanA.length > 0) {
      lines.push({
        id: "ichimoku-span-a",
        name: "Ichimoku Span A",
        points: ichimoku.spanA,
        color: "rgba(0,192,116,0.45)",
        style: LineStyle.Dotted,
        width: 1,
      });
    }
    if (ichimoku.spanB.length > 0) {
      lines.push({
        id: "ichimoku-span-b",
        name: "Ichimoku Span B",
        points: ichimoku.spanB,
        color: "rgba(246,70,93,0.45)",
        style: LineStyle.Dotted,
        width: 1,
      });
    }
  }

  const macd = indicatorFilters.macd ? computeMacd(candles) : null;
  const pivotLines = indicatorFilters.pivots ? buildPivotLevels(candles) : [];
  const lastClose = candles[candles.length - 1]?.close;
  const summary: IndicatorSummary = {
    rsi: computeRsi(candles, 14),
    mfi: computeMfi(candles, volumes, 14),
    cmo: computeCmo(candles, 14),
    atr: atrLast,
    atrPercent: atrLast && lastClose ? Number(((atrLast / lastClose) * 100).toFixed(2)) : undefined,
    vwap: vwapLast,
    ema200: ema200Last,
    macdLine: macd?.last.line,
    macdSignal: macd?.last.signal,
    macdHist: macd?.last.hist,
    supertrend: supertrendValue,
    supertrendDirection,
    ichimokuTenkan: ichimokuSummary.tenkan,
    ichimokuKijun: ichimokuSummary.kijun,
    ichimokuSpanA: ichimokuSummary.spanA,
    ichimokuSpanB: ichimokuSummary.spanB,
  };

  return { lines, pivotLines, summary };
};

export const computeIndicatorBundleWithMetrics = ({
  candles,
  volumes,
  indicatorFilters,
}: {
  candles: CandlePoint[];
  volumes: VolumePoint[];
  indicatorFilters: IndicatorComputationFilters;
}): { indicatorBundle: IndicatorBundle; indicatorMetrics: IndicatorEngineMetrics } => {
  const started = performance.now();
  const indicatorBundle = computeIndicatorBundle({ candles, volumes, indicatorFilters });
  return {
    indicatorBundle,
    indicatorMetrics: {
      mode: "full",
      durationMs: Number((performance.now() - started).toFixed(2)),
    },
  };
};
