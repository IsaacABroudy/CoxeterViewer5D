import type { SceneCell, SceneEdge, SceneNode } from "../render/SceneView";
import type { YGamma2SkeletonScene } from "./yGammaScene";

export type YGammaComparisonSide = "coherent" | "expanded";

export interface YGammaDrawingComparisonScene extends YGamma2SkeletonScene {
  sourceCellIdByRenderedId: ReadonlyMap<string, string>;
  dividerX: number;
}

interface Bounds3 {
  minX: number;
  maxX: number;
  centerY: number;
  centerZ: number;
}

/**
 * Places coherent and expanded drawings in one Three.js scene.
 *
 * Prefixes exist only to keep the two rendered copies addressable. Every cell
 * retains its source id, generator pair, and boundary cycle; the translation
 * is a drawing convention and never changes either source scene.
 */
export function buildYGammaDrawingComparisonScene(
  coherent: YGamma2SkeletonScene,
  expanded: YGamma2SkeletonScene,
): YGammaDrawingComparisonScene {
  const coherentBounds = sceneBounds(coherent.nodes);
  const expandedBounds = sceneBounds(expanded.nodes);
  const gap = Math.max(
    5,
    Math.min(
      14,
      (coherentBounds.maxX -
        coherentBounds.minX +
        expandedBounds.maxX -
        expandedBounds.minX) *
        0.16,
    ),
  );
  const coherentOffset: [number, number, number] = [
    -gap / 2 - coherentBounds.maxX,
    -coherentBounds.centerY,
    -coherentBounds.centerZ,
  ];
  const expandedOffset: [number, number, number] = [
    gap / 2 - expandedBounds.minX,
    -expandedBounds.centerY,
    -expandedBounds.centerZ,
  ];
  const sourceCellIdByRenderedId = new Map<string, string>();
  const left = translateScene(
    coherent,
    "coherent",
    coherentOffset,
    sourceCellIdByRenderedId,
  );
  const right = translateScene(
    expanded,
    "expanded",
    expandedOffset,
    sourceCellIdByRenderedId,
  );

  return {
    nodes: [...left.nodes, ...right.nodes],
    edges: [...left.edges, ...right.edges],
    cells: [...left.cells, ...right.cells],
    selectedNodeId: left.selectedNodeId,
    warnings: [...new Set([...coherent.warnings, ...expanded.warnings])],
    sourceCellIdByRenderedId,
    dividerX: 0,
  };
}

function translateScene(
  scene: YGamma2SkeletonScene,
  side: YGammaComparisonSide,
  offset: [number, number, number],
  sourceCellIds: Map<string, string>,
): YGamma2SkeletonScene {
  const prefix = `comparison:${side}:`;
  const nodeId = (id: string) => `${prefix}${id}`;
  const nodes: SceneNode[] = scene.nodes.map((node) => ({
    ...node,
    id: nodeId(node.id),
    position: translatePoint(node.position, offset),
  }));
  const edges: SceneEdge[] = scene.edges.map((edge) => ({
    ...edge,
    id: `${prefix}${edge.id}`,
    source: nodeId(edge.source),
    target: nodeId(edge.target),
    labelAnchor: translatePoint(edge.labelAnchor, offset),
    labelPosition: translatePoint(edge.labelPosition, offset),
  }));
  const cells: SceneCell[] = scene.cells.map((cell) => {
    const id = `${prefix}${cell.id}`;
    sourceCellIds.set(id, cell.id);
    return {
      ...cell,
      id,
      sourceCellId: cell.id,
      boundaryNodeIds: cell.boundaryNodeIds.map(nodeId),
    };
  });
  return {
    nodes,
    edges,
    cells,
    selectedNodeId: nodeId(scene.selectedNodeId),
    warnings: [...scene.warnings],
  };
}

function translatePoint(
  point: [number, number, number] | undefined,
  offset: [number, number, number],
): [number, number, number] | undefined {
  return point
    ? [point[0] + offset[0], point[1] + offset[1], point[2] + offset[2]]
    : undefined;
}

function sceneBounds(nodes: SceneNode[]): Bounds3 {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    const [x, y, z] = node.position ?? [0, 0, 0];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, centerY: 0, centerZ: 0 };
  }
  return {
    minX,
    maxX,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}
