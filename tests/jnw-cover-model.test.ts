import { describe, expect, it } from "vitest";

import jnwCubeGraph from "../public/examples/jnw_cube_graph.json";
import {
  buildJnwFourStateCoverModel,
  validateJnwFourStateCoverModel,
} from "../src/app/jnwCoverModel";
import { buildYGammaCellAtlas } from "../src/app/yGammaAtlas";
import {
  createBipartiteJnwMoveSystem,
  createJnwState,
  summarizeJnwLegalSystem,
} from "../src/game";
import type { CoxeterSystemInput } from "../src/types";

const cubeSystem = jnwCubeGraph as CoxeterSystemInput;

function buildCubeCover() {
  const moveSystem = createBipartiteJnwMoveSystem(cubeSystem);
  if (!moveSystem) {
    throw new Error("The JNW cube fixture must be bipartite.");
  }
  const summary = summarizeJnwLegalSystem(
    cubeSystem,
    moveSystem,
    createJnwState([0, 1, 2, 5]),
  );
  const atlas = buildYGammaCellAtlas(cubeSystem);
  return {
    atlas,
    model: buildJnwFourStateCoverModel(atlas, summary),
  };
}

describe("exact JNW four-state cover model", () => {
  it("has the cube cover's exact cells and shared subdivision records", () => {
    const { model } = buildCubeCover();

    expect(model.invariants).toMatchObject({
      ok: true,
      counts: {
        states: 4,
        rails: 16,
        relationCells: 12,
        railMidpoints: 16,
        relationCenters: 12,
        sectors: 48,
      },
      checks: {
        fourStateOrbit: true,
        exactIdsUnique: true,
        projectionsResolve: true,
        oneMidpointPerRail: true,
        oneCenterPerRelationCell: true,
        fourSectorsPerSquare: true,
        sectorBoundaryIncidence: true,
      },
    });
    expect(validateJnwFourStateCoverModel(model)).toEqual(model.invariants);
  });

  it("projects exact cover cells to the corresponding Y_Gamma cells", () => {
    const { atlas, model } = buildCubeCover();
    const generatorCellByGenerator = new Map(
      atlas.generatorCells.map((cell) => [cell.generators[0], cell.id]),
    );
    const rankTwoCellByPair = new Map(
      atlas.rankTwoCells.map((cell) => [cell.generators.join(":"), cell.id]),
    );

    expect(
      model.stateVertices.every(
        (state) => state.projectsToBaseVertexId === atlas.baseVertex.id,
      ),
    ).toBe(true);
    for (const rail of model.rails) {
      expect(rail.projectsToGeneratorCellId).toBe(
        generatorCellByGenerator.get(rail.generator),
      );
    }
    for (const relation of model.relationCells) {
      expect(relation.projectsToRankTwoCellId).toBe(
        rankTwoCellByPair.get(relation.generatorPair.join(":")),
      );
      expect(relation.m).toBe(2);
      expect(relation.boundaryStateIds).toHaveLength(4);
      expect(relation.boundaryRailIds).toHaveLength(4);
    }
  });

  it("glues four state-owned sectors through shared rail midpoints and centers", () => {
    const { model } = buildCubeCover();
    const railById = new Map(model.rails.map((rail) => [rail.id, rail]));
    const midpointByRail = new Map(
      model.railMidpoints.map((midpoint) => [midpoint.exactRailId, midpoint]),
    );

    for (const relation of model.relationCells) {
      const sectors = model.sectors.filter(
        (sector) => sector.exactRelationCellId === relation.id,
      );
      expect(sectors).toHaveLength(4);
      expect(new Set(sectors.map((sector) => sector.ownerStateId))).toEqual(
        new Set(relation.boundaryStateIds),
      );
      expect(new Set(sectors.map((sector) => sector.centerId))).toEqual(
        new Set([relation.centerId]),
      );

      for (const railId of relation.boundaryRailIds) {
        const touchingSectors = sectors.filter(
          (sector) =>
            sector.incomingRailId === railId ||
            sector.outgoingRailId === railId,
        );
        expect(touchingSectors).toHaveLength(2);
        const midpoint = midpointByRail.get(railId);
        expect(midpoint).toBeDefined();
        expect(
          touchingSectors.every(
            (sector) =>
              sector.incomingMidpointId === midpoint?.id ||
              sector.outgoingMidpointId === midpoint?.id,
          ),
        ).toBe(true);
      }

      for (const sector of sectors) {
        const incoming = railById.get(sector.incomingRailId);
        const outgoing = railById.get(sector.outgoingRailId);
        expect(incoming?.endpointStateIds).toContain(sector.ownerStateId);
        expect(outgoing?.endpointStateIds).toContain(sector.ownerStateId);
        expect(sector.baseRankTwoCellId).toBe(relation.projectsToRankTwoCellId);
        expect(sector.subdivisionBoundaryIds).toEqual([
          sector.ownerStateId,
          sector.outgoingMidpointId,
          relation.centerId,
          sector.incomingMidpointId,
        ]);
      }
    }
  });

  it("retains one record for every exact ID and builds deterministically", () => {
    const first = buildCubeCover().model;
    const second = buildCubeCover().model;
    const exactIds = [
      ...first.stateVertices.map((state) => state.id),
      ...first.rails.map((rail) => rail.id),
      ...first.relationCells.map((cell) => cell.id),
    ];

    expect(new Set(first.stateVertices.map((state) => state.id)).size).toBe(4);
    expect(new Set(first.rails.map((rail) => rail.id)).size).toBe(16);
    expect(new Set(first.relationCells.map((cell) => cell.id)).size).toBe(12);
    expect(new Set(exactIds).size).toBe(exactIds.length);
    expect(second).toEqual(first);
  });
});
