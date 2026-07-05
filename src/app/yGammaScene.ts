import type { SceneCell, SceneEdge, SceneNode } from "../render/SceneView";
import type { YGammaCellAtlas, YGammaCellRecord } from "./yGammaAtlas";

export interface YGamma2SkeletonScene {
  nodes: SceneNode[];
  edges: SceneEdge[];
  cells: SceneCell[];
  selectedNodeId: string;
  warnings: string[];
}

export interface YGamma2SkeletonSceneOptions {
  activeGeneratorPairKey?: string;
  faceMode?: "all" | "active-pair" | "one-skeleton";
  includeRankThreeCells?: boolean;
  rankThreeFocus?: YGammaRankThreeFocus;
  focusGenerator?: number;
  relationOrderFilter?: number;
  peelMode?: YGammaPeelMode;
  layoutScale?: "normal" | "expansive";
  cellSeparation?: YGammaCellSeparation;
  separationValue?: YGammaSeparationValue;
  cutaway?: YGammaCutawayOptions;
  relationStar?: YGammaRelationStarOptions;
}

export interface YGammaRankThreeFocus {
  cellId: string;
  generatorSet: number[];
  pairKeys: string[];
  mode?: "full-cell" | "hinge-witness";
  exposeConstructionVertices?: boolean;
  showOnlyFundamentalFaces?: boolean;
  restrictGeneratorSpine?: boolean;
}

export type YGammaPeelMode =
  | "all"
  | "selected-face"
  | "adjacent-faces"
  | "same-rank-three";

export type YGammaCellSeparation = "coherent" | "readable" | "expanded";
export type YGammaSeparationValue = number;

export type YGammaCutawayMode =
  | "none"
  | "generator-family"
  | "relation-order"
  | "rank"
  | "incident-to-selected-edge"
  | "incident-to-selected-relation";

export interface YGammaCutawayOptions {
  mode: YGammaCutawayMode;
  generator?: number;
  relationOrder?: number;
  rank?: number;
}

export interface YGammaRelationStarOptions {
  active: boolean;
  pairKey?: string;
}

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

interface RankThreeSceneGeometry {
  nodes: SceneNode[];
  edges: SceneEdge[];
  cells: SceneCell[];
  warnings: string[];
}

interface RankThreeCoxeterCell {
  points: Vec3[];
  transitions: number[][];
  simpleVertexIndices: number[];
}

interface RankThreeFocusHinge {
  shared: number;
  first: { pair: [number, number]; m: number; other: number };
  second: { pair: [number, number]; m: number; other: number };
}

interface RankThreeFaceCycle {
  globalPair: [number, number];
  boundary: number[];
}

interface NormalizedYGammaCutaway {
  mode: YGammaCutawayMode;
  generator?: number;
  relationOrder?: number;
  rank?: number;
  activePair?: [number, number];
  activePairKey?: string;
  relationStarActive: boolean;
}

const BASE_NODE_ID = "Y:*";
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GENERATOR_ARROW_RADIUS = 5.2;
const FACE_OUTER_RADIUS_BASE = 3.75;
const FACE_OUTER_RADIUS_MAX = 4.7;
const FACE_BULGE = 0.86;
const FACE_LIFT_BASE = 0.62;
const FACE_LIFT_PER_EDGE = 0.035;
const FACE_LIFT_MAX = 1.18;
const FACE_LAYER_STEP = 0.14;
const rankThreeCoxeterCellCache = new Map<string, RankThreeCoxeterCell>();

function yGammaSeparationStrength(separation: YGammaCellSeparation): number {
  switch (separation) {
    case "coherent":
      return 0.45;
    case "expanded":
      return 2.25;
    case "readable":
    default:
      return 1.25;
  }
}

function yGammaSeparationStrengthFromValue(
  separation: YGammaCellSeparation,
  value: YGammaSeparationValue | undefined,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return yGammaSeparationStrength(separation);
  }
  const normalized = Math.max(0, Math.min(100, value)) / 100;
  return 0.45 + normalized * 1.8;
}

/**
 * Builds a cohesive 3D readability model for the 2-skeleton of Y_Gamma.
 *
 * The output keeps one base vertex, generator-arrow 1-cells, and full 2m-sided
 * relation faces in one scene. Hidden helper vertices may be introduced to
 * make finite 2m-gons simply embedded, but semantic labels stay on generator
 * arrows and relation boundaries rather than on the construction scaffolding.
 */
export function buildYGamma2SkeletonScene(
  atlas: YGammaCellAtlas,
  options: YGamma2SkeletonSceneOptions = {},
): YGamma2SkeletonScene {
  const faceMode = options.faceMode ?? "all";
  const activePair = options.activeGeneratorPairKey
    ? parseRelationPairKey(options.activeGeneratorPairKey)
    : undefined;
  const rankThreeFocus = options.rankThreeFocus;
  const pairOrders = new Map(
    atlas.rankTwoCells
      .filter((cell) => typeof cell.m === "number")
      .map((cell) => [relationPairKey(cell.generators), cell.m as number]),
  );
  const directions = buildGeneratorDirections(
    atlas.generatorCells.length,
    rankThreeFocus,
    pairOrders,
  );
  const generatorLabels = yGammaGeneratorLabels(atlas);
  const focusGenerator =
    options.focusGenerator !== undefined &&
    Number.isInteger(options.focusGenerator) &&
    options.focusGenerator >= 0
      ? options.focusGenerator
      : undefined;
  const cellSeparation =
    options.cellSeparation ??
    (options.layoutScale === "expansive" ? "expanded" : "readable");
  const separationStrength = yGammaSeparationStrengthFromValue(
    cellSeparation,
    options.separationValue,
  );
  const relationStarPairKey =
    options.relationStar?.active === true
      ? (options.relationStar.pairKey ?? options.activeGeneratorPairKey)
      : undefined;
  const cutaway = normalizeYGammaCutaway({
    options: options.cutaway,
    activePairKey: options.activeGeneratorPairKey,
    relationStarPairKey,
    focusGenerator,
    relationOrderFilter: options.relationOrderFilter,
  });
  const expansiveLayout =
    options.layoutScale === "expansive" || cellSeparation === "expanded";
  const nodes: SceneNode[] = [
    {
      id: BASE_NODE_ID,
      label: "*",
      compactLabel: "base",
      length: 0,
      localDistance: 0,
      position: [0, 0, 0],
    },
  ];
  const edges: SceneEdge[] = [];
  const cells: SceneCell[] = [];
  const warnings: string[] = [];
  const focusedGenerators =
    rankThreeFocus && rankThreeFocus.restrictGeneratorSpine !== false
      ? new Set(rankThreeFocus.generatorSet)
      : undefined;

  for (const cell of atlas.generatorCells) {
    const generator = cell.generators[0] ?? 0;
    if (focusedGenerators && !focusedGenerators.has(generator)) {
      continue;
    }
    const direction =
      directions[generator] ?? stableSphereDirection(generator, 1);
    const nodeId = arrowEndNodeId(generator);
    nodes.push({
      id: nodeId,
      label: "",
      compactLabel: "",
      length: 1,
      localDistance: 1,
      position: scale(direction, GENERATOR_ARROW_RADIUS),
    });
    edges.push({
      id: cell.id,
      source: BASE_NODE_ID,
      target: nodeId,
      generator,
      compactLabel: cell.label,
      directed: true,
      alwaysLabel: true,
      labelLeader: true,
      labelPriority: 40_000,
    });
  }

  atlas.rankTwoCells.forEach((cell, index) => {
    if (rankThreeFocus) {
      return;
    }
    if (
      focusGenerator !== undefined &&
      !cell.generators.includes(focusGenerator)
    ) {
      return;
    }
    if (
      options.relationOrderFilter !== undefined &&
      cell.m !== options.relationOrderFilter
    ) {
      return;
    }
    const readabilityRole = rankTwoReadabilityRole(cell, cutaway);
    if (readabilityRole === "hidden-by-cutaway") {
      return;
    }
    const active =
      relationPairKey(cell.generators) === options.activeGeneratorPairKey;
    if (
      faceMode === "one-skeleton" ||
      (faceMode === "active-pair" && !active)
    ) {
      return;
    }
    const relation = buildRelationFace(
      cell,
      index,
      atlas.rankTwoCells.length,
      directions,
      generatorLabels,
      active,
      faceMode,
      separationStrength,
      readabilityRole,
    );
    nodes.push(...relation.nodes);
    edges.push(...relation.edges);
    cells.push(relation.cell);
  });
  if (options.includeRankThreeCells ?? true) {
    const rankThree = buildRankThreeCellSurfaces({
      cells: atlas.higherCells.filter((cell) => cell.rank === 3),
      generatorDirections: directions,
      generatorLabels,
      pairOrders,
      faceMode,
      activePair,
      focus: rankThreeFocus,
      focusGenerator,
      relationOrderFilter: options.relationOrderFilter,
      peelMode: options.peelMode ?? "all",
      separationStrength,
      cutaway,
    });
    nodes.push(...rankThree.nodes);
    edges.push(...rankThree.edges);
    cells.push(...rankThree.cells);
    warnings.push(...rankThree.warnings);
  }
  if (expansiveLayout) {
    expandYGammaRelationGeometry(nodes, separationStrength);
  }

  return {
    nodes,
    edges,
    cells,
    selectedNodeId: BASE_NODE_ID,
    warnings: [
      "Y_Gamma is shown as one 3D inspectable 2-skeleton: base vertex, oriented generator arrows, and relation faces glued to those arrows.",
      "Rank-two faces are drawn with their full 2m-sided outline, but only the true quotient 0/1-skeleton vertices are displayed; intermediate corners are construction points for the sheet.",
      ...(expansiveLayout
        ? [
            `All-relations Y_Gamma view uses ${cellSeparation} construction spacing and face layers so dense relation sheets can be read without changing the underlying incidence data.`,
          ]
        : []),
      ...((options.includeRankThreeCells ?? true)
        ? [
            "Rank-three cells use finite rank-three Coxeter-cell boundary models glued to the same base/generator spine; right-angled triples draw cube-like cells. These coordinates are readability coordinates, not a certified affine realization.",
          ]
        : []),
      ...(rankThreeFocus
        ? [
            rankThreeFocus.mode === "hinge-witness"
              ? "Rank-three focus mode is showing the square/hexagon hinge witness inside one finite rank-three Coxeter cell."
              : rankThreeFocus.showOnlyFundamentalFaces === true
                ? "Rank-three focus mode is showing one simply embedded fundamental relation face inside the finite rank-three Coxeter cell; use Show all faces for the complete relation family."
                : "Rank-three focus mode is showing the full boundary of one finite rank-three Coxeter cell; the coordinates are expanded for readability.",
          ]
        : []),
      ...(cutaway.mode !== "none"
        ? [
            `Y_Gamma cutaway mode '${cutaway.mode}' is a drawing filter; cell ids, generator pairs, and boundary node ids are unchanged.`,
          ]
        : []),
      ...(cutaway.relationStarActive
        ? [
            "Relation-star extraction keeps the selected relation family and incident higher cells as a temporary focused view, not a new quotient complex.",
          ]
        : []),
      ...warnings,
      ...(faceMode === "active-pair"
        ? [
            "Dense Y_Gamma view is filtered to the active rank-two relation face; use the relation picker or all-faces toggle to inspect other relations.",
          ]
        : []),
    ],
  };
}

function buildRelationFace(
  cell: YGammaCellRecord,
  index: number,
  relationCount: number,
  generatorDirections: Vec3[],
  generatorLabels: string[],
  active: boolean,
  faceMode: YGamma2SkeletonSceneOptions["faceMode"],
  separationStrength: number,
  readabilityRole: SceneCell["readabilityRole"],
): {
  nodes: SceneNode[];
  edges: SceneEdge[];
  cell: SceneCell;
} {
  const [left = 0, right = 0] = cell.generators;
  const leftDirection =
    generatorDirections[left] ?? stableSphereDirection(left, 1);
  const rightDirection =
    generatorDirections[right] ?? stableSphereDirection(right, 1);
  const boundaryLength = Math.max(3, cell.boundaryLength ?? 2 * (cell.m ?? 2));
  const offset = cohesiveFaceOffset(
    leftDirection,
    rightDirection,
    index,
    relationCount,
    separationStrength,
  );
  const hiddenCornerCount = Math.max(0, boundaryLength - 3);
  const hiddenCornerPositions = cohesiveHiddenCorners(
    leftDirection,
    rightDirection,
    boundaryLength,
    hiddenCornerCount,
    offset,
    separationStrength,
  );
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const boundaryNodeIds = [
    BASE_NODE_ID,
    arrowEndNodeId(left),
    ...hiddenCornerPositions.map((_position, cornerIndex) =>
      hiddenCornerNodeId(cell.id, cornerIndex),
    ),
    arrowEndNodeId(right),
  ];

  hiddenCornerPositions.forEach((position, cornerIndex) => {
    nodes.push({
      id: hiddenCornerNodeId(cell.id, cornerIndex),
      label: "",
      compactLabel: "",
      length: 2,
      localDistance: 2,
      position,
      isRelationBoundary: true,
      hidden: true,
    });
  });

  if (faceMode === "all" || active) {
    for (let step = 0; step < boundaryNodeIds.length; step += 1) {
      const generator = step % 2 === 0 ? left : right;
      const suppressSemanticLabel = readabilityRole === "incident";
      edges.push({
        id: `${cell.id}:boundary:${step}`,
        source: boundaryNodeIds[step],
        target: boundaryNodeIds[(step + 1) % boundaryNodeIds.length],
        generator,
        compactLabel:
          cell.attachingWord[step % cell.attachingWord.length] ??
          labelForGenerator(generatorLabels, generator),
        isRelationBoundary: true,
        labelLeader: true,
        labelPriority: readabilityRole === "focus" ? 30_000 : undefined,
        suppressSemanticLabel,
        emphasis: active ? "readable-boundary" : undefined,
        directed: true,
      });
    }
  }

  return {
    nodes,
    edges,
    cell: {
      id: cell.id,
      generatorPair: [left, right],
      boundaryNodeIds,
      localDistance: 2,
      isRelationBoundary: true,
      readabilityRole,
    },
  };
}

function relationPairKey(generators: number[]): string {
  return [...generators].sort((left, right) => left - right).join("-");
}

function parseRelationPairKey(key: string): [number, number] | undefined {
  const parts = key.split("-").map((part) => Number.parseInt(part, 10));
  return parts.length === 2 &&
    parts.every((part) => Number.isInteger(part) && part >= 0)
    ? ([Math.min(parts[0], parts[1]), Math.max(parts[0], parts[1])] as [
        number,
        number,
      ])
    : undefined;
}

function arrowEndNodeId(generator: number): string {
  return `Y:arrow-end:${generator}`;
}

function hiddenCornerNodeId(cellId: string, cornerIndex: number): string {
  return `${cellId}:sheet-corner:${cornerIndex}`;
}

function yGammaGeneratorLabels(atlas: YGammaCellAtlas): string[] {
  const labels: string[] = [];
  for (const cell of atlas.generatorCells) {
    const generator = cell.generators[0];
    if (generator === undefined) {
      continue;
    }
    labels[generator] =
      cell.generatorLabels[0] ?? cell.label ?? `s${generator}`;
  }
  return Array.from(
    { length: atlas.generatorCount },
    (_entry, generator) => labels[generator] ?? `s${generator}`,
  );
}

function labelForGenerator(labels: string[], generator: number): string {
  return labels[generator] ?? `s${generator}`;
}

function normalizeYGammaCutaway(input: {
  options: YGammaCutawayOptions | undefined;
  activePairKey?: string;
  relationStarPairKey?: string;
  focusGenerator?: number;
  relationOrderFilter?: number;
}): NormalizedYGammaCutaway {
  const mode =
    input.relationStarPairKey !== undefined
      ? "incident-to-selected-relation"
      : (input.options?.mode ?? "none");
  const activePairKey = input.relationStarPairKey ?? input.activePairKey;
  const activePair = activePairKey
    ? parseRelationPairKey(activePairKey)
    : undefined;
  return {
    mode,
    activePair,
    activePairKey,
    relationStarActive: input.relationStarPairKey !== undefined,
    generator: input.options?.generator ?? input.focusGenerator,
    relationOrder: input.options?.relationOrder ?? input.relationOrderFilter,
    rank: input.options?.rank,
  };
}

function rankTwoReadabilityRole(
  cell: YGammaCellRecord,
  cutaway: NormalizedYGammaCutaway,
): SceneCell["readabilityRole"] {
  const pairKeyValue = relationPairKey(cell.generators);
  const activePair = cutaway.activePair;
  const activePairKey = cutaway.activePairKey;

  switch (cutaway.mode) {
    case "generator-family":
    case "incident-to-selected-edge":
      if (cutaway.generator === undefined) {
        return "context";
      }
      return cell.generators.includes(cutaway.generator)
        ? "focus"
        : cutaway.relationStarActive
          ? "hidden-by-cutaway"
          : "context";
    case "relation-order":
      if (cutaway.relationOrder === undefined) {
        return "context";
      }
      return cell.m === cutaway.relationOrder ? "focus" : "context";
    case "rank":
      if (cutaway.rank === undefined) {
        return "context";
      }
      return cutaway.rank === 2 ? "focus" : "context";
    case "incident-to-selected-relation":
      if (!activePair || !activePairKey) {
        return "context";
      }
      if (pairKeyValue === activePairKey) {
        return "focus";
      }
      return sharesGenerator(cell.generators, activePair)
        ? "incident"
        : cutaway.relationStarActive
          ? "hidden-by-cutaway"
          : "context";
    case "none":
    default:
      return activePairKey && pairKeyValue === activePairKey
        ? "focus"
        : "context";
  }
}

function rankThreeReadabilityRole(
  cell: YGammaCellRecord,
  cutaway: NormalizedYGammaCutaway,
  pairOrders: Map<string, number>,
): SceneCell["readabilityRole"] {
  const activePair = cutaway.activePair;
  const activePairKey = cutaway.activePairKey;

  switch (cutaway.mode) {
    case "generator-family":
    case "incident-to-selected-edge":
      if (cutaway.generator === undefined) {
        return "context";
      }
      return cell.generators.includes(cutaway.generator)
        ? "incident"
        : cutaway.relationStarActive
          ? "hidden-by-cutaway"
          : "context";
    case "relation-order":
      if (cutaway.relationOrder === undefined) {
        return "context";
      }
      return generatorPairs(cell.generators).some(
        (pair) =>
          pairOrders.get(relationPairKey(pair)) === cutaway.relationOrder,
      )
        ? "incident"
        : "context";
    case "rank":
      if (cutaway.rank === undefined) {
        return "context";
      }
      return cell.rank === cutaway.rank ? "focus" : "context";
    case "incident-to-selected-relation":
      if (!activePair || !activePairKey) {
        return "context";
      }
      return cell.generators.includes(activePair[0]) &&
        cell.generators.includes(activePair[1])
        ? "incident"
        : cutaway.relationStarActive
          ? "hidden-by-cutaway"
          : "context";
    case "none":
    default:
      return "context";
  }
}

function sharesGenerator(left: number[], right: number[]): boolean {
  return left.some((generator) => right.includes(generator));
}

function generatorPairs(generators: number[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let left = 0; left < generators.length; left += 1) {
    for (let right = left + 1; right < generators.length; right += 1) {
      pairs.push([generators[left], generators[right]]);
    }
  }
  return pairs;
}

function expandYGammaRelationGeometry(
  nodes: SceneNode[],
  separationStrength: number,
): void {
  const spreadStrength = Math.max(0, separationStrength);
  for (const node of nodes) {
    if (!node.position || !node.isRelationBoundary) {
      continue;
    }
    if (node.id === BASE_NODE_ID || node.id.startsWith("Y:arrow-end:")) {
      continue;
    }
    const relationScale = node.id.includes(":sheet-corner:")
      ? 1.55 + spreadStrength * 0.56
      : node.id.includes(":coxeter-vertex:")
        ? 1.32 + spreadStrength * 0.32
        : 1.42 + spreadStrength * 0.46;
    const verticalScale = Math.max(1.35, relationScale * 0.72);
    const outward = normalize(node.position);
    const spread = stableCellSpreadDirection(constructionCellKey(node.id));
    const sideSpread = projectOntoPlane(spread, outward);
    const sideOffset: Vec3 =
      norm(sideSpread) > 1e-6
        ? scale(normalize(sideSpread), 0.42 + spreadStrength * 0.35)
        : [0, 0, 0];
    node.position = [
      node.position[0] * relationScale + sideOffset[0],
      node.position[1] * relationScale + sideOffset[1],
      node.position[2] * verticalScale + sideOffset[2],
    ];
  }
}

function constructionCellKey(nodeId: string): string {
  return nodeId
    .replace(/:sheet-corner:\d+$/, "")
    .replace(/:coxeter-vertex:\d+$/, "")
    .replace(/:fundamental-face:[^:]+:corner:\d+$/, "")
    .replace(/:focus:[^:]+:corner:\d+$/, "");
}

function stableCellSpreadDirection(key: string): Vec3 {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return stableSphereDirection(Math.abs(hash), 997);
}

function buildGeneratorDirections(
  generatorCount: number,
  focus: YGammaRankThreeFocus | undefined,
  pairOrders: Map<string, number>,
): Vec3[] {
  const directions = Array.from({ length: generatorCount }, (_cell, index) =>
    stableSphereDirection(index, Math.max(1, generatorCount)),
  );
  const coxeterCellDirections = focus
    ? rankThreeFocusCoxeterDirections(focus, pairOrders)
    : undefined;
  if (coxeterCellDirections) {
    for (const [generator, direction] of coxeterCellDirections) {
      directions[generator] = direction;
    }
    return directions;
  }

  const hinge = focus ? rankThreeFocusHinge(focus, pairOrders) : undefined;
  if (!hinge) {
    return directions;
  }

  directions[hinge.shared] = [1, 0, 0];
  directions[hinge.first.other] = [0, 1, 0];
  directions[hinge.second.other] = [0, 0, 1];
  return directions;
}

function rankThreeFocusCoxeterDirections(
  focus: YGammaRankThreeFocus,
  pairOrders: Map<string, number>,
): Map<number, Vec3> | undefined {
  if (focus.mode !== "full-cell" || focus.generatorSet.length !== 3) {
    return undefined;
  }
  const generators = [...focus.generatorSet].sort(
    (left, right) => left - right,
  );
  const localOrders = rankThreePairOrders(generators, pairOrders);
  if (
    !localOrders ||
    [...localOrders].sort((left, right) => left - right).join(",") !== "2,3,3"
  ) {
    return undefined;
  }
  const coxeterCell = buildRankThreeCoxeterCell(localOrders);
  const gram = rankThreeGram(localOrders);
  const simpleRootCoordinates = choleskyRootCoordinates(gram);
  if (!coxeterCell || !simpleRootCoordinates) {
    return undefined;
  }
  const base = coxeterCell.points[0];
  const localSimpleDirections = coxeterCell.simpleVertexIndices.map(
    (orbitIndex) =>
      normalize(
        coeffsToEuclidean(
          subtract(coxeterCell.points[orbitIndex], base),
          simpleRootCoordinates,
        ),
      ),
  );
  const hinge = rankThreeFocusHinge(focus, pairOrders);
  if (!hinge) {
    return new Map(
      generators.map((generator, localIndex) => [
        generator,
        localSimpleDirections[localIndex],
      ]),
    );
  }

  const localIndexByGenerator = new Map(
    generators.map((generator, localIndex) => [generator, localIndex]),
  );
  const sharedIndex = localIndexByGenerator.get(hinge.shared);
  const squareOtherIndex = localIndexByGenerator.get(hinge.first.other);
  if (sharedIndex === undefined || squareOtherIndex === undefined) {
    return undefined;
  }
  const frameX = localSimpleDirections[sharedIndex];
  const squareProjected = projectOntoPlane(
    localSimpleDirections[squareOtherIndex],
    frameX,
  );
  const frameY =
    norm(squareProjected) > 1e-6
      ? normalize(squareProjected)
      : orthogonalUnitVector(frameX);
  const frameZ = normalize(cross(frameX, frameY));

  return new Map(
    generators.map((generator, localIndex) => {
      const direction = localSimpleDirections[localIndex];
      return [
        generator,
        normalize([
          dot(direction, frameX),
          dot(direction, frameY),
          dot(direction, frameZ),
        ]),
      ];
    }),
  );
}

function buildRankThreeCellSurfaces(input: {
  cells: YGammaCellRecord[];
  generatorDirections: Vec3[];
  generatorLabels: string[];
  pairOrders: Map<string, number>;
  faceMode: YGamma2SkeletonSceneOptions["faceMode"];
  activePair?: [number, number];
  focus?: YGammaRankThreeFocus;
  focusGenerator?: number;
  relationOrderFilter?: number;
  peelMode: YGammaPeelMode;
  separationStrength: number;
  cutaway: NormalizedYGammaCutaway;
}): RankThreeSceneGeometry {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const surfaces: SceneCell[] = [];
  const warnings: string[] = [];
  for (const cell of input.cells) {
    if (input.focus && cell.id !== input.focus.cellId) {
      continue;
    }
    const generators = [...cell.generators].sort((left, right) => left - right);
    if (generators.length !== 3) {
      continue;
    }
    const readabilityRole = rankThreeReadabilityRole(
      cell,
      input.cutaway,
      input.pairOrders,
    );
    if (readabilityRole === "hidden-by-cutaway") {
      continue;
    }
    if (
      input.focusGenerator !== undefined &&
      !generators.includes(input.focusGenerator)
    ) {
      continue;
    }
    if (
      input.faceMode === "active-pair" &&
      (!input.activePair || !tripleContainsPair(generators, input.activePair))
    ) {
      continue;
    }
    if (input.faceMode === "one-skeleton" && !input.focus) {
      continue;
    }
    const hinge = input.focus
      ? rankThreeFocusHinge(input.focus, input.pairOrders)
      : undefined;
    const useHingeWitness = input.focus && input.focus.mode === "hinge-witness";
    if (useHingeWitness && hinge) {
      const focused = buildRankThreeFocusHingeGeometry(
        cell,
        hinge,
        input.generatorLabels,
      );
      nodes.push(...focused.nodes);
      edges.push(...focused.edges);
      surfaces.push(...focused.cells);
      continue;
    }
    const localOrders = rankThreePairOrders(generators, input.pairOrders);
    if (!localOrders) {
      warnings.push(
        `${cell.label} was not drawn as a rank-three Coxeter cell because one of its rank-two relation orders is missing.`,
      );
      continue;
    }
    const coxeterCell = buildRankThreeCoxeterCell(localOrders);
    if (!coxeterCell) {
      warnings.push(
        `${cell.label} was not drawn as a rank-three Coxeter cell because its finite orbit could not be enumerated safely.`,
      );
      continue;
    }
    const embedded = embedRankThreeCoxeterCell({
      cell,
      coxeterCell,
      globalGenerators: generators as [number, number, number],
      generatorDirections: input.generatorDirections,
      generatorLabels: input.generatorLabels,
      pairOrders: localOrders,
      faceMode: input.faceMode,
      focus: input.focus,
      activePair: input.activePair,
      focusGenerator: input.focusGenerator,
      relationOrderFilter: input.relationOrderFilter,
      peelMode: input.peelMode,
      separationStrength: input.separationStrength,
      readabilityRole,
    });
    nodes.push(...embedded.nodes);
    edges.push(...embedded.edges);
    surfaces.push(...embedded.cells);
  }
  return { nodes, edges, cells: surfaces, warnings };
}

function tripleContainsPair(triple: number[], pair: [number, number]): boolean {
  return triple.includes(pair[0]) && triple.includes(pair[1]);
}

function rankThreePairOrders(
  generators: number[],
  pairOrders: Map<string, number>,
): [number, number, number] | undefined {
  const [a, b, c] = generators;
  const ab = pairOrders.get(relationPairKey([a, b]));
  const ac = pairOrders.get(relationPairKey([a, c]));
  const bc = pairOrders.get(relationPairKey([b, c]));
  return ab && ac && bc ? [ab, ac, bc] : undefined;
}

function rankThreeFocusHinge(
  focus: YGammaRankThreeFocus,
  pairOrders: Map<string, number>,
): RankThreeFocusHinge | undefined {
  const pairs = focus.pairKeys
    .map((key) => {
      const pair = parseRelationPairKey(key);
      const m = pair ? pairOrders.get(relationPairKey(pair)) : undefined;
      return pair && m ? { pair, m } : undefined;
    })
    .filter((entry): entry is { pair: [number, number]; m: number } =>
      Boolean(entry),
    );
  if (pairs.length < 2) {
    return undefined;
  }

  for (const first of pairs) {
    for (const second of pairs) {
      if (first === second) {
        continue;
      }
      const shared = first.pair.find((generator) =>
        second.pair.includes(generator),
      );
      if (shared === undefined) {
        continue;
      }
      const firstOther = first.pair.find((generator) => generator !== shared);
      const secondOther = second.pair.find((generator) => generator !== shared);
      if (firstOther === undefined || secondOther === undefined) {
        continue;
      }
      const squareLike = first.m === 2 && second.m !== 2 ? first : second;
      const otherLike = squareLike === first ? second : first;
      const squareOther = squareLike.pair.find(
        (generator) => generator !== shared,
      );
      const otherOther = otherLike.pair.find(
        (generator) => generator !== shared,
      );
      if (squareOther === undefined || otherOther === undefined) {
        continue;
      }
      return {
        shared,
        first: {
          pair: [shared, squareOther],
          m: squareLike.m,
          other: squareOther,
        },
        second: {
          pair: [shared, otherOther],
          m: otherLike.m,
          other: otherOther,
        },
      };
    }
  }
  return undefined;
}

function buildRankThreeFocusHingeGeometry(
  cell: YGammaCellRecord,
  hinge: RankThreeFocusHinge,
  generatorLabels: string[],
): RankThreeSceneGeometry {
  const first = buildHingeFace({
    cell,
    pair: hinge.first.pair,
    m: hinge.first.m,
    otherGenerator: hinge.first.other,
    plane: "xy",
    faceIndex: 0,
    generatorLabels,
  });
  const second = buildHingeFace({
    cell,
    pair: hinge.second.pair,
    m: hinge.second.m,
    otherGenerator: hinge.second.other,
    plane: "xz",
    faceIndex: 1,
    generatorLabels,
  });

  return {
    nodes: [...first.nodes, ...second.nodes],
    edges: [...first.edges, ...second.edges],
    cells: [first.cell, second.cell],
    warnings: [],
  };
}

function buildHingeFace(input: {
  cell: YGammaCellRecord;
  pair: [number, number];
  m: number;
  otherGenerator: number;
  plane: "xy" | "xz";
  faceIndex: number;
  generatorLabels: string[];
}): { nodes: SceneNode[]; edges: SceneEdge[]; cell: SceneCell } {
  const [left, right] = input.pair;
  const boundaryLength = 2 * input.m;
  const cornerCount = Math.max(0, boundaryLength - 3);
  const cornerNodeIds = Array.from(
    { length: cornerCount },
    (_entry, cornerIndex) =>
      `${input.cell.id}:focus:${relationPairKey(input.pair)}:corner:${cornerIndex}`,
  );
  const boundaryNodeIds = [
    BASE_NODE_ID,
    arrowEndNodeId(left),
    ...cornerNodeIds,
    arrowEndNodeId(input.otherGenerator),
  ];
  const cornerPositions = hingeCornerPositions(
    cornerCount,
    input.plane,
    input.m,
  );
  const nodes = cornerNodeIds.map(
    (nodeId, cornerIndex): SceneNode => ({
      id: nodeId,
      label: "",
      compactLabel: "",
      length: 3,
      localDistance: 3,
      position: cornerPositions[cornerIndex],
      isRelationBoundary: true,
      ghost: true,
    }),
  );
  const edges = boundaryNodeIds.map(
    (nodeId, step): SceneEdge => ({
      id: `${input.cell.id}:focus-edge:${input.faceIndex}:${step}`,
      source: nodeId,
      target: boundaryNodeIds[(step + 1) % boundaryNodeIds.length],
      generator: step % 2 === 0 ? left : right,
      compactLabel: labelForGenerator(
        input.generatorLabels,
        step % 2 === 0 ? left : right,
      ),
      isRelationBoundary: true,
      emphasis: "readable-boundary",
      directed: true,
    }),
  );

  return {
    nodes,
    edges,
    cell: {
      id: `${input.cell.id}:focus-face:${relationPairKey(input.pair)}`,
      sourceCellId: input.cell.id,
      dimension: 3,
      generatorPair: input.pair,
      boundaryNodeIds,
      localDistance: 3,
      isRelationBoundary: true,
    },
  };
}

function hingeCornerPositions(
  cornerCount: number,
  plane: "xy" | "xz",
  m: number,
): Vec3[] {
  const radius = GENERATOR_ARROW_RADIUS;
  const faceBulge = m === 2 ? 0.18 : 0.42;
  const liftRadius = relationFaceLift(2 * m);
  return Array.from({ length: cornerCount }, (_entry, cornerIndex) => {
    const t = (cornerIndex + 1) / (cornerCount + 1);
    const x = radius * (1 - t);
    const outward = radius * Math.sin(Math.PI * t) * faceBulge;
    const yOrZ = radius * t + outward;
    const lift = Math.sin(Math.PI * t) * liftRadius;
    return plane === "xy" ? [x, yOrZ, lift] : [x, lift, yOrZ];
  });
}

function buildRankThreeCoxeterCell(
  pairOrders: [number, number, number],
): RankThreeCoxeterCell | undefined {
  const cacheKey = pairOrders.join("-");
  const cached = rankThreeCoxeterCellCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const gram = rankThreeGram(pairOrders);
  const inverseGram = invert3(gram);
  if (!inverseGram) {
    return undefined;
  }
  const seed = matVec3(inverseGram, [1, 1, 1]);
  const reflections = [0, 1, 2].map((index) =>
    simpleReflectionMatrix(gram, index),
  );
  const points: Vec3[] = [seed];
  const transitions: number[][] = [];
  const indexByKey = new Map([[pointKey(seed), 0]]);
  const queue = [0];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const point = points[index];
    transitions[index] ??= [];
    for (let generator = 0; generator < 3; generator += 1) {
      const nextPoint = matVec3(reflections[generator], point);
      const key = pointKey(nextPoint);
      let nextIndex = indexByKey.get(key);
      if (nextIndex === undefined) {
        if (points.length >= 240) {
          return undefined;
        }
        nextIndex = points.length;
        points.push(nextPoint);
        indexByKey.set(key, nextIndex);
        queue.push(nextIndex);
      }
      transitions[index][generator] = nextIndex;
    }
  }

  const simpleVertexIndices = reflections.map((reflection) =>
    indexByKey.get(pointKey(matVec3(reflection, seed))),
  );
  if (
    simpleVertexIndices.some((index): index is undefined => index === undefined)
  ) {
    return undefined;
  }

  const result = {
    points,
    transitions,
    simpleVertexIndices: simpleVertexIndices as number[],
  };
  rankThreeCoxeterCellCache.set(cacheKey, result);
  return result;
}

function embedRankThreeCoxeterCell(input: {
  cell: YGammaCellRecord;
  coxeterCell: RankThreeCoxeterCell;
  globalGenerators: [number, number, number];
  generatorDirections: Vec3[];
  generatorLabels: string[];
  pairOrders: [number, number, number];
  faceMode?: YGamma2SkeletonSceneOptions["faceMode"];
  focus?: YGammaRankThreeFocus;
  activePair?: [number, number];
  focusGenerator?: number;
  relationOrderFilter?: number;
  peelMode: YGammaPeelMode;
  separationStrength: number;
  readabilityRole: SceneCell["readabilityRole"];
}): { nodes: SceneNode[]; edges: SceneEdge[]; cells: SceneCell[] } {
  const { cell, coxeterCell, globalGenerators, generatorDirections } = input;
  const basePoint = coxeterCell.points[0];
  const localBasis = columnsToMatrix(
    subtract(coxeterCell.points[coxeterCell.simpleVertexIndices[0]], basePoint),
    subtract(coxeterCell.points[coxeterCell.simpleVertexIndices[1]], basePoint),
    subtract(coxeterCell.points[coxeterCell.simpleVertexIndices[2]], basePoint),
  );
  const inverseLocalBasis = invert3(localBasis);
  if (!inverseLocalBasis) {
    return { nodes: [], edges: [], cells: [] };
  }
  const globalBasis = columnsToMatrix(
    scale(
      generatorDirections[globalGenerators[0]] ??
        stableSphereDirection(globalGenerators[0], 1),
      GENERATOR_ARROW_RADIUS,
    ),
    scale(
      generatorDirections[globalGenerators[1]] ??
        stableSphereDirection(globalGenerators[1], 1),
      GENERATOR_ARROW_RADIUS,
    ),
    scale(
      generatorDirections[globalGenerators[2]] ??
        stableSphereDirection(globalGenerators[2], 1),
      GENERATOR_ARROW_RADIUS,
    ),
  );
  const simpleIndexByOrbitIndex = new Map(
    coxeterCell.simpleVertexIndices.map((orbitIndex, localGenerator) => [
      orbitIndex,
      localGenerator,
    ]),
  );
  const nodeIds = coxeterCell.points.map((_point, orbitIndex) => {
    if (orbitIndex === 0) {
      return BASE_NODE_ID;
    }
    const localGenerator = simpleIndexByOrbitIndex.get(orbitIndex);
    if (localGenerator !== undefined) {
      return arrowEndNodeId(globalGenerators[localGenerator]);
    }
    return `${cell.id}:coxeter-vertex:${orbitIndex}`;
  });
  const positionByOrbitIndex = coxeterCell.points.map((point, orbitIndex) => {
    if (orbitIndex === 0) {
      return [0, 0, 0] as Vec3;
    }
    const localGenerator = simpleIndexByOrbitIndex.get(orbitIndex);
    if (localGenerator !== undefined) {
      return scale(
        generatorDirections[globalGenerators[localGenerator]] ??
          stableSphereDirection(globalGenerators[localGenerator], 1),
        GENERATOR_ARROW_RADIUS,
      );
    }
    const localCoordinates = matVec3(
      inverseLocalBasis,
      subtract(point, basePoint),
    );
    return matVec3(globalBasis, localCoordinates);
  });
  const focusPairKeys = new Set(input.focus?.pairKeys ?? []);
  const activePairKey = input.activePair
    ? relationPairKey(input.activePair)
    : undefined;
  const rawFaces = rankThreeFaceCycles(coxeterCell, input.pairOrders);
  const visibleFaces = rawFaces.filter((face) => {
    const globalPair: [number, number] = [
      globalGenerators[face.globalPair[0]],
      globalGenerators[face.globalPair[1]],
    ];
    const globalPairKey = relationPairKey(globalPair);
    const order = input.pairOrders[pairOrderIndex(face.globalPair)];
    if (
      input.relationOrderFilter !== undefined &&
      order !== input.relationOrderFilter
    ) {
      return false;
    }
    if (
      input.focusGenerator !== undefined &&
      !globalPair.includes(input.focusGenerator)
    ) {
      return false;
    }
    if (
      input.focus &&
      input.faceMode === "active-pair" &&
      activePairKey &&
      globalPairKey !== activePairKey
    ) {
      return false;
    }
    if (input.focus && !focusPairKeys.has(globalPairKey)) {
      return false;
    }
    return input.focus?.showOnlyFundamentalFaces
      ? faceContainsFundamentalPair(face.boundary, face.globalPair, coxeterCell)
      : true;
  });
  const faceDrawings = visibleFaces.map((face) => ({
    face,
    boundary: simpleDrawingBoundary(face.boundary, positionByOrbitIndex),
  }));
  const referencedOrbitIndices = new Set(
    faceDrawings.flatMap((face) => face.boundary),
  );
  if (input.focus?.showOnlyFundamentalFaces === true) {
    return embedFundamentalRankThreeFaces({
      cell,
      faces: visibleFaces,
      globalGenerators,
      generatorDirections,
      generatorLabels: input.generatorLabels,
      activePair: input.activePair,
      exposeConstructionVertices: input.focus.exposeConstructionVertices,
      separationStrength: input.separationStrength,
      readabilityRole: input.readabilityRole,
    });
  }
  const nodes = coxeterCell.points.flatMap((point, orbitIndex): SceneNode[] => {
    if (
      orbitIndex === 0 ||
      simpleIndexByOrbitIndex.has(orbitIndex) ||
      !referencedOrbitIndices.has(orbitIndex)
    ) {
      return [];
    }
    const position = positionByOrbitIndex[orbitIndex];
    return [
      {
        id: nodeIds[orbitIndex],
        label: "",
        compactLabel: "",
        length: 3,
        localDistance: 3,
        position,
        isRelationBoundary: true,
        ghost: input.focus?.exposeConstructionVertices ?? false,
        hidden: !(input.focus?.exposeConstructionVertices ?? false),
      },
    ];
  });
  const cells = faceDrawings.map(({ face, boundary }, faceIndex) => ({
    id: `${cell.id}:coxeter-face:${face.globalPair[0]}-${face.globalPair[1]}:${faceIndex}`,
    sourceCellId: cell.id,
    dimension: 3,
    generatorPair: [
      globalGenerators[face.globalPair[0]],
      globalGenerators[face.globalPair[1]],
    ] as [number, number],
    boundaryNodeIds: boundary.map((orbitIndex) => nodeIds[orbitIndex]),
    localDistance: 3,
    isRelationBoundary: true,
    readabilityRole: input.readabilityRole,
  }));
  const edges = faceDrawings.flatMap(({ face, boundary }, faceIndex) =>
    boundary.map((orbitIndex, step): SceneEdge => {
      const localGenerator =
        step % 2 === 0 ? face.globalPair[0] : face.globalPair[1];
      const globalGenerator = globalGenerators[localGenerator];
      const globalPair: [number, number] = [
        globalGenerators[face.globalPair[0]],
        globalGenerators[face.globalPair[1]],
      ];
      const active =
        input.activePair &&
        relationPairKey(globalPair) === relationPairKey(input.activePair);
      return {
        id: `${cell.id}:coxeter-face-edge:${faceIndex}:${step}`,
        source: nodeIds[orbitIndex],
        target: nodeIds[boundary[(step + 1) % boundary.length]],
        generator: globalGenerator,
        compactLabel: labelForGenerator(input.generatorLabels, globalGenerator),
        isRelationBoundary: true,
        labelLeader: true,
        labelPriority: input.readabilityRole === "focus" ? 28_000 : undefined,
        suppressSemanticLabel: input.readabilityRole === "incident" && !active,
        emphasis: active ? "readable-boundary" : undefined,
        directed: true,
      };
    }),
  );

  return peelRankThreeGeometry(
    { nodes, edges, cells },
    activePairKey,
    input.peelMode,
  );
}

function pairOrderIndex(pair: [number, number]): 0 | 1 | 2 {
  const key = relationPairKey(pair);
  if (key === "0-1") {
    return 0;
  }
  if (key === "0-2") {
    return 1;
  }
  return 2;
}

function peelRankThreeGeometry(
  geometry: { nodes: SceneNode[]; edges: SceneEdge[]; cells: SceneCell[] },
  activePairKey: string | undefined,
  peelMode: YGammaPeelMode,
): { nodes: SceneNode[]; edges: SceneEdge[]; cells: SceneCell[] } {
  if (peelMode === "all" || !activePairKey) {
    return geometry;
  }

  const activeCells = geometry.cells
    .filter((cell) => relationPairKey(cell.generatorPair) === activePairKey)
    .sort((left, right) => left.id.localeCompare(right.id));
  const selectedCell = activeCells[0];
  if (!selectedCell) {
    return geometry;
  }

  const keptCellIds = new Set<string>();
  if (peelMode === "same-rank-three") {
    const sourceCellId = selectedCell.sourceCellId;
    for (const cell of geometry.cells) {
      if (cell.sourceCellId === sourceCellId) {
        keptCellIds.add(cell.id);
      }
    }
  } else if (peelMode === "adjacent-faces") {
    const selectedEdges = new Set(
      boundaryEdgeKeys(selectedCell.boundaryNodeIds),
    );
    for (const cell of geometry.cells) {
      const sharesEdge = boundaryEdgeKeys(cell.boundaryNodeIds).some((key) =>
        selectedEdges.has(key),
      );
      if (cell.id === selectedCell.id || sharesEdge) {
        keptCellIds.add(cell.id);
      }
    }
  } else {
    keptCellIds.add(selectedCell.id);
  }

  const cells = geometry.cells.filter((cell) => keptCellIds.has(cell.id));
  const keptBoundaryEdges = new Set<string>();
  const keptNodeIds = new Set<string>();
  for (const cell of cells) {
    for (const nodeId of cell.boundaryNodeIds) {
      keptNodeIds.add(nodeId);
    }
    for (const edgeKey of boundaryEdgeKeys(cell.boundaryNodeIds)) {
      keptBoundaryEdges.add(edgeKey);
    }
  }

  return {
    nodes: geometry.nodes.filter((node) => keptNodeIds.has(node.id)),
    edges: geometry.edges.filter((edge) =>
      keptBoundaryEdges.has(undirectedEdgeKey(edge.source, edge.target)),
    ),
    cells,
  };
}

function boundaryEdgeKeys(boundaryNodeIds: string[]): string[] {
  return boundaryNodeIds.map((nodeId, index) =>
    undirectedEdgeKey(
      nodeId,
      boundaryNodeIds[(index + 1) % boundaryNodeIds.length],
    ),
  );
}

function undirectedEdgeKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function simpleDrawingBoundary(
  boundary: number[],
  positions: Vec3[],
): number[] {
  if (boundary.length <= 4) {
    return boundary;
  }
  if (boundary.length === 6) {
    return fallbackSimpleBoundary(boundary);
  }
  if (boundaryIsSimple(boundary, positions)) {
    return boundary;
  }
  const points = boundary.map((orbitIndex) => positions[orbitIndex]);
  const center = averageVec3(points);
  const normal = newellNormal(points);
  if (norm(normal) < 1e-9) {
    return boundary;
  }
  const basisZ = normalize(normal);
  const firstDirection = projectOntoPlane(subtract(points[0], center), basisZ);
  const basisX =
    norm(firstDirection) > 1e-9
      ? normalize(firstDirection)
      : orthogonalUnitVector(basisZ);
  const basisY = normalize(cross(basisZ, basisX));
  const sorted = [...boundary].sort((left, right) => {
    const leftVector = subtract(positions[left], center);
    const rightVector = subtract(positions[right], center);
    const leftAngle = Math.atan2(
      dot(leftVector, basisY),
      dot(leftVector, basisX),
    );
    const rightAngle = Math.atan2(
      dot(rightVector, basisY),
      dot(rightVector, basisX),
    );
    return leftAngle - rightAngle;
  });
  const originalStartIndex = sorted.indexOf(boundary[0]);
  if (originalStartIndex < 0) {
    return boundaryIsSimple(sorted, positions)
      ? sorted
      : fallbackSimpleBoundary(boundary);
  }
  const sortedFromOriginalStart = [
    ...sorted.slice(originalStartIndex),
    ...sorted.slice(0, originalStartIndex),
  ];
  if (boundaryIsSimple(sortedFromOriginalStart, positions)) {
    return sortedFromOriginalStart;
  }
  const fallback = fallbackSimpleBoundary(boundary);
  return boundaryIsSimple(fallback, positions)
    ? fallback
    : sortedFromOriginalStart;
}

function fallbackSimpleBoundary(boundary: number[]): number[] {
  if (boundary.length === 6) {
    return [
      boundary[0],
      boundary[1],
      boundary[4],
      boundary[3],
      boundary[2],
      boundary[5],
    ];
  }
  return boundary;
}

function boundaryIsSimple(boundary: number[], positions: Vec3[]): boolean {
  const projected = projectBoundaryToPlane(boundary, positions);
  if (!projected) {
    return false;
  }
  for (let left = 0; left < projected.length; left += 1) {
    const leftNext = (left + 1) % projected.length;
    for (let right = left + 1; right < projected.length; right += 1) {
      const rightNext = (right + 1) % projected.length;
      const adjacent =
        leftNext === right ||
        rightNext === left ||
        (left === 0 && right === projected.length - 1);
      if (adjacent) {
        continue;
      }
      if (
        segmentsProperlyIntersect(
          projected[left],
          projected[leftNext],
          projected[right],
          projected[rightNext],
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function projectBoundaryToPlane(
  boundary: number[],
  positions: Vec3[],
): Array<[number, number]> | undefined {
  const points = boundary.map((orbitIndex) => positions[orbitIndex]);
  const center = averageVec3(points);
  const normal = newellNormal(points);
  if (norm(normal) < 1e-9) {
    return undefined;
  }
  const basisZ = normalize(normal);
  const firstDirection = projectOntoPlane(subtract(points[0], center), basisZ);
  const basisX =
    norm(firstDirection) > 1e-9
      ? normalize(firstDirection)
      : orthogonalUnitVector(basisZ);
  const basisY = normalize(cross(basisZ, basisX));
  return points.map((point) => {
    const relative = subtract(point, center);
    return [dot(relative, basisX), dot(relative, basisY)];
  });
}

function segmentsProperlyIntersect(
  firstStart: [number, number],
  firstEnd: [number, number],
  secondStart: [number, number],
  secondEnd: [number, number],
): boolean {
  const firstSecondStart = orient2(firstStart, firstEnd, secondStart);
  const firstSecondEnd = orient2(firstStart, firstEnd, secondEnd);
  const secondFirstStart = orient2(secondStart, secondEnd, firstStart);
  const secondFirstEnd = orient2(secondStart, secondEnd, firstEnd);
  return (
    firstSecondStart * firstSecondEnd < -1e-8 &&
    secondFirstStart * secondFirstEnd < -1e-8
  );
}

function orient2(
  left: [number, number],
  middle: [number, number],
  right: [number, number],
): number {
  return (
    (middle[0] - left[0]) * (right[1] - left[1]) -
    (middle[1] - left[1]) * (right[0] - left[0])
  );
}

function averageVec3(points: Vec3[]): Vec3 {
  if (points.length === 0) {
    return [0, 0, 0];
  }
  const total = points.reduce<Vec3>((sum, point) => add(sum, point), [0, 0, 0]);
  return scale(total, 1 / points.length);
}

function newellNormal(points: Vec3[]): Vec3 {
  let normal: Vec3 = [0, 0, 0];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    normal = [
      normal[0] + (current[1] - next[1]) * (current[2] + next[2]),
      normal[1] + (current[2] - next[2]) * (current[0] + next[0]),
      normal[2] + (current[0] - next[0]) * (current[1] + next[1]),
    ];
  }
  return normal;
}

function embedFundamentalRankThreeFaces(input: {
  cell: YGammaCellRecord;
  faces: RankThreeFaceCycle[];
  globalGenerators: [number, number, number];
  generatorDirections: Vec3[];
  generatorLabels: string[];
  activePair?: [number, number];
  exposeConstructionVertices?: boolean;
  separationStrength: number;
  readabilityRole: SceneCell["readabilityRole"];
}): { nodes: SceneNode[]; edges: SceneEdge[]; cells: SceneCell[] } {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const cells: SceneCell[] = [];
  const activePairKey = input.activePair
    ? relationPairKey(input.activePair)
    : undefined;

  input.faces.forEach((face, faceIndex) => {
    const left = input.globalGenerators[face.globalPair[0]];
    const right = input.globalGenerators[face.globalPair[1]];
    const leftDirection =
      input.generatorDirections[left] ?? stableSphereDirection(left, 1);
    const rightDirection =
      input.generatorDirections[right] ?? stableSphereDirection(right, 1);
    const pair: [number, number] = [left, right];
    const pairKeyValue = relationPairKey(pair);
    const boundaryLength = face.boundary.length;
    const hiddenCornerCount = Math.max(0, boundaryLength - 3);
    const offset = cohesiveFaceOffset(
      leftDirection,
      rightDirection,
      faceIndex,
      Math.max(1, input.faces.length),
      input.separationStrength,
    );
    const hiddenCornerPositions = cohesiveHiddenCorners(
      leftDirection,
      rightDirection,
      boundaryLength,
      hiddenCornerCount,
      offset,
      input.separationStrength,
    );
    const hiddenCornerIds = hiddenCornerPositions.map(
      (_position, cornerIndex) =>
        `${input.cell.id}:fundamental-face:${pairKeyValue}:corner:${cornerIndex}`,
    );
    const boundaryNodeIds = [
      BASE_NODE_ID,
      arrowEndNodeId(left),
      ...hiddenCornerIds,
      arrowEndNodeId(right),
    ];

    hiddenCornerPositions.forEach((position, cornerIndex) => {
      nodes.push({
        id: hiddenCornerIds[cornerIndex],
        label: "",
        compactLabel: "",
        length: 3,
        localDistance: 3,
        position,
        isRelationBoundary: true,
        ghost: input.exposeConstructionVertices ?? false,
        hidden: !(input.exposeConstructionVertices ?? false),
      });
    });

    const active =
      activePairKey === undefined || pairKeyValue === activePairKey;
    for (let step = 0; step < boundaryNodeIds.length; step += 1) {
      const generator = step % 2 === 0 ? left : right;
      edges.push({
        id: `${input.cell.id}:fundamental-face-edge:${pairKeyValue}:${step}`,
        source: boundaryNodeIds[step],
        target: boundaryNodeIds[(step + 1) % boundaryNodeIds.length],
        generator,
        compactLabel: labelForGenerator(input.generatorLabels, generator),
        isRelationBoundary: true,
        labelLeader: true,
        labelPriority: input.readabilityRole === "focus" ? 28_000 : undefined,
        suppressSemanticLabel: input.readabilityRole === "incident" && !active,
        emphasis: active ? "readable-boundary" : undefined,
        directed: true,
      });
    }

    cells.push({
      id: `${input.cell.id}:fundamental-face:${pairKeyValue}:${faceIndex}`,
      sourceCellId: input.cell.id,
      dimension: 3,
      generatorPair: pair,
      boundaryNodeIds,
      localDistance: 3,
      isRelationBoundary: true,
      readabilityRole: input.readabilityRole,
    });
  });

  return { nodes, edges, cells };
}

function projectOntoPlane(vector: Vec3, normal: Vec3): Vec3 {
  return subtract(vector, scale(normal, dot(vector, normal)));
}

function orthogonalUnitVector(normal: Vec3): Vec3 {
  const fallback: Vec3 = Math.abs(normal[2]) < 0.88 ? [0, 0, 1] : [0, 1, 0];
  return normalize(projectOntoPlane(fallback, normal));
}

function faceContainsFundamentalPair(
  boundary: number[],
  localPair: [number, number],
  coxeterCell: RankThreeCoxeterCell,
): boolean {
  return (
    boundary.includes(0) &&
    boundary.includes(coxeterCell.simpleVertexIndices[localPair[0]]) &&
    boundary.includes(coxeterCell.simpleVertexIndices[localPair[1]])
  );
}

function rankThreeFaceCycles(
  coxeterCell: RankThreeCoxeterCell,
  pairOrders: [number, number, number],
): RankThreeFaceCycle[] {
  const pairSpecs: Array<{ pair: [number, number]; m: number }> = [
    { pair: [0, 1], m: pairOrders[0] },
    { pair: [0, 2], m: pairOrders[1] },
    { pair: [1, 2], m: pairOrders[2] },
  ];
  const seen = new Set<string>();
  const faces: RankThreeFaceCycle[] = [];

  for (const spec of pairSpecs) {
    const boundaryLength = 2 * spec.m;
    for (
      let startIndex = 0;
      startIndex < coxeterCell.points.length;
      startIndex += 1
    ) {
      const boundary = [startIndex];
      let current = startIndex;
      for (let step = 0; step < boundaryLength - 1; step += 1) {
        const generator = step % 2 === 0 ? spec.pair[0] : spec.pair[1];
        current = coxeterCell.transitions[current]?.[generator] ?? current;
        boundary.push(current);
      }
      const closingGenerator =
        (boundaryLength - 1) % 2 === 0 ? spec.pair[0] : spec.pair[1];
      if (
        coxeterCell.transitions[current]?.[closingGenerator] !== startIndex ||
        new Set(boundary).size !== boundaryLength
      ) {
        continue;
      }
      const key = `${spec.pair.join("-")}:${[...boundary]
        .sort((left, right) => left - right)
        .join(".")}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      faces.push({ globalPair: spec.pair, boundary });
    }
  }

  return faces;
}

function choleskyRootCoordinates(gram: Mat3): Mat3 | undefined {
  const l00 = Math.sqrt(Math.max(0, gram[0][0]));
  if (l00 < 1e-9) {
    return undefined;
  }
  const l10 = gram[1][0] / l00;
  const l20 = gram[2][0] / l00;
  const l11Squared = gram[1][1] - l10 * l10;
  if (l11Squared <= 1e-9) {
    return undefined;
  }
  const l11 = Math.sqrt(l11Squared);
  const l21 = (gram[2][1] - l20 * l10) / l11;
  const l22Squared = gram[2][2] - l20 * l20 - l21 * l21;
  if (l22Squared <= 1e-9) {
    return undefined;
  }
  const l22 = Math.sqrt(l22Squared);

  return [
    [l00, 0, 0],
    [l10, l11, 0],
    [l20, l21, l22],
  ];
}

function coeffsToEuclidean(coefficients: Vec3, choleskyLower: Mat3): Vec3 {
  return [
    choleskyLower[0][0] * coefficients[0] +
      choleskyLower[1][0] * coefficients[1] +
      choleskyLower[2][0] * coefficients[2],
    choleskyLower[1][1] * coefficients[1] +
      choleskyLower[2][1] * coefficients[2],
    choleskyLower[2][2] * coefficients[2],
  ];
}

function rankThreeGram(pairOrders: [number, number, number]): Mat3 {
  const [ab, ac, bc] = pairOrders;
  return [
    [1, -coxeterCos(ab), -coxeterCos(ac)],
    [-coxeterCos(ab), 1, -coxeterCos(bc)],
    [-coxeterCos(ac), -coxeterCos(bc), 1],
  ];
}

function coxeterCos(m: number): number {
  if (m === 2) {
    return 0;
  }
  if (m === 3) {
    return 0.5;
  }
  if (m === 4) {
    return Math.SQRT1_2;
  }
  if (m === 5) {
    return (1 + Math.sqrt(5)) / 4;
  }
  if (m === 6) {
    return Math.sqrt(3) / 2;
  }
  const value = Math.cos(Math.PI / m);
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function simpleReflectionMatrix(gram: Mat3, generator: number): Mat3 {
  const matrix: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let column = 0; column < 3; column += 1) {
    matrix[generator][column] -= 2 * gram[column][generator];
  }
  return matrix;
}

function columnsToMatrix(first: Vec3, second: Vec3, third: Vec3): Mat3 {
  return [
    [first[0], second[0], third[0]],
    [first[1], second[1], third[1]],
    [first[2], second[2], third[2]],
  ];
}

function matVec3(matrix: Mat3, vector: Vec3): Vec3 {
  return [
    dot(matrix[0], vector),
    dot(matrix[1], vector),
    dot(matrix[2], vector),
  ];
}

function invert3(matrix: Mat3): Mat3 | undefined {
  const [a, b, c] = matrix[0];
  const [d, e, f] = matrix[1];
  const [g, h, i] = matrix[2];
  const determinant =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(determinant) < 1e-9) {
    return undefined;
  }
  const scaleFactor = 1 / determinant;
  return [
    [
      (e * i - f * h) * scaleFactor,
      (c * h - b * i) * scaleFactor,
      (b * f - c * e) * scaleFactor,
    ],
    [
      (f * g - d * i) * scaleFactor,
      (a * i - c * g) * scaleFactor,
      (c * d - a * f) * scaleFactor,
    ],
    [
      (d * h - e * g) * scaleFactor,
      (b * g - a * h) * scaleFactor,
      (a * e - b * d) * scaleFactor,
    ],
  ];
}

function pointKey(point: Vec3): string {
  return point.map((coordinate) => coordinate.toFixed(8)).join(",");
}

function stableSphereDirection(index: number, count: number): Vec3 {
  const safeCount = Math.max(1, count);
  if (safeCount === 1) {
    return [1, 0, 0];
  }
  const z = 1 - (2 * (index + 0.5)) / safeCount;
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  const theta = index * GOLDEN_ANGLE;
  return normalize([radius * Math.cos(theta), radius * Math.sin(theta), z]);
}

function cohesiveHiddenCorners(
  left: Vec3,
  right: Vec3,
  boundaryLength: number,
  hiddenCornerCount: number,
  offset: Vec3,
  separationStrength: number,
): Vec3[] {
  const expansion = Math.max(0, separationStrength);
  const outerRadius = Math.min(
    FACE_OUTER_RADIUS_MAX + expansion * 1.2,
    FACE_OUTER_RADIUS_BASE + boundaryLength * 0.06 + expansion * 0.7,
  );
  const midDirection = normalize(add(left, right));
  const liftNormal = relationNormal(left, right, 0, 1);
  const liftRadius = relationFaceLift(boundaryLength);
  const corners: Vec3[] = [];
  for (let cornerIndex = 0; cornerIndex < hiddenCornerCount; cornerIndex += 1) {
    const t = (cornerIndex + 1) / (hiddenCornerCount + 1);
    const direction = normalize(add(scale(left, 1 - t), scale(right, t)));
    const bulge = scale(
      midDirection,
      Math.sin(Math.PI * t) * FACE_BULGE * (1 + expansion * 0.34),
    );
    // Relation faces are readability surfaces, not affine certificates.
    // Lifting hidden corners keeps every 2m-gon legible in the 3D viewer,
    // including decagons where the old construction could sit in one plane.
    const lift = scale(
      liftNormal,
      Math.sin(Math.PI * t) * liftRadius * (1 + expansion * 0.52),
    );
    corners.push(
      add(add(add(scale(direction, outerRadius), bulge), offset), lift),
    );
  }
  return corners;
}

function relationFaceLift(boundaryLength: number): number {
  return Math.min(
    FACE_LIFT_MAX,
    FACE_LIFT_BASE + Math.max(0, boundaryLength - 4) * FACE_LIFT_PER_EDGE,
  );
}

function cohesiveFaceOffset(
  left: Vec3,
  right: Vec3,
  index: number,
  relationCount: number,
  separationStrength: number,
): Vec3 {
  const normal = relationNormal(left, right, index, relationCount);
  const centeredIndex = index - (Math.max(1, relationCount) - 1) / 2;
  const cappedIndex = Math.max(-8, Math.min(8, centeredIndex));
  const layer =
    cappedIndex * FACE_LAYER_STEP * (0.55 + separationStrength * 0.58);
  return scale(normal, layer);
}

function relationNormal(
  left: Vec3,
  right: Vec3,
  index: number,
  relationCount: number,
): Vec3 {
  const normal = cross(left, right);
  if (norm(normal) > 1e-6) {
    return normalize(normal);
  }
  const fallback = stableSphereDirection(index, Math.max(1, relationCount));
  const pairDirection = normalize(add(left, right));
  const projected = subtract(
    fallback,
    scale(pairDirection, dot(fallback, pairDirection)),
  );
  if (norm(projected) > 1e-6) {
    return normalize(projected);
  }
  return Math.abs(pairDirection[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(vector: Vec3, scalar: number): Vec3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function norm(vector: Vec3): number {
  return Math.sqrt(dot(vector, vector));
}

function normalize(vector: Vec3): Vec3 {
  const length = norm(vector);
  if (length < 1e-9) {
    return [1, 0, 0];
  }
  return scale(vector, 1 / length);
}
