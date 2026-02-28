import type { Pattern } from "@/lib/technical-analysis";
import type { SwingRegime } from "@/lib/signalCalibration";

export type CalibrationTelemetryEvent = {
  patternKind: Pattern["kind"];
  rawConfidence: number;
  calibratedConfidence: number;
  confidenceBand: "high" | "medium" | "low";
  calibrationReason: string;
  regime: SwingRegime;
};

const telemetryEnabled =
  process.env.NEXT_PUBLIC_SIGNAL_CALIBRATION_TELEMETRY === "1" ||
  process.env.SIGNAL_CALIBRATION_TELEMETRY === "1";

export const reportCalibrationTelemetry = (event: CalibrationTelemetryEvent) => {
  if (!telemetryEnabled) return;
  // Structured payload for later ingestion (stdout/collector).
  console.debug("[signal-calibration]", JSON.stringify(event));
};

