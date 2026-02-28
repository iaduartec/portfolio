import {
  buildAnalysis,
  type AnalysisResult,
  type CandlePoint,
  type Pattern,
  type PatternLine,
  type VolumePoint,
} from "@/lib/technical-analysis";

const INCREMENTAL_OVERLAP_BARS = 320;

export type IncrementalEngineMode = "cache-hit" | "incremental" | "full";

export type IncrementalEngineMetrics = {
  durationMs: number;
  mode: IncrementalEngineMode;
};

type IncrementalEngineInput = {
  symbol: string;
  timeframe: string;
  candles: CandlePoint[];
  volumes: VolumePoint[];
};

type IncrementalEngineOutput = {
  analysis: AnalysisResult;
  metrics: IncrementalEngineMetrics;
};

type CacheEntry = {
  candles: CandlePoint[];
  volumes: VolumePoint[];
  analysis: AnalysisResult;
};

const cacheByKey = new Map<string, CacheEntry>();

const toKey = (symbol: string, timeframe: string): string =>
  `${symbol.toUpperCase()}|${timeframe}`;

const equalsCandle = (left: CandlePoint, right: CandlePoint): boolean =>
  left.time === right.time &&
  left.open === right.open &&
  left.high === right.high &&
  left.low === right.low &&
  left.close === right.close;

const equalsVolume = (left: VolumePoint, right: VolumePoint): boolean =>
  left.time === right.time && left.value === right.value && left.color === right.color;

const isAppendOnly = (previous: CacheEntry, nextCandles: CandlePoint[], nextVolumes: VolumePoint[]): boolean => {
  if (nextCandles.length < previous.candles.length || nextVolumes.length < previous.volumes.length) {
    return false;
  }

  for (let index = 0; index < previous.candles.length; index += 1) {
    if (!equalsCandle(previous.candles[index], nextCandles[index])) {
      return false;
    }
  }

  for (let index = 0; index < previous.volumes.length; index += 1) {
    if (!equalsVolume(previous.volumes[index], nextVolumes[index])) {
      return false;
    }
  }

  return true;
};

const latestTimeFromPattern = (pattern: Pattern): string | null => {
  const markerTimes = pattern.markers.map((marker) => String(marker.time));
  const lineTimes = pattern.lines.flatMap((line) => line.points.map((point) => point.time));
  const times = [...markerTimes, ...lineTimes];
  if (times.length === 0) return null;
  return times.reduce((latest, current) => (current > latest ? current : latest));
};

const latestTimeFromLine = (line: PatternLine): string | null => {
  if (line.points.length === 0) return null;
  return line.points.reduce(
    (latest, point) => (point.time > latest ? point.time : latest),
    line.points[0].time
  );
};

const dedupePatterns = (patterns: Pattern[]): Pattern[] => {
  const seen = new Set<string>();
  const merged: Pattern[] = [];
  for (const pattern of patterns) {
    const anchorTime =
      pattern.markers[0]?.time ?? pattern.lines[0]?.points[0]?.time ?? "na";
    const key = `${pattern.kind}|${String(anchorTime)}|${pattern.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(pattern);
  }
  return merged;
};

const dedupeLines = (lines: PatternLine[]): PatternLine[] => {
  const seen = new Set<string>();
  const merged: PatternLine[] = [];
  for (const line of lines) {
    const startTime = line.points[0]?.time ?? "na";
    const endTime = line.points[line.points.length - 1]?.time ?? "na";
    const key = `${line.id}|${startTime}|${endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(line);
  }
  return merged;
};

const fullCompute = (key: string, candles: CandlePoint[], volumes: VolumePoint[]): IncrementalEngineOutput => {
  const started = performance.now();
  const analysis = buildAnalysis(candles, volumes);
  const durationMs = Number((performance.now() - started).toFixed(2));
  cacheByKey.set(key, { candles, volumes, analysis });
  return { analysis, metrics: { durationMs, mode: "full" } };
};

const incrementalCompute = (
  key: string,
  cached: CacheEntry,
  candles: CandlePoint[],
  volumes: VolumePoint[]
): IncrementalEngineOutput => {
  const newCandleCount = candles.length - cached.candles.length;
  const newVolumeCount = volumes.length - cached.volumes.length;
  const isUnchanged = newCandleCount === 0 && newVolumeCount === 0;

  if (isUnchanged) {
    return {
      analysis: cached.analysis,
      metrics: { durationMs: 0, mode: "cache-hit" },
    };
  }

  const started = performance.now();
  const recomputeStart = Math.max(0, cached.candles.length - INCREMENTAL_OVERLAP_BARS);
  const splitTime = candles[recomputeStart]?.time;

  const windowAnalysis = buildAnalysis(candles.slice(recomputeStart), volumes.slice(recomputeStart));

  let patterns = windowAnalysis.patterns;
  let support = windowAnalysis.support;
  if (splitTime) {
    const stablePatterns = cached.analysis.patterns.filter((pattern) => {
      const latestTime = latestTimeFromPattern(pattern);
      return latestTime !== null && latestTime < splitTime;
    });
    const stableSupport = cached.analysis.support.filter((line) => {
      const latestTime = latestTimeFromLine(line);
      return latestTime !== null && latestTime < splitTime;
    });
    patterns = dedupePatterns([...stablePatterns, ...windowAnalysis.patterns]);
    support = dedupeLines([...stableSupport, ...windowAnalysis.support]);
  }

  const analysis: AnalysisResult = { candles, volumes, patterns, support };
  const durationMs = Number((performance.now() - started).toFixed(2));
  cacheByKey.set(key, { candles, volumes, analysis });

  return { analysis, metrics: { durationMs, mode: "incremental" } };
};

export const computeIncrementalTechnicalAnalysis = ({
  symbol,
  timeframe,
  candles,
  volumes,
}: IncrementalEngineInput): IncrementalEngineOutput => {
  const key = toKey(symbol, timeframe);
  const cached = cacheByKey.get(key);
  if (!cached) {
    return fullCompute(key, candles, volumes);
  }

  if (!isAppendOnly(cached, candles, volumes)) {
    return fullCompute(key, candles, volumes);
  }

  return incrementalCompute(key, cached, candles, volumes);
};

export const clearIncrementalTechnicalCache = (): void => {
  cacheByKey.clear();
};
