import type {
  JnwLegalOrbitSummary,
  JnwMoveSystem,
  JnwOrbitEdge,
  JnwRankTwoDiagnostic,
  JnwState,
} from "../game";
import type { SceneEdge, SceneNode } from "../render/SceneView";
import type { CoxeterMatrixEntry, CoxeterSystemInput } from "../types";
import type { YGammaCellAtlas } from "./yGammaAtlas";
import type { YGamma2SkeletonScene } from "./yGammaScene";

export interface JnwStateSceneDecoration {
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export interface JnwStateQuotientYGammaScene extends YGamma2SkeletonScene {
  stateVertexCount: number;
  stateCopyCount: number;
  readerMode: JnwReaderMode;
  readerLens: JnwReaderLens;
  railGrouping: JnwRailGrouping;
  bundledRailCount: number;
}

export type JnwQuotientSheetMode = "outlines" | "glass" | "filled";
export type JnwQuotientConstructionStage = 1 | 2 | 3 | 4 | 5;
export type JnwReaderMode = "exact-skeleton" | "readable-chart";
export type JnwReaderLens =
  | "none"
  | "state"
  | "glue"
  | "relation"
  | "ascending-link"
  | "descending-link"
  | "level-link";
export type JnwRailGrouping = "individual" | "move-class-overview";

export interface JnwSelectedRail {
  edgeId?: string;
  generator?: number;
}

export interface JnwGammaStateDiagramVertex {
  generator: number;
  label: string;
  active: boolean;
  x: number;
  y: number;
  z: number;
}

export interface JnwGammaStateDiagramEdge {
  id: string;
  source: number;
  target: number;
}

export interface JnwGammaStateDiagram {
  vertices: JnwGammaStateDiagramVertex[];
  edges: JnwGammaStateDiagramEdge[];
  activeLabels: string[];
}

/**
 * Adds drawing-only Gamma glyphs around JNW state vertices.
 *
 * A JNW state is a subset of the defining graph vertices. The state quotient
 * can otherwise look like an unrelated finite graph, so each state vertex gets
 * a small copy of Gamma with the subset highlighted. The returned nodes/edges
 * are visual annotations; they are not quotient vertices, relation cells, or
 * certificate data.
 */
export function decorateJnwStateQuotientScene(input: {
  nodes: readonly SceneNode[];
  edges: readonly SceneEdge[];
  system: CoxeterSystemInput;
  summary: JnwLegalOrbitSummary;
  selectedStateId?: string;
}): JnwStateSceneDecoration {
  const stateById = new Map(
    input.summary.states.map((state) => [state.id, state]),
  );
  const generatorLayout = gammaGeneratorLayout(input.system);
  const gammaEdges = gammaFiniteEdges(input.system);
  const selectedStateId =
    input.selectedStateId && stateById.has(input.selectedStateId)
      ? input.selectedStateId
      : input.summary.states[0]?.id;

  const nodes: SceneNode[] = input.nodes.map((node, index) => {
    if (!stateById.has(node.id)) {
      return { ...node };
    }
    const selected = node.id === selectedStateId;
    return {
      ...node,
      colorHint: selected ? "#2563eb" : "#475569",
      nodeScale: selected ? 1.18 : 1,
      alwaysLabel: true,
      labelPriority: Math.max(node.labelPriority ?? 0, 125_000 - index),
    };
  });
  const edges: SceneEdge[] = input.edges.map((edge) => ({ ...edge }));

  for (const stateNode of input.nodes) {
    const state = stateById.get(stateNode.id);
    if (!state || !stateNode.position) {
      continue;
    }

    const selected = state.id === selectedStateId;
    const activeGenerators = new Set(state.generators);
    const center = stateNode.position;
    const glyphScale = selected ? 0.58 : 0.38;
    const glyphLift = selected ? 0.38 : 0.22;

    for (const generator of generatorLayout.keys()) {
      const offset = generatorLayout.get(generator);
      if (!offset) {
        continue;
      }
      const active = activeGenerators.has(generator);
      const generatorLabel = input.system.generators[generator]?.label ?? "";
      nodes.push({
        id: glyphNodeId(state.id, generator),
        label: selected && active ? generatorLabel : "",
        compactLabel: selected && active ? generatorLabel : "",
        length: 0,
        position: [
          center[0] + offset[0] * glyphScale,
          center[1] + offset[1] * glyphScale,
          center[2] + offset[2] * glyphScale + glyphLift,
        ],
        colorHint: active
          ? selected
            ? "#14b8a6"
            : "#5eead4"
          : selected
            ? "#94a3b8"
            : "#d1d5db",
        nodeScale: active ? (selected ? 0.58 : 0.44) : selected ? 0.34 : 0.28,
        alwaysLabel: selected && active ? true : undefined,
        labelPriority: selected && active ? 118_000 - generator : undefined,
      });
    }

    for (const [left, right] of gammaEdges) {
      edges.push({
        id: `jnw:gamma-glyph-edge:${state.id}:${left}-${right}`,
        source: glyphNodeId(state.id, left),
        target: glyphNodeId(state.id, right),
        generator: left,
        compactLabel: "",
        colorHint: selected ? "#64748b" : "#cbd5e1",
        suppressSemanticLabel: true,
      });
    }

    if (selected) {
      for (const generator of activeGenerators) {
        edges.push({
          id: `jnw:state-membership:${state.id}:${generator}`,
          source: state.id,
          target: glyphNodeId(state.id, generator),
          generator,
          compactLabel: "",
          colorHint: "#0f766e",
          suppressSemanticLabel: true,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Draws the JNW quotient as one cohesive state-labeled cell complex.
 *
 * The quotient vertices are exactly the states in the legal orbit. A generator
 * edge labeled g runs from one state to the state obtained by applying m_g.
 * Thus the endpoint of the lifted g-arrow is another state vertex. Relation
 * cells are the alternating state-edge cycles supplied by the JNW diagnostics.
 */
export function buildJnwStateQuotientYGammaScene(input: {
  system: CoxeterSystemInput;
  atlas: YGammaCellAtlas;
  summary: JnwLegalOrbitSummary;
  moveSystem?: JnwMoveSystem;
  selectedStateId?: string;
  selectedRail?: JnwSelectedRail;
  selectedRelationId?: string;
  sheetMode?: JnwQuotientSheetMode;
  constructionStage?: JnwQuotientConstructionStage;
  readerMode?: JnwReaderMode;
  readerLens?: JnwReaderLens;
  railGrouping?: JnwRailGrouping;
}): JnwStateQuotientYGammaScene {
  const selectedStateId = selectedStateIdInSummary(
    input.summary,
    input.selectedStateId,
  );
  const readerMode = input.readerMode ?? "readable-chart";
  const readerLens =
    input.readerLens ?? (input.selectedRelationId ? "relation" : "state");
  const railGrouping = input.railGrouping ?? "individual";
  const positions = stateQuotientPositions(
    input.summary.states,
    input.summary.edges,
  );
  const constructionStage = input.constructionStage ?? 4;
  const selectedRelation =
    input.summary.rankTwoDiagnostics.find(
      (diagnostic) => diagnostic.id === input.selectedRelationId,
    ) ?? undefined;
  const selectedRelationEdgeIds = new Set(selectedRelation?.boundaryEdgeIds);
  const relationFocusActive = selectedRelationEdgeIds.size > 0;
  const stateColorById = new Map(
    input.summary.states.map((state) => [
      state.id,
      jnwStateChartColor(input.summary, state.id),
    ]),
  );
  const sheetMode =
    constructionStage <= 3 ? "outlines" : (input.sheetMode ?? "glass");
  const transitions = transitionByStateAndGenerator(input.summary.edges);
  const selectedRailId = resolveSelectedRailId({
    summary: input.summary,
    selectedStateId,
    selectedRail: input.selectedRail,
  });
  const selectedRail = input.summary.edges.find(
    (edge) => edge.id === selectedRailId,
  );
  const selectedRailStateIds = new Set(
    selectedRail
      ? [selectedRail.undirectedSource, selectedRail.undirectedTarget]
      : [],
  );
  const laneOffsets = laneOffsetsByEdge(input.summary.edges);
  const portPositions =
    readerMode === "readable-chart" && constructionStage >= 2
      ? chartPortPositions({
          system: input.system,
          summary: input.summary,
          statePositions: positions,
          transitions,
          laneOffsets,
        })
      : new Map<string, [number, number, number]>();
  const moveClassBundles =
    railGrouping === "move-class-overview" && input.moveSystem
      ? buildMoveClassBundles(input.summary.edges, input.moveSystem)
      : [];
  const nodes: SceneNode[] = input.summary.states.map((state, stateIndex) => {
    const stateName = formatStateName(input.summary, state.id);
    const selected = state.id === selectedStateId;
    const activeForGlue =
      readerLens === "glue" && selectedRailStateIds.has(state.id);
    const ghostForStateLens =
      readerLens === "state" && state.id !== selectedStateId;
    const ghostForGlueLens =
      readerLens === "glue" && selectedRail !== undefined && !activeForGlue;
    const stateColor = stateColorById.get(state.id) ?? "#475569";
    return {
      id: state.id,
      label: stateName,
      compactLabel: stateName,
      length: 0,
      localDistance: selected ? 0 : 1,
      position: positions.get(state.id) ?? [0, 0, 0],
      colorHint: stateColor,
      nodeScale: selected || activeForGlue ? 1.5 : 1.08,
      alwaysLabel: true,
      labelPriority: 180_000 - stateIndex,
      ghost: ghostForStateLens || ghostForGlueLens,
    };
  });
  if (readerMode === "readable-chart" && constructionStage >= 2) {
    for (const state of input.summary.states) {
      for (let generator = 0; generator < input.system.rank; generator += 1) {
        const portId = chartPortId(state.id, generator);
        const portPosition = portPositions.get(portId);
        if (!portPosition) {
          continue;
        }
        const generatorLabel =
          input.system.generators[generator]?.label ?? `s${generator}`;
        const selected = state.id === selectedStateId;
        const inSelectedGlue =
          readerLens === "glue" &&
          selectedRail !== undefined &&
          selectedRailStateIds.has(state.id) &&
          selectedRail.generator === generator;
        const ghostForStateLens =
          readerLens === "state" && state.id !== selectedStateId;
        const ghostForGlueLens =
          readerLens === "glue" &&
          selectedRail !== undefined &&
          !inSelectedGlue;
        nodes.push({
          id: portId,
          label: generatorLabel,
          compactLabel: generatorLabel,
          length: 0,
          position: portPosition,
          isRelationBoundary: true,
          drawingOnly: true,
          colorHint: stateColorById.get(state.id) ?? "#64748b",
          nodeScale: selected || inSelectedGlue ? 0.46 : 0.27,
          alwaysLabel: false,
          labelPriority: selected ? 145_000 - generator : 80_000 - generator,
          ghost:
            ghostForStateLens ||
            ghostForGlueLens ||
            (relationFocusActive &&
              !selectedRelationUsesPort(selectedRelation, state.id, generator)),
        });
      }
    }
  }

  const edges: SceneEdge[] = [];
  if (readerMode === "exact-skeleton") {
    if (constructionStage >= 2) {
      edges.push(
        ...buildExactSkeletonRails({
          system: input.system,
          summary: input.summary,
          selectedStateId,
          selectedRailId,
          readerLens,
        }),
      );
    }
  } else if (constructionStage >= 2) {
    for (const state of input.summary.states) {
      for (let generator = 0; generator < input.system.rank; generator += 1) {
        const portId = chartPortId(state.id, generator);
        if (!portPositions.has(portId)) {
          continue;
        }
        const portInFocusedRelation = selectedRelationUsesPort(
          selectedRelation,
          state.id,
          generator,
        );
        const selectedChart = state.id === selectedStateId;
        const inSelectedGlue =
          readerLens === "glue" &&
          selectedRail !== undefined &&
          selectedRailStateIds.has(state.id) &&
          selectedRail.generator === generator;
        const ghostForStateLens =
          readerLens === "state" && state.id !== selectedStateId;
        const ghostForGlueLens =
          readerLens === "glue" &&
          selectedRail !== undefined &&
          !inSelectedGlue;
        edges.push({
          id: chartSpokeId(state.id, generator),
          source: state.id,
          target: portId,
          generator,
          compactLabel: "",
          colorHint: stateColorById.get(state.id),
          suppressSemanticLabel: true,
          drawingOnly: true,
          isRelationBoundary: false,
          emphasis:
            selectedChart || inSelectedGlue ? "readable-boundary" : undefined,
          ghost:
            ghostForStateLens ||
            ghostForGlueLens ||
            (relationFocusActive && !portInFocusedRelation),
          labelPriority: -5000,
        });
      }
    }

    if (railGrouping === "move-class-overview" && moveClassBundles.length > 0) {
      edges.push(
        ...moveClassBundles.map((bundle, index) =>
          buildMoveClassBundleEdge({
            bundle,
            index,
            selectedStateId,
            selectedRailId,
            stateColorById,
          }),
        ),
      );
    } else {
      for (const edge of input.summary.edges) {
        const touchesSelected =
          edge.undirectedSource === selectedStateId ||
          edge.undirectedTarget === selectedStateId;
        const relationBoundarySegment = selectedRelationEdgeIds.has(edge.id);
        const ghostForRelationFocus =
          relationFocusActive && !relationBoundarySegment;
        const selectedGlueEdge =
          readerLens === "glue" && edge.id === selectedRailId;
        const ghostForGlueLens =
          readerLens === "glue" &&
          selectedRailId !== undefined &&
          !selectedGlueEdge;
        const ghostForStateLens = readerLens === "state" && !touchesSelected;
        const generatorLabel =
          input.system.generators[edge.generator]?.label ??
          `s${edge.generator}`;
        const sourcePort = chartPortId(edge.source, edge.generator);
        const targetPort = chartPortId(edge.target, edge.generator);

        edges.push({
          id: edge.id,
          source: sourcePort,
          target: targetPort,
          generator: edge.generator,
          compactLabel: generatorLabel,
          colorHint: selectedGlueEdge
            ? "#38bdf8"
            : relationBoundarySegment
              ? "#facc15"
              : touchesSelected
                ? "#60a5fa"
                : undefined,
          alwaysLabel: true,
          labelLeader: true,
          labelPriority: selectedGlueEdge
            ? 185_000 - edge.generator
            : relationBoundarySegment || touchesSelected
              ? 170_000 - edge.generator
              : ghostForRelationFocus || ghostForGlueLens || ghostForStateLens
                ? -1000
                : 125_000 - edge.generator,
          selectedHighlight:
            selectedGlueEdge || relationBoundarySegment || touchesSelected
              ? "outline"
              : undefined,
          ghost: ghostForRelationFocus || ghostForGlueLens || ghostForStateLens,
          isRelationBoundary: true,
          emphasis: "readable-boundary",
          directed: true,
        });
      }
    }
  }

  const cells: JnwStateQuotientYGammaScene["cells"] =
    readerMode === "exact-skeleton" ||
    railGrouping === "move-class-overview" ||
    constructionStage < 3
      ? []
      : input.summary.rankTwoDiagnostics
          .filter((diagnostic) => diagnostic.ok)
          .map((diagnostic) => {
            const focused = selectedRelation?.id === diagnostic.id;
            const visualBoundary = visualBoundaryForDiagnostic(diagnostic);
            const incidentToSelectedState =
              diagnostic.boundaryStateIds.includes(selectedStateId);
            const selectedGlueCell =
              readerLens === "glue" &&
              selectedRailId !== undefined &&
              diagnostic.boundaryEdgeIds.includes(selectedRailId);
            const ghostForStateLens =
              readerLens === "state" && !incidentToSelectedState;
            const ghostForGlueLens =
              readerLens === "glue" &&
              selectedRailId !== undefined &&
              !selectedGlueCell;
            return {
              id: diagnostic.id,
              generatorPair: diagnostic.generatorPair,
              boundaryNodeIds: visualBoundary,
              localDistance: incidentToSelectedState || focused ? 0 : 1,
              sourceCellId: diagnostic.id,
              drawingOnly: true,
              readabilityRole:
                relationFocusActive || readerLens === "relation"
                  ? focused
                    ? "focus"
                    : "context"
                  : ghostForStateLens || ghostForGlueLens
                    ? "context"
                    : "incident",
              colorHint: focused ? "#facc15" : undefined,
            };
          });

  return {
    nodes,
    edges,
    cells,
    selectedNodeId: selectedStateId,
    stateVertexCount: input.summary.states.length,
    stateCopyCount: input.summary.states.length,
    readerMode,
    readerLens,
    railGrouping,
    bundledRailCount: moveClassBundles.length,
    warnings: [
      readerMode === "exact-skeleton"
        ? "JNW exact skeleton: only state vertices S_i and exact generator transition rails are shown."
        : "JNW readable chart drawing: quotient vertices are the state vertices S_i; small generator handles are drawing aids for local Y_Gamma charts.",
      "Each labeled rail represents the exact generator edge S_i -> S_i xor m_g; drawing handles and offsets do not change the state/move data.",
      railGrouping === "move-class-overview"
        ? "Bundled drawing: move-class overview groups identical move subsets. Expand to individual rails to see the full generator 1-skeleton."
        : "Individual rail drawing: every generator transition is shown with its own semantic label.",
      constructionStageWarning(constructionStage),
      sheetModeWarning(sheetMode),
      "Rank-two relation diagnostics are rendered on separated rails so the commuting-square attaching cycles remain legible.",
      "The coordinates are a drawing convention, not an affine or hyperbolic embedding.",
      ...input.atlas.warnings,
    ],
  };
}

export function buildJnwGammaStateDiagram(
  system: CoxeterSystemInput,
  state: JnwState | undefined,
): JnwGammaStateDiagram {
  const activeGenerators = new Set(state?.generators ?? []);
  const layout = gammaGeneratorLayout(system);
  const vertices = system.generators.map((generator, index) => {
    const position = layout.get(index) ?? [0, 0, 0];
    return {
      generator: index,
      label: generator.label ?? `s${index}`,
      active: activeGenerators.has(index),
      x: position[0],
      y: position[1],
      z: position[2],
    };
  });
  return {
    vertices,
    edges: gammaFiniteEdges(system).map(([source, target]) => ({
      id: `${source}-${target}`,
      source,
      target,
    })),
    activeLabels: vertices
      .filter((vertex) => vertex.active)
      .map((vertex) => vertex.label),
  };
}

function glyphNodeId(stateId: string, generator: number): string {
  return `jnw:gamma-glyph:${stateId}:${generator}`;
}

function constructionStageWarning(stage: JnwQuotientConstructionStage): string {
  switch (stage) {
    case 1:
      return "Construction stage 1: only the state vertices S_i are shown.";
    case 2:
      return "Construction stage 2: generator rails are shown as the exact quotient 1-skeleton.";
    case 3:
      return "Construction stage 3: relation boundaries are added on the generator rails.";
    case 4:
      return "Construction stage 4: glass relation sheets are added behind the rails.";
    case 5:
      return "Construction stage 5: state-dependent JNW directions may be overlaid on the quotient.";
  }
}

function sheetModeWarning(mode: JnwQuotientSheetMode): string {
  switch (mode) {
    case "outlines":
      return "Sheet mode: edges plus outlines; relation faces are read by their boundary cycles.";
    case "glass":
      return "Sheet mode: glass relation faces; fills are intentionally quiet so the quotient 1-skeleton remains primary.";
    case "filled":
      return "Sheet mode: filled relation faces; useful for presentation, but edges still carry the quotient gluing.";
  }
}

function buildExactSkeletonRails(input: {
  system: CoxeterSystemInput;
  summary: JnwLegalOrbitSummary;
  selectedStateId: string;
  selectedRailId: string | undefined;
  readerLens: JnwReaderLens;
}): SceneEdge[] {
  const laneOffsets = laneOffsetsByEdge(input.summary.edges);
  return input.summary.edges.map((edge) => {
    const touchesSelected =
      edge.undirectedSource === input.selectedStateId ||
      edge.undirectedTarget === input.selectedStateId;
    const selectedGlueEdge =
      input.readerLens === "glue" && edge.id === input.selectedRailId;
    const ghostForStateLens = input.readerLens === "state" && !touchesSelected;
    const ghostForGlueLens =
      input.readerLens === "glue" &&
      input.selectedRailId !== undefined &&
      !selectedGlueEdge;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      generator: edge.generator,
      compactLabel:
        input.system.generators[edge.generator]?.label ?? `s${edge.generator}`,
      alwaysLabel: !ghostForStateLens && !ghostForGlueLens,
      labelLeader: true,
      labelPriority:
        selectedGlueEdge || touchesSelected
          ? 180_000 - edge.generator
          : ghostForStateLens || ghostForGlueLens
            ? -1000
            : 130_000 - edge.generator,
      visualOffset: laneOffsets.get(edge.id) ?? 0,
      selectedHighlight:
        selectedGlueEdge || touchesSelected ? "outline" : undefined,
      emphasis: "readable-boundary",
      directed: true,
      ghost: ghostForStateLens || ghostForGlueLens,
    };
  });
}

interface MoveClassBundle {
  id: string;
  source: string;
  target: string;
  generator: number;
  generators: number[];
  edgeIds: string[];
  label: string;
}

function buildMoveClassBundles(
  edges: readonly JnwOrbitEdge[],
  moveSystem: JnwMoveSystem,
): MoveClassBundle[] {
  const moveKeyByGenerator = new Map(
    moveSystem.moves.map((move) => [
      move.generator,
      [...move.toggles].sort((left, right) => left - right).join(","),
    ]),
  );
  const grouped = new Map<string, JnwOrbitEdge[]>();
  for (const edge of edges) {
    const key = [
      edge.undirectedSource,
      edge.undirectedTarget,
      moveKeyByGenerator.get(edge.generator) ?? `g:${edge.generator}`,
    ].join("|");
    const bucket = grouped.get(key) ?? [];
    bucket.push(edge);
    grouped.set(key, bucket);
  }

  return [...grouped.values()].map((bucket, index) => {
    const sorted = [...bucket].sort(
      (left, right) =>
        left.generator - right.generator || left.id.localeCompare(right.id),
    );
    const first = sorted[0];
    return {
      id: `jnw:move-class-bundle:${index}:${sorted
        .map((edge) => edge.generator)
        .join("-")}`,
      source: first.source,
      target: first.target,
      generator: first.generator,
      generators: sorted.map((edge) => edge.generator),
      edgeIds: sorted.map((edge) => edge.id),
      label:
        sorted.length === 1 ? `1 generator` : `${sorted.length} generators`,
    };
  });
}

function buildMoveClassBundleEdge(input: {
  bundle: MoveClassBundle;
  index: number;
  selectedStateId: string;
  selectedRailId: string | undefined;
  stateColorById: Map<string, string>;
}): SceneEdge {
  const touchesSelected =
    input.bundle.source === input.selectedStateId ||
    input.bundle.target === input.selectedStateId;
  const containsSelectedRail =
    input.selectedRailId !== undefined &&
    input.bundle.edgeIds.includes(input.selectedRailId);
  return {
    id: input.bundle.id,
    source: input.bundle.source,
    target: input.bundle.target,
    generator: input.bundle.generator,
    compactLabel: input.bundle.label,
    colorHint:
      input.stateColorById.get(input.bundle.source) ??
      input.stateColorById.get(input.bundle.target),
    alwaysLabel: touchesSelected || containsSelectedRail,
    labelLeader: true,
    labelPriority: containsSelectedRail
      ? 180_000
      : touchesSelected
        ? 140_000 - input.index
        : 70_000 - input.index,
    selectedHighlight:
      touchesSelected || containsSelectedRail ? "outline" : undefined,
    emphasis: "readable-boundary",
    directed: true,
    drawingOnly: true,
  };
}

function resolveSelectedRailId(input: {
  summary: JnwLegalOrbitSummary;
  selectedStateId: string;
  selectedRail?: JnwSelectedRail;
}): string | undefined {
  if (
    input.selectedRail?.edgeId &&
    input.summary.edges.some((edge) => edge.id === input.selectedRail?.edgeId)
  ) {
    return input.selectedRail.edgeId;
  }
  if (input.selectedRail?.generator !== undefined) {
    return (
      input.summary.edges.find(
        (edge) =>
          edge.generator === input.selectedRail?.generator &&
          (edge.undirectedSource === input.selectedStateId ||
            edge.undirectedTarget === input.selectedStateId),
      )?.id ??
      input.summary.edges.find(
        (edge) => edge.generator === input.selectedRail?.generator,
      )?.id
    );
  }
  return input.summary.edges.find(
    (edge) =>
      edge.undirectedSource === input.selectedStateId ||
      edge.undirectedTarget === input.selectedStateId,
  )?.id;
}

function groupEdgesByStatePair(edges: readonly JnwOrbitEdge[]) {
  const groups = new Map<string, JnwOrbitEdge[]>();
  for (const edge of edges) {
    const key = statePairKey(edge);
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }
  for (const [key, group] of groups) {
    groups.set(
      key,
      [...group].sort(
        (left, right) =>
          left.generator - right.generator || left.id.localeCompare(right.id),
      ),
    );
  }
  return groups;
}

function statePairKey(edge: JnwOrbitEdge): string {
  return `${edge.undirectedSource}|${edge.undirectedTarget}`;
}

function chartPortId(stateId: string, generator: number): string {
  return `jnw:chart-port:${stateId}:${generator}`;
}

function chartSpokeId(stateId: string, generator: number): string {
  return `jnw:chart-spoke:${stateId}:${generator}`;
}

function transitionKey(stateId: string, generator: number): string {
  return `${stateId}:${generator}`;
}

function transitionByStateAndGenerator(
  edges: readonly JnwOrbitEdge[],
): Map<string, JnwOrbitEdge> {
  const transitions = new Map<string, JnwOrbitEdge>();
  for (const edge of edges) {
    transitions.set(transitionKey(edge.undirectedSource, edge.generator), edge);
    transitions.set(transitionKey(edge.undirectedTarget, edge.generator), edge);
  }
  return transitions;
}

function laneOffsetsByEdge(
  edges: readonly JnwOrbitEdge[],
): Map<string, number> {
  const offsets = new Map<string, number>();
  for (const group of groupEdgesByStatePair(edges).values()) {
    const center = (group.length - 1) / 2;
    group.forEach((edge, index) => {
      offsets.set(edge.id, (index - center) * 1.15);
    });
  }
  return offsets;
}

function chartPortPositions(input: {
  system: CoxeterSystemInput;
  summary: JnwLegalOrbitSummary;
  statePositions: Map<string, [number, number, number]>;
  transitions: Map<string, JnwOrbitEdge>;
  laneOffsets: Map<string, number>;
}): Map<string, [number, number, number]> {
  const ports = new Map<string, [number, number, number]>();
  const gammaLayout = gammaGeneratorLayout(input.system);
  for (const state of input.summary.states) {
    const statePosition = input.statePositions.get(state.id);
    if (!statePosition) {
      continue;
    }
    const chartFrame = chartFrameForState(statePosition);
    for (let generator = 0; generator < input.system.rank; generator += 1) {
      const transition = input.transitions.get(
        transitionKey(state.id, generator),
      );
      if (!transition) {
        continue;
      }
      const otherState =
        transition.undirectedSource === state.id
          ? transition.undirectedTarget
          : transition.undirectedSource;
      const targetPosition = input.statePositions.get(otherState);
      if (!targetPosition) {
        continue;
      }
      const towardTarget = normalizeVec(subVec(targetPosition, statePosition));
      const localGamma = normalizeVec(gammaLayout.get(generator) ?? [0, 0, 1]);
      const openedGamma = normalizeVec(
        addVec(
          addVec(
            scaleVec(chartFrame.tangentA, localGamma[0]),
            scaleVec(chartFrame.tangentB, localGamma[1]),
          ),
          scaleVec(chartFrame.normal, localGamma[2] * 0.82),
        ),
      );
      const side = stableSideVector(towardTarget, generator);
      const lane = input.laneOffsets.get(transition.id) ?? 0;
      const lift = ((generator % 3) - 1) * 0.42 + lane * 0.2;
      const portPosition = addVec(
        statePosition,
        addVec(
          addVec(scaleVec(chartFrame.normal, 3.2), scaleVec(openedGamma, 4.9)),
          addVec(
            addVec(scaleVec(towardTarget, 1.4), scaleVec(side, lane * 1.35)),
            [0, 0, lift],
          ),
        ),
      );
      ports.set(chartPortId(state.id, generator), portPosition);
    }
  }
  return ports;
}

function selectedRelationUsesPort(
  relation: JnwRankTwoDiagnostic | undefined,
  stateId: string,
  generator: number,
): boolean {
  if (!relation) {
    return false;
  }
  return relation.boundaryStateIds.some((boundaryStateId, step) => {
    const boundaryGenerator =
      step % 2 === 0 ? relation.generatorPair[0] : relation.generatorPair[1];
    const nextStateId =
      relation.boundaryStateIds[(step + 1) % relation.boundaryStateIds.length];
    return (
      boundaryGenerator === generator &&
      (boundaryStateId === stateId || nextStateId === stateId)
    );
  });
}

function visualBoundaryForDiagnostic(
  diagnostic: JnwRankTwoDiagnostic,
): string[] {
  const boundary: string[] = [];
  for (let step = 0; step < diagnostic.boundaryStateIds.length; step += 1) {
    const currentStateId = diagnostic.boundaryStateIds[step];
    const nextStateId =
      diagnostic.boundaryStateIds[
        (step + 1) % diagnostic.boundaryStateIds.length
      ];
    const generator =
      step % 2 === 0
        ? diagnostic.generatorPair[0]
        : diagnostic.generatorPair[1];
    boundary.push(
      chartPortId(currentStateId, generator),
      chartPortId(nextStateId, generator),
    );
  }
  return boundary;
}

function selectedStateIdInSummary(
  summary: JnwLegalOrbitSummary,
  requested: string | undefined,
): string {
  return requested && summary.states.some((state) => state.id === requested)
    ? requested
    : (summary.states[0]?.id ?? "jnw:state:empty");
}

function formatStateName(
  summary: Pick<JnwLegalOrbitSummary, "states">,
  stateId: string,
): string {
  const index = summary.states.findIndex((state) => state.id === stateId);
  return index >= 0 ? `S_${index + 1}` : "state";
}

export function jnwStateChartColor(
  summary: Pick<JnwLegalOrbitSummary, "states">,
  stateId: string | undefined,
): string {
  const index = summary.states.findIndex((state) => state.id === stateId);
  return stateCopyColor(index < 0 ? 0 : index);
}

function stateCopyColor(index: number): string {
  const palette = [
    "#38bdf8",
    "#f97316",
    "#22c55e",
    "#e879f9",
    "#facc15",
    "#a78bfa",
  ];
  return palette[index % palette.length];
}

function stateQuotientPositions(
  states: readonly JnwState[],
  edges: readonly JnwOrbitEdge[] = [],
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();
  const cycleOrder = fourStateCycleOrder(states, edges);
  if (cycleOrder) {
    const square: Array<[number, number, number]> = [
      [-18, -12, 6.5],
      [18, -12, -5.4],
      [18, 12, 7.2],
      [-18, 12, -6.1],
    ];
    cycleOrder.forEach((stateId, index) => {
      positions.set(stateId, square[index] ?? [0, 0, 0]);
    });
    return positions;
  }
  if (states.length <= 1) {
    positions.set(states[0]?.id ?? "jnw:state:empty", [0, 0, 0]);
    return positions;
  }
  states.forEach((state, index) => {
    const t = states.length === 1 ? 0 : index / (states.length - 1);
    const z = 1 - 2 * t;
    const radius = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const scale = 12;
    positions.set(state.id, [
      Math.cos(angle) * radius * scale,
      Math.sin(angle) * radius * scale,
      z * scale,
    ]);
  });
  return positions;
}

interface ChartFrame {
  normal: Vec3;
  tangentA: Vec3;
  tangentB: Vec3;
}

function chartFrameForState(position: Vec3): ChartFrame {
  // The exact quotient has only state vertices. This frame is purely a drawing
  // convention: it opens the local generator chart around each state so the
  // four charts do not collapse into one almost-planar sheet.
  const normal = normalizeVec(addVec(position, [0, 0, 7]));
  const seed: Vec3 = Math.abs(normal[2]) > 0.82 ? [0, 1, 0] : [0, 0, 1];
  const tangentA = normalizeVec(crossVec(seed, normal));
  const tangentB = normalizeVec(crossVec(normal, tangentA));
  return { normal, tangentA, tangentB };
}

function fourStateCycleOrder(
  states: readonly JnwState[],
  edges: readonly JnwOrbitEdge[],
): string[] | undefined {
  if (states.length !== 4) {
    return undefined;
  }
  const stateIds = states.map((state) => state.id);
  const adjacency = new Map<string, Set<string>>(
    stateIds.map((stateId) => [stateId, new Set<string>()]),
  );
  for (const edge of edges) {
    adjacency.get(edge.undirectedSource)?.add(edge.undirectedTarget);
    adjacency.get(edge.undirectedTarget)?.add(edge.undirectedSource);
  }
  if ([...adjacency.values()].some((neighbors) => neighbors.size !== 2)) {
    return undefined;
  }

  const start = stateIds[0];
  const firstNeighbor = [...(adjacency.get(start) ?? [])].sort()[0];
  if (!firstNeighbor) {
    return undefined;
  }
  const order = [start, firstNeighbor];
  while (order.length < 4) {
    const current = order[order.length - 1];
    const previous = order[order.length - 2];
    const next = [...(adjacency.get(current) ?? [])]
      .sort()
      .find((candidate) => candidate !== previous);
    if (!next || order.includes(next)) {
      break;
    }
    order.push(next);
  }
  if (
    order.length !== 4 ||
    !(adjacency.get(order[3]) ?? new Set<string>()).has(start)
  ) {
    return undefined;
  }
  return order;
}

type Vec3 = [number, number, number];

function addVec(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subVec(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scaleVec(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function crossVec(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalizeVec(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 0.000001) {
    return [0, 0, 1];
  }
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function stableSideVector(direction: Vec3, generator: number): Vec3 {
  const verticalSide = crossVec(direction, [0, 0, 1]);
  if (Math.hypot(...verticalSide) > 0.000001) {
    return normalizeVec(verticalSide);
  }
  const fallbackAngle = generator * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(fallbackAngle), Math.sin(fallbackAngle), 0];
}

function gammaGeneratorLayout(
  system: CoxeterSystemInput,
): Map<number, [number, number, number]> {
  const cubeCoordinates = cubeLabelCoordinates(system);
  if (cubeCoordinates) {
    return cubeCoordinates;
  }

  const layout = new Map<number, [number, number, number]>();
  const count = Math.max(1, system.rank);
  for (let index = 0; index < system.rank; index += 1) {
    const t = count === 1 ? 0 : index / (count - 1);
    const z = 1 - 2 * t;
    const radius = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    layout.set(index, [Math.cos(angle) * radius, Math.sin(angle) * radius, z]);
  }
  return layout;
}

function cubeLabelCoordinates(
  system: CoxeterSystemInput,
): Map<number, [number, number, number]> | undefined {
  const entries = system.generators.map((generator) =>
    /^v[01]{3}$/.exec(generator.label ?? ""),
  );
  if (entries.some((entry) => entry === null)) {
    return undefined;
  }

  const layout = new Map<number, [number, number, number]>();
  entries.forEach((entry, index) => {
    const bits = entry?.[0].slice(1).split("") ?? ["0", "0", "0"];
    layout.set(index, [
      bits[0] === "1" ? 1 : -1,
      bits[1] === "1" ? 1 : -1,
      bits[2] === "1" ? 1 : -1,
    ]);
  });
  return layout;
}

function gammaFiniteEdges(system: CoxeterSystemInput): Array<[number, number]> {
  return finiteGeneratorPairs(system);
}

function finiteGeneratorPairs(
  system: CoxeterSystemInput,
): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  for (let row = 0; row < system.rank; row += 1) {
    for (let column = row + 1; column < system.rank; column += 1) {
      if (isFiniteRelation(system.coxeterMatrix[row]?.[column])) {
        edges.push([row, column]);
      }
    }
  }
  return edges;
}

function isFiniteRelation(entry: CoxeterMatrixEntry | undefined): boolean {
  return typeof entry === "number" && Number.isFinite(entry) && entry >= 2;
}
