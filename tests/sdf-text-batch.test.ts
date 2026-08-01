import { describe, expect, it, vi } from "vitest";
import type { BufferAttribute } from "three";

import {
  buildSdfGlyphAtlas,
  checkSdfTextCapability,
  createSdfTextBatch,
  generateSignedDistanceField,
  type SdfGlyphRaster,
} from "../src/render/sdfTextBatch";

function raster(character: string): SdfGlyphRaster {
  const patterns: Record<string, number[]> = {
    A: [0, 255, 0, 255, 0, 255, 255, 255, 255, 255, 0, 255, 255, 0, 255],
    B: [255, 255, 0, 255, 0, 255, 255, 255, 0, 255, 0, 255, 255, 255, 0],
    " ": new Array<number>(15).fill(0),
  };
  const alpha = patterns[character];
  if (!alpha) throw new Error(`No deterministic raster for ${character}.`);
  return {
    character,
    width: 3,
    height: 5,
    alpha: Uint8Array.from(alpha),
    advance: character === " " ? 0.5 : 0.7,
    planeBounds: character === " " ? [0, 0, 0, 0] : [-0.1, -0.2, 0.7, 0.8],
  };
}

describe("batched SDF labels", () => {
  it("reports a sprite fallback when canvas rasterization is unavailable", () => {
    const capability = checkSdfTextCapability({
      canvasFactory: () => ({
        width: 1,
        height: 1,
        getContext: () => null,
      }),
    });

    expect(capability).toEqual({
      supported: false,
      fallback: "sprite-text",
      reason: "A 2D canvas exists but no 2D context is available.",
    });
  });

  it("builds a deterministic shared atlas without browser canvas", () => {
    const first = buildSdfGlyphAtlas(["BA", "A B"], {
      rasterizeGlyph: raster,
      spread: 2,
      maxTextureSize: 64,
    });
    const second = buildSdfGlyphAtlas(["A", " ", "B", "A"], {
      rasterizeGlyph: raster,
      spread: 2,
      maxTextureSize: 64,
    });

    expect([...first.glyphs.keys()]).toEqual([" ", "A", "B"]);
    expect([...first.data]).toEqual([...second.data]);
    expect(first.width).toBe(second.width);
    expect(first.height).toBe(second.height);
    expect(first.glyphs.get(" ")?.drawable).toBe(false);
    expect(first.texture.image.data).toBe(first.data);

    first.dispose();
    second.dispose();
  });

  it("encodes glyph interiors above exteriors with a stable edge band", () => {
    const alpha = Uint8Array.from([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0,
    ]);
    const sdf = generateSignedDistanceField(alpha, 5, 5, 2);

    expect(sdf[12]).toBeGreaterThan(128);
    expect(sdf[0]).toBeLessThan(128);
    expect(sdf[11]).toBeLessThan(sdf[12]);
  });

  it("batches glyphs and panels while retaining per-label style and center", () => {
    const atlas = buildSdfGlyphAtlas(["A", "B", " "], {
      rasterizeGlyph: raster,
      spread: 2,
      maxTextureSize: 64,
    });
    const batch = createSdfTextBatch(atlas, [
      {
        id: "centered",
        text: "AB",
        anchor: [1, 2, 3],
        worldHeight: 2,
        foreground: [0.2, 0.4, 0.6, 0.8],
        background: [0.1, 0.15, 0.2, 0.7],
        border: [0.9, 0.8, 0.7, 0.6],
        center: [0.5, 0.5],
      },
      {
        id: "hidden-space",
        text: "A A",
        anchor: [-1, 0, 1],
        worldHeight: 1,
        visible: false,
      },
    ]);

    expect(batch.group.children).toEqual([batch.panelMesh, batch.glyphMesh]);
    expect(batch.labelCount).toBe(2);
    expect(batch.glyphCount).toBe(4);
    expect(batch.glyphMesh.geometry.index?.count).toBe(24);
    expect(batch.panelMesh.geometry.index?.count).toBe(12);
    expect(batch.glyphMesh.material.uniforms.uAtlas.value).toBe(atlas.texture);

    const foreground = batch.glyphMesh.geometry.getAttribute("aForeground");
    expect(foreground.getX(0)).toBeCloseTo(0.2);
    expect(foreground.getY(0)).toBeCloseTo(0.4);
    expect(foreground.getZ(0)).toBeCloseTo(0.6);
    expect(foreground.getW(0)).toBeCloseTo(0.8);
    const panelOffsets = batch.panelMesh.geometry.getAttribute("aOffset");
    expect(panelOffsets.getX(0) + panelOffsets.getX(2)).toBeCloseTo(0);
    expect(panelOffsets.getY(0) + panelOffsets.getY(2)).toBeCloseTo(0);
    const glyphVisibility =
      batch.glyphMesh.geometry.getAttribute("aVisibility");
    expect(glyphVisibility.getX(0)).toBe(1);
    expect(glyphVisibility.getX(8)).toBe(0);

    batch.dispose();
    atlas.dispose();
  });

  it("updates anchors and visibility in place and disposes owned resources once", () => {
    const atlas = buildSdfGlyphAtlas(["A"], {
      rasterizeGlyph: raster,
      spread: 2,
      maxTextureSize: 32,
    });
    const textureDispose = vi.spyOn(atlas.texture, "dispose");
    const batch = createSdfTextBatch(
      atlas,
      [
        {
          id: "moving",
          text: "A",
          anchor: [0, 0, 0],
          worldHeight: 1,
        },
      ],
      { ownsAtlas: true },
    );
    const glyphGeometryDispose = vi.spyOn(batch.glyphMesh.geometry, "dispose");
    const glyphMaterialDispose = vi.spyOn(batch.glyphMesh.material, "dispose");

    expect(batch.setLabelAnchor("moving", [4, 5, 6])).toBe(true);
    const positions = batch.glyphMesh.geometry.getAttribute(
      "position",
    ) as BufferAttribute;
    expect([positions.getX(0), positions.getY(0), positions.getZ(0)]).toEqual([
      4, 5, 6,
    ]);
    expect(positions.updateRanges).toEqual([{ start: 0, count: 12 }]);
    expect(batch.setLabelVisibility("moving", false)).toBe(true);
    const visibility = batch.glyphMesh.geometry.getAttribute(
      "aVisibility",
    ) as BufferAttribute;
    expect(Array.from(visibility.array)).toEqual([0, 0, 0, 0]);
    expect(visibility.updateRanges).toEqual([{ start: 0, count: 4 }]);
    expect(batch.setLabelVisibility("missing", true)).toBe(false);

    batch.dispose();
    batch.dispose();
    expect(batch.disposed).toBe(true);
    expect(batch.group.children).toHaveLength(0);
    expect(glyphGeometryDispose).toHaveBeenCalledTimes(1);
    expect(glyphMaterialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  it("rejects missing glyphs and duplicate label ids instead of dropping text", () => {
    const atlas = buildSdfGlyphAtlas(["A"], {
      rasterizeGlyph: raster,
      spread: 2,
      maxTextureSize: 32,
    });
    expect(() =>
      createSdfTextBatch(atlas, [
        { id: "missing", text: "AB", anchor: [0, 0, 0], worldHeight: 1 },
      ]),
    ).toThrow('SDF atlas does not contain "B"');
    expect(() =>
      createSdfTextBatch(atlas, [
        { id: "same", text: "A", anchor: [0, 0, 0], worldHeight: 1 },
        { id: "same", text: "A", anchor: [1, 0, 0], worldHeight: 1 },
      ]),
    ).toThrow("SDF text label ids must be unique: same");
    atlas.dispose();
  });
});
