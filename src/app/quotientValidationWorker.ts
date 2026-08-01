import {
  QuotientValidationCancelledError,
  validateQuotientComplexProgressive,
} from "../quotient/validation";
import type {
  QuotientValidationWorkerFailure,
  QuotientValidationWorkerProgress,
  QuotientValidationWorkerRequest,
  QuotientValidationWorkerResponse,
  ValidateQuotientBufferRequest,
  ValidateQuotientTextRequest,
} from "./quotientValidationWorkerTypes";
import {
  validationFailureResponse,
  validationProgressResponse,
} from "./quotientValidationWorkerTypes";

type ValidateRequest =
  | ValidateQuotientBufferRequest
  | ValidateQuotientTextRequest;

const activeRequests = new Map<number, AbortController>();
const textDecoder = new TextDecoder();

function postResponse(response: QuotientValidationWorkerResponse): void {
  self.postMessage(response);
}

function postParseProgress(
  requestId: number,
  completed: number,
  total: number,
): void {
  const phaseProgress = total === 0 ? 1 : Math.min(1, completed / total);
  const response: QuotientValidationWorkerProgress = {
    type: "quotient-validation-progress",
    requestId,
    stage: "parse",
    phase: "parse",
    completed,
    total,
    phaseProgress,
    overallProgress: phaseProgress,
  };
  postResponse(response);
}

function requestFailure(
  requestId: number,
  stage: QuotientValidationWorkerFailure["stage"],
  message: string,
): void {
  postResponse({
    type: "quotient-validation-failure",
    requestId,
    stage,
    errors: [message],
    warnings: [],
  });
}

function sourceText(request: ValidateRequest): {
  text: string;
  sourceSize: number;
} {
  const jsonBuffer = request.jsonBuffer;
  const jsonText = request.jsonText;
  const hasBuffer = jsonBuffer instanceof ArrayBuffer;
  const hasText = typeof jsonText === "string";

  if (hasBuffer === hasText) {
    throw new Error(
      "Provide exactly one quotient JSON payload: transferred jsonBuffer (preferred) or jsonText (fallback).",
    );
  }

  if (hasBuffer) {
    return {
      text: textDecoder.decode(jsonBuffer),
      sourceSize: jsonBuffer.byteLength,
    };
  }

  if (hasText) {
    return { text: jsonText, sourceSize: jsonText.length };
  }

  throw new Error("Quotient JSON payload is unavailable.");
}

function yieldToWorkerQueue(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function validateRequest(
  request: ValidateRequest,
  controller: AbortController,
): Promise<void> {
  let decoded: { text: string; sourceSize: number };
  try {
    decoded = sourceText(request);
  } catch (error) {
    requestFailure(
      request.requestId,
      "request",
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  postParseProgress(request.requestId, 0, decoded.sourceSize);
  await yieldToWorkerQueue();
  if (controller.signal.aborted) {
    throw new QuotientValidationCancelledError();
  }

  const parseStartedAt = performance.now();
  let parsed: unknown;
  try {
    // JSON.parse is atomic, but it runs entirely in this worker. The UI thread
    // only transfers the source bytes and receives bounded progress messages.
    parsed = JSON.parse(decoded.text) as unknown;
  } catch (error) {
    requestFailure(
      request.requestId,
      "parse",
      error instanceof Error ? error.message : String(error),
    );
    return;
  }
  const parseMs = performance.now() - parseStartedAt;
  postParseProgress(request.requestId, decoded.sourceSize, decoded.sourceSize);

  // Release the decoded source before the graph validator starts retaining
  // indexes for the parsed quotient.
  decoded.text = "";
  await yieldToWorkerQueue();
  if (controller.signal.aborted) {
    throw new QuotientValidationCancelledError();
  }

  const validationStartedAt = performance.now();
  const result = await validateQuotientComplexProgressive(parsed, {
    chunkSize: request.chunkSize,
    signal: controller.signal,
    onProgress: (progress) =>
      postResponse(validationProgressResponse(request.requestId, progress)),
    yieldControl: yieldToWorkerQueue,
  });
  const validationMs = performance.now() - validationStartedAt;

  if (!result.ok || result.value === undefined) {
    postResponse(validationFailureResponse(request.requestId, result));
    return;
  }

  postResponse({
    type: "quotient-validation-success",
    requestId: request.requestId,
    quotient: result.value,
    warnings: result.warnings,
    parseMs,
    validationMs,
  });
}

self.onmessage = (event: MessageEvent<QuotientValidationWorkerRequest>) => {
  const request = event.data;

  if (request.type === "cancel-quotient-validation") {
    activeRequests.get(request.requestId)?.abort();
    return;
  }

  // One worker should never retain several giant parsed quotients at once.
  // A new import supersedes stale work; each older request receives a
  // cancellation response when it next reaches a cooperative yield.
  for (const activeController of activeRequests.values()) {
    activeController.abort();
  }
  const controller = new AbortController();
  activeRequests.set(request.requestId, controller);

  void validateRequest(request, controller)
    .catch((error: unknown) => {
      if (
        error instanceof QuotientValidationCancelledError ||
        controller.signal.aborted
      ) {
        postResponse({
          type: "quotient-validation-cancelled",
          requestId: request.requestId,
        });
        return;
      }

      requestFailure(
        request.requestId,
        "worker",
        error instanceof Error ? error.message : String(error),
      );
    })
    .finally(() => {
      if (activeRequests.get(request.requestId) === controller) {
        activeRequests.delete(request.requestId);
      }
    });
};
