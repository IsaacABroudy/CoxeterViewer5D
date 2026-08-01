import type { JnwLegalOrbitSummary } from "../game";
import type { YGammaCellAtlas } from "./yGammaAtlas";

export interface JnwCoverBaseAtlasIndex {
  systemName: string;
  baseVertexId: string;
  generatorCells: Array<{ generator: number; cellId: string }>;
  rankTwoCells: Array<{
    generatorPair: [number, number];
    m: number;
    cellId: string;
  }>;
}

export interface JnwCoverStateVertex {
  /** The exact state ID from the JNW move orbit. */
  id: string;
  generators: number[];
  projectsToBaseVertexId: string;
}

export interface JnwCoverRail {
  /** The exact orbit-edge ID; this record is not a drawing copy. */
  id: string;
  sourceStateId: string;
  targetStateId: string;
  endpointStateIds: [string, string];
  generator: number;
  projectsToGeneratorCellId: string;
  midpointId: string;
}

export interface JnwCoverRelationCell {
  /** The exact closed rank-two diagnostic ID. */
  id: string;
  generatorPair: [number, number];
  m: number;
  boundaryStateIds: string[];
  boundaryRailIds: string[];
  projectsToRankTwoCellId: string;
  centerId: string;
  sectorIds: string[];
}

export interface JnwCoverRailMidpoint {
  id: string;
  exactRailId: string;
  endpointStateIds: [string, string];
  projectsToGeneratorCellId: string;
}

export interface JnwCoverRelationCenter {
  id: string;
  exactRelationCellId: string;
  projectsToRankTwoCellId: string;
}

export interface JnwCoverSector {
  id: string;
  exactRelationCellId: string;
  boundaryIndex: number;
  ownerStateId: string;
  previousStateId: string;
  nextStateId: string;
  incomingRailId: string;
  outgoingRailId: string;
  incomingMidpointId: string;
  outgoingMidpointId: string;
  centerId: string;
  baseVertexId: string;
  baseGeneratorCellIds: [string, string];
  baseRankTwoCellId: string;
  /**
   * One quarter of a RACG square, in cyclic order. Midpoints and the center
   * are shared with neighboring sectors; only the sector itself is state-owned.
   */
  subdivisionBoundaryIds: [string, string, string, string];
}

export interface JnwCoverInvariantSummary {
  ok: boolean;
  counts: {
    states: number;
    rails: number;
    relationCells: number;
    railMidpoints: number;
    relationCenters: number;
    sectors: number;
  };
  checks: {
    fourStateOrbit: boolean;
    exactIdsUnique: boolean;
    projectionsResolve: boolean;
    oneMidpointPerRail: boolean;
    oneCenterPerRelationCell: boolean;
    fourSectorsPerSquare: boolean;
    sectorBoundaryIncidence: boolean;
  };
  errors: string[];
}

/**
 * Exact incidence data for the four-state move cover over the project's
 * Y_Gamma atlas. This model has no positions, offsets, or display helpers.
 */
export interface JnwFourStateCoverModel {
  kind: "jnw-four-state-move-cover";
  baseAtlas: JnwCoverBaseAtlasIndex;
  stateVertices: JnwCoverStateVertex[];
  rails: JnwCoverRail[];
  relationCells: JnwCoverRelationCell[];
  railMidpoints: JnwCoverRailMidpoint[];
  relationCenters: JnwCoverRelationCenter[];
  sectors: JnwCoverSector[];
  invariants: JnwCoverInvariantSummary;
}

/**
 * Builds the cubical chamber subdivision of a four-state RACG move cover.
 * Exact orbit IDs are retained for states, rails, and relation cells. The
 * added midpoint, center, and sector IDs describe a subdivision only.
 */
export function buildJnwFourStateCoverModel(
  atlas: YGammaCellAtlas,
  summary: JnwLegalOrbitSummary,
): JnwFourStateCoverModel {
  const inputErrors = validateInputs(atlas, summary);
  if (inputErrors.length > 0) {
    throw new Error(
      `Cannot build the exact JNW four-state cover:\n${inputErrors.join("\n")}`,
    );
  }

  const baseAtlas = indexBaseAtlas(atlas);
  const generatorCellByGenerator = new Map(
    baseAtlas.generatorCells.map((entry) => [entry.generator, entry.cellId]),
  );
  const rankTwoCellByPair = new Map(
    baseAtlas.rankTwoCells.map((entry) => [
      pairKey(entry.generatorPair),
      entry,
    ]),
  );

  const stateVertices = summary.states.map((state) => ({
    id: state.id,
    generators: [...state.generators],
    projectsToBaseVertexId: baseAtlas.baseVertexId,
  }));
  const rails = summary.edges.map((edge) => ({
    id: edge.id,
    sourceStateId: edge.source,
    targetStateId: edge.target,
    endpointStateIds: sortedPair(edge.undirectedSource, edge.undirectedTarget),
    generator: edge.generator,
    projectsToGeneratorCellId: requiredMapValue(
      generatorCellByGenerator,
      edge.generator,
      `generator ${edge.generator}`,
    ),
    midpointId: midpointId(edge.id),
  }));
  const railById = new Map(rails.map((rail) => [rail.id, rail]));
  const railMidpoints = rails.map((rail) => ({
    id: rail.midpointId,
    exactRailId: rail.id,
    endpointStateIds: rail.endpointStateIds,
    projectsToGeneratorCellId: rail.projectsToGeneratorCellId,
  }));

  const relationCells: JnwCoverRelationCell[] = [];
  const relationCenters: JnwCoverRelationCenter[] = [];
  const sectors: JnwCoverSector[] = [];

  for (const diagnostic of closedDiagnostics(summary)) {
    const baseCell = requiredMapValue(
      rankTwoCellByPair,
      pairKey(diagnostic.generatorPair),
      `rank-two pair ${diagnostic.generatorPair.join("-")}`,
    );
    const centerId = relationCenterId(diagnostic.id);
    const sectorIds = diagnostic.boundaryStateIds.map((stateId, index) =>
      sectorId(diagnostic.id, index, stateId),
    );

    relationCells.push({
      id: diagnostic.id,
      generatorPair: diagnostic.generatorPair,
      m: diagnostic.m,
      boundaryStateIds: [...diagnostic.boundaryStateIds],
      boundaryRailIds: [...diagnostic.boundaryEdgeIds],
      projectsToRankTwoCellId: baseCell.cellId,
      centerId,
      sectorIds,
    });
    relationCenters.push({
      id: centerId,
      exactRelationCellId: diagnostic.id,
      projectsToRankTwoCellId: baseCell.cellId,
    });

    for (
      let index = 0;
      index < diagnostic.boundaryStateIds.length;
      index += 1
    ) {
      const previousIndex =
        (index + diagnostic.boundaryStateIds.length - 1) %
        diagnostic.boundaryStateIds.length;
      const nextIndex = (index + 1) % diagnostic.boundaryStateIds.length;
      const incomingRail = requiredMapValue(
        railById,
        diagnostic.boundaryEdgeIds[previousIndex],
        `incoming boundary rail at ${diagnostic.id}:${index}`,
      );
      const outgoingRail = requiredMapValue(
        railById,
        diagnostic.boundaryEdgeIds[index],
        `outgoing boundary rail at ${diagnostic.id}:${index}`,
      );
      const ownerStateId = diagnostic.boundaryStateIds[index];

      sectors.push({
        id: sectorIds[index],
        exactRelationCellId: diagnostic.id,
        boundaryIndex: index,
        ownerStateId,
        previousStateId: diagnostic.boundaryStateIds[previousIndex],
        nextStateId: diagnostic.boundaryStateIds[nextIndex],
        incomingRailId: incomingRail.id,
        outgoingRailId: outgoingRail.id,
        incomingMidpointId: incomingRail.midpointId,
        outgoingMidpointId: outgoingRail.midpointId,
        centerId,
        baseVertexId: baseAtlas.baseVertexId,
        baseGeneratorCellIds: [
          outgoingRail.projectsToGeneratorCellId,
          incomingRail.projectsToGeneratorCellId,
        ],
        baseRankTwoCellId: baseCell.cellId,
        subdivisionBoundaryIds: [
          ownerStateId,
          outgoingRail.midpointId,
          centerId,
          incomingRail.midpointId,
        ],
      });
    }
  }

  const modelWithoutInvariants = {
    kind: "jnw-four-state-move-cover" as const,
    baseAtlas,
    stateVertices,
    rails,
    relationCells,
    railMidpoints,
    relationCenters,
    sectors,
  };
  const invariants = validateJnwFourStateCoverModel(modelWithoutInvariants);
  if (!invariants.ok) {
    throw new Error(
      `Constructed an invalid JNW four-state cover:\n${invariants.errors.join("\n")}`,
    );
  }

  return { ...modelWithoutInvariants, invariants };
}

export function validateJnwFourStateCoverModel(
  model: Omit<JnwFourStateCoverModel, "invariants"> | JnwFourStateCoverModel,
): JnwCoverInvariantSummary {
  const errors: string[] = [];
  const stateIds = new Set(model.stateVertices.map((state) => state.id));
  const railIds = new Set(model.rails.map((rail) => rail.id));
  const relationIds = new Set(model.relationCells.map((cell) => cell.id));
  const midpointIds = new Set(
    model.railMidpoints.map((midpoint) => midpoint.id),
  );
  const centerIds = new Set(model.relationCenters.map((center) => center.id));
  const allExactIds = [
    ...model.stateVertices.map((state) => state.id),
    ...model.rails.map((rail) => rail.id),
    ...model.relationCells.map((cell) => cell.id),
  ];
  const exactIdsUnique =
    stateIds.size === model.stateVertices.length &&
    railIds.size === model.rails.length &&
    relationIds.size === model.relationCells.length &&
    new Set(allExactIds).size === allExactIds.length;
  if (!exactIdsUnique) {
    errors.push("Exact state, rail, and relation-cell IDs must be unique.");
  }

  const fourStateOrbit = model.stateVertices.length === 4;
  if (!fourStateOrbit) {
    errors.push("The four-state move cover must have exactly four states.");
  }

  const generatorCellByGenerator = new Map(
    model.baseAtlas.generatorCells.map((entry) => [
      entry.generator,
      entry.cellId,
    ]),
  );
  const rankTwoCellByPair = new Map(
    model.baseAtlas.rankTwoCells.map((entry) => [
      pairKey(entry.generatorPair),
      entry,
    ]),
  );
  const projectionsResolve =
    model.stateVertices.every(
      (state) => state.projectsToBaseVertexId === model.baseAtlas.baseVertexId,
    ) &&
    model.rails.every(
      (rail) =>
        generatorCellByGenerator.get(rail.generator) ===
        rail.projectsToGeneratorCellId,
    ) &&
    model.relationCells.every((cell) => {
      const baseCell = rankTwoCellByPair.get(pairKey(cell.generatorPair));
      return (
        baseCell?.cellId === cell.projectsToRankTwoCellId &&
        baseCell.m === cell.m
      );
    });
  if (!projectionsResolve) {
    errors.push(
      "At least one cover cell does not project to the indexed atlas.",
    );
  }

  const midpointByRail = countBy(
    model.railMidpoints.map((midpoint) => midpoint.exactRailId),
  );
  const midpointById = new Map(
    model.railMidpoints.map((midpoint) => [midpoint.id, midpoint]),
  );
  const oneMidpointPerRail =
    model.railMidpoints.length === model.rails.length &&
    midpointIds.size === model.railMidpoints.length &&
    model.rails.every((rail) => {
      const midpoint = midpointById.get(rail.midpointId);
      return (
        midpointByRail.get(rail.id) === 1 &&
        midpoint?.exactRailId === rail.id &&
        sameUnorderedPair(midpoint.endpointStateIds, rail.endpointStateIds) &&
        midpoint.projectsToGeneratorCellId === rail.projectsToGeneratorCellId
      );
    });
  if (!oneMidpointPerRail) {
    errors.push("Every exact rail must have one shared midpoint.");
  }

  const centersByRelation = countBy(
    model.relationCenters.map((center) => center.exactRelationCellId),
  );
  const centerById = new Map(
    model.relationCenters.map((center) => [center.id, center]),
  );
  const oneCenterPerRelationCell =
    model.relationCenters.length === model.relationCells.length &&
    centerIds.size === model.relationCenters.length &&
    model.relationCells.every((cell) => {
      const center = centerById.get(cell.centerId);
      return (
        centersByRelation.get(cell.id) === 1 &&
        center?.exactRelationCellId === cell.id &&
        center.projectsToRankTwoCellId === cell.projectsToRankTwoCellId
      );
    });
  if (!oneCenterPerRelationCell) {
    errors.push("Every exact relation cell must have one shared center.");
  }

  const sectorsByRelation = groupBy(
    model.sectors,
    (sector) => sector.exactRelationCellId,
  );
  const fourSectorsPerSquare = model.relationCells.every((cell) => {
    const relationSectors = sectorsByRelation.get(cell.id) ?? [];
    return (
      cell.m === 2 &&
      cell.boundaryStateIds.length === 4 &&
      relationSectors.length === 4 &&
      new Set(relationSectors.map((sector) => sector.ownerStateId)).size ===
        4 &&
      cell.sectorIds.length === 4 &&
      sameStringSet(
        cell.sectorIds,
        relationSectors.map((sector) => sector.id),
      )
    );
  });
  if (!fourSectorsPerSquare) {
    errors.push("Every RACG square must have four state-owned sectors.");
  }

  const railById = new Map(model.rails.map((rail) => [rail.id, rail]));
  const relationById = new Map(
    model.relationCells.map((cell) => [cell.id, cell]),
  );
  const sectorBoundaryIncidence = model.sectors.every((sector) => {
    const relation = relationById.get(sector.exactRelationCellId);
    const incoming = railById.get(sector.incomingRailId);
    const outgoing = railById.get(sector.outgoingRailId);
    if (!relation || !incoming || !outgoing) {
      return false;
    }
    const incomingIncident = incoming.endpointStateIds.includes(
      sector.ownerStateId,
    );
    const outgoingIncident = outgoing.endpointStateIds.includes(
      sector.ownerStateId,
    );
    const boundaryLength = relation.boundaryStateIds.length;
    const previousIndex =
      (sector.boundaryIndex + boundaryLength - 1) % boundaryLength;
    const nextIndex = (sector.boundaryIndex + 1) % boundaryLength;
    return (
      stateIds.has(sector.ownerStateId) &&
      relation.boundaryStateIds[sector.boundaryIndex] === sector.ownerStateId &&
      relation.boundaryStateIds[previousIndex] === sector.previousStateId &&
      relation.boundaryStateIds[nextIndex] === sector.nextStateId &&
      relation.boundaryRailIds[previousIndex] === sector.incomingRailId &&
      relation.boundaryRailIds[sector.boundaryIndex] ===
        sector.outgoingRailId &&
      incomingIncident &&
      outgoingIncident &&
      incoming.midpointId === sector.incomingMidpointId &&
      outgoing.midpointId === sector.outgoingMidpointId &&
      relation.centerId === sector.centerId &&
      sector.baseVertexId === model.baseAtlas.baseVertexId &&
      sector.baseGeneratorCellIds[0] === outgoing.projectsToGeneratorCellId &&
      sector.baseGeneratorCellIds[1] === incoming.projectsToGeneratorCellId &&
      sector.baseRankTwoCellId === relation.projectsToRankTwoCellId &&
      sector.subdivisionBoundaryIds[0] === sector.ownerStateId &&
      sector.subdivisionBoundaryIds[1] === sector.outgoingMidpointId &&
      sector.subdivisionBoundaryIds[2] === sector.centerId &&
      sector.subdivisionBoundaryIds[3] === sector.incomingMidpointId
    );
  });
  const boundaryRailsSharedByAdjacentSectors = model.relationCells.every(
    (relation) => {
      const relationSectors = sectorsByRelation.get(relation.id) ?? [];
      return relation.boundaryRailIds.every(
        (railId) =>
          relationSectors.filter(
            (sector) =>
              sector.incomingRailId === railId ||
              sector.outgoingRailId === railId,
          ).length === 2,
      );
    },
  );
  const completeSectorBoundaryIncidence =
    sectorBoundaryIncidence && boundaryRailsSharedByAdjacentSectors;
  if (!completeSectorBoundaryIncidence) {
    errors.push("A sector does not match its exact state/rail boundary data.");
  }

  return {
    ok: errors.length === 0,
    counts: {
      states: model.stateVertices.length,
      rails: model.rails.length,
      relationCells: model.relationCells.length,
      railMidpoints: model.railMidpoints.length,
      relationCenters: model.relationCenters.length,
      sectors: model.sectors.length,
    },
    checks: {
      fourStateOrbit,
      exactIdsUnique,
      projectionsResolve,
      oneMidpointPerRail,
      oneCenterPerRelationCell,
      fourSectorsPerSquare,
      sectorBoundaryIncidence: completeSectorBoundaryIncidence,
    },
    errors,
  };
}

function validateInputs(
  atlas: YGammaCellAtlas,
  summary: JnwLegalOrbitSummary,
): string[] {
  const errors: string[] = [];
  if (!summary.rightAngled) {
    errors.push("The exact sector model currently supports RACG squares only.");
  }
  if (!summary.orbitComplete) {
    errors.push("The JNW state orbit is incomplete.");
  }
  if (summary.states.length !== 4) {
    errors.push(`Expected four states; received ${summary.states.length}.`);
  }
  if (!unique(summary.states.map((state) => state.id))) {
    errors.push("The orbit contains duplicate state IDs.");
  }
  if (!unique(summary.edges.map((edge) => edge.id))) {
    errors.push("The orbit contains duplicate exact rail IDs.");
  }
  if (!unique(closedDiagnostics(summary).map((cell) => cell.id))) {
    errors.push("The orbit contains duplicate exact relation-cell IDs.");
  }

  const stateIds = new Set(summary.states.map((state) => state.id));
  const edgeById = new Map(summary.edges.map((edge) => [edge.id, edge]));
  const generatorCells = new Map(
    atlas.generatorCells.map((cell) => [cell.generators[0], cell]),
  );
  for (const edge of summary.edges) {
    if (!stateIds.has(edge.source) || !stateIds.has(edge.target)) {
      errors.push(`Rail ${edge.id} has an unknown endpoint.`);
    }
    if (!generatorCells.has(edge.generator)) {
      errors.push(
        `Rail ${edge.id} has no generator-cell projection in Y_Gamma.`,
      );
    }
  }

  const rankTwoByPair = new Map(
    atlas.rankTwoCells.map((cell) => [
      pairKey(cell.generators as [number, number]),
      cell,
    ]),
  );
  for (const diagnostic of closedDiagnostics(summary)) {
    if (!diagnostic.ok) {
      errors.push(`Closed relation ${diagnostic.id} has incomplete rail data.`);
    }
    if (diagnostic.m !== 2) {
      errors.push(`Relation ${diagnostic.id} is not a RACG square.`);
    }
    if (
      diagnostic.boundaryStateIds.length !== 4 ||
      diagnostic.boundaryEdgeIds.length !== 4
    ) {
      errors.push(
        `Relation ${diagnostic.id} does not have a four-step boundary.`,
      );
      continue;
    }
    if (new Set(diagnostic.boundaryStateIds).size !== 4) {
      errors.push(
        `Relation ${diagnostic.id} does not meet four distinct cover states.`,
      );
    }
    const baseCell = rankTwoByPair.get(pairKey(diagnostic.generatorPair));
    if (!baseCell || baseCell.m !== diagnostic.m) {
      errors.push(
        `Relation ${diagnostic.id} has no matching Y_Gamma rank-two cell.`,
      );
    }
    for (let index = 0; index < 4; index += 1) {
      const stateId = diagnostic.boundaryStateIds[index];
      const nextStateId = diagnostic.boundaryStateIds[(index + 1) % 4];
      const edge = edgeById.get(diagnostic.boundaryEdgeIds[index]);
      const expectedGenerator = diagnostic.generatorPair[index % 2];
      if (
        !edge ||
        !sameUnorderedPair(
          [edge.undirectedSource, edge.undirectedTarget],
          [stateId, nextStateId],
        ) ||
        edge.generator !== expectedGenerator
      ) {
        errors.push(
          `Relation ${diagnostic.id} has inconsistent boundary step ${index}.`,
        );
      }
    }
  }
  return [...new Set(errors)];
}

function indexBaseAtlas(atlas: YGammaCellAtlas): JnwCoverBaseAtlasIndex {
  return {
    systemName: atlas.systemName,
    baseVertexId: atlas.baseVertex.id,
    generatorCells: atlas.generatorCells
      .map((cell) => ({ generator: cell.generators[0], cellId: cell.id }))
      .sort((left, right) => left.generator - right.generator),
    rankTwoCells: atlas.rankTwoCells
      .map((cell) => ({
        generatorPair: sortedNumberPair(cell.generators[0], cell.generators[1]),
        m: cell.m ?? 0,
        cellId: cell.id,
      }))
      .sort((left, right) =>
        pairKey(left.generatorPair).localeCompare(pairKey(right.generatorPair)),
      ),
  };
}

function closedDiagnostics(summary: JnwLegalOrbitSummary) {
  return summary.rankTwoDiagnostics.filter(
    (diagnostic) => diagnostic.periodClosed,
  );
}

function midpointId(railId: string): string {
  return `jnw:cover:midpoint:${railId}`;
}

function relationCenterId(relationCellId: string): string {
  return `jnw:cover:center:${relationCellId}`;
}

function sectorId(
  relationCellId: string,
  boundaryIndex: number,
  stateId: string,
): string {
  return `jnw:cover:sector:${relationCellId}:${boundaryIndex}:${stateId}`;
}

function pairKey(pair: [number, number]): string {
  const [left, right] = sortedNumberPair(pair[0], pair[1]);
  return `${left}:${right}`;
}

function sortedNumberPair(left: number, right: number): [number, number] {
  return left <= right ? [left, right] : [right, left];
}

function sortedPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}

function sameUnorderedPair(
  left: [string, string],
  right: [string, string],
): boolean {
  const leftSorted = sortedPair(left[0], left[1]);
  const rightSorted = sortedPair(right[0], right[1]);
  return leftSorted[0] === rightSorted[0] && leftSorted[1] === rightSorted[1];
}

function requiredMapValue<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  description: string,
): Value {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Missing ${description}.`);
  }
  return value;
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function sameStringSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((value) => right.includes(value))
  );
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function groupBy<Item>(
  items: Item[],
  keyFor: (item: Item) => string,
): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
