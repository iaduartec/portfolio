import { computeEmaValues, type CandlePoint } from "@/lib/technical-analysis";

export type StrategyBacktestId = "buy-hold" | "trend-swing" | "breakout" | "mean-reversion";

export type StrategyBacktestResult = {
  id: StrategyBacktestId;
  name: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
  volatilityPct: number;
  sharpeLike: number | null;
  tradeCount: number;
  hitRatePct: number | null;
  equityCurve: Array<{ time: string; value: number }>;
  benchmarkReturnPct: number;
};

type TradeRecord = {
  entryPrice: number;
  exitPrice: number;
};

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const computeSmaValues = (values: number[], period: number) => {
  const result: Array<number | undefined> = Array.from({ length: values.length }, () => undefined);
  if (values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
};

const computeRsiValues = (values: number[], period: number) => {
  const result: Array<number | undefined> = Array.from({ length: values.length }, () => undefined);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
};

const computeVolatilityPct = (returns: number[]) => {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

const computeMaxDrawdownPct = (equityCurve: Array<{ value: number }>) => {
  let peak = equityCurve[0]?.value ?? 1;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.value);
    if (peak <= 0) continue;
    const drawdown = ((point.value - peak) / peak) * 100;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }

  return Math.abs(maxDrawdown);
};

const computeTradeStats = (trades: TradeRecord[]) => {
  if (trades.length === 0) {
    return {
      tradeCount: 0,
      hitRatePct: null,
    };
  }

  const winners = trades.filter((trade) => trade.exitPrice > trade.entryPrice).length;
  return {
    tradeCount: trades.length,
    hitRatePct: roundTo((winners / trades.length) * 100),
  };
};

const simulateStrategy = (
  candles: CandlePoint[],
  shouldEnter: (_index: number) => boolean,
  shouldExit: (_index: number) => boolean,
): { equityCurve: Array<{ time: string; value: number }>; trades: TradeRecord[] } => {
  const closes = candles.map((candle) => candle.close);
  const equityCurve: Array<{ time: string; value: number }> = [];
  const trades: TradeRecord[] = [];
  let equity = 1;
  let positionUnits = 0;
  let entryPrice = 0;

  for (let i = 0; i < candles.length; i += 1) {
    const close = closes[i];

    if (positionUnits === 0 && shouldEnter(i)) {
      positionUnits = equity / close;
      entryPrice = close;
      equity = 0;
    } else if (positionUnits > 0 && shouldExit(i)) {
      const exitValue = positionUnits * close;
      equity = exitValue;
      trades.push({ entryPrice, exitPrice: close });
      positionUnits = 0;
      entryPrice = 0;
    }

    const markToMarket = positionUnits > 0 ? positionUnits * close : equity;
    equityCurve.push({ time: candles[i].time, value: markToMarket });
  }

  if (positionUnits > 0) {
    const finalClose = closes[closes.length - 1];
    trades.push({ entryPrice, exitPrice: finalClose });
    equity = positionUnits * finalClose;
    equityCurve[equityCurve.length - 1] = {
      time: candles[candles.length - 1].time,
      value: equity,
    };
  }

  return { equityCurve, trades };
};

const buildBenchmarkCurve = (candles: CandlePoint[]) => {
  if (candles.length === 0) return [] as Array<{ time: string; value: number }>;
  const firstClose = candles[0].close;
  return candles.map((candle) => ({
    time: candle.time,
    value: firstClose > 0 ? candle.close / firstClose : 1,
  }));
};

export const runStrategyBacktest = (
  candles: CandlePoint[],
  strategyId: StrategyBacktestId,
): StrategyBacktestResult | null => {
  if (candles.length < 60) return null;

  const closes = candles.map((candle) => candle.close);
  const ema50 = computeEmaValues(closes, 50);
  const ema200 = computeEmaValues(closes, 200);
  const sma20 = computeSmaValues(closes, 20);
  const rsi14 = computeRsiValues(closes, 14);
  const benchmarkCurve = buildBenchmarkCurve(candles);
  const benchmarkReturnPct =
    benchmarkCurve.length > 0
      ? roundTo((benchmarkCurve[benchmarkCurve.length - 1].value - 1) * 100)
      : 0;

  const strategyDefinitions: Record<
    StrategyBacktestId,
    {
      name: string;
      shouldEnter: (_index: number) => boolean;
      shouldExit: (_index: number) => boolean;
    }
  > = {
    "buy-hold": {
      name: "Buy & Hold",
      shouldEnter: (index) => index === 0,
      shouldExit: (_index) => false,
    },
    "trend-swing": {
      name: "Trend Swing",
      shouldEnter: (index) =>
        Boolean(
          ema50[index] !== undefined &&
            ema200[index] !== undefined &&
            ema50[index]! > ema200[index]! &&
            closes[index] > ema50[index]!,
        ),
      shouldExit: (index) =>
        Boolean(
          ema50[index] !== undefined &&
            ema200[index] !== undefined &&
            (ema50[index]! < ema200[index]! || closes[index] < ema50[index]!),
        ),
    },
    breakout: {
      name: "Breakout",
      shouldEnter: (index) => {
        if (index < 20 || ema50[index] === undefined) return false;
        const previousHigh = Math.max(...candles.slice(index - 20, index).map((candle) => candle.high));
        return closes[index] > previousHigh && closes[index] > ema50[index]!;
      },
      shouldExit: (index) => {
        if (index < 10 || ema50[index] === undefined) return false;
        const recentLow = Math.min(...candles.slice(index - 10, index).map((candle) => candle.low));
        return closes[index] < ema50[index]! || closes[index] < recentLow;
      },
    },
    "mean-reversion": {
      name: "Mean Reversion",
      shouldEnter: (index) =>
        Boolean(
          sma20[index] !== undefined &&
            rsi14[index] !== undefined &&
            rsi14[index]! < 30 &&
            closes[index] < sma20[index]! * 0.98,
        ),
      shouldExit: (index) =>
        Boolean(
          sma20[index] !== undefined &&
            rsi14[index] !== undefined &&
            (rsi14[index]! > 55 || closes[index] >= sma20[index]!),
        ),
    },
  };

  const definition = strategyDefinitions[strategyId];
  const { equityCurve, trades } = simulateStrategy(candles, definition.shouldEnter, definition.shouldExit);
  const returns = equityCurve
    .map((point, index) => {
      if (index === 0) return null;
      const previous = equityCurve[index - 1].value;
      if (!Number.isFinite(previous) || previous <= 0) return null;
      return point.value / previous - 1;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  const finalEquity = equityCurve[equityCurve.length - 1]?.value ?? 1;
  const totalReturnPct = (finalEquity - 1) * 100;
  const volatilityPct = computeVolatilityPct(returns);
  const meanDailyReturn = returns.length > 0 ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const sharpeLike =
    volatilityPct > 0 ? roundTo((meanDailyReturn * 252) / (volatilityPct / 100), 2) : null;
  const tradeStats = computeTradeStats(trades);

  return {
    id: strategyId,
    name: definition.name,
    totalReturnPct: roundTo(totalReturnPct),
    maxDrawdownPct: roundTo(computeMaxDrawdownPct(equityCurve)),
    volatilityPct: roundTo(volatilityPct),
    sharpeLike,
    tradeCount: tradeStats.tradeCount,
    hitRatePct: tradeStats.hitRatePct,
    equityCurve: equityCurve.map((point) => ({ time: point.time, value: roundTo(point.value, 4) })),
    benchmarkReturnPct,
  };
};
