import { computeEmaValues, type CandlePoint } from "@/lib/technical-analysis";

export type PullbackHoldingContext = {
  averageBuyPrice: number;
  quantity?: number;
};

export type PullbackPlaybook = {
  currentPrice: number;
  regime: "BULLISH" | "NEUTRAL" | "WEAK";
  regimeLabel: string;
  swingLow: number;
  swingHigh: number;
  fib382: number;
  fib50: number;
  fib618: number;
  stagedEntryAverage: number;
  zoneLabel: string;
  tranches: Array<{
    label: string;
    allocationPct: number;
    price: number;
  }>;
  positionContext?: {
    averageBuyPrice: number;
    currentPnlPct: number;
    vsPlaybookPct: number;
    equalSizeAveragePrice: number;
  };
};

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const pickRecentUpswing = (candles: CandlePoint[]) => {
  if (candles.length < 20) {
    return null;
  }

  let lowestLow = candles[0].low;
  let lowestIndex = 0;
  let bestLow = candles[0].low;
  let bestHigh = candles[0].high;
  let bestRange = bestHigh - bestLow;

  for (let index = 1; index < candles.length; index += 1) {
    const previous = candles[index - 1];
    if (previous.low < lowestLow) {
      lowestLow = previous.low;
      lowestIndex = index - 1;
    }

    const range = candles[index].high - lowestLow;
    if (index > lowestIndex && range > bestRange) {
      bestRange = range;
      bestLow = lowestLow;
      bestHigh = candles[index].high;
    }
  }

  if (!Number.isFinite(bestRange) || bestRange <= 0) {
    return null;
  }

  return { low: bestLow, high: bestHigh };
};

export const buildPullbackPlaybook = (
  candles: CandlePoint[],
  holding?: PullbackHoldingContext,
): PullbackPlaybook | null => {
  if (candles.length < 60) {
    return null;
  }

  const window = candles.slice(-120);
  const upswing = pickRecentUpswing(window);
  if (!upswing) {
    return null;
  }

  const closes = candles.map((candle) => candle.close);
  const ema50 = computeEmaValues(closes, 50);
  const ema200 = computeEmaValues(closes, 200);
  const currentPrice = closes[closes.length - 1];
  const latestEma50 = ema50[ema50.length - 1];
  const latestEma200 = ema200[ema200.length - 1];
  const range = upswing.high - upswing.low;

  if (!Number.isFinite(currentPrice) || !Number.isFinite(range) || range <= 0) {
    return null;
  }

  const fib382 = upswing.high - range * 0.382;
  const fib50 = upswing.high - range * 0.5;
  const fib618 = upswing.high - range * 0.618;

  let regime: PullbackPlaybook["regime"] = "NEUTRAL";
  let regimeLabel = "Sesgo mixto";
  if (
    latestEma50 !== undefined &&
    latestEma200 !== undefined &&
    currentPrice > latestEma50 &&
    latestEma50 >= latestEma200
  ) {
    regime = "BULLISH";
    regimeLabel = "Tendencia alcista";
  } else if (latestEma50 !== undefined && currentPrice < latestEma50) {
    regime = "WEAK";
    regimeLabel = "Tendencia debilitada";
  }

  const tranches =
    regime === "BULLISH"
      ? [
          { label: "Tramo 1", allocationPct: 40, price: fib382 },
          { label: "Tramo 2", allocationPct: 35, price: fib50 },
          { label: "Tramo 3", allocationPct: 25, price: fib618 },
        ]
      : regime === "WEAK"
        ? [
            { label: "Tramo 1", allocationPct: 20, price: fib382 },
            { label: "Tramo 2", allocationPct: 30, price: fib50 },
            { label: "Tramo 3", allocationPct: 50, price: fib618 },
          ]
        : [
            { label: "Tramo 1", allocationPct: 30, price: fib382 },
            { label: "Tramo 2", allocationPct: 35, price: fib50 },
            { label: "Tramo 3", allocationPct: 35, price: fib618 },
          ];

  let zoneLabel = "Precio por encima del pullback ideal";
  if (currentPrice <= fib382 && currentPrice >= fib50) {
    zoneLabel = "Pullback superficial";
  } else if (currentPrice < fib50 && currentPrice >= fib618) {
    zoneLabel = "Zona tecnica de acumulacion";
  } else if (currentPrice < fib618) {
    zoneLabel = "Debajo del 61.8%, exige prudencia";
  }

  const stagedEntryAverage =
    tranches.reduce((sum, tranche) => sum + tranche.price * (tranche.allocationPct / 100), 0);

  const positionContext =
    holding && holding.averageBuyPrice > 0
      ? {
          averageBuyPrice: roundTo(holding.averageBuyPrice),
          currentPnlPct: roundTo(((currentPrice - holding.averageBuyPrice) / holding.averageBuyPrice) * 100),
          vsPlaybookPct: roundTo(((holding.averageBuyPrice - stagedEntryAverage) / stagedEntryAverage) * 100),
          equalSizeAveragePrice: roundTo((holding.averageBuyPrice + stagedEntryAverage) / 2),
        }
      : undefined;

  return {
    currentPrice: roundTo(currentPrice),
    regime,
    regimeLabel,
    swingLow: roundTo(upswing.low),
    swingHigh: roundTo(upswing.high),
    fib382: roundTo(fib382),
    fib50: roundTo(fib50),
    fib618: roundTo(fib618),
    stagedEntryAverage: roundTo(stagedEntryAverage),
    zoneLabel,
    tranches: tranches.map((tranche) => ({
      ...tranche,
      price: roundTo(tranche.price),
    })),
    positionContext,
  };
};
