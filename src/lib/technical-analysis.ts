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
    | "triple-top"
    | "triple-bottom"
    | "head-shoulders"
    | "inverse-head-shoulders"
    | "ascending-triangle"
    | "descending-triangle"
    | "symmetrical-triangle"
    | "rising-wedge"
    | "falling-wedge"
    | "bullish-flag"
    | "bearish-flag"
    | "bullish-pennant"
    | "bearish-pennant"
    | "rectangle"
    | "cup-handle"
    | "rising-channel"
    | "falling-channel"
    | "bullish-engulfing"
    | "bearish-engulfing"
    | "doji"
    | "hammer"
    | "hanging-man"
    | "shooting-star"
    | "inverted-hammer";
  name: string;
  description: string;
  confidence: number;
  lines: PatternLine[];
  markers: SeriesMarker<Time>[];
  projection?: number; // Price target
  stopLoss?: number;   // Invalidation level
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

// (buildAnalysis moved to end of file to fix hoisting issues)

export const normalizeLineWidth = (value?: number): LineWidth => {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return 2;
};

export const findSwings = (candles: CandlePoint[], window: number = 8): SwingPoint[] => {
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

// Helper: Check trend before a pattern
const checkTrend = (candles: CandlePoint[], endIndex: number, duration: number, direction: "up" | "down"): boolean => {
  const startIndex = Math.max(0, endIndex - duration);
  if (endIndex - startIndex < duration / 2) return false; // Not enough data

  const startPrice = candles[startIndex].close;
  const endPrice = candles[endIndex].close;

  if (direction === "up") return endPrice > startPrice * 1.05; // At least 5% gain
  return endPrice < startPrice * 0.95; // At least 5% drop
};

export const detectDoubleTop = (candles: CandlePoint[], swings: SwingPoint[], _volumes?: VolumePoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");

  // Requisitos: tendencia previa, 2 máximos similares, valle intermedio claro
  // Formación típica: 15-120 velas
  for (let i = 0; i < highs.length - 1; i += 1) {
    for (let j = i + 1; j < highs.length; j += 1) {
      const left = highs[i];
      const right = highs[j];

      // Formación debe tener entre 15-120 velas
      const formationLength = right.index - left.index;
      if (formationLength < 15 || formationLength > 120) continue;

      const avg = (left.price + right.price) / 2;
      const diff = Math.abs(left.price - right.price) / avg;

      // Los dos máximos deben ser similares (máx 2% diferencia)
      if (diff > 0.02) continue;

      // Encontrar el valle intermedio (punto más bajo entre los dos picos)
      const valleyData = candles.slice(left.index, right.index + 1).reduce(
        (acc, c, idx) => (c.low < acc.price ? { price: c.low, idx: left.index + idx } : acc),
        { price: Number.POSITIVE_INFINITY, idx: left.index }
      );
      const valley = valleyData.price;
      const valleyTime = candles[valleyData.idx].time;

      // Valle intermedio debe ser significativo (retroceso mínimo 3%)
      const height = avg - valley;
      const retracement = height / avg;
      if (retracement < 0.03) continue;

      // REQUISITO: Tendencia previa alcista clara
      if (!checkTrend(candles, left.index, Math.min(40, left.index), "up")) continue;

      // INVALIDACIÓN: No debe haber un máximo mayor entre los dos picos
      const highestIntermediate = Math.max(...candles.slice(left.index + 1, right.index).map(c => c.high));
      const patternMax = Math.max(left.price, right.price);
      if (highestIntermediate > patternMax * 1.005) continue;

      // INVALIDACIÓN: Si precio hizo nuevos máximos después del patrón
      const postPatternCandles = candles.slice(right.index);
      if (postPatternCandles.length > 3) {
        const postPatternHigh = Math.max(...postPatternCandles.map(c => c.high));
        if (postPatternHigh > patternMax * 1.01) continue;
      }

      const lastPrice = candles[candles.length - 1].close;
      // Gatillo: cierre rompiendo el valle (neckline)
      const isTriggered = lastPrice < valley;
      // Proyección: altura del patrón proyectada desde la ruptura
      const projection = valley - height;
      // Stop: por encima del 2º techo
      const stopLoss = right.price * 1.01;

      return {
        kind: "double-top",
        name: isTriggered ? "Doble Techo (Confirmado)" : "Doble Techo",
        description: `Reversión bajista. ${isTriggered ? "Valle roto." : "Esperar ruptura del valle."} Objetivo: ${projection.toFixed(2)}`,
        confidence: isTriggered ? 0.92 : 0.80,
        markers: [
          { time: left.time, position: "aboveBar", color: "#f6c343", shape: "circle", text: "DT 1" },
          { time: right.time, position: "aboveBar", color: "#f6c343", shape: "circle", text: "DT 2" },
        ],
        projection: Number(projection.toFixed(2)),
        stopLoss: Number(stopLoss.toFixed(2)),
        lines: [
          {
            id: "double-top-peak",
            name: "Resistencia (Techos)",
            points: [
              { time: left.time, value: left.price },
              { time: right.time, value: right.price },
            ],
            color: "rgba(246,195,67,0.95)",
            style: LineStyle.Solid,
            width: 3,
          },
          {
            id: "double-top-neckline",
            name: "Valle (Neckline)",
            points: [
              { time: valleyTime, value: valley },
              { time: candles[candles.length - 1].time, value: isTriggered ? projection : valley },
            ],
            color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(246,109,109,0.6)",
            style: LineStyle.Dashed,
            width: 2,
          },
        ],
      };
    }
  }
  return null;
};

export const detectDoubleBottom = (candles: CandlePoint[], swings: SwingPoint[], _volumes?: VolumePoint[]): Pattern | null => {
  const lows = swings.filter((swing) => swing.type === "low");

  // Requisitos: tendencia previa bajista, 2 mínimos similares, pico intermedio claro
  // Formación típica: 15-120 velas
  for (let i = 0; i < lows.length - 1; i += 1) {
    for (let j = i + 1; j < lows.length; j += 1) {
      const left = lows[i];
      const right = lows[j];

      // Formación debe tener entre 15-120 velas
      const formationLength = right.index - left.index;
      if (formationLength < 15 || formationLength > 120) continue;

      const avg = (left.price + right.price) / 2;
      const diff = Math.abs(left.price - right.price) / avg;

      // Los dos mínimos deben ser similares (máx 2% diferencia)
      if (diff > 0.02) continue;

      // Encontrar el pico intermedio (punto más alto entre los dos suelos)
      const peakData = candles.slice(left.index, right.index + 1).reduce(
        (acc, c, idx) => (c.high > acc.price ? { price: c.high, idx: left.index + idx } : acc),
        { price: Number.NEGATIVE_INFINITY, idx: left.index }
      );
      const peak = peakData.price;
      const peakTime = candles[peakData.idx].time;

      // Pico intermedio debe ser significativo (retroceso mínimo 3%)
      const height = peak - avg;
      const retracement = height / avg;
      if (retracement < 0.03) continue;

      // REQUISITO: Tendencia previa bajista clara
      if (!checkTrend(candles, left.index, Math.min(40, left.index), "down")) continue;

      // INVALIDACIÓN: No debe haber un mínimo menor entre los dos suelos
      const lowestIntermediate = Math.min(...candles.slice(left.index + 1, right.index).map(c => c.low));
      const patternMin = Math.min(left.price, right.price);
      if (lowestIntermediate < patternMin * 0.995) continue;

      // INVALIDACIÓN: Si precio hizo nuevos mínimos después del patrón
      const postPatternCandles = candles.slice(right.index);
      if (postPatternCandles.length > 3) {
        const postPatternLow = Math.min(...postPatternCandles.map(c => c.low));
        if (postPatternLow < patternMin * 0.99) continue;
      }

      const lastPrice = candles[candles.length - 1].close;
      // Gatillo: cierre rompiendo el pico (neckline)
      const isTriggered = lastPrice > peak;
      // Proyección: altura del patrón proyectada desde la ruptura
      const projection = peak + height;
      // Stop: por debajo del 2º suelo
      const stopLoss = right.price * 0.99;

      return {
        kind: "double-bottom",
        name: isTriggered ? "Doble Suelo (Confirmado)" : "Doble Suelo",
        description: `Reversión alcista. ${isTriggered ? "Pico roto." : "Esperar ruptura del pico."} Objetivo: ${projection.toFixed(2)}`,
        confidence: isTriggered ? 0.92 : 0.80,
        markers: [
          { time: left.time, position: "belowBar", color: "#43c6f6", shape: "circle", text: "DB 1" },
          { time: right.time, position: "belowBar", color: "#43c6f6", shape: "circle", text: "DB 2" },
        ],
        projection: Number(projection.toFixed(2)),
        stopLoss: Number(stopLoss.toFixed(2)),
        lines: [
          {
            id: "double-bottom-floor",
            name: "Soporte (Suelos)",
            points: [
              { time: left.time, value: left.price },
              { time: right.time, value: right.price },
            ],
            color: "rgba(67,198,246,0.95)",
            style: LineStyle.Solid,
            width: 3,
          },
          {
            id: "double-bottom-neckline",
            name: "Pico (Neckline)",
            points: [
              { time: peakTime, value: peak },
              { time: candles[candles.length - 1].time, value: isTriggered ? projection : peak },
            ],
            color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.6)",
            style: LineStyle.Dashed,
            width: 2,
          },
        ],
      };
    }
  }
  return null;
};

export const detectHeadAndShoulders = (
  candles: CandlePoint[],
  swings: SwingPoint[],
  volumes: VolumePoint[] = []
): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  const recentWindow = 35;
  const shoulderSymmetry = 0.03;
  const headMinGap = 0.03;
  const necklineDriftMax = 0.04;
  const minHeightRatio = 0.04;
  const minNeckDepth = 0.02;
  const breakThreshold = 0.005;
  const volumeDrop = 0.07;
  const breakoutVolumeBoost = 1.2;
  const volumeMap = volumes.length > 0 ? buildVolumeMap(volumes) : null;
  let bestPattern: { pattern: Pattern; score: number } | null = null;

  const volumeAt = (index: number) =>
    volumeMap?.get(candles[index]?.time ?? "") ?? 0;
  const avgVolumeBetween = (startIndex: number, endIndex: number) => {
    if (!volumeMap) return 0;
    const start = Math.max(0, Math.min(startIndex, endIndex));
    const end = Math.max(0, Math.max(startIndex, endIndex));
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end && i < candles.length; i += 1) {
      const volume = volumeAt(i);
      if (volume > 0) {
        sum += volume;
        count += 1;
      }
    }
    return count > 0 ? sum / count : 0;
  };
  const avgVolumeAround = (index: number, window: number = 3) =>
    avgVolumeBetween(index - window, index + window);

  // 1. Standard Head & Shoulders (Bearish)
  // Requisitos: tendencia previa alcista, 3 picos (cabeza mayor), neckline definida, formación 20-150 velas
  for (let i = 0; i < highs.length - 2; i += 1) {
    const left = highs[i];
    const head = highs[i + 1];
    const right = highs[i + 2];

    // Formación debe tener entre 20-150 velas
    const formationLength = right.index - left.index;
    if (formationLength < 20 || formationLength > 150) continue;

    // Separación mínima entre puntos (al menos 5 velas entre cada uno)
    if (head.index - left.index < 5 || right.index - head.index < 5) continue;

    // Simetría de hombros (máx 3% diferencia)
    const shoulderAvg = (left.price + right.price) / 2;
    if (Math.abs(left.price - right.price) / shoulderAvg > shoulderSymmetry) continue;

    // Cabeza debe ser claramente más alta que el hombro más alto (al menos 3%)
    const maxShoulder = Math.max(left.price, right.price);
    if (head.price < maxShoulder * (1 + headMinGap)) continue;

    // REQUISITO: Tendencia previa alcista clara
    if (!checkTrend(candles, left.index, Math.min(40, left.index), "up")) continue;

    // Encontrar valles entre hombros y cabeza para la neckline
    const valley1Idx = candles
      .slice(left.index, head.index)
      .reduce((minIdx, c, idx) => (c.low < candles[left.index + minIdx].low ? idx : minIdx), 0);
    const valley2Idx = candles
      .slice(head.index, right.index)
      .reduce((minIdx, c, idx) => (c.low < candles[head.index + minIdx].low ? idx : minIdx), 0);

    const valley1Price = candles[left.index + valley1Idx].low;
    const valley2Price = candles[head.index + valley2Idx].low;
    const valley1Time = candles[left.index + valley1Idx].time;
    const valley2Time = candles[head.index + valley2Idx].time;

    // Neckline: línea que conecta los dos valles
    const necklineSlope = (valley2Price - valley1Price) / (head.index + valley2Idx - left.index - valley1Idx);
    const necklineDrift = Math.abs(valley2Price - valley1Price) / shoulderAvg;
    if (necklineDrift > necklineDriftMax) continue;

    const depthLeft = (left.price - valley1Price) / left.price;
    const depthRight = (right.price - valley2Price) / right.price;
    if (depthLeft < minNeckDepth || depthRight < minNeckDepth) continue;

    const leftVol = avgVolumeAround(left.index);
    const headVol = avgVolumeAround(head.index);
    const rightVol = avgVolumeAround(right.index);
    const hasVolume = volumeMap && (leftVol > 0 || headVol > 0 || rightVol > 0);
    if (hasVolume) {
      const volumeDecreasing =
        headVol <= leftVol * (1 - volumeDrop) && rightVol <= headVol * (1 - volumeDrop);
      if (!volumeDecreasing) continue;
    }

    const height = head.price - Math.max(valley1Price, valley2Price);
    if (height <= 0) continue;

    // Altura mínima significativa (al menos 4% del precio)
    if (height / head.price < minHeightRatio) continue;

    const barsSinceRight = candles.length - 1 - right.index;
    if (barsSinceRight > recentWindow) continue;

    const necklineAt = (index: number) =>
      valley1Price + necklineSlope * (index - left.index - valley1Idx);

    const lastPrice = candles[candles.length - 1].close;
    const currentNeckline = necklineAt(candles.length - 1);

    const breakdownIdx = candles
      .slice(right.index)
      .findIndex((c, offset) => c.close < necklineAt(right.index + offset) * (1 - breakThreshold));
    const breakdownIndex = breakdownIdx === -1 ? -1 : right.index + breakdownIdx;

    // Gatillo: cierre rompiendo neckline
    const isTriggered =
      breakdownIdx !== -1 && lastPrice < currentNeckline * (1 - breakThreshold);
    const projection = currentNeckline - height;

    // Stop conservador: sobre el hombro derecho tras pullback
    const stopLoss = right.price * 1.01;

    // INVALIDACIÓN: Si precio hizo nuevos máximos después del patrón
    const postPatternHigh = Math.max(...candles.slice(right.index).map(c => c.high));
    if (postPatternHigh > head.price * 1.01) continue;

    if (hasVolume && isTriggered && breakdownIndex !== -1) {
      const baseline = avgVolumeBetween(Math.max(0, breakdownIndex - 20), breakdownIndex - 1);
      const breakVolume = volumeAt(breakdownIndex);
      if (baseline > 0 && breakVolume < baseline * breakoutVolumeBoost) continue;
    }

    const pattern = {
      kind: "head-shoulders",
      name: isTriggered ? "HCH (Confirmado)" : "Hombro Cabeza Hombro",
      description: `Reversión bajista. ${isTriggered ? "Neckline rota." : "Esperar ruptura de neckline."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.92 : 0.78,
      markers: [
        { time: left.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "H" },
        { time: head.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "C" },
        { time: right.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "H" },
      ],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        {
          id: "hs-neckline",
          name: "Neckline",
          points: [
            { time: valley1Time, value: valley1Price },
            { time: valley2Time, value: valley2Price },
            { time: candles[candles.length - 1].time, value: isTriggered ? projection : currentNeckline },
          ],
          color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(246,109,109,0.7)",
          style: LineStyle.Dashed,
          width: 3,
        },
        {
          id: "hs-shoulders",
          name: "Estructura HCH",
          points: [
            { time: left.time, value: left.price },
            { time: head.time, value: head.price },
            { time: right.time, value: right.price },
          ],
          color: "rgba(246,109,109,0.9)",
          style: LineStyle.Solid,
          width: 3,
        },
      ],
    };
    const score = right.index + (isTriggered ? candles.length : 0);
    if (!bestPattern || score > bestPattern.score) {
      bestPattern = { pattern, score };
    }
  }

  // 2. Inverse Head & Shoulders (Bullish)
  // Requisitos: tendencia previa bajista, 3 valles (cabeza menor), neckline definida, formación 20-150 velas
  for (let i = 0; i < lows.length - 2; i += 1) {
    const left = lows[i];
    const head = lows[i + 1];
    const right = lows[i + 2];

    // Formación debe tener entre 20-150 velas
    const formationLength = right.index - left.index;
    if (formationLength < 20 || formationLength > 150) continue;

    // Separación mínima
    if (head.index - left.index < 5 || right.index - head.index < 5) continue;

    // Simetría de hombros
    const shoulderAvg = (left.price + right.price) / 2;
    if (Math.abs(left.price - right.price) / shoulderAvg > shoulderSymmetry) continue;

    // Cabeza debe ser claramente más baja que el hombro más bajo (al menos 3%)
    const minShoulder = Math.min(left.price, right.price);
    if (head.price > minShoulder * (1 - headMinGap)) continue;

    // REQUISITO: Tendencia previa bajista clara
    if (!checkTrend(candles, left.index, Math.min(40, left.index), "down")) continue;

    // Encontrar picos entre hombros y cabeza para la neckline
    const peak1Idx = candles
      .slice(left.index, head.index)
      .reduce((maxIdx, c, idx) => (c.high > candles[left.index + maxIdx].high ? idx : maxIdx), 0);
    const peak2Idx = candles
      .slice(head.index, right.index)
      .reduce((maxIdx, c, idx) => (c.high > candles[head.index + maxIdx].high ? idx : maxIdx), 0);

    const peak1Price = candles[left.index + peak1Idx].high;
    const peak2Price = candles[head.index + peak2Idx].high;
    const peak1Time = candles[left.index + peak1Idx].time;
    const peak2Time = candles[head.index + peak2Idx].time;

    const necklineSlope = (peak2Price - peak1Price) / (head.index + peak2Idx - left.index - peak1Idx);
    const necklineDrift = Math.abs(peak2Price - peak1Price) / shoulderAvg;
    if (necklineDrift > necklineDriftMax) continue;

    const depthLeft = (peak1Price - left.price) / peak1Price;
    const depthRight = (peak2Price - right.price) / peak2Price;
    if (depthLeft < minNeckDepth || depthRight < minNeckDepth) continue;
    const height = Math.min(peak1Price, peak2Price) - head.price;

    const leftVol = avgVolumeAround(left.index);
    const headVol = avgVolumeAround(head.index);
    const rightVol = avgVolumeAround(right.index);
    const hasVolume = volumeMap && (leftVol > 0 || headVol > 0 || rightVol > 0);
    if (hasVolume) {
      const volumeDecreasing =
        headVol <= leftVol * (1 - volumeDrop) && rightVol <= headVol * (1 - volumeDrop);
      if (!volumeDecreasing) continue;
    }

    if (height <= 0) continue;
    if (height / head.price < minHeightRatio) continue;

    const barsSinceRight = candles.length - 1 - right.index;
    if (barsSinceRight > recentWindow) continue;

    const necklineAt = (index: number) =>
      peak1Price + necklineSlope * (index - left.index - peak1Idx);

    const lastPrice = candles[candles.length - 1].close;
    const currentNeckline = necklineAt(candles.length - 1);

    const breakoutIdx = candles
      .slice(right.index)
      .findIndex((c, offset) => c.close > necklineAt(right.index + offset) * (1 + breakThreshold));
    const breakoutIndex = breakoutIdx === -1 ? -1 : right.index + breakoutIdx;

    // Gatillo: cierre rompiendo neckline al alza
    const isTriggered =
      breakoutIdx !== -1 && lastPrice > currentNeckline * (1 + breakThreshold);
    const projection = currentNeckline + height;

    // Stop agresivo: bajo el hombro derecho
    const stopLoss = right.price * 0.99;

    // INVALIDACIÓN: Si precio hizo nuevos mínimos después del patrón
    const postPatternLow = Math.min(...candles.slice(right.index).map(c => c.low));
    if (postPatternLow < head.price * 0.99) continue;

    if (hasVolume && isTriggered && breakoutIndex !== -1) {
      const baseline = avgVolumeBetween(Math.max(0, breakoutIndex - 20), breakoutIndex - 1);
      const breakVolume = volumeAt(breakoutIndex);
      if (baseline > 0 && breakVolume < baseline * breakoutVolumeBoost) continue;
    }

    const pattern = {
      kind: "inverse-head-shoulders",
      name: isTriggered ? "HCH Invertido (Confirmado)" : "HCH Invertido",
      description: `Reversión alcista. ${isTriggered ? "Neckline rota." : "Esperar ruptura de neckline."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.92 : 0.78,
      markers: [
        { time: left.time, position: "belowBar", color: "#00c074", shape: "circle", text: "h" },
        { time: head.time, position: "belowBar", color: "#00c074", shape: "circle", text: "c" },
        { time: right.time, position: "belowBar", color: "#00c074", shape: "circle", text: "h" },
      ],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        {
          id: "inv-hs-neckline",
          name: "Neckline",
          points: [
            { time: peak1Time, value: peak1Price },
            { time: peak2Time, value: peak2Price },
            { time: candles[candles.length - 1].time, value: isTriggered ? projection : currentNeckline },
          ],
          color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.7)",
          style: LineStyle.Dashed,
          width: 3,
        },
        {
          id: "inv-hs-structure",
          name: "Estructura HCH Inv",
          points: [
            { time: left.time, value: left.price },
            { time: head.time, value: head.price },
            { time: right.time, value: right.price },
          ],
          color: "rgba(0,192,116,0.9)",
          style: LineStyle.Solid,
          width: 3,
        },
      ],
    };
    const score = right.index + (isTriggered ? candles.length : 0);
    if (!bestPattern || score > bestPattern.score) {
      bestPattern = { pattern, score };
    }
  }

  return bestPattern?.pattern ?? null;
};

export const detectAscendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  
  // Requisitos: 4-6 toques (o al menos 3), formación 20-100+ velas
  const tailStart = Math.max(0, candles.length - 100);
  
  const recentHighs = highs.filter((point) => point.index >= tailStart);
  const recentLows = lows.filter((point) => point.index >= tailStart);
  if (recentHighs.length < 3 || recentLows.length < 3) return null;
  
  // Verificar duración de formación (mínimo 20 velas)
  const formationLength = Math.max(...recentHighs.map(h => h.index)) - Math.min(...recentLows.map(l => l.index));
  if (formationLength < 20) return null;

  const lastHighs = recentHighs.slice(-4); // Usar más puntos si disponibles
  const lastLows = recentLows.slice(-4);
  
  // Máximos deben ser muy planos (resistencia horizontal)
  const highValues = lastHighs.map((point) => point.price);
  const highAvg = highValues.reduce((sum, value) => sum + value, 0) / highValues.length;
  const highSpread = (Math.max(...highValues) - Math.min(...highValues)) / highAvg;
  
  // REQUISITO: Resistencia realmente plana (máx 1.5% de dispersión)
  if (highSpread > 0.015) return null;
  
  // Mínimos deben ser ascendentes (compresión)
  const sortedLows = [...lastLows].sort((a, b) => a.index - b.index);
  for (let i = 1; i < sortedLows.length; i++) {
    if (sortedLows[i].price < sortedLows[i - 1].price * 0.995) return null; // Permitir pequeña variación
  }
  
  // Verificar que hay compresión real
  const startGap = highAvg - sortedLows[0].price;
  const endGap = highAvg - sortedLows[sortedLows.length - 1].price;
  if (endGap >= startGap * 0.7) return null; // Debe haber al menos 30% de compresión

  const lastPrice = candles[candles.length - 1].close;
  const isTriggered = lastPrice > highAvg;
  const triangleHeight = highAvg - sortedLows[0].price;
  const projection = highAvg + triangleHeight;
  const stopLoss = sortedLows[sortedLows.length - 1].price * 0.99;

  return {
    kind: "ascending-triangle",
    name: isTriggered ? "Triángulo Ascendente (Confirmado)" : "Triángulo Ascendente",
    description: `Patrón alcista. ${isTriggered ? "Resistencia rota." : "Esperar ruptura de resistencia."} Objetivo: ${projection.toFixed(2)}`,
    confidence: isTriggered ? 0.90 : 0.78,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: [
      {
        time: lastHighs[lastHighs.length - 1].time,
        position: "aboveBar",
        color: "#7aa7ff",
        shape: "circle",
        text: "TriA",
      },
    ],
    lines: [
      {
        id: "triangle-ceiling",
        name: "Resistencia plana",
        points: [
          { time: lastHighs[0].time, value: highAvg },
          { time: lastHighs[lastHighs.length - 1].time, value: highAvg },
          { time: candles[candles.length - 1].time, value: isTriggered ? projection : highAvg }
        ],
        color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(122,167,255,0.9)",
        style: LineStyle.Solid,
        width: 3,
      },
      {
        id: "triangle-rising",
        name: "Soporte ascendente",
        points: [
          { time: sortedLows[0].time, value: sortedLows[0].price },
          { time: sortedLows[sortedLows.length - 1].time, value: sortedLows[sortedLows.length - 1].price },
        ],
        color: "rgba(122,167,255,0.7)",
        style: LineStyle.Dashed,
        width: 3,
      },
    ],
  };
};


export const detectDescendingTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  
  // Requisitos: 4-6 toques (o al menos 3), formación 20-100+ velas
  const tailStart = Math.max(0, candles.length - 100);
  
  const recentHighs = highs.filter((point) => point.index >= tailStart);
  const recentLows = lows.filter((point) => point.index >= tailStart);
  if (recentHighs.length < 3 || recentLows.length < 3) return null;
  
  // Verificar duración de formación (mínimo 20 velas)
  const formationLength = Math.max(...recentLows.map(l => l.index)) - Math.min(...recentHighs.map(h => h.index));
  if (formationLength < 20) return null;

  const lastLows = recentLows.slice(-4);
  const lastHighs = recentHighs.slice(-4);
  
  // Mínimos deben ser muy planos (soporte horizontal)
  const lowValues = lastLows.map((point) => point.price);
  const lowAvg = lowValues.reduce((sum, value) => sum + value, 0) / lowValues.length;
  const lowSpread = (Math.max(...lowValues) - Math.min(...lowValues)) / lowAvg;
  
  // REQUISITO: Soporte realmente plano (máx 1.5% de dispersión)
  if (lowSpread > 0.015) return null;
  
  // Máximos deben ser descendentes (compresión)
  const sortedHighs = [...lastHighs].sort((a, b) => a.index - b.index);
  for (let i = 1; i < sortedHighs.length; i++) {
    if (sortedHighs[i].price > sortedHighs[i - 1].price * 1.005) return null;
  }
  
  // Verificar que hay compresión real
  const startGap = sortedHighs[0].price - lowAvg;
  const endGap = sortedHighs[sortedHighs.length - 1].price - lowAvg;
  if (endGap >= startGap * 0.7) return null;

  const lastPrice = candles[candles.length - 1].close;
  const isTriggered = lastPrice < lowAvg;
  const triangleHeight = sortedHighs[0].price - lowAvg;
  const projection = lowAvg - triangleHeight;
  const stopLoss = sortedHighs[sortedHighs.length - 1].price * 1.01;

  return {
    kind: "descending-triangle",
    name: isTriggered ? "Triángulo Descendente (Confirmado)" : "Triángulo Descendente",
    description: `Patrón bajista. ${isTriggered ? "Soporte roto." : "Esperar ruptura del soporte."} Objetivo: ${projection.toFixed(2)}`,
    confidence: isTriggered ? 0.90 : 0.78,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: [
      {
        time: lastLows[lastLows.length - 1].time,
        position: "belowBar",
        color: "#ff9f6b",
        shape: "circle",
        text: "TriD",
      },
    ],
    lines: [
      {
        id: "triangle-floor",
        name: "Soporte plano",
        points: [
          { time: lastLows[0].time, value: lowAvg },
          { time: lastLows[lastLows.length - 1].time, value: lowAvg },
          { time: candles[candles.length - 1].time, value: isTriggered ? projection : lowAvg }
        ],
        color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(255,159,107,0.9)",
        style: LineStyle.Solid,
        width: 3,
      },
      {
        id: "triangle-falling",
        name: "Resistencia descendente",
        points: [
          { time: sortedHighs[0].time, value: sortedHighs[0].price },
          { time: sortedHighs[sortedHighs.length - 1].time, value: sortedHighs[sortedHighs.length - 1].price },
        ],
        color: "rgba(255,159,107,0.7)",
        style: LineStyle.Dashed,
        width: 3,
      },
    ],
  };
};


export const detectSymmetricalTriangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((swing) => swing.type === "high");
  const lows = swings.filter((swing) => swing.type === "low");
  
  // Requisitos: formación 20-100+ velas, máximos descendentes y mínimos ascendentes
  const tailStart = Math.max(0, candles.length - 100);
  
  const recentHighs = highs.filter((point) => point.index >= tailStart).slice(-4);
  const recentLows = lows.filter((point) => point.index >= tailStart).slice(-4);
  if (recentHighs.length < 3 || recentLows.length < 3) return null;
  
  // Verificar duración de formación
  const formationLength = Math.max(recentHighs[recentHighs.length - 1].index, recentLows[recentLows.length - 1].index) 
                        - Math.min(recentHighs[0].index, recentLows[0].index);
  if (formationLength < 20) return null;
  
  const sortedHighs = [...recentHighs].sort((a, b) => a.index - b.index);
  const sortedLows = [...recentLows].sort((a, b) => a.index - b.index);

  const highSlope = (sortedHighs[sortedHighs.length - 1].price - sortedHighs[0].price) / 
                    (sortedHighs[sortedHighs.length - 1].index - sortedHighs[0].index);
  const lowSlope = (sortedLows[sortedLows.length - 1].price - sortedLows[0].price) / 
                   (sortedLows[sortedLows.length - 1].index - sortedLows[0].index);
  
  // REQUISITO: Máximos descendentes (pendiente negativa) y mínimos ascendentes (pendiente positiva)
  if (!(highSlope < 0 && lowSlope > 0)) return null;
  
  const startGap = sortedHighs[0].price - sortedLows[0].price;
  const endGap = sortedHighs[sortedHighs.length - 1].price - sortedLows[sortedLows.length - 1].price;
  
  // REQUISITO: Compresión significativa (al menos 30%)
  if (endGap >= startGap * 0.7) return null;

  // Calcular punto de convergencia (apex)
  const apexPrice = (sortedHighs[sortedHighs.length - 1].price + sortedLows[sortedLows.length - 1].price) / 2;
  const lastPrice = candles[candles.length - 1].close;
  const triangleHeight = startGap;
  
  // Determinar dirección de ruptura
  const isBreakoutUp = lastPrice > sortedHighs[sortedHighs.length - 1].price;
  const isBreakoutDown = lastPrice < sortedLows[sortedLows.length - 1].price;
  const isTriggered = isBreakoutUp || isBreakoutDown;
  
  const projection = isBreakoutUp 
    ? sortedHighs[sortedHighs.length - 1].price + triangleHeight
    : isBreakoutDown 
      ? sortedLows[sortedLows.length - 1].price - triangleHeight
      : apexPrice;
      
  const stopLoss = isBreakoutUp 
    ? sortedLows[sortedLows.length - 1].price * 0.99
    : isBreakoutDown
      ? sortedHighs[sortedHighs.length - 1].price * 1.01
      : apexPrice;

  return {
    kind: "symmetrical-triangle",
    name: isTriggered 
      ? `Triángulo Simétrico (${isBreakoutUp ? "Ruptura ↑" : "Ruptura ↓"})` 
      : "Triángulo Simétrico",
    description: `Patrón de indecisión. ${isTriggered ? (isBreakoutUp ? "Ruptura alcista." : "Ruptura bajista.") : "Esperar ruptura."} Objetivo: ${projection.toFixed(2)}`,
    confidence: isTriggered ? 0.85 : 0.70,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: [
      {
        time: sortedHighs[sortedHighs.length - 1].time,
        position: "aboveBar",
        color: isBreakoutUp ? "#00c074" : isBreakoutDown ? "#f66d6d" : "#9a7dff",
        shape: "circle",
        text: "TriS",
      },
    ],
    lines: [
      {
        id: "triangle-upper",
        name: "Resistencia descendente",
        points: [
          { time: sortedHighs[0].time, value: sortedHighs[0].price },
          { time: sortedHighs[sortedHighs.length - 1].time, value: sortedHighs[sortedHighs.length - 1].price },
        ],
        color: isBreakoutUp ? "rgba(0,192,116,0.9)" : "rgba(154,125,255,0.8)",
        style: LineStyle.Solid,
        width: 3,
      },
      {
        id: "triangle-lower",
        name: "Soporte ascendente",
        points: [
          { time: sortedLows[0].time, value: sortedLows[0].price },
          { time: sortedLows[sortedLows.length - 1].time, value: sortedLows[sortedLows.length - 1].price },
        ],
        color: isBreakoutDown ? "rgba(246,70,93,0.9)" : "rgba(154,125,255,0.7)",
        style: LineStyle.Solid,
        width: 3,
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
  
  // Requisitos: formación 20-150 velas, al menos 3 toques por lado si es posible
  const tailStart = Math.max(0, candles.length - 150);
  const recentHighs = highs.filter((point) => point.index >= tailStart).slice(-4);
  const recentLows = lows.filter((point) => point.index >= tailStart).slice(-4);
  
  if (recentHighs.length < 3 || recentLows.length < 3) return null;
  
  // Duración mínima
  const formationLength = Math.max(recentHighs[recentHighs.length - 1].index, recentLows[recentLows.length - 1].index) 
                        - Math.min(recentHighs[0].index, recentLows[0].index);
  if (formationLength < 20) return null;

  const getSlope = (points: SwingPoint[]) => (points[points.length - 1].price - points[0].price) / (points[points.length - 1].index - points[0].index);
  
  const highSlope = getSlope(recentHighs);
  const lowSlope = getSlope(recentLows);
  
  // Validar dirección de los slopes
  if (direction === "rising" && !(highSlope > 0 && lowSlope > 0)) return null;
  if (direction === "falling" && !(highSlope < 0 && lowSlope < 0)) return null;
  
  // REQUISITO: Paralelismo estricto (máx 20% de diferencia relativa)
  const avgSlope = (Math.abs(highSlope) + Math.abs(lowSlope)) / 2;
  const slopeDiff = Math.abs(highSlope - lowSlope) / avgSlope;
  if (slopeDiff > 0.2) return null;

  // REQUISITO: Tendencia previa
  if (direction === "rising" && !checkTrend(candles, recentHighs[0].index, Math.min(40, recentHighs[0].index), "up")) return null;
  if (direction === "falling" && !checkTrend(candles, recentLows[0].index, Math.min(40, recentLows[0].index), "down")) return null;

  const lastPrice = candles[candles.length - 1].close;
  const channelHeight = recentHighs[recentHighs.length - 1].price - recentLows[recentLows.length - 1].price;
  
  // Determinar rupturas confirmadas
  const isTriggeredUp = direction === "falling" && lastPrice > recentHighs[recentHighs.length - 1].price;
  const isTriggeredDown = direction === "rising" && lastPrice < recentLows[recentLows.length - 1].price;
  
  const projection = isTriggeredUp 
    ? lastPrice + channelHeight 
    : isTriggeredDown 
      ? lastPrice - channelHeight 
      : direction === "rising" ? lastPrice + channelHeight : lastPrice - channelHeight;

  const stopLoss = isTriggeredUp 
    ? recentHighs[recentHighs.length - 1].price * 0.99
    : isTriggeredDown 
      ? recentLows[recentLows.length - 1].price * 1.01
      : direction === "rising" ? recentLows[recentLows.length - 1].price : recentHighs[recentHighs.length - 1].price;

  const name = direction === "rising" ? "Canal Ascendente" : "Canal Descendente";
  const color = direction === "rising" ? "#00c074" : "#f66d6d";
  
  return {
    kind: direction === "rising" ? "rising-channel" : "falling-channel",
    name: (isTriggeredUp || isTriggeredDown) ? `${name} (Ruptura)` : name,
    description: `Dos bandas paralelas. ${isTriggeredUp || isTriggeredDown ? "Ruptura confirmada." : "Precio respetando el canal."} Objetivo: ${projection.toFixed(2)}`,
    confidence: (isTriggeredUp || isTriggeredDown) ? 0.90 : 0.75,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: [
      {
        time: recentHighs[recentHighs.length - 1].time,
        position: direction === "rising" ? "belowBar" : "aboveBar",
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
          { time: recentHighs[recentHighs.length - 1].time, value: recentHighs[recentHighs.length - 1].price },
          ...(isTriggeredUp ? [{ time: candles[candles.length - 1].time, value: lastPrice }] : [])
        ],
        color,
        style: LineStyle.Solid,
        width: 3,
      },
      {
        id: `${direction}-channel-bottom`,
        name: "Banda inferior",
        points: [
          { time: recentLows[0].time, value: recentLows[0].price },
          { time: recentLows[recentLows.length - 1].time, value: recentLows[recentLows.length - 1].price },
          ...(isTriggeredDown ? [{ time: candles[candles.length - 1].time, value: lastPrice }] : [])
        ],
        color,
        style: direction === "rising" ? LineStyle.Dashed : LineStyle.Solid,
        width: 3,
      },
    ],
  };
};

export const detectEngulfing = (
  candles: CandlePoint[],
  direction: "bullish" | "bearish"
): Pattern | null => {
  if (candles.length < 5) return null; // Need more context
  
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  
  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(curr.close - curr.open);
  
  // Body significance (at least 0.5% move)
  if (currBody / curr.open < 0.005) return null;
  
  if (direction === "bullish") {
    // Bullish Engulfing: previous is down, current is up, current body swallows previous body
    if (!(prev.close < prev.open && curr.close > curr.open)) return null;
    if (!(curr.open <= prev.close && curr.close >= prev.open)) return null;
    
    // Trend check: previous should be in a decline
    const trend = candles.slice(-5, -2).every(c => c.close <= c.open || c.close < (candles[candles.indexOf(c)-1]?.close ?? c.close));
    
    return {
      kind: "bullish-engulfing",
      name: "Engulfing alcista",
      description: "Vela verde que envuelve el cuerpo de la previa en zona de soporte.",
      confidence: Number((Math.min(1, currBody / prevBody) * (trend ? 1 : 0.7)).toFixed(2)),
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
  
  // Bearish Engulfing
  if (!(prev.close > prev.open && curr.close < curr.open)) return null;
  if (!(curr.open >= prev.close && curr.close <= prev.open)) return null;
  
  return {
    kind: "bearish-engulfing",
    name: "Engulfing bajista",
    description: "Vela roja que envuelve el cuerpo de la previa en zona de techo.",
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

export const detectWedge = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((s) => s.type === "high");
  const lows = swings.filter((s) => s.type === "low");
  
  if (highs.length < 3 || lows.length < 3) return null;

  // Requisitos: líneas convergentes, formación 20-120 velas
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);

  // Formación debe tener entre 20-120 velas
  const formationLength = Math.max(recentHighs[2].index, recentLows[2].index) - Math.min(recentHighs[0].index, recentLows[0].index);
  if (formationLength < 20 || formationLength > 120) return null;

  const getSlope = (p1: SwingPoint, p2: SwingPoint) => (p2.price - p1.price) / (p2.index - p1.index);
  
  const highSlope = getSlope(recentHighs[0], recentHighs[2]);
  const lowSlope = getSlope(recentLows[0], recentLows[2]);

  // Verificar convergencia (las líneas deben acercarse)
  const startGap = Math.abs(recentHighs[0].price - recentLows[0].price);
  const endGap = Math.abs(recentHighs[2].price - recentLows[2].price);
  if (endGap >= startGap * 0.8) return null; // Requiere compresión de al menos 20%

  const lastPrice = candles[candles.length - 1].close;

  // === Rising Wedge (Cuña Ascendente) ===
  // Ambas líneas suben pero convergen, señal bajista
  if (highSlope > 0 && lowSlope > 0) {
    // La pendiente inferior debe ser mayor para que converjan
    if (lowSlope <= highSlope) return null;
    
    // REQUISITO: Tendencia previa alcista o parte de una corrección
    if (!checkTrend(candles, recentHighs[0].index, Math.min(30, recentHighs[0].index), "up")) return null;

    const breakdownLevel = recentLows[2].price;
    const isTriggered = lastPrice < breakdownLevel;
    const wedgeHeight = recentHighs[2].price - recentLows[2].price;
    const projection = breakdownLevel - wedgeHeight;
    const stopLoss = recentHighs[2].price * 1.01;

    return {
      kind: "rising-wedge",
      name: isTriggered ? "Cuña Ascendente (Confirmada)" : "Cuña Ascendente",
      description: `Reversión bajista. ${isTriggered ? "Soporte roto." : "Esperar ruptura del soporte."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.88 : 0.75,
      markers: [{ time: recentHighs[2].time, position: "aboveBar", color: "#f66d6d", shape: "arrowDown", text: "CuñaA" }],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        { id: "wedge-top", name: "Resistencia", points: [{ time: recentHighs[0].time, value: recentHighs[0].price }, { time: recentHighs[2].time, value: recentHighs[2].price }], color: "rgba(246,109,109,0.9)", style: LineStyle.Solid, width: 3 },
        { id: "wedge-bot", name: "Soporte", points: [{ time: recentLows[0].time, value: recentLows[0].price }, { time: recentLows[2].time, value: recentLows[2].price }], color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(246,109,109,0.7)", style: LineStyle.Solid, width: 3 }
      ]
    };
  }
  
  // === Falling Wedge (Cuña Descendente) ===
  // Ambas líneas bajan pero convergen, señal alcista
  if (highSlope < 0 && lowSlope < 0) {
    // La pendiente superior debe ser menos negativa para que converjan
    if (highSlope <= lowSlope) return null;
    
    // REQUISITO: Tendencia previa bajista o parte de una corrección
    if (!checkTrend(candles, recentLows[0].index, Math.min(30, recentLows[0].index), "down")) return null;

    const breakoutLevel = recentHighs[2].price;
    const isTriggered = lastPrice > breakoutLevel;
    const wedgeHeight = recentHighs[2].price - recentLows[2].price;
    const projection = breakoutLevel + wedgeHeight;
    const stopLoss = recentLows[2].price * 0.99;

    return {
      kind: "falling-wedge",
      name: isTriggered ? "Cuña Descendente (Confirmada)" : "Cuña Descendente",
      description: `Reversión alcista. ${isTriggered ? "Resistencia rota." : "Esperar ruptura de resistencia."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.88 : 0.75,
      markers: [{ time: recentLows[2].time, position: "belowBar", color: "#00c074", shape: "arrowUp", text: "CuñaD" }],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        { id: "wedge-top", name: "Resistencia", points: [{ time: recentHighs[0].time, value: recentHighs[0].price }, { time: recentHighs[2].time, value: recentHighs[2].price }], color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.7)", style: LineStyle.Solid, width: 3 },
        { id: "wedge-bot", name: "Soporte", points: [{ time: recentLows[0].time, value: recentLows[0].price }, { time: recentLows[2].time, value: recentLows[2].price }], color: "rgba(0,192,116,0.9)", style: LineStyle.Solid, width: 3 }
      ]
    };
  }

  return null;
};


export const detectTripleTop = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((s) => s.type === "high");

  // Requisitos: como doble, pero 3 intentos fallidos; nivel muy respetado
  // Formación típica: 30-200 velas
  for (let i = 0; i < highs.length - 2; i++) {
    const p1 = highs[i];
    const p2 = highs[i + 1];
    const p3 = highs[i + 2];

    // Formación debe tener entre 30-200 velas
    const formationLength = p3.index - p1.index;
    if (formationLength < 30 || formationLength > 200) continue;

    // Los tres picos deben ser muy similares (máx 1.5% diferencia del promedio)
    const avg = (p1.price + p2.price + p3.price) / 3;
    if (Math.abs(p1.price - avg) / avg > 0.015) continue;
    if (Math.abs(p2.price - avg) / avg > 0.015) continue;
    if (Math.abs(p3.price - avg) / avg > 0.015) continue;

    // Separación mínima entre picos
    if (p2.index - p1.index < 8 || p3.index - p2.index < 8) continue;

    // REQUISITO: Tendencia previa alcista
    if (!checkTrend(candles, p1.index, Math.min(40, p1.index), "up")) continue;

    // Encontrar valles intermedios y el nivel de soporte
    const valley1 = Math.min(...candles.slice(p1.index, p2.index).map(c => c.low));
    const valley2 = Math.min(...candles.slice(p2.index, p3.index).map(c => c.low));
    const support = Math.min(valley1, valley2);

    const height = avg - support;
    if (height / avg < 0.03) continue; // Mínimo 3% de profundidad

    // INVALIDACIÓN: Si precio hizo nuevos máximos después
    const postPatternCandles = candles.slice(p3.index);
    if (postPatternCandles.length > 3) {
      const postPatternHigh = Math.max(...postPatternCandles.map(c => c.high));
      if (postPatternHigh > avg * 1.01) continue;
    }

    const lastPrice = candles[candles.length - 1].close;
    // Gatillo: ruptura del soporte con cierre
    const isTriggered = lastPrice < support;
    const projection = support - height;
    const stopLoss = Math.max(p1.price, p2.price, p3.price) * 1.01;

    return {
      kind: "triple-top",
      name: isTriggered ? "Triple Techo (Confirmado)" : "Triple Techo",
      description: `Reversión bajista fuerte. ${isTriggered ? "Soporte roto." : "Esperar ruptura del soporte."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.93 : 0.82,
      markers: [
        { time: p1.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "1" },
        { time: p2.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "2" },
        { time: p3.time, position: "aboveBar", color: "#f66d6d", shape: "circle", text: "3" },
      ],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        { id: "tt-res", name: "Resistencia (Triple)", points: [{ time: p1.time, value: avg }, { time: p3.time, value: avg }], color: "#f66d6d", width: 3 },
        { id: "tt-sup", name: "Soporte", points: [{ time: p1.time, value: support }, { time: p3.time, value: support }, { time: candles[candles.length - 1].time, value: isTriggered ? projection : support }], color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(246,109,109,0.6)", style: LineStyle.Dashed, width: 2 },
      ]
    };
  }
  return null;
};

export const detectTripleBottom = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const lows = swings.filter((s) => s.type === "low");

  // Requisitos: como doble, pero 3 intentos fallidos; nivel muy respetado
  // Formación típica: 30-200 velas
  for (let i = 0; i < lows.length - 2; i++) {
    const p1 = lows[i];
    const p2 = lows[i + 1];
    const p3 = lows[i + 2];

    // Formación debe tener entre 30-200 velas
    const formationLength = p3.index - p1.index;
    if (formationLength < 30 || formationLength > 200) continue;

    // Los tres valles deben ser muy similares
    const avg = (p1.price + p2.price + p3.price) / 3;
    if (Math.abs(p1.price - avg) / avg > 0.015) continue;
    if (Math.abs(p2.price - avg) / avg > 0.015) continue;
    if (Math.abs(p3.price - avg) / avg > 0.015) continue;

    // Separación mínima entre valles
    if (p2.index - p1.index < 8 || p3.index - p2.index < 8) continue;

    // REQUISITO: Tendencia previa bajista
    if (!checkTrend(candles, p1.index, Math.min(40, p1.index), "down")) continue;

    // Encontrar picos intermedios y el nivel de resistencia
    const peak1 = Math.max(...candles.slice(p1.index, p2.index).map(c => c.high));
    const peak2 = Math.max(...candles.slice(p2.index, p3.index).map(c => c.high));
    const resist = Math.max(peak1, peak2);

    const height = resist - avg;
    if (height / avg < 0.03) continue;

    // INVALIDACIÓN: Si precio hizo nuevos mínimos después
    const postPatternCandles = candles.slice(p3.index);
    if (postPatternCandles.length > 3) {
      const postPatternLow = Math.min(...postPatternCandles.map(c => c.low));
      if (postPatternLow < avg * 0.99) continue;
    }

    const lastPrice = candles[candles.length - 1].close;
    // Gatillo: ruptura de la resistencia con cierre
    const isTriggered = lastPrice > resist;
    const projection = resist + height;
    const stopLoss = Math.min(p1.price, p2.price, p3.price) * 0.99;

    return {
      kind: "triple-bottom",
      name: isTriggered ? "Triple Suelo (Confirmado)" : "Triple Suelo",
      description: `Reversión alcista fuerte. ${isTriggered ? "Resistencia rota." : "Esperar ruptura de resistencia."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.93 : 0.82,
      markers: [
        { time: p1.time, position: "belowBar", color: "#00c074", shape: "circle", text: "1" },
        { time: p2.time, position: "belowBar", color: "#00c074", shape: "circle", text: "2" },
        { time: p3.time, position: "belowBar", color: "#00c074", shape: "circle", text: "3" },
      ],
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      lines: [
        { id: "tb-sup", name: "Soporte (Triple)", points: [{ time: p1.time, value: avg }, { time: p3.time, value: avg }], color: "#00c074", width: 3 },
        { id: "tb-res", name: "Resistencia", points: [{ time: p1.time, value: resist }, { time: p3.time, value: resist }, { time: candles[candles.length - 1].time, value: isTriggered ? projection : resist }], color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.6)", style: LineStyle.Dashed, width: 2 },
      ]
    };
  }
  return null;
};

export const detectRectangle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter((s) => s.type === "high");
  const lows = swings.filter((s) => s.type === "low");
  
  if (highs.length < 3 || lows.length < 3) return null;

  // Requisitos: 2-3+ toques por lado, formación 20-300 velas
  const tailStart = Math.max(0, candles.length - 100);
  const recentHighs = highs.filter((s) => s.index >= tailStart).slice(-6);
  const recentLows = lows.filter((s) => s.index >= tailStart).slice(-6);
  
  if (recentHighs.length < 2 || recentLows.length < 2) return null;

  // Calcular límites del rectángulo
  const recentCandles = candles.slice(tailStart);
  const maxPrice = Math.max(...recentHighs.map(h => h.price));
  const minPrice = Math.min(...recentLows.map(l => l.price));
  
  if (minPrice === 0) return null;
  
  // Verificar duración de formación
  const formationLength = recentCandles.length;
  if (formationLength < 20) return null;
  
  // REQUISITO: Rango confinado (máx 12% de diferencia)
  const range = (maxPrice - minPrice) / minPrice;
  if (range > 0.12 || range < 0.02) return null; // Ni muy ancho ni muy estrecho

  // Contar toques reales a los límites (dentro de 1% del nivel)
  const resistanceTouches = recentHighs.filter(h => h.price >= maxPrice * 0.99).length;
  const supportTouches = recentLows.filter(l => l.price <= minPrice * 1.01).length;

  // REQUISITO: Mínimo 2 toques por lado
  if (resistanceTouches < 2 || supportTouches < 2) return null;

  const lastPrice = candles[candles.length - 1].close;
  const rectangleHeight = maxPrice - minPrice;
  
  // Determinar ruptura
  const isBreakoutUp = lastPrice > maxPrice;
  const isBreakoutDown = lastPrice < minPrice;
  const isTriggered = isBreakoutUp || isBreakoutDown;
  
  const projection = isBreakoutUp 
    ? maxPrice + rectangleHeight 
    : isBreakoutDown 
      ? minPrice - rectangleHeight 
      : (maxPrice + minPrice) / 2;
      
  const stopLoss = isBreakoutUp 
    ? minPrice * 0.99 
    : isBreakoutDown 
      ? maxPrice * 1.01 
      : minPrice;

  return {
    kind: "rectangle",
    name: isTriggered 
      ? `Rectángulo (${isBreakoutUp ? "Ruptura ↑" : "Ruptura ↓"})` 
      : "Rectángulo (Rango)",
    description: `Consolidación lateral. ${isTriggered ? (isBreakoutUp ? "Ruptura alcista confirmada." : "Ruptura bajista confirmada.") : "Esperar ruptura."} Objetivo: ${projection.toFixed(2)}`,
    confidence: isTriggered ? 0.85 : 0.70,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: isTriggered ? [{
      time: candles[candles.length - 1].time,
      position: isBreakoutUp ? "aboveBar" : "belowBar",
      color: isBreakoutUp ? "#00c074" : "#f66d6d",
      shape: isBreakoutUp ? "arrowUp" : "arrowDown",
      text: "Rect"
    }] : [],
    lines: [
      { 
        id: "rect-top", 
        name: "Resistencia", 
        points: [
          { time: recentCandles[0].time, value: maxPrice }, 
          { time: recentCandles[recentCandles.length - 1].time, value: maxPrice },
          ...(isBreakoutUp ? [{ time: candles[candles.length - 1].time, value: projection }] : [])
        ], 
        color: isBreakoutUp ? "rgba(0,192,116,0.9)" : "rgba(122,167,255,0.8)", 
        width: 3, 
        style: LineStyle.Solid 
      },
      { 
        id: "rect-bot", 
        name: "Soporte", 
        points: [
          { time: recentCandles[0].time, value: minPrice }, 
          { time: recentCandles[recentCandles.length - 1].time, value: minPrice },
          ...(isBreakoutDown ? [{ time: candles[candles.length - 1].time, value: projection }] : [])
        ], 
        color: isBreakoutDown ? "rgba(246,70,93,0.9)" : "rgba(122,167,255,0.7)", 
        width: 3, 
        style: LineStyle.Solid 
      }
    ]
  };
};


export const detectFlag = (candles: CandlePoint[], swings: SwingPoint[], _volumes: VolumePoint[] = []): Pattern | null => {
  // Requisitos: mástil fuerte (movimiento impulsivo) + canal corto inclinado contra tendencia
  // Formación bandera: 5-30 velas de consolidación
  const totalCandles = candles.length;
  if (totalCandles < 25) return null;

  // Buscar el mástil (movimiento impulsivo en las últimas 10-20 velas)
  const poleStartIdx = Math.max(0, totalCandles - 25);
  const poleEndIdx = Math.max(0, totalCandles - 10);
  
  if (poleEndIdx <= poleStartIdx) return null;

  const poleStart = candles[poleStartIdx];
  const poleEnd = candles[poleEndIdx];
  
  const movePercent = (poleEnd.close - poleStart.open) / poleStart.open;
  
  // === Bandera Alcista ===
  // Requisitos: mástil alcista fuerte (>7%), consolidación bajista/lateral corta
  if (movePercent > 0.07) {
    // REQUISITO: Tendencia previa alcista
    if (!checkTrend(candles, poleStartIdx, Math.min(30, poleStartIdx), "up")) return null;

    const consolidation = candles.slice(poleEndIdx);
    if (consolidation.length < 5 || consolidation.length > 30) return null;
    
    const conMax = Math.max(...consolidation.map(c => c.high));
    const conMin = Math.min(...consolidation.map(c => c.low));
    
    // La consolidación debe ser más estrecha que el mástil
    const conRange = conMax - conMin;
    const poleHeight = poleEnd.close - poleStart.open;
    if (conRange > poleHeight * 0.5) return null;
    
    // Retroceso máx 50% del mástil
    const retracement = poleEnd.close - conMin;
    if (retracement > poleHeight * 0.5) return null;

    // La consolidación debe inclinarse ligeramente hacia abajo o ser lateral
    const conFirstClose = consolidation[0].close;
    const conLastClose = consolidation[consolidation.length - 1].close;
    if (conLastClose > conFirstClose * 1.03) return null; // No puede subir mucho

    const lastPrice = candles[candles.length - 1].close;
    const isTriggered = lastPrice > conMax;
    const projection = conMax + poleHeight;
    const stopLoss = conMin * 0.99;

    return {
      kind: "bullish-flag",
      name: isTriggered ? "Bandera Alcista (Confirmada)" : "Bandera Alcista",
      description: `Continuación alcista. ${isTriggered ? "Techo de bandera roto." : "Esperar ruptura del canal."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.88 : 0.75,
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      markers: [{ time: poleEnd.time, position: "aboveBar", color: "#00c074", shape: "circle", text: "Flag" }],
      lines: [
        { id: "flag-pole", name: "Mástil", points: [{ time: poleStart.time, value: poleStart.open }, { time: poleEnd.time, value: poleEnd.close }], color: "#00c074", width: 3 },
        { id: "flag-channel-top", name: "Canal superior", points: [{ time: consolidation[0].time, value: conMax }, { time: consolidation[consolidation.length - 1].time, value: isTriggered ? projection : conMax }], color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.6)", style: LineStyle.Dashed, width: 2 },
        { id: "flag-channel-bot", name: "Canal inferior", points: [{ time: consolidation[0].time, value: conMin }, { time: consolidation[consolidation.length - 1].time, value: conMin }], color: "rgba(0,192,116,0.5)", style: LineStyle.Dashed, width: 2 }
      ]
    };
  }

  // === Bandera Bajista ===
  // Requisitos: mástil bajista fuerte (>7%), consolidación alcista/lateral corta
  if (movePercent < -0.07) {
    // REQUISITO: Tendencia previa bajista
    if (!checkTrend(candles, poleStartIdx, Math.min(30, poleStartIdx), "down")) return null;

    const consolidation = candles.slice(poleEndIdx);
    if (consolidation.length < 5 || consolidation.length > 30) return null;
    
    const conMax = Math.max(...consolidation.map(c => c.high));
    const conMin = Math.min(...consolidation.map(c => c.low));
    
    const conRange = conMax - conMin;
    const poleHeight = poleStart.open - poleEnd.close;
    if (conRange > poleHeight * 0.5) return null;
    
    // Retroceso máx 50% del mástil
    const retracement = conMax - poleEnd.close;
    if (retracement > poleHeight * 0.5) return null;

    // La consolidación debe inclinarse ligeramente hacia arriba o ser lateral
    const conFirstClose = consolidation[0].close;
    const conLastClose = consolidation[consolidation.length - 1].close;
    if (conLastClose < conFirstClose * 0.97) return null; // No puede bajar mucho

    const lastPrice = candles[candles.length - 1].close;
    const isTriggered = lastPrice < conMin;
    const projection = conMin - poleHeight;
    const stopLoss = conMax * 1.01;

    return {
      kind: "bearish-flag",
      name: isTriggered ? "Bandera Bajista (Confirmada)" : "Bandera Bajista",
      description: `Continuación bajista. ${isTriggered ? "Suelo de bandera roto." : "Esperar ruptura del canal."} Objetivo: ${projection.toFixed(2)}`,
      confidence: isTriggered ? 0.88 : 0.75,
      projection: Number(projection.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      markers: [{ time: poleEnd.time, position: "belowBar", color: "#f66d6d", shape: "circle", text: "Flag" }],
      lines: [
        { id: "flag-pole", name: "Mástil", points: [{ time: poleStart.time, value: poleStart.open }, { time: poleEnd.time, value: poleEnd.close }], color: "#f66d6d", width: 3 },
        { id: "flag-channel-top", name: "Canal superior", points: [{ time: consolidation[0].time, value: conMax }, { time: consolidation[consolidation.length - 1].time, value: conMax }], color: "rgba(246,109,109,0.5)", style: LineStyle.Dashed, width: 2 },
        { id: "flag-channel-bot", name: "Canal inferior", points: [{ time: consolidation[0].time, value: conMin }, { time: consolidation[consolidation.length - 1].time, value: isTriggered ? projection : conMin }], color: isTriggered ? "rgba(246,70,93,0.9)" : "rgba(246,109,109,0.6)", style: LineStyle.Dashed, width: 2 }
      ]
    };
  }

  return null;
};


export const buildSupportResistance = (candles: CandlePoint[], swings: SwingPoint[]): PatternLine[] => {
  // Use more swings for calculation
  const highs = swings.filter((swing) => swing.type === "high").slice(-10);
  const lows = swings.filter((swing) => swing.type === "low").slice(-10);
  
  if (highs.length === 0 || lows.length === 0) return [];
  
  const resistance = highs.reduce((sum, point) => sum + point.price, 0) / highs.length;
  const support = lows.reduce((sum, point) => sum + point.price, 0) / lows.length;
  
  const firstTime = candles[0].time;
  const lastTime = candles[candles.length - 1].time;
  
  return [
    {
      id: "resistance",
      name: "Resistencia sugerida",
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
      name: "Soporte sugerido",
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

export const detectCupAndHandle = (candles: CandlePoint[], swings: SwingPoint[]): Pattern | null => {
  const highs = swings.filter(s => s.type === "high");
  if (highs.length < 2) return null;
  
  // Requisitos: Copa redondeada + asa con retroceso menor
  // Formación típica: 30-150 velas para la copa, 5-25 para el asa
  const rightRim = highs[highs.length - 1];
  const leftRim = highs[highs.length - 2];
  
  // REQUISITO: Formación de la copa (mínimo 30 velas)
  const cupLength = rightRim.index - leftRim.index;
  if (cupLength < 30 || cupLength > 150) return null;
  
  // REQUISITO: Bordes de la copa similares (máx 5% de diferencia)
  const rimAvg = (rightRim.price + leftRim.price) / 2;
  if (Math.abs(rightRim.price - leftRim.price) / rimAvg > 0.05) return null;
  
  // Encontrar el fondo de la copa
  const cupSlice = candles.slice(leftRim.index, rightRim.index);
  let bottomIndex = 0;
  let bottomPrice = Infinity;
  cupSlice.forEach((c, i) => {
    if (c.low < bottomPrice) {
      bottomPrice = c.low;
      bottomIndex = i;
    }
  });
  
  const depth = rimAvg - bottomPrice;
  
  // REQUISITO: Profundidad de la copa entre 10-35%
  const depthPercent = depth / rimAvg;
  if (depthPercent < 0.10 || depthPercent > 0.35) return null;
  
  // REQUISITO: Fondo redondeado (el punto más bajo debe estar cerca del centro)
  const cupMiddle = cupSlice.length / 2;
  if (Math.abs(bottomIndex - cupMiddle) > cupSlice.length * 0.35) return null;

  // Verificar el asa
  const afterRight = candles.slice(rightRim.index);
  if (afterRight.length < 5) return null;
  
  const handleLow = afterRight.reduce((min, c) => Math.min(min, c.low), Infinity);
  const handlePullback = rightRim.price - handleLow;
  
  // REQUISITO: Retroceso del asa máx 38% de la profundidad de la copa
  if (handlePullback > depth * 0.38) return null;
  
  // REQUISITO: Asa no debe ser demasiado larga
  if (afterRight.length > 25) return null;

  // REQUISITO: Tendencia previa alcista
  if (!checkTrend(candles, leftRim.index, Math.min(40, leftRim.index), "up")) return null;

  const lastPrice = candles[candles.length - 1].close;
  const isTriggered = lastPrice > rimAvg;
  const projection = rimAvg + depth;
  const stopLoss = handleLow * 0.99;

  return {
    kind: "cup-handle",
    name: isTriggered ? "Copa y Asa (Confirmada)" : "Copa y Asa",
    description: `Patrón de continuación alcista. ${isTriggered ? "Ruptura del borde confirmada." : "Esperar ruptura del borde."} Objetivo: ${projection.toFixed(2)}`,
    confidence: isTriggered ? 0.88 : 0.75,
    projection: Number(projection.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    markers: [{ time: rightRim.time, position: "aboveBar", color: "#00c074", shape: "circle", text: "C&H" }],
    lines: [
      { id: "cup-rim", name: "Resistencia (Neckline)", points: [{ time: leftRim.time, value: rimAvg }, { time: rightRim.time, value: rimAvg }, { time: candles[candles.length - 1].time, value: isTriggered ? projection : rimAvg }], color: isTriggered ? "rgba(0,192,116,0.9)" : "rgba(0,192,116,0.7)", width: 3, style: LineStyle.Dashed },
      { id: "cup-bottom", name: "Fondo de copa", points: [{ time: candles[leftRim.index + bottomIndex].time, value: bottomPrice }], color: "rgba(0,192,116,0.5)", width: 2, style: LineStyle.Dotted }
    ]
  };
};


export const detectCandlestickPatterns = (candles: CandlePoint[]): Pattern[] => {
  const patterns: Pattern[] = [];
  if (candles.length < 10) return patterns;
  
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  if (!last || !prev) return patterns;
  
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  
  // Verificar tendencia reciente (últimas 5-10 velas)
  const recentCandles = candles.slice(-10);
  const recentHigh = Math.max(...recentCandles.map(c => c.high));
  const recentLow = Math.min(...recentCandles.map(c => c.low));
  
  const isNearSupport = last.low <= recentLow * 1.02;
  const isNearResistance = last.high >= recentHigh * 0.98;
  
  // Tendencia de las últimas velas
  const downtrend = prev.close < prev.open && (prev2 ? prev2.close < prev2.open : true);
  const uptrend = prev.close > prev.open && (prev2 ? prev2.close > prev2.open : true);
  
  // === Doji ===
  // Solo significativo en zonas de soporte/resistencia o después de tendencia fuerte
  if (body <= range * 0.1 && range > 0) {
    const hasContext = isNearSupport || isNearResistance || downtrend || uptrend;
    if (hasContext) {
      const direction = isNearSupport && downtrend ? "alcista" : isNearResistance && uptrend ? "bajista" : "neutral";
      patterns.push({
        kind: "doji",
        name: "Doji",
        description: `Indecisión de mercado. Posible señal ${direction}.`,
        confidence: 0.55,
        markers: [{ time: last.time, position: "aboveBar", color: "#a0a0a0", shape: "square", text: "Doji" }],
        lines: []
      });
    }
  }
  
  // === Martillo (Hammer) ===
  // Requisitos: mecha inferior 2x+ cuerpo, contexto bajista, cerca de soporte
  if (lowerWick > 2 * body && upperWick < body * 0.5) {
    if (downtrend && isNearSupport) {
      patterns.push({
        kind: "hammer",
        name: "Martillo",
        description: "Posible reversión alcista. Requiere confirmación con cierre alcista.",
        confidence: 0.70,
        markers: [{ time: last.time, position: "belowBar", color: "#00c074", shape: "arrowUp", text: "Martillo" }],
        lines: []
      });
    }
  }
  
  // === Hombre Colgado (Hanging Man) ===
  // Requisitos: mecha inferior 2x+ cuerpo, contexto alcista, cerca de resistencia
  if (lowerWick > 2 * body && upperWick < body * 0.5) {
    if (uptrend && isNearResistance) {
      patterns.push({
        kind: "hanging-man",
        name: "Hombre Colgado",
        description: "Posible reversión bajista. Requiere confirmación con cierre bajista.",
        confidence: 0.65,
        markers: [{ time: last.time, position: "aboveBar", color: "#f66d6d", shape: "arrowDown", text: "HM" }],
        lines: []
      });
    }
  }
  
  // === Estrella Fugaz (Shooting Star) ===
  // Requisitos: mecha superior 2x+ cuerpo, cerca de resistencia
  if (upperWick > 2 * body && lowerWick < body * 0.5) {
    if (uptrend && isNearResistance) {
      patterns.push({
        kind: "shooting-star",
        name: "Estrella Fugaz",
        description: "Posible reversión bajista. Requiere confirmación.",
        confidence: 0.68,
        markers: [{ time: last.time, position: "aboveBar", color: "#f66d6d", shape: "arrowDown", text: "Star" }],
        lines: []
      });
    }
  }
  
  // === Martillo Invertido (Inverted Hammer) ===
  if (upperWick > 2 * body && lowerWick < body * 0.5) {
    if (downtrend && isNearSupport) {
      patterns.push({
        kind: "inverted-hammer",
        name: "Martillo Invertido",
        description: "Posible reversión alcista. Requiere confirmación con cierre alcista.",
        confidence: 0.62,
        markers: [{ time: last.time, position: "belowBar", color: "#00c074", shape: "arrowUp", text: "InvH" }],
        lines: []
      });
    }
  }
  
  return patterns;
};


export const buildAnalysis = (candles: CandlePoint[], volumes: VolumePoint[]): AnalysisResult => {
  if (candles.length === 0) {
    return { candles: [], volumes: [], patterns: [], support: [] };
  }
  
  const swings = findSwings(candles, 8);
  const patterns: Pattern[] = [];

  const doubleTop = detectDoubleTop(candles, swings, volumes);
  if (doubleTop) patterns.push(doubleTop);

  const doubleBottom = detectDoubleBottom(candles, swings, volumes);
  if (doubleBottom) patterns.push(doubleBottom);

  const headShoulders = detectHeadAndShoulders(candles, swings, volumes);
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

  const wedge = detectWedge(candles, swings);
  if (wedge) patterns.push(wedge);

  const tripleTop = detectTripleTop(candles, swings);
  if (tripleTop) patterns.push(tripleTop);

  const tripleBottom = detectTripleBottom(candles, swings);
  if (tripleBottom) patterns.push(tripleBottom);

  const rectangle = detectRectangle(candles, swings);
  if (rectangle) patterns.push(rectangle);

  const flag = detectFlag(candles, swings, volumes);
  if (flag) patterns.push(flag);

  const cup = detectCupAndHandle(candles, swings);
  if (cup) patterns.push(cup);

  const candlestick = detectCandlestickPatterns(candles);
  patterns.push(...candlestick);

  const supportLines = buildSupportResistance(candles, swings);

  return { candles, volumes, patterns, support: supportLines };
};
