import { computeIncrementalTechnicalAnalysis } from "@/lib/incrementalTechnicalEngine";
import {
  TECHNICAL_WORKER_MESSAGE_TYPE,
  type AnalysisRunMessage,
  type TechnicalWorkerIncomingMessage,
  type TechnicalWorkerOutgoingMessage,
} from "@/types/technicalWorker";

const canceledRequestIds = new Set<string>();

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

    postWorkerMessage({
      type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RESULT,
      requestId,
      payload: { analysis, metrics },
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
