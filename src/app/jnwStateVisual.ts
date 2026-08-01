import {
  deriveJnwStateLinks,
  type JnwFiniteSimplicialLink,
  type JnwLegalOrbitSummary,
  type JnwMoveSystem,
  type JnwOrbitEdge,
  type JnwState,
} from "../game";
import type { SceneEdge, SceneNode } from "../render/SceneView";
import type { CoxeterMatrixEntry, CoxeterSystemInput } from "../types";
import type { YGammaCellAtlas } from "./yGammaAtlas";
import type { YGamma2SkeletonScene } from "./yGammaScene";
import {
  buildJnwFourStateCoverModel,
  type JnwFourStateCoverModel,
} from "./jnwCoverModel";

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
  coverModel?: JnwFourStateCoverModel;
  sourceCellIdByRenderedId?: Map<string, string>;
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
  | "level-link"
  | "full-link";
export type JnwRailGrouping = "individual" | "move-class-overview";

export interface JnwSelectedRail {
  edgeId?: string;
  generator?: number;
}

export interface JnwStateQuotientSceneInput {
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
 * A JNW state is a subset of the defining graph vertices. The move-kernel cover
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
 * Draw the actual simplicial JNW link around a selected state.
 *
 * Generator directions are the link vertices and commuting cliques are its
 * simplices. The state node and radial spokes orient the reader in the quotient
 * but are not part of the link incidence.
 */
export function buildJnwStateLinkScene(input: {
  system: CoxeterSystemInput;
  summary: JnwLegalOrbitSummary;
  selectedStateId?: string;
  readerLens: Extract<
    JnwReaderLens,
    "ascending-link" | "descending-link" | "level-link" | "full-link"
  >;
}): JnwStateQuotientYGammaScene {
  const selectedStateId = selectedStateIdInSummary(
    input.summary,
    input.selectedStateId,
  );
  const selectedState =
    input.summary.states.find((state) => state.id === selectedStateId) ??
    input.summary.states[0];
  if (!selectedState) {
    throw new Error("A JNW link scene requires at least one orbit state.");
  }

  const links = deriveJnwStateLinks(input.system, selectedState);
  const link = linkForReaderLens(links, input.readerLens);
  const activeGenerators = new Set(
    link.vertices.map((vertex) => vertex.generator),
  );
  const stateGenerators = new Set(selectedState.generators);
  const generatorLayout = gammaGeneratorLayout(input.system);
  const stateName = formatStateName(input.summary, selectedStateId);
  const linkColor =
    input.readerLens === "ascending-link"
      ? "#16a34a"
      : input.readerLens === "descending-link"
        ? "#dc2626"
        : "#64748b";
  const nodes: SceneNode[] = [
    {
      id: selectedStateId,
      label: stateName,
      compactLabel: stateName,
      length: 0,
      position: [0, 0, 0],
      colorHint: jnwStateChartColor(input.summary, selectedStateId),
      nodeScale: 1.45,
      alwaysLabel: true,
      labelPriority: 200_000,
    },
    ...links.full.vertices.map((vertex) => {
      const direction = normalizeVec(
        generatorLayout.get(vertex.generator) ?? [0, 0, 1],
      );
      const active = activeGenerators.has(vertex.generator);
      return {
        id: linkVertexNodeId(selectedStateId, vertex.generator),
        label: vertex.displayLabel,
        compactLabel: vertex.displayLabel,
        length: 0,
        position: scaleVec(direction, 9.5),
        colorHint: active ? linkColor : "#94a3b8",
        nodeScale: active ? 1.05 : 0.62,
        stateRole: stateGenerators.has(vertex.generator)
          ? ("in-state" as const)
          : ("out-of-state" as const),
        alwaysLabel: active,
        labelPriority: active ? 175_000 - vertex.generator : -1_000,
        ghost: !active,
      };
    }),
  ];
  const edges: SceneEdge[] = links.full.vertices.map((vertex) => {
    const active = activeGenerators.has(vertex.generator);
    return {
      id: `jnw:link-guide:${selectedStateId}:${vertex.generator}`,
      source: selectedStateId,
      target: linkVertexNodeId(selectedStateId, vertex.generator),
      generator: vertex.generator,
      compactLabel: "",
      colorHint: active ? linkColor : "#94a3b8",
      suppressSemanticLabel: true,
      drawingOnly: true,
      ghost: !active,
    };
  });
  for (const simplex of link.simplices.filter(
    (entry) => entry.dimension === 1,
  )) {
    const [left, right] = simplex.generators;
    edges.push({
      id: `jnw:link-edge:${selectedStateId}:${left}-${right}`,
      source: linkVertexNodeId(selectedStateId, left),
      target: linkVertexNodeId(selectedStateId, right),
      generator: left,
      compactLabel: "",
      colorHint: linkColor,
      suppressSemanticLabel: true,
      emphasis: "readable-boundary",
    });
  }
  const cells = link.simplices
    .filter((simplex) => simplex.dimension === 2)
    .map((simplex) => ({
      id: `jnw:link-face:${selectedStateId}:${simplex.generators.join("-")}`,
      generatorPair: [simplex.generators[0], simplex.generators[1]] as [
        number,
        number,
      ],
      boundaryNodeIds: simplex.generators.map((generator) =>
        linkVertexNodeId(selectedStateId, generator),
      ),
      sourceCellId: simplex.id,
      dimension: 2,
      colorHint: linkColor,
      readabilityRole: "focus" as const,
    }));

  return {
    nodes,
    edges,
    cells,
    selectedNodeId: selectedStateId,
    stateVertexCount: input.summary.states.length,
    stateCopyCount: input.summary.states.length,
    readerMode: "exact-skeleton",
    readerLens: input.readerLens,
    railGrouping: "individual",
    bundledRailCount: 0,
    warnings: [
      `${link.displayLabel}: generator directions are vertices and commuting cliques supply the exact simplices.`,
      "The central state and radial spokes locate the link in the quotient; they are drawing guides, not link simplices.",
      input.readerLens === "level-link"
        ? "The faithful JNW diagonal map has no level directions, so this link is empty."
        : "The 3D placement is a drawing of exact link incidence.",
    ],
  };
}

function linkForReaderLens(
  links: ReturnType<typeof deriveJnwStateLinks>,
  lens: Extract<
    JnwReaderLens,
    "ascending-link" | "descending-link" | "level-link" | "full-link"
  >,
): JnwFiniteSimplicialLink {
  if (lens === "ascending-link") {
    return links.ascending;
  }
  if (lens === "descending-link") {
    return links.descending;
  }
  if (lens === "full-link") {
    return links.full;
  }
  return links.level;
}

function linkVertexNodeId(stateId: string, generator: number): string {
  return `jnw:link-vertex:${stateId}:${generator}`;
}

/**
 * Draws the JNW quotient as one cohesive state-labeled cell complex.
 *
 * The quotient vertices are exactly the states in the legal orbit. A generator
 * edge labeled g runs from one state to the state obtained by applying m_g.
 * Thus the endpoint of the lifted g-arrow is another state vertex. Relation
 * cells are the alternating state-edge cycles supplied by the JNW diagnostics.
 */
export function buildJnwStateQuotientYGammaScene(
  input: JnwStateQuotientSceneInput,
): JnwStateQuotientYGammaScene {
  const selectedStateId = selectedStateIdInSummary(
    input.summary,
    input.selectedStateId,
  );
  const readerMode = input.readerMode ?? "readable-chart";
  const readerLens =
    input.readerLens ?? (input.selectedRelationId ? "relation" : "none");
  const railGrouping = input.railGrouping ?? "individual";
  const statePositions = stateQuotientPositions(
    input.summary.states,
    input.summary.edges,
  );
  const constructionStage = input.constructionStage ?? 4;
  if (!supportsFourStateCoverSubdivision(input.summary)) {
    return buildGenericJnwStateQuotientScene(input);
  }
  const coverModel = buildJnwFourStateCoverModel(input.atlas, input.summary);
  const selectedRelation =
    coverModel.relationCells.find(
      (relation) => relation.id === input.selectedRelationId,
    ) ?? undefined;
  const selectedRelationEdgeIds = new Set(
    selectedRelation?.boundaryRailIds ?? [],
  );
  const relationFocusActive = selectedRelationEdgeIds.size > 0;
  const stateColorById = new Map(
    input.summary.states.map((state) => [
      state.id,
      jnwStateChartColor(input.summary, state.id),
    ]),
  );
  const sheetMode =
    constructionStage <= 3 ? "outlines" : (input.sheetMode ?? "glass");
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
  const moveClassBundles =
    railGrouping === "move-class-overview" && input.moveSystem
      ? buildMoveClassBundles(input.summary.edges, input.moveSystem)
      : [];
  const nodes: SceneNode[] = coverModel.stateVertices.map(
    (state, stateIndex) => {
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
        position: statePositions.get(state.id) ?? [0, 0, 0],
        colorHint: stateColor,
        nodeScale: selected || activeForGlue ? 3.2 : 2.5,
        alwaysLabel: true,
        labelPriority: 180_000 - stateIndex,
        labelScale: 5,
        ghost: ghostForStateLens || ghostForGlueLens,
      };
    },
  );
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
      const layout = buildJnwCoverSubdivisionLayout({
        system: input.system,
        coverModel,
        statePositions,
      });
      for (const midpoint of coverModel.railMidpoints) {
        const rail = coverModel.rails.find(
          (entry) => entry.id === midpoint.exactRailId,
        );
        const position = layout.midpointPositions.get(midpoint.id);
        if (!rail || !position) {
          continue;
        }
        const touchesSelected = rail.endpointStateIds.includes(selectedStateId);
        const selectedGlueEdge =
          readerLens === "glue" && rail.id === selectedRailId;
        const relationBoundarySegment = selectedRelationEdgeIds.has(rail.id);
        nodes.push({
          id: midpoint.id,
          length: 0,
          position,
          isRelationBoundary: relationBoundarySegment,
          drawingOnly: true,
          colorHint: selectedGlueEdge
            ? "#38bdf8"
            : relationBoundarySegment
              ? "#facc15"
              : "#94a3b8",
          nodeScale: selectedGlueEdge || relationBoundarySegment ? 0.42 : 0.25,
          ghost:
            (relationFocusActive && !relationBoundarySegment) ||
            (readerLens === "glue" &&
              selectedRailId !== undefined &&
              !selectedGlueEdge) ||
            (readerLens === "state" && !touchesSelected),
        });
      }
      if (constructionStage >= 3) {
        for (const center of coverModel.relationCenters) {
          const focused = center.exactRelationCellId === selectedRelation?.id;
          const relation = coverModel.relationCells.find(
            (entry) => entry.id === center.exactRelationCellId,
          );
          nodes.push({
            id: center.id,
            length: 0,
            position: layout.centerPositions.get(center.id) ?? [0, 0, 0],
            isRelationBoundary: true,
            drawingOnly: true,
            colorHint: focused ? "#facc15" : "#cbd5e1",
            nodeScale: focused ? 0.45 : 0.24,
            ghost:
              (relationFocusActive && !focused) ||
              (readerLens === "state" &&
                relation !== undefined &&
                !relation.boundaryStateIds.includes(selectedStateId)) ||
              (readerLens === "glue" &&
                selectedRailId !== undefined &&
                relation !== undefined &&
                !relation.boundaryRailIds.includes(selectedRailId)),
          });
        }
      }
      edges.push(
        ...buildReadableCoverRails({
          system: input.system,
          coverModel,
          selectedStateId,
          selectedRailId,
          selectedRelationEdgeIds,
          relationFocusActive,
          readerLens,
          midpointPositions: layout.midpointPositions,
          stateColorById,
        }),
      );
    }
  }

  const cells: JnwStateQuotientYGammaScene["cells"] =
    readerMode === "exact-skeleton" ||
    railGrouping === "move-class-overview" ||
    constructionStage < 3
      ? []
      : coverModel.sectors.map((sector) => {
          const relation = coverModel.relationCells.find(
            (entry) => entry.id === sector.exactRelationCellId,
          );
          const focused = selectedRelation?.id === sector.exactRelationCellId;
          const incidentToSelectedState =
            sector.ownerStateId === selectedStateId;
          const selectedGlueCell =
            selectedRailId !== undefined &&
            (sector.incomingRailId === selectedRailId ||
              sector.outgoingRailId === selectedRailId);
          return {
            id: sector.id,
            generatorPair: relation?.generatorPair ?? [0, 0],
            boundaryNodeIds: [...sector.subdivisionBoundaryIds],
            localDistance: incidentToSelectedState || focused ? 0 : 1,
            sourceCellId: sector.exactRelationCellId,
            readabilityRole:
              relationFocusActive || readerLens === "relation"
                ? focused
                  ? "focus"
                  : "context"
                : readerLens === "state"
                  ? incidentToSelectedState
                    ? "focus"
                    : "context"
                  : readerLens === "glue"
                    ? selectedGlueCell
                      ? "focus"
                      : "context"
                    : undefined,
            colorHint: focused
              ? "#facc15"
              : (stateColorById.get(sector.ownerStateId) ?? "#94a3b8"),
          };
        });
  const sourceCellIdByRenderedId = new Map(
    coverModel.sectors.map((sector) => [sector.id, sector.exactRelationCellId]),
  );

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
    coverModel,
    sourceCellIdByRenderedId,
    warnings: [
      readerMode === "exact-skeleton"
        ? "JNW exact skeleton: only state vertices S_i and exact generator transition rails are shown."
        : "Four-chart cover drawing: colored sectors are the four lifts of the Y_Gamma chamber sectors, glued along shared rail midpoints and relation centers.",
      "Each labeled rail represents one exact generator edge S_i -> S_i xor m_g. It is split at one shared subdivision midpoint only to expose the gluing.",
      railGrouping === "move-class-overview"
        ? "Bundled drawing: move-class overview groups identical move subsets. Expand to individual rails to see the full generator 1-skeleton."
        : "Individual rail drawing: every generator transition is shown with its own semantic label.",
      constructionStageWarning(constructionStage),
      sheetModeWarning(sheetMode),
      `Cover incidence check: ${coverModel.invariants.ok ? "passed" : "failed"}; ${coverModel.invariants.counts.states} states, ${coverModel.invariants.counts.rails} rails, ${coverModel.invariants.counts.relationCells} relation squares, and ${coverModel.invariants.counts.sectors} state-owned sectors.`,
      "The cover incidence and projection to Y_Gamma are exact in-repo data. The 3D coordinates, cell spreading, and colors are drawing conventions.",
      ...input.atlas.warnings,
    ],
  };
}

function supportsFourStateCoverSubdivision(
  summary: JnwLegalOrbitSummary,
): boolean {
  return (
    summary.rightAngled &&
    summary.orbitComplete &&
    summary.states.length === 4 &&
    summary.rankTwoDiagnostics.length > 0 &&
    summary.rankTwoDiagnostics.every(
      (diagnostic) =>
        diagnostic.ok &&
        diagnostic.m === 2 &&
        diagnostic.boundaryStateIds.length === 4 &&
        new Set(diagnostic.boundaryStateIds).size === 4,
    )
  );
}

/**
 * Experimental JNW inputs need a renderer even when they do not admit the
 * cube-specific four-sector subdivision. This view uses only the supplied
 * state orbit, exact transition edges, and closed diagnostic boundaries.
 */
function buildGenericJnwStateQuotientScene(
  input: JnwStateQuotientSceneInput,
): JnwStateQuotientYGammaScene {
  const selectedStateId = selectedStateIdInSummary(
    input.summary,
    input.selectedStateId,
  );
  const readerMode = input.readerMode ?? "exact-skeleton";
  const readerLens =
    input.readerLens ?? (input.selectedRelationId ? "relation" : "state");
  const railGrouping = input.railGrouping ?? "individual";
  const constructionStage = input.constructionStage ?? 4;
  const selectedRailId = resolveSelectedRailId({
    summary: input.summary,
    selectedStateId,
    selectedRail: input.selectedRail,
  });
  const positions = stateQuotientPositions(
    input.summary.states,
    input.summary.edges,
  );
  const selectedRelation = input.summary.rankTwoDiagnostics.find(
    (diagnostic) => diagnostic.id === input.selectedRelationId,
  );
  const selectedRelationEdgeIds = new Set(
    selectedRelation?.boundaryEdgeIds ?? [],
  );
  const relationFocusActive = selectedRelationEdgeIds.size > 0;
  const nodes = input.summary.states.map((state, index) => {
    const selected = state.id === selectedStateId;
    return {
      id: state.id,
      label: formatStateName(input.summary, state.id),
      compactLabel: formatStateName(input.summary, state.id),
      length: 0,
      localDistance: selected ? 0 : 1,
      position: positions.get(state.id) ?? ([0, 0, 0] as Vec3),
      colorHint: jnwStateChartColor(input.summary, state.id),
      nodeScale: selected ? 1.45 : 1.05,
      alwaysLabel: true,
      labelPriority: 180_000 - index,
      ghost: readerLens === "state" && !selected,
    };
  });
  const moveClassBundles =
    railGrouping === "move-class-overview" && input.moveSystem
      ? buildMoveClassBundles(input.summary.edges, input.moveSystem)
      : [];
  const edges: SceneEdge[] = [];
  if (constructionStage >= 2) {
    if (railGrouping === "move-class-overview" && moveClassBundles.length > 0) {
      const stateColorById = new Map(
        input.summary.states.map((state) => [
          state.id,
          jnwStateChartColor(input.summary, state.id),
        ]),
      );
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
      edges.push(
        ...buildExactSkeletonRails({
          system: input.system,
          summary: input.summary,
          selectedStateId,
          selectedRailId,
          readerLens,
        }).map((edge) => ({
          ...edge,
          ghost:
            edge.ghost ||
            (relationFocusActive && !selectedRelationEdgeIds.has(edge.id)),
          selectedHighlight: selectedRelationEdgeIds.has(edge.id)
            ? "outline"
            : edge.selectedHighlight,
        })),
      );
    }
  }
  const cells =
    readerMode === "exact-skeleton" ||
    railGrouping === "move-class-overview" ||
    constructionStage < 3
      ? []
      : input.summary.rankTwoDiagnostics
          .filter((diagnostic) => diagnostic.ok)
          .map((diagnostic) => ({
            id: diagnostic.id,
            generatorPair: diagnostic.generatorPair,
            boundaryNodeIds: [...diagnostic.boundaryStateIds],
            sourceCellId: diagnostic.id,
            drawingOnly: true,
            readabilityRole:
              selectedRelation?.id === diagnostic.id
                ? ("focus" as const)
                : relationFocusActive
                  ? ("context" as const)
                  : ("incident" as const),
          }));

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
    sourceCellIdByRenderedId: new Map(
      cells.map((cell) => [cell.id, cell.sourceCellId ?? cell.id]),
    ),
    warnings: [
      "Experimental state-orbit drawing: this input does not satisfy the four-state RACG hypotheses used by the faithful cube-cover subdivision.",
      "State vertices, transition rails, and supplied closed relation boundaries are retained; polygon placement is a drawing convention.",
      constructionStageWarning(constructionStage),
      ...input.atlas.warnings,
    ],
  };
}

interface JnwCoverSubdivisionLayout {
  midpointPositions: Map<string, Vec3>;
  centerPositions: Map<string, Vec3>;
}

/**
 * Places exact subdivision vertices without changing cover incidence. Rail
 * midpoints separate parallel generator edges; relation centers fan the twelve
 * lifted squares around the four state vertices.
 */
function buildJnwCoverSubdivisionLayout(input: {
  system: CoxeterSystemInput;
  coverModel: JnwFourStateCoverModel;
  statePositions: Map<string, Vec3>;
}): JnwCoverSubdivisionLayout {
  const midpointPositions = new Map<string, Vec3>();
  const centerPositions = new Map<string, Vec3>();
  const generatorDirections = gammaGeneratorLayout(input.system);
  const railsByStatePair = new Map<string, typeof input.coverModel.rails>();
  for (const rail of input.coverModel.rails) {
    const key = [...rail.endpointStateIds].sort().join("|");
    railsByStatePair.set(key, [...(railsByStatePair.get(key) ?? []), rail]);
  }

  for (const rails of railsByStatePair.values()) {
    const ordered = [...rails].sort(
      (left, right) =>
        left.generator - right.generator || left.id.localeCompare(right.id),
    );
    const laneCenter = (ordered.length - 1) / 2;
    ordered.forEach((rail, index) => {
      const source = input.statePositions.get(rail.endpointStateIds[0]) ?? [
        0, 0, 0,
      ];
      const target = input.statePositions.get(rail.endpointStateIds[1]) ?? [
        0, 0, 0,
      ];
      const direction = normalizeVec(subVec(target, source));
      const side = stableSideVector(direction, rail.generator);
      const generatorDirection = normalizeVec(
        generatorDirections.get(rail.generator) ?? [0, 0, 1],
      );
      const midpoint = averageVec([source, target]);
      const lane = (index - laneCenter) * 3.3;
      const opened = addVec(
        midpoint,
        addVec(scaleVec(side, lane), scaleVec(generatorDirection, 4.2)),
      );
      midpointPositions.set(rail.midpointId, opened);
    });
  }

  input.coverModel.relationCells.forEach((relation, relationIndex) => {
    const boundaryMidpoints = relation.boundaryRailIds
      .map((railId) =>
        input.coverModel.rails.find((rail) => rail.id === railId),
      )
      .map((rail) =>
        rail ? midpointPositions.get(rail.midpointId) : undefined,
      )
      .filter((position): position is Vec3 => position !== undefined);
    const boundaryCenter = averageVec(boundaryMidpoints);
    const [left, right] = relation.generatorPair;
    const leftDirection = generatorDirections.get(left) ?? [1, 0, 0];
    const rightDirection = generatorDirections.get(right) ?? [0, 1, 0];
    const pairDirection = normalizeVec(addVec(leftDirection, rightDirection));
    const normal = relationNormal(boundaryMidpoints, pairDirection);
    const layer = ((relationIndex % 3) - 1) * 1.8;
    centerPositions.set(
      relation.centerId,
      addVec(
        boundaryCenter,
        addVec(scaleVec(pairDirection, 8.5), scaleVec(normal, layer)),
      ),
    );
  });

  return { midpointPositions, centerPositions };
}

function buildReadableCoverRails(input: {
  system: CoxeterSystemInput;
  coverModel: JnwFourStateCoverModel;
  selectedStateId: string;
  selectedRailId: string | undefined;
  selectedRelationEdgeIds: Set<string>;
  relationFocusActive: boolean;
  readerLens: JnwReaderLens;
  midpointPositions: Map<string, Vec3>;
  stateColorById: Map<string, string>;
}): SceneEdge[] {
  return input.coverModel.rails.flatMap((rail) => {
    const midpointPosition = input.midpointPositions.get(rail.midpointId);
    const touchesSelected = rail.endpointStateIds.includes(
      input.selectedStateId,
    );
    const relationBoundary = input.selectedRelationEdgeIds.has(rail.id);
    const selectedGlue =
      input.readerLens === "glue" && rail.id === input.selectedRailId;
    const ghost =
      (input.relationFocusActive && !relationBoundary) ||
      (input.readerLens === "glue" &&
        input.selectedRailId !== undefined &&
        !selectedGlue) ||
      (input.readerLens === "state" && !touchesSelected);
    const focusColor = selectedGlue
      ? "#38bdf8"
      : relationBoundary
        ? "#facc15"
        : input.readerLens === "state" && touchesSelected
          ? "#60a5fa"
          : undefined;
    const label =
      input.system.generators[rail.generator]?.label ?? `s${rail.generator}`;
    const priority = selectedGlue
      ? 185_000 - rail.generator
      : relationBoundary || touchesSelected
        ? 170_000 - rail.generator
        : ghost
          ? -1_000
          : 125_000 - rail.generator;
    const common = {
      generator: rail.generator,
      ghost,
      isRelationBoundary: true,
      emphasis: "readable-boundary" as const,
      selectedHighlight:
        selectedGlue || relationBoundary || touchesSelected
          ? ("outline" as const)
          : undefined,
      drawingOnly: true,
    };
    return [
      {
        ...common,
        id: `${rail.id}:from:${rail.sourceStateId}`,
        source: rail.sourceStateId,
        target: rail.midpointId,
        colorHint: focusColor ?? input.stateColorById.get(rail.sourceStateId),
        compactLabel: label,
        alwaysLabel: true,
        labelLeader: true,
        labelAnchor: midpointPosition,
        labelPriority: priority,
        labelScale: 4,
      },
      {
        ...common,
        id: `${rail.id}:continuation`,
        source: rail.midpointId,
        target: rail.targetStateId,
        colorHint: focusColor ?? input.stateColorById.get(rail.targetStateId),
        compactLabel: "",
        suppressSemanticLabel: true,
        labelPriority: -10_000,
        directed: true,
      },
    ];
  });
}

function averageVec(vectors: readonly Vec3[]): Vec3 {
  if (vectors.length === 0) {
    return [0, 0, 0];
  }
  const sum = vectors.reduce<Vec3>(
    (accumulator, vector) => addVec(accumulator, vector),
    [0, 0, 0],
  );
  return scaleVec(sum, 1 / vectors.length);
}

function relationNormal(points: readonly Vec3[], fallback: Vec3): Vec3 {
  if (points.length >= 3) {
    const normal = crossVec(
      subVec(points[1], points[0]),
      subVec(points[2], points[0]),
    );
    if (Math.hypot(...normal) > 0.000001) {
      return normalizeVec(normal);
    }
  }
  return stableSideVector(fallback, 0);
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
      labelScale: 3.4,
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
