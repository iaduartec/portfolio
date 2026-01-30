import { LineStyle, type LineWidth, type SeriesMarker, type Time } from "lightweight-charts";

export type CandlePoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type VolumePoint = {
  time: string;
  value: number;
  color: string;
};

export type SwingPoint = {
  index: number;
  time: string;
  price: number;
  type: "high" | "low";
};

export type PatternLine = {
  id: string;
  name: string;
  points: { time: string; value: number }[];
  color: string;
  style?: LineStyle;
  width?: number;
};

export type Pattern = {
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

export type AnalysisResult = {
  candles: CandlePoint[];
  volumes: VolumePoint[];
  patterns: Pattern[];
  support: PatternLine[];
};

export type IndicatorSummary = {
  rsi?: number;
  mfi?: number;
  cmo?: number;
  atr?: number;
  atrPercent?: number;
  vwap?: number;
  ema200?: number;
  macdLine?: number;
  macdSignal?: number;
  macdHist?: number;
  supertrend?: number;
  supertrendDirection?: "bullish" | "bearish";
  ichimokuTenkan?: number;
  ichimokuKijun?: number;
  ichimokuSpanA?: number;
  ichimokuSpanB?: number;
};

export const buildAnalysis = (candles: CandlePoint[], volumes: VolumePoint[]): AnalysisResult => {
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

export const normalizeLineWidth = (value?: number): LineWidth => {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return 2;
};

export const findSwings = (candles: CandlePoint[], window: number): SwingPoint[] => {
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

export const detectDoubleTop = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectDoubleBottom = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectHeadAndShoulders = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectAscendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectDescendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectSymmetricalTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
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

export const detectChannel = (
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

export const detectEngulfing = (
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

export const buildSupportResistance = (candles: CandlePoint[], swings: SwingPoint[]): PatternLine[] => {
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

export const computeSma = (candles: CandlePoint[], period: number) => {
  if (candles.length < period) return [];
  const points: { time: string; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      points.push({ time: candles[i].time, value: sum / period });
    }
  }
  return points;
};

export const computeEma = (candles: CandlePoint[], period: number) => {
  if (candles.length < period) return [];
  const points: { time: string; value: number }[] = [];
  const multiplier = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const close = candles[i].close;
    if (i < period) {
      ema += close;
      if (i === period - 1) {
        ema /= period;
        points.push({ time: candles[i].time, value: ema });
      }
      continue;
    }
    ema = (close - ema) * multiplier + ema;
    points.push({ time: candles[i].time, value: ema });
  }
  return points;
};

export const computeBollingerBands = (candles: CandlePoint[], period: number, multiplier: number) => {
  if (candles.length < period) {
    return { upper: [], middle: [], lower: [] };
  }
  const upper: { time: string; value: number }[] = [];
  const middle: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i += 1) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, candle) => sum + candle.close, 0) / period;
    const variance =
      slice.reduce((sum, candle) => sum + (candle.close - mean) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    upper.push({ time: candles[i].time, value: mean + deviation * multiplier });
    middle.push({ time: candles[i].time, value: mean });
    lower.push({ time: candles[i].time, value: mean - deviation * multiplier });
  }
  return { upper, middle, lower };
};

export const buildVolumeMap = (volumes: VolumePoint[]) => {
  const map = new Map<string, number>();
  volumes.forEach((point) => {
    map.set(point.time, point.value);
  });
  return map;
};

export const computeVwap = (candles: CandlePoint[], volumes: VolumePoint[]) => {
  const volumeMap = buildVolumeMap(volumes);
  const points: { time: string; value: number }[] = [];
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let lastValue: number | null = null;
  candles.forEach((candle) => {
    const volume = volumeMap.get(candle.time) ?? 0;
    if (Number.isFinite(volume) && volume > 0) {
      const typical = (candle.high + candle.low + candle.close) / 3;
      cumulativePV += typical * volume;
      cumulativeVolume += volume;
      if (cumulativeVolume > 0) {
        lastValue = cumulativePV / cumulativeVolume;
      }
    }
    if (lastValue !== null) {
      points.push({ time: candle.time, value: lastValue });
    }
  });
  return points;
};

export const computeAtrSeries = (candles: CandlePoint[], period: number) => {
  if (candles.length <= period) return [];
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    const current = candles[i];
    const prevClose = i > 0 ? candles[i - 1].close : current.close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    trs.push(tr);
  }
  let atr = trs.slice(1, period + 1).reduce((sum, value) => sum + value, 0) / period;
  const points: { time: string; value: number }[] = [];
  for (let i = period; i < candles.length; i += 1) {
    if (i === period) {
      points.push({ time: candles[i].time, value: atr });
      continue;
    }
    atr = (atr * (period - 1) + trs[i]) / period;
    points.push({ time: candles[i].time, value: atr });
  }
  return points;
};

export const computeAtrBands = (
  candles: CandlePoint[],
  atrSeries: { time: string; value: number }[],
  multiplier: number
) => {
  const upper: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];
  const atrMap = new Map(atrSeries.map((point) => [point.time, point.value]));
  candles.forEach((candle) => {
    const atr = atrMap.get(candle.time);
    if (atr === undefined || !Number.isFinite(atr)) return;
    upper.push({ time: candle.time, value: candle.close + atr * multiplier });
    lower.push({ time: candle.time, value: candle.close - atr * multiplier });
  });
  return { upper, lower };
};

export const computeEmaValues = (values: number[], period: number) => {
  const result: Array<number | undefined> = Array.from({ length: values.length }, () => undefined);
  if (values.length < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i += 1) {
    sum += values[i];
  }
  let ema = sum / period;
  result[period - 1] = ema;
  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    ema = (values[i] - ema) * multiplier + ema;
    result[i] = ema;
  }
  return result;
};

export const computeMacd = (candles: CandlePoint[], fast = 12, slow = 26, signal = 9) => {
  const closes = candles.map((candle) => candle.close);
  if (closes.length < slow + signal) {
    return {
      line: [],
      signal: [],
      histogram: [],
      last: { line: undefined, signal: undefined, hist: undefined },
    };
  }
  const emaFast = computeEmaValues(closes, fast);
  const emaSlow = computeEmaValues(closes, slow);
  const line: Array<{ time: string; value: number }> = [];
  const lineValues: Array<number> = [];
  const lineIndices: Array<number> = [];

  for (let i = 0; i < candles.length; i += 1) {
    const fastValue = emaFast[i];
    const slowValue = emaSlow[i];
    if (fastValue === undefined || slowValue === undefined) continue;
    const value = fastValue - slowValue;
    line.push({ time: candles[i].time, value });
    lineValues.push(value);
    lineIndices.push(i);
  }

  const signalValues = computeEmaValues(lineValues, signal);
  const signalLine: Array<{ time: string; value: number }> = [];
  const histogram: Array<{ time: string; value: number }> = [];
  for (let i = 0; i < lineValues.length; i += 1) {
    const signalValue = signalValues[i];
    if (signalValue === undefined) continue;
    const time = candles[lineIndices[i]].time;
    signalLine.push({ time, value: signalValue });
    histogram.push({ time, value: lineValues[i] - signalValue });
  }

  const lastLine = line.length > 0 ? line[line.length - 1]?.value : undefined;
  const lastSignal = signalLine.length > 0 ? signalLine[signalLine.length - 1]?.value : undefined;
  const lastHist = histogram.length > 0 ? histogram[histogram.length - 1]?.value : undefined;

  return {
    line,
    signal: signalLine,
    histogram,
    last: { line: lastLine, signal: lastSignal, hist: lastHist },
  };
};

export const computeSupertrend = (candles: CandlePoint[], period = 10, multiplier = 3) => {
  if (candles.length <= period) {
    return { points: [], last: undefined, direction: undefined } as const;
  }
  const atrSeries = computeAtrSeries(candles, period);
  const atrMap = new Map(atrSeries.map((point) => [point.time, point.value]));

  let prevFinalUpper = 0;
  let prevFinalLower = 0;
  let prevTrend: "bullish" | "bearish" | undefined;
  const points: Array<{ time: string; value: number; trend: "bullish" | "bearish" }> = [];

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const atr = atrMap.get(candle.time);
    if (atr === undefined || !Number.isFinite(atr)) continue;
    const basicUpper = (candle.high + candle.low) / 2 + multiplier * atr;
    const basicLower = (candle.high + candle.low) / 2 - multiplier * atr;

    const prevClose = i > 0 ? candles[i - 1].close : candle.close;
    const finalUpper =
      i === 0 || basicUpper < prevFinalUpper || prevClose > prevFinalUpper
        ? basicUpper
        : prevFinalUpper;
    const finalLower =
      i === 0 || basicLower > prevFinalLower || prevClose < prevFinalLower
        ? basicLower
        : prevFinalLower;

    let trend: "bullish" | "bearish";
    if (!prevTrend) {
      trend = candle.close >= finalUpper ? "bullish" : "bearish";
    } else if (prevTrend === "bearish" && candle.close > finalUpper) {
      trend = "bullish";
    } else if (prevTrend === "bullish" && candle.close < finalLower) {
      trend = "bearish";
    } else {
      trend = prevTrend;
    }

    const supertrend = trend === "bullish" ? finalLower : finalUpper;
    points.push({ time: candle.time, value: supertrend, trend });

    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevTrend = trend;
  }

  const lastPoint = points.length > 0 ? points[points.length - 1] : undefined;
  return {
    points,
    last: lastPoint?.value,
    direction: lastPoint?.trend,
  };
};

export const computeIchimoku = (candles: CandlePoint[]) => {
  const tenkan: { time: string; value: number }[] = [];
  const kijun: { time: string; value: number }[] = [];
  const spanA: { time: string; value: number }[] = [];
  const spanB: { time: string; value: number }[] = [];
  const shift = 26;

  const highest = (start: number, end: number) =>
    candles.slice(start, end + 1).reduce((max, candle) => Math.max(max, candle.high), -Infinity);
  const lowest = (start: number, end: number) =>
    candles.slice(start, end + 1).reduce((min, candle) => Math.min(min, candle.low), Infinity);

  for (let i = 0; i < candles.length; i += 1) {
    if (i >= 8) {
      const max = highest(i - 8, i);
      const min = lowest(i - 8, i);
      tenkan.push({ time: candles[i].time, value: (max + min) / 2 });
    }
    if (i >= 25) {
      const max = highest(i - 25, i);
      const min = lowest(i - 25, i);
      const kijunValue = (max + min) / 2;
      kijun.push({ time: candles[i].time, value: kijunValue });

      const tenkanValue = tenkan[tenkan.length - 1]?.value;
      if (tenkanValue !== undefined && i + shift < candles.length) {
        spanA.push({ time: candles[i + shift].time, value: (tenkanValue + kijunValue) / 2 });
      }
    }
    if (i >= 51 && i + shift < candles.length) {
      const max = highest(i - 51, i);
      const min = lowest(i - 51, i);
      spanB.push({ time: candles[i + shift].time, value: (max + min) / 2 });
    }
  }

  const lastTenkan = tenkan.length > 0 ? tenkan[tenkan.length - 1]?.value : undefined;
  const lastKijun = kijun.length > 0 ? kijun[kijun.length - 1]?.value : undefined;
  const lastSpanA = spanA.length > 0 ? spanA[spanA.length - 1]?.value : undefined;
  const lastSpanB = spanB.length > 0 ? spanB[spanB.length - 1]?.value : undefined;

  return {
    tenkan,
    kijun,
    spanA,
    spanB,
    last: {
      tenkan: lastTenkan,
      kijun: lastKijun,
      spanA: lastSpanA,
      spanB: lastSpanB,
    },
  };
};

export const computeRsi = (candles: CandlePoint[], period: number) => {
  if (candles.length <= period) return undefined;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < candles.length; i += 1) {
    const delta = candles[i].close - candles[i - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

export const computeCmo = (candles: CandlePoint[], period: number) => {
  if (candles.length <= period) return undefined;
  let gains = 0;
  let losses = 0;
  for (let i = candles.length - period; i < candles.length; i += 1) {
    if (i === 0) continue;
    const delta = candles[i].close - candles[i - 1].close;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  const total = gains + losses;
  if (total === 0) return 0;
  return (100 * (gains - losses)) / total;
};

export const computeMfi = (candles: CandlePoint[], volumes: VolumePoint[], period: number) => {
  if (candles.length <= period) return undefined;
  const volumeMap = buildVolumeMap(volumes);
  let positiveFlow = 0;
  let negativeFlow = 0;
  for (let i = candles.length - period; i < candles.length; i += 1) {
    if (i === 0) continue;
    const prev = candles[i - 1];
    const current = candles[i];
    const prevTypical = (prev.high + prev.low + prev.close) / 3;
    const typical = (current.high + current.low + current.close) / 3;
    const volume = volumeMap.get(current.time) ?? 0;
    if (!Number.isFinite(volume) || volume <= 0) continue;
    const flow = typical * volume;
    if (typical >= prevTypical) positiveFlow += flow;
    else negativeFlow += flow;
  }
  if (positiveFlow + negativeFlow === 0) return undefined;
  const moneyRatio = negativeFlow === 0 ? Number.POSITIVE_INFINITY : positiveFlow / negativeFlow;
  return 100 - 100 / (1 + moneyRatio);
};

export const buildPivotLevels = (candles: CandlePoint[]) => {
  if (candles.length === 0) return [];
  const last = candles[candles.length - 1];
  const firstTime = candles[0].time;
  const lastTime = last.time;
  const pivot = (last.high + last.low + last.close) / 3;
  const r1 = 2 * pivot - last.low;
  const s1 = 2 * pivot - last.high;
  const r2 = pivot + (last.high - last.low);
  const s2 = pivot - (last.high - last.low);
  const r3 = last.high + 2 * (pivot - last.low);
  const s3 = last.low - 2 * (last.high - pivot);
  const levels = [
    { id: "pivot", name: "Pivot", value: pivot, color: "rgba(255,255,255,0.35)" },
    { id: "r1", name: "R1", value: r1, color: "rgba(0,192,116,0.5)" },
    { id: "r2", name: "R2", value: r2, color: "rgba(0,192,116,0.35)" },
    { id: "r3", name: "R3", value: r3, color: "rgba(0,192,116,0.25)" },
    { id: "s1", name: "S1", value: s1, color: "rgba(246,70,93,0.5)" },
    { id: "s2", name: "S2", value: s2, color: "rgba(246,70,93,0.35)" },
    { id: "s3", name: "S3", value: s3, color: "rgba(246,70,93,0.25)" },
  ];
  return levels.map((level) => ({
    id: `pivot-${level.id}`,
    name: level.name,
    points: [
      { time: firstTime, value: level.value },
      { time: lastTime, value: level.value },
    ],
    color: level.color,
    style: LineStyle.Dashed,
    width: 1,
  }));
};

export const confidenceLabel = (value: number) => {
  if (value >= 0.9) return "Alta";
  if (value >= 0.75) return "Media";
  return "Baja";
};
