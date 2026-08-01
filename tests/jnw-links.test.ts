import { describe, expect, it } from "vitest";

import jnwCubeGraph from "../src/examples/jnw_cube_graph.json";
import { deriveJnwStateLinks } from "../src/game/jnwLinks";
import type { CoxeterSystemInput } from "../src/types";

function simplexCountByDimension(
  link: ReturnType<typeof deriveJnwStateLinks>["full"],
  dimension: number,
): number {
  return link.simplices.filter((simplex) => simplex.dimension === dimension)
    .length;
}

describe("JNW local links", () => {
  it("derives the cube full, ascending, descending, and empty level links", () => {
    const system = jnwCubeGraph as CoxeterSystemInput;
    const links = deriveJnwStateLinks(system, {
      id: "state:0,1,2,5",
      generators: [0, 1, 2, 5],
    });

    expect(links.full.vertices).toHaveLength(8);
    expect(simplexCountByDimension(links.full, 1)).toBe(12);
    expect(simplexCountByDimension(links.full, 2)).toBe(0);

    expect(links.ascending.vertices).toHaveLength(4);
    expect(simplexCountByDimension(links.ascending, 1)).toBe(3);
    expect(
      links.ascending.simplices
        .filter((simplex) => simplex.dimension === 1)
        .map((simplex) => simplex.sourceGeneratorIds),
    ).toEqual([
      ["v000", "v001"],
      ["v000", "v010"],
      ["v001", "v101"],
    ]);

    expect(links.descending.vertices).toHaveLength(4);
    expect(simplexCountByDimension(links.descending, 1)).toBe(3);
    expect(
      links.descending.simplices
        .filter((simplex) => simplex.dimension === 1)
        .map((simplex) => simplex.sourceGeneratorIds),
    ).toEqual([
      ["v011", "v111"],
      ["v100", "v110"],
      ["v110", "v111"],
    ]);

    expect(links.level.displayLabel).toContain("empty in faithful JNW");
    expect(links.level.vertices).toEqual([]);
    expect(links.level.simplices).toEqual([]);
    expect(links.full.vertices[0]).toEqual({
      generator: 0,
      sourceGeneratorId: "v000",
      displayLabel: "v000",
    });
  });

  it("retains triangle simplices for a rank-three right-angled clique", () => {
    const system: CoxeterSystemInput = {
      schemaVersion: 1,
      name: "Rank-three clique link fixture",
      rank: 4,
      generators: [
        { id: "alpha-id", label: "a" },
        { id: "beta-id", label: "b" },
        { id: "gamma-id", label: "c" },
        { id: "isolated-id", label: "d" },
      ],
      coxeterMatrix: [
        [1, 2, 2, "inf"],
        [2, 1, 2, "inf"],
        [2, 2, 1, "inf"],
        ["inf", "inf", "inf", 1],
      ],
    };

    const links = deriveJnwStateLinks(system, {
      id: "triangle-state",
      generators: [0, 1, 2],
    });
    const ascendingTriangle = links.ascending.simplices.find(
      (simplex) => simplex.dimension === 2,
    );

    expect(links.full.vertices.map((vertex) => vertex.displayLabel)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(ascendingTriangle).toEqual({
      id: "jnw-link-simplex:0,1,2",
      generators: [0, 1, 2],
      sourceGeneratorIds: ["alpha-id", "beta-id", "gamma-id"],
      dimension: 2,
    });
    expect(simplexCountByDimension(links.ascending, 1)).toBe(3);
    expect(
      links.descending.vertices.map((vertex) => vertex.sourceGeneratorId),
    ).toEqual(["isolated-id"]);
  });
});
