import type {
  QuotientComplex,
  QuotientValidationResult,
} from "../quotient/types";
import type {
  QuotientValidationPhase,
  QuotientValidationProgress,
} from "../quotient/validation";

interface ValidateQuotientRequestBase {
  type: "validate-quotient-json";
  requestId: number;
  chunkSize?: number;
}

/**
 * Preferred huge-file request. Transfer `jsonBuffer` when posting this message
 * so the main thread does not retain and clone a second giant JSON string.
 */
export interface ValidateQuotientBufferRequest extends ValidateQuotientRequestBase {
  jsonBuffer: ArrayBuffer;
  jsonText?: never;
}

/** Small-file and test fallback; large imports should use the buffer request. */
export interface ValidateQuotientTextRequest extends ValidateQuotientRequestBase {
  jsonBuffer?: never;
  jsonText: string;
}

export interface CancelQuotientValidationRequest {
  type: "cancel-quotient-validation";
  requestId: number;
}

export type QuotientValidationWorkerRequest =
  | ValidateQuotientBufferRequest
  | ValidateQuotientTextRequest
  | CancelQuotientValidationRequest;

export interface QuotientValidationWorkerProgress {
  type: "quotient-validation-progress";
  requestId: number;
  stage: "parse" | "validation";
  phase: "parse" | QuotientValidationPhase;
  completed: number;
  total: number;
  phaseProgress: number;
  overallProgress: number;
}

export interface QuotientValidationWorkerSuccess {
  type: "quotient-validation-success";
  requestId: number;
  quotient: QuotientComplex;
  warnings: string[];
  parseMs: number;
  validationMs: number;
}

export interface QuotientValidationWorkerFailure {
  type: "quotient-validation-failure";
  requestId: number;
  stage: "request" | "parse" | "validation" | "worker";
  errors: string[];
  warnings: string[];
}

export interface QuotientValidationWorkerCancelled {
  type: "quotient-validation-cancelled";
  requestId: number;
}

export type QuotientValidationWorkerResponse =
  | QuotientValidationWorkerProgress
  | QuotientValidationWorkerSuccess
  | QuotientValidationWorkerFailure
  | QuotientValidationWorkerCancelled;

/** Transfer list to pass as the second argument to `worker.postMessage`. */
export function quotientValidationTransferables(
  request: QuotientValidationWorkerRequest,
): Transferable[] {
  return request.type === "validate-quotient-json" && request.jsonBuffer
    ? [request.jsonBuffer]
    : [];
}

export function validationProgressResponse(
  requestId: number,
  progress: QuotientValidationProgress,
): QuotientValidationWorkerProgress {
  return {
    type: "quotient-validation-progress",
    requestId,
    stage: "validation",
    ...progress,
  };
}

export function validationFailureResponse(
  requestId: number,
  result: QuotientValidationResult,
): QuotientValidationWorkerFailure {
  return {
    type: "quotient-validation-failure",
    requestId,
    stage: "validation",
    errors: result.errors,
    warnings: result.warnings,
  };
}
