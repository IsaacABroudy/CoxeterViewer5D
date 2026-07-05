import { buildYGamma2SkeletonScene } from "./yGammaScene";
import type { YGammaCellAtlas } from "./yGammaAtlas";
import type {
  YGammaSceneWorkerRequest,
  YGammaSceneWorkerResponse,
} from "./yGammaSceneWorkerTypes";

const atlasesByVersion = new Map<string, YGammaCellAtlas>();
const maxCachedAtlases = 16;

function rememberAtlas(version: string, atlas: YGammaCellAtlas): void {
  atlasesByVersion.delete(version);
  atlasesByVersion.set(version, atlas);
  while (atlasesByVersion.size > maxCachedAtlases) {
    const oldest = atlasesByVersion.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    atlasesByVersion.delete(oldest);
  }
}

function cachedAtlas(version: string): YGammaCellAtlas | undefined {
  const atlas = atlasesByVersion.get(version);
  if (!atlas) {
    return undefined;
  }
  atlasesByVersion.delete(version);
  atlasesByVersion.set(version, atlas);
  return atlas;
}

self.onmessage = (event: MessageEvent<YGammaSceneWorkerRequest>) => {
  const request = event.data;
  if (request.type !== "build-ygamma-scene") {
    return;
  }

  try {
    if (request.atlas) {
      rememberAtlas(request.atlasVersion, request.atlas);
    }
    const atlas = cachedAtlas(request.atlasVersion);
    if (!atlas) {
      throw new Error(
        `Y_Gamma scene worker has no cached atlas for ${request.atlasVersion}.`,
      );
    }
    const startedAt = performance.now();
    const scene = buildYGamma2SkeletonScene(atlas, request.options);
    const response: YGammaSceneWorkerResponse = {
      type: "build-ygamma-scene-success",
      requestId: request.requestId,
      sceneVersion: request.sceneVersion,
      scene,
      buildMs: performance.now() - startedAt,
    };
    self.postMessage(response);
  } catch (error) {
    const response: YGammaSceneWorkerResponse = {
      type: "build-ygamma-scene-failure",
      requestId: request.requestId,
      sceneVersion: request.sceneVersion,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
