import { describe, expect, it } from "vitest";

import A3 from "../public/examples/A3.json";
import { parseCoxeterSystemInput } from "../src/coxeter";
import { buildYGammaDrawingComparisonScene } from "../src/app/yGammaComparisonScene";
import { buildYGammaCellAtlas } from "../src/app/yGammaAtlas";
import { buildYGamma2SkeletonScene } from "../src/app/yGammaScene";

describe("Y_Gamma drawing comparison scene", () => {
  it("combines two drawings without changing their incidence data", () => {
    const atlas = buildYGammaCellAtlas(parseCoxeterSystemInput(A3));
    const coherent = buildYGamma2SkeletonScene(atlas, {
      faceMode: "all",
      includeRankThreeCells: true,
      cellSeparation: "coherent",
      separationValue: 0,
    });
    const expanded = buildYGamma2SkeletonScene(atlas, {
      faceMode: "all",
      includeRankThreeCells: true,
      cellSeparation: "expanded",
      separationValue: 100,
    });
    const coherentPositions = coherent.nodes.map((node) => node.position);
    const expandedPositions = expanded.nodes.map((node) => node.position);

    const comparison = buildYGammaDrawingComparisonScene(coherent, expanded);

    expect(comparison.nodes).toHaveLength(
      coherent.nodes.length + expanded.nodes.length,
    );
    expect(comparison.edges).toHaveLength(
      coherent.edges.length + expanded.edges.length,
    );
    expect(comparison.cells).toHaveLength(
      coherent.cells.length + expanded.cells.length,
    );
    expect(coherent.nodes.map((node) => node.position)).toEqual(
      coherentPositions,
    );
    expect(expanded.nodes.map((node) => node.position)).toEqual(
      expandedPositions,
    );

    for (const renderedCell of comparison.cells) {
      const sourceId = comparison.sourceCellIdByRenderedId.get(renderedCell.id);
      const source =
        coherent.cells.find((cell) => cell.id === sourceId) ??
        expanded.cells.find((cell) => cell.id === sourceId);
      expect(source).toBeDefined();
      expect(renderedCell.generatorPair).toEqual(source?.generatorPair);
      expect(renderedCell.boundaryNodeIds).toHaveLength(
        source?.boundaryNodeIds.length ?? 0,
      );
      expect(renderedCell.sourceCellId).toBe(source?.id);
    }
  });

  it("places coherent and expanded copies on opposite sides", () => {
    const atlas = buildYGammaCellAtlas(parseCoxeterSystemInput(A3));
    const coherent = buildYGamma2SkeletonScene(atlas, {
      faceMode: "all",
      cellSeparation: "coherent",
      separationValue: 0,
    });
    const expanded = buildYGamma2SkeletonScene(atlas, {
      faceMode: "all",
      cellSeparation: "expanded",
      separationValue: 100,
    });
    const comparison = buildYGammaDrawingComparisonScene(coherent, expanded);
    const leftX = comparison.nodes
      .filter((node) => node.id.startsWith("comparison:coherent:"))
      .map((node) => node.position?.[0] ?? 0);
    const rightX = comparison.nodes
      .filter((node) => node.id.startsWith("comparison:expanded:"))
      .map((node) => node.position?.[0] ?? 0);

    expect(Math.max(...leftX)).toBeLessThan(comparison.dividerX);
    expect(Math.min(...rightX)).toBeGreaterThan(comparison.dividerX);
  });
});
