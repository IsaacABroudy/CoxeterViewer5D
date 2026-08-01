import { describe, expect, it } from "vitest";

import {
  cssPointInElement,
  gpuPickColorToId,
  gpuPickIdToColor,
} from "../src/render/gpuPicking";

describe("GPU picking helpers", () => {
  it("round-trips the full supported id range", () => {
    for (const id of [0, 1, 255, 256, 65_535, 65_536, 0xffffff]) {
      const color = gpuPickIdToColor(id).map((channel) =>
        Math.round(channel * 255),
      );
      expect(gpuPickColorToId(color[0], color[1], color[2])).toBe(id);
    }
  });

  it("maps CSS coordinates to normalized and one-pixel viewport coordinates", () => {
    const result = cssPointInElement(
      { clientX: 60, clientY: 45 },
      { left: 10, top: 20, width: 100, height: 50 },
    );
    expect(result.pixel).toEqual({ x: 50, y: 25 });
    expect(result.normalized.x).toBeCloseTo(0);
    expect(result.normalized.y).toBeCloseTo(0);
  });
});
