import type { IncrementalEngineMetrics } from "@/lib/incrementalTechnicalEngine";
import type {
  IndicatorBundle,
  IndicatorComputationFilters,
  IndicatorEngineMetrics,
} from "@/lib/indicatorAnalysis";
import type { AnalysisResult, CandlePoint, VolumePoint } from "@/lib/technical-analysis";

export const TECHNICAL_WORKER_MESSAGE_TYPE = {
  ANALYSIS_RUN: "ANALYSIS_RUN",
  ANALYSIS_RESULT: "ANALYSIS_RESULT",
  ANALYSIS_ERROR: "ANALYSIS_ERROR",
  ANALYSIS_CANCEL: "ANALYSIS_CANCEL",
} as const;

export type TechnicalWorkerMessageType =
  (typeof TECHNICAL_WORKER_MESSAGE_TYPE)[keyof typeof TECHNICAL_WORKER_MESSAGE_TYPE];

export type AnalysisRunPayload = {
  symbol: string;
  timeframe: string;
  candles: CandlePoint[];
  volumes: VolumePoint[];
  indicatorFilters: IndicatorComputationFilters;
};

export type AnalysisResultPayload = {
  analysis: AnalysisResult;
  metrics: IncrementalEngineMetrics;
  indicatorBundle: IndicatorBundle;
  indicatorMetrics: IndicatorEngineMetrics;
};

export type AnalysisErrorPayload = {
  message: string;
};

type TechnicalWorkerMessageBase<TType extends TechnicalWorkerMessageType, TPayload> = {
  type: TType;
  requestId: string;
  payload: TPayload;
};

export type AnalysisRunMessage = TechnicalWorkerMessageBase<
  typeof TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RUN,
  AnalysisRunPayload
>;

export type AnalysisResultMessage = TechnicalWorkerMessageBase<
  typeof TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RESULT,
  AnalysisResultPayload
>;

export type AnalysisErrorMessage = TechnicalWorkerMessageBase<
  typeof TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_ERROR,
  AnalysisErrorPayload
>;

export type AnalysisCancelMessage = TechnicalWorkerMessageBase<
  typeof TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_CANCEL,
  Record<string, never>
>;

export type TechnicalWorkerIncomingMessage = AnalysisRunMessage | AnalysisCancelMessage;

export type TechnicalWorkerOutgoingMessage = AnalysisResultMessage | AnalysisErrorMessage;
