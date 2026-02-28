import type { AnalysisRunPayload, AnalysisResultPayload, TechnicalWorkerOutgoingMessage } from "@/types/technicalWorker";
import { TECHNICAL_WORKER_MESSAGE_TYPE } from "@/types/technicalWorker";

type PendingRequest = {
  resolve: (_value: AnalysisResultPayload) => void;
  reject: (_reason: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type WorkerRequestHandle = {
  requestId: string;
  promise: Promise<AnalysisResultPayload>;
};

export type TechnicalAnalysisWorkerClientOptions = {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 4500;

const createRequestId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isAnalysisResultMessage = (
  message: TechnicalWorkerOutgoingMessage
): message is Extract<TechnicalWorkerOutgoingMessage, { type: typeof TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RESULT }> =>
  message.type === TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RESULT;

export class TechnicalAnalysisWorkerClient {
  private worker: Worker;

  private pendingByRequestId = new Map<string, PendingRequest>();

  constructor(worker?: Worker) {
    this.worker = worker ?? new Worker(new URL("../workers/technicalAnalysis.worker.ts", import.meta.url));
    this.worker.onmessage = this.handleWorkerMessage;
    this.worker.onerror = this.handleWorkerError;
  }

  runAnalysis(payload: AnalysisRunPayload, options: TechnicalAnalysisWorkerClientOptions = {}): WorkerRequestHandle {
    const requestId = createRequestId();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const promise = new Promise<AnalysisResultPayload>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingByRequestId.delete(requestId);
        this.worker.postMessage({
          type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_CANCEL,
          requestId,
          payload: {},
        });
        reject(new Error(`Technical analysis worker timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingByRequestId.set(requestId, { resolve, reject, timeoutId });
      this.worker.postMessage({
        type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_RUN,
        requestId,
        payload,
      });
    });

    return { requestId, promise };
  }

  cancel(requestId: string): void {
    const pending = this.pendingByRequestId.get(requestId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingByRequestId.delete(requestId);
      pending.reject(new DOMException("Analysis request canceled", "AbortError"));
    }

    this.worker.postMessage({
      type: TECHNICAL_WORKER_MESSAGE_TYPE.ANALYSIS_CANCEL,
      requestId,
      payload: {},
    });
  }

  dispose(): void {
    for (const [requestId, pending] of this.pendingByRequestId) {
      clearTimeout(pending.timeoutId);
      pending.reject(new DOMException(`Analysis request disposed (${requestId})`, "AbortError"));
    }
    this.pendingByRequestId.clear();
    this.worker.terminate();
  }

  private handleWorkerMessage = (event: MessageEvent<TechnicalWorkerOutgoingMessage>): void => {
    const message = event.data;
    const pending = this.pendingByRequestId.get(message.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingByRequestId.delete(message.requestId);

    if (isAnalysisResultMessage(message)) {
      pending.resolve(message.payload);
      return;
    }

    pending.reject(new Error(message.payload.message));
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    const message = event.message || "Technical analysis worker crashed";
    for (const [, pending] of this.pendingByRequestId) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(message));
    }
    this.pendingByRequestId.clear();
  };
}
