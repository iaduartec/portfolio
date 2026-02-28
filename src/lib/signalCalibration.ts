import type { CandlePoint, Pattern } from "@/lib/technical-analysis";

export type SwingRegimeTrend = "bullish" | "bearish" | "sideways";
export type SwingRegimeVolatility = "low" | "medium" | "high";
export type SwingRegimeNoise = "clean" | "mixed" | "noisy";
export type ConfidenceBand = "high" | "medium" | "low";

export type SwingRegime = {
  trend: SwingRegimeTrend;
  volatility: SwingRegimeVolatility;
  noise: SwingRegimeNoise;
};

type PatternDirection = "bullish" | "bearish" | "neutral";

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

const reversalKinds = new Set<Pattern["kind"]>([
  "double-top",
  "double-bottom",
  "triple-top",
  "triple-bottom",
  "head-shoulders",
  "inverse-head-shoulders",
  "bullish-engulfing",
  "bearish-engulfing",
  "hammer",
  "inverted-hammer",
  "hanging-man",
  "shooting-star",
]);

const continuationKinds = new Set<Pattern["kind"]>([
  "bullish-flag",
  "bearish-flag",
  "bullish-pennant",
  "bearish-pennant",
  "ascending-triangle",
  "descending-triangle",
  "symmetrical-triangle",
  "rising-channel",
  "falling-channel",
  "cup-handle",
  "rectangle",
]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getDirectionFromKind = (kind: Pattern["kind"]): PatternDirection => {
  if (bullishKinds.has(kind)) return "bullish";
  if (bearishKinds.has(kind)) return "bearish";
  return "neutral";
};

const getBand = (confidence: number): ConfidenceBand => {
  if (confidence >= 0.82) return "high";
  if (confidence >= 0.66) return "medium";
  return "low";
};

const getDynamicCeiling = (kind: Pattern["kind"], regime: SwingRegime) => {
  if (reversalKinds.has(kind)) {
    if (regime.volatility === "high") return 0.86;
    if (regime.volatility === "medium") return 0.9;
    return 0.94;
  }
  if (continuationKinds.has(kind)) {
    if (regime.volatility === "high") return 0.9;
    if (regime.volatility === "medium") return 0.93;
    return 0.96;
  }
  return regime.volatility === "high" ? 0.88 : 0.92;
};

const getRangePercent = (candle: CandlePoint) => {
  if (!Number.isFinite(candle.close) || candle.close === 0) return 0;
  return Math.abs(candle.high - candle.low) / Math.abs(candle.close);
};

const getNoiseRatio = (candles: CandlePoint[]) => {
  if (candles.length < 6) return 0.5;
  const deltas = candles
    .slice(1)
    .map((candle, idx) => candle.close - candles[idx].close)
    .filter((delta) => Number.isFinite(delta) && delta !== 0);
  if (deltas.length < 3) return 0.5;

  let flips = 0;
  for (let i = 1; i < deltas.length; i += 1) {
    if ((deltas[i] > 0) !== (deltas[i - 1] > 0)) flips += 1;
  }
  return flips / (deltas.length - 1);
};

export const detectSwingRegime = (candles: CandlePoint[]): SwingRegime => {
  if (candles.length < 12) {
    return { trend: "sideways", volatility: "medium", noise: "mixed" };
  }

  const recent = candles.slice(-30);
  const firstClose = recent[0].close;
  const lastClose = recent[recent.length - 1].close;
  const returnPct = firstClose !== 0 ? (lastClose - firstClose) / Math.abs(firstClose) : 0;

  const trend: SwingRegimeTrend =
    returnPct > 0.06 ? "bullish" : returnPct < -0.06 ? "bearish" : "sideways";

  const avgRangePct =
    recent.reduce((sum, candle) => sum + getRangePercent(candle), 0) / Math.max(recent.length, 1);
  const volatility: SwingRegimeVolatility =
    avgRangePct > 0.035 ? "high" : avgRangePct > 0.018 ? "medium" : "low";

  const noiseRatio = getNoiseRatio(recent);
  const noise: SwingRegimeNoise =
    noiseRatio > 0.58 ? "noisy" : noiseRatio < 0.35 ? "clean" : "mixed";

  return { trend, volatility, noise };
};

const calculateRiskReward = (entry: number, target?: number, stopLoss?: number) => {
  if (!Number.isFinite(entry) || target === undefined || stopLoss === undefined) return undefined;
  if (!Number.isFinite(target) || !Number.isFinite(stopLoss)) return undefined;
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 1e-6) return undefined;
  const reward = Math.abs(target - entry);
  return reward / risk;
};

const calibratePattern = (pattern: Pattern, candles: CandlePoint[], regime: SwingRegime): Pattern => {
  const direction = getDirectionFromKind(pattern.kind);
  const isReversal = reversalKinds.has(pattern.kind);
  const isContinuation = continuationKinds.has(pattern.kind);

  let adjustment = 0;
  const reasons: string[] = [];

  if (regime.volatility === "high") {
    if (isReversal) {
      adjustment -= 0.09;
      reasons.push("volatilidad alta penaliza reversión");
    } else if (isContinuation) {
      adjustment -= 0.03;
      reasons.push("volatilidad alta reduce continuidad");
    }
  } else if (regime.volatility === "low" && isContinuation) {
    adjustment += 0.05;
    reasons.push("volatilidad baja favorece continuidad");
  }

  if (regime.noise === "noisy") {
    adjustment -= 0.06;
    reasons.push("mercado ruidoso");
  } else if (regime.noise === "clean") {
    adjustment += 0.03;
    reasons.push("estructura de precio limpia");
  }

  if (direction !== "neutral") {
    const aligned =
      (direction === "bullish" && regime.trend === "bullish") ||
      (direction === "bearish" && regime.trend === "bearish");
    const conflicting =
      (direction === "bullish" && regime.trend === "bearish") ||
      (direction === "bearish" && regime.trend === "bullish");
    if (aligned) {
      adjustment += 0.06;
      reasons.push("alineado con tendencia swing");
    } else if (conflicting) {
      adjustment -= 0.08;
      reasons.push("en contra de tendencia swing");
    }
  }

  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const riskReward = calculateRiskReward(lastPrice, pattern.projection, pattern.stopLoss);
  if (riskReward !== undefined) {
    if (riskReward < 1) {
      adjustment -= 0.06;
      reasons.push("riesgo/beneficio débil");
    } else if (riskReward >= 2) {
      adjustment += 0.05;
      reasons.push("riesgo/beneficio favorable");
    }
  }

  const rawConfidence = pattern.confidence;
  const ceiling = getDynamicCeiling(pattern.kind, regime);
  const calibratedConfidence = clamp(rawConfidence + adjustment, 0.45, ceiling);
  const confidenceBand = getBand(calibratedConfidence);
  const calibrationReason =
    reasons.length > 0 ? reasons.slice(0, 3).join(" · ") : "calibración base por régimen";

  return {
    ...pattern,
    rawConfidence,
    confidence: calibratedConfidence,
    calibratedConfidence,
    confidenceBand,
    calibrationReason,
  };
};

export const calibratePatternsForSwing = (patterns: Pattern[], candles: CandlePoint[]) => {
  if (patterns.length === 0) return patterns;
  const regime = detectSwingRegime(candles);
  return patterns.map((pattern) => calibratePattern(pattern, candles, regime));
};
