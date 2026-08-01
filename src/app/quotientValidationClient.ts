import {
  QuotientValidationCancelledError,
  QuotientValidationError,
  validateQuotientComplexProgressive,
  type QuotientComplex,
} from "../quotient";
import type {
  QuotientValidationWorkerRequest,
  QuotientValidationWorkerResponse,
} from "./quotientValidationWorkerTypes";
import { quotientValidationTransferables } from "./quotientValidationWorkerTypes";

export type QuotientImportStage =
  | "idle"
  | "reading"
  | "parsing"
  | "validating"
  | "complete"
  | "failed"
  | "cancelled";

export interface QuotientImportProgressSnapshot {
  readonly stage: QuotientImportStage;
  readonly phase: string;
  readonly completed: number;
  readonly total: number;
  readonly progress: number;
  readonly message: string;
}

export interface QuotientValidationClientResult {
  quotient: QuotientComplex;
  warnings: string[];
  parseMs: number;
  validationMs: number;
}

export interface QuotientValidationClientOptions {
  canUseWorker?: boolean;
  chunkSize?: number;
  workerFactory?: () => Worker | undefined;
}

interface PendingValidation {
  resolve: (result: QuotientValidationClientResult) => void;
  reject: (error: Error) => void;
}

const idleSnapshot: QuotientImportProgressSnapshot = Object.freeze({
  stage: "idle",
  phase: "idle",
  completed: 0,
  total: 0,
  progress: 0,
  message: "No quotient import is running.",
});

/**
 * Owns the long-lived quotient validator worker. Large JSON bytes are
 * transferred once; progress lives outside React so a validation chunk does
 * not rerender the viewer or its control rails.
 */
export class QuotientValidationClient {
  private readonly canUseWorker: boolean;
  private readonly chunkSize: number;
  private readonly workerFactory: (() => Worker | undefined) | undefined;
  private readonly pending = new Map<number, PendingValidation>();
  private readonly listeners = new Set<() => void>();
  private worker: Worker | undefined;
  private nextRequestId = 1;
  private activeRequestId: number | undefined;
  private snapshot = idleSnapshot;

  constructor(options: QuotientValidationClientOptions = {}) {
    this.canUseWorker = options.canUseWorker ?? true;
    this.chunkSize = Math.max(128, Math.trunc(options.chunkSize ?? 2_048));
    this.workerFactory = options.workerFactory;
  }

  getSnapshot = (): QuotientImportProgressSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async validateFile(file: File): Promise<QuotientValidationClientResult> {
    this.cancelActive("A newer quotient import replaced this validation.");
    const requestId = this.nextRequestId++;
    this.activeRequestId = requestId;
    this.publish({
      stage: "reading",
      phase: "file",
      completed: 0,
      total: file.size,
      progress: 0,
      message: `Reading ${file.name}...`,
    });

    const buffer = await readFileArrayBuffer(file);
    if (this.activeRequestId !== requestId) {
      throw new QuotientValidationCancelledError();
    }

    const worker = this.ensureWorker();
    if (!worker) {
      return this.validateOnMainThread(requestId, buffer);
    }

    return new Promise<QuotientValidationClientResult>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      const request: QuotientValidationWorkerRequest = {
        type: "validate-quotient-json",
        requestId,
        jsonBuffer: buffer,
        chunkSize: this.chunkSize,
      };
      worker.postMessage(request, quotientValidationTransferables(request));
    });
  }

  cancel(): void {
    this.cancelActive("Quotient validation was cancelled.");
  }

  resetProgress(): void {
    if (this.activeRequestId === undefined) {
      this.publish(idleSnapshot);
    }
  }

  dispose(): void {
    this.cancelActive("Quotient validation client was disposed.");
    this.worker?.terminate();
    this.worker = undefined;
    this.listeners.clear();
  }

  private ensureWorker(): Worker | undefined {
    if (!this.canUseWorker || typeof Worker === "undefined") {
      return undefined;
    }
    if (this.worker) {
      return this.worker;
    }

    const worker =
      this.workerFactory?.() ??
      new Worker(new URL("./quotientValidationWorker.ts", import.meta.url), {
        type: "module",
      });
    this.worker = worker;
    worker.onmessage = (
      event: MessageEvent<QuotientValidationWorkerResponse>,
    ) => this.handleWorkerMessage(event.data);
    worker.onmessageerror = () =>
      this.failWorker("Quotient validator could not deserialize a message.");
    worker.onerror = (event) =>
      this.failWorker(event.message || "Quotient validator worker failed.");
    return worker;
  }

  private handleWorkerMessage(
    response: QuotientValidationWorkerResponse,
  ): void {
    const pending = this.pending.get(response.requestId);
    if (!pending || response.requestId !== this.activeRequestId) {
      return;
    }

    if (response.type === "quotient-validation-progress") {
      const parsing = response.stage === "parse";
      const progress = parsing
        ? response.phaseProgress * 0.12
        : 0.12 + response.overallProgress * 0.88;
      this.publish({
        stage: parsing ? "parsing" : "validating",
        phase: response.phase,
        completed: response.completed,
        total: response.total,
        progress,
        message: parsing
          ? "Parsing quotient JSON off the main thread..."
          : `Checking quotient ${humanizePhase(response.phase)}...`,
      });
      return;
    }

    this.pending.delete(response.requestId);
    this.activeRequestId = undefined;
    if (response.type === "quotient-validation-success") {
      this.publish({
        stage: "complete",
        phase: "complete",
        completed: 1,
        total: 1,
        progress: 1,
        message: quotientValidationCompleteMessage(response.quotient),
      });
      pending.resolve({
        quotient: response.quotient,
        warnings: response.warnings,
        parseMs: response.parseMs,
        validationMs: response.validationMs,
      });
      return;
    }

    if (response.type === "quotient-validation-cancelled") {
      this.publishCancelled();
      pending.reject(new QuotientValidationCancelledError());
      return;
    }

    this.publish({
      stage: "failed",
      phase: response.stage,
      completed: 0,
      total: 0,
      progress: 0,
      message: response.errors[0] ?? "Quotient validation failed.",
    });
    pending.reject(new QuotientValidationError(response.errors));
  }

  private async validateOnMainThread(
    requestId: number,
    buffer: ArrayBuffer,
  ): Promise<QuotientValidationClientResult> {
    const parseStartedAt = performanceNow();
    let parsed: unknown;
    try {
      this.publish({
        stage: "parsing",
        phase: "parse",
        completed: 0,
        total: buffer.byteLength,
        progress: 0.04,
        message: "Parsing quotient JSON...",
      });
      parsed = JSON.parse(new TextDecoder().decode(buffer)) as unknown;
    } catch (error) {
      this.activeRequestId = undefined;
      const message = error instanceof Error ? error.message : String(error);
      this.publish({
        stage: "failed",
        phase: "parse",
        completed: 0,
        total: buffer.byteLength,
        progress: 0,
        message,
      });
      throw error;
    }
    const parseMs = performanceNow() - parseStartedAt;
    const validationStartedAt = performanceNow();
    const result = await validateQuotientComplexProgressive(parsed, {
      chunkSize: this.chunkSize,
      isCancelled: () => this.activeRequestId !== requestId,
      onProgress: (progress) => {
        this.publish({
          stage: "validating",
          phase: progress.phase,
          completed: progress.completed,
          total: progress.total,
          progress: 0.12 + progress.overallProgress * 0.88,
          message: `Checking quotient ${humanizePhase(progress.phase)}...`,
        });
      },
    });
    const validationMs = performanceNow() - validationStartedAt;
    if (!result.ok || result.value === undefined) {
      this.activeRequestId = undefined;
      this.publish({
        stage: "failed",
        phase: "validation",
        completed: 0,
        total: 0,
        progress: 0,
        message: result.errors[0] ?? "Quotient validation failed.",
      });
      throw new QuotientValidationError(result.errors);
    }
    this.activeRequestId = undefined;
    this.publish({
      stage: "complete",
      phase: "complete",
      completed: 1,
      total: 1,
      progress: 1,
      message: quotientValidationCompleteMessage(result.value),
    });
    return {
      quotient: result.value,
      warnings: result.warnings,
      parseMs,
      validationMs,
    };
  }

  private cancelActive(message: string): void {
    const requestId = this.activeRequestId;
    if (requestId === undefined) {
      return;
    }
    this.activeRequestId = undefined;
    this.worker?.postMessage({
      type: "cancel-quotient-validation",
      requestId,
    } satisfies QuotientValidationWorkerRequest);
    const pending = this.pending.get(requestId);
    this.pending.delete(requestId);
    pending?.reject(new QuotientValidationCancelledError());
    this.publish({
      stage: "cancelled",
      phase: "cancelled",
      completed: 0,
      total: 0,
      progress: 0,
      message,
    });
  }

  private failWorker(message: string): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
    this.activeRequestId = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.publish({
      stage: "failed",
      phase: "worker",
      completed: 0,
      total: 0,
      progress: 0,
      message,
    });
  }

  private publish(next: QuotientImportProgressSnapshot): void {
    const frozen = Object.freeze({
      ...next,
      progress: Math.max(0, Math.min(1, next.progress)),
    });
    if (sameProgress(this.snapshot, frozen)) {
      return;
    }
    this.snapshot = frozen;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private publishCancelled(): void {
    this.publish({
      stage: "cancelled",
      phase: "cancelled",
      completed: 0,
      total: 0,
      progress: 0,
      message: "Quotient validation was cancelled.",
    });
  }
}

export function createQuotientValidationClient(
  options: QuotientValidationClientOptions = {},
): QuotientValidationClient {
  return new QuotientValidationClient(options);
}

function humanizePhase(phase: string): string {
  return phase.replaceAll("-", " ");
}

function sameProgress(
  left: QuotientImportProgressSnapshot,
  right: QuotientImportProgressSnapshot,
): boolean {
  return (
    left.stage === right.stage &&
    left.phase === right.phase &&
    left.completed === right.completed &&
    left.total === right.total &&
    Math.abs(left.progress - right.progress) < 0.002 &&
    left.message === right.message
  );
}

function performanceNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function quotientValidationCompleteMessage(quotient: QuotientComplex): string {
  return `Quotient parsed and validated: ${quotient.vertices.length.toLocaleString()} vertices, ${quotient.edges.length.toLocaleString()} edges, ${quotient.twoCells.length.toLocaleString()} relation cells.`;
}

function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name} as binary data.`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
