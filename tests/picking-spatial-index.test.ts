import { describe, expect, it } from "vitest";

import {
  PickingSpatialIndex,
  intersectPickingCandidateTriangles,
  intersectPickingTriangle,
  intersectPickingTriangles,
  type PickingSpatialItem,
} from "../src/render/pickingSpatialIndex";

function boxItem(
  id: string,
  x: number,
  data?: string,
): PickingSpatialItem<string> {
  return {
    id,
    aabb: { min: [x, -0.5, -0.5], max: [x + 1, 0.5, 0.5] },
    data,
  };
}

const positiveXRay = {
  origin: [-2, 0, 0] as const,
  direction: [2, 0, 0] as const,
};

describe("PickingSpatialIndex", () => {
  it("builds deterministic trees and returns distance/id ordered candidates", () => {
    const first = new PickingSpatialIndex<string>({ leafSize: 1 });
    const second = new PickingSpatialIndex<string>({ leafSize: 1 });
    first.build([
      boxItem("same-z", 4),
      boxItem("far", 8),
      boxItem("same-a", 4),
      boxItem("near", 0),
    ]);
    second.build([
      boxItem("near", 0),
      boxItem("same-a", 4),
      boxItem("far", 8),
      boxItem("same-z", 4),
    ]);

    expect(first.queryRay(positiveXRay).candidates.map(({ id }) => id)).toEqual(
      ["near", "same-a", "same-z", "far"],
    );
    expect(
      second.queryRay(positiveXRay).candidates.map(({ id }) => id),
    ).toEqual(first.queryRay(positiveXRay).candidates.map(({ id }) => id));
    expect(second.getStats()).toMatchObject({
      itemCount: 4,
      nodeCount: 7,
      leafCount: 4,
      maxDepth: 2,
      lastUpdateKind: "build",
    });
    expect(second.getStats().estimatedBytes).toBeGreaterThan(0);
  });

  it("uses optional spheres as a tighter broad-phase and reports query work", () => {
    const index = new PickingSpatialIndex({ leafSize: 2 });
    index.build([
      {
        id: "aabb-only-hit",
        aabb: { min: [0, -2, -2], max: [2, 2, 2] },
        sphere: { center: [1, 1.5, 0], radius: 0.25 },
      },
      {
        id: "sphere-hit",
        aabb: { min: [3, -1, -1], max: [5, 1, 1] },
        sphere: { center: [4, 0, 0], radius: 0.5 },
      },
    ]);

    const withSpheres = index.queryRay(positiveXRay);
    expect(withSpheres.candidates.map(({ id }) => id)).toEqual(["sphere-hit"]);
    expect(withSpheres.stats).toMatchObject({
      totalItems: 2,
      sphereTests: 2,
      candidateCount: 1,
      returnedCount: 1,
      truncated: false,
    });

    const aabbOnly = index.queryRay(positiveXRay, {
      useSpheres: false,
      maxCandidates: 1,
    });
    expect(aabbOnly.candidates.map(({ id }) => id)).toEqual(["aabb-only-hit"]);
    expect(aabbOnly.stats).toMatchObject({
      candidateCount: 2,
      returnedCount: 1,
      truncated: true,
    });
  });

  it("refits stable records and rebuilds only for structural changes", () => {
    const index = new PickingSpatialIndex<string>({
      leafSize: 1,
      maxRefitsBeforeRebuild: 2,
    });
    const built = index.build([boxItem("a", 0, "old"), boxItem("b", 4)]);
    const refit = index.update({ upsert: [boxItem("a", 10, "moved")] });
    expect(refit).toMatchObject({
      revision: built.revision + 1,
      itemCount: 2,
      nodeCount: built.nodeCount,
      lastUpdateKind: "refit",
      refitsSinceRebuild: 1,
    });
    expect(index.get("a")?.data).toBe("moved");
    expect(index.queryRay(positiveXRay).candidates.map(({ id }) => id)).toEqual(
      ["b", "a"],
    );

    const rebuilt = index.update({
      removeIds: ["b"],
      upsert: [boxItem("c", 1)],
    });
    expect(rebuilt).toMatchObject({
      itemCount: 2,
      lastUpdateKind: "rebuild",
      refitsSinceRebuild: 0,
    });
    expect(index.has("b")).toBe(false);
    expect(index.queryRay(positiveXRay).candidates.map(({ id }) => id)).toEqual(
      ["c", "a"],
    );
  });

  it("periodically rebuilds a repeatedly refitted tree", () => {
    const index = new PickingSpatialIndex({ maxRefitsBeforeRebuild: 1 });
    index.build([boxItem("a", 0)]);
    expect(index.update({ upsert: [boxItem("a", 1)] }).lastUpdateKind).toBe(
      "refit",
    );
    expect(index.update({ upsert: [boxItem("a", 2)] })).toMatchObject({
      lastUpdateKind: "rebuild",
      refitsSinceRebuild: 0,
    });
  });

  it("handles parallel rays, near/far clipping, padding, and empty indexes", () => {
    const index = new PickingSpatialIndex();
    expect(index.queryRay(positiveXRay).stats.totalItems).toBe(0);
    index.build([boxItem("offset", 1)]);

    expect(
      index.queryRay({ origin: [-2, 0.6, 0], direction: [1, 0, 0] }).candidates,
    ).toHaveLength(0);
    expect(
      index
        .queryRay(
          { origin: [-2, 0.6, 0], direction: [1, 0, 0] },
          { padding: 0.11 },
        )
        .candidates.map(({ id }) => id),
    ).toEqual(["offset"]);
    expect(index.queryRay(positiveXRay, { far: 2.5 }).candidates).toHaveLength(
      0,
    );
    expect(
      index.queryRay(positiveXRay, { near: 3.5 }).candidates[0].distance,
    ).toBe(3.5);
  });

  it("rejects duplicate ids and invalid spatial invariants", () => {
    const index = new PickingSpatialIndex();
    expect(() => index.build([boxItem("a", 0), boxItem("a", 2)])).toThrow(
      /Duplicate picking id/,
    );
    expect(() =>
      index.build([{ id: "bad", aabb: { min: [1, 0, 0], max: [0, 1, 1] } }]),
    ).toThrow(/minima/);
    expect(() =>
      index.build([
        {
          id: "triangle-outside",
          aabb: { min: [0, 0, 0], max: [1, 1, 1] },
          triangles: [{ a: [0, 0, 0], b: [2, 0, 0], c: [0, 1, 0] }],
        },
      ]),
    ).toThrow(/outside its AABB/);
    expect(() =>
      index.queryRay({ origin: [0, 0, 0], direction: [0, 0, 0] }),
    ).toThrow(/nonzero/);
  });

  it("finds triangle hits with scene-unit distances and barycentric data", () => {
    const nearTriangle = {
      a: [0, -1, -1] as const,
      b: [0, 1, -1] as const,
      c: [0, 0, 1] as const,
    };
    const farTriangle = {
      a: [2, -1, -1] as const,
      b: [2, 1, -1] as const,
      c: [2, 0, 1] as const,
    };
    const ray = { origin: [-2, 0, 0] as const, direction: [5, 0, 0] as const };

    const hit = intersectPickingTriangle(ray, nearTriangle);
    expect(hit?.distance).toBeCloseTo(2);
    expect(hit?.point).toEqual([0, 0, 0]);
    expect(hit?.barycentric.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
    );
    expect(
      intersectPickingTriangles(ray, [farTriangle, nearTriangle]),
    ).toMatchObject({ triangleIndex: 1, distance: 2 });
    expect(
      intersectPickingTriangle(ray, nearTriangle, { far: 1.9 }),
    ).toBeNull();
  });

  it("refines a broad-phase candidate against retained triangles", () => {
    const index = new PickingSpatialIndex();
    index.build([
      {
        id: "face",
        aabb: { min: [0, -1, -1], max: [0, 1, 1] },
        sphere: { center: [0, 0, 0], radius: 1.5 },
        triangles: [{ a: [0, -1, -1], b: [0, 1, -1], c: [0, 0, 1] }],
      },
    ]);
    const candidate = index.queryRay(positiveXRay).candidates[0];
    expect(
      intersectPickingCandidateTriangles(positiveXRay, candidate),
    ).toMatchObject({ id: "face", triangleIndex: 0, distance: 2 });
  });
});
