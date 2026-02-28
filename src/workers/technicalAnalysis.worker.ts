import { computeIncrementalTechnicalAnalysis } from "@/lib/incrementalTechnicalEngine";
import { computeIndicatorBundle, type IndicatorBundle, type IndicatorComputationFilters } from "@/lib/indicatorAnalysis";
import {
  TECHNICAL_WORKER_MESSAGE_TYPE,
  type AnalysisRunMessage,
  type TechnicalWorkerIncomingMessage,
  type TechnicalWorkerOutgoingMessage,
} from "@/types/technicalWorker";

const canceledRequestIds = new Set<string>();
const indicatorBundleCacheBySeriesKey = new Map<string, { signature: string; indicatorBundle: IndicatorBundle }>();
const INDICATOR_CACHE_MAX_KEYS = 32;

const postWorkerMessage = (message: TechnicalWorkerOutgoingMessage): void => {
  self.postMessage(message);
};

const postAnalysisError = (requestId: string, message: string): void => {
  postWorkerMessage({
    type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_ERROR,
    requestId,
    payload: { message },
  });
};

const hasRequestId = (value: unknown): value is { requestId: string } => {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { requestId?: unknown }).requestId === "string";
};

const isAnalysisCancelMessage = (
  value: TechnicalWorkerIncomingMessage
): value is Extract<TechnicalWorkerIncomingMessage, { type: "ANALYSIS_CANCEL" }> =>
  value.type === TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_CANCEL;

const isAnalysisRunMessage = (
  value: TechnicalWorkerIncomingMessage
): value is AnalysisRunMessage => value.type === TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RUN;

const toSeriesKey = (symbol: string, timeframe: string): string => `${symbol.toUpperCase()}|${timeframe}`;

const toFilterSignature = (filters: IndicatorComputationFilters): string =>
  [
    filters.sma20,
    filters.ema50,
    filters.ema200,
    filters.bollinger,
    filters.vwap,
    filters.macd,
    filters.atrBands,
    filters.supertrend,
    filters.ichimoku,
    filters.pivots,
  ]
    .map((value) => (value ? "1" : "0"))
    .join("");

const cacheIndicatorBundle = ({
  seriesKey,
  signature,
  indicatorBundle,
}: {
  seriesKey: string;
  signature: string;
  indicatorBundle: IndicatorBundle;
}): void => {
  if (indicatorBundleCacheBySeriesKey.size >= INDICATOR_CACHE_MAX_KEYS) {
    const oldestKey = indicatorBundleCacheBySeriesKey.keys().next().value;
    if (oldestKey) {
      indicatorBundleCacheBySeriesKey.delete(oldestKey);
    }
  }
  indicatorBundleCacheBySeriesKey.set(seriesKey, { signature, indicatorBundle });
};

self.onmessage = (event: MessageEvent<TechnicalWorkerIncomingMessage>): void => {
  const message = event.data;

  if (!hasRequestId(message)) {
    return;
  }

  const { requestId } = message;

  if (isAnalysisCancelMessage(message)) {
    canceledRequestIds.add(requestId);
    return;
  }

  if (!isAnalysisRunMessage(message)) {
    postAnalysisError(requestId, "Unsupported worker message type");
    return;
  }

  if (canceledRequestIds.has(requestId)) {
    canceledRequestIds.delete(requestId);
    return;
  }

  try {
    const { analysis, metrics } = computeIncrementalTechnicalAnalysis(message.payload);
    if (canceledRequestIds.has(requestId)) {
      canceledRequestIds.delete(requestId);
      return;
    }

    const lastCandleTime = analysis.candles[analysis.candles.length - 1]?.time ?? "none";
    const seriesKey = toSeriesKey(message.payload.symbol, message.payload.timeframe);
    const signature = `${analysis.candles.length}|${lastCandleTime}|${toFilterSignature(
      message.payload.indicatorFilters
    )}`;
    const cachedIndicator = indicatorBundleCacheBySeriesKey.get(seriesKey);
    const indicatorStarted = performance.now();
    const indicatorBundle =
      cachedIndicator && cachedIndicator.signature === signature
        ? cachedIndicator.indicatorBundle
        : computeIndicatorBundle({
            candles: analysis.candles,
            volumes: analysis.volumes,
            indicatorFilters: message.payload.indicatorFilters,
          });
    if (!(cachedIndicator && cachedIndicator.signature === signature)) {
      cacheIndicatorBundle({ seriesKey, signature, indicatorBundle });
    }
    const indicatorMetrics = {
      mode:
        cachedIndicator && cachedIndicator.signature === signature
          ? ("cache-hit" as const)
          : ("full" as const),
      durationMs:
        cachedIndicator && cachedIndicator.signature === signature
          ? 0
          : Number((performance.now() - indicatorStarted).toFixed(2)),
    };

    if (canceledRequestIds.has(requestId)) {
      canceledRequestIds.delete(requestId);
      return;
    }

    postWorkerMessage({
      type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RESULT,
      requestId,
      payload: { analysis, metrics, indicatorBundle, indicatorMetrics },
    });
  } catch (error) {
    if (canceledRequestIds.has(requestId)) {
      canceledRequestIds.delete(requestId);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown analysis worker error";
    postAnalysisError(requestId, errorMessage);
  }
};
