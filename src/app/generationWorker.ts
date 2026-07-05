import { generateViewerBall } from "./generationPipeline";
import type {
  GenerationWorkerRequest,
  GenerationWorkerResponse,
} from "./generationWorkerTypes";
import type { CoxeterSystemInput } from "../types";

const systemsByHash = new Map<string, CoxeterSystemInput>();
const maxCachedSystems = 16;

function rememberSystem(inputHash: string, system: CoxeterSystemInput): void {
  systemsByHash.delete(inputHash);
  systemsByHash.set(inputHash, system);
  while (systemsByHash.size > maxCachedSystems) {
    const oldest = systemsByHash.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    systemsByHash.delete(oldest);
  }
}

function cachedSystem(inputHash: string): CoxeterSystemInput | undefined {
  const system = systemsByHash.get(inputHash);
  if (!system) {
    return undefined;
  }
  systemsByHash.delete(inputHash);
  systemsByHash.set(inputHash, system);
  return system;
}

self.onmessage = (event: MessageEvent<GenerationWorkerRequest>) => {
  const request = event.data;

  if (request.type !== "generate-ball") {
    return;
  }

  try {
    if (request.system) {
      rememberSystem(request.inputHash, request.system);
    }
    const system = cachedSystem(request.inputHash);
    if (!system) {
      throw new Error(
        `Generation worker has no cached Coxeter system for ${request.inputHash}.`,
      );
    }
    const startedAt = performance.now();
    const { ball } = generateViewerBall(system, request.options);
    const response: GenerationWorkerResponse = {
      type: "generate-ball-success",
      requestId: request.requestId,
      cacheKey: request.cacheKey,
      inputHash: request.inputHash,
      ball,
      generationMs: performance.now() - startedAt,
    };
    self.postMessage(response);
  } catch (error) {
    const response: GenerationWorkerResponse = {
      type: "generate-ball-failure",
      requestId: request.requestId,
      cacheKey: request.cacheKey,
      inputHash: request.inputHash,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
