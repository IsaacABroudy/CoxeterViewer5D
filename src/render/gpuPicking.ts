import {
  Color,
  PerspectiveCamera,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

export interface GpuPickViewport {
  width: number;
  height: number;
}

export interface GpuPickPoint {
  x: number;
  y: number;
}

const maxGpuPickId = 0xffffff;

/**
 * Encodes a positive semantic object id into the RGB value written by the
 * off-screen picking pass. Zero is reserved for "nothing was hit".
 */
export function gpuPickIdToColor(id: number): [number, number, number] {
  const safeId = Math.max(0, Math.min(maxGpuPickId, Math.trunc(id)));
  return [
    ((safeId >> 16) & 0xff) / 255,
    ((safeId >> 8) & 0xff) / 255,
    (safeId & 0xff) / 255,
  ];
}

export function gpuPickColorToId(
  red: number,
  green: number,
  blue: number,
): number {
  return ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
}

/**
 * One-pixel render target used only for very dense scenes. Small scenes stay
 * on CPU ray tests because a GPU readback has a fixed synchronization cost.
 */
export class GpuIdPicker {
  private readonly target = new WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  private readonly pixel = new Uint8Array(4);
  private readonly clearColor = new Color();
  private queue: Promise<void> = Promise.resolve();

  pick(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    viewport: GpuPickViewport,
    point: GpuPickPoint,
  ): Promise<number> {
    const result = this.queue.then(() =>
      this.performPick(renderer, scene, camera, viewport, point),
    );
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async performPick(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    viewport: GpuPickViewport,
    point: GpuPickPoint,
  ): Promise<number> {
    const width = Math.max(1, Math.floor(viewport.width));
    const height = Math.max(1, Math.floor(viewport.height));
    const x = Math.max(0, Math.min(width - 1, Math.floor(point.x)));
    const y = Math.max(0, Math.min(height - 1, Math.floor(point.y)));
    try {
      await this.renderAndReadPixel(
        renderer,
        scene,
        camera,
        { width, height },
        { x, y },
        true,
      );
    } catch {
      // Some WebGL2 implementations expose the async method but reject its
      // fence/readback path. Retry synchronously before giving up on picking.
      await this.renderAndReadPixel(
        renderer,
        scene,
        camera,
        { width, height },
        { x, y },
        false,
      );
    }

    return gpuPickColorToId(this.pixel[0], this.pixel[1], this.pixel[2]);
  }

  private async renderAndReadPixel(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    viewport: GpuPickViewport,
    point: GpuPickPoint,
    preferAsync: boolean,
  ): Promise<void> {
    const previousTarget = renderer.getRenderTarget();
    const previousClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    const previousClearColor = this.clearColor.clone();
    const previousView = camera.view ? { ...camera.view } : undefined;
    let pendingRead: Promise<unknown> | undefined;

    try {
      camera.setViewOffset(
        viewport.width,
        viewport.height,
        point.x,
        point.y,
        1,
        1,
      );
      renderer.setRenderTarget(this.target);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      if (
        preferAsync &&
        typeof renderer.readRenderTargetPixelsAsync === "function"
      ) {
        pendingRead = renderer.readRenderTargetPixelsAsync(
          this.target,
          0,
          0,
          1,
          1,
          this.pixel,
        );
      } else {
        renderer.readRenderTargetPixels(this.target, 0, 0, 1, 1, this.pixel);
      }
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(previousClearColor, previousClearAlpha);
      restoreCameraView(camera, previousView);
    }
    await pendingRead;
  }

  dispose(): void {
    this.target.dispose();
  }
}

export function createGpuPickMaterial(instanced: boolean): RawShaderMaterial {
  const transform = instanced
    ? "modelViewMatrix * instanceMatrix * vec4(position, 1.0)"
    : "modelViewMatrix * vec4(position, 1.0)";
  const material = new RawShaderMaterial({
    vertexShader: `
      precision highp float;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      attribute vec3 position;
      ${instanced ? "attribute mat4 instanceMatrix;" : ""}
      attribute vec3 pickColor;
      varying vec3 vPickColor;
      void main() {
        vPickColor = pickColor;
        gl_Position = projectionMatrix * ${transform};
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vPickColor;
      void main() {
        gl_FragColor = vec4(vPickColor, 1.0);
      }
    `,
    depthTest: true,
    depthWrite: true,
    transparent: false,
  });
  material.toneMapped = false;
  return material;
}

function restoreCameraView(
  camera: PerspectiveCamera,
  view:
    | {
        enabled: boolean;
        fullWidth: number;
        fullHeight: number;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
      }
    | undefined,
): void {
  if (!view?.enabled) {
    camera.clearViewOffset();
    return;
  }
  camera.setViewOffset(
    view.fullWidth,
    view.fullHeight,
    view.offsetX,
    view.offsetY,
    view.width,
    view.height,
  );
}

export function cssPointInElement(
  point: { clientX: number; clientY: number },
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): { normalized: Vector2; pixel: GpuPickPoint } {
  const localX = point.clientX - rect.left;
  const localY = point.clientY - rect.top;
  return {
    normalized: new Vector2(
      (localX / Math.max(1, rect.width)) * 2 - 1,
      -(localY / Math.max(1, rect.height)) * 2 + 1,
    ),
    pixel: { x: localX, y: localY },
  };
}
