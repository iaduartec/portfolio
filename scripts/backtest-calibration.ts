import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildAnalysis, type CandlePoint, type Pattern, type VolumePoint } from "@/lib/technical-analysis";

type Direction = "bullish" | "bearish";
type ConfidenceBand = "high" | "medium" | "low";

type Sample = {
  raw: number;
  calibrated: number;
  rawBand: ConfidenceBand;
  calibratedBand: ConfidenceBand;
  outcome: boolean;
};

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

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const toBand = (confidence: number): ConfidenceBand => {
  if (confidence >= 0.82) return "high";
  if (confidence >= 0.66) return "medium";
  return "low";
};

const toDirection = (pattern: Pattern): Direction | null => {
  if (bullishKinds.has(pattern.kind)) return "bullish";
  if (bearishKinds.has(pattern.kind)) return "bearish";
  return null;
};

const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

const generateSeries = (
  length: number,
  drift: number,
  volatility: number,
  seed: number
): { candles: CandlePoint[]; volumes: VolumePoint[] } => {
  const rand = createRng(seed);
  const candles: CandlePoint[] = [];
  const volumes: VolumePoint[] = [];
  let price = 100 + seed % 50;
  const start = Date.UTC(2021, 0, 1);

  for (let i = 0; i < length; i += 1) {
    const noise = (rand() - 0.5) * volatility;
    const ret = drift + noise;
    const open = price;
    const close = Math.max(1, open * (1 + ret));
    const wickUp = Math.abs((rand() - 0.5) * volatility * 0.9);
    const wickDown = Math.abs((rand() - 0.5) * volatility * 0.9);
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);
    const time = new Date(start + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    candles.push({
      time,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
    });
    const vol = 800_000 + Math.round(rand() * 1_500_000);
    volumes.push({
      time,
      value: vol,
      color: close >= open ? "rgba(0,192,116,0.5)" : "rgba(246,70,93,0.5)",
    });
    price = close;
  }

  return { candles, volumes };
};

const evaluateOutcome = (
  direction: Direction,
  lastClose: number,
  futureCandles: CandlePoint[],
  threshold = 0.015
) => {
  if (futureCandles.length === 0 || lastClose <= 0) return false;
  const futureMax = Math.max(...futureCandles.map((c) => c.high));
  const futureMin = Math.min(...futureCandles.map((c) => c.low));
  const upMove = (futureMax - lastClose) / lastClose;
  const downMove = (lastClose - futureMin) / lastClose;
  if (direction === "bullish") return upMove >= threshold && upMove > downMove;
  return downMove >= threshold && downMove > upMove;
};

const hitRate = (arr: Sample[]) => {
  if (arr.length === 0) return 0;
  return arr.filter((s) => s.outcome).length / arr.length;
};

const byBand = (samples: Sample[], key: "rawBand" | "calibratedBand") => {
  const high = samples.filter((s) => s[key] === "high");
  const medium = samples.filter((s) => s[key] === "medium");
  const low = samples.filter((s) => s[key] === "low");
  return {
    high: { count: high.length, hitRate: hitRate(high) },
    medium: { count: medium.length, hitRate: hitRate(medium) },
    low: { count: low.length, hitRate: hitRate(low) },
  };
};

const run = async () => {
  const scenarios = [
    { drift: 0.0015, volatility: 0.018, seed: 11 },
    { drift: -0.0012, volatility: 0.02, seed: 21 },
    { drift: 0.0004, volatility: 0.035, seed: 31 },
    { drift: -0.0003, volatility: 0.032, seed: 41 },
    { drift: 0.0018, volatility: 0.014, seed: 51 },
    { drift: 0.0, volatility: 0.038, seed: 61 },
  ];

  const samples: Sample[] = [];
  const lookback = 140;
  const horizon = 10;
  const step = 4;

  for (const scenario of scenarios) {
    const series = generateSeries(320, scenario.drift, scenario.volatility, scenario.seed);
    for (let end = lookback; end < series.candles.length - horizon; end += step) {
      const candles = series.candles.slice(0, end);
      const volumes = series.volumes.slice(0, end);
      const future = series.candles.slice(end, end + horizon);
      const analysis = buildAnalysis(candles, volumes);
      const lastClose = candles[candles.length - 1]?.close ?? 0;

      analysis.patterns.forEach((pattern) => {
        const direction = toDirection(pattern);
        if (!direction) return;
        const raw = clamp(pattern.rawConfidence ?? pattern.confidence, 0.45, 0.99);
        const calibrated = clamp(pattern.calibratedConfidence ?? pattern.confidence, 0.45, 0.99);
        samples.push({
          raw,
          calibrated,
          rawBand: toBand(raw),
          calibratedBand: toBand(calibrated),
          outcome: evaluateOutcome(direction, lastClose, future),
        });
      });
    }
  }

  if (samples.length === 0) {
    throw new Error("No samples generated for calibration backtest.");
  }

  const baselineCoverage = samples.filter((s) => s.raw >= 0.55).length / samples.length;
  const calibratedCoverage = samples.filter((s) => s.calibrated >= 0.55).length / samples.length;
  const coverageDelta = calibratedCoverage - baselineCoverage;
  const rawBands = byBand(samples, "rawBand");
  const calibratedBands = byBand(samples, "calibratedBand");
  const highBandLift = calibratedBands.high.hitRate - rawBands.high.hitRate;

  const gateCoverage = Math.abs(coverageDelta) <= 0.1;
  const gateHighBand = highBandLift >= 0;
  const pass = gateCoverage && gateHighBand;

  const report = {
    generatedAt: new Date().toISOString(),
    sampleCount: samples.length,
    baselineCoverage,
    calibratedCoverage,
    coverageDelta,
    highBandLift,
    gates: {
      coverageWithin10Percent: gateCoverage,
      highBandLiftNonNegative: gateHighBand,
      pass,
    },
    rawBands,
    calibratedBands,
  };

  const metricsPath = resolve(
    process.cwd(),
    "docs/plans/2026-02-28-swing-confidence-calibration-metrics.md"
  );
  const jsonPath = resolve(
    process.cwd(),
    "docs/plans/2026-02-28-swing-confidence-calibration-metrics.json"
  );

  await mkdir(dirname(metricsPath), { recursive: true });
  const markdown = [
    "# Swing Confidence Calibration Metrics",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Samples: ${report.sampleCount}`,
    `- Baseline coverage (raw >= 0.55): ${(report.baselineCoverage * 100).toFixed(2)}%`,
    `- Calibrated coverage (>= 0.55): ${(report.calibratedCoverage * 100).toFixed(2)}%`,
    `- Coverage delta: ${(report.coverageDelta * 100).toFixed(2)}%`,
    `- High-band lift (calibrated - raw): ${(report.highBandLift * 100).toFixed(2)}%`,
    "",
    "## Gates",
    `- Coverage ±10%: ${report.gates.coverageWithin10Percent ? "PASS" : "FAIL"}`,
    `- High band lift >= 0: ${report.gates.highBandLiftNonNegative ? "PASS" : "FAIL"}`,
    `- Overall: ${report.gates.pass ? "PASS" : "FAIL"}`,
    "",
    "## Raw Bands",
    `- High: ${report.rawBands.high.count} | hit-rate ${(report.rawBands.high.hitRate * 100).toFixed(2)}%`,
    `- Medium: ${report.rawBands.medium.count} | hit-rate ${(report.rawBands.medium.hitRate * 100).toFixed(2)}%`,
    `- Low: ${report.rawBands.low.count} | hit-rate ${(report.rawBands.low.hitRate * 100).toFixed(2)}%`,
    "",
    "## Calibrated Bands",
    `- High: ${report.calibratedBands.high.count} | hit-rate ${(report.calibratedBands.high.hitRate * 100).toFixed(2)}%`,
    `- Medium: ${report.calibratedBands.medium.count} | hit-rate ${(report.calibratedBands.medium.hitRate * 100).toFixed(2)}%`,
    `- Low: ${report.calibratedBands.low.count} | hit-rate ${(report.calibratedBands.low.hitRate * 100).toFixed(2)}%`,
    "",
  ].join("\n");

  await writeFile(metricsPath, markdown, "utf8");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));

  if (!pass) {
    process.exitCode = 1;
  }
};

run().catch((err) => {
  console.error("Calibration backtest failed:", err);
  process.exit(1);
});

