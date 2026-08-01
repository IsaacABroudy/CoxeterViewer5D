import {
  Crosshair,
  Download,
  FileJson,
  FileUp,
  FolderOpen,
  Home,
  ImageDown,
  Package,
  Save,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Panel } from "../components/Panel";
import { LocalLinkView } from "../components/LocalLinkView";
import { Stat } from "../components/Stat";
import { Toggle } from "../components/Toggle";
import {
  GeneratedBallValidationError,
  exactBackendStubs,
  parseGeneratedCayleyBall,
} from "../backends";
import { assignShellLayout, collectGraphNeighborhood } from "../cayley";
import { CoxeterValidationError, parseCoxeterSystemInput } from "../coxeter";
import {
  buildLocalLinkFromSphericalSubsets,
  computeSphericalCellProxies,
  deriveDavisIncidencePoset,
  enumerateSphericalSubsets,
  type DavisCellProxy,
  type SphericalSubsetEnumerationResult,
} from "../davis";
import {
  classifyIncidentEdges,
  buildJnwLayerBreadcrumb,
  createBipartiteJnwMoveSystem,
  createDefaultJnwMoveSystem,
  createDefaultJnwState,
  createJnwState,
  createGeneratorGameAssignment,
  formatJnwStateLabel,
  formatJnwStateName,
  invertGeneratorAssignment,
  jnwOrbitToQuotientComplex,
  resolveIntegerEdgeAssignment,
  summarizeJnwLegalSystem,
  summarizeCocycle,
  type EditableGameAssignment,
  type GameCocycleSummary,
  type GameWorkflowKind,
  type JnwLegalOrbitSummary,
  type JnwMoveSystem,
  type JnwRankTwoDiagnostic,
  type JnwState,
  type QuotientGameData,
} from "../game";
import { placeCayleyNodesInHyperbolicGeometry } from "../geometry";
import {
  buildJnwGammaStateDiagram,
  buildJnwStateLinkScene,
  buildJnwStateQuotientYGammaScene,
  decorateJnwStateQuotientScene,
  jnwStateChartColor,
  type JnwQuotientConstructionStage,
  type JnwQuotientSheetMode,
  type JnwRailGrouping,
  type JnwReaderLens,
  type JnwReaderMode,
} from "./jnwStateVisual";
import {
  QuotientValidationCancelledError,
  QuotientValidationError,
  parseQuotientComplex,
  quotientManifoldStatus,
  createQuotientBuildInput,
} from "../quotient";
import {
  SceneView,
  type SceneCell,
  type SceneEdge,
  type SceneGenerator,
  type SceneNode,
  type SceneRenderStats,
} from "../render/SceneView";
import {
  createDesktopBridge,
  readStoredRecentSessions,
  writeStoredRecentSessions,
  type DesktopBridgeResult,
  type DesktopBridgeStatus,
  type DesktopExportRequest,
  type DesktopJobRecord,
  type DesktopMenuCommand,
  type ExternalToolStatus,
} from "../desktop";
import type {
  CoxeterSystemInput,
  DavisHigherCell,
  DavisTwoCell,
  GeneratedCayleyBall,
  HyperbolicProjection,
} from "../types";
import { createGenerationClient } from "./generationClient";
import { createLocalViewCache } from "./localLayoutCache";
import {
  createQuotientValidationClient,
  type QuotientValidationClient,
} from "./quotientValidationClient";
import {
  baseOrbicomplexForSystem,
  quotientToGeneratedBall,
  syntheticSystemForGeneratedBall,
  syntheticSystemForQuotient,
  type ViewerDataset,
} from "./viewerDataset";
import {
  buildYGammaCellAtlas,
  isYGammaBaseComplex,
  type YGammaCellAtlas,
  type YGammaCellRecord,
} from "./yGammaAtlas";
import {
  findRankThreeFocusContainingPair,
  rankThreeFocusPairOptions,
} from "./yGammaRankThreeFocus";
import type {
  YGamma2SkeletonScene,
  YGamma2SkeletonSceneOptions,
} from "./yGammaScene";
import {
  type YGammaCellSeparation,
  type YGammaCutawayMode,
  type YGammaPeelMode,
  type YGammaRankThreeFocus,
  type YGammaSeparationValue,
} from "./yGammaScene";
import { createYGammaSceneClient } from "./yGammaSceneClient";
import {
  buildYGammaDrawingComparisonScene,
  type YGammaDrawingComparisonScene,
} from "./yGammaComparisonScene";
import {
  buildLocalNeighborhoodExport,
  cellBoundaryEdgeKeys,
  type CellFocusMode,
  type CellNeighborhoodMode,
  compactWordLabel,
  type LocalCellRenderMode,
  type LocalViewLayout,
  type OcclusionMode,
  pairKey,
  parsePairKey,
  rankTwoPairDiagnostics,
  relationWalkEntries,
  type RelationWalkMode,
  type LabelScope,
  type ViewPresetId,
} from "./localView";
import { buildSceneRevisionSet, generatedBallIdentity } from "./stableHash";
import {
  buildWhatAmISeeingSummary,
  groupWarnings,
  type WhatAmISeeingSummary,
  type WarningGroup,
} from "./viewStory";
import {
  buildDefiningGraphScene,
  definingGraphNodeId,
  type DefiningGraphScene,
  type DefiningGraphLayoutMode,
  type DefiningGraphRelationOrderComponents,
  type DefiningGraphVertexIncidence,
} from "./definingGraphScene";
import {
  activeGuidedInspectionStep,
  guidedInspectionDefinition,
  guidedInspectionDefinitions,
  moveGuidedInspectionStep,
  type GuidedInspectionId,
  type GuidedInspectionState,
} from "./guidedInspection";
import {
  activeResearchWorkflowStep,
  defaultResearchWorkflowState,
  moveResearchWorkflowStep,
  researchWorkflowSteps,
  topologyLensDefinition,
  topologyLensDefinitions,
  type ResearchWorkflowState,
  type ResearchWorkflowStepId,
  type TopologyLensId,
  type TopologyLensState,
} from "./researchWorkflow";
import { createExperimentBundle, type ExperimentBundle } from "./experiments";
import {
  compareLatestNotebookRuns,
  duplicateNotebookBundle,
  parseNotebookBundles,
  readNotebookBundles,
  writeNotebookBundles,
} from "./notebookStorage";
import { scheduleIdleTask } from "./idle";
import {
  createViewerInteractionStore,
  useViewerInteractionSelector,
  type ViewerInteractionStore,
  type ViewerRenderStatsState,
} from "./viewerInteractionStore";
import {
  computeLocalLinkHomology,
  createFiniteSimplicialComplex,
  summarizeTopologyDiagnostics,
  type LocalLinkHomologySummary,
} from "../topology";
import {
  buildTopologyExplanation,
  buildJnwStateLinkSubject,
  type TopologyExplanation,
  type TopologyInspectorSubject,
} from "./topologyInspector";
import {
  inspectorAnswers,
  modelExplanationForLabel,
  modelExplanations,
  startHereActions,
  type StartHereActionId,
} from "./orientation";
import {
  createAnnotation,
  createCameraBookmark,
  defaultGalleryEntries,
  viewComparisonOptions,
  type Annotation,
  type CameraBookmark,
  type FigureExportBundle,
  type UiMode,
  type ViewComparisonMode,
} from "./researchUi";
import { importRepairSuggestions } from "./importRepair";
import {
  createProjectSessionSnapshot,
  createProjectSession,
  createProjectSessionExport,
  hasProjectSessionChanges,
  importProjectSession,
  upsertRecentProjectSession,
  type ProjectSession,
  type ProjectSessionRecentFile,
  type ProjectSessionSnapshot,
} from "./projectSession";
import {
  countCertificationBlockedEntries,
  filterTumarkinEightFacetCatalogue,
  tumarkinEightFacetCatalogue,
  tumarkinEightFacetSourceRef,
  type EightFacetCatalogueFilter,
} from "../catalogue/eightFacet5d";

import A2 from "../examples/A2.json";
import A3 from "../examples/A3.json";
import compact5CubeGamma1 from "../examples/compact_5_cube_gamma1.json";
import compact5PolytopeP1DoubleMakarov from "../examples/compact_5_polytope_p1_double_makarov.json";
import compact5PrismMakarov from "../examples/compact_5_prism_makarov.json";
import compact5PrismMakarovP2 from "../examples/compact_5_prism_makarov_p2.json";
import hyperbolicToyRank2 from "../examples/hyperbolic_toy_rank2.json";
import I2_5 from "../examples/I2_5.json";
import I2_5IdentityQuotient from "../examples/I2_5_identity_quotient.json";
import jnwCubeGraph from "../examples/jnw_cube_graph.json";
import universalRank3 from "../examples/universal_rank3.json";

type ViewerMode = "shell" | "geometric";
type GraphViewMode = "global" | "on-graph";
type YGammaMainView = "complex" | "gamma" | "nerve";
type YGammaFocusPreset =
  | "one-relation"
  | "rank-three-cell"
  | "around-generator"
  | "m2-squares"
  | "m3-hexagons"
  | "full-skeleton";
type YGammaCameraBookmark =
  | "front"
  | "top"
  | "square-family"
  | "hexagon-family"
  | "rank-three-cell";
type YGammaStarLens =
  | "generator-star"
  | "edge-star"
  | "relation-star"
  | "rank-three-cell-star"
  | "jnw-ascending-star"
  | "jnw-descending-star";
type YGammaInspectMode =
  | "inspect-cell"
  | "inspect-edge"
  | "select-relation-family"
  | "orbit-selected-object";
type YGammaCameraPath =
  | "none"
  | "selected-relation"
  | "square-family"
  | "hexagon-family"
  | "shared-generator"
  | "relation-star";

interface YGammaReadableViewState {
  cutawayMode: YGammaCutawayMode;
  relationStarActive: boolean;
  starLens?: YGammaStarLens;
  separationValue: YGammaSeparationValue;
  inspectMode: YGammaInspectMode;
  cameraPath: YGammaCameraPath;
  smallAtlasOpen: boolean;
  compareDrawing: boolean;
}

interface ExampleRecord {
  id: string;
  label: string;
  input: CoxeterSystemInput;
}

const graphPresets = {
  small: {
    label: "Small",
    maxRadius: 6,
    maxNodes: 2500,
    maxEdges: 9000,
    matrixKeyPrecision: 10,
    maxNodeLabels: 180,
    maxEdgeLabels: 120,
    maxCells: 220,
    maxProxies: 40,
  },
  medium: {
    label: "Medium",
    maxRadius: 7,
    maxNodes: 6000,
    maxEdges: 20000,
    matrixKeyPrecision: 10,
    maxNodeLabels: 100,
    maxEdgeLabels: 60,
    maxCells: 160,
    maxProxies: 35,
  },
  large: {
    label: "Large",
    maxRadius: 8,
    maxNodes: 12000,
    maxEdges: 45000,
    matrixKeyPrecision: 10,
    maxNodeLabels: 48,
    maxEdgeLabels: 40,
    maxCells: 80,
    maxProxies: 20,
  },
  research: {
    label: "Research",
    maxRadius: 10,
    maxNodes: 20000,
    maxEdges: 80000,
    matrixKeyPrecision: 10,
    maxNodeLabels: 24,
    maxEdgeLabels: 24,
    maxCells: 60,
    maxProxies: 12,
  },
} as const;
const generationDebounceMs = 120;
const geometricDisplayScale = 12;
type GraphPresetId = keyof typeof graphPresets;
type ColorScheme = "light" | "dark";
const viewPresetStorageKey = "coxeter-viewer:view-preset";
const colorSchemeStorageKey = "coxeter-viewer:color-scheme";

const bundledExamples: ExampleRecord[] = [
  { id: "I2_5", label: "I2(5)", input: parseCoxeterSystemInput(I2_5) },
  { id: "A2", label: "A2", input: parseCoxeterSystemInput(A2) },
  { id: "A3", label: "A3", input: parseCoxeterSystemInput(A3) },
  {
    id: "hyperbolic_toy_rank2",
    label: "Hyperbolic toy rank 2",
    input: parseCoxeterSystemInput(hyperbolicToyRank2),
  },
  {
    id: "universal_rank3",
    label: "Universal rank 3",
    input: parseCoxeterSystemInput(universalRank3),
  },
  {
    id: "jnw_cube_graph",
    label: "JNW cube graph",
    input: parseCoxeterSystemInput(jnwCubeGraph),
  },
  {
    id: "compact_5_prism_makarov",
    label: "Compact 5-prism P0 Makarov",
    input: parseCoxeterSystemInput(compact5PrismMakarov),
  },
  {
    id: "compact_5_polytope_p1_double_makarov",
    label: "Compact 5-polytope P1 double",
    input: parseCoxeterSystemInput(compact5PolytopeP1DoubleMakarov),
  },
  {
    id: "compact_5_prism_makarov_p2",
    label: "Compact 5-prism P2 Makarov",
    input: parseCoxeterSystemInput(compact5PrismMakarovP2),
  },
  {
    id: "compact_5_cube_gamma1",
    label: "Compact 5-cube Gamma1",
    input: parseCoxeterSystemInput(compact5CubeGamma1),
  },
];

const jnwCubeExampleId = "jnw_cube_graph";
// This is the legal state displayed for the cube graph in JNW21, Section 5.a.1.
// The binary labels are v000, v010, v110, and v111.
const jnwCubeLegalInitialState = [0, 2, 6, 7];

const viewPresetOptions: Array<{ id: ViewPresetId; label: string }> = [
  { id: "global", label: "See all" },
  { id: "local-chamber", label: "Look near a chamber" },
  { id: "rank-two-cells", label: "Rank-Two Cells" },
  { id: "geometric-projection", label: "Projection drawing" },
];

function preferredGeometricProjection(
  system: CoxeterSystemInput,
): HyperbolicProjection {
  return (system.geometry?.dimension ?? 0) <= 3
    ? "poincare-axes"
    : "poincare-pca";
}

function initialWorkerGeneration(): {
  ball: GeneratedCayleyBall | null;
  sphericalSubsets?: SphericalSubsetEnumerationResult;
  datasetId?: string;
  error: string | null;
  pending: boolean;
  requestId: number;
  generationMs?: number;
} {
  return { ball: firstPaintBall, error: null, pending: true, requestId: 0 };
}

function initialYGammaSceneState(): {
  scene: YGamma2SkeletonScene | undefined;
  atlasVersion: string | undefined;
  sceneVersion: string | undefined;
  pendingSceneVersion: string | undefined;
  pending: boolean;
  error: string | null;
  buildMs?: number;
} {
  return {
    scene: undefined,
    atlasVersion: undefined,
    sceneVersion: undefined,
    pendingSceneVersion: undefined,
    pending: false,
    error: null,
  };
}

function yGammaSeparationValueForPreset(
  separation: YGammaCellSeparation,
): YGammaSeparationValue {
  if (separation === "coherent") {
    return 0;
  }
  if (separation === "expanded") {
    return 100;
  }
  return 50;
}

function yGammaSeparationPresetForValue(
  value: YGammaSeparationValue,
): YGammaCellSeparation {
  if (value <= 20) {
    return "coherent";
  }
  if (value >= 80) {
    return "expanded";
  }
  return "readable";
}

const emptySceneNodes: SceneNode[] = [];
const emptySceneEdges: SceneEdge[] = [];
const emptySceneCells: SceneCell[] = [];
const firstPaintBall: GeneratedCayleyBall = {
  systemName: "I2(5)",
  rank: 2,
  nodes: [
    { id: "e", word: [], length: 0, position: [0, 0, 0] },
    { id: "s0", word: [0], length: 1, position: [1, 0, 0] },
    { id: "s1", word: [1], length: 1, position: [-1, 0, 0] },
  ],
  edges: [
    { id: "e--0--s0", source: "e", target: "s0", generator: 0 },
    { id: "e--1--s1", source: "e", target: "s1", generator: 1 },
  ],
  twoCells: [],
  metadata: {
    radius: 1,
    requestedRadius: 5,
    generatorConvention: "right-multiplication",
    deduplication: "exact",
    caps: { maxRadius: 1, maxNodes: 3, maxEdges: 2 },
    completeness: "truncated",
    capStatus: { radiusCapped: true, truncated: true },
    createdAt: "1970-01-01T00:00:00.000Z",
    warnings: [
      "Tiny first-paint fixture is visible while the selected Cayley ball is generated.",
    ],
  },
};

interface SceneCountSnapshot {
  nodes: number;
  edges: number;
  cells: number;
}

function selectSceneCounts(stats: ViewerRenderStatsState): SceneCountSnapshot {
  return {
    nodes: stats.renderedNodes,
    edges: stats.renderedEdges,
    cells: stats.renderedCells,
  };
}

function sameSceneCounts(
  left: SceneCountSnapshot,
  right: SceneCountSnapshot,
): boolean {
  return (
    left.nodes === right.nodes &&
    left.edges === right.edges &&
    left.cells === right.cells
  );
}

function isTransientBuildWarning(warning: string): boolean {
  return (
    warning === "Y_Gamma scene construction is running in a worker." ||
    warning === "Cayley ball generation is running in a worker." ||
    /^Radius \d+ is queued; currently showing radius \d+\.$/.test(warning)
  );
}

export function App() {
  const desktopBridge = useMemo(() => createDesktopBridge(), []);
  const [initialViewPreset] = useState<ViewPresetId>(
    () => readStoredViewPreset() ?? "global",
  );
  const [exampleId, setExampleId] = useState(bundledExamples[0].id);
  const [importedExample, setImportedExample] = useState<ExampleRecord | null>(
    null,
  );
  const [importedDataset, setImportedDataset] = useState<ViewerDataset | null>(
    null,
  );
  const [radius, setRadius] = useState(5);
  const [graphPresetId, setGraphPresetId] = useState<GraphPresetId>("small");
  const [uiMode, setUiMode] = useState<UiMode>("teaching");
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    () => readStoredColorScheme() ?? "light",
  );
  const [viewerOnly, setViewerOnly] = useState(false);
  const [sceneLayoutSignal, setSceneLayoutSignal] = useState(0);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const rightRailRef = useRef<HTMLElement | null>(null);
  const viewerOnlyScrollSnapshotRef = useRef({
    sidebarTop: 0,
    rightRailTop: 0,
    windowX: 0,
    windowY: 0,
  });
  const [viewComparisonMode, setViewComparisonMode] =
    useState<ViewComparisonMode>("single");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [cameraBookmarks, setCameraBookmarks] = useState<CameraBookmark[]>([]);
  const [bookmarkDraft, setBookmarkDraft] = useState("");
  const [backendId, setBackendId] = useState("browserApproxBackend");
  const [mode, setMode] = useState<ViewerMode>(
    initialViewPreset === "geometric-projection" ? "geometric" : "shell",
  );
  const [graphView, setGraphView] = useState<GraphViewMode>(
    initialViewPreset === "local-chamber" ||
      initialViewPreset === "rank-two-cells"
      ? "on-graph"
      : "global",
  );
  const [localDepth, setLocalDepth] = useState(2);
  const [activePreset, setActivePreset] =
    useState<ViewPresetId>(initialViewPreset);
  const [projection, setProjection] =
    useState<HyperbolicProjection>("poincare-axes");
  const [showCells, setShowCells] = useState(true);
  const [showHigherCells, setShowHigherCells] = useState(true);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [labelScope, setLabelScope] = useState<LabelScope>(
    initialViewPreset === "local-chamber" ||
      initialViewPreset === "rank-two-cells"
      ? "focused"
      : "budgeted",
  );
  const localViewLayout: LocalViewLayout = "local-chamber-3d";
  const [cellRenderMode, setCellRenderMode] =
    useState<LocalCellRenderMode>("in-graph");
  const [cellFocusMode, setCellFocusMode] =
    useState<CellFocusMode>("incident-selected");
  const [cellNeighborhoodMode, setCellNeighborhoodMode] =
    useState<CellNeighborhoodMode>("chamber");
  const [relationWalkMode, setRelationWalkMode] =
    useState<RelationWalkMode>("numbered");
  const [occlusionMode, setOcclusionMode] = useState<OcclusionMode>("hide-far");
  const [cellOpacity, setCellOpacity] = useState(0.24);
  const [panelOffsetStrength, setPanelOffsetStrength] = useState(0.18);
  const [bringFocusedCellsForward, setBringFocusedCellsForward] =
    useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("e");
  const [rootNodeId, setRootNodeId] = useState("e");
  const [selectedCellId, setSelectedCellId] = useState<string | undefined>();
  const [disabledPairs, setDisabledPairs] = useState<Set<string>>(new Set());
  const [activeGeneratorPairKey, setActiveGeneratorPairKey] = useState<
    string | undefined
  >();
  const [disabledHigherSubsets, setDisabledHigherSubsets] = useState<
    Set<string>
  >(new Set());
  const [importError, setImportError] = useState<string | null>(null);
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [experimentNote, setExperimentNote] = useState("");
  const [savedExperiments, setSavedExperiments] = useState<ExperimentBundle[]>(
    [],
  );
  const [guidedInspection, setGuidedInspection] =
    useState<GuidedInspectionState>();
  const [researchWorkflow, setResearchWorkflow] =
    useState<ResearchWorkflowState>(() => defaultResearchWorkflowState());
  const [topologyLens, setTopologyLens] = useState<TopologyLensState>({
    id: "full-local-link",
    selectedGenerator: 0,
  });
  const [teachingLocalLinkOpen, setTeachingLocalLinkOpen] = useState(false);
  const [gameDraft, setGameDraft] = useState<
    { datasetId: string; assignment: EditableGameAssignment } | undefined
  >(undefined);
  const [gameWorkflowKind, setGameWorkflowKind] = useState<GameWorkflowKind>(
    "generator-uniform-cochain",
  );
  const [jnwDraft, setJnwDraft] = useState<
    | {
        sourceKey: string;
        moveSystem: JnwMoveSystem;
        initialState: JnwState;
      }
    | undefined
  >(undefined);
  const [selectedJnwStateId, setSelectedJnwStateId] = useState<
    string | undefined
  >(undefined);
  const [gammaHighlightedJnwStateId, setGammaHighlightedJnwStateId] = useState<
    string | undefined
  >(undefined);
  const [jnwLayerCompareOpen, setJnwLayerCompareOpen] = useState(false);
  const [jnwReaderMode, setJnwReaderMode] =
    useState<JnwReaderMode>("readable-chart");
  const [jnwReaderLens, setJnwReaderLens] = useState<JnwReaderLens>("none");
  const [jnwRailGrouping, setJnwRailGrouping] =
    useState<JnwRailGrouping>("individual");
  const [selectedJnwGenerator, setSelectedJnwGenerator] = useState(0);
  const [jnwQuotientSheetMode, setJnwQuotientSheetMode] =
    useState<JnwQuotientSheetMode>("glass");
  const [jnwQuotientConstructionStage, setJnwQuotientConstructionStage] =
    useState<JnwQuotientConstructionStage>(4);
  const [notebookImportError, setNotebookImportError] = useState<string | null>(
    null,
  );
  const [quotientSubgroupText, setQuotientSubgroupText] = useState("");
  const [quotientMaxCosets, setQuotientMaxCosets] = useState(128);
  const [quotientBuilderError, setQuotientBuilderError] = useState<
    string | null
  >(null);
  const [viewerInteractionStore] = useState(createViewerInteractionStore);
  const [desktopStatus, setDesktopStatus] =
    useState<DesktopBridgeStatus | null>(null);
  const [desktopMessage, setDesktopMessage] = useState<string | null>(null);
  const [desktopTools, setDesktopTools] = useState<ExternalToolStatus[]>([]);
  const [desktopJobs, setDesktopJobs] = useState<DesktopJobRecord[]>([]);
  const [recentSessions, setRecentSessions] = useState<
    ProjectSessionRecentFile[]
  >(() => readStoredRecentSessions());
  const captureScenePngRef = useRef<(() => Promise<string>) | undefined>(
    undefined,
  );
  const latestSceneStatsRef = useRef<SceneRenderStats | null>(null);
  const handleSceneRenderStats = useCallback(
    (stats: SceneRenderStats) => {
      latestSceneStatsRef.current = stats;
      viewerInteractionStore.setRenderStats({
        runtimeId: stats.runtimeId,
        renderCount: stats.renderCount,
        renderReason: stats.renderReason,
        frame: stats.frame,
        lastFrameMs: stats.frameSamples.at(-1)?.deltaMs ?? 0,
        lastGraphUpdateMs: stats.lastGraphUpdateMs,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        renderedNodes: stats.renderedNodes,
        renderedEdges: stats.renderedEdgeSegments,
        renderedCells: stats.renderedCells,
        renderedLabels: stats.renderedNodeLabels + stats.renderedEdgeLabels,
      });
    },
    [viewerInteractionStore],
  );
  const desktopMenuCommandHandlerRef = useRef<
    (command: DesktopMenuCommand) => Promise<void>
  >(async () => undefined);
  const initialSessionBaselineRef = useRef(false);
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [eightFacetCatalogueOpen, setEightFacetCatalogueOpen] = useState(false);
  const [eightFacetCatalogueQuery, setEightFacetCatalogueQuery] = useState("");
  const [eightFacetCatalogueFilter, setEightFacetCatalogueFilter] =
    useState<EightFacetCatalogueFilter>("all");
  const [yGammaMainView, setYGammaMainView] =
    useState<YGammaMainView>("complex");
  const [yGammaShowAllFaces, setYGammaShowAllFaces] = useState(false);
  const [yGammaRankThreeFocusEnabled, setYGammaRankThreeFocusEnabled] =
    useState(false);
  const [yGammaFocusPreset, setYGammaFocusPreset] =
    useState<YGammaFocusPreset>("rank-three-cell");
  const [yGammaFocusGenerator, setYGammaFocusGenerator] = useState(0);
  const [yGammaPeelMode, setYGammaPeelMode] =
    useState<YGammaPeelMode>("same-rank-three");
  const [yGammaCellSeparation, setYGammaCellSeparation] =
    useState<YGammaCellSeparation>("readable");
  const [yGammaSeparationValue, setYGammaSeparationValue] =
    useState<YGammaSeparationValue>(50);
  const [yGammaCutawayMode, setYGammaCutawayMode] =
    useState<YGammaCutawayMode>("none");
  const [yGammaRelationStarActive, setYGammaRelationStarActive] =
    useState(false);
  const [yGammaInspectMode, setYGammaInspectMode] =
    useState<YGammaInspectMode>("inspect-cell");
  const [yGammaCameraPath, setYGammaCameraPath] =
    useState<YGammaCameraPath>("none");
  const [yGammaSmallAtlasOpen, setYGammaSmallAtlasOpen] = useState(false);
  const [yGammaCompareDrawing, setYGammaCompareDrawing] = useState(false);
  const [yGammaTopologyMode, setYGammaTopologyMode] = useState(true);
  const [yGammaCameraBookmark, setYGammaCameraBookmark] =
    useState<YGammaCameraBookmark>("rank-three-cell");
  const [gammaLayoutMode, setGammaLayoutMode] =
    useState<DefiningGraphLayoutMode>("3d");
  const [selectedGammaGenerator, setSelectedGammaGenerator] = useState(0);
  const applyYGammaCellSeparation = useCallback(
    (separation: YGammaCellSeparation) => {
      setYGammaCellSeparation(separation);
      setYGammaSeparationValue(yGammaSeparationValueForPreset(separation));
    },
    [],
  );
  const applyYGammaSeparationValue = useCallback(
    (value: YGammaSeparationValue) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setYGammaSeparationValue(clamped);
      setYGammaCellSeparation(yGammaSeparationPresetForValue(clamped));
    },
    [],
  );
  const [hoveredCellId, setHoveredCellId] = useState<string | undefined>();
  const [debouncedRadius, setDebouncedRadius] = useState(radius);
  const [workerGeneration, setWorkerGeneration] = useState<{
    ball: GeneratedCayleyBall | null;
    sphericalSubsets?: SphericalSubsetEnumerationResult;
    datasetId?: string;
    error: string | null;
    pending: boolean;
    requestId: number;
    generationMs?: number;
  }>(initialWorkerGeneration);
  const [yGammaSceneState, setYGammaSceneState] = useState(
    initialYGammaSceneState,
  );
  const [yGammaComparisonSceneState, setYGammaComparisonSceneState] = useState<{
    version: string;
    coherent: YGamma2SkeletonScene;
    expanded: YGamma2SkeletonScene;
  }>();
  const denseAutoAppliedIds = useRef(new Set<string>());
  const [generationClient] = useState(() => createGenerationClient());
  const [localViewCache] = useState(() => createLocalViewCache());
  const [yGammaSceneClient] = useState(() => createYGammaSceneClient());
  const [quotientValidationClient] = useState(() =>
    createQuotientValidationClient(),
  );

  useEffect(() => {
    let cancelled = false;
    void desktopBridge.getStatus().then((status) => {
      if (!cancelled) {
        setDesktopStatus(status);
        if (status.message) {
          setDesktopMessage(status.message);
        }
      }
    });
    const cancelIdle = scheduleIdleTask(
      () => {
        void desktopBridge.detectExternalTools().then((tools) => {
          if (!cancelled) {
            setDesktopTools(tools);
          }
        });
        void desktopBridge.listDesktopJobs().then((jobs) => {
          if (!cancelled) {
            setDesktopJobs(jobs);
          }
        });
      },
      { timeout: 1_500 },
    );
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [desktopBridge]);

  useEffect(() => {
    writeStoredRecentSessions(recentSessions);
  }, [recentSessions]);

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme;
    window.localStorage?.setItem(colorSchemeStorageKey, colorScheme);
  }, [colorScheme]);

  // CSS grid changes, fullscreen transitions, and desktop WebView resizes can
  // settle over more than one frame. Bumping the layout version at staggered
  // times lets Three.js remeasure the canvas without returning to a RAF loop.
  const scheduleSceneLayoutRefresh = useCallback(() => {
    const bump = () => setSceneLayoutSignal((value) => value + 1);
    window.requestAnimationFrame(() => window.requestAnimationFrame(bump));
    window.setTimeout(bump, 80);
    window.setTimeout(bump, 240);
  }, []);

  useEffect(() => {
    scheduleSceneLayoutRefresh();
  }, [scheduleSceneLayoutRefresh, viewerOnly]);

  // Viewer-only mode removes the side rails from layout. Preserve their scroll
  // positions so returning to the full cockpit does not feel like navigation.
  const captureViewerOnlyScrollState = useCallback(() => {
    viewerOnlyScrollSnapshotRef.current = {
      sidebarTop: sidebarRef.current?.scrollTop ?? 0,
      rightRailTop: rightRailRef.current?.scrollTop ?? 0,
      windowX: window.scrollX,
      windowY: window.scrollY,
    };
  }, []);

  const restoreViewerOnlyScrollState = useCallback(() => {
    const snapshot = viewerOnlyScrollSnapshotRef.current;
    const restore = () => {
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = snapshot.sidebarTop;
      }
      if (rightRailRef.current) {
        rightRailRef.current.scrollTop = snapshot.rightRailTop;
      }
      window.scrollTo(snapshot.windowX, snapshot.windowY);
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    window.setTimeout(restore, 80);
    window.setTimeout(restore, 240);
    window.setTimeout(restore, 500);
  }, []);

  const setViewerOnlyMode = useCallback(
    (nextValue: boolean | ((current: boolean) => boolean)) => {
      setViewerOnly((current) => {
        const resolved =
          typeof nextValue === "function" ? nextValue(current) : nextValue;
        if (resolved === current) {
          return current;
        }
        if (resolved) {
          captureViewerOnlyScrollState();
        } else {
          restoreViewerOnlyScrollState();
        }
        return resolved;
      });
    },
    [captureViewerOnlyScrollState, restoreViewerOnlyScrollState],
  );

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = scheduleIdleTask(
      () => {
        void readNotebookBundles().then((bundles) => {
          if (!cancelled && bundles.length > 0) {
            setSavedExperiments(bundles.slice(0, 24));
          }
        });
      },
      { timeout: 1_000 },
    );
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);
  const graphPreset = graphPresets[graphPresetId];

  const examples = useMemo(
    () =>
      importedExample ? [...bundledExamples, importedExample] : bundledExamples,
    [importedExample],
  );
  const visibleEightFacetCatalogue = useMemo(
    () =>
      filterTumarkinEightFacetCatalogue({
        query: eightFacetCatalogueQuery,
        filter: eightFacetCatalogueFilter,
      }),
    [eightFacetCatalogueFilter, eightFacetCatalogueQuery],
  );
  const selectedExample =
    examples.find((example) => example.id === exampleId) ?? examples[0];
  const activeDataset: ViewerDataset = useMemo(
    () =>
      importedDataset ??
      ({
        kind: "coxeter-system",
        id: selectedExample.id,
        label: selectedExample.label,
        system: selectedExample.input,
      } satisfies ViewerDataset),
    [importedDataset, selectedExample],
  );
  const system = useMemo(() => resolveSystem(activeDataset), [activeDataset]);
  const sourceSystem =
    activeDataset.kind === "coxeter-system"
      ? activeDataset.system
      : activeDataset.kind === "quotient-complex"
        ? (activeDataset.sourceSystem ?? activeDataset.quotient.sourceSystem)
        : activeDataset.sourceSystem;
  const hasMathContext = sourceSystem !== undefined;
  const importedSphericalSubsetResult = useMemo(
    () =>
      activeDataset.kind !== "coxeter-system" && sourceSystem
        ? enumerateSphericalSubsets(sourceSystem)
        : undefined,
    [activeDataset.kind, sourceSystem],
  );
  // Browser-generated balls already enumerate spherical subsets in the
  // worker. Reusing that result avoids repeating the same exponential subset
  // search on the UI thread when a compact example is selected.
  const sphericalSubsetResult =
    activeDataset.kind === "coxeter-system"
      ? workerGeneration.datasetId === activeDataset.id
        ? workerGeneration.sphericalSubsets
        : undefined
      : importedSphericalSubsetResult;
  const activeGeneratorPair = useMemo(
    () => parsePairKey(activeGeneratorPairKey),
    [activeGeneratorPairKey],
  );
  const geometryAvailable =
    activeDataset.kind !== "quotient-complex" && hasUsableGeometry(system);
  const effectiveMode: ViewerMode = geometryAvailable ? mode : "shell";
  const selectedExactBackend = exactBackendStubs.find(
    (backend) => backend.name === backendId,
  );
  const generationPending = radius !== debouncedRadius;
  const applyViewPreset = useCallback(
    (preset: ViewPresetId, options: { persist?: boolean } = {}) => {
      const persist = options.persist ?? true;
      setActivePreset(preset);
      if (persist) {
        window.localStorage?.setItem(viewPresetStorageKey, preset);
      }

      switch (preset) {
        case "global":
          setMode("shell");
          setGraphView("global");
          setLabelScope("budgeted");
          setShowNodeLabels(true);
          setShowEdgeLabels(true);
          setShowCells(true);
          break;
        case "local-chamber":
          setMode("shell");
          setGraphView("on-graph");
          setLocalDepth(2);
          setCellRenderMode("in-graph");
          setCellFocusMode("incident-selected");
          setCellNeighborhoodMode("chamber");
          setRelationWalkMode("numbered");
          setOcclusionMode("hide-far");
          setCellOpacity(0.24);
          setPanelOffsetStrength(0.18);
          setBringFocusedCellsForward(true);
          setLabelScope("focused");
          setShowNodeLabels(true);
          setShowEdgeLabels(true);
          setShowCells(true);
          break;
        case "rank-two-cells":
          setMode("shell");
          setGraphView("on-graph");
          setLocalDepth(2);
          setCellRenderMode("in-graph");
          setCellFocusMode("selected-pair");
          setCellNeighborhoodMode("cell-plus-1");
          setRelationWalkMode("numbered");
          setOcclusionMode("fade-far");
          setCellOpacity(0.3);
          setPanelOffsetStrength(0.28);
          setBringFocusedCellsForward(true);
          setLabelScope("focused");
          setShowCells(true);
          setShowHigherCells(true);
          break;
        case "geometric-projection":
          if (geometryAvailable) {
            setMode("geometric");
            setProjection(preferredGeometricProjection(system));
            if ((system.geometry?.dimension ?? 0) > 3) {
              setGraphView("on-graph");
              setLocalDepth(2);
              setCellRenderMode("in-graph");
              setCellFocusMode("incident-selected");
              setCellNeighborhoodMode("chamber");
              setOcclusionMode("hide-far");
              setLabelScope("focused");
            } else {
              setGraphView("global");
              setLabelScope("budgeted");
            }
          } else {
            setMode("shell");
            setGraphView("global");
            setLabelScope("budgeted");
          }
          setShowNodeLabels(true);
          setShowEdgeLabels(true);
          setShowCells(true);
          break;
      }
    },
    [geometryAvailable, system],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedRadius(radius),
      generationDebounceMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [radius]);

  useEffect(
    () => () => {
      generationClient.dispose();
      yGammaSceneClient.dispose();
      quotientValidationClient.dispose();
    },
    [generationClient, quotientValidationClient, yGammaSceneClient],
  );

  useEffect(() => {
    if (activeDataset.kind !== "coxeter-system") {
      return;
    }

    const options = {
      maxRadius: graphPreset.maxRadius,
      maxNodes: graphPreset.maxNodes,
      maxEdges: graphPreset.maxEdges,
      matrixKeyPrecision: graphPreset.matrixKeyPrecision,
      radius: debouncedRadius,
    };
    let cancelled = false;
    const client = generationClient;

    const timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setWorkerGeneration((current) => ({
        ball: current.ball,
        sphericalSubsets:
          current.datasetId === activeDataset.id
            ? current.sphericalSubsets
            : undefined,
        datasetId: activeDataset.id,
        error: null,
        pending: true,
        requestId: current.requestId + 1,
        generationMs: current.generationMs,
      }));

      void client
        .generate({
          datasetId: activeDataset.id,
          system: activeDataset.system,
          options,
        })
        .then((result) => {
          if (cancelled) {
            return;
          }
          setWorkerGeneration({
            ball: result.ball,
            sphericalSubsets: result.sphericalSubsets,
            datasetId: activeDataset.id,
            error: null,
            pending: false,
            requestId: result.requestId,
            generationMs: result.generationMs,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          setWorkerGeneration({
            ball: null,
            sphericalSubsets: undefined,
            datasetId: activeDataset.id,
            error: error instanceof Error ? error.message : String(error),
            pending: false,
            requestId: 0,
            generationMs: undefined,
          });
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    activeDataset,
    debouncedRadius,
    generationClient,
    graphPreset.maxEdges,
    graphPreset.maxNodes,
    graphPreset.maxRadius,
    graphPreset.matrixKeyPrecision,
  ]);
  const generation = useMemo(() => {
    if (activeDataset.kind === "coxeter-system") {
      return workerGeneration;
    }

    return {
      ball: withShellLayout(activeDataset.ball),
      sphericalSubsets: importedSphericalSubsetResult,
      datasetId: activeDataset.id,
      error: null,
      pending: false,
      requestId: 0,
      generationMs: undefined,
    };
  }, [activeDataset, importedSphericalSubsetResult, workerGeneration]);

  // Axis projections do not depend on the selected chamber. Only local PCA
  // refits its basis around the selection, so ordinary picking must not place
  // every hyperbolic point again.
  const geometricSelectionKey = projection.endsWith("-pca")
    ? selectedNodeId
    : undefined;

  const displayed = useMemo(() => {
    if (!generation.ball || effectiveMode !== "geometric") {
      return generation;
    }

    const localPcaCenterNodeId = projection.endsWith("-pca")
      ? generation.ball.nodes.some((node) => node.id === geometricSelectionKey)
        ? geometricSelectionKey
        : generation.ball.nodes[0]?.id
      : undefined;
    const localPcaFitNodeIds =
      projection.endsWith("-pca") &&
      (system.geometry?.dimension ?? 0) > 3 &&
      localPcaCenterNodeId
        ? collectGraphNeighborhood(
            generation.ball.edges,
            localPcaCenterNodeId,
            {
              depth: 2,
            },
          )
        : undefined;
    const placement = placeCayleyNodesInHyperbolicGeometry(
      system,
      generation.ball.nodes,
      {
        projection,
        displayScale: geometricDisplayScale,
        pcaCenterNodeId: localPcaCenterNodeId,
        pcaFitNodeIds: localPcaFitNodeIds,
      },
    );

    return {
      ball: {
        ...generation.ball,
        nodes: placement.nodes,
        metadata: {
          ...generation.ball.metadata,
          warnings: [
            ...generation.ball.metadata.warnings,
            ...placement.warnings,
          ],
        },
      },
      error: placement.ok ? null : placement.warnings.join(" "),
    };
  }, [effectiveMode, generation, geometricSelectionKey, projection, system]);

  const ball = displayed.ball;
  const ballIdentity = useMemo(
    () => (ball ? generatedBallIdentity(ball) : "no-ball"),
    [ball],
  );
  const ballIndexes = useMemo(() => {
    const nodesById = new Map<string, GeneratedCayleyBall["nodes"][number]>();
    const twoCellsById = new Map<string, DavisTwoCell>();
    const higherCellsById = new Map<string, DavisHigherCell>();
    for (const node of ball?.nodes ?? []) {
      nodesById.set(node.id, node);
    }
    for (const cell of ball?.twoCells ?? []) {
      twoCellsById.set(cell.id, cell);
    }
    for (const cell of ball?.higherCells ?? []) {
      higherCellsById.set(cell.id, cell);
      higherCellsById.set(`proxy:${cell.id}`, cell);
    }
    return { nodesById, twoCellsById, higherCellsById };
  }, [ball]);
  const selectedNode =
    ballIndexes.nodesById.get(selectedNodeId) ?? ball?.nodes[0];
  const selectedRankTwoCell =
    selectedCellId !== undefined
      ? ballIndexes.twoCellsById.get(selectedCellId)
      : undefined;
  const focusedRankTwoCell = useMemo(
    () =>
      chooseFocusedRankTwoCell({
        cells: ball?.twoCells ?? [],
        selectedCell: selectedRankTwoCell,
        activePairKey: activeGeneratorPairKey,
        selectedNodeId: selectedNode?.id,
      }),
    [
      activeGeneratorPairKey,
      ball?.twoCells,
      selectedNode?.id,
      selectedRankTwoCell,
    ],
  );
  const activeQuotient =
    activeDataset.kind === "quotient-complex"
      ? activeDataset.quotient
      : undefined;
  const activeIsJnwStateQuotient = isJnwStateQuotient(activeQuotient);
  const activeQuotientRank =
    activeQuotient?.sourceSystem?.rank ??
    activeQuotient?.generatorRank ??
    (activeQuotient
      ? Math.max(
          1,
          Math.max(-1, ...activeQuotient.edges.map((edge) => edge.generator)) +
            1,
        )
      : undefined);
  const activeQuotientGenerators =
    activeQuotient?.sourceSystem?.generators ?? system.generators;
  const jnwSourceSystem =
    activeQuotient?.sourceSystem ?? sourceSystem ?? system;
  const jnwSourceKey = `${jnwSourceSystem.name}:${jnwSourceSystem.rank}`;
  const defaultJnwMoveSystem = useMemo(
    () => defaultJnwMoveSystemForSystem(jnwSourceSystem),
    [jnwSourceSystem],
  );
  const defaultJnwInitialState = useMemo(
    () => defaultJnwInitialStateForSystem(jnwSourceSystem),
    [jnwSourceSystem],
  );
  const activeJnwMoveSystem =
    jnwDraft?.sourceKey === jnwSourceKey
      ? jnwDraft.moveSystem
      : defaultJnwMoveSystem;
  const activeJnwInitialState =
    jnwDraft?.sourceKey === jnwSourceKey
      ? jnwDraft.initialState
      : defaultJnwInitialState;
  const jnwComputationActive =
    gameWorkflowKind === "jnw-legal-system" || activeIsJnwStateQuotient;
  const jnwSummary = useMemo(
    () =>
      jnwComputationActive
        ? summarizeJnwLegalSystem(
            jnwSourceSystem,
            activeJnwMoveSystem,
            activeJnwInitialState,
          )
        : undefined,
    [
      activeJnwInitialState,
      activeJnwMoveSystem,
      jnwComputationActive,
      jnwSourceSystem,
    ],
  );
  const jnwDerivedQuotient = useMemo(
    () =>
      jnwSummary
        ? jnwOrbitToQuotientComplex(jnwSourceSystem, jnwSummary)
        : undefined,
    [jnwSourceSystem, jnwSummary],
  );
  const activeJnwSelectedState = useMemo(() => {
    if (!jnwSummary) {
      return undefined;
    }
    const preferredStateId =
      selectedJnwStateId ??
      (activeIsJnwStateQuotient && selectedNode?.id
        ? selectedNode.id
        : activeJnwInitialState.id);
    return (
      jnwSummary.states.find((state) => state.id === preferredStateId) ??
      jnwSummary.states.find(
        (state) => state.id === activeJnwInitialState.id,
      ) ??
      jnwSummary.states[0]
    );
  }, [
    activeIsJnwStateQuotient,
    activeJnwInitialState.id,
    jnwSummary,
    selectedNode,
    selectedJnwStateId,
  ]);
  const activeJnwLayerBreadcrumb = useMemo(
    () =>
      gameWorkflowKind === "jnw-legal-system" &&
      activeJnwSelectedState &&
      jnwSummary
        ? buildJnwLayerBreadcrumb(
            jnwSourceSystem,
            activeJnwSelectedState,
            topologyLensLabel(topologyLens.id),
            jnwSummary,
          )
        : undefined,
    [
      activeJnwSelectedState,
      gameWorkflowKind,
      jnwSourceSystem,
      jnwSummary,
      topologyLens.id,
    ],
  );
  const importedGameAssignment = useMemo(
    () => activeIntegerGameAssignment(activeQuotient?.game),
    [activeQuotient?.game],
  );
  const initialEditableGameAssignment = useMemo(
    () =>
      activeQuotient
        ? editableGameAssignmentFromQuotient(activeQuotient)
        : undefined,
    [activeQuotient],
  );
  const gameDraftAssignment =
    gameDraft?.datasetId === activeDataset.id
      ? gameDraft.assignment
      : undefined;
  const gameUsesEditableAssignment =
    Boolean(gameDraftAssignment) ||
    importedGameAssignment === undefined ||
    importedGameAssignment.kind === "integer-generator-labeling";
  const activeEditableGameAssignment =
    gameDraftAssignment ?? initialEditableGameAssignment;
  const effectiveQuotientGame = useMemo(
    () =>
      activeQuotient &&
      activeEditableGameAssignment &&
      gameUsesEditableAssignment
        ? gameDataWithEditableAssignment(
            activeQuotient.game,
            activeEditableGameAssignment,
          )
        : activeQuotient?.game,
    [activeEditableGameAssignment, activeQuotient, gameUsesEditableAssignment],
  );
  const effectiveGameAssignment =
    gameUsesEditableAssignment && activeEditableGameAssignment
      ? activeEditableGameAssignment
      : importedGameAssignment;
  const quotientAssignment = useMemo(
    () =>
      activeQuotient
        ? resolveIntegerEdgeAssignment(
            effectiveQuotientGame,
            activeQuotient.edges,
            activeQuotientRank,
          )
        : undefined,
    [activeQuotient, activeQuotientRank, effectiveQuotientGame],
  );
  const quotientInvariantGameSummary = useMemo(
    () =>
      activeQuotient
        ? summarizeCocycle(
            activeQuotient.twoCells,
            activeQuotient.edges,
            effectiveGameAssignment,
            undefined,
            {
              rank: activeQuotientRank,
              generators: activeQuotientGenerators,
              cocycleId: effectiveQuotientGame?.activeCocycleId,
            },
          )
        : undefined,
    [
      activeQuotient,
      activeQuotientGenerators,
      activeQuotientRank,
      effectiveGameAssignment,
      effectiveQuotientGame?.activeCocycleId,
    ],
  );
  const quotientIncidentFlows = useMemo(
    () =>
      activeQuotient && quotientAssignment && selectedNode?.id
        ? classifyIncidentEdges(
            selectedNode.id,
            activeQuotient.edges,
            quotientAssignment.edgeStates,
          )
        : [],
    [activeQuotient, quotientAssignment, selectedNode],
  );
  const quotientGameSummary = useMemo(
    () =>
      quotientInvariantGameSummary
        ? {
            ...quotientInvariantGameSummary,
            flows: quotientIncidentFlows,
          }
        : undefined,
    [quotientIncidentFlows, quotientInvariantGameSummary],
  );
  const quotientFlowByEdgeId = useMemo(
    () => new Map(quotientIncidentFlows.map((flow) => [flow.edgeId, flow])),
    [quotientIncidentFlows],
  );
  const quotientGeneratorValueById = useMemo(
    () =>
      new Map(
        quotientGameSummary?.generatorValues.map((state) => [
          state.generator,
          state.value,
        ]) ?? [],
      ),
    [quotientGameSummary?.generatorValues],
  );
  const quotientLensSceneIds = useMemo(() => {
    if (!activeQuotient || !isQuotientLinkLens(topologyLens.id)) {
      return undefined;
    }

    const selectedVertexId = selectedNode?.id ?? activeQuotient.vertices[0]?.id;
    if (!selectedVertexId) {
      return undefined;
    }

    const focusFlows =
      topologyLens.id === "full-local-link"
        ? quotientIncidentFlows
        : quotientIncidentFlows.filter(
            (flow) =>
              flow.classification === topologyLens.id.replace("-link", ""),
          );
    const focusEdgeIds = new Set(focusFlows.map((flow) => flow.edgeId));
    const edgeIds = new Set(quotientIncidentFlows.map((flow) => flow.edgeId));
    const nodeIds = new Set<string>([selectedVertexId]);
    quotientIncidentFlows.forEach((flow) => nodeIds.add(flow.neighborId));
    return { nodeIds, edgeIds, focusEdgeIds };
  }, [
    activeQuotient,
    quotientIncidentFlows,
    selectedNode?.id,
    topologyLens.id,
  ]);
  const localLayoutDepth = useMemo(() => {
    if (!focusedRankTwoCell || cellNeighborhoodMode === "chamber") {
      return localDepth;
    }
    const boundaryDepth = Math.ceil(
      focusedRankTwoCell.boundaryNodeIds.length / 2,
    );
    const contextDepth =
      cellNeighborhoodMode === "cell-plus-2"
        ? 2
        : cellNeighborhoodMode === "cell-plus-1"
          ? 1
          : 0;
    return Math.max(localDepth, boundaryDepth + contextDepth);
  }, [cellNeighborhoodMode, focusedRankTwoCell, localDepth]);
  const localLayout = useMemo(
    () =>
      graphView === "on-graph" && ball && selectedNode
        ? localViewCache.localChamber3DLayout({
            ball,
            centerNodeId: selectedNode.id,
            options: {
              depth: localLayoutDepth,
              generatorCount: system.rank,
            },
          })
        : undefined,
    [
      ball,
      graphView,
      localLayoutDepth,
      localViewCache,
      selectedNode,
      system.rank,
    ],
  );
  const chamberNodeIds = useMemo(() => {
    if (graphView !== "on-graph" || !localLayout) {
      return undefined;
    }
    if (occlusionMode !== "hide-far") {
      return localLayout.nodeIds;
    }
    const maxVisibleDepth = Math.min(localDepth, 2);
    return new Set(
      [...localLayout.distances.entries()]
        .filter(([, distance]) => distance <= maxVisibleDepth)
        .map(([nodeId]) => nodeId),
    );
  }, [graphView, localDepth, localLayout, occlusionMode]);
  const focusedCellNodeIds = useMemo(
    () =>
      graphView === "on-graph"
        ? localViewCache.cellNeighborhoodNodeIds({
            ball: ball ?? undefined,
            cell: focusedRankTwoCell,
            mode: cellNeighborhoodMode,
          })
        : undefined,
    [ball, cellNeighborhoodMode, focusedRankTwoCell, graphView, localViewCache],
  );
  const localNodeIds = useMemo(() => {
    if (graphView !== "on-graph") {
      return undefined;
    }
    if (!focusedCellNodeIds) {
      return chamberNodeIds;
    }
    if (cellNeighborhoodMode === "cell-boundary") {
      return focusedCellNodeIds;
    }
    return mergeSets(chamberNodeIds, focusedCellNodeIds);
  }, [cellNeighborhoodMode, chamberNodeIds, focusedCellNodeIds, graphView]);
  const sceneNodeIdSet = useMemo(
    () =>
      quotientLensSceneIds?.nodeIds ??
      localNodeIds ??
      new Set((ball?.nodes ?? []).map((node) => node.id)),
    [ball, localNodeIds, quotientLensSceneIds],
  );
  const viewNodes = useMemo(
    () => (ball?.nodes ?? []).filter((node) => sceneNodeIdSet.has(node.id)),
    [ball, sceneNodeIdSet],
  );
  const viewEdges = useMemo(
    () =>
      (ball?.edges ?? []).filter(
        (edge) =>
          (quotientLensSceneIds === undefined ||
            quotientLensSceneIds.edgeIds.has(edge.id)) &&
          sceneNodeIdSet.has(edge.source) &&
          sceneNodeIdSet.has(edge.target),
      ),
    [ball, quotientLensSceneIds, sceneNodeIdSet],
  );
  const viewRankTwoCells = useMemo(
    () =>
      (ball?.twoCells ?? []).filter((cell) =>
        cell.boundaryNodeIds.every((nodeId) => sceneNodeIdSet.has(nodeId)),
      ),
    [ball, sceneNodeIdSet],
  );
  const localLink = useMemo(
    () =>
      sourceSystem && sphericalSubsetResult
        ? buildLocalLinkFromSphericalSubsets(
            sourceSystem,
            selectedNode?.id ?? "e",
            sphericalSubsetResult,
          )
        : emptyLocalLink(selectedNode?.id ?? "e"),
    [selectedNode?.id, sourceSystem, sphericalSubsetResult],
  );
  const localLinkHomology = useMemo(
    () => (hasMathContext ? computeLocalLinkHomology(localLink) : undefined),
    [hasMathContext, localLink],
  );
  const sphericalCellProxies = useMemo(() => {
    if (!ball || !hasMathContext || !sphericalSubsetResult) {
      return { proxies: [], warnings: [] };
    }
    return computeSphericalCellProxies(ball, sphericalSubsetResult.subsets, {
      maxProxies: graphPreset.maxProxies,
    });
  }, [ball, graphPreset.maxProxies, hasMathContext, sphericalSubsetResult]);
  const davisIncidence = useMemo(() => {
    if (!ball || !hasMathContext || !sphericalSubsetResult) {
      return undefined;
    }
    return (
      ball.davisIncidence ??
      deriveDavisIncidencePoset(ball, sphericalSubsetResult.subsets)
    );
  }, [ball, hasMathContext, sphericalSubsetResult]);
  const topologyDiagnostics = useMemo(() => {
    if (!hasMathContext || !sphericalSubsetResult) {
      return undefined;
    }
    const complex = createFiniteSimplicialComplex({
      vertices: system.generators.map((generator) => generator.label),
      simplices: sphericalSubsetResult.subsets.map((subset) =>
        subset.generators.map(
          (generator) => system.generators[generator]?.label ?? `s${generator}`,
        ),
      ),
    });
    return summarizeTopologyDiagnostics(complex, {
      maxCliqueSize: Math.min(4, system.rank),
    });
  }, [hasMathContext, sphericalSubsetResult, system.generators, system.rank]);
  const yGammaAtlas = useMemo(
    () =>
      sourceSystem
        ? buildYGammaCellAtlas(sourceSystem, sphericalSubsetResult)
        : undefined,
    [sourceSystem, sphericalSubsetResult],
  );
  const highlightedGammaJnwState = useMemo(() => {
    const requestedStateId = gammaHighlightedJnwStateId ?? selectedJnwStateId;
    if (
      gameWorkflowKind !== "jnw-legal-system" ||
      !requestedStateId ||
      !jnwSummary
    ) {
      return undefined;
    }
    return jnwSummary.states.find((state) => state.id === requestedStateId);
  }, [
    gameWorkflowKind,
    gammaHighlightedJnwStateId,
    jnwSummary,
    selectedJnwStateId,
  ]);
  const activeGammaGenerator =
    sourceSystem &&
    selectedGammaGenerator >= 0 &&
    selectedGammaGenerator < sourceSystem.rank
      ? selectedGammaGenerator
      : 0;
  const gammaDefiningGraphScene = useMemo(
    () =>
      sourceSystem
        ? buildDefiningGraphScene(sourceSystem, {
            layoutMode: gammaLayoutMode,
            highlightedGenerators: highlightedGammaJnwState?.generators,
            highlightLabel:
              highlightedGammaJnwState !== undefined && jnwSummary
                ? formatJnwStateName(jnwSummary, highlightedGammaJnwState)
                : undefined,
            highlightColor:
              highlightedGammaJnwState !== undefined && jnwSummary
                ? jnwStateChartColor(jnwSummary, highlightedGammaJnwState.id)
                : undefined,
          })
        : undefined,
    [gammaLayoutMode, highlightedGammaJnwState, jnwSummary, sourceSystem],
  );
  const selectedGammaIncidence =
    gammaDefiningGraphScene?.incidencePartitions[activeGammaGenerator];
  const yGammaRankThreeFocus = useMemo(
    () =>
      yGammaAtlas
        ? findRankThreeFocusContainingPair(yGammaAtlas, activeGeneratorPairKey)
        : undefined,
    [activeGeneratorPairKey, yGammaAtlas],
  );
  const yGammaRankThreeFocusPairs = useMemo(
    () =>
      yGammaAtlas
        ? rankThreeFocusPairOptions(yGammaAtlas, yGammaRankThreeFocus)
        : [],
    [yGammaAtlas, yGammaRankThreeFocus],
  );
  const activeIsYGammaBaseComplex =
    activeDataset.kind === "quotient-complex" &&
    isYGammaBaseComplex(activeDataset.quotient);
  const yGammaDense =
    activeIsYGammaBaseComplex && (yGammaAtlas?.generatorCount ?? 0) >= 7;
  const showReaderControls = uiMode === "teaching" && !showAdvancedPanels;
  const showResearchControls = uiMode === "research" || showAdvancedPanels;
  const showDetailedControls =
    !showReaderControls && (!activeIsYGammaBaseComplex || showAdvancedPanels);
  const yGammaRelationOrderFilter =
    yGammaFocusPreset === "m2-squares"
      ? 2
      : yGammaFocusPreset === "m3-hexagons"
        ? 3
        : undefined;
  const yGammaActiveRelationOrder = useMemo(() => {
    if (!yGammaAtlas || !activeGeneratorPairKey) {
      return yGammaRelationOrderFilter;
    }
    const cell = yGammaAtlas.rankTwoCells.find(
      (entry) =>
        relationCellPairKey(entry.generators) === activeGeneratorPairKey,
    );
    return cell?.m ?? yGammaRelationOrderFilter;
  }, [activeGeneratorPairKey, yGammaAtlas, yGammaRelationOrderFilter]);
  const yGammaEffectiveFocusGenerator =
    yGammaFocusPreset === "around-generator" ? yGammaFocusGenerator : undefined;
  const yGammaFaceMode = yGammaRankThreeFocusEnabled
    ? yGammaPeelMode === "selected-face"
      ? "active-pair"
      : "all"
    : yGammaRelationStarActive
      ? "all"
      : yGammaFocusPreset === "one-relation"
        ? "active-pair"
        : yGammaShowAllFaces ||
            !yGammaDense ||
            yGammaFocusPreset === "full-skeleton" ||
            yGammaFocusPreset === "around-generator" ||
            yGammaRelationOrderFilter !== undefined
          ? "all"
          : activeGeneratorPairKey
            ? "active-pair"
            : "one-skeleton";
  const yGammaIncludeRankThreeCells =
    showHigherCells &&
    (yGammaRelationStarActive ||
      yGammaRankThreeFocusEnabled ||
      yGammaFocusPreset !== "one-relation");
  const yGammaCutawayOptions = useMemo(
    () => ({
      mode: yGammaCutawayMode,
      generator: yGammaFocusGenerator,
      relationOrder:
        yGammaCutawayMode === "relation-order"
          ? yGammaActiveRelationOrder
          : yGammaRelationOrderFilter,
      rank: yGammaCutawayMode === "rank" ? 3 : undefined,
    }),
    [
      yGammaActiveRelationOrder,
      yGammaCutawayMode,
      yGammaFocusGenerator,
      yGammaRelationOrderFilter,
    ],
  );
  const effectiveYGammaRankThreeFocus = useMemo(
    () =>
      yGammaRankThreeFocusEnabled && yGammaRankThreeFocus
        ? {
            ...yGammaRankThreeFocus,
            restrictGeneratorSpine: false,
            showOnlyFundamentalFaces: false,
          }
        : undefined,
    [yGammaRankThreeFocus, yGammaRankThreeFocusEnabled],
  );
  const yGammaSceneOptions = useMemo<YGamma2SkeletonSceneOptions>(
    () => ({
      activeGeneratorPairKey,
      faceMode: yGammaFaceMode,
      includeRankThreeCells: yGammaIncludeRankThreeCells,
      rankThreeFocus: effectiveYGammaRankThreeFocus,
      focusGenerator: yGammaEffectiveFocusGenerator,
      relationOrderFilter: yGammaRelationOrderFilter,
      peelMode: yGammaPeelMode,
      cellSeparation: yGammaCellSeparation,
      separationValue: yGammaSeparationValue,
      cutaway: yGammaCutawayOptions,
      relationStar: {
        active: yGammaRelationStarActive,
        pairKey: activeGeneratorPairKey,
      },
      layoutScale:
        yGammaDense &&
        yGammaFaceMode === "all" &&
        !effectiveYGammaRankThreeFocus
          ? "expansive"
          : "normal",
    }),
    [
      activeGeneratorPairKey,
      effectiveYGammaRankThreeFocus,
      yGammaEffectiveFocusGenerator,
      yGammaDense,
      yGammaCellSeparation,
      yGammaSeparationValue,
      yGammaCutawayOptions,
      yGammaFaceMode,
      yGammaIncludeRankThreeCells,
      yGammaPeelMode,
      yGammaRelationOrderFilter,
      yGammaRelationStarActive,
    ],
  );
  const yGammaActiveStarLens = useMemo<YGammaStarLens | undefined>(() => {
    if (yGammaRelationStarActive) {
      return "relation-star";
    }
    if (yGammaRankThreeFocusEnabled) {
      return "rank-three-cell-star";
    }
    if (yGammaFocusPreset === "around-generator") {
      return "generator-star";
    }
    if (
      topologyLens.id === "ascending-link" ||
      topologyLens.id === "descending-link"
    ) {
      return topologyLens.id === "ascending-link"
        ? "jnw-ascending-star"
        : "jnw-descending-star";
    }
    return undefined;
  }, [
    topologyLens.id,
    yGammaFocusPreset,
    yGammaRankThreeFocusEnabled,
    yGammaRelationStarActive,
  ]);
  const yGammaReadableViewState = useMemo<YGammaReadableViewState>(
    () => ({
      cutawayMode: yGammaCutawayMode,
      relationStarActive: yGammaRelationStarActive,
      starLens: yGammaActiveStarLens,
      separationValue: yGammaSeparationValue,
      inspectMode: yGammaInspectMode,
      cameraPath: yGammaCameraPath,
      smallAtlasOpen: yGammaSmallAtlasOpen,
      compareDrawing: yGammaCompareDrawing,
    }),
    [
      yGammaActiveStarLens,
      yGammaCameraPath,
      yGammaCompareDrawing,
      yGammaCutawayMode,
      yGammaInspectMode,
      yGammaRelationStarActive,
      yGammaSeparationValue,
      yGammaSmallAtlasOpen,
    ],
  );
  const requestedYGammaSceneVersion = useMemo(
    () =>
      activeIsYGammaBaseComplex && yGammaAtlas
        ? yGammaSceneClient.sceneVersionFor({
            atlas: yGammaAtlas,
            options: yGammaSceneOptions,
          })
        : undefined,
    [
      activeIsYGammaBaseComplex,
      yGammaAtlas,
      yGammaSceneClient,
      yGammaSceneOptions,
    ],
  );
  const requestedYGammaAtlasVersion = useMemo(
    () =>
      activeIsYGammaBaseComplex && yGammaAtlas
        ? yGammaSceneClient.atlasVersionFor({
            atlas: yGammaAtlas,
            options: yGammaSceneOptions,
          })
        : undefined,
    [
      activeIsYGammaBaseComplex,
      yGammaAtlas,
      yGammaSceneClient,
      yGammaSceneOptions,
    ],
  );

  useEffect(() => {
    if (
      !activeIsYGammaBaseComplex ||
      !yGammaAtlas ||
      !requestedYGammaSceneVersion ||
      !requestedYGammaAtlasVersion
    ) {
      return;
    }

    let cancelled = false;
    const client = yGammaSceneClient;
    const pendingTimeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setYGammaSceneState((current) =>
        (current.sceneVersion === requestedYGammaSceneVersion &&
          current.scene) ||
        current.pendingSceneVersion === requestedYGammaSceneVersion
          ? current
          : {
              ...current,
              pending: true,
              error: null,
              pendingSceneVersion: requestedYGammaSceneVersion,
            },
      );
    }, 48);

    void client
      .build({ atlas: yGammaAtlas, options: yGammaSceneOptions })
      .then((result) => {
        if (cancelled || result.sceneVersion !== requestedYGammaSceneVersion) {
          return;
        }
        window.clearTimeout(pendingTimeoutId);
        setYGammaSceneState({
          scene: result.scene,
          atlasVersion: requestedYGammaAtlasVersion,
          sceneVersion: result.sceneVersion,
          pendingSceneVersion: undefined,
          pending: false,
          error: null,
          buildMs: result.buildMs,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        window.clearTimeout(pendingTimeoutId);
        setYGammaSceneState((current) => ({
          ...current,
          pendingSceneVersion:
            current.pendingSceneVersion === requestedYGammaSceneVersion
              ? undefined
              : current.pendingSceneVersion,
          pending: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      });

    return () => {
      cancelled = true;
      window.clearTimeout(pendingTimeoutId);
    };
  }, [
    activeIsYGammaBaseComplex,
    requestedYGammaAtlasVersion,
    requestedYGammaSceneVersion,
    yGammaAtlas,
    yGammaSceneClient,
    yGammaSceneOptions,
  ]);

  const yGamma2SkeletonScene =
    yGammaSceneState.atlasVersion === requestedYGammaAtlasVersion
      ? yGammaSceneState.scene
      : undefined;
  const showingYGammaComplex =
    activeIsYGammaBaseComplex &&
    yGamma2SkeletonScene !== undefined &&
    yGammaMainView === "complex";
  const showingGammaDefiningGraph =
    gammaDefiningGraphScene !== undefined && yGammaMainView === "gamma";
  const showingYGammaNerve =
    activeIsYGammaBaseComplex &&
    yGammaAtlas !== undefined &&
    yGammaMainView === "nerve";
  const showGenerationControls =
    showResearchControls &&
    activeDataset.kind === "coxeter-system" &&
    !activeIsYGammaBaseComplex &&
    !showingGammaDefiningGraph &&
    effectiveMode !== "geometric";
  const showingDerivedScene = showingYGammaComplex || showingGammaDefiningGraph;
  const forceStateQuotientLabels = activeIsJnwStateQuotient;
  const selectedHigherProxy = sphericalCellProxies.proxies.find(
    (proxy) =>
      proxy.id === selectedCellId || proxy.sourceCellId === selectedCellId,
  );
  const selectedHigherCell =
    selectedCellId !== undefined
      ? ballIndexes.higherCellsById.get(selectedCellId)
      : undefined;
  const pairOptions = useMemo(
    () =>
      rankTwoPairDiagnostics({
        allCells: ball?.twoCells ?? [],
        visibleCells: viewRankTwoCells,
        sceneNodeIds: sceneNodeIdSet,
        system,
        localDistances: localLayout?.distances,
      }),
    [
      ball?.twoCells,
      localLayout?.distances,
      sceneNodeIdSet,
      system,
      viewRankTwoCells,
    ],
  );
  const higherSubsetOptions = useMemo(
    () =>
      higherCellSubsetOptions(
        sphericalCellProxies.proxies,
        sphericalSubsetResult?.subsets ?? [],
      ),
    [sphericalSubsetResult, sphericalCellProxies.proxies],
  );
  const budgetedCells = useMemo(
    () =>
      budgetVisibleCells(
        viewRankTwoCells.filter(
          (cell) =>
            showCells &&
            !disabledPairs.has(pairKey(cell.generatorPair)) &&
            cellMatchesFocus(
              cell,
              cellFocusMode,
              selectedNode?.id,
              activeGeneratorPairKey,
              focusedRankTwoCell?.id,
            ),
        ),
        selectedNode?.id,
        graphPreset.maxCells,
        activeGeneratorPairKey,
        sceneNodeIdSet,
      ),
    [
      activeGeneratorPairKey,
      cellFocusMode,
      disabledPairs,
      focusedRankTwoCell?.id,
      graphPreset.maxCells,
      sceneNodeIdSet,
      selectedNode?.id,
      showCells,
      viewRankTwoCells,
    ],
  );
  const visibleCells = budgetedCells.cells;
  const visibleHigherProxies = useMemo(
    () =>
      showHigherCells
        ? sphericalCellProxies.proxies.filter(
            (proxy) =>
              !disabledHigherSubsets.has(proxy.sphericalSubsetId) &&
              proxy.nodeIds.every((nodeId) => sceneNodeIdSet.has(nodeId)),
          )
        : [],
    [
      disabledHigherSubsets,
      sceneNodeIdSet,
      showHigherCells,
      sphericalCellProxies.proxies,
    ],
  );
  const sceneCells = useMemo(
    () => [
      ...visibleCells.map((cell) => ({
        ...cell,
        isRelationBoundary: cell.id === focusedRankTwoCell?.id,
        localDistance: maxBoundaryDistance(cell.boundaryNodeIds, localLayout),
      })),
      ...visibleHigherProxies.map((proxy) => ({
        id: proxy.id,
        generatorPair: [proxy.generators[0], proxy.generators[1]] as [
          number,
          number,
        ],
        boundaryNodeIds: proxy.nodeIds,
        localDistance: maxBoundaryDistance(proxy.nodeIds, localLayout),
      })),
    ],
    [focusedRankTwoCell?.id, localLayout, visibleCells, visibleHigherProxies],
  );
  const generatorSteps = useMemo(
    () =>
      localViewCache.generatorStepOptions({
        edges: ball?.edges ?? [],
        selectedNodeId: selectedNode?.id,
        generators: system.generators,
        ballIdentity,
      }),
    [
      ball?.edges,
      ballIdentity,
      localViewCache,
      selectedNode?.id,
      system.generators,
    ],
  );
  const breadcrumb = useMemo(
    () =>
      localViewCache.wordBreadcrumb({
        nodes: ball?.nodes ?? [],
        selectedNode,
        generators: system.generators,
        ballIdentity,
      }),
    [
      ball?.nodes,
      ballIdentity,
      localViewCache,
      selectedNode,
      system.generators,
    ],
  );
  const relationWalk = useMemo(
    () =>
      relationWalkMode === "numbered"
        ? relationWalkEntries({
            cell: focusedRankTwoCell,
            nodes: ball?.nodes ?? [],
            edges: ball?.edges ?? [],
            generators: system.generators,
          })
        : [],
    [
      ball?.edges,
      ball?.nodes,
      focusedRankTwoCell,
      relationWalkMode,
      system.generators,
    ],
  );
  const relationLabelByNodeId = useMemo(
    () => new Map(relationWalk.map((entry) => [entry.nodeId, entry.label])),
    [relationWalk],
  );
  const relationBoundaryNodeIds = useMemo(
    () => new Set(relationWalk.map((entry) => entry.nodeId)),
    [relationWalk],
  );
  const relationBoundaryEdgeIds = useMemo(
    () => cellBoundaryEdgeKeys(ball?.edges ?? [], focusedRankTwoCell),
    [ball?.edges, focusedRankTwoCell],
  );
  const focusedCellCameraTarget = useMemo(() => {
    if (!focusedRankTwoCell || graphView !== "on-graph" || !localLayout) {
      return undefined;
    }
    const positions = focusedRankTwoCell.boundaryNodeIds
      .map((nodeId) => localLayout.positions.get(nodeId))
      .filter(
        (position): position is [number, number, number] =>
          position !== undefined,
      );
    if (positions.length === 0) {
      return undefined;
    }
    return centroid3(positions);
  }, [focusedRankTwoCell, graphView, localLayout]);
  const yGammaCameraFocus = useMemo(() => {
    if (!showingYGammaComplex || !yGamma2SkeletonScene) {
      return undefined;
    }
    const positionsByNodeId = new Map(
      yGamma2SkeletonScene.nodes.map((node) => [node.id, node.position]),
    );
    const activePairFaces = activeGeneratorPairKey
      ? yGamma2SkeletonScene.cells.filter(
          (cell) => pairKey(cell.generatorPair) === activeGeneratorPairKey,
        )
      : [];
    const rankThreeFaces =
      yGammaRankThreeFocus && yGammaRankThreeFocusEnabled
        ? yGamma2SkeletonScene.cells.filter(
            (cell) => cell.sourceCellId === yGammaRankThreeFocus.cellId,
          )
        : [];
    const focusCells =
      yGammaCameraBookmark === "rank-three-cell" && rankThreeFaces.length > 0
        ? rankThreeFaces
        : activePairFaces.length > 0
          ? activePairFaces
          : yGamma2SkeletonScene.cells;
    const positions = focusCells
      .flatMap((cell) => cell.boundaryNodeIds)
      .map((nodeId) => positionsByNodeId.get(nodeId))
      .filter(
        (position): position is [number, number, number] =>
          position !== undefined,
      );
    const target = centroid3(positions);
    if (!target) {
      return undefined;
    }

    const offset = yGammaCameraOffsetForFocus(
      yGammaCameraBookmark,
      focusCells,
      positionsByNodeId,
    );
    return { target, offset };
  }, [
    activeGeneratorPairKey,
    showingYGammaComplex,
    yGamma2SkeletonScene,
    yGammaCameraBookmark,
    yGammaRankThreeFocus,
    yGammaRankThreeFocusEnabled,
  ]);
  const denseExample = system.rank >= 7 || (ball?.nodes.length ?? 0) > 500;
  const sceneNodes = useMemo(() => {
    const viewRootNodeId =
      graphView === "on-graph" ? selectedNode?.id : rootNodeId;
    const rootPosition = ball?.nodes.find(
      (node) => node.id === viewRootNodeId,
    )?.position;

    return viewNodes.map((node, index) => {
      const position: [number, number, number] | undefined =
        graphView === "on-graph"
          ? effectiveMode === "geometric"
            ? node.position
            : localLayout?.positions.get(node.id)
          : effectiveMode !== "geometric" && node.position && rootPosition
            ? [
                node.position[0] - rootPosition[0],
                node.position[1] - rootPosition[1],
                node.position[2] - rootPosition[2],
              ]
            : node.position;
      const wordLabel = compactWordLabel(node.word, system.generators);
      const nodeLabel = relationLabelByNodeId.get(node.id) ?? node.label;
      const compactNodeLabel =
        relationLabelByNodeId.get(node.id) ?? node.compactLabel ?? node.label;
      const isJnwStateNode =
        activeIsJnwStateQuotient && node.id.startsWith("jnw:state:");

      return {
        ...node,
        label: nodeLabel ?? wordLabel,
        compactLabel: compactNodeLabel ?? wordLabel,
        isRelationBoundary: relationBoundaryNodeIds.has(node.id),
        alwaysLabel: isJnwStateNode || undefined,
        labelPriority: isJnwStateNode ? 120_000 - index : undefined,
        ghost:
          cellNeighborhoodMode !== "chamber" &&
          focusedRankTwoCell !== undefined &&
          !relationBoundaryNodeIds.has(node.id),
        localDistance: localLayout?.distances.get(node.id),
        position,
      };
    });
  }, [
    activeIsJnwStateQuotient,
    ball,
    cellNeighborhoodMode,
    effectiveMode,
    focusedRankTwoCell,
    graphView,
    localLayout,
    relationBoundaryNodeIds,
    relationLabelByNodeId,
    rootNodeId,
    selectedNode?.id,
    system.generators,
    viewNodes,
  ]);
  const sceneEdges = useMemo(
    () =>
      viewEdges.map((edge) => ({
        ...edge,
        compactLabel:
          system.generators[edge.generator]?.label ?? `s${edge.generator}`,
        isRelationBoundary: relationBoundaryEdgeIds.has(edge.id),
        ghost:
          cellNeighborhoodMode !== "chamber" &&
          focusedRankTwoCell !== undefined &&
          !relationBoundaryEdgeIds.has(edge.id),
      })),
    [
      cellNeighborhoodMode,
      focusedRankTwoCell,
      relationBoundaryEdgeIds,
      system.generators,
      viewEdges,
    ],
  );
  const jnwStateYGammaOrbitScene = useMemo(() => {
    if (
      !activeIsJnwStateQuotient ||
      (topologyLens.id !== "state-quotient-orbit" &&
        !isQuotientLinkLens(topologyLens.id)) ||
      !yGammaAtlas ||
      !jnwSummary
    ) {
      return undefined;
    }
    const effectiveReaderLens = jnwReaderLensForTopologyLens(
      topologyLens.id,
      jnwReaderLens,
    );
    if (
      effectiveReaderLens === "ascending-link" ||
      effectiveReaderLens === "descending-link" ||
      effectiveReaderLens === "level-link" ||
      effectiveReaderLens === "full-link"
    ) {
      return buildJnwStateLinkScene({
        system,
        summary: jnwSummary,
        selectedStateId: activeJnwSelectedState?.id ?? selectedNode?.id,
        readerLens: effectiveReaderLens,
      });
    }
    return buildJnwStateQuotientYGammaScene({
      system,
      atlas: yGammaAtlas,
      summary: jnwSummary,
      moveSystem: activeJnwMoveSystem,
      selectedStateId: activeJnwSelectedState?.id ?? selectedNode?.id,
      selectedRail: { generator: selectedJnwGenerator },
      selectedRelationId: selectedCellId,
      sheetMode: jnwQuotientSheetMode,
      constructionStage: jnwQuotientConstructionStage,
      readerMode: jnwReaderMode,
      readerLens: effectiveReaderLens,
      railGrouping: jnwRailGrouping,
    });
  }, [
    activeIsJnwStateQuotient,
    activeJnwSelectedState?.id,
    activeJnwMoveSystem,
    jnwQuotientConstructionStage,
    jnwQuotientSheetMode,
    jnwRailGrouping,
    jnwReaderLens,
    jnwReaderMode,
    jnwSummary,
    selectedNode?.id,
    selectedCellId,
    selectedJnwGenerator,
    system,
    topologyLens.id,
    yGammaAtlas,
  ]);
  const jnwCameraFrame = useMemo(() => {
    if (!jnwStateYGammaOrbitScene) {
      return undefined;
    }
    const positionedNodes = jnwStateYGammaOrbitScene.nodes.filter(
      (node): node is typeof node & { position: [number, number, number] } =>
        node.position !== undefined,
    );
    const relationCenterId = selectedCellId
      ? jnwStateYGammaOrbitScene.coverModel?.relationCells.find(
          (relation) => relation.id === selectedCellId,
        )?.centerId
      : undefined;
    const relationCenter = relationCenterId
      ? positionedNodes.find((node) => node.id === relationCenterId)?.position
      : undefined;
    const target =
      relationCenter ??
      centroid3(positionedNodes.map((node) => node.position)) ??
      ([0, 0, 0] as [number, number, number]);
    const radius = positionedNodes.reduce(
      (maximum, node) =>
        Math.max(
          maximum,
          Math.hypot(
            node.position[0] - target[0],
            node.position[1] - target[1],
            node.position[2] - target[2],
          ),
        ),
      0,
    );
    const focusedRelation = relationCenter !== undefined;
    // A cover subdivision fills a volume, rather than a nearly planar graph.
    // Keeping the camera roughly four bounding radii from the target leaves
    // all four state vertices visible without making the user zoom out first.
    const distance = focusedRelation
      ? Math.max(24, Math.min(radius * 1.35, 38))
      : Math.max(30, radius * 1.3);
    return {
      target,
      offset: [distance * 1.05, -distance * 1.55, distance * 0.95] as [
        number,
        number,
        number,
      ],
    };
  }, [jnwStateYGammaOrbitScene, selectedCellId]);
  const cameraFocusTarget =
    jnwCameraFrame?.target ??
    yGammaCameraFocus?.target ??
    focusedCellCameraTarget ??
    (graphView === "on-graph" && activeGeneratorPairKey
      ? localLayout?.cameraTargets.get(activeGeneratorPairKey)
      : undefined);
  const cameraFocusOffset = jnwCameraFrame?.offset ?? yGammaCameraFocus?.offset;
  // The Y_Gamma atlas may finish after the workflow click that increments the
  // ordinary focus signal. This offset causes one additional focus pass when
  // the derived JNW scene itself becomes available.
  const activeFocusSignal =
    focusSignal + (jnwStateYGammaOrbitScene ? 1_000_000 : 0);
  const jnwStateSceneDecoration = useMemo(() => {
    if (!activeIsJnwStateQuotient || jnwStateYGammaOrbitScene || !jnwSummary) {
      return undefined;
    }
    return decorateJnwStateQuotientScene({
      nodes: sceneNodes,
      edges: sceneEdges,
      system,
      summary: jnwSummary,
      selectedStateId: activeJnwSelectedState?.id ?? selectedNode?.id,
    });
  }, [
    activeIsJnwStateQuotient,
    activeJnwSelectedState?.id,
    jnwSummary,
    jnwStateYGammaOrbitScene,
    sceneEdges,
    sceneNodes,
    selectedNode?.id,
    system,
  ]);
  const activeSceneNodes = useMemo(
    () =>
      showingGammaDefiningGraph
        ? (gammaDefiningGraphScene?.nodes ?? emptySceneNodes)
        : showingYGammaComplex
          ? (yGamma2SkeletonScene?.nodes ?? emptySceneNodes)
          : (jnwStateYGammaOrbitScene?.nodes ??
            jnwStateSceneDecoration?.nodes ??
            sceneNodes),
    [
      gammaDefiningGraphScene,
      jnwStateSceneDecoration,
      jnwStateYGammaOrbitScene,
      sceneNodes,
      showingGammaDefiningGraph,
      showingYGammaComplex,
      yGamma2SkeletonScene,
    ],
  );
  const activeSceneEdges = useMemo(
    () =>
      showingGammaDefiningGraph
        ? (gammaDefiningGraphScene?.edges ?? emptySceneEdges)
        : showingYGammaComplex
          ? (yGamma2SkeletonScene?.edges ?? emptySceneEdges)
          : (jnwStateYGammaOrbitScene?.edges ??
            jnwStateSceneDecoration?.edges ??
            sceneEdges),
    [
      gammaDefiningGraphScene,
      jnwStateSceneDecoration,
      jnwStateYGammaOrbitScene,
      sceneEdges,
      showingGammaDefiningGraph,
      showingYGammaComplex,
      yGamma2SkeletonScene,
    ],
  );
  const readableActiveSceneEdges = useMemo(
    () =>
      activeIsJnwStateQuotient && !jnwStateYGammaOrbitScene
        ? spreadParallelStateQuotientEdges(activeSceneEdges)
        : activeSceneEdges,
    [activeIsJnwStateQuotient, activeSceneEdges, jnwStateYGammaOrbitScene],
  );
  const gameDecoratedSceneEdges = useMemo(() => {
    const decorated = decorateSceneEdgesForGame({
      edges: readableActiveSceneEdges,
      enabled:
        activeQuotient !== undefined &&
        !showingGammaDefiningGraph &&
        quotientGameSummary !== undefined &&
        (!jnwStateYGammaOrbitScene || jnwQuotientConstructionStage >= 5),
      yGamma: showingYGammaComplex,
      flowByEdgeId: quotientFlowByEdgeId,
      generatorValueById: quotientGeneratorValueById,
    });
    if (
      !quotientLensSceneIds ||
      topologyLens.id === "full-local-link" ||
      !isQuotientLinkLens(topologyLens.id) ||
      jnwStateYGammaOrbitScene?.readerLens === "ascending-link" ||
      jnwStateYGammaOrbitScene?.readerLens === "descending-link" ||
      jnwStateYGammaOrbitScene?.readerLens === "level-link" ||
      jnwStateYGammaOrbitScene?.readerLens === "full-link"
    ) {
      return decorated;
    }
    return decorated.map((edge) =>
      quotientLensSceneIds.focusEdgeIds.has(edge.id)
        ? {
            ...edge,
            alwaysLabel: true,
            labelPriority: Math.max(edge.labelPriority ?? 0, 900),
          }
        : {
            ...edge,
            ghost: true,
            labelPriority: Math.min(edge.labelPriority ?? 0, -100),
          },
    );
  }, [
    activeQuotient,
    jnwQuotientConstructionStage,
    jnwStateYGammaOrbitScene,
    quotientFlowByEdgeId,
    quotientGameSummary,
    quotientGeneratorValueById,
    quotientLensSceneIds,
    readableActiveSceneEdges,
    showingGammaDefiningGraph,
    showingYGammaComplex,
    topologyLens.id,
  ]);
  const activeSceneCells = useMemo(
    () =>
      showingGammaDefiningGraph
        ? emptySceneCells
        : showingYGammaComplex
          ? (yGamma2SkeletonScene?.cells ?? emptySceneCells)
          : (jnwStateYGammaOrbitScene?.cells ?? sceneCells),
    [
      jnwStateYGammaOrbitScene,
      sceneCells,
      showingGammaDefiningGraph,
      showingYGammaComplex,
      yGamma2SkeletonScene,
    ],
  );
  const activeSceneSelectedNodeId = showingGammaDefiningGraph
    ? definingGraphNodeId(activeGammaGenerator)
    : showingYGammaComplex
      ? yGamma2SkeletonScene?.selectedNodeId
      : (jnwStateYGammaOrbitScene?.selectedNodeId ?? selectedNode?.id);
  const activeSceneVisibleNodeCount = useMemo(
    () =>
      activeSceneNodes.filter((node) => !("hidden" in node) || !node.hidden)
        .length,
    [activeSceneNodes],
  );
  const yGammaHoveredOrActiveCell = useMemo(() => {
    if (!showingYGammaComplex || !yGamma2SkeletonScene) {
      return undefined;
    }
    const cellId = hoveredCellId ?? selectedCellId;
    const direct = cellId
      ? yGamma2SkeletonScene.cells.find((cell) => cell.id === cellId)
      : undefined;
    if (direct) {
      return direct;
    }
    if (!activeGeneratorPairKey) {
      return undefined;
    }
    return yGamma2SkeletonScene.cells.find(
      (cell) => pairKey(cell.generatorPair) === activeGeneratorPairKey,
    );
  }, [
    activeGeneratorPairKey,
    hoveredCellId,
    selectedCellId,
    showingYGammaComplex,
    yGamma2SkeletonScene,
  ]);
  const yGammaActiveRelation = useMemo(() => {
    if (!yGammaAtlas) {
      return undefined;
    }
    const pair =
      yGammaHoveredOrActiveCell?.generatorPair ?? activeGeneratorPair;
    if (!pair) {
      return undefined;
    }
    const key = pairKey(pair);
    return yGammaAtlas.rankTwoCells.find(
      (cell) => relationCellPairKey(cell.generators) === key,
    );
  }, [activeGeneratorPair, yGammaAtlas, yGammaHoveredOrActiveCell]);
  const effectiveMaxNodeLabels =
    graphView === "on-graph"
      ? Math.max(graphPreset.maxNodeLabels, Math.min(viewNodes.length, 180))
      : graphPreset.maxNodeLabels;
  const effectiveMaxEdgeLabels =
    graphView === "on-graph"
      ? Math.max(graphPreset.maxEdgeLabels, Math.min(viewEdges.length, 180))
      : graphPreset.maxEdgeLabels;
  const geometricReferenceBallVisible =
    !showingYGammaComplex &&
    effectiveMode === "geometric" &&
    graphView === "global" &&
    !projection.endsWith("-pca");
  const jnwEffectiveSheetMode =
    jnwStateYGammaOrbitScene && jnwQuotientConstructionStage <= 3
      ? "outlines"
      : jnwQuotientSheetMode;
  const activeLocalCellRenderMode: LocalCellRenderMode =
    jnwStateYGammaOrbitScene && jnwEffectiveSheetMode === "outlines"
      ? "outline-only"
      : showingDerivedScene
        ? "in-graph"
        : cellRenderMode;
  const activeCellOpacity = jnwStateYGammaOrbitScene
    ? jnwEffectiveSheetMode === "filled"
      ? 0.24
      : jnwEffectiveSheetMode === "glass"
        ? 0.07
        : 0.04
    : showingYGammaComplex
      ? yGammaTopologyMode
        ? 0.18
        : 0.3
      : cellOpacity;
  const forceBudgetedSceneLabels =
    showingDerivedScene || forceStateQuotientLabels;
  const sceneLabelScope = forceBudgetedSceneLabels ? "budgeted" : labelScope;
  const sceneMaxNodeLabels = forceStateQuotientLabels
    ? Math.max(activeSceneNodes.length, 120)
    : showingDerivedScene
      ? 120
      : effectiveMaxNodeLabels;
  const sceneMaxEdgeLabels = showingYGammaComplex
    ? Math.max(activeSceneEdges.length, 120)
    : showingGammaDefiningGraph
      ? Math.max(activeSceneEdges.length, 120)
      : showingDerivedScene
        ? 120
        : effectiveMaxEdgeLabels;
  const activeSceneRevisionSet = useMemo(
    () =>
      buildSceneRevisionSet({
        nodes: activeSceneNodes,
        edges: gameDecoratedSceneEdges,
        cells: activeSceneCells,
        // These values change the actual cell vertices or pick surfaces, not
        // merely their material. Keeping them in the cell-geometry layer avoids
        // stale lifted panels and lets cheap label/color updates stay cheap.
        cellGeometryParts: [
          `cell-render:${activeLocalCellRenderMode}`,
          `show-cells:${showingDerivedScene || showCells || showHigherCells}`,
          `active-pair:${showingYGammaComplex ? "" : (activeGeneratorPairKey ?? "")}`,
          `ygamma-applied-scene:${
            showingYGammaComplex ? (yGammaSceneState.sceneVersion ?? "") : ""
          }`,
          `panel-offset:${
            showingYGammaComplex
              ? 0
              : bringFocusedCellsForward
                ? panelOffsetStrength
                : 0
          }`,
          `topology:${showingYGammaComplex && yGammaTopologyMode}`,
          `reference:${geometricReferenceBallVisible}`,
          `reference-radius:${geometricDisplayScale}`,
        ],
        appearanceParts: [
          `selected-node:${activeSceneSelectedNodeId ?? ""}`,
          `selected-cell:${selectedCellId ?? ""}`,
          `show-cells:${showingDerivedScene || showCells || showHigherCells}`,
          `active-pair:${activeGeneratorPairKey ?? ""}`,
          `occlusion:${occlusionMode}`,
          `cell-opacity:${activeCellOpacity}`,
          `jnw-sheet:${jnwStateYGammaOrbitScene ? jnwEffectiveSheetMode : ""}`,
          `jnw-stage:${
            jnwStateYGammaOrbitScene ? jnwQuotientConstructionStage : ""
          }`,
          `ygamma-inspect:${showingYGammaComplex ? yGammaInspectMode : ""}`,
          `semantic:${showingYGammaComplex}`,
          `reference:${geometricReferenceBallVisible}`,
          `reference-radius:${geometricDisplayScale}`,
          `theme:${colorScheme}`,
          `game:${
            quotientGameSummary?.generatorValues
              .map((state) => `${state.generator}:${state.value}`)
              .join(",") ?? ""
          }:${quotientGameSummary?.status ?? ""}`,
          `camera:${showingDerivedScene ? "global" : graphView}`,
          ...system.generators.map(
            (generator) => `${generator.label}:${generator.colorHint ?? ""}`,
          ),
        ],
        labelParts: [
          `selected-node:${activeSceneSelectedNodeId ?? ""}`,
          `show-node-labels:${forceBudgetedSceneLabels || showNodeLabels}`,
          `show-edge-labels:${showingDerivedScene || showEdgeLabels}`,
          `label-scope:${sceneLabelScope}`,
          `max-node-labels:${sceneMaxNodeLabels}`,
          `max-edge-labels:${sceneMaxEdgeLabels}`,
          `semantic:${showingYGammaComplex}`,
        ],
        cameraParts: [
          `camera:${showingDerivedScene ? "global" : graphView}`,
          `reference:${geometricReferenceBallVisible}`,
          `reference-radius:${geometricDisplayScale}`,
        ],
      }),
    [
      activeCellOpacity,
      activeGeneratorPairKey,
      activeLocalCellRenderMode,
      activeSceneCells,
      activeSceneNodes,
      activeSceneSelectedNodeId,
      bringFocusedCellsForward,
      colorScheme,
      forceBudgetedSceneLabels,
      geometricReferenceBallVisible,
      gameDecoratedSceneEdges,
      graphView,
      jnwEffectiveSheetMode,
      jnwQuotientConstructionStage,
      jnwStateYGammaOrbitScene,
      occlusionMode,
      panelOffsetStrength,
      quotientGameSummary?.generatorValues,
      quotientGameSummary?.status,
      sceneLabelScope,
      sceneMaxEdgeLabels,
      sceneMaxNodeLabels,
      selectedCellId,
      showCells,
      showEdgeLabels,
      showHigherCells,
      showingDerivedScene,
      showingYGammaComplex,
      showNodeLabels,
      system.generators,
      yGammaTopologyMode,
      yGammaInspectMode,
      yGammaSceneState.sceneVersion,
    ],
  );
  const activeSceneStructureVersion = activeSceneRevisionSet.structureVersion;
  const activeSceneAppearanceVersion =
    activeSceneRevisionSet.renderAppearanceVersion;
  const yGammaComparisonWarmRequests = useMemo(() => {
    if (!showingYGammaComplex || !yGammaAtlas) {
      return undefined;
    }
    const commonOptions: YGamma2SkeletonSceneOptions = {
      ...yGammaSceneOptions,
      faceMode: "all",
      includeRankThreeCells: yGammaSceneOptions.includeRankThreeCells,
      relationStar: yGammaSceneOptions.relationStar,
      cutaway: yGammaSceneOptions.cutaway,
    };
    const coherent = {
      atlas: yGammaAtlas,
      options: {
        ...commonOptions,
        cellSeparation: "coherent",
        separationValue: 0,
      } satisfies YGamma2SkeletonSceneOptions,
    };
    const expanded = {
      atlas: yGammaAtlas,
      options: {
        ...commonOptions,
        cellSeparation: "expanded",
        separationValue: 100,
      } satisfies YGamma2SkeletonSceneOptions,
    };
    return {
      coherent,
      expanded,
      version: `${yGammaSceneClient.sceneVersionFor(coherent)}:${yGammaSceneClient.sceneVersionFor(expanded)}`,
    };
  }, [
    showingYGammaComplex,
    yGammaAtlas,
    yGammaSceneClient,
    yGammaSceneOptions,
  ]);
  const yGammaComparisonRequests = yGammaCompareDrawing
    ? yGammaComparisonWarmRequests
    : undefined;
  useEffect(() => {
    if (!yGammaComparisonWarmRequests || yGammaCompareDrawing) {
      return;
    }
    let cancelIdle: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      cancelIdle = scheduleIdleTask(
        () => {
          void yGammaSceneClient.prefetch([
            yGammaComparisonWarmRequests.coherent,
            yGammaComparisonWarmRequests.expanded,
          ]);
        },
        { timeout: 1_000 },
      );
    }, 750);
    return () => {
      window.clearTimeout(timer);
      cancelIdle?.();
    };
  }, [yGammaCompareDrawing, yGammaComparisonWarmRequests, yGammaSceneClient]);
  useEffect(() => {
    if (!yGammaComparisonRequests) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      yGammaSceneClient.build(yGammaComparisonRequests.coherent),
      yGammaSceneClient.build(yGammaComparisonRequests.expanded),
    ])
      .then(([coherent, expanded]) => {
        if (!cancelled) {
          setYGammaComparisonSceneState({
            version: yGammaComparisonRequests.version,
            coherent: coherent.scene,
            expanded: expanded.scene,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [yGammaComparisonRequests, yGammaSceneClient]);
  const yGammaComparisonScenes =
    yGammaComparisonRequests &&
    yGammaComparisonSceneState?.version === yGammaComparisonRequests.version
      ? yGammaComparisonSceneState
      : undefined;
  const yGammaDrawingComparisonScene = useMemo(
    () =>
      yGammaComparisonScenes
        ? buildYGammaDrawingComparisonScene(
            yGammaComparisonScenes.coherent,
            yGammaComparisonScenes.expanded,
          )
        : undefined,
    [yGammaComparisonScenes],
  );
  const warnings = useMemo(
    () => [
      ...(system.warnings ?? []),
      ...dataStatusWarnings(system),
      ...(system.notes?.filter((note) =>
        note.toLowerCase().includes("placeholder"),
      ) ?? []),
      ...(ball?.metadata.warnings ?? []),
      ...(ball?.metadata.certification?.errors ?? []),
      ...(ball?.metadata.certification?.warnings ?? []),
      ...localLink.warnings,
      ...(davisIncidence?.warnings ?? []),
      ...(topologyDiagnostics?.warnings ?? []),
      ...sphericalCellProxies.warnings,
      ...(showingYGammaComplex ? (yGamma2SkeletonScene?.warnings ?? []) : []),
      ...(showingGammaDefiningGraph
        ? (gammaDefiningGraphScene?.warnings ?? [])
        : []),
      ...(jnwStateYGammaOrbitScene?.warnings ?? []),
      ...(activeIsYGammaBaseComplex &&
      yGammaMainView === "complex" &&
      yGammaSceneState.pending
        ? ["Y_Gamma scene construction is running in a worker."]
        : []),
      ...(activeIsYGammaBaseComplex &&
      yGammaMainView === "complex" &&
      yGammaSceneState.error
        ? [yGammaSceneState.error]
        : []),
      ...(activeIsYGammaBaseComplex && yGammaAtlas ? yGammaAtlas.warnings : []),
      ...(budgetedCells.omitted > 0
        ? [
            `${budgetedCells.omitted} rank-two Davis cells were omitted by the ${graphPreset.label} render budget.`,
          ]
        : []),
      ...(graphPresetId === "research"
        ? [
            "Research graph size raises generation caps to radius 10; labels and cell rendering are aggressively budgeted for responsiveness.",
          ]
        : []),
      ...(activeDataset.id === "compact_5_cube_gamma1" &&
      graphView === "global" &&
      debouncedRadius >= 5
        ? [
            "Compact 5-cube radius 5+ in See all view is a research/stress view; Look near a chamber is recommended for interactive inspection.",
          ]
        : []),
      ...(generation.pending
        ? ["Cayley ball generation is running in a worker."]
        : []),
      ...(!hasMathContext
        ? [
            "This generated graph has no source Coxeter system; local-link and spherical-subset math are disabled.",
          ]
        : []),
      ...(activeDataset.kind === "quotient-complex"
        ? [quotientManifoldStatus(activeDataset.quotient).reason]
        : []),
      ...(selectedExactBackend
        ? [selectedExactBackend.availability("generate").message]
        : []),
      ...(rootNodeId !== "e"
        ? [
            `The view is visually re-rooted at ${rootNodeId}; words and lengths are still recorded from the identity.`,
          ]
        : []),
      ...(graphView === "on-graph"
        ? [
            `Look near a chamber shows the radius-${localDepth} graph-neighborhood around ${selectedNode?.id ?? "the selected node"} with ${cellRenderMode} cell drawings; off-graph panels are optional readability transforms, not geometry.`,
          ]
        : []),
      ...(cellNeighborhoodMode !== "chamber" && focusedRankTwoCell
        ? [
            `Cell neighborhood view includes the complete boundary of ${focusedRankTwoCell.id}; non-boundary graph context is ghosted for readability.`,
          ]
        : []),
      ...(generationPending
        ? [
            `Radius ${radius} is queued; currently showing radius ${debouncedRadius}.`,
          ]
        : []),
      ...(effectiveMode === "geometric"
        ? [
            system.geometry?.certifiedModel?.certificate.status === "passed"
              ? "Interval-certified reflection residuals are available for this geometric dataset; the 3D projection remains a visualization."
              : "This 3D view is a projection, not exact hyperbolic geometry.",
          ]
        : []),
      ...(effectiveMode === "geometric" && projection.endsWith("-pca")
        ? [
            "PCA projection does not preserve the ball boundary; the reference sphere is hidden because displayed coordinates can fall outside it.",
          ]
        : []),
      ...(geometricReferenceBallVisible
        ? [
            `The ${projection.startsWith("poincare") ? "Poincare" : "Klein"} ball is drawn at ${geometricDisplayScale}x display scale so near-boundary chambers remain readable.`,
          ]
        : []),
      ...(displayed.error ? [displayed.error] : []),
    ],
    [
      activeDataset,
      activeIsYGammaBaseComplex,
      ball,
      budgetedCells.omitted,
      cellRenderMode,
      cellNeighborhoodMode,
      davisIncidence?.warnings,
      debouncedRadius,
      displayed.error,
      effectiveMode,
      generation.pending,
      generationPending,
      graphPresetId,
      graphPreset.label,
      graphView,
      geometricReferenceBallVisible,
      hasMathContext,
      localDepth,
      localLink.warnings,
      radius,
      projection,
      rootNodeId,
      selectedExactBackend,
      selectedNode?.id,
      focusedRankTwoCell,
      sphericalCellProxies.warnings,
      system,
      showingYGammaComplex,
      showingGammaDefiningGraph,
      topologyDiagnostics?.warnings,
      yGamma2SkeletonScene?.warnings,
      gammaDefiningGraphScene?.warnings,
      jnwStateYGammaOrbitScene?.warnings,
      yGammaSceneState.error,
      yGammaSceneState.pending,
      yGammaAtlas,
      yGammaMainView,
    ],
  );
  const repairSuggestions = useMemo(
    () => (importError ? importRepairSuggestions(importError) : []),
    [importError],
  );
  const warningGroups = useMemo(() => groupWarnings(warnings), [warnings]);
  const whatAmISeeing = useMemo(
    () =>
      buildWhatAmISeeingSummary({
        system,
        ball: ball ?? undefined,
        selectedNode,
        mode: effectiveMode,
        graphView,
        localDepth,
        labelScope,
        activePreset,
        visibleNodeCount: activeSceneVisibleNodeCount,
        visibleEdgeCount: activeSceneEdges.length,
        visibleRankTwoCellCount: showingGammaDefiningGraph
          ? 0
          : showingYGammaComplex
            ? activeSceneCells.length
            : visibleCells.length,
        visibleHigherProxyCount: visibleHigherProxies.length,
        geometryAvailable,
        geometryCertified:
          system.geometry?.certifiedModel?.certificate.status === "passed",
        exactIncidenceCount: davisIncidence?.records.length ?? 0,
        isYGammaBaseComplex: activeIsYGammaBaseComplex,
        yGammaMainView,
      }),
    [
      activeIsYGammaBaseComplex,
      activePreset,
      activeSceneCells.length,
      activeSceneEdges.length,
      activeSceneVisibleNodeCount,
      ball,
      davisIncidence?.records.length,
      effectiveMode,
      geometryAvailable,
      graphView,
      labelScope,
      localDepth,
      selectedNode,
      system,
      showingYGammaComplex,
      showingGammaDefiningGraph,
      visibleCells.length,
      visibleHigherProxies.length,
      yGammaMainView,
    ],
  );
  const currentModelBadge = useMemo(
    () =>
      describeCurrentModel({
        activeDatasetKind: activeDataset.kind,
        activeIsYGammaBaseComplex,
        activeIsJnwStateQuotient,
        activePreset,
        cellFocusMode,
        effectiveMode,
        geometryIntervalCertified:
          system.geometry?.certifiedModel?.certificate.status === "passed",
        graphView,
        projection,
        showingGammaDefiningGraph,
        showingYGammaComplex,
        yGammaMainView,
      }),
    [
      activeDataset.kind,
      activeIsJnwStateQuotient,
      activeIsYGammaBaseComplex,
      activePreset,
      cellFocusMode,
      effectiveMode,
      graphView,
      projection,
      showingGammaDefiningGraph,
      showingYGammaComplex,
      system.geometry?.certifiedModel?.certificate.status,
      yGammaMainView,
    ],
  );
  const currentModelExplanation = modelExplanationForLabel(
    currentModelBadge.label,
  );
  const currentModelDisplayLabel = showReaderControls
    ? currentModelExplanation.teachingLabel
    : currentModelExplanation.label;
  const labelForModel = (id: keyof typeof modelExplanations) =>
    showReaderControls
      ? modelExplanations[id].teachingLabel
      : modelExplanations[id].label;
  const caveatCount = warningGroups.reduce(
    (count, group) => count + group.warnings.length,
    0,
  );
  const activeGuideStep = activeGuidedInspectionStep(guidedInspection);
  const showLocalLinkPanel =
    showResearchControls ||
    activeGuideStep?.focus === "local-link" ||
    isQuotientLinkLens(topologyLens.id) ||
    teachingLocalLinkOpen;
  const showYGammaInventoryPanel = showResearchControls;
  const showGamePanel =
    showResearchControls || activeDataset.kind === "quotient-complex";
  const activeWorkflowStep = activeResearchWorkflowStep(researchWorkflow);
  const workflowComparison = useMemo(
    () => compareLatestNotebookRuns(savedExperiments),
    [savedExperiments],
  );
  const topologyInspectorSubject = useMemo<TopologyInspectorSubject>(() => {
    if (showingGammaDefiningGraph && selectedGammaIncidence) {
      return { kind: "gamma-vertex", incidence: selectedGammaIncidence };
    }
    if (showingYGammaComplex && yGammaActiveRelation) {
      return { kind: "ygamma-cell", cell: yGammaActiveRelation };
    }
    if (activeDataset.kind === "quotient-complex" && selectedCellId) {
      const quotientCell = activeDataset.quotient.twoCells.find(
        (cell) => cell.id === selectedCellId,
      );
      if (quotientCell) {
        return {
          kind: "quotient-cell",
          quotient: activeDataset.quotient,
          cell: quotientCell,
        };
      }
    }
    if (
      activeDataset.kind === "quotient-complex" &&
      (isQuotientLinkLens(topologyLens.id) ||
        topologyLens.id === "state-quotient-orbit")
    ) {
      if (activeIsJnwStateQuotient && jnwSummary) {
        return buildJnwStateLinkSubject(
          activeDataset.quotient,
          jnwSummary,
          activeSceneSelectedNodeId,
          topologyLens.id,
        );
      }
      return {
        kind: "game-assignment",
        quotient: activeDataset.quotient,
        selectedVertexId: activeSceneSelectedNodeId,
      };
    }
    if (
      activeGuideStep?.focus === "quotient" &&
      activeDataset.kind === "quotient-complex"
    ) {
      return {
        kind: "game-assignment",
        quotient: activeDataset.quotient,
        selectedVertexId: activeSceneSelectedNodeId,
      };
    }
    if (focusedRankTwoCell) {
      return { kind: "rank-two-cell", cell: focusedRankTwoCell };
    }
    if (selectedHigherCell) {
      return { kind: "higher-cell", cell: selectedHigherCell };
    }
    if (selectedHigherProxy) {
      return { kind: "higher-proxy", proxy: selectedHigherProxy };
    }
    if (activeGuideStep?.focus === "local-link") {
      return {
        kind: "local-link",
        nodeId: selectedNode?.id ?? "e",
        sphericalSubsetCount: sphericalSubsetResult?.subsets.length ?? 0,
      };
    }
    return {
      kind: "node",
      id: selectedNode?.id ?? "none",
      word: selectedNode?.word ?? [],
      length: selectedNode?.length ?? 0,
    };
  }, [
    activeDataset,
    activeGuideStep?.focus,
    activeSceneSelectedNodeId,
    activeIsJnwStateQuotient,
    focusedRankTwoCell,
    jnwSummary,
    selectedCellId,
    selectedHigherCell,
    selectedHigherProxy,
    selectedNode,
    selectedGammaIncidence,
    showingGammaDefiningGraph,
    showingYGammaComplex,
    sphericalSubsetResult?.subsets.length,
    topologyLens.id,
    yGammaActiveRelation,
  ]);
  const topologyExplanation = useMemo(
    () =>
      buildTopologyExplanation({
        system,
        subject: topologyInspectorSubject,
        geometricProjectionActive: effectiveMode === "geometric",
        geometryIntervalCertified:
          system.geometry?.certifiedModel?.certificate.status === "passed",
      }),
    [effectiveMode, system, topologyInspectorSubject],
  );
  const sessionWarnings = useMemo(
    () => warnings.filter((warning) => !isTransientBuildWarning(warning)),
    [warnings],
  );

  const currentProjectSession = useMemo(
    () =>
      createProjectSession({
        project: {
          label: `${activeDataset.label} session`,
          rootPathHint: desktopStatus?.workspace.rootPathHint,
        },
        workspace: desktopStatus?.workspace,
        dataset: {
          sourceKind:
            activeDataset.kind === "quotient-complex"
              ? "quotient-complex"
              : activeDataset.kind === "generated-graph"
                ? "generated-ball"
                : "example",
          activeDatasetId: activeDataset.id,
          activeExampleId: selectedExample.id,
        },
        generation: {
          radius,
          backend:
            backendId === "sageExportBackend" || backendId === "gapKbmagBackend"
              ? backendId
              : "browserApproxBackend",
          maxRadius: graphPreset.maxRadius,
          maxNodes: graphPreset.maxNodes,
          maxEdges: graphPreset.maxEdges,
        },
        view: {
          mode: activeIsYGammaBaseComplex
            ? "y-gamma"
            : graphView === "on-graph"
              ? "local-topology"
              : effectiveMode === "geometric"
                ? "geometric-projection"
                : "combinatorial-shell",
          labelScope:
            labelScope === "off"
              ? "none"
              : labelScope === "budgeted"
                ? "all"
                : labelScope,
          selectedNodeId: selectedNode?.id,
          selectedCellId,
          activeGeneratorPairKey,
          showRankTwoCells: showCells,
          showHigherCells,
          showNodeLabels,
          showEdgeLabels,
        },
        files: {
          recent: recentSessions,
        },
        experiments: {
          activeBundleId: savedExperiments[0]?.id,
          bundleIds: savedExperiments.map((bundle) => bundle.id),
          game: quotientGameSummary
            ? {
                workflowKind: gameWorkflowKind,
                claimStatus:
                  gameWorkflowKind === "jnw-legal-system"
                    ? (jnwSummary?.claimStatus ?? "failed")
                    : quotientGameSummary.status === "passed"
                      ? "experimental-non-jnw"
                      : "failed",
                assignmentKind: quotientGameSummary.assignmentKind,
                activeAssignmentId: quotientGameSummary.assignmentId,
                activeCocycleId: quotientGameSummary.cocycleId,
                generatorValues: quotientGameSummary.generatorValues,
                generatorUniformCochain: {
                  generatorValues: quotientGameSummary.generatorValues,
                  cocycleStatus: quotientGameSummary.status,
                  failedCellIds: quotientGameSummary.failedCellIds,
                },
                jnwLegalSystem:
                  gameWorkflowKind === "jnw-legal-system" && jnwSummary
                    ? {
                        sourceSystemName: jnwSourceSystem.name,
                        initialState: activeJnwInitialState.generators,
                        moves: activeJnwMoveSystem.moves,
                        orbitStateCount: jnwSummary.states.length,
                        legalStateCount: jnwSummary.legalStateCount,
                        stronglyLegalStateCount:
                          jnwSummary.stronglyLegalStateCount,
                        reader: {
                          mode: jnwReaderMode,
                          lens: jnwReaderLens,
                          railGrouping: jnwRailGrouping,
                          selectedStateId: activeJnwSelectedState?.id,
                          selectedGenerator: selectedJnwGenerator,
                          selectedRelationId: selectedCellId,
                          constructionStage: jnwQuotientConstructionStage,
                        },
                      }
                    : undefined,
                selectedVertexId: selectedNode?.id,
                cocycleStatus: quotientGameSummary.status,
                failedCellIds: quotientGameSummary.failedCellIds,
              }
            : undefined,
        },
        desktop: {
          preferredRuntime:
            desktopStatus?.runtime === "tauri" ? "tauri" : "web",
        },
        warnings: sessionWarnings,
        notes: annotations.map((annotation) => annotation.body),
      }),
    [
      activeDataset.id,
      activeDataset.kind,
      activeDataset.label,
      activeGeneratorPairKey,
      activeIsYGammaBaseComplex,
      annotations,
      backendId,
      desktopStatus?.runtime,
      desktopStatus?.workspace,
      effectiveMode,
      graphPreset.maxEdges,
      graphPreset.maxNodes,
      graphPreset.maxRadius,
      graphView,
      activeJnwInitialState.generators,
      activeJnwMoveSystem.moves,
      activeJnwSelectedState?.id,
      gameWorkflowKind,
      jnwQuotientConstructionStage,
      jnwRailGrouping,
      jnwReaderLens,
      jnwReaderMode,
      jnwSourceSystem.name,
      jnwSummary,
      labelScope,
      quotientGameSummary,
      radius,
      recentSessions,
      savedExperiments,
      selectedCellId,
      selectedExample.id,
      selectedJnwGenerator,
      selectedNode?.id,
      showCells,
      showEdgeLabels,
      showHigherCells,
      showNodeLabels,
      sessionWarnings,
    ],
  );
  const currentSessionSnapshot = useMemo(
    () => createProjectSessionSnapshot(currentProjectSession),
    [currentProjectSession],
  );
  const [savedSessionSnapshot, setSavedSessionSnapshot] =
    useState<ProjectSessionSnapshot>(() => currentSessionSnapshot);
  const [sessionBaselineReady, setSessionBaselineReady] = useState(false);
  const sessionDirty =
    sessionBaselineReady &&
    hasProjectSessionChanges(savedSessionSnapshot, currentSessionSnapshot);

  useEffect(() => {
    if (
      initialSessionBaselineRef.current ||
      desktopStatus === null ||
      generationPending ||
      workerGeneration.pending ||
      yGammaSceneState.pending
    ) {
      return;
    }
    initialSessionBaselineRef.current = true;
    setSavedSessionSnapshot(currentSessionSnapshot);
    setSessionBaselineReady(true);
  }, [
    currentSessionSnapshot,
    desktopStatus,
    generationPending,
    workerGeneration.pending,
    yGammaSceneState.pending,
  ]);

  useEffect(() => {
    if (!sessionDirty) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionDirty]);

  const confirmSessionDiscard = useCallback(
    async (reason: string) => {
      const result = await desktopBridge.confirmDiscardUnsavedChanges({
        isDirty: sessionDirty,
        reason,
        sessionLabel: activeDataset.label,
      });
      if (result.message) {
        setDesktopMessage(result.message);
      }
      return result.confirmed;
    },
    [activeDataset.label, desktopBridge, sessionDirty],
  );

  useEffect(() => {
    if (!denseExample || denseAutoAppliedIds.current.has(activeDataset.id)) {
      return;
    }
    denseAutoAppliedIds.current.add(activeDataset.id);
    const timeoutId = window.setTimeout(() => {
      applyViewPreset("local-chamber");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeDataset.id, applyViewPreset, denseExample]);

  const handleExampleChange = async (nextId: string) => {
    if (nextId === selectedExample.id) {
      return;
    }
    setExampleId(nextId);
    setImportedDataset(null);
    setImportError(null);
    setSelectedNodeId("e");
    setRootNodeId("e");
    setSelectedCellId(undefined);
    setDisabledPairs(new Set());
    setDisabledHigherSubsets(new Set());
    setActiveGeneratorPairKey(undefined);
    setYGammaShowAllFaces(false);
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset("rank-three-cell");
    setYGammaPeelMode("same-rank-three");
    setYGammaCameraBookmark("rank-three-cell");
    setHoveredCellId(undefined);
  };

  const handleLoadEightFacetEntry = async (
    entry: (typeof tumarkinEightFacetCatalogue)[number],
  ) => {
    if (!entry.renderable || !entry.exampleFile) {
      setImportError(
        `${entry.label} is source-located but not available as a certified bundled example.`,
      );
      return;
    }

    try {
      const response = await fetch(`/examples/${entry.exampleFile}`);
      if (!response.ok) {
        throw new Error(`Could not load ${entry.exampleFile}.`);
      }
      const input = parseCoxeterSystemInput(await response.json());
      setImportedExample({
        id: entry.id,
        label: input.name,
        input,
      });
      setImportedDataset(null);
      setExampleId(entry.id);
      setImportError(null);
      resetSelectionForImport();
    } catch (error) {
      if (error instanceof CoxeterValidationError) {
        setImportError(error.errors.join(" "));
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError(String(error));
      }
    }
  };

  const resetSelectionForImport = () => {
    setSelectedNodeId("e");
    setRootNodeId("e");
    setSelectedCellId(undefined);
    setSelectedJnwStateId(undefined);
    setGammaHighlightedJnwStateId(undefined);
    setDisabledPairs(new Set());
    setDisabledHigherSubsets(new Set());
    setActiveGeneratorPairKey(undefined);
    setYGammaShowAllFaces(false);
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset("rank-three-cell");
    setYGammaPeelMode("same-rank-three");
    setYGammaCameraBookmark("rank-three-cell");
    setHoveredCellId(undefined);
  };

  const loadI25WorkflowSource = () => {
    setExampleId("I2_5");
    setImportedDataset(null);
    setImportedExample(null);
    setQuotientSubgroupText("");
    setQuotientMaxCosets(16);
    setImportError(null);
    resetSelectionForImport();
    applyViewPreset("local-chamber", { persist: false });
  };

  const loadI25WorkflowQuotient = () => {
    const quotient = parseQuotientComplex(I2_5IdentityQuotient);
    const selectedVertexId = quotient.vertices[0]?.id ?? "q0";
    setImportedDataset({
      kind: "quotient-complex",
      id: "quotient:i2-5-identity-demo",
      label: `${quotient.name} (workflow demo)`,
      quotient,
      ball: quotientToGeneratedBall(quotient),
      sourceSystem: quotient.sourceSystem,
    });
    setSelectedNodeId(selectedVertexId);
    setRootNodeId(selectedVertexId);
    setSelectedCellId(quotient.twoCells[0]?.id);
    setActiveGeneratorPairKey(
      quotient.twoCells[0]
        ? pairKey(quotient.twoCells[0].generatorPair)
        : "0-1",
    );
    setDisabledPairs(new Set());
    setDisabledHigherSubsets(new Set());
    setMode("shell");
    setGraphView("global");
    setShowCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");
    setCellFocusMode("incident-selected");
    setCellNeighborhoodMode("chamber");
    setTopologyLens({ id: "full-local-link", selectedGenerator: 0 });
    setShowAdvancedPanels(false);
    setFocusSignal((value) => value + 1);
  };

  const loadJnwCubeWorkflow = () => {
    const cubeSystem = bundledExamples.find(
      (example) => example.id === jnwCubeExampleId,
    )?.input;
    if (!cubeSystem) {
      return;
    }
    const moveSystem =
      createBipartiteJnwMoveSystem(cubeSystem) ??
      createDefaultJnwMoveSystem(cubeSystem);
    const initialState = createJnwState(jnwCubeLegalInitialState);
    const summary = summarizeJnwLegalSystem(
      cubeSystem,
      moveSystem,
      initialState,
    );
    const quotient = jnwOrbitToQuotientComplex(cubeSystem, summary);

    setExampleId(jnwCubeExampleId);
    setImportedExample(null);
    setJnwDraft({
      sourceKey: `${cubeSystem.name}:${cubeSystem.rank}`,
      moveSystem,
      initialState,
    });
    setImportedDataset({
      kind: "quotient-complex",
      id: "jnw:cube-graph-legal-system",
      label: `${quotient.name} (JNW cube demo)`,
      quotient,
      ball: quotientToGeneratedBall(quotient),
      sourceSystem: cubeSystem,
    });
    setGameWorkflowKind("jnw-legal-system");
    setUiMode("research");
    setShowAdvancedPanels(true);
    setMode("shell");
    setGraphView("global");
    setSelectedNodeId(initialState.id);
    setRootNodeId(initialState.id);
    setSelectedJnwStateId(initialState.id);
    setGammaHighlightedJnwStateId(initialState.id);
    setSelectedCellId(undefined);
    setActiveGeneratorPairKey(undefined);
    setDisabledPairs(new Set());
    setDisabledHigherSubsets(new Set());
    setShowCells(true);
    setShowHigherCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");
    setJnwReaderMode("readable-chart");
    setJnwReaderLens("none");
    setJnwRailGrouping("individual");
    setSelectedJnwGenerator(0);
    setJnwQuotientSheetMode("glass");
    setJnwQuotientConstructionStage(4);
    setTopologyLens({ id: "state-quotient-orbit", selectedGenerator: 0 });
    setDesktopMessage(
      "Loaded the JNW cube graph with bipartition moves and a legal initial state.",
    );
    setFocusSignal((value) => value + 1);
  };

  const loadA3RankThreeWorkflowView = () => {
    const a3System = bundledExamples.find(
      (example) => example.id === "A3",
    )?.input;
    if (!a3System) {
      return;
    }
    const quotient = baseOrbicomplexForSystem(a3System);
    setImportedDataset({
      kind: "quotient-complex",
      id: "base-orbicomplex:A3:workflow",
      label: `${quotient.name} (rank-three workflow)`,
      quotient,
      ball: quotientToGeneratedBall(quotient),
      sourceSystem: a3System,
    });
    setSelectedNodeId("*");
    setRootNodeId("*");
    setSelectedCellId(undefined);
    setMode("shell");
    setGraphView("global");
    setShowCells(true);
    setShowHigherCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");
    setActiveGeneratorPairKey("1-2");
    setYGammaMainView("complex");
    setYGammaShowAllFaces(false);
    setYGammaRankThreeFocusEnabled(true);
    setYGammaFocusPreset("rank-three-cell");
    setYGammaPeelMode("same-rank-three");
    setYGammaTopologyMode(true);
    setYGammaCameraBookmark("rank-three-cell");
    setShowAdvancedPanels(false);
    setFocusSignal((value) => value + 1);
  };

  const runResearchWorkflowAction = (stepId = researchWorkflow.stepId) => {
    setResearchWorkflow((current) => ({ ...current, stepId }));
    if (stepId === "source-system") {
      loadI25WorkflowSource();
    } else if (stepId === "subgroup-cosets") {
      setQuotientSubgroupText("");
      setQuotientMaxCosets(16);
      setImportError(null);
      setShowAdvancedPanels(false);
    } else if (stepId === "quotient-complex") {
      loadI25WorkflowQuotient();
    } else if (stepId === "cocycle-game") {
      loadI25WorkflowQuotient();
      setTopologyLens({ id: "ascending-link", selectedGenerator: 0 });
    } else {
      saveExperimentRun();
    }
  };

  const moveResearchWorkflow = (delta: number) => {
    setResearchWorkflow((current) => moveResearchWorkflowStep(current, delta));
  };

  const applyTopologyLens = (lensId: TopologyLensId) => {
    setTopologyLens((current) =>
      current.id === lensId ? current : { ...current, id: lensId },
    );
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");

    if (lensId === "rank-three-spherical-cell") {
      loadA3RankThreeWorkflowView();
      return;
    }

    if (lensId === "generator-star" || lensId === "generator-family") {
      if (!activeIsYGammaBaseComplex) {
        openBaseOrbicomplex();
      }
      setYGammaFocusGenerator(topologyLens.selectedGenerator ?? 0);
      setYGammaPeelMode("adjacent-faces");
      setYGammaShowAllFaces(lensId === "generator-family");
      applyYGammaNarratedPreset("around-generator");
      return;
    }

    if (lensId === "edge-star" || lensId === "cells-incident-edge") {
      if (!activeIsYGammaBaseComplex) {
        openBaseOrbicomplex();
      }
      setYGammaPeelMode("adjacent-faces");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("front");
      setYGammaFocusPreset("around-generator");
      return;
    }

    if (lensId === "cell-star") {
      setGraphView("on-graph");
      setShowCells(true);
      setCellFocusMode("selected-cell");
      setCellNeighborhoodMode("cell-plus-1");
      setCellRenderMode("in-graph");
      setLabelScope("focused");
      setFocusSignal((value) => value + 1);
      return;
    }

    if (lensId === "rank-k-family") {
      if ((topologyLens.selectedRank ?? 3) === 3) {
        loadA3RankThreeWorkflowView();
      } else {
        setShowHigherCells(true);
        setGraphView("on-graph");
        setCellFocusMode("all-local");
      }
      return;
    }

    if (isQuotientLinkLens(lensId)) {
      if (
        activeDataset.kind !== "quotient-complex" ||
        !activeDataset.quotient.game
      ) {
        loadI25WorkflowQuotient();
      }
      setMode("shell");
      setGraphView("global");
      setShowCells(lensId === "full-local-link");
      setCellFocusMode("incident-selected");
      setCellNeighborhoodMode("chamber");
      setFocusSignal((value) => value + 1);
    }
  };

  const setTopologyLensGenerator = (generator: number) => {
    if (
      topologyLens.selectedGenerator === generator &&
      yGammaFocusGenerator === generator
    ) {
      return;
    }
    setTopologyLens((current) => ({
      ...current,
      selectedGenerator: generator,
    }));
    setYGammaFocusGenerator(generator);
    if (
      topologyLens.id === "generator-star" ||
      topologyLens.id === "generator-family" ||
      topologyLens.id === "edge-star" ||
      topologyLens.id === "cells-incident-edge"
    ) {
      setYGammaPeelMode("adjacent-faces");
      setFocusSignal((value) => value + 1);
    }
  };

  const handleImportCoxeterFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) {
      return;
    }
    if (!(await confirmSessionDiscard("import another Coxeter system"))) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const input = parseCoxeterSystemInput(parsed);
      const id = `imported:${input.name}`;
      setImportedExample({ id, label: `${input.name} (imported)`, input });
      setImportedDataset(null);
      setExampleId(id);
      resetSelectionForImport();
    } catch (error) {
      if (error instanceof CoxeterValidationError) {
        setImportError(error.errors.join(" "));
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError(String(error));
      }
    }
  };

  const handleImportGeneratedFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) {
      return;
    }
    if (!(await confirmSessionDiscard("import another generated graph"))) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const ball = parseGeneratedCayleyBall(parsed);
      setImportedDataset({
        kind: "generated-graph",
        id: `generated:${ball.systemName}`,
        label: `${ball.systemName} (generated)`,
        ball,
      });
      resetSelectionForImport();
    } catch (error) {
      if (error instanceof GeneratedBallValidationError) {
        setImportError(error.errors.join(" "));
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError(String(error));
      }
    }
  };

  const handleImportQuotientFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) {
      return;
    }
    if (!(await confirmSessionDiscard("import another quotient"))) {
      return;
    }

    try {
      const { quotient } = await quotientValidationClient.validateFile(file);
      const initialVertexId = quotient.vertices[0]?.id;
      setImportedDataset({
        kind: "quotient-complex",
        id: `quotient:${quotient.name}`,
        label: `${quotient.name} (quotient)`,
        quotient,
        ball: quotientToGeneratedBall(quotient),
        sourceSystem: quotient.sourceSystem,
      });
      resetSelectionForImport();
      if (initialVertexId) {
        setSelectedNodeId(initialVertexId);
        setRootNodeId(initialVertexId);
      }
      // An imported quotient must not inherit a link lens that filters it to a
      // stale local neighborhood, nor a Y_Gamma lens that replaces the file.
      setTopologyLens({ id: "generator-family", selectedGenerator: 0 });
    } catch (error) {
      if (error instanceof QuotientValidationCancelledError) {
        return;
      } else if (error instanceof QuotientValidationError) {
        setImportError(error.errors.join(" "));
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError(String(error));
      }
    }
  };

  const requestNativeExport = useCallback(
    async (request: DesktopExportRequest): Promise<DesktopBridgeResult> => {
      const result = await desktopBridge.exportFile(request);
      if (result.fallbackDownload || !result.ok) {
        if (request.contentEncoding === "data-url") {
          downloadDataUrl(request.fileName, request.contents);
        } else {
          downloadText(request.fileName, request.contents);
        }
      }
      setDesktopMessage(
        result.ok
          ? `Saved ${request.fileName}${result.path ? ` to ${result.path}` : ""}.`
          : (result.message ?? `Downloaded ${request.fileName}.`),
      );
      return result;
    },
    [desktopBridge],
  );

  const applyProjectSessionState = useCallback(
    (session: ProjectSession) => {
      const exampleIdFromSession = session.dataset.activeExampleId;
      if (
        exampleIdFromSession &&
        examples.some((example) => example.id === exampleIdFromSession)
      ) {
        setExampleId(exampleIdFromSession);
        setImportedDataset(null);
      }
      setRadius(
        clampInteger(session.generation.radius, 0, graphPreset.maxRadius),
      );
      setBackendId(session.generation.backend);
      setMode(
        session.view.mode === "geometric-projection" ? "geometric" : "shell",
      );
      setGraphView(
        session.view.mode === "local-topology" ? "on-graph" : "global",
      );
      setLabelScope(
        session.view.labelScope === "none"
          ? "off"
          : session.view.labelScope === "all"
            ? "budgeted"
            : "focused",
      );
      setSelectedNodeId(session.view.selectedNodeId ?? "e");
      setSelectedCellId(session.view.selectedCellId);
      setActiveGeneratorPairKey(session.view.activeGeneratorPairKey);
      setGameWorkflowKind(
        session.experiments.game?.workflowKind ?? "generator-uniform-cochain",
      );
      setJnwDraft(
        session.experiments.game?.jnwLegalSystem
          ? {
              sourceKey: `${session.experiments.game.jnwLegalSystem.sourceSystemName}:${session.experiments.game.jnwLegalSystem.moves.length}`,
              moveSystem: {
                id: "restored-jnw-moves",
                label: "Restored JNW moves",
                moves: session.experiments.game.jnwLegalSystem.moves,
              },
              initialState: createJnwState(
                session.experiments.game.jnwLegalSystem.initialState,
              ),
            }
          : undefined,
      );
      const restoredJnwReader =
        session.experiments.game?.jnwLegalSystem?.reader;
      if (restoredJnwReader) {
        if (restoredJnwReader.mode) {
          setJnwReaderMode(restoredJnwReader.mode);
        }
        if (restoredJnwReader.lens) {
          setJnwReaderLens(restoredJnwReader.lens);
        }
        if (restoredJnwReader.railGrouping) {
          setJnwRailGrouping(restoredJnwReader.railGrouping);
        }
        if (restoredJnwReader.selectedStateId) {
          setSelectedJnwStateId(restoredJnwReader.selectedStateId);
        }
        if (restoredJnwReader.selectedRelationId) {
          setSelectedCellId(restoredJnwReader.selectedRelationId);
        }
        if (restoredJnwReader.selectedGenerator !== undefined) {
          setSelectedJnwGenerator(restoredJnwReader.selectedGenerator);
        }
        if (restoredJnwReader.constructionStage) {
          setJnwQuotientConstructionStage(restoredJnwReader.constructionStage);
        }
      }
      setGameDraft(
        session.experiments.game
          ? {
              datasetId:
                session.dataset.activeDatasetId ??
                session.dataset.activeExampleId ??
                "I2_5",
              assignment: createGeneratorGameAssignment(
                Math.max(
                  1,
                  Math.max(
                    -1,
                    ...session.experiments.game.generatorValues.map(
                      (state) => state.generator,
                    ),
                  ) + 1,
                ),
                session.experiments.game.generatorUniformCochain
                  ?.generatorValues ?? session.experiments.game.generatorValues,
                {
                  id:
                    session.experiments.game.activeAssignmentId ??
                    "working-generator-cochain",
                  cocycleId:
                    session.experiments.game.activeCocycleId ??
                    "working-generator-cochain-cocycle",
                },
              ),
            }
          : undefined,
      );
      setShowCells(session.view.showRankTwoCells);
      setShowHigherCells(session.view.showHigherCells);
      setShowNodeLabels(session.view.showNodeLabels);
      setShowEdgeLabels(session.view.showEdgeLabels);
      setRecentSessions(session.files.recent);
      setSavedSessionSnapshot(createProjectSessionSnapshot(session));
      setSessionBaselineReady(true);
      setDesktopMessage(`Opened ${session.project.label}.`);
    },
    [examples, graphPreset.maxRadius],
  );

  const openNativeProjectSession = useCallback(async () => {
    if (!(await confirmSessionDiscard("open another session"))) {
      return;
    }
    const result = await desktopBridge.openProjectSession();
    if (!result.ok || !result.contents) {
      setDesktopMessage(result.message ?? "No project session was opened.");
      return;
    }
    const parsed = importProjectSession(
      result.contents,
      result.path ?? ".coxeter-session.json",
    );
    if (!parsed.ok) {
      setDesktopMessage(parsed.errors.map((issue) => issue.message).join(" "));
      return;
    }
    applyProjectSessionState(parsed.value);
  }, [applyProjectSessionState, confirmSessionDiscard, desktopBridge]);

  const chooseNativeWorkspace = useCallback(async () => {
    const status = await desktopBridge.pickWorkspace();
    setDesktopStatus(status);
    setDesktopMessage(
      status.message ?? `Workspace: ${status.workspace.label}.`,
    );
  }, [desktopBridge]);

  const refreshDesktopTools = useCallback(async () => {
    const tools = await desktopBridge.detectExternalTools();
    setDesktopTools(tools);
    setDesktopMessage(
      tools.length > 0
        ? `${tools.filter((tool) => tool.found).length}/${tools.length} optional tools detected.`
        : "External tool detection is available in the desktop app.",
    );
  }, [desktopBridge]);

  const startDesktopJob = useCallback(
    async (
      kind:
        | "detectTools"
        | "collectDiagnostics"
        | "validateWorkspace"
        | "backendComparison",
    ) => {
      const job = await desktopBridge.startDesktopJob({
        kind,
        workspacePath: desktopStatus?.workspace.rootPathHint,
      });
      setDesktopJobs((jobs) => [
        job,
        ...jobs.filter((item) => item.id !== job.id),
      ]);
      setDesktopMessage(`Desktop job ${job.id}: ${job.message}`);
    },
    [desktopBridge, desktopStatus?.workspace.rootPathHint],
  );

  const revealWorkspaceArtifacts = useCallback(async () => {
    const path = desktopStatus?.workspace.rootPathHint;
    if (!path) {
      setDesktopMessage(
        "Choose a research workspace before opening artifacts.",
      );
      return;
    }
    const result = await desktopBridge.revealPath(path);
    setDesktopMessage(
      result.message ??
        (result.ok
          ? "Opened workspace folder."
          : "Could not open workspace folder."),
    );
  }, [desktopBridge, desktopStatus?.workspace.rootPathHint]);

  const exportDesktopDiagnostics = useCallback(async () => {
    const result = await desktopBridge.exportDiagnosticBundle(
      desktopStatus?.workspace.rootPathHint,
    );
    if (!result.ok && result.fallbackDownload) {
      downloadText(
        "coxeter-viewer-diagnostics.json",
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "coxeter-viewer-browser-diagnostics",
            createdAt: new Date().toISOString(),
            runtime: desktopStatus?.runtime ?? "browser",
            sceneStats: latestSceneStatsRef.current,
            warnings,
          },
          null,
          2,
        ),
      );
    }
    setDesktopMessage(
      result.ok
        ? `Diagnostic bundle written${result.path ? ` to ${result.path}` : ""}.`
        : (result.message ?? "Downloaded browser diagnostic bundle."),
    );
  }, [
    desktopBridge,
    desktopStatus?.runtime,
    desktopStatus?.workspace.rootPathHint,
    warnings,
  ]);

  const exportQuotientBuildRequest = () => {
    setQuotientBuilderError(null);
    const result = createQuotientBuildInput({
      sourceSystem: system,
      subgroupText: quotientSubgroupText,
      maxCosets: quotientMaxCosets,
      subgroupName: quotientSubgroupText.trim()
        ? "browser subgroup"
        : "identity subgroup",
      requestedBackend: "sage",
      includeGamePreset: system.name === "I2(5)" ? "i2-5-height" : "zero",
      notes: [
        "Build request exported by the browser UI. External Sage/GAP scripts must enumerate and certify the quotient action.",
      ],
    });
    if (result.errors.length > 0 || !result.request) {
      setQuotientBuilderError(result.errors.join(" "));
      return;
    }
    void requestNativeExport({
      kind: "quotient-build-request",
      fileName: `${system.name.replace(/\W+/g, "_")}_quotient-build-request.json`,
      contents: JSON.stringify(result.request, null, 2),
      mediaType: "application/json",
    });
  };

  const openBaseOrbicomplex = () => {
    const quotient = baseOrbicomplexForSystem(system);
    const defaultPairKey = firstFinitePairKey(system);
    const startInRankThreeFocus = yGammaRankThreeFocus !== undefined;
    const focusPairKey =
      activeGeneratorPairKey ??
      yGammaRankThreeFocus?.pairKeys[0] ??
      defaultPairKey;
    setImportedDataset({
      kind: "quotient-complex",
      id: `base-orbicomplex:${activeDataset.id}`,
      label: `${quotient.name} (one-vertex complex)`,
      quotient,
      ball: quotientToGeneratedBall(quotient),
      sourceSystem: system,
    });
    setSelectedNodeId("*");
    setRootNodeId("*");
    setSelectedCellId(undefined);
    setDisabledPairs(new Set());
    setDisabledHigherSubsets(new Set());
    setActiveGeneratorPairKey(focusPairKey);
    setYGammaShowAllFaces(false);
    setYGammaRankThreeFocusEnabled(startInRankThreeFocus);
    setYGammaFocusPreset(
      startInRankThreeFocus ? "rank-three-cell" : "one-relation",
    );
    setYGammaPeelMode(
      startInRankThreeFocus ? "same-rank-three" : "selected-face",
    );
    setYGammaTopologyMode(true);
    setYGammaCameraBookmark("rank-three-cell");
    setHoveredCellId(undefined);
    setMode("shell");
    setGraphView("global");
    setLocalDepth(1);
    setActivePreset("rank-two-cells");
    setCellRenderMode("in-graph");
    setCellFocusMode("all-local");
    setCellNeighborhoodMode("chamber");
    setRelationWalkMode("numbered");
    setOcclusionMode("x-ray");
    setLabelScope("focused");
    setShowCells(true);
    setShowHigherCells(true);
    setYGammaMainView("complex");
    setFocusSignal((value) => value + 1);
  };

  const openDefiningGraph = () => {
    if (!activeIsYGammaBaseComplex && !sourceSystem) {
      openBaseOrbicomplex();
    }
    setYGammaMainView("gamma");
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("budgeted");
    setShowCells(false);
    setSelectedCellId(undefined);
    setActiveGeneratorPairKey(undefined);
    setHoveredCellId(undefined);
    setFocusSignal((value) => value + 1);
  };

  const showDavisComplexForSource = (targetMode: ViewerMode = "shell") => {
    if (!activeIsYGammaBaseComplex || !sourceSystem) {
      setYGammaMainView("complex");
      setMode(targetMode);
      return;
    }
    const existingExample = examples.find(
      (example) => example.input.name === sourceSystem.name,
    );
    if (existingExample) {
      setExampleId(existingExample.id);
    } else {
      const id = `source:${sourceSystem.name.replace(/\W+/g, "_")}`;
      setImportedExample({
        id,
        label: sourceSystem.name,
        input: sourceSystem,
      });
      setExampleId(id);
    }
    setImportedDataset(null);
    resetSelectionForImport();
    setMode(targetMode);
    setGraphView("global");
    setShowCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("budgeted");
    setTopologyLens({ id: "generator-star", selectedGenerator: 0 });
    setFocusSignal((value) => value + 1);
  };

  const openProjectionView = () => {
    if (!geometryAvailable) {
      return;
    }
    showDavisComplexForSource("geometric");
  };

  const openQuotientAndGames = () => {
    if (activeDataset.kind !== "quotient-complex") {
      openBaseOrbicomplex();
    }
    setUiMode("research");
    setShowAdvancedPanels(true);
  };

  const setActiveGameDraftAssignment = (
    assignment: EditableGameAssignment | undefined,
  ) => {
    setGameDraft(
      assignment ? { datasetId: activeDataset.id, assignment } : undefined,
    );
  };

  const setActiveJnwDraft = (
    moveSystem: JnwMoveSystem,
    initialState: JnwState,
  ) => {
    setJnwDraft({ sourceKey: jnwSourceKey, moveSystem, initialState });
    setSelectedJnwStateId(initialState.id);
    setGammaHighlightedJnwStateId(initialState.id);
  };

  const updateJnwInitialState = (generator: number, enabled: boolean) => {
    const nextGenerators = enabled
      ? [...activeJnwInitialState.generators, generator]
      : activeJnwInitialState.generators.filter((entry) => entry !== generator);
    setActiveJnwDraft(activeJnwMoveSystem, createJnwState(nextGenerators));
  };

  const updateJnwMoveToggle = (
    moveGenerator: number,
    toggledGenerator: number,
    enabled: boolean,
  ) => {
    setActiveJnwDraft(
      {
        ...activeJnwMoveSystem,
        id: "jnw-custom-moves",
        label: "Custom JNW moves",
        moves: activeJnwMoveSystem.moves.map((move) => {
          if (move.generator !== moveGenerator) {
            return move;
          }
          const toggles = enabled
            ? [...move.toggles, toggledGenerator]
            : move.toggles.filter((entry) => entry !== toggledGenerator);
          return {
            ...move,
            toggles: [...new Set(toggles)].sort((left, right) => left - right),
          };
        }),
      },
      activeJnwInitialState,
    );
  };

  const applyJnwPreset = (
    preset: "singletons" | "bipartite" | "clear" | "invert-state",
  ) => {
    if (preset === "invert-state") {
      const current = new Set(activeJnwInitialState.generators);
      setActiveJnwDraft(
        activeJnwMoveSystem,
        createJnwState(
          Array.from({ length: jnwSourceSystem.rank }, (_unused, generator) =>
            current.has(generator) ? -1 : generator,
          ).filter((generator) => generator >= 0),
        ),
      );
      return;
    }

    if (preset === "bipartite") {
      const bipartite = createBipartiteJnwMoveSystem(jnwSourceSystem);
      if (bipartite) {
        setActiveJnwDraft(bipartite, activeJnwInitialState);
      }
      return;
    }

    setActiveJnwDraft(
      createDefaultJnwMoveSystem(jnwSourceSystem),
      preset === "clear"
        ? createJnwState([])
        : createDefaultJnwState(jnwSourceSystem),
    );
  };

  const openJnwStateQuotient = (
    requestedStateId = activeJnwInitialState.id,
  ) => {
    // The expensive orbit is normally lazy. An explicit "open" action is the
    // one safe synchronous fallback when this handler came from the inactive
    // workflow card before React committed the workflow-kind change.
    const summary =
      jnwSummary ??
      summarizeJnwLegalSystem(
        jnwSourceSystem,
        activeJnwMoveSystem,
        activeJnwInitialState,
      );
    const quotient =
      jnwDerivedQuotient ?? jnwOrbitToQuotientComplex(jnwSourceSystem, summary);
    const selectedStateId = quotient.vertices.some(
      (vertex) => vertex.id === requestedStateId,
    )
      ? requestedStateId
      : (quotient.vertices[0]?.id ?? "jnw:state:empty");
    setImportedDataset({
      kind: "quotient-complex",
      id: `jnw:${jnwSourceKey}`,
      label: quotient.name,
      quotient,
      ball: quotientToGeneratedBall(quotient),
      sourceSystem: jnwSourceSystem,
    });
    setGameWorkflowKind("jnw-legal-system");
    setUiMode("research");
    setShowAdvancedPanels(true);
    setSelectedNodeId(selectedStateId);
    setRootNodeId(selectedStateId);
    setSelectedJnwStateId(selectedStateId);
    setGammaHighlightedJnwStateId(selectedStateId);
    setSelectedCellId(undefined);
    setYGammaMainView("complex");
    setMode("shell");
    setGraphView("global");
    setShowCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("budgeted");
    setJnwReaderMode("readable-chart");
    setJnwReaderLens("none");
    setJnwRailGrouping("individual");
    setSelectedJnwGenerator(0);
    setJnwQuotientSheetMode("glass");
    setJnwQuotientConstructionStage(4);
    setTopologyLens({ id: "state-quotient-orbit" });
    setFocusSignal((value) => value + 1);
  };

  const openJnwStateQuotientLens = (lensId: TopologyLensId) => {
    const selectedStateId =
      activeJnwSelectedState?.id ?? activeJnwInitialState.id;
    openJnwStateQuotient(selectedStateId);
    setJnwReaderLens(jnwReaderLensForTopologyLens(lensId, "state"));
    if (isQuotientLinkLens(lensId)) {
      setJnwQuotientConstructionStage(5);
    }
    setTopologyLens({
      id: lensId,
      selectedGenerator: topologyLens.selectedGenerator,
    });
  };

  const selectJnwState = (stateId: string) => {
    setSelectedJnwStateId(stateId);
    setGammaHighlightedJnwStateId(stateId);
    setJnwReaderLens("state");
    if (activeIsJnwStateQuotient) {
      setSelectedNodeId(stateId);
      setRootNodeId(stateId);
    }
    setFocusSignal((value) => value + 1);
  };

  const showJnwStateOnGamma = (stateId: string) => {
    const state = jnwSummary?.states.find((entry) => entry.id === stateId);
    const nextStateId = state?.id ?? stateId;
    setSelectedJnwStateId(nextStateId);
    setGammaHighlightedJnwStateId(nextStateId);
    openDefiningGraph();
    setSceneLayoutSignal((value) => value + 1);
  };

  const selectJnwGlueGenerator = (generator: number) => {
    if (activeIsJnwStateQuotient) {
      setTopologyLens({ id: "state-quotient-orbit" });
    } else {
      openJnwStateQuotient(activeJnwSelectedState?.id);
    }
    setSelectedJnwGenerator(generator);
    setJnwReaderLens("glue");
    setJnwRailGrouping("individual");
  };

  const focusJnwDiagnostic = (diagnosticId: string) => {
    openJnwStateQuotient();
    setJnwReaderLens("relation");
    setJnwRailGrouping("individual");
    setSelectedCellId(diagnosticId);
    setActiveGeneratorPairKey(
      pairKey(
        jnwSummary?.rankTwoDiagnostics.find(
          (diagnostic) => diagnostic.id === diagnosticId,
        )?.generatorPair ?? [0, 1],
      ),
    );
    setCellFocusMode("selected-cell");
    setRelationWalkMode("numbered");
    setJnwQuotientSheetMode("glass");
    setJnwQuotientConstructionStage(4);
  };

  const updateGameGeneratorValue = (generator: number, value: number) => {
    if (!activeEditableGameAssignment) {
      return;
    }
    setActiveGameDraftAssignment(
      updateEditableGameAssignmentValue(
        activeEditableGameAssignment,
        generator,
        value,
      ),
    );
  };

  const applyGamePreset = (preset: "zero" | "height" | "invert" | "clear") => {
    if (!activeEditableGameAssignment || !activeQuotientRank) {
      return;
    }
    if (preset === "clear") {
      setActiveGameDraftAssignment(undefined);
      return;
    }
    if (preset === "invert") {
      setActiveGameDraftAssignment(
        invertGeneratorAssignment(activeEditableGameAssignment),
      );
      return;
    }
    if (preset === "zero") {
      setActiveGameDraftAssignment(
        createGeneratorGameAssignment(
          activeQuotientRank,
          activeEditableGameAssignment.generatorValues.map((state) => ({
            generator: state.generator,
            value: 0,
          })),
          gameAssignmentOptionsFromEditable(activeEditableGameAssignment),
        ),
      );
      return;
    }

    const pair =
      activeGeneratorPairKey !== undefined
        ? parsePairKey(activeGeneratorPairKey)
        : activeQuotient?.twoCells[0]?.generatorPair;
    setActiveGameDraftAssignment(
      createGeneratorGameAssignment(
        activeQuotientRank,
        activeEditableGameAssignment.generatorValues.map((state) => ({
          generator: state.generator,
          value:
            pair && state.generator === pair[0]
              ? 1
              : pair && state.generator === pair[1]
                ? -1
                : 0,
        })),
        gameAssignmentOptionsFromEditable(activeEditableGameAssignment),
      ),
    );
  };

  const focusGameBoundaryCell = (cellId: string) => {
    const cell = activeQuotient?.twoCells.find((entry) => entry.id === cellId);
    if (!cell) {
      return;
    }
    setSelectedCellId(cell.id);
    setActiveGeneratorPairKey(pairKey(cell.generatorPair));
    setRelationWalkMode("numbered");
    setCellFocusMode("selected-cell");
    if (activeIsYGammaBaseComplex) {
      setYGammaMainView("complex");
      setYGammaFocusPreset("one-relation");
    }
    setFocusSignal((value) => value + 1);
  };

  const focusPairByKey = (key: string) => {
    setYGammaRankThreeFocusEnabled(false);
    if (activeIsYGammaBaseComplex) {
      setYGammaMainView("complex");
      setYGammaFocusPreset("one-relation");
      setYGammaPeelMode("selected-face");
      setYGammaCameraBookmark("front");
      applyYGammaCellSeparation("readable");
      setYGammaTopologyMode(true);
      setHoveredCellId(undefined);
      setShowHigherCells(false);
    }
    setActiveGeneratorPairKey(key);
    setGraphView("on-graph");
    setShowCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");
    setCellRenderMode("in-graph");
    setCellFocusMode("selected-cell");
    setCellNeighborhoodMode("cell-boundary");
    setRelationWalkMode("numbered");
    setOcclusionMode("fade-far");
    setDisabledPairs((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    const representative = chooseFocusedRankTwoCell({
      cells: ball?.twoCells ?? [],
      selectedCell: undefined,
      activePairKey: key,
      selectedNodeId: selectedNode?.id,
    });
    setSelectedCellId(representative?.id);
    setFocusSignal((value) => value + 1);
  };

  const focusRankThreeCell = (pairKeyToView?: string) => {
    const focus =
      pairKeyToView && yGammaAtlas
        ? findRankThreeFocusContainingPair(yGammaAtlas, pairKeyToView)
        : yGammaRankThreeFocus;
    if (!focus) {
      return;
    }
    const pairToView =
      pairKeyToView ?? activeGeneratorPairKey ?? focus.pairKeys[0];
    setYGammaMainView("complex");
    setShowHigherCells(true);
    setYGammaShowAllFaces(false);
    setYGammaRankThreeFocusEnabled(true);
    setYGammaFocusPreset("rank-three-cell");
    setYGammaPeelMode("same-rank-three");
    applyYGammaCellSeparation("readable");
    setYGammaTopologyMode(true);
    setActiveGeneratorPairKey(pairToView);
    setYGammaCameraBookmark("rank-three-cell");
    setShowCells(true);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setLabelScope("focused");
    setCellRenderMode("in-graph");
    setOcclusionMode("x-ray");
    setFocusSignal((value) => value + 1);
  };

  const togglePairByKey = (key: string) => {
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset("one-relation");
    setActiveGeneratorPairKey(key);
    setDisabledPairs((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllRankTwoPairs = (enabled: boolean) => {
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset(enabled ? "full-skeleton" : "one-relation");
    applyYGammaCellSeparation(enabled ? "expanded" : "readable");
    setDisabledPairs(
      enabled ? new Set() : new Set(pairOptions.map((option) => option.key)),
    );
  };

  const showOnlyM3Pairs = () => {
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset("m3-hexagons");
    setYGammaCameraBookmark("hexagon-family");
    applyYGammaCellSeparation("expanded");
    setShowCells(true);
    setDisabledPairs(
      new Set(
        pairOptions
          .filter((option) => option.m !== 3)
          .map((option) => option.key),
      ),
    );
    setCellFocusMode("all-local");
    setCellNeighborhoodMode("chamber");
  };

  const showOnlyActivePair = () => {
    setYGammaRankThreeFocusEnabled(false);
    setYGammaFocusPreset("one-relation");
    if (!activeGeneratorPairKey) {
      return;
    }
    setDisabledPairs(
      new Set(
        pairOptions
          .filter((option) => option.key !== activeGeneratorPairKey)
          .map((option) => option.key),
      ),
    );
    focusPairByKey(activeGeneratorPairKey);
  };

  const extractYGammaRelationStar = () => {
    if (!yGammaAtlas) {
      return;
    }
    const defaultRelationCell =
      yGammaAtlas.rankTwoCells.find(
        (cell) => typeof cell.m === "number" && cell.m > 2,
      ) ?? yGammaAtlas.rankTwoCells[0];
    const key =
      activeGeneratorPairKey ??
      (defaultRelationCell
        ? relationCellPairKey(defaultRelationCell.generators)
        : undefined);
    if (!key) {
      return;
    }
    setYGammaMainView("complex");
    setActiveGeneratorPairKey(key);
    setYGammaFocusPreset("one-relation");
    setYGammaRankThreeFocusEnabled(false);
    setYGammaShowAllFaces(true);
    setYGammaRelationStarActive(true);
    setYGammaCutawayMode("incident-to-selected-relation");
    setYGammaPeelMode("all");
    applyYGammaCellSeparation("expanded");
    setYGammaTopologyMode(true);
    setShowHigherCells(true);
    setShowCells(true);
    setShowEdgeLabels(true);
    setShowNodeLabels(true);
    setLabelScope("focused");
    setYGammaCameraPath("relation-star");
    setYGammaCameraBookmark("rank-three-cell");
    setFocusSignal((value) => value + 1);
  };

  const applyYGammaStarLens = (lens: YGammaStarLens) => {
    if (lens === "generator-star") {
      setYGammaCutawayMode("generator-family");
      setYGammaRelationStarActive(false);
      applyYGammaNarratedPreset("around-generator");
      return;
    }
    if (lens === "edge-star") {
      setYGammaCutawayMode("incident-to-selected-edge");
      setYGammaRelationStarActive(false);
      applyYGammaNarratedPreset("around-generator");
      return;
    }
    if (lens === "relation-star") {
      extractYGammaRelationStar();
      return;
    }
    if (lens === "rank-three-cell-star") {
      setYGammaCutawayMode("rank");
      setYGammaRelationStarActive(false);
      focusRankThreeCell();
      return;
    }
    setTopologyLens({
      id: lens === "jnw-ascending-star" ? "ascending-link" : "descending-link",
      selectedGenerator: yGammaFocusGenerator,
    });
    setYGammaRelationStarActive(false);
    setFocusSignal((value) => value + 1);
  };

  const runYGammaCameraPath = (path: YGammaCameraPath) => {
    setYGammaCameraPath(path);
    if (path === "none") {
      setFocusSignal((value) => value + 1);
      return;
    }
    if (path === "selected-relation") {
      snapYGammaCamera("front");
    } else if (path === "square-family") {
      snapYGammaCamera("square-family");
    } else if (path === "hexagon-family") {
      snapYGammaCamera("hexagon-family");
    } else if (path === "shared-generator") {
      setYGammaCutawayMode("generator-family");
      snapYGammaCamera("top");
    } else {
      extractYGammaRelationStar();
    }
  };

  const applyYGammaNarratedPreset = (preset: YGammaFocusPreset) => {
    if (!yGammaAtlas) {
      return;
    }
    const firstPair = yGammaAtlas.rankTwoCells[0];
    const firstM2 = yGammaAtlas.rankTwoCells.find((cell) => cell.m === 2);
    const firstM3 = yGammaAtlas.rankTwoCells.find((cell) => cell.m === 3);
    setYGammaMainView("complex");
    setYGammaFocusPreset(preset);
    setShowCells(true);
    setShowEdgeLabels(true);
    setShowNodeLabels(true);
    setLabelScope("focused");
    setHoveredCellId(undefined);
    setYGammaRelationStarActive(false);
    setYGammaCutawayMode("none");
    setYGammaCameraPath("none");

    if (preset === "one-relation") {
      const key =
        activeGeneratorPairKey ??
        (firstPair ? relationCellPairKey(firstPair.generators) : undefined);
      if (key) {
        setActiveGeneratorPairKey(key);
      }
      setYGammaRankThreeFocusEnabled(false);
      setYGammaShowAllFaces(false);
      setYGammaPeelMode("selected-face");
      applyYGammaCellSeparation("readable");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("front");
    } else if (preset === "rank-three-cell") {
      setYGammaRankThreeFocusEnabled(Boolean(yGammaRankThreeFocus));
      setYGammaShowAllFaces(false);
      setYGammaPeelMode("same-rank-three");
      applyYGammaCellSeparation("readable");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("rank-three-cell");
      if (yGammaRankThreeFocus && !activeGeneratorPairKey) {
        setActiveGeneratorPairKey(yGammaRankThreeFocus.pairKeys[0]);
      }
    } else if (preset === "around-generator") {
      setYGammaRankThreeFocusEnabled(false);
      setYGammaShowAllFaces(true);
      setYGammaPeelMode("all");
      applyYGammaCellSeparation("expanded");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("front");
      setActiveGeneratorPairKey(undefined);
    } else if (preset === "m2-squares") {
      if (firstM2) {
        setActiveGeneratorPairKey(relationCellPairKey(firstM2.generators));
      }
      setYGammaRankThreeFocusEnabled(Boolean(yGammaRankThreeFocus));
      setYGammaPeelMode("all");
      applyYGammaCellSeparation("expanded");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("square-family");
    } else if (preset === "m3-hexagons") {
      if (firstM3) {
        setActiveGeneratorPairKey(relationCellPairKey(firstM3.generators));
      }
      setYGammaRankThreeFocusEnabled(Boolean(yGammaRankThreeFocus));
      setYGammaPeelMode("all");
      applyYGammaCellSeparation("expanded");
      setYGammaTopologyMode(true);
      setYGammaCameraBookmark("hexagon-family");
    } else {
      setYGammaRankThreeFocusEnabled(false);
      setYGammaShowAllFaces(true);
      setYGammaPeelMode("all");
      applyYGammaCellSeparation("expanded");
      setYGammaTopologyMode(false);
      setActiveGeneratorPairKey(undefined);
      setYGammaCameraBookmark("front");
    }
    setFocusSignal((value) => value + 1);
  };

  const snapYGammaCamera = (bookmark: YGammaCameraBookmark) => {
    setYGammaCameraBookmark(bookmark);
    const squarePair = yGammaRankThreeFocusPairs.find((pair) => pair.m === 2);
    const hexagonPair = yGammaRankThreeFocusPairs.find((pair) => pair.m === 3);
    if (bookmark === "square-family" && squarePair) {
      setActiveGeneratorPairKey(squarePair.key);
    }
    if (bookmark === "hexagon-family" && hexagonPair) {
      setActiveGeneratorPairKey(hexagonPair.key);
    }
    setFocusSignal((value) => value + 1);
  };

  const applyGuidedInspectionPreset = (id: GuidedInspectionId) => {
    const firstPair = pairOptions[0]?.key ?? firstFinitePairKey(system);
    setShowNodeLabels(true);
    setShowEdgeLabels(true);
    setShowCells(true);
    setRelationWalkMode("numbered");

    if (id === "one-relation" || id === "find-a-hexagon") {
      setMode("shell");
      setGraphView("on-graph");
      setLocalDepth(2);
      setCellFocusMode("selected-cell");
      setCellNeighborhoodMode("cell-boundary");
      setOcclusionMode("fade-far");
      setLabelScope("focused");
      if (firstPair) {
        focusPairByKey(firstPair);
      }
      return;
    }

    if (id === "local-link") {
      setMode("shell");
      setGraphView("on-graph");
      setLocalDepth(1);
      setCellFocusMode("incident-selected");
      setCellNeighborhoodMode("chamber");
      setOcclusionMode("hide-far");
      setLabelScope("focused");
      setShowAdvancedPanels(false);
      setFocusSignal((value) => value + 1);
      return;
    }

    if (id === "rank-three-cell" || id === "understand-rank-three-cell") {
      if (!activeIsYGammaBaseComplex) {
        openBaseOrbicomplex();
      }
      applyYGammaNarratedPreset("rank-three-cell");
      setShowAdvancedPanels(false);
      return;
    }

    if (id === "ygamma-2-skeleton" || id === "inspect-ygamma") {
      if (!activeIsYGammaBaseComplex) {
        openBaseOrbicomplex();
      }
      applyYGammaNarratedPreset("full-skeleton");
      setShowAdvancedPanels(false);
      return;
    }

    if (id === "quotient-game" || id === "quotient-game-experiment") {
      loadI25WorkflowQuotient();
      setTopologyLens({ id: "ascending-link", selectedGenerator: 0 });
      setShowAdvancedPanels(true);
      return;
    }

    if (
      !activeIsYGammaBaseComplex &&
      activeDataset.kind !== "quotient-complex"
    ) {
      openBaseOrbicomplex();
    }
    setShowAdvancedPanels(true);
    setYGammaMainView("complex");
    setYGammaFocusPreset("one-relation");
    setYGammaTopologyMode(true);
    setLabelScope("focused");
  };

  const startGuidedInspection = (id: GuidedInspectionId) => {
    setGuidedInspection({ id, stepIndex: 0 });
    applyGuidedInspectionPreset(id);
  };

  const runStartHereAction = (id: StartHereActionId) => {
    setUiMode(id === "study-quotient-game" ? "research" : "teaching");
    setShowAdvancedPanels(id === "study-quotient-game");
    setTeachingLocalLinkOpen(false);

    if (id === "explore-coxeter-example") {
      showDavisComplexForSource();
      applyViewPreset("local-chamber", { persist: false });
      setDesktopMessage(
        "Local chamber view shows the selected chamber, generator steps, nearby cells, and focused labels.",
      );
      return;
    }

    if (id === "find-relation-cell") {
      startGuidedInspection("one-relation");
      setDesktopMessage(
        "Relation focus shows one finite rank-two cell and its boundary labels.",
      );
      return;
    }

    if (id === "understand-ygamma") {
      startGuidedInspection("inspect-ygamma");
      setDesktopMessage(
        "Y_Gamma is the one-vertex fundamental-domain model; its 3D placement is a readability drawing.",
      );
      return;
    }

    if (id === "study-quotient-game") {
      loadJnwCubeWorkflow();
      setGuidedInspection({ id: "quotient-game-experiment", stepIndex: 0 });
      setDesktopMessage(
        "Loaded the JNW cube graph legal-system demo. The I2(5) quotient/cocycle demo remains available in Research Workflow.",
      );
      return;
    }

    setUiMode("research");
    setShowAdvancedPanels(true);
    setEightFacetCatalogueOpen(true);
    setEightFacetCatalogueFilter("all");
    setEightFacetCatalogueQuery("");
    setDesktopMessage(
      "Research mode exposes data status, certificates, backend tools, the example catalogue, and caveats.",
    );
  };

  const moveGuidedInspection = (delta: number) => {
    setGuidedInspection((current) =>
      current ? moveGuidedInspectionStep(current, delta) : current,
    );
  };

  const runGalleryAction = (entryId: string) => {
    if (entryId === "walkthrough:hexagon") {
      startGuidedInspection("find-a-hexagon");
      return;
    }
    if (entryId === "walkthrough:rank-three") {
      startGuidedInspection("understand-rank-three-cell");
      return;
    }
    if (entryId === "quotient:i2-5") {
      loadI25WorkflowQuotient();
      setUiMode("research");
      return;
    }
    if (entryId === "jnw:cube-graph") {
      loadJnwCubeWorkflow();
      return;
    }
    if (entryId === "compact:5-cube") {
      void handleExampleChange("compact_5_cube_gamma1");
      setActivePreset("local-chamber");
      setGraphView("on-graph");
      setGraphPresetId("research");
      setLabelScope("focused");
      return;
    }
    if (entryId === "compact:5-prism") {
      void handleExampleChange("compact_5_prism_makarov");
      setActivePreset("local-chamber");
      setGraphView("on-graph");
      setGraphPresetId("research");
      setLabelScope("focused");
      return;
    }
    if (entryId === "compact:5-polytope-p1") {
      void handleExampleChange("compact_5_polytope_p1_double_makarov");
      setActivePreset("local-chamber");
      setGraphView("on-graph");
      setGraphPresetId("research");
      setLabelScope("focused");
      return;
    }
    if (entryId === "compact:5-prism-p2") {
      void handleExampleChange("compact_5_prism_makarov_p2");
      setActivePreset("local-chamber");
      setGraphView("on-graph");
      setGraphPresetId("research");
      setLabelScope("focused");
      return;
    }
    if (entryId.startsWith("catalogue:8facet:")) {
      const requestedIndex = entryId.split(":").at(-1);
      setUiMode("research");
      setShowAdvancedPanels(true);
      setEightFacetCatalogueOpen(true);
      setEightFacetCatalogueFilter("all");
      setEightFacetCatalogueQuery(
        requestedIndex && requestedIndex !== "all" ? requestedIndex : "",
      );
      setDesktopMessage(
        "Tumarkin Table 4.10 entries are certified examples. Use Load example in the catalogue to open one without cluttering the main gallery.",
      );
    }
  };

  const stepByGenerator = (generator: number) => {
    const step = generatorSteps.find((entry) => entry.generator === generator);
    if (!step?.targetNodeId) {
      return;
    }
    setSelectedNodeId(step.targetNodeId);
    setSelectedCellId(undefined);
    setCellFocusMode("incident-selected");
    setCellNeighborhoodMode("chamber");
    if (graphView !== "on-graph") {
      setGraphView("on-graph");
    }
  };

  const handleSceneSelectNode = useCallback(
    (nodeId: string) => {
      if (showingYGammaComplex) {
        return;
      }
      if (showingGammaDefiningGraph) {
        const match = /^Gamma:v:(\d+)$/.exec(nodeId);
        if (match) {
          setSelectedGammaGenerator(Number(match[1]));
          setSelectedCellId(undefined);
        }
        return;
      }
      setSelectedNodeId(nodeId);
      setSelectedCellId(undefined);
      setCellFocusMode("incident-selected");
      setCellNeighborhoodMode("chamber");
    },
    [
      setSelectedGammaGenerator,
      showingGammaDefiningGraph,
      showingYGammaComplex,
    ],
  );

  const handleSceneSelectCell = useCallback(
    (cellId: string) => {
      const sourceCellId =
        jnwStateYGammaOrbitScene?.sourceCellIdByRenderedId?.get(cellId) ??
        cellId;
      setSelectedCellId(sourceCellId);
      if (showingYGammaComplex && yGamma2SkeletonScene) {
        const cell = yGamma2SkeletonScene.cells.find(
          (entry) => entry.id === cellId,
        );
        if (cell) {
          setActiveGeneratorPairKey(pairKey(cell.generatorPair));
          setYGammaFocusPreset("one-relation");
          setShowCells(true);
          setShowEdgeLabels(true);
          setLabelScope("focused");
          setFocusSignal((value) => value + 1);
          return;
        }
      }
      const cell = ballIndexes.twoCellsById.get(sourceCellId);
      if (cell) {
        setActiveGeneratorPairKey(pairKey(cell.generatorPair));
        setCellFocusMode("selected-cell");
        setCellNeighborhoodMode("cell-boundary");
        setRelationWalkMode("numbered");
        setGraphView("on-graph");
        setShowCells(true);
        setLabelScope("focused");
        setFocusSignal((value) => value + 1);
      }
    },
    [
      ballIndexes.twoCellsById,
      jnwStateYGammaOrbitScene,
      showingYGammaComplex,
      yGamma2SkeletonScene,
    ],
  );

  const toggleHigherSubset = (subsetId: string, enabled: boolean) => {
    setDisabledHigherSubsets((current) => {
      const next = new Set(current);
      if (enabled) {
        next.delete(subsetId);
      } else {
        next.add(subsetId);
      }
      return next;
    });
  };

  const exportGraph = useCallback(() => {
    if (!ball) {
      return;
    }
    void requestNativeExport({
      kind: "graph-json",
      fileName: `${system.name.replace(/\W+/g, "_")}_radius_${ball.metadata.radius}.json`,
      contents: JSON.stringify(ball, null, 2),
      mediaType: "application/json",
    });
  }, [ball, requestNativeExport, system.name]);

  const exportLocalNeighborhood = useCallback(() => {
    const payload = buildLocalNeighborhoodExport({
      datasetId: activeDataset.id,
      datasetLabel: activeDataset.label,
      system,
      ball: ball ?? undefined,
      selectedNode,
      visibleNodes: viewNodes,
      visibleEdges: viewEdges,
      visibleCells,
      activePreset,
      graphView,
      localDepth,
      mode: effectiveMode,
      projection,
      labelScope,
      layout: localViewLayout,
      cellRenderMode,
      cellFocusMode,
      cellNeighborhoodMode,
      relationWalkMode,
      occlusionMode,
      disabledPairs,
      activeGeneratorPairKey,
      warnings,
    });
    void requestNativeExport({
      kind: "local-neighborhood",
      fileName: `${system.name.replace(/\W+/g, "_")}_${selectedNode?.id ?? "none"}_local.json`,
      contents: JSON.stringify(payload, null, 2),
      mediaType: "application/json",
    });
  }, [
    activeDataset.id,
    activeDataset.label,
    activeGeneratorPairKey,
    activePreset,
    ball,
    cellFocusMode,
    cellNeighborhoodMode,
    cellRenderMode,
    disabledPairs,
    effectiveMode,
    graphView,
    labelScope,
    localDepth,
    localViewLayout,
    occlusionMode,
    projection,
    relationWalkMode,
    requestNativeExport,
    selectedNode,
    system,
    viewEdges,
    viewNodes,
    visibleCells,
    warnings,
  ]);

  const handleCapturePngReady = useCallback(
    (capture: (() => Promise<string>) | undefined) => {
      captureScenePngRef.current = capture;
    },
    [],
  );

  const captureScenePng = useCallback(async () => {
    const rendererCapture = captureScenePngRef.current;
    if (rendererCapture) {
      return rendererCapture();
    }
    const canvas = document.querySelector<HTMLCanvasElement>(
      ".scene-canvas canvas",
    );
    return canvas?.toDataURL("image/png");
  }, []);

  const exportScreenshot = useCallback(async () => {
    const png = await captureScenePng();
    if (!png) {
      return;
    }
    await requestNativeExport({
      kind: "screenshot",
      fileName: `${system.name.replace(/\W+/g, "_")}_scene.png`,
      contents: png,
      mediaType: "image/png",
      contentEncoding: "data-url",
    });
  }, [captureScenePng, requestNativeExport, system.name]);

  const exportViewBundle = useCallback(async () => {
    await exportScreenshot();
    const payload = {
      schemaVersion: 1,
      kind: "coxeter-view-sidecar",
      dataset: {
        id: activeDataset.id,
        label: activeDataset.label,
        systemName: system.name,
      },
      selectedNodeId: selectedNode?.id,
      selectedWord: selectedNode
        ? {
            generators: selectedNode.word,
            compactLabel: compactWordLabel(
              selectedNode.word,
              system.generators,
            ),
          }
        : undefined,
      filters: {
        disabledGeneratorPairs: [...disabledPairs].sort(),
        activeGeneratorPair: activeGeneratorPairKey,
      },
      view: {
        uiMode,
        preset: activePreset,
        comparisonMode: viewComparisonMode,
        mode: effectiveMode,
        graphView,
        localDepth,
        projection,
        labelScope,
        layout: localViewLayout,
        cellRenderMode,
        cellFocusMode,
        cellNeighborhoodMode,
        relationWalkMode,
        occlusionMode,
        yGammaReadableView: activeIsYGammaBaseComplex
          ? yGammaReadableViewState
          : undefined,
      },
      annotations,
      cameraBookmarks,
      sceneStats: latestSceneStatsRef.current,
      warnings: [...new Set(warnings)].sort(),
    };
    void requestNativeExport({
      kind: "view-bundle",
      fileName: `${system.name.replace(/\W+/g, "_")}_${selectedNode?.id ?? "none"}.view.json`,
      contents: JSON.stringify(payload, null, 2),
      mediaType: "application/json",
    });
  }, [
    activeDataset.id,
    activeDataset.label,
    activeGeneratorPairKey,
    activeIsYGammaBaseComplex,
    activePreset,
    annotations,
    cameraBookmarks,
    cellFocusMode,
    cellNeighborhoodMode,
    cellRenderMode,
    disabledPairs,
    effectiveMode,
    exportScreenshot,
    graphView,
    uiMode,
    labelScope,
    localDepth,
    localViewLayout,
    occlusionMode,
    projection,
    relationWalkMode,
    requestNativeExport,
    selectedNode,
    system,
    warnings,
    viewComparisonMode,
    yGammaReadableViewState,
  ]);

  const addAnnotation = useCallback(() => {
    const body = annotationDraft.trim();
    if (!body) {
      return;
    }
    const targetKind = selectedCellId
      ? "cell"
      : selectedNode?.id
        ? "node"
        : "view";
    const targetId = selectedCellId ?? selectedNode?.id;
    const annotation = createAnnotation({
      label:
        targetId !== undefined
          ? `Note on ${targetId}`
          : `${activeDataset.label} view note`,
      body,
      targetKind,
      targetId,
    });
    setAnnotations((current) => [annotation, ...current].slice(0, 24));
    setAnnotationDraft("");
  }, [activeDataset.label, annotationDraft, selectedCellId, selectedNode?.id]);

  const saveCameraBookmark = useCallback(() => {
    const bookmark = createCameraBookmark({
      label: bookmarkDraft || `${activePreset} ${topologyLens.id}`,
      preset: activePreset,
      topologyLensId: topologyLens.id,
      selectedNodeId: selectedNode?.id,
      selectedCellId,
      activeGeneratorPairKey,
      yGammaCameraBookmark,
    });
    setCameraBookmarks((current) => [bookmark, ...current].slice(0, 24));
    setBookmarkDraft("");
  }, [
    activeGeneratorPairKey,
    activePreset,
    bookmarkDraft,
    selectedCellId,
    selectedNode?.id,
    topologyLens.id,
    yGammaCameraBookmark,
  ]);

  const applyCameraBookmark = useCallback((bookmark: CameraBookmark) => {
    setActivePreset(bookmark.preset);
    setTopologyLens((current) => ({
      ...current,
      id: bookmark.topologyLensId,
    }));
    if (bookmark.selectedNodeId) {
      setSelectedNodeId(bookmark.selectedNodeId);
    }
    setSelectedCellId(bookmark.selectedCellId);
    setActiveGeneratorPairKey(bookmark.activeGeneratorPairKey);
    if (bookmark.yGammaCameraBookmark) {
      setYGammaCameraBookmark(
        bookmark.yGammaCameraBookmark as YGammaCameraBookmark,
      );
    }
    setFocusSignal((value) => value + 1);
  }, []);

  const exportFigureBundle = useCallback(async () => {
    const screenshot = await captureScenePng();
    const payload: FigureExportBundle = {
      schemaVersion: 1,
      kind: "coxeter-figure-export",
      createdAt: "1970-01-01T00:00:00.000Z",
      dataset: {
        id: activeDataset.id,
        label: activeDataset.label,
      },
      view: {
        uiMode,
        preset: activePreset,
        comparisonMode: viewComparisonMode,
        topologyLensId: topologyLens.id,
        yGammaReadableView: activeIsYGammaBaseComplex
          ? yGammaReadableViewState
          : undefined,
      },
      selected: {
        nodeId: selectedNode?.id,
        cellId: selectedCellId,
        generatorPairKey: activeGeneratorPairKey,
      },
      annotations,
      bookmarks: cameraBookmarks,
      screenshot: screenshot
        ? { mimeType: "image/png" as const, dataUrl: screenshot }
        : undefined,
    };
    void requestNativeExport({
      kind: "figure-bundle",
      fileName: `${system.name.replace(/\W+/g, "_")}_figure.coxeter-figure.json`,
      contents: JSON.stringify(payload, null, 2),
      mediaType: "application/json",
    });
  }, [
    activeDataset.id,
    activeDataset.label,
    activeGeneratorPairKey,
    activeIsYGammaBaseComplex,
    activePreset,
    annotations,
    cameraBookmarks,
    captureScenePng,
    requestNativeExport,
    selectedCellId,
    selectedNode?.id,
    system.name,
    topologyLens.id,
    uiMode,
    viewComparisonMode,
    yGammaReadableViewState,
  ]);

  const exportProjectSession = useCallback(async () => {
    const exported = createProjectSessionExport(currentProjectSession);
    const nativeResult = await desktopBridge.saveProjectSession(
      currentProjectSession,
    );
    if (nativeResult.fallbackDownload || !nativeResult.ok) {
      downloadText(exported.fileName, exported.contents);
    }
    const recent = upsertRecentProjectSession(recentSessions, {
      id: `session:${nativeResult.path ?? exported.fileName}`,
      label: currentProjectSession.project.label,
      path: nativeResult.path,
      lastOpenedAt: new Date().toISOString(),
    });
    const savedSession = {
      ...currentProjectSession,
      files: { recent },
    };
    setRecentSessions(recent);
    setSavedSessionSnapshot(createProjectSessionSnapshot(savedSession));
    setSessionBaselineReady(true);
    setDesktopMessage(
      nativeResult.ok
        ? `Saved ${exported.fileName}${nativeResult.path ? ` to ${nativeResult.path}` : ""}.`
        : (nativeResult.message ?? `Downloaded ${exported.fileName}.`),
    );
  }, [currentProjectSession, desktopBridge, recentSessions]);

  const exportProjectSessionAs = useCallback(async () => {
    const exported = createProjectSessionExport(currentProjectSession);
    const nativeResult = await desktopBridge.saveProjectSession(
      currentProjectSession,
      { saveAs: true },
    );
    if (nativeResult.fallbackDownload || !nativeResult.ok) {
      downloadText(exported.fileName, exported.contents);
    }
    if (nativeResult.ok) {
      const recent = upsertRecentProjectSession(recentSessions, {
        id: `session:${nativeResult.path ?? exported.fileName}`,
        label: currentProjectSession.project.label,
        path: nativeResult.path,
        lastOpenedAt: new Date().toISOString(),
      });
      setRecentSessions(recent);
      setSavedSessionSnapshot(
        createProjectSessionSnapshot(currentProjectSession),
      );
      setSessionBaselineReady(true);
    }
    setDesktopMessage(
      nativeResult.ok
        ? `Saved ${exported.fileName}${nativeResult.path ? ` to ${nativeResult.path}` : ""}.`
        : (nativeResult.message ?? `Downloaded ${exported.fileName}.`),
    );
  }, [currentProjectSession, desktopBridge, recentSessions]);

  const currentExperimentBundle = useCallback(
    (options: { screenshot?: string } = {}) => {
      const screenshot = options.screenshot;
      return createExperimentBundle({
        label: `${activeDataset.label} local chamber experiment`,
        createdAt: "1970-01-01T00:00:00.000Z",
        runs: [
          {
            label: `${system.name} radius ${ball?.metadata.radius ?? "?"}`,
            dataset: {
              id: activeDataset.id,
              label: activeDataset.label,
              systemName: system.name,
              dataStatus: system.dataStatus,
              sourceRefs: system.sourceRefs?.map((source) => source.id) ?? [],
              certificateStatus: system.certificate
                ? {
                    status: system.certificate.status,
                    backend: system.certificate.backend,
                    scopes: system.certificate.scopes ?? [],
                    inputHash: system.certificate.inputHash,
                    outputHash: system.certificate.outputHash,
                  }
                : undefined,
            },
            view: {
              uiMode,
              comparisonMode: viewComparisonMode,
              preset: activePreset,
              workflow: {
                id: researchWorkflow.id,
                stepId: researchWorkflow.stepId,
                stepTitle: activeResearchWorkflowStep(researchWorkflow).title,
                topologyLensId: topologyLens.id,
              },
              guide: guidedInspection
                ? {
                    id: guidedInspection.id,
                    stepIndex: guidedInspection.stepIndex,
                    stepTitle:
                      activeGuidedInspectionStep(guidedInspection)?.title,
                  }
                : undefined,
              graphView,
              localDepth,
              mode: effectiveMode,
              projection,
              labelScope,
              layout: localViewLayout,
              cellRenderMode,
              cellFocusMode,
              cellNeighborhoodMode,
              relationWalkMode,
              occlusionMode,
              activeGeneratorPair: activeGeneratorPairKey,
              disabledGeneratorPairs: [...disabledPairs].sort(),
              annotations,
              cameraBookmarks,
              yGammaReadableView: activeIsYGammaBaseComplex
                ? yGammaReadableViewState
                : undefined,
            },
            render: {
              sceneStats: latestSceneStatsRef.current,
              cellOpacity,
              panelOffsetStrength,
              bringFocusedCellsForward,
              screenshot,
            },
            topology: {
              diagnostics: topologyDiagnostics,
              lens: topologyLens,
              quotient: activeQuotient
                ? {
                    name: activeQuotient.name,
                    activeCocycleId: effectiveQuotientGame?.activeCocycleId,
                    verifierStatus: activeQuotient.verifier?.status,
                    artifactHash: activeQuotient.verifier?.outputHash,
                    game: quotientGameSummary
                      ? {
                          workflowKind: gameWorkflowKind,
                          claimStatus:
                            gameWorkflowKind === "jnw-legal-system"
                              ? (jnwSummary?.claimStatus ?? "failed")
                              : quotientGameSummary.status === "passed"
                                ? "experimental-non-jnw"
                                : "failed",
                          assignmentKind: quotientGameSummary.assignmentKind,
                          generatorValues: quotientGameSummary.generatorValues,
                          generatorUniformCochain: {
                            generatorValues:
                              quotientGameSummary.generatorValues,
                            cocycleStatus: quotientGameSummary.status,
                            failedCellIds: quotientGameSummary.failedCellIds,
                          },
                          jnwLegalSystem:
                            gameWorkflowKind === "jnw-legal-system" &&
                            jnwSummary
                              ? {
                                  sourceSystemName: jnwSourceSystem.name,
                                  initialState:
                                    jnwSummary.states.find(
                                      (state) =>
                                        state.id === activeJnwInitialState.id,
                                    )?.generators ??
                                    activeJnwInitialState.generators,
                                  moves: activeJnwMoveSystem.moves,
                                  orbitStateCount: jnwSummary.states.length,
                                  legalStateCount: jnwSummary.legalStateCount,
                                  stronglyLegalStateCount:
                                    jnwSummary.stronglyLegalStateCount,
                                  reader: {
                                    mode: jnwReaderMode,
                                    lens: jnwReaderLens,
                                    railGrouping: jnwRailGrouping,
                                    selectedStateId: activeJnwSelectedState?.id,
                                    selectedGenerator: selectedJnwGenerator,
                                    selectedRelationId: selectedCellId,
                                    constructionStage:
                                      jnwQuotientConstructionStage,
                                  },
                                }
                              : undefined,
                          cocycleStatus: quotientGameSummary.status,
                          failedCellIds: quotientGameSummary.failedCellIds,
                          selectedVertexId:
                            selectedNode?.id ?? activeQuotient.vertices[0]?.id,
                        }
                      : undefined,
                  }
                : undefined,
            },
            ball: ball ?? undefined,
            warnings,
            notes: experimentNote.trim()
              ? [
                  {
                    level: "info",
                    message: experimentNote.trim(),
                    source: "user-note",
                  },
                ]
              : [],
          },
        ],
      });
    },
    [
      activeDataset.id,
      activeDataset.label,
      activeGeneratorPairKey,
      activeIsYGammaBaseComplex,
      activePreset,
      activeQuotient,
      annotations,
      ball,
      bringFocusedCellsForward,
      cameraBookmarks,
      cellFocusMode,
      cellNeighborhoodMode,
      cellOpacity,
      cellRenderMode,
      disabledPairs,
      effectiveMode,
      effectiveQuotientGame?.activeCocycleId,
      experimentNote,
      activeJnwInitialState.generators,
      activeJnwInitialState.id,
      activeJnwMoveSystem.moves,
      activeJnwSelectedState?.id,
      gameWorkflowKind,
      graphView,
      guidedInspection,
      jnwQuotientConstructionStage,
      jnwRailGrouping,
      jnwReaderLens,
      jnwReaderMode,
      jnwSourceSystem.name,
      jnwSummary,
      labelScope,
      localDepth,
      localViewLayout,
      occlusionMode,
      panelOffsetStrength,
      projection,
      quotientGameSummary,
      relationWalkMode,
      researchWorkflow,
      selectedCellId,
      selectedJnwGenerator,
      selectedNode?.id,
      system,
      topologyLens,
      topologyDiagnostics,
      uiMode,
      warnings,
      viewComparisonMode,
      yGammaReadableViewState,
    ],
  );

  const saveExperimentRun = useCallback(() => {
    const bundle = currentExperimentBundle();
    setSavedExperiments((current) => {
      const next = [bundle, ...current].slice(0, 24);
      void writeNotebookBundles(next);
      return next;
    });
  }, [currentExperimentBundle]);

  const duplicateLatestExperimentRun = useCallback(() => {
    setSavedExperiments((current) => {
      const latest = current[0];
      if (!latest) {
        return current;
      }
      const next = [duplicateNotebookBundle(latest), ...current].slice(0, 24);
      void writeNotebookBundles(next);
      return next;
    });
  }, []);

  const importExperimentNotebook = useCallback(
    async (file: File | undefined) => {
      setNotebookImportError(null);
      if (!file) {
        return;
      }
      try {
        const parsed = JSON.parse(await file.text()) as unknown;
        const imported = parseNotebookBundles(parsed);
        setSavedExperiments((current) => {
          const next = [...imported, ...current].slice(0, 24);
          void writeNotebookBundles(next);
          return next;
        });
      } catch (error) {
        setNotebookImportError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    [],
  );

  const exportExperimentBundle = useCallback(async () => {
    const screenshot = await captureScenePng();
    const bundle = currentExperimentBundle({ screenshot });
    await requestNativeExport({
      kind: "experiment-bundle",
      fileName: `${system.name.replace(/\W+/g, "_")}_${selectedNode?.id ?? "none"}.coxeter-experiment.json`,
      contents: JSON.stringify(bundle, null, 2),
      mediaType: "application/json",
    });
  }, [
    captureScenePng,
    currentExperimentBundle,
    requestNativeExport,
    selectedNode?.id,
    system.name,
  ]);

  const handleDesktopMenuCommand = async (command: DesktopMenuCommand) => {
    switch (command) {
      case "new-session":
        if (await confirmSessionDiscard("start a new session")) {
          setExampleId(bundledExamples[0].id);
          setImportedDataset(null);
          setImportedExample(null);
          setSelectedNodeId("e");
          setRootNodeId("e");
          setSelectedCellId(undefined);
          setAnnotations([]);
          setDesktopMessage("Started a new session.");
        }
        break;
      case "open-session":
        await openNativeProjectSession();
        break;
      case "save-session":
        await exportProjectSession();
        break;
      case "save-session-as":
        await exportProjectSessionAs();
        break;
      case "choose-workspace":
        await chooseNativeWorkspace();
        break;
      case "reveal-workspace":
        await revealWorkspaceArtifacts();
        break;
      case "export-graph":
        exportGraph();
        break;
      case "export-screenshot":
        await exportScreenshot();
        break;
      case "export-figure-bundle":
        await exportFigureBundle();
        break;
      case "export-experiment-bundle":
        await exportExperimentBundle();
        break;
      case "export-diagnostics":
        await exportDesktopDiagnostics();
        break;
      case "check-tools":
        await refreshDesktopTools();
        await startDesktopJob("detectTools");
        break;
      case "show-logs":
        setDesktopMessage(
          "Use Export Diagnostic Bundle to collect local logs.",
        );
        break;
      case "reset-view":
        setResetSignal((value) => value + 1);
        break;
      case "teaching-mode":
        setUiMode("teaching");
        setShowAdvancedPanels(false);
        break;
      case "research-mode":
        setUiMode("research");
        break;
      case "toggle-labels":
        setShowNodeLabels((value) => !value);
        setShowEdgeLabels((value) => !value);
        break;
      case "toggle-cells":
        setShowCells((value) => !value);
        break;
      case "fullscreen":
        {
          const result = await desktopBridge.toggleFullscreen();
          scheduleSceneLayoutRefresh();
          if (result.message) {
            setDesktopMessage(result.message);
          }
        }
        break;
      case "guide-hexagon":
        startGuidedInspection("find-a-hexagon");
        break;
      case "guide-rank-three":
        startGuidedInspection("understand-rank-three-cell");
        break;
      case "guide-y-gamma":
        startGuidedInspection("inspect-ygamma");
        break;
      case "guide-quotient-game":
        startGuidedInspection("quotient-game-experiment");
        break;
      case "lens-generator-star":
        applyTopologyLens("generator-star");
        break;
      case "lens-edge-star":
        applyTopologyLens("edge-star");
        break;
      case "lens-rank-k-family":
        applyTopologyLens("rank-k-family");
        break;
      case "help-readme":
        setDesktopMessage("README is bundled in the repository root.");
        break;
      case "help-walkthroughs":
        setDesktopMessage(
          "Walkthroughs are documented in docs/walkthroughs.md.",
        );
        break;
      case "help-about":
        setDesktopMessage("CoxeterViewer5D 0.2.0 desktop research viewer.");
        break;
    }
  };
  useEffect(() => {
    desktopMenuCommandHandlerRef.current = handleDesktopMenuCommand;
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void desktopBridge
      .onMenuCommand((command) => {
        void desktopMenuCommandHandlerRef.current(command);
      })
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
        } else {
          cleanup = unsubscribe;
        }
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [desktopBridge]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case "r":
        case "R":
          setResetSignal((value) => value + 1);
          break;
        case "f":
        case "F":
          setFocusSignal((value) => value + 1);
          break;
        case "x":
        case "X":
          setRootNodeId(selectedNodeId);
          break;
        case "l":
        case "L":
          setShowNodeLabels((value) => !value);
          break;
        case "e":
        case "E":
          if (event.shiftKey) {
            setShowEdgeLabels((value) => !value);
          }
          break;
        case "c":
        case "C":
          setShowCells((value) => !value);
          break;
        case "v":
        case "V":
          setGraphView((value) => (value === "global" ? "on-graph" : "global"));
          break;
        case "u":
        case "U":
          setViewerOnlyMode((value) => !value);
          break;
        case "t":
        case "T":
          setColorScheme((value) => (value === "dark" ? "light" : "dark"));
          break;
        case "g":
        case "G":
          if (geometryAvailable) {
            setMode((value) => (value === "geometric" ? "shell" : "geometric"));
          }
          break;
        case "+":
        case "=":
          setRadius((value) =>
            clampInteger(value + 1, 0, graphPreset.maxRadius),
          );
          break;
        case "-":
        case "_":
          setRadius((value) =>
            clampInteger(value - 1, 0, graphPreset.maxRadius),
          );
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    geometryAvailable,
    graphPreset.maxRadius,
    selectedNodeId,
    scheduleSceneLayoutRefresh,
    setViewerOnlyMode,
  ]);

  const renderModelSwitch = (placement: "sidebar" | "top") =>
    hasMathContext ? (
      <div
        className={`segmented ygamma-view-switch model-switch-${placement}`}
        role="group"
        aria-label="Choose mathematical view"
      >
        <button
          type="button"
          aria-pressed={
            !showingGammaDefiningGraph &&
            !activeIsYGammaBaseComplex &&
            !(
              activeDataset.kind === "quotient-complex" &&
              !activeIsYGammaBaseComplex
            )
          }
          title={`${modelExplanations.davis.shortDescription} ${modelExplanations.davis.whyUseIt}`}
          onClick={() => showDavisComplexForSource()}
        >
          {labelForModel("davis")}
        </button>
        <button
          type="button"
          aria-pressed={
            activeIsYGammaBaseComplex && yGammaMainView === "complex"
          }
          onClick={() => {
            if (!activeIsYGammaBaseComplex) {
              openBaseOrbicomplex();
            } else {
              setYGammaMainView("complex");
            }
          }}
          title={`${modelExplanations.ygamma.shortDescription} ${modelExplanations.ygamma.whyUseIt}`}
        >
          {labelForModel("ygamma")}
        </button>
        <button
          type="button"
          aria-pressed={showingGammaDefiningGraph}
          title={`${modelExplanations.gamma.shortDescription} ${modelExplanations.gamma.whyUseIt}`}
          onClick={openDefiningGraph}
        >
          {labelForModel("gamma")}
        </button>
        <button
          type="button"
          aria-pressed={effectiveMode === "geometric"}
          disabled={!geometryAvailable}
          title={
            geometryAvailable
              ? `${modelExplanations.projection.shortDescription} ${modelExplanations.projection.whyUseIt}`
              : "This example has no geometric reflection data."
          }
          onClick={openProjectionView}
        >
          {labelForModel("projection")}
        </button>
        <button
          type="button"
          aria-pressed={
            !showingGammaDefiningGraph &&
            activeDataset.kind === "quotient-complex" &&
            !activeIsYGammaBaseComplex
          }
          title={`${modelExplanations["quotient-games"].shortDescription} ${modelExplanations["quotient-games"].whyUseIt}`}
          onClick={openQuotientAndGames}
        >
          {labelForModel("quotient-games")}
        </button>
        <span className="model-switch-help" aria-live="polite">
          {currentModelDisplayLabel}: {currentModelExplanation.shortDescription}
        </span>
      </div>
    ) : null;

  return (
    <main
      className={`app-shell${viewerOnly ? " viewer-only" : ""}`}
      data-theme={colorScheme}
      data-ui-mode={uiMode}
    >
      <aside ref={sidebarRef} className="sidebar" aria-label="Viewer controls">
        <Panel
          title={showResearchControls ? "Choose / Load" : "Choose Example"}
        >
          <div className="segmented" role="group" aria-label="Interface mode">
            <button
              type="button"
              aria-pressed={uiMode === "teaching"}
              onClick={() => {
                setUiMode("teaching");
                setShowAdvancedPanels(false);
              }}
            >
              Teaching
            </button>
            <button
              type="button"
              aria-pressed={uiMode === "research"}
              onClick={() => {
                setUiMode("research");
                setShowAdvancedPanels(true);
              }}
            >
              Research
            </button>
          </div>

          <div className="field">
            <label htmlFor="example-select">Example</label>
            <select
              id="example-select"
              value={selectedExample.id}
              onChange={(event) => void handleExampleChange(event.target.value)}
            >
              {examples.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="small-label">View</span>
            {renderModelSwitch("sidebar")}
          </div>

          {showResearchControls ? (
            <div className="research-lane-strip" aria-label="Research lanes">
              <span>Workflow</span>
              <span>Data/files</span>
              <span>Notebook/export</span>
              <span>Status/tools</span>
            </div>
          ) : null}

          {showGenerationControls ? (
            <details className="advanced-details">
              <summary>Generation</summary>
              <div className="field">
                <label htmlFor="backend-select">Backend</label>
                <select
                  id="backend-select"
                  value={backendId}
                  onChange={(event) => setBackendId(event.target.value)}
                >
                  <option value="browserApproxBackend">
                    Browser approximate
                  </option>
                  {exactBackendStubs.map((backend) => (
                    <option key={backend.name} value={backend.name}>
                      {backend.name} (external)
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="graph-preset-select">Graph size</label>
                <select
                  id="graph-preset-select"
                  value={graphPresetId}
                  onChange={(event) => {
                    const nextPresetId = event.target.value as GraphPresetId;
                    const nextPreset = graphPresets[nextPresetId];
                    setGraphPresetId(nextPresetId);
                    setRadius((currentRadius) =>
                      currentRadius > nextPreset.maxRadius
                        ? nextPreset.maxRadius
                        : currentRadius,
                    );
                  }}
                >
                  {Object.entries(graphPresets).map(([id, preset]) => (
                    <option key={id} value={id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="radius-input">Radius</label>
                <input
                  id="radius-input"
                  data-testid="radius-input"
                  type="number"
                  min={0}
                  max={graphPreset.maxRadius}
                  disabled={activeDataset.kind !== "coxeter-system"}
                  value={radius}
                  onChange={(event) =>
                    setRadius(
                      clampInteger(
                        Number(event.target.value),
                        0,
                        graphPreset.maxRadius,
                      ),
                    )
                  }
                />
              </div>
            </details>
          ) : null}

          {showResearchControls ? (
            <details className="advanced-details">
              <summary>Files + Workspace</summary>
              <label
                className="button file-button"
                htmlFor="import-coxeter-input"
              >
                <FileUp size={16} aria-hidden="true" />
                Import Coxeter system
              </label>
              <input
                id="import-coxeter-input"
                data-testid="import-json-input"
                className="hidden-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void handleImportCoxeterFile(event.currentTarget.files?.[0])
                }
              />
              <QuotientImportProgress client={quotientValidationClient} />
              <label
                className="button file-button"
                htmlFor="import-generated-input"
              >
                <FileUp size={16} aria-hidden="true" />
                Import generated graph
              </label>
              <input
                id="import-generated-input"
                data-testid="import-generated-input"
                className="hidden-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void handleImportGeneratedFile(event.currentTarget.files?.[0])
                }
              />
              <label
                className="button file-button"
                htmlFor="import-quotient-input"
              >
                <FileUp size={16} aria-hidden="true" />
                Import quotient
              </label>
              <input
                id="import-quotient-input"
                data-testid="import-quotient-input"
                className="hidden-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void handleImportQuotientFile(event.currentTarget.files?.[0])
                }
              />
              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  onClick={chooseNativeWorkspace}
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  Workspace
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={openNativeProjectSession}
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  Open session
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void exportProjectSession()}
                >
                  <Save size={16} aria-hidden="true" />
                  Save session
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void revealWorkspaceArtifacts()}
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  Open artifact folder
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void refreshDesktopTools()}
                >
                  Check tools
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void exportDesktopDiagnostics()}
                >
                  Export diagnostic bundle
                </button>
              </div>
            </details>
          ) : null}
          {showResearchControls ? (
            <details className="advanced-details">
              <summary>Quotient builder</summary>
              <div className="field">
                <label htmlFor="quotient-subgroup-words">
                  Subgroup generator words
                </label>
                <textarea
                  id="quotient-subgroup-words"
                  value={quotientSubgroupText}
                  onChange={(event) =>
                    setQuotientSubgroupText(event.target.value)
                  }
                  placeholder="One word per line, e.g. s0 s1"
                />
              </div>
              <div className="field inline-field">
                <label htmlFor="quotient-max-cosets">Max cosets</label>
                <input
                  id="quotient-max-cosets"
                  type="number"
                  min={1}
                  max={100000}
                  value={quotientMaxCosets}
                  onChange={(event) =>
                    setQuotientMaxCosets(
                      clampInteger(Number(event.target.value), 1, 100000),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="button"
                onClick={exportQuotientBuildRequest}
              >
                Export quotient build request
              </button>
              {quotientBuilderError ? (
                <p className="error-box" role="alert">
                  {quotientBuilderError}
                </p>
              ) : (
                <p className="math-note">
                  The browser exports request JSON; Sage/GAP scripts must
                  certify the quotient action.
                </p>
              )}
            </details>
          ) : null}
          {importError ? (
            <p className="error-box" data-testid="import-error" role="alert">
              {importError}
            </p>
          ) : null}
          {repairSuggestions.length > 0 ? (
            <ul className="repair-list" aria-label="Import repair suggestions">
              {repairSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <strong>{suggestion.label}</strong>
                  <span>{suggestion.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        {showReaderControls ? (
          <Panel title="Start Here">
            <p className="math-note compact-note">
              Pick a goal. Each action changes the view and explanation only;
              the Coxeter data and certificates are unchanged. The Focus
              Inspector explains the selected object.
            </p>
            <div
              className="task-card-grid start-here-grid"
              aria-label="Start Here"
            >
              {startHereActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="task-card"
                  title={action.summary}
                  onClick={() => runStartHereAction(action.id)}
                >
                  <strong>{action.label}</strong>
                  <span>{action.summary}</span>
                </button>
              ))}
            </div>
            <div className="reader-control-group">
              <span className="small-label">Focus</span>
              <div
                className="focus-button-grid"
                role="group"
                aria-label="Reader focus presets"
              >
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setTeachingLocalLinkOpen(false);
                    if (activeIsYGammaBaseComplex) {
                      applyYGammaNarratedPreset("full-skeleton");
                    } else {
                      applyViewPreset("global", { persist: false });
                    }
                  }}
                >
                  See all
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setTeachingLocalLinkOpen(false);
                    applyViewPreset("local-chamber", { persist: false });
                  }}
                >
                  Look near a chamber
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!firstFinitePairKey(system)}
                  onClick={() => {
                    setTeachingLocalLinkOpen(false);
                    const key =
                      activeGeneratorPairKey ?? firstFinitePairKey(system);
                    if (!key) {
                      return;
                    }
                    if (activeIsYGammaBaseComplex) {
                      applyYGammaNarratedPreset("one-relation");
                    }
                    focusPairByKey(key);
                  }}
                >
                  Read one relation
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setTeachingLocalLinkOpen(false);
                    setTopologyLens({
                      id: "generator-star",
                      selectedGenerator: yGammaFocusGenerator,
                    });
                    if (activeIsYGammaBaseComplex) {
                      applyYGammaNarratedPreset("around-generator");
                    } else {
                      applyViewPreset("local-chamber", { persist: false });
                    }
                  }}
                >
                  Show cells around one generator
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!yGammaRankThreeFocus && !activeIsYGammaBaseComplex}
                  onClick={() => {
                    setTeachingLocalLinkOpen(false);
                    if (!activeIsYGammaBaseComplex) {
                      openBaseOrbicomplex();
                    }
                    focusRankThreeCell();
                  }}
                >
                  Read one rank-three cell
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setTeachingLocalLinkOpen(true);
                    setTopologyLens({
                      id: "full-local-link",
                      selectedGenerator: yGammaFocusGenerator,
                    });
                    applyViewPreset("local-chamber", { persist: false });
                  }}
                >
                  Open local link
                </button>
              </div>
            </div>
            <div className="breadcrumb" aria-label="Selected word breadcrumb">
              {breadcrumb.map((entry, index) => (
                <span key={`${entry.index}:${entry.label}`}>
                  {index > 0 ? (
                    <span className="breadcrumb-separator">/</span>
                  ) : null}
                  <button
                    type="button"
                    disabled={!entry.clickable}
                    onClick={() => {
                      if (entry.nodeId) {
                        setSelectedNodeId(entry.nodeId);
                      }
                    }}
                  >
                    {entry.label}
                  </button>
                </span>
              ))}
            </div>
            <div className="step-grid" aria-label="Step by generator">
              {generatorSteps.map((step) => (
                <button
                  key={step.generatorId}
                  type="button"
                  disabled={!step.available}
                  title={step.reason ?? `Step by ${step.label}`}
                  onClick={() => stepByGenerator(step.generator)}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div className="reader-control-group">
              <span className="small-label">Labels</span>
            </div>
            <div className="reader-control-row">
              <Toggle
                checked={showNodeLabels}
                label="Show compact group-element labels"
                onChange={setShowNodeLabels}
              />
              <Toggle
                checked={showEdgeLabels}
                label="Show generator labels on edges"
                ariaKeyShortcuts="Shift+E"
                title="Shortcut: Shift+E. Plain E is reserved for camera movement."
                onChange={setShowEdgeLabels}
              />
              <Toggle
                checked={showCells}
                label="Show filled rank-two cells"
                onChange={setShowCells}
              />
            </div>
            <p className="math-note">
              Teaching mode keeps the controls close to the picture. Switch to
              Research for imports, certificates, notebooks, and detailed cell
              budgets.
            </p>
          </Panel>
        ) : null}

        {showResearchControls ? (
          <Panel title="Example Gallery">
            <div className="gallery-list" aria-label="Walkthrough gallery">
              {defaultGalleryEntries().map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="gallery-card"
                  onClick={() => runGalleryAction(entry.id)}
                >
                  <span className="small-label">{entry.family}</span>
                  <strong>{entry.label}</strong>
                  <span>{entry.summary}</span>
                  <span className="link-like">{entry.actionLabel}</span>
                </button>
              ))}
            </div>
            <details
              className="catalogue-panel"
              open={eightFacetCatalogueOpen}
              onToggle={(event) =>
                setEightFacetCatalogueOpen(event.currentTarget.open)
              }
            >
              <summary>Example catalogue: 5D eight-facet cases</summary>
              <p className="math-note">
                Tumarkin lists 16 compact 5D Coxeter polytopes with 8 facets in{" "}
                {tumarkinEightFacetSourceRef.locator}: 15 in the G11411 family
                and one unique G12221 case. These entries are transcribed from
                the source EPS artwork, their dotted weights are solved from the
                determinant equations, and each bundled JSON has a passed
                rank/signature certificate.
              </p>
              <div className="field">
                <label htmlFor="eight-facet-catalogue-search">
                  Search catalogue
                </label>
                <input
                  id="eight-facet-catalogue-search"
                  value={eightFacetCatalogueQuery}
                  onChange={(event) =>
                    setEightFacetCatalogueQuery(event.target.value)
                  }
                  placeholder="G11411, G12221, 01, Table 4.10"
                />
              </div>
              <div className="field">
                <label htmlFor="eight-facet-catalogue-filter">Filter</label>
                <select
                  id="eight-facet-catalogue-filter"
                  value={eightFacetCatalogueFilter}
                  onChange={(event) =>
                    setEightFacetCatalogueFilter(
                      event.target.value as EightFacetCatalogueFilter,
                    )
                  }
                >
                  <option value="all">All 16 entries</option>
                  <option value="representative">
                    Representative gallery entries
                  </option>
                  <option value="blocked">Uncertified or blocked</option>
                </select>
              </div>
              <p className="math-note">
                Showing {visibleEightFacetCatalogue.length}/
                {tumarkinEightFacetCatalogue.length};{" "}
                {countCertificationBlockedEntries()} still need transcription or
                checker artifacts before certification.
              </p>
              <div
                className="catalogue-list"
                aria-label="Tumarkin eight-facet catalogue"
              >
                {visibleEightFacetCatalogue.map((entry) => (
                  <article key={entry.id} className="catalogue-entry">
                    <div>
                      <span className="small-label">
                        {entry.galeDiagram} · #
                        {entry.tableIndex.toString().padStart(2, "0")}
                      </span>
                      <strong>{entry.label}</strong>
                    </div>
                    <span className="status-pill">
                      {entry.renderStatus.replace("-", " ")}
                    </span>
                    <span className="status-pill warning-pill">
                      {entry.certificationStatus.replace(/-/g, " ")}
                    </span>
                    <p>{entry.sourceLocator}</p>
                    <p className="math-note">
                      {entry.renderable
                        ? "Certified bundled Coxeter-system JSON is available."
                        : `Certification needs: ${entry.requiredForCertification
                            .slice(0, 2)
                            .join(" ")}`}
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!entry.renderable}
                      onClick={() => void handleLoadEightFacetEntry(entry)}
                    >
                      Load example
                    </button>
                  </article>
                ))}
              </div>
            </details>
          </Panel>
        ) : null}

        {showResearchControls ? (
          <Panel title="Guided Inspection">
            <GuidedInspectionPanel
              state={guidedInspection}
              onStart={startGuidedInspection}
              onStep={moveGuidedInspection}
              onExit={() => setGuidedInspection(undefined)}
            />
          </Panel>
        ) : null}

        {uiMode === "research" ? (
          <Panel title="Research Workflow">
            <ResearchWorkflowPanel
              state={researchWorkflow}
              activeStep={activeWorkflowStep}
              lens={topologyLens}
              quotient={activeQuotient}
              generators={system.generators}
              selectedVertexId={selectedNode?.id}
              assignmentLabel={quotientAssignment?.label}
              boundaryCheckSummary={
                quotientGameSummary
                  ? `${quotientGameSummary.passedCellCount}/${quotientGameSummary.totalCellCount} rank-two boundary checks passed`
                  : "no quotient boundary checks"
              }
              incidentFlows={quotientIncidentFlows}
              localLinkHomology={localLinkHomology}
              topologyDiagnostics={topologyDiagnostics}
              sceneCountStore={viewerInteractionStore}
              fallbackVisibleCounts={{
                nodes: viewNodes.length,
                edges: viewEdges.length,
                cells: activeSceneCells.length,
              }}
              savedRunCount={savedExperiments.length}
              comparisonStatus={
                workflowComparison
                  ? workflowComparison.statusChanged
                    ? "latest runs changed status"
                    : "latest runs have the same status"
                  : "save two runs to compare"
              }
              onSetStep={(stepId) =>
                setResearchWorkflow((current) => ({ ...current, stepId }))
              }
              onMove={moveResearchWorkflow}
              onRunStep={() => runResearchWorkflowAction()}
              onLoadJnwCube={loadJnwCubeWorkflow}
              onLens={applyTopologyLens}
              onLensGenerator={setTopologyLensGenerator}
              onSave={saveExperimentRun}
              onCompare={() => setShowAdvancedPanels(true)}
              onExport={() => void exportExperimentBundle()}
            />
          </Panel>
        ) : null}

        {activeIsYGammaBaseComplex && yGammaAtlas ? (
          <Panel title="Y_Gamma Reader">
            <YGammaReaderPanel
              atlas={yGammaAtlas}
              focusPreset={yGammaFocusPreset}
              activeGeneratorPairKey={activeGeneratorPairKey}
              focusGenerator={yGammaFocusGenerator}
              peelMode={yGammaPeelMode}
              cellSeparation={yGammaCellSeparation}
              separationValue={yGammaSeparationValue}
              cutawayMode={yGammaCutawayMode}
              relationStarActive={yGammaRelationStarActive}
              inspectMode={yGammaInspectMode}
              cameraPath={yGammaCameraPath}
              smallAtlasOpen={yGammaSmallAtlasOpen}
              compareDrawing={yGammaCompareDrawing}
              topologyMode={yGammaTopologyMode}
              cameraBookmark={yGammaCameraBookmark}
              rankThreeFocusAvailable={Boolean(yGammaRankThreeFocus)}
              onPreset={applyYGammaNarratedPreset}
              onStarLens={applyYGammaStarLens}
              onFocusPair={focusPairByKey}
              onFocusGenerator={(generator) => {
                setYGammaFocusGenerator(generator);
                applyYGammaNarratedPreset("around-generator");
              }}
              onRelationStar={extractYGammaRelationStar}
              onCutawayMode={setYGammaCutawayMode}
              onSeparationValue={applyYGammaSeparationValue}
              onInspectMode={setYGammaInspectMode}
              onCameraPath={runYGammaCameraPath}
              onSmallAtlasOpen={setYGammaSmallAtlasOpen}
              onCompareDrawing={setYGammaCompareDrawing}
              onPeelMode={setYGammaPeelMode}
              onCellSeparation={applyYGammaCellSeparation}
              onTopologyMode={setYGammaTopologyMode}
              onCameraBookmark={snapYGammaCamera}
            />
          </Panel>
        ) : null}

        {showDetailedControls ? (
          <>
            <Panel title="Mode">
              <div className="segmented" role="group" aria-label="Viewer mode">
                <button
                  type="button"
                  aria-pressed={effectiveMode === "shell"}
                  onClick={() => setMode("shell")}
                >
                  Shell drawing
                </button>
                <button
                  type="button"
                  data-testid="mode-geometric"
                  aria-pressed={effectiveMode === "geometric"}
                  disabled={!geometryAvailable}
                  onClick={() => setMode("geometric")}
                >
                  Geometric projection
                </button>
              </div>
              {!geometryAvailable ? (
                <p className="math-note" data-testid="geometry-warning">
                  Geometric projection is disabled because this example has no
                  validated hyperbolic normals and basepoint.
                </p>
              ) : null}
              {geometryAvailable ? (
                <div className="field inline-field">
                  <label htmlFor="projection-select">Projection</label>
                  <select
                    id="projection-select"
                    value={projection}
                    onChange={(event) =>
                      setProjection(event.target.value as HyperbolicProjection)
                    }
                  >
                    <option value="poincare-axes">
                      Poincare ball, coordinate axes
                    </option>
                    <option value="klein-axes">
                      Klein ball, coordinate axes
                    </option>
                    <option value="poincare-pca">
                      Poincare ball, PCA axes
                    </option>
                    <option value="klein-pca">Klein ball, PCA axes</option>
                  </select>
                </div>
              ) : null}
            </Panel>

            <Panel title="View Comparison">
              <div
                className="preset-grid"
                role="group"
                aria-label="View comparison modes"
              >
                {viewComparisonOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={viewComparisonMode === option.id}
                    title={option.summary}
                    onClick={() => setViewComparisonMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="math-note">
                {
                  viewComparisonOptions.find(
                    (option) => option.id === viewComparisonMode,
                  )?.summary
                }
              </p>
            </Panel>

            <Panel title="View">
              <div
                className="preset-grid"
                role="group"
                aria-label="View presets"
              >
                {viewPresetOptions.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={activePreset === preset.id}
                    disabled={
                      preset.id === "geometric-projection" && !geometryAvailable
                    }
                    title={
                      preset.id === "geometric-projection" && !geometryAvailable
                        ? "Geometric projection needs validated hyperbolic data."
                        : preset.label
                    }
                    onClick={() => applyViewPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="segmented" role="group" aria-label="Graph view">
                <button
                  type="button"
                  aria-pressed={graphView === "global"}
                  onClick={() => setGraphView("global")}
                >
                  Whole ball
                </button>
                <button
                  type="button"
                  data-testid="view-on-graph"
                  aria-pressed={graphView === "on-graph"}
                  onClick={() => setGraphView("on-graph")}
                >
                  Neighborhood only
                </button>
              </div>
              {graphView === "on-graph" ? (
                <>
                  <div className="field inline-field">
                    <label htmlFor="local-depth-select">Local depth</label>
                    <select
                      id="local-depth-select"
                      value={localDepth}
                      onChange={(event) =>
                        setLocalDepth(
                          clampInteger(Number(event.target.value), 1, 4),
                        )
                      }
                    >
                      <option value={1}>1 step</option>
                      <option value={2}>2 steps</option>
                      <option value={3}>3 steps</option>
                      <option value={4}>4 steps</option>
                    </select>
                  </div>
                  <div className="field inline-field">
                    <label htmlFor="occlusion-select">Far shells</label>
                    <select
                      id="occlusion-select"
                      value={occlusionMode}
                      onChange={(event) =>
                        setOcclusionMode(event.target.value as OcclusionMode)
                      }
                    >
                      <option value="hide-far">Hide</option>
                      <option value="fade-far">Fade</option>
                      <option value="x-ray">X-ray</option>
                    </select>
                  </div>
                </>
              ) : null}
              <p className="math-note">
                Look near a chamber uses a 3D readability layout: generator
                neighbors live on a small sphere and deeper vertices move to
                separated shells. Rank-two fills default to the displayed
                1-skeleton; lifted panels and petals are optional.
              </p>
              <div className="breadcrumb" aria-label="Selected word breadcrumb">
                {breadcrumb.map((entry, index) => (
                  <span key={`${entry.index}:${entry.label}`}>
                    {index > 0 ? (
                      <span className="breadcrumb-separator">/</span>
                    ) : null}
                    <button
                      type="button"
                      disabled={!entry.clickable}
                      onClick={() => {
                        if (entry.nodeId) {
                          setSelectedNodeId(entry.nodeId);
                        }
                      }}
                    >
                      {entry.label}
                    </button>
                  </span>
                ))}
              </div>
              <div className="step-grid" aria-label="Step by generator">
                {generatorSteps.map((step) => (
                  <button
                    key={step.generatorId}
                    type="button"
                    disabled={!step.available}
                    title={step.reason ?? `Step by ${step.label}`}
                    onClick={() => stepByGenerator(step.generator)}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Labels">
              <div
                className="segmented segmented-three"
                role="group"
                aria-label="Label scope"
              >
                {(["off", "focused", "budgeted"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={labelScope === scope}
                    onClick={() => setLabelScope(scope)}
                  >
                    {scope}
                  </button>
                ))}
              </div>
              <Toggle
                checked={showNodeLabels}
                label="Show compact group-element labels"
                onChange={setShowNodeLabels}
              />
              <Toggle
                checked={showEdgeLabels}
                label="Show generator labels on edges"
                ariaKeyShortcuts="Shift+E"
                title="Shortcut: Shift+E. Plain E is reserved for camera movement."
                onChange={setShowEdgeLabels}
              />
              <p className="math-note">
                Vertex labels show the selected reduced word, compacted for
                display. Edge labels show the generator for that adjacency.
              </p>
            </Panel>

            <Panel title="Rank-Two Davis Cells">
              <Toggle
                checked={showCells}
                label="Show filled rank-two cells"
                onChange={setShowCells}
              />
              <details className="advanced-details">
                <summary>Cell drawing options</summary>
                <div className="button-row">
                  <button
                    type="button"
                    className="button"
                    onClick={() => toggleAllRankTwoPairs(true)}
                  >
                    All on
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => toggleAllRankTwoPairs(false)}
                  >
                    All off
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={showOnlyM3Pairs}
                  >
                    Only m=3
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={!activeGeneratorPairKey}
                    onClick={showOnlyActivePair}
                  >
                    Only active pair
                  </button>
                </div>
                <div className="field inline-field">
                  <label htmlFor="cell-render-mode-select">Cell drawing</label>
                  <select
                    id="cell-render-mode-select"
                    value={cellRenderMode}
                    onChange={(event) =>
                      setCellRenderMode(
                        event.target.value as LocalCellRenderMode,
                      )
                    }
                  >
                    <option value="in-graph">Bounded by graph</option>
                    <option value="lifted-panels">Lifted panels</option>
                    <option value="petals">Petals</option>
                    <option value="outline-only">Outline only</option>
                  </select>
                </div>
                <div className="field inline-field">
                  <label htmlFor="cell-focus-mode-select">Cell focus</label>
                  <select
                    id="cell-focus-mode-select"
                    value={cellFocusMode}
                    onChange={(event) =>
                      setCellFocusMode(event.target.value as CellFocusMode)
                    }
                  >
                    <option value="all-local">All local cells</option>
                    <option value="incident-selected">
                      Incident to selected
                    </option>
                    <option value="selected-pair">Selected pair only</option>
                    <option value="selected-cell">Selected cell only</option>
                  </select>
                </div>
                <div className="field inline-field">
                  <label htmlFor="cell-neighborhood-select">Neighborhood</label>
                  <select
                    id="cell-neighborhood-select"
                    value={cellNeighborhoodMode}
                    onChange={(event) =>
                      setCellNeighborhoodMode(
                        event.target.value as CellNeighborhoodMode,
                      )
                    }
                  >
                    <option value="chamber">Chamber neighborhood</option>
                    <option value="cell-boundary">Cell boundary</option>
                    <option value="cell-plus-1">Cell + 1 shell</option>
                    <option value="cell-plus-2">Cell + 2 shells</option>
                  </select>
                </div>
                <div className="field inline-field">
                  <label htmlFor="relation-walk-select">Relation walk</label>
                  <select
                    id="relation-walk-select"
                    value={relationWalkMode}
                    onChange={(event) =>
                      setRelationWalkMode(
                        event.target.value as RelationWalkMode,
                      )
                    }
                  >
                    <option value="numbered">Number boundary</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cell-opacity-input">Cell opacity</label>
                  <input
                    id="cell-opacity-input"
                    type="range"
                    min="0.08"
                    max="0.5"
                    step="0.02"
                    value={cellOpacity}
                    onChange={(event) =>
                      setCellOpacity(Number(event.target.value))
                    }
                  />
                </div>
                <Toggle
                  checked={bringFocusedCellsForward}
                  label="Bring focused cells forward"
                  onChange={setBringFocusedCellsForward}
                />
              </details>
              <div
                className="chip-grid"
                aria-label="Rank-two generator-pair filters"
              >
                {pairOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="chip-button"
                    aria-pressed={!disabledPairs.has(option.key)}
                    data-active={activeGeneratorPairKey === option.key}
                    onClick={() => togglePairByKey(option.key)}
                    title={`${option.label}: m=${option.m}, ${option.polygonLabel}, ${option.visibleCount}/${option.totalCount} visible`}
                  >
                    {option.label} m={option.m} ({option.visibleCount}/
                    {option.totalCount})
                  </button>
                ))}
              </div>
              <p className="math-note">
                Pair chips control visibility. The pair matrix below focuses a
                relation and auto-expands the local drawing to complete one
                cell.
              </p>
            </Panel>

            <Panel title="Relation atlas">
              <div className="pair-matrix" aria-label="Coxeter pair matrix">
                {pairOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="pair-matrix-button"
                    data-active={activeGeneratorPairKey === option.key}
                    onClick={() => focusPairByKey(option.key)}
                  >
                    <span>{option.label}</span>
                    <strong>m={option.m}</strong>
                    <small>{option.polygonLabel}</small>
                    <small>
                      {option.visibleCount}/{option.totalCount} visible
                      {option.clippedCount > 0
                        ? `, ${option.clippedCount} clipped`
                        : ""}
                    </small>
                    {option.minDepthToComplete !== undefined ? (
                      <small>needs depth {option.minDepthToComplete}</small>
                    ) : null}
                  </button>
                ))}
              </div>
            </Panel>
          </>
        ) : null}

        {showAdvancedPanels ? (
          <Panel title="Higher Davis Cells">
            <Toggle
              checked={showHigherCells}
              label="Show higher-cell visual proxies"
              onChange={setShowHigherCells}
            />
            <p className="math-note">
              Incidence and coset records are combinatorial data. The filled
              higher-rank shapes are proxy drawings.
            </p>
            <ul className="plain-list">
              {higherSubsetOptions.map((option) => (
                <li key={option.subsetId}>
                  <Toggle
                    checked={!disabledHigherSubsets.has(option.subsetId)}
                    label={`${option.label} (${option.count})`}
                    onChange={(checked) =>
                      toggleHigherSubset(option.subsetId, checked)
                    }
                  />
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </aside>

      <section className="main-stage">
        <div className="top-strip">
          <div className="app-title">
            <h1>Coxeter Viewer 5D</h1>
            <p>
              {system.description ??
                "Finite-radius Cayley and Davis neighborhood viewer."}
            </p>
          </div>
          <div className="stats-row" aria-live="polite">
            {renderModelSwitch("top")}
            <div className="current-model-badge" aria-label="Current model">
              <span>Current model</span>
              <strong>{currentModelDisplayLabel}</strong>
              <em>{currentModelExplanation.shortDescription}</em>
              <em>{currentModelBadge.status}</em>
              {caveatCount > 0 ? (
                <small>
                  {caveatCount} view note{caveatCount === 1 ? "" : "s"}
                </small>
              ) : null}
            </div>
            <button
              type="button"
              className="button"
              aria-pressed={colorScheme === "dark"}
              onClick={() =>
                setColorScheme((value) => (value === "dark" ? "light" : "dark"))
              }
            >
              {colorScheme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              className="button"
              aria-pressed={viewerOnly}
              onClick={() => setViewerOnlyMode((value) => !value)}
            >
              {viewerOnly ? "Show UI" : "Viewer only"}
            </button>
            <button
              type="button"
              className="button"
              aria-pressed={showAdvancedPanels}
              onClick={() => setShowAdvancedPanels((value) => !value)}
            >
              {showAdvancedPanels
                ? "Hide research panels"
                : "Show research panels"}
            </button>
            <Stat
              label="Nodes"
              value={
                activeIsJnwStateQuotient && jnwSummary
                  ? jnwSummary.states.length
                  : showingDerivedScene
                    ? activeSceneVisibleNodeCount
                    : (ball?.nodes.length ?? 0)
              }
              testId="node-count"
            />
            <Stat
              label={activeIsJnwStateQuotient ? "Rails" : "Edges"}
              value={
                activeIsJnwStateQuotient && jnwSummary
                  ? jnwSummary.edges.length
                  : showingDerivedScene
                    ? activeSceneEdges.length
                    : (ball?.edges.length ?? 0)
              }
            />
            <Stat
              label="Cells"
              value={
                activeIsJnwStateQuotient && jnwSummary
                  ? jnwSummary.rankTwoDiagnostics.filter(
                      (diagnostic) => diagnostic.ok,
                    ).length
                  : showingGammaDefiningGraph
                    ? 0
                    : showingYGammaComplex
                      ? activeSceneCells.length
                      : visibleCells.length + visibleHigherProxies.length
              }
              testId="rank-two-cell-count"
            />
          </div>
        </div>

        {showingYGammaNerve ? (
          <YGammaNerveDiagnosticViewer
            atlas={yGammaAtlas}
            activeGeneratorPairKey={activeGeneratorPairKey}
            onFocusPair={focusPairByKey}
            onShowComplex={() => setYGammaMainView("complex")}
          />
        ) : (
          <div
            className={`viewer-with-overlay${
              showingYGammaComplex && yGammaAtlas ? " has-ygamma-atlas" : ""
            }${
              showingYGammaComplex && yGammaComparisonScenes
                ? " is-comparing"
                : ""
            }`}
            data-ygamma-scene-version={
              showingYGammaComplex ? (yGammaSceneState.sceneVersion ?? "") : ""
            }
            data-ygamma-scene-pending={
              showingYGammaComplex && yGammaSceneState.pending
                ? "true"
                : "false"
            }
          >
            {viewerOnly ? (
              <button
                type="button"
                className="viewer-ui-toggle"
                onClick={() => setViewerOnlyMode(false)}
              >
                Show UI
              </button>
            ) : null}
            {showingYGammaComplex &&
            yGammaAtlas &&
            (uiMode === "research" || yGammaSmallAtlasOpen) ? (
              <YGammaMiniAtlasOverlay
                atlas={yGammaAtlas}
                activeGeneratorPairKey={activeGeneratorPairKey}
                onFocusPair={focusPairByKey}
              />
            ) : null}
            {viewComparisonMode !== "single" ? (
              <div
                className="comparison-overlay"
                aria-label="Active view comparison"
              >
                <strong>
                  {
                    viewComparisonOptions.find(
                      (option) => option.id === viewComparisonMode,
                    )?.label
                  }
                </strong>
                <span>
                  {
                    viewComparisonOptions.find(
                      (option) => option.id === viewComparisonMode,
                    )?.summary
                  }
                </span>
              </div>
            ) : null}
            {showingYGammaComplex && yGammaDrawingComparisonScene ? (
              <YGammaCombinedComparisonView
                scene={yGammaDrawingComparisonScene}
                generators={system.generators}
                activeGeneratorPair={activeGeneratorPair}
                selectedCellId={selectedCellId}
                topologyMode={yGammaTopologyMode}
                colorScheme={colorScheme}
                focusSignal={activeFocusSignal}
                onCapturePngReady={handleCapturePngReady}
                onRenderStats={handleSceneRenderStats}
                onSelectCell={handleSceneSelectCell}
              />
            ) : (
              <SceneView
                nodes={activeSceneNodes}
                edges={gameDecoratedSceneEdges}
                cells={activeSceneCells}
                generators={system.generators}
                structureVersion={activeSceneStructureVersion}
                appearanceVersion={activeSceneAppearanceVersion}
                revisionSet={activeSceneRevisionSet}
                selectedNodeId={activeSceneSelectedNodeId}
                selectedCellId={selectedCellId}
                showCells={showingDerivedScene || showCells || showHigherCells}
                showNodeLabels={forceBudgetedSceneLabels || showNodeLabels}
                showEdgeLabels={showingDerivedScene || showEdgeLabels}
                labelScope={sceneLabelScope}
                activeGeneratorPair={activeGeneratorPair}
                localCellRenderMode={activeLocalCellRenderMode}
                occlusionMode={occlusionMode}
                cellOpacity={activeCellOpacity}
                panelOffsetStrength={
                  showingYGammaComplex
                    ? 0
                    : bringFocusedCellsForward
                      ? panelOffsetStrength
                      : 0
                }
                topologyMode={showingYGammaComplex && yGammaTopologyMode}
                semanticLabelsOnly={showingYGammaComplex}
                cameraFocusTarget={cameraFocusTarget}
                cameraFocusOffset={cameraFocusOffset}
                showReferenceBall={geometricReferenceBallVisible}
                referenceBallRadius={geometricDisplayScale}
                cameraPreset={
                  showingDerivedScene
                    ? "global"
                    : graphView === "on-graph"
                      ? "on-graph"
                      : "global"
                }
                resetSignal={resetSignal}
                focusNodeId={activeSceneSelectedNodeId}
                focusSignal={activeFocusSignal}
                maxNodeLabels={sceneMaxNodeLabels}
                maxEdgeLabels={sceneMaxEdgeLabels}
                pickingEnabled={
                  !showingDerivedScene || showingGammaDefiningGraph
                }
                workerGenerationMs={generation.generationMs}
                colorScheme={colorScheme}
                sceneLabel={`${currentModelBadge.label}: ${currentModelBadge.status}`}
                layoutVersion={sceneLayoutSignal}
                onCapturePngReady={handleCapturePngReady}
                onRenderStats={handleSceneRenderStats}
                onHoverCell={
                  showingYGammaComplex ? setHoveredCellId : undefined
                }
                onSelectNode={handleSceneSelectNode}
                onSelectCell={handleSceneSelectCell}
              />
            )}
          </div>
        )}
      </section>

      <aside
        ref={rightRailRef}
        className="right-rail"
        aria-label="Graph details"
      >
        <Panel
          title="Focus Inspector"
          actions={
            <>
              <button
                type="button"
                className="icon-button"
                aria-label="Focus selected node"
                title="Focus selected node"
                onClick={() => setFocusSignal((value) => value + 1)}
              >
                <Crosshair size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Root view at selected node"
                title="Root view at selected node"
                onClick={() => setRootNodeId(selectedNode?.id ?? "e")}
              >
                <Home size={17} aria-hidden="true" />
              </button>
              {showResearchControls ? (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export graph JSON"
                    title="Export graph JSON"
                    onClick={exportGraph}
                  >
                    <Download size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export local neighborhood"
                    title="Export local neighborhood"
                    onClick={exportLocalNeighborhood}
                  >
                    <FileJson size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export screenshot"
                    title="Export screenshot"
                    onClick={exportScreenshot}
                  >
                    <ImageDown size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export view bundle"
                    title="Export view bundle"
                    onClick={exportViewBundle}
                  >
                    <Package size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export figure bundle"
                    title="Export figure bundle"
                    onClick={exportFigureBundle}
                  >
                    <Package size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Export project session"
                    title="Export project session"
                    onClick={() => void exportProjectSession()}
                  >
                    <FileJson size={17} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </>
          }
        >
          <TopologyFirstInspector
            explanation={topologyExplanation}
            compact={showReaderControls}
          />
          {showReaderControls ? (
            <div className="inspector-current-view">
              <h3>Current view</h3>
              <CompactWhatAmISeeingPanel summary={whatAmISeeing} />
            </div>
          ) : null}
          {showingGammaDefiningGraph && gammaDefiningGraphScene ? (
            <DefiningGraphPanel
              system={sourceSystem ?? system}
              scene={gammaDefiningGraphScene}
              layoutMode={gammaLayoutMode}
              selectedIncidence={selectedGammaIncidence}
              onLayoutMode={setGammaLayoutMode}
              onSelectGenerator={setSelectedGammaGenerator}
            />
          ) : showingYGammaComplex && yGammaAtlas ? (
            <YGammaWhyPanel
              relation={yGammaActiveRelation}
              sceneCellId={yGammaHoveredOrActiveCell?.id}
              focusPreset={yGammaFocusPreset}
              peelMode={yGammaPeelMode}
              cellSeparation={yGammaCellSeparation}
            />
          ) : (
            <RelationFocusPanel
              cell={focusedRankTwoCell}
              pairKeyValue={activeGeneratorPairKey}
              pairOptions={pairOptions}
              relationWalk={relationWalk}
              context={activeIsJnwStateQuotient ? "jnw-cover" : "davis"}
            />
          )}
        </Panel>

        {showingYGammaComplex && yGammaAtlas ? (
          <Panel title="Local Topology Checklist">
            <YGammaTopologyChecklist
              atlas={yGammaAtlas}
              activeGeneratorPairKey={activeGeneratorPairKey}
              focusGenerator={yGammaEffectiveFocusGenerator}
              rankThreeFocus={effectiveYGammaRankThreeFocus}
              visibleCells={activeSceneCells}
            />
          </Panel>
        ) : null}

        {showAdvancedPanels ? (
          <>
            <Panel title="Legend">
              <ul className="legend-list">
                {system.generators.map((generator, index) => (
                  <li key={generator.id} className="legend-item">
                    <span
                      className="swatch"
                      style={{ backgroundColor: generator.colorHint }}
                    />
                    <span>
                      {generator.label}{" "}
                      <span className="small-label">generator {index}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Status/tools">
              <ResearchStatusPanel
                system={system}
                ball={ball ?? undefined}
                davisIncidence={davisIncidence}
                sceneCountStore={viewerInteractionStore}
                desktopStatus={desktopStatus}
                desktopMessage={desktopMessage}
                sessionDirty={sessionDirty}
                recentSessions={recentSessions}
                desktopTools={desktopTools}
                desktopJobs={desktopJobs}
              />
            </Panel>

            <Panel title="Notebook/export">
              <div className="field">
                <label htmlFor="experiment-note">Note</label>
                <textarea
                  id="experiment-note"
                  value={experimentNote}
                  onChange={(event) => setExperimentNote(event.target.value)}
                  placeholder="Record what this local view is testing."
                />
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  onClick={saveExperimentRun}
                >
                  Save run
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={savedExperiments.length === 0}
                  onClick={duplicateLatestExperimentRun}
                >
                  Duplicate last run
                </button>
                <button
                  type="button"
                  className="button"
                  aria-label="Export experiment bundle"
                  onClick={exportExperimentBundle}
                >
                  Export bundle
                </button>
                <label
                  className="button file-button"
                  htmlFor="import-notebook-input"
                >
                  Import bundle
                </label>
                <input
                  id="import-notebook-input"
                  className="hidden-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) =>
                    void importExperimentNotebook(
                      event.currentTarget.files?.[0],
                    )
                  }
                />
              </div>
              <p className="math-note">
                {savedExperiments.length} saved run
                {savedExperiments.length === 1 ? "" : "s"} in this browser.
              </p>
              {notebookImportError ? (
                <p className="error-box" role="alert">
                  {notebookImportError}
                </p>
              ) : null}
              {savedExperiments.length >= 2 ? (
                <ExperimentComparisonSummary bundles={savedExperiments} />
              ) : null}
            </Panel>

            <Panel title="Figure + View Bookmarks">
              <div className="field">
                <label htmlFor="annotation-draft">Figure annotation</label>
                <textarea
                  id="annotation-draft"
                  value={annotationDraft}
                  onChange={(event) => setAnnotationDraft(event.target.value)}
                  placeholder="Describe the selected cell, edge, or view."
                />
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  onClick={addAnnotation}
                >
                  Add annotation
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={exportFigureBundle}
                >
                  Export figure bundle
                </button>
              </div>
              <ul className="plain-list">
                {annotations.slice(0, 4).map((annotation) => (
                  <li key={annotation.id}>
                    <span className="small-label">
                      {annotation.targetKind}
                      {annotation.targetId ? ` ${annotation.targetId}` : ""}
                    </span>
                    <span>{annotation.body}</span>
                  </li>
                ))}
              </ul>
              <div className="field">
                <label htmlFor="bookmark-draft">Camera/view bookmark</label>
                <input
                  id="bookmark-draft"
                  value={bookmarkDraft}
                  onChange={(event) => setBookmarkDraft(event.target.value)}
                  placeholder="Name this view"
                />
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  onClick={saveCameraBookmark}
                >
                  Save bookmark
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void exportProjectSession()}
                >
                  Export session
                </button>
              </div>
              <ul className="plain-list">
                {cameraBookmarks.slice(0, 4).map((bookmark) => (
                  <li key={bookmark.id}>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => applyCameraBookmark(bookmark)}
                    >
                      {bookmark.label}
                    </button>
                    <span className="small-label">
                      {bookmark.preset}, {bookmark.topologyLensId}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        ) : null}

        {showLocalLinkPanel ? (
          <Panel title="Local Link">
            {hasMathContext ? (
              <>
                <LocalLinkView
                  localLink={localLink}
                  activeGeneratorPair={activeGeneratorPair}
                  disabledPairs={disabledPairs}
                  onGeneratorStep={stepByGenerator}
                  onPairToggle={(pair) => focusPairByKey(pairKey(pair))}
                />
                <p className="math-note">
                  Link at {localLink.nodeId}: {localLink.vertices.length}{" "}
                  vertices, {localLink.simplices.length} spherical simplices.
                </p>
                <div className="badge-row" aria-label="Davis exactness badges">
                  <span className="status-badge">rank-two exact</span>
                  <span className="status-badge">
                    incidence exact in visible ball
                  </span>
                  <span className="status-badge muted">visual proxy</span>
                </div>
                <div
                  className="chip-grid"
                  role="group"
                  aria-label="Local link pair filters"
                >
                  {localLink.sphericalSubsets
                    .filter((subset) => subset.rank === 2)
                    .map((subset) => {
                      const pair = subset.generators as [number, number];
                      const key = pairKey(pair);
                      const disabled = disabledPairs.has(key);

                      return (
                        <button
                          key={subset.id}
                          type="button"
                          className="chip-button"
                          data-active={activeGeneratorPairKey === key}
                          aria-pressed={!disabled}
                          onClick={() => focusPairByKey(key)}
                        >
                          Focus {subset.generatorLabels.join("-")} rank-two
                          cells
                        </button>
                      );
                    })}
                </div>
                <ul className="subset-list">
                  {groupSphericalSubsetsByRank(localLink.sphericalSubsets).map(
                    ([rank, subsets]) => (
                      <li key={rank}>
                        <span className="subset-rank">rank {rank}</span>
                        <span>
                          {subsets.length} subset
                          {subsets.length === 1 ? "" : "s"}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
                {topologyDiagnostics ? (
                  <div className="topology-summary">
                    <p className="math-note">
                      Link diagnostics: flag condition{" "}
                      {topologyDiagnostics.linkCondition.status};{" "}
                      {
                        topologyDiagnostics.linkCondition.missingFlagSimplices
                          .length
                      }{" "}
                      missing flag simplex
                      {topologyDiagnostics.linkCondition.missingFlagSimplices
                        .length === 1
                        ? ""
                        : "es"}
                      .
                    </p>
                  </div>
                ) : null}
                {sphericalCellProxies.proxies.length > 0 ? (
                  <p className="math-note">
                    {sphericalCellProxies.proxies.length} higher-rank Davis cell
                    proxies are available;{" "}
                    {
                      sphericalCellProxies.proxies.filter(
                        (proxy) => proxy.exactIncidenceAvailable,
                      ).length
                    }{" "}
                    have exact visible incidence metadata.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="math-note">
                Local-link mathematics needs the source Coxeter system, not only
                a generated graph.
              </p>
            )}
          </Panel>
        ) : null}

        {showYGammaInventoryPanel ? (
          <Panel title="Y_Gamma Cell Inventory">
            {yGammaAtlas ? (
              <YGammaAtlasPanel
                atlas={yGammaAtlas}
                active={activeIsYGammaBaseComplex}
                activeGeneratorPairKey={activeGeneratorPairKey}
                rankThreeFocus={yGammaRankThreeFocus}
                rankThreeFocusEnabled={yGammaRankThreeFocusEnabled}
                onShowComplex={() => {
                  openBaseOrbicomplex();
                  setYGammaMainView("complex");
                }}
                onShowNerve={() => {
                  openBaseOrbicomplex();
                  setYGammaMainView("nerve");
                }}
                onShowGamma={openDefiningGraph}
                onFocusPair={focusPairByKey}
                onFocusRankThree={() => {
                  if (!activeIsYGammaBaseComplex) {
                    openBaseOrbicomplex();
                  }
                  focusRankThreeCell();
                }}
                onFocusRankThreePair={(key) => {
                  if (!activeIsYGammaBaseComplex) {
                    openBaseOrbicomplex();
                  }
                  focusRankThreeCell(key);
                }}
              />
            ) : (
              <p className="math-note">
                The Y_Gamma atlas needs a source Coxeter system. Generated graph
                imports without source data cannot determine spherical cells.
              </p>
            )}
          </Panel>
        ) : null}

        {showGamePanel ? (
          <Panel title="Quotient + Games">
            {activeDataset.kind === "quotient-complex" ? (
              <QuotientGamePanel
                quotient={activeDataset.quotient}
                selectedVertexId={selectedNode?.id}
                workflowKind={gameWorkflowKind}
                onWorkflowKindChange={setGameWorkflowKind}
                editableAssignment={activeEditableGameAssignment}
                summary={quotientGameSummary}
                usingEditableAssignment={gameUsesEditableAssignment}
                jnwSourceSystem={jnwSourceSystem}
                jnwMoveSystem={activeJnwMoveSystem}
                jnwInitialState={activeJnwInitialState}
                jnwSummary={jnwSummary}
                jnwSelectedStateId={activeJnwSelectedState?.id}
                jnwSelectedRelationId={selectedCellId}
                jnwLayerBreadcrumb={activeJnwLayerBreadcrumb}
                jnwLayerCompareOpen={jnwLayerCompareOpen}
                jnwReaderMode={jnwReaderMode}
                jnwReaderLens={jnwReaderLens}
                jnwRailGrouping={jnwRailGrouping}
                selectedJnwGenerator={selectedJnwGenerator}
                jnwQuotientSheetMode={jnwQuotientSheetMode}
                jnwQuotientConstructionStage={jnwQuotientConstructionStage}
                onGeneratorValueChange={updateGameGeneratorValue}
                onPreset={applyGamePreset}
                onJnwInitialStateChange={updateJnwInitialState}
                onJnwMoveToggle={updateJnwMoveToggle}
                onJnwPreset={applyJnwPreset}
                onOpenJnwStateQuotient={openJnwStateQuotient}
                onOpenJnwStateQuotientLens={openJnwStateQuotientLens}
                onSelectJnwState={selectJnwState}
                onShowJnwStateOnGamma={showJnwStateOnGamma}
                onFocusJnwDiagnostic={focusJnwDiagnostic}
                onSelectJnwGlueGenerator={selectJnwGlueGenerator}
                onJnwLayerCompareOpenChange={setJnwLayerCompareOpen}
                onJnwReaderModeChange={setJnwReaderMode}
                onJnwReaderLensChange={setJnwReaderLens}
                onJnwRailGroupingChange={setJnwRailGrouping}
                onJnwQuotientSheetModeChange={setJnwQuotientSheetMode}
                onJnwQuotientConstructionStageChange={
                  setJnwQuotientConstructionStage
                }
                onFocusCell={focusGameBoundaryCell}
              />
            ) : (
              <>
                <GameWorkflowModelCards />
                <p className="math-note">
                  Game and PL Morse diagnostics live on quotient-style
                  complexes: imported quotients or the one-vertex base
                  orbicomplex <span className="matrix-key">Y_Gamma</span>.
                </p>
                <button
                  type="button"
                  className="button"
                  onClick={openBaseOrbicomplex}
                >
                  Open 3D Y_Gamma model
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={openDefiningGraph}
                >
                  Open defining graph Gamma
                </button>
                <p className="math-note">
                  Y_Gamma is the fundamental-domain cell complex: one base
                  vertex, oriented generator arrows, and relation
                  polytopes/cells for spherical subsets. The 2D nerve schematic
                  is only a diagnostic.
                </p>
              </>
            )}
          </Panel>
        ) : null}

        {showResearchControls ? (
          <Panel title="What Am I Seeing?">
            <CompactWhatAmISeeingPanel summary={whatAmISeeing} />
          </Panel>
        ) : null}

        <Panel title="Caveats">
          {warningGroups.length > 0 ? (
            <WarningGroupsView
              groups={warningGroups}
              showAll={showAllWarnings}
              onToggleShowAll={() => setShowAllWarnings((value) => !value)}
            />
          ) : (
            <p className="math-note">No caveats for the current view.</p>
          )}
        </Panel>
      </aside>
    </main>
  );
}

function describeCurrentModel(input: {
  activeDatasetKind: ViewerDataset["kind"];
  activeIsYGammaBaseComplex: boolean;
  activeIsJnwStateQuotient: boolean;
  activePreset: ViewPresetId;
  cellFocusMode: CellFocusMode;
  effectiveMode: ViewerMode;
  geometryIntervalCertified: boolean;
  graphView: GraphViewMode;
  projection: HyperbolicProjection;
  showingGammaDefiningGraph: boolean;
  showingYGammaComplex: boolean;
  yGammaMainView: YGammaMainView;
}): { label: string; status: string } {
  if (input.showingGammaDefiningGraph) {
    return {
      label: "Gamma",
      status: "Coxeter diagram drawing",
    };
  }
  if (
    input.activeIsYGammaBaseComplex &&
    (input.showingYGammaComplex || input.yGammaMainView === "nerve")
  ) {
    const focus =
      input.cellFocusMode === "selected-cell"
        ? "selected relation"
        : input.activePreset === "rank-two-cells"
          ? "relation focus"
          : "local topology";
    return {
      label: input.yGammaMainView === "nerve" ? "Y_Gamma nerve" : "Y_Gamma",
      status:
        input.yGammaMainView === "nerve"
          ? "2D diagnostic"
          : `${focus}, exact incidence drawing`,
    };
  }
  if (
    input.activeDatasetKind === "quotient-complex" &&
    !input.activeIsYGammaBaseComplex
  ) {
    if (input.activeIsJnwStateQuotient) {
      return {
        label: "Quotient + Games",
        status: "JNW move-kernel cover / in-repo diagnostic",
      };
    }
    return {
      label: "Quotient + Games",
      status: "imported or derived complex",
    };
  }
  if (input.effectiveMode === "geometric") {
    return {
      label: "Projection",
      status: input.geometryIntervalCertified
        ? `${projectionLabel(input.projection)}, certified source data`
        : `${projectionLabel(input.projection)}, visualization-grade`,
    };
  }
  const locality =
    input.graphView === "on-graph" ? "look near a chamber" : "see all";
  return {
    label: "Davis",
    status: `${locality}, ${input.activePreset.replaceAll("-", " ")}`,
  };
}

function projectionLabel(projection: HyperbolicProjection): string {
  switch (projection) {
    case "poincare-axes":
      return "Poincare axes";
    case "klein-axes":
      return "Klein axes";
    case "poincare-pca":
      return "Poincare PCA";
    case "klein-pca":
      return "Klein PCA";
  }
}

function TopologyFirstInspector({
  explanation,
  compact = false,
}: {
  explanation: TopologyExplanation;
  compact?: boolean;
}) {
  const detailContent = (
    <>
      {explanation.boundaryWord && explanation.boundaryWord.length > 0 ? (
        <p className="math-note">
          Boundary word:{" "}
          <span className="matrix-key">
            {explanation.boundaryWord.join(" ")}
          </span>
        </p>
      ) : null}
      {explanation.rows.length > 0 ? (
        <table className="inspector-table">
          <tbody>
            {explanation.rows.map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );

  return (
    <div className="topology-inspector">
      {explanation.actionHint ? (
        <p className="inspector-action-hint">{explanation.actionHint}</p>
      ) : null}
      <div className="inspector-question">
        <h3>{inspectorAnswers[0].heading}</h3>
        <p className="math-note">
          <strong>{explanation.title}</strong>
        </p>
      </div>
      <div className="inspector-question">
        <h3>{inspectorAnswers[1].heading}</h3>
        <p className="math-note">{explanation.summary}</p>
      </div>
      <div className="inspector-question">
        <h3>{inspectorAnswers[2].heading}</h3>
        <div className="status-row">
          <span className="status-badge">{explanation.layer}</span>
          <span className="status-badge muted">{explanation.status}</span>
          {explanation.badges.slice(0, 4).map((badge) => (
            <span className="status-badge muted" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      </div>
      {compact &&
      (explanation.boundaryWord?.length || explanation.rows.length) ? (
        <details className="advanced-details compact-details">
          <summary>Selection details</summary>
          {detailContent}
        </details>
      ) : (
        detailContent
      )}
    </div>
  );
}

function CompactWhatAmISeeingPanel({
  summary,
}: {
  summary: WhatAmISeeingSummary;
}) {
  const headlineIndexes = new Set([0, 1, 2, 3, summary.facts.length - 1]);
  const headlineFacts = summary.facts.filter((_, index) =>
    headlineIndexes.has(index),
  );
  const remainingFacts = summary.facts.filter(
    (_, index) => !headlineIndexes.has(index),
  );

  return (
    <div className="reader-summary">
      <p className="math-note">
        <strong>{summary.title}</strong>
      </p>
      <ul className="plain-list story-list compact-story-list">
        {headlineFacts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {remainingFacts.length > 0 ? (
        <details className="advanced-details compact-details">
          <summary>More context</summary>
          <ul className="plain-list story-list compact-story-list">
            {remainingFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function DefiningGraphPanel({
  system,
  scene,
  layoutMode,
  selectedIncidence,
  onLayoutMode,
  onSelectGenerator,
}: {
  system: CoxeterSystemInput;
  scene: DefiningGraphScene;
  layoutMode: DefiningGraphLayoutMode;
  selectedIncidence?: DefiningGraphVertexIncidence;
  onLayoutMode: (mode: DefiningGraphLayoutMode) => void;
  onSelectGenerator: (generator: number) => void;
}) {
  const stateHighlightWarning = scene.warnings.find((warning) =>
    warning.includes("is highlighted on Gamma"),
  );
  const highlightedStateLabels = scene.nodes
    .filter((node) => node.stateRole === "in-state")
    .map((node) => node.compactLabel ?? node.label ?? node.id);
  return (
    <div className="topology-inspector">
      <div className="status-row">
        <span className="status-badge">Gamma</span>
        <span className="status-badge muted">defining graph</span>
      </div>
      <h3>Coxeter defining graph</h3>
      <p className="math-note">
        Vertices are the Coxeter generators of {system.name}. Each drawn edge is
        a finite relation edge, including commuting m=2 pairs. Pairs with m=inf
        are omitted because they are not finite relations.
      </p>
      <div className="field inline-field gamma-generator-picker">
        <label htmlFor="gamma-generator-inspector">Inspect generator</label>
        <select
          id="gamma-generator-inspector"
          aria-label="Inspect Gamma generator"
          value={selectedIncidence?.generator ?? 0}
          onChange={(event) => onSelectGenerator(Number(event.target.value))}
        >
          {system.generators.map((generator, index) => (
            <option value={index} key={generator.id}>
              {generator.label}
            </option>
          ))}
        </select>
      </div>
      <div
        className="segmented gamma-layout-toggle"
        role="group"
        aria-label="Gamma drawing mode"
      >
        <button
          type="button"
          aria-pressed={layoutMode === "3d"}
          onClick={() => onLayoutMode("3d")}
        >
          3D viewer
        </button>
        <button
          type="button"
          aria-pressed={layoutMode === "planar"}
          onClick={() => onLayoutMode("planar")}
        >
          2D planar
        </button>
      </div>
      <p className="inspector-action-hint">
        {layoutMode === "planar"
          ? "Planar mode places the generators on one plane. If Gamma is non-planar, crossings are part of the obstruction, not a renderer mistake."
          : "3D mode separates the defining graph in space so dense relation data is easier to orbit."}
      </p>
      <table className="inspector-table">
        <tbody>
          <tr>
            <th>Generators</th>
            <td>
              {system.generators.map((generator) => generator.label).join(", ")}
            </td>
          </tr>
          <tr>
            <th>Finite relation edges</th>
            <td>{scene.records.length}</td>
          </tr>
          <tr>
            <th>k(Gamma)</th>
            <td>
              {formatCurvature(scene.charneyDavisCurvature)} = 1 - {system.rank}
              /2 + {scene.records.length}/4
            </td>
          </tr>
          <tr>
            <th>m=2 commuting edges</th>
            <td>{scene.rightAnglePairCount}</td>
          </tr>
          <tr>
            <th>Planarity</th>
            <td>{scene.planarity.isPlanar ? "not ruled out" : "non-planar"}</td>
          </tr>
          {highlightedStateLabels.length > 0 ? (
            <tr>
              <th>State vertices</th>
              <td>{highlightedStateLabels.join(", ")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {selectedIncidence ? (
        <GammaIncidencePartition
          incidence={selectedIncidence}
          onSelectGenerator={onSelectGenerator}
        />
      ) : null}
      {scene.relationOrderComponents.length > 0 ? (
        <GammaRelationOrderComponents
          summaries={scene.relationOrderComponents}
          onSelectGenerator={onSelectGenerator}
        />
      ) : null}
      <div className="topology-summary gamma-planarity-note">
        <span className="small-label">Why crossings remain</span>
        <strong>
          {scene.planarity.obstruction
            ? `${scene.planarity.obstruction.kind} obstruction`
            : scene.planarity.isPlanar
              ? "No simple obstruction found"
              : "Non-planar by edge count"}
        </strong>
        <p>{scene.planarity.reason}</p>
      </div>
      {stateHighlightWarning ? (
        <div className="topology-summary gamma-planarity-note">
          <strong>Selected JNW state on Gamma</strong>
          <p>{stateHighlightWarning}</p>
        </div>
      ) : null}
      {scene.legend.length > 0 ? (
        <div className="gamma-legend" aria-label="Gamma relation color legend">
          {scene.legend.map((entry) => (
            <span className="gamma-legend-item" key={entry.label}>
              <span
                className="gamma-legend-swatch"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span>
                {entry.label} ({entry.count})
              </span>
            </span>
          ))}
        </div>
      ) : null}
      {scene.records.length > 0 ? (
        <details className="advanced-details compact-details">
          <summary>All finite relation edges ({scene.records.length})</summary>
          <ul className="plain-list gamma-edge-record-list">
            {scene.records.map((record) => {
              const left =
                system.generators[record.sourceGenerator]?.label ??
                `s${record.sourceGenerator}`;
              const right =
                system.generators[record.targetGenerator]?.label ??
                `s${record.targetGenerator}`;
              return (
                <li key={record.id}>
                  <span className="matrix-key">
                    {left}-{right}: {record.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      ) : (
        <p className="math-note">
          No finite rank-two relation edges are drawn. For example, a universal
          Coxeter system has only m=inf off-diagonal entries, so Gamma has
          isolated generator vertices.
        </p>
      )}
    </div>
  );
}

function GammaRelationOrderComponents({
  summaries,
  onSelectGenerator,
}: {
  summaries: DefiningGraphRelationOrderComponents[];
  onSelectGenerator: (generator: number) => void;
}) {
  return (
    <section
      className="gamma-relation-components"
      aria-label="Relation-order connected components"
    >
      <div className="gamma-relation-components-heading">
        <div>
          <span className="small-label">Monochromatic subgraphs</span>
          <h4>Relation-order connected components</h4>
        </div>
        <span className="status-badge">{summaries.length} orders</span>
      </div>
      <p className="math-note gamma-partition-note">
        Gamma_m keeps exactly the edges labelled m. A value required to agree
        across every m-edge is constant on each component of Gamma_m.
      </p>
      <div className="gamma-relation-order-list">
        {summaries.map((summary) => (
          <div
            className="gamma-relation-order"
            aria-label={`${summary.label} connected components`}
            key={summary.relationOrder}
          >
            <div className="gamma-relation-order-heading">
              <span
                className="gamma-legend-swatch"
                style={{ backgroundColor: summary.color }}
                aria-hidden="true"
              />
              <strong>{summary.label}</strong>
              <span>
                {summary.components.length} edge-bearing component
                {summary.components.length === 1 ? "" : "s"};{" "}
                {summary.edgeCount} edge{summary.edgeCount === 1 ? "" : "s"}
              </span>
            </div>
            <ol className="plain-list gamma-component-list">
              {summary.components.map((component, index) => (
                <li key={component.id}>
                  <span className="gamma-component-label">C{index + 1}</span>
                  <span className="gamma-component-generators">
                    {component.generators.map((generator, generatorIndex) => (
                      <button
                        type="button"
                        className="gamma-neighbor-chip"
                        key={generator}
                        onClick={() => onSelectGenerator(generator)}
                        title={`Inspect ${component.generatorLabels[generatorIndex]}`}
                      >
                        {component.generatorLabels[generatorIndex]}
                      </button>
                    ))}
                  </span>
                  <span className="small-label">
                    {component.edgeIds.length} edge
                    {component.edgeIds.length === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="gamma-isolated-generators">
              <strong>Isolated in Gamma_{summary.relationOrder}:</strong>{" "}
              {summary.isolatedGeneratorLabels.length > 0
                ? summary.isolatedGeneratorLabels.join(", ")
                : "none"}
            </p>
          </div>
        ))}
      </div>
      <p className="gamma-partition-check">
        Each row, together with its isolated singleton generators, partitions
        every generator exactly once.
      </p>
    </section>
  );
}

function GammaIncidencePartition({
  incidence,
  onSelectGenerator,
}: {
  incidence: DefiningGraphVertexIncidence;
  onSelectGenerator: (generator: number) => void;
}) {
  const nonemptyClasses = incidence.classes.filter(
    (relationClass) => relationClass.neighbors.length > 0,
  );
  const classNames = nonemptyClasses.map((relationClass) =>
    relationClass.entry === "inf"
      ? `N_inf(${incidence.label})`
      : `N_${relationClass.entry}(${incidence.label})`,
  );

  return (
    <section
      className="gamma-incidence-partition"
      aria-label={`Incident relation partition for ${incidence.label}`}
    >
      <div className="gamma-incidence-heading">
        <div>
          <span className="small-label">Selected generator</span>
          <h4>Incident relation classes for {incidence.label}</h4>
        </div>
        <span className="status-badge">
          finite degree {incidence.finiteDegree}
        </span>
      </div>
      <p className="math-note gamma-partition-note">
        Each other generator has one Coxeter exponent with {incidence.label}.
        Thus {classNames.join(", ")} form disjoint classes. The m=inf class is
        listed for completeness but has no edge in Gamma.
      </p>
      <div className="gamma-incidence-classes">
        {incidence.classes.map((relationClass) => (
          <div
            className={`gamma-incidence-class${
              relationClass.drawnInGamma ? "" : " is-omitted"
            }`}
            key={relationClass.label}
          >
            <div className="gamma-incidence-class-heading">
              <span
                className="gamma-legend-swatch"
                style={{ backgroundColor: relationClass.color }}
                aria-hidden="true"
              />
              <strong>{relationClass.label}</strong>
              <span>
                {relationClass.neighbors.length} neighbor
                {relationClass.neighbors.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="gamma-neighbor-list">
              {relationClass.neighbors.length > 0 ? (
                relationClass.neighbors.map((neighbor) => (
                  <button
                    type="button"
                    className="gamma-neighbor-chip"
                    key={neighbor.nodeId}
                    onClick={() => onSelectGenerator(neighbor.generator)}
                    title={`Inspect ${neighbor.label}`}
                  >
                    {neighbor.label}
                  </button>
                ))
              ) : (
                <span className="small-label">none</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p
        className="gamma-partition-check"
        data-partition-complete={incidence.isCompletePartition}
      >
        {incidence.isCompletePartition
          ? `Partition check: all ${incidence.totalOtherGenerators} other generators are accounted for exactly once.`
          : `Partition incomplete: ${incidence.accountedNeighborCount} of ${incidence.totalOtherGenerators} other generators are accounted for.`}
      </p>
    </section>
  );
}

function formatCurvature(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function ResearchWorkflowPanel({
  state,
  activeStep,
  lens,
  quotient,
  generators,
  selectedVertexId,
  assignmentLabel,
  boundaryCheckSummary,
  incidentFlows,
  localLinkHomology,
  topologyDiagnostics,
  sceneCountStore,
  fallbackVisibleCounts,
  savedRunCount,
  comparisonStatus,
  onSetStep,
  onMove,
  onRunStep,
  onLoadJnwCube,
  onLens,
  onLensGenerator,
  onSave,
  onCompare,
  onExport,
}: {
  state: ResearchWorkflowState;
  activeStep: ReturnType<typeof activeResearchWorkflowStep>;
  lens: TopologyLensState;
  quotient?: import("../quotient").QuotientComplex;
  generators: CoxeterSystemInput["generators"];
  selectedVertexId?: string;
  assignmentLabel?: string;
  boundaryCheckSummary: string;
  incidentFlows: ReturnType<typeof classifyIncidentEdges>;
  localLinkHomology?: LocalLinkHomologySummary;
  topologyDiagnostics?: ReturnType<typeof summarizeTopologyDiagnostics>;
  sceneCountStore: ViewerInteractionStore;
  fallbackVisibleCounts: SceneCountSnapshot;
  savedRunCount: number;
  comparisonStatus: string;
  onSetStep: (stepId: ResearchWorkflowStepId) => void;
  onMove: (delta: number) => void;
  onRunStep: () => void;
  onLoadJnwCube: () => void;
  onLens: (lensId: TopologyLensId) => void;
  onLensGenerator: (generator: number) => void;
  onSave: () => void;
  onCompare: () => void;
  onExport: () => void;
}) {
  const sceneCounts = useViewerInteractionSelector(
    sceneCountStore,
    "renderStats",
    selectSceneCounts,
    sameSceneCounts,
  );
  const visibleCounts = {
    nodes: sceneCounts.nodes || fallbackVisibleCounts.nodes,
    edges: sceneCounts.edges || fallbackVisibleCounts.edges,
    cells: sceneCounts.cells || fallbackVisibleCounts.cells,
  };
  const steps = researchWorkflowSteps();
  const stepIndex = steps.findIndex((step) => step.id === state.stepId);
  const lensCounts = incidentFlows.reduce(
    (counts, flow) => ({
      ascending:
        counts.ascending + (flow.classification === "ascending" ? 1 : 0),
      descending:
        counts.descending + (flow.classification === "descending" ? 1 : 0),
      level: counts.level + (flow.classification === "level" ? 1 : 0),
    }),
    { ascending: 0, descending: 0, level: 0 },
  );
  const activeLens = topologyLensDefinition(lens.id);
  const topologyHeadline = activeLens.statusText.replace(
    "chosen generator",
    `s${lens.selectedGenerator ?? 0}`,
  );

  return (
    <div className="workflow-panel">
      <div
        className="workflow-steps"
        role="group"
        aria-label="Research workflow steps"
      >
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            aria-pressed={state.stepId === step.id}
            onClick={() => onSetStep(step.id)}
          >
            <span className="small-label">{index + 1}</span>
            {step.label}
          </button>
        ))}
      </div>
      <div className="guide-card">
        <span className="small-label">
          Step {Math.max(0, stepIndex) + 1} / {steps.length}
        </span>
        <h3>{activeStep.title}</h3>
        <p className="math-note">{activeStep.body}</p>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={stepIndex <= 0}
            onClick={() => onMove(-1)}
          >
            Previous
          </button>
          <button type="button" className="button" onClick={onRunStep}>
            {activeStep.primaryAction}
          </button>
          <button type="button" className="button" onClick={onLoadJnwCube}>
            Load JNW cube game
          </button>
          <button
            type="button"
            className="button"
            disabled={stepIndex >= steps.length - 1}
            onClick={() => onMove(1)}
          >
            Next
          </button>
        </div>
      </div>
      <div className="status-row">
        <span className="status-badge">
          {quotient ? quotient.name : "no quotient loaded"}
        </span>
        <span className="status-badge muted">
          cocycle {quotient?.game?.activeCocycleId ?? "not active"}
        </span>
        <span className="status-badge muted">
          vertex {selectedVertexId ?? "none"}
        </span>
      </div>
      <p className="math-note">
        Assignment: {assignmentLabel ?? "none"}. Incident edges:{" "}
        {lensCounts.ascending} ascending, {lensCounts.descending} descending,{" "}
        {lensCounts.level} level.
      </p>
      <p className="math-note">Boundary checks: {boundaryCheckSummary}.</p>
      <div className="topology-lens-readout">
        <strong>{activeLens.label}</strong>
        <p className="math-note">{topologyHeadline}</p>
        <div className="status-row">
          <span className="status-badge">
            {visibleCounts.nodes} visible vertices
          </span>
          <span className="status-badge muted">
            {visibleCounts.edges} visible edges
          </span>
          <span className="status-badge muted">
            {visibleCounts.cells} visible cells
          </span>
        </div>
        {localLinkHomology ? (
          <p className="math-note">
            Local link over F2: {localLinkHomology.connectedComponents}{" "}
            component
            {localLinkHomology.connectedComponents === 1 ? "" : "s"}, H~0=
            {localLinkHomology.reducedBetti0}, H1={localLinkHomology.betti1}.
          </p>
        ) : null}
        {topologyDiagnostics ? (
          <p className="math-note">
            Flag-link check {topologyDiagnostics.linkCondition.status};{" "}
            {topologyDiagnostics.linkCondition.missingFlagSimplices.length}{" "}
            missing simplex
            {topologyDiagnostics.linkCondition.missingFlagSimplices.length === 1
              ? ""
              : "es"}
            .
          </p>
        ) : null}
      </div>
      <div className="preset-grid" role="group" aria-label="Topology lenses">
        {topologyLensDefinitions().map((definition) => (
          <button
            key={definition.id}
            type="button"
            aria-pressed={lens.id === definition.id}
            title={definition.summary}
            onClick={() => onLens(definition.id)}
          >
            {definition.label}
          </button>
        ))}
      </div>
      {lens.id === "generator-star" ||
      lens.id === "generator-family" ||
      lens.id === "edge-star" ||
      lens.id === "cells-incident-edge" ? (
        <div
          className="chip-grid"
          role="group"
          aria-label="Topology lens generator focus"
        >
          {generators.map((generator, index) => (
            <button
              key={generator.id}
              type="button"
              className="chip-button"
              data-active={(lens.selectedGenerator ?? 0) === index}
              aria-pressed={(lens.selectedGenerator ?? 0) === index}
              onClick={() => onLensGenerator(index)}
            >
              {generator.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <button type="button" className="button" onClick={onSave}>
          Save workflow run
        </button>
        <button type="button" className="button" onClick={onCompare}>
          Compare workflow runs
        </button>
        <button type="button" className="button" onClick={onExport}>
          Export reproducible bundle
        </button>
      </div>
      <p className="math-note">
        Notebook: {savedRunCount} saved runs; {comparisonStatus}.
      </p>
    </div>
  );
}

function GuidedInspectionPanel({
  state,
  onStart,
  onStep,
  onExit,
}: {
  state?: GuidedInspectionState;
  onStart: (id: GuidedInspectionId) => void;
  onStep: (delta: number) => void;
  onExit: () => void;
}) {
  const activeGuide = state ? guidedInspectionDefinition(state.id) : undefined;
  const activeStep = activeGuidedInspectionStep(state);

  return (
    <div className="guide-panel">
      <div className="preset-grid" aria-label="Guided inspection modes">
        {guidedInspectionDefinitions().map((guide) => (
          <button
            key={guide.id}
            type="button"
            aria-pressed={state?.id === guide.id}
            title={guide.summary}
            onClick={() => onStart(guide.id)}
          >
            {guide.label}
          </button>
        ))}
      </div>
      {activeGuide && activeStep ? (
        <div className="guide-card">
          <span className="small-label">
            Step {state!.stepIndex + 1} / {activeGuide.steps.length}
          </span>
          <h3>{activeStep.title}</h3>
          <p className="math-note">{activeStep.body}</p>
          <div className="button-row">
            <button
              type="button"
              className="button"
              disabled={state!.stepIndex === 0}
              onClick={() => onStep(-1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="button"
              disabled={state!.stepIndex >= activeGuide.steps.length - 1}
              onClick={() => onStep(1)}
            >
              Next
            </button>
            <button type="button" className="button" onClick={onExit}>
              Exit guide
            </button>
          </div>
        </div>
      ) : (
        <p className="math-note">
          Pick a guide to make the viewer choose a readable mathematical focus.
        </p>
      )}
    </div>
  );
}

function RelationFocusPanel({
  cell,
  pairKeyValue,
  pairOptions,
  relationWalk,
  context = "davis",
}: {
  cell?: DavisTwoCell;
  pairKeyValue?: string;
  pairOptions: ReturnType<typeof rankTwoPairDiagnostics>;
  relationWalk: ReturnType<typeof relationWalkEntries>;
  context?: "davis" | "jnw-cover";
}) {
  const option = pairOptions.find(
    (entry) =>
      entry.key === (cell ? pairKey(cell.generatorPair) : pairKeyValue),
  );

  if (!option || (context === "jnw-cover" && !cell)) {
    return (
      <p className="math-note">
        {context === "jnw-cover"
          ? "Choose Read relation in the JNW Reader to isolate one lifted relation boundary."
          : "Pick a finite generator pair in the relation atlas to isolate one rank-two relation."}
      </p>
    );
  }

  return (
    <>
      <p className="math-note">
        Pair <strong>{option.label}</strong> has <strong>m={option.m}</strong>,
        so{" "}
        {context === "jnw-cover"
          ? "each lifted relation cell"
          : "the Davis rank-two cell"}{" "}
        is a <strong>{option.polygonLabel}</strong> with {option.boundaryLength}{" "}
        alternating generator edges.
      </p>
      <p className="math-note">
        Visible cells: {option.visibleCount}/{option.totalCount}
        {option.clippedCount > 0
          ? `; ${option.clippedCount} clipped by the current view.`
          : "."}
      </p>
      {cell ? (
        <p className="math-note">
          Focused cell: <span className="matrix-key">{cell.id}</span>. Selected
          cell mode shows this polygon, its boundary, and the requested ghost
          shell.
        </p>
      ) : null}
      {relationWalk.length > 0 ? (
        <ol className="relation-walk-list">
          {relationWalk.map((entry) => (
            <li key={`${entry.index}:${entry.nodeId}`}>
              <span>{entry.label}</span>
              {entry.generatorLabelFromPrevious ? (
                <small> after {entry.generatorLabelFromPrevious}</small>
              ) : (
                <small> start</small>
              )}
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}

function YGammaReaderPanel({
  atlas,
  focusPreset,
  activeGeneratorPairKey,
  focusGenerator,
  peelMode,
  cellSeparation,
  separationValue,
  cutawayMode,
  relationStarActive,
  inspectMode,
  cameraPath,
  smallAtlasOpen,
  compareDrawing,
  topologyMode,
  cameraBookmark,
  rankThreeFocusAvailable,
  onPreset,
  onStarLens,
  onFocusPair,
  onFocusGenerator,
  onRelationStar,
  onCutawayMode,
  onSeparationValue,
  onInspectMode,
  onCameraPath,
  onSmallAtlasOpen,
  onCompareDrawing,
  onPeelMode,
  onCellSeparation,
  onTopologyMode,
  onCameraBookmark,
}: {
  atlas: YGammaCellAtlas;
  focusPreset: YGammaFocusPreset;
  activeGeneratorPairKey?: string;
  focusGenerator: number;
  peelMode: YGammaPeelMode;
  cellSeparation: YGammaCellSeparation;
  separationValue: YGammaSeparationValue;
  cutawayMode: YGammaCutawayMode;
  relationStarActive: boolean;
  inspectMode: YGammaInspectMode;
  cameraPath: YGammaCameraPath;
  smallAtlasOpen: boolean;
  compareDrawing: boolean;
  topologyMode: boolean;
  cameraBookmark: YGammaCameraBookmark;
  rankThreeFocusAvailable: boolean;
  onPreset: (preset: YGammaFocusPreset) => void;
  onStarLens: (lens: YGammaStarLens) => void;
  onFocusPair: (key: string) => void;
  onFocusGenerator: (generator: number) => void;
  onRelationStar: () => void;
  onCutawayMode: (mode: YGammaCutawayMode) => void;
  onSeparationValue: (value: YGammaSeparationValue) => void;
  onInspectMode: (mode: YGammaInspectMode) => void;
  onCameraPath: (path: YGammaCameraPath) => void;
  onSmallAtlasOpen: (open: boolean) => void;
  onCompareDrawing: (enabled: boolean) => void;
  onPeelMode: (mode: YGammaPeelMode) => void;
  onCellSeparation: (separation: YGammaCellSeparation) => void;
  onTopologyMode: (enabled: boolean) => void;
  onCameraBookmark: (bookmark: YGammaCameraBookmark) => void;
}) {
  const relationEntries = yGammaPairMatrixEntries(atlas);
  const finiteEntries = relationEntries.filter(
    (entry) => entry.m !== undefined,
  );
  const hasM2 = relationEntries.some((entry) => entry.m === 2);
  const hasM3 = relationEntries.some((entry) => entry.m === 3);
  const presets: Array<{
    id: YGammaFocusPreset;
    label: string;
    disabled?: boolean;
  }> = [
    { id: "one-relation", label: "Read one relation" },
    {
      id: "rank-three-cell",
      label: "Read one rank-three cell",
      disabled: !rankThreeFocusAvailable,
    },
    { id: "around-generator", label: "Show cells around one generator" },
    { id: "m2-squares", label: "Show m=2 square relations", disabled: !hasM2 },
    {
      id: "m3-hexagons",
      label: "Show m=3 hexagon relations",
      disabled: !hasM3,
    },
    { id: "full-skeleton", label: "Show all relation faces" },
  ];

  return (
    <div className="ygamma-reader" data-testid="ygamma-reader">
      <p className="math-note compact-note">
        These controls change the drawing and focus, not the underlying{" "}
        <span className="matrix-key">Y_Gamma</span> cell complex.
      </p>
      <div
        className="preset-grid ygamma-focus-presets"
        role="group"
        aria-label="Narrated Y_Gamma focus presets"
        data-testid="ygamma-focus-presets"
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={focusPreset === preset.id}
            disabled={preset.disabled}
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div
        className="preset-grid compact-grid"
        role="group"
        aria-label="Y_Gamma topology star lenses"
        data-testid="ygamma-star-lenses"
      >
        {(
          [
            ["generator-star", "Show cells around one generator"],
            ["edge-star", "Edge star"],
            ["relation-star", "Relation star"],
            ["rank-three-cell-star", "Read one rank-three cell"],
            ["jnw-ascending-star", "Ascending star"],
            ["jnw-descending-star", "Descending star"],
          ] as const
        ).map(([lens, label]) => (
          <button
            key={lens}
            type="button"
            aria-pressed={
              (lens === "relation-star" && relationStarActive) ||
              (lens === "rank-three-cell-star" &&
                focusPreset === "rank-three-cell")
            }
            disabled={
              lens === "rank-three-cell-star" && !rankThreeFocusAvailable
            }
            onClick={() => onStarLens(lens)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="field inline-field">
        <label htmlFor="ygamma-focus-relation">Focus relation star</label>
        <select
          id="ygamma-focus-relation"
          value={activeGeneratorPairKey ?? ""}
          onChange={(event) => {
            if (event.target.value) {
              onFocusPair(event.target.value);
            }
          }}
        >
          <option value="">No relation selected</option>
          {finiteEntries.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}: m={entry.m}, {entry.polygonLabel}
            </option>
          ))}
        </select>
        <small className="field-help">
          Choose the finite generator pair whose relation cells should carry the
          focus, labels, and inspector explanation.
        </small>
      </div>
      <div className="field inline-field">
        <label htmlFor="ygamma-focus-generator">
          Show cells around one generator
        </label>
        <select
          id="ygamma-focus-generator"
          value={focusGenerator}
          onChange={(event) => onFocusGenerator(Number(event.target.value))}
        >
          {atlas.generatorCells.map((cell) => (
            <option key={cell.id} value={cell.generators[0] ?? 0}>
              {cell.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field inline-field" data-testid="ygamma-cutaway">
        <span className="field-label">Show only...</span>
        <div
          className="segmented segmented-three"
          role="group"
          aria-label="Y_Gamma cutaway mode"
        >
          {(
            [
              ["none", "See all"],
              ["generator-family", "Generator"],
              ["relation-order", "Same m"],
              ["rank", "Rank 3"],
              ["incident-to-selected-edge", "Edge star"],
              ["incident-to-selected-relation", "Relation star"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              data-cutaway-mode={mode}
              aria-pressed={cutawayMode === mode}
              onClick={() => onCutawayMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <small className="field-help">
          Nonmatching cells are hidden or ghosted in the drawing. Their
          incidence data is not rewritten.
        </small>
      </div>
      <div className="field inline-field">
        <span className="field-label">Separate cells for reading</span>
        <div
          className="segmented segmented-three"
          role="group"
          aria-label="Y_Gamma separate cells for reading"
          data-testid="ygamma-drawing"
        >
          {(
            [
              ["coherent", "Coherent"],
              ["readable", "Readable"],
              ["expanded", "Expanded"],
            ] as const
          ).map(([separation, label]) => (
            <button
              key={separation}
              type="button"
              data-separation-preset={separation}
              aria-pressed={cellSeparation === separation}
              onClick={() => onCellSeparation(separation)}
            >
              {label}
            </button>
          ))}
        </div>
        <small className="field-help">
          Separates relation sheets in the drawing only. The shared Y_Gamma
          incidence data does not change.
        </small>
        <input
          aria-label="Y_Gamma cell separation value"
          className="range-control"
          max={100}
          min={0}
          step={5}
          type="range"
          value={separationValue}
          onChange={(event) => onSeparationValue(Number(event.target.value))}
        />
        <div className="range-ticks" aria-hidden="true">
          <span>Coherent</span>
          <span>Readable</span>
          <span>Expanded</span>
        </div>
      </div>
      <div data-testid="ygamma-labels">
        <Toggle
          checked={topologyMode}
          label="Glassy topology drawing"
          onChange={onTopologyMode}
        />
      </div>
      <div className="field inline-field">
        <span className="field-label">Click behavior</span>
        <div
          className="segmented segmented-three"
          role="group"
          aria-label="Y_Gamma click behavior"
        >
          {(
            [
              ["inspect-cell", "Inspect cell"],
              ["inspect-edge", "Inspect edge"],
              ["select-relation-family", "Select relation family"],
              ["orbit-selected-object", "Orbit selected object"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={inspectMode === mode}
              onClick={() => onInspectMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="segmented segmented-three"
        role="group"
        aria-label="Y_Gamma cell peeling"
      >
        {(
          [
            ["selected-face", "Face"],
            ["adjacent-faces", "Show cells incident to this edge"],
            ["same-rank-three", "Show full rank-three cell"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={peelMode === mode}
            onClick={() => onPeelMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="math-note compact-note">
        Cell peeling changes how much of the selected rank-three cell is shown:
        <strong> Face</strong> keeps one relation face,{" "}
        <strong>Show cells incident to this edge</strong> keeps faces sharing an
        edge with it, and <strong>Show full rank-three cell</strong> keeps all
        faces of that rank-three boundary.
      </p>
      <div
        className="segmented segmented-three"
        role="group"
        aria-label="Y_Gamma camera paths"
        data-testid="ygamma-camera-path"
      >
        {(
          [
            ["selected-relation", "See relation"],
            ["square-family", "Squares"],
            ["hexagon-family", "Hexagons"],
            ["shared-generator", "Shared gen"],
            ["relation-star", "Orbit star"],
          ] as const
        ).map(([path, label]) => (
          <button
            key={path}
            type="button"
            data-camera-path={path}
            aria-pressed={cameraPath === path}
            onClick={() => onCameraPath(path)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="segmented segmented-three"
        role="group"
        aria-label="Y_Gamma camera bookmarks"
      >
        {(
          [
            ["front", "Front"],
            ["top", "Top"],
            ["rank-three-cell", "Rank-three"],
            ["square-family", "Squares"],
            ["hexagon-family", "Hexagons"],
          ] as const
        ).map(([bookmark, label]) => (
          <button
            key={bookmark}
            type="button"
            aria-pressed={cameraBookmark === bookmark}
            onClick={() => onCameraBookmark(bookmark)}
          >
            {label}
          </button>
        ))}
      </div>
      <details
        className="catalogue-panel compact-details"
        data-testid="ygamma-advanced-readability"
      >
        <summary>Advanced readability</summary>
        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            data-readable-action="relation-star"
            aria-pressed={relationStarActive}
            onClick={onRelationStar}
          >
            Extract relation star
          </button>
          <button
            type="button"
            className="secondary-button"
            data-readable-action="relation-atlas"
            aria-pressed={smallAtlasOpen}
            onClick={() => onSmallAtlasOpen(!smallAtlasOpen)}
          >
            {smallAtlasOpen ? "Hide relation atlas" : "Show relation atlas"}
          </button>
          <button
            type="button"
            className="secondary-button"
            data-readable-action="compare-drawing"
            aria-pressed={compareDrawing}
            onClick={() => onCompareDrawing(!compareDrawing)}
          >
            Compare shared vs separated drawing
          </button>
        </div>
        <p className="math-note compact-note">
          Relation star keeps the selected relation, incident higher cells, and
          a faint context layer. Compare shared vs separated drawing shows two
          versions of the same incidence data.
        </p>
      </details>
      <p className="math-note">
        This reader changes visibility, labels, camera, opacity, and the
        explanation together. Use Focus relation star to choose a finite pair;
        use camera bookmarks only to change the viewing angle.
      </p>
    </div>
  );
}

function YGammaMiniAtlasOverlay({
  atlas,
  activeGeneratorPairKey,
  onFocusPair,
}: {
  atlas: YGammaCellAtlas;
  activeGeneratorPairKey?: string;
  onFocusPair: (key: string) => void;
}) {
  const entries = yGammaPairMatrixEntries(atlas);
  const groups = [
    {
      id: "m2",
      label: "m=2",
      entries: entries.filter((entry) => entry.m === 2),
    },
    {
      id: "m3",
      label: "m=3",
      entries: entries.filter((entry) => entry.m === 3),
    },
    {
      id: "m4plus",
      label: "m>=4",
      entries: entries.filter((entry) => entry.m !== undefined && entry.m >= 4),
    },
    {
      id: "infinite",
      label: "inf",
      entries: entries.filter((entry) => entry.m === undefined),
    },
  ].filter((group) => group.entries.length > 0);

  return (
    <aside
      className="ygamma-mini-atlas"
      aria-label="Y_Gamma relation atlas"
      data-testid="ygamma-relation-atlas"
    >
      <strong>Relation atlas</strong>
      {groups.map((group) => (
        <div key={group.id} className="ygamma-mini-group">
          <span className="small-label">{group.label}</span>
          <div className="ygamma-mini-grid">
            {group.entries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                disabled={entry.m === undefined}
                data-active={activeGeneratorPairKey === entry.key}
                data-relation-key={entry.key}
                data-relation-order={entry.m ?? "inf"}
                onClick={() => onFocusPair(entry.key)}
                title={
                  entry.m === undefined
                    ? `${entry.label}: infinite pair, no rank-two cell`
                    : `${entry.label}: m=${entry.m}, ${entry.polygonLabel}`
                }
              >
                <span>{entry.label}</span>
                <strong>
                  {entry.m === undefined ? "inf" : `m=${entry.m}`}
                </strong>
                <small>{entry.polygonLabel}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function YGammaCombinedComparisonView({
  scene,
  generators,
  activeGeneratorPair,
  selectedCellId,
  topologyMode,
  colorScheme,
  focusSignal,
  onCapturePngReady,
  onRenderStats,
  onSelectCell,
}: {
  scene: YGammaDrawingComparisonScene;
  generators: SceneGenerator[];
  activeGeneratorPair?: [number, number];
  selectedCellId?: string;
  topologyMode: boolean;
  colorScheme: "light" | "dark";
  focusSignal: number;
  onCapturePngReady: (capture: (() => Promise<string>) | undefined) => void;
  onRenderStats: (stats: SceneRenderStats) => void;
  onSelectCell: (cellId: string) => void;
}) {
  const revisionSet = useMemo(
    () =>
      buildSceneRevisionSet({
        nodes: scene.nodes,
        edges: scene.edges,
        cells: scene.cells,
        appearanceParts: [
          "comparison:coherent-expanded",
          `selected-cell:${selectedCellId ?? ""}`,
          `pair:${activeGeneratorPair ? pairKey(activeGeneratorPair) : ""}`,
          `topology:${topologyMode}`,
          `theme:${colorScheme}`,
        ],
        labelParts: [`edge-labels:${scene.edges.length}`],
      }),
    [activeGeneratorPair, colorScheme, scene, selectedCellId, topologyMode],
  );
  const selectSourceCell = useCallback(
    (renderedCellId: string) =>
      onSelectCell(
        scene.sourceCellIdByRenderedId.get(renderedCellId) ?? renderedCellId,
      ),
    [onSelectCell, scene],
  );

  return (
    <div
      className="ygamma-comparison-grid is-shared-canvas"
      aria-label="Coherent and expanded Y_Gamma drawing comparison"
      data-testid="ygamma-comparison-scene"
    >
      <div
        className="ygamma-comparison-pane-label is-left"
        data-testid="ygamma-comparison-left"
      >
        <strong>Coherent shared spine</strong>
        <span>Shared incidence, no visual separation</span>
      </div>
      <div
        className="ygamma-comparison-pane-label is-right"
        data-testid="ygamma-comparison-right"
      >
        <strong>Expanded readability</strong>
        <span>The same incidence with drawing-only separation</span>
      </div>
      <SceneView
        nodes={scene.nodes}
        edges={scene.edges}
        cells={scene.cells}
        generators={generators}
        structureVersion={revisionSet.structureVersion}
        appearanceVersion={revisionSet.renderAppearanceVersion}
        revisionSet={revisionSet}
        selectedNodeId={scene.selectedNodeId}
        selectedCellId={selectedCellId}
        showCells
        showNodeLabels={false}
        showEdgeLabels
        labelScope="budgeted"
        activeGeneratorPair={activeGeneratorPair}
        localCellRenderMode="in-graph"
        occlusionMode="x-ray"
        cellOpacity={topologyMode ? 0.16 : 0.3}
        panelOffsetStrength={0}
        topologyMode={topologyMode}
        semanticLabelsOnly
        cameraPreset="global"
        resetSignal={0}
        focusNodeId={scene.selectedNodeId}
        focusSignal={focusSignal}
        maxNodeLabels={0}
        maxEdgeLabels={Math.max(scene.edges.length, 160)}
        pickingEnabled
        colorScheme={colorScheme}
        sceneLabel="Coherent and expanded Y_Gamma drawing comparison"
        onCapturePngReady={onCapturePngReady}
        onRenderStats={onRenderStats}
        onSelectNode={ignoreSceneNodeSelection}
        onSelectCell={selectSourceCell}
      />
    </div>
  );
}

function ignoreSceneNodeSelection() {
  // Comparison mode reads relation cells; its duplicated drawing nodes are not
  // separate mathematical selections.
}

function YGammaWhyPanel({
  relation,
  sceneCellId,
  focusPreset,
  peelMode,
  cellSeparation,
}: {
  relation?: YGammaCellRecord;
  sceneCellId?: string;
  focusPreset: YGammaFocusPreset;
  peelMode: YGammaPeelMode;
  cellSeparation: YGammaCellSeparation;
}) {
  if (!relation || relation.m === undefined) {
    return (
      <p className="math-note">
        Hover a filled face or choose a finite pair in the relation picker to
        see why that relation cell is part of{" "}
        <span className="matrix-key">Y_Gamma</span>.
      </p>
    );
  }

  return (
    <>
      <p className="math-note">
        This face is the rank-two relation cell for generators{" "}
        <strong>{relation.generatorLabels.join(", ")}</strong>. Since{" "}
        <strong>m={relation.m}</strong>, its boundary is a{" "}
        <strong>{relation.polygonLabel}</strong> attached by the alternating
        word below.
      </p>
      <ol className="relation-walk-list">
        {relation.attachingWord.map((label, index) => (
          <li key={`${relation.id}:${index}`}>
            <span>
              {index}: {label}
            </span>
          </li>
        ))}
      </ol>
      <table className="inspector-table">
        <tbody>
          <tr>
            <th>Scene face</th>
            <td className="matrix-key">{sceneCellId ?? relation.id}</td>
          </tr>
          <tr>
            <th>Preset</th>
            <td>{yGammaPresetLabel(focusPreset)}</td>
          </tr>
          <tr>
            <th>Peeling</th>
            <td>{yGammaPeelLabel(peelMode)}</td>
          </tr>
          <tr>
            <th>Drawing status</th>
            <td>{yGammaCellSeparationLabel(cellSeparation)}</td>
          </tr>
          <tr>
            <th>Boundary</th>
            <td>{relation.boundaryLength} directed edge steps</td>
          </tr>
        </tbody>
      </table>
      <p className="math-note">
        Edge labels in the 3D view name generators. The numbered list above is
        the relation walk around the selected face.
      </p>
    </>
  );
}

function YGammaTopologyChecklist({
  atlas,
  activeGeneratorPairKey,
  focusGenerator,
  rankThreeFocus,
  visibleCells,
}: {
  atlas: YGammaCellAtlas;
  activeGeneratorPairKey?: string;
  focusGenerator?: number;
  rankThreeFocus?: YGammaRankThreeFocus;
  visibleCells: Array<{
    id: string;
    generatorPair?: [number, number];
    sourceCellId?: string;
  }>;
}) {
  const selectedGeneratorSet = new Set<number>();
  const activePair = parsePairKey(activeGeneratorPairKey);
  if (activePair) {
    selectedGeneratorSet.add(activePair[0]);
    selectedGeneratorSet.add(activePair[1]);
  }
  if (focusGenerator !== undefined) {
    selectedGeneratorSet.add(focusGenerator);
  }
  for (const generator of rankThreeFocus?.generatorSet ?? []) {
    selectedGeneratorSet.add(generator);
  }

  const selectedLabels = [...selectedGeneratorSet]
    .sort((left, right) => left - right)
    .map(
      (generator) => atlas.generatorCells[generator]?.label ?? `s${generator}`,
    );
  const relevantFinitePairs = atlas.rankTwoCells.filter((cell) =>
    selectedGeneratorSet.size === 0
      ? true
      : cell.generators.some((generator) =>
          selectedGeneratorSet.has(generator),
        ),
  );
  const higherPresent = atlas.higherCells.some((cell) =>
    rankThreeFocus
      ? cell.id === rankThreeFocus.cellId
      : [...selectedGeneratorSet].every((generator) =>
          cell.generators.includes(generator),
        ),
  );

  return (
    <ul className="subset-list">
      <li>
        <span className="subset-rank">generators</span>
        <span>
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : "all"}
        </span>
      </li>
      <li>
        <span className="subset-rank">finite pairs</span>
        <span>{relevantFinitePairs.length}</span>
      </li>
      <li>
        <span className="subset-rank">visible 2-cells</span>
        <span>
          {
            visibleCells.filter(
              (cell) =>
                cell.generatorPair !== undefined &&
                (cell.sourceCellId === undefined ||
                  cell.sourceCellId.startsWith("Y:higher:")),
            ).length
          }
        </span>
      </li>
      <li>
        <span className="subset-rank">higher cell</span>
        <span>
          {higherPresent ? "present in cell inventory" : "none for focus"}
        </span>
      </li>
      <li>
        <span className="subset-rank">local link</span>
        <span>
          {atlas.nerveVertices.length} vertices, {atlas.nerveSimplexCount}{" "}
          spherical simplices
        </span>
      </li>
    </ul>
  );
}

function yGammaPairMatrixEntries(atlas: YGammaCellAtlas): Array<{
  key: string;
  label: string;
  m?: number;
  polygonLabel: string;
}> {
  const relationByKey = new Map(
    atlas.rankTwoCells.map((cell) => [
      relationCellPairKey(cell.generators),
      cell,
    ]),
  );
  const entries: Array<{
    key: string;
    label: string;
    m?: number;
    polygonLabel: string;
  }> = [];
  for (let left = 0; left < atlas.generatorCells.length; left += 1) {
    for (
      let right = left + 1;
      right < atlas.generatorCells.length;
      right += 1
    ) {
      const key = relationCellPairKey([left, right]);
      const relation = relationByKey.get(key);
      entries.push({
        key,
        label: `${atlas.generatorCells[left]?.label ?? `s${left}`}-${atlas.generatorCells[right]?.label ?? `s${right}`}`,
        m: relation?.m,
        polygonLabel: relation?.polygonLabel ?? "absent",
      });
    }
  }
  return entries;
}

function yGammaPresetLabel(preset: YGammaFocusPreset): string {
  switch (preset) {
    case "one-relation":
      return "one relation";
    case "rank-three-cell":
      return "one rank-three cell";
    case "around-generator":
      return "all cells around one generator";
    case "m2-squares":
      return "m=2 square family";
    case "m3-hexagons":
      return "m=3 hexagon family";
    case "full-skeleton":
      return "full Y_Gamma 2-skeleton";
  }
}

function yGammaPeelLabel(peelMode: YGammaPeelMode): string {
  switch (peelMode) {
    case "selected-face":
      return "selected face only";
    case "adjacent-faces":
      return "selected face plus adjacent faces";
    case "same-rank-three":
      return "same rank-three cell";
    case "all":
      return "all visible faces";
  }
}

function yGammaCellSeparationLabel(separation: YGammaCellSeparation): string {
  switch (separation) {
    case "coherent":
      return "coherent shared spine";
    case "expanded":
      return "expanded relation sheets";
    case "readable":
    default:
      return "readable relation sheets";
  }
}

function YGammaNerveDiagnosticViewer({
  atlas,
  activeGeneratorPairKey,
  onFocusPair,
  onShowComplex,
}: {
  atlas: YGammaCellAtlas;
  activeGeneratorPairKey?: string;
  onFocusPair: (key: string) => void;
  onShowComplex: () => void;
}) {
  const width = 900;
  const height = 620;
  const center = { x: width / 2, y: height / 2 + 12 };
  const radius = Math.min(width, height) * 0.34;
  const positions = new Map(
    atlas.generatorCells.map((cell, index) => {
      const angle =
        -Math.PI / 2 + (2 * Math.PI * index) / atlas.generatorCells.length;
      return [
        cell.generators[0] ?? index,
        {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
          label: cell.label,
          color: generatorPalette(index),
        },
      ] as const;
    }),
  );
  const activeRelation = atlas.rankTwoCells.find(
    (cell) => relationCellPairKey(cell.generators) === activeGeneratorPairKey,
  );

  return (
    <section
      className="ygamma-viewer"
      data-testid="ygamma-local-link-viewer"
      aria-label="2D Y_Gamma nerve schematic"
    >
      <div className="ygamma-viewer-header">
        <div>
          <h2>2D Nerve / Local-Link Schematic</h2>
          <p>
            This flat schematic is derived from spherical subsets. It explains
            the local link, but it is not the 3D Y_Gamma complex.
          </p>
        </div>
        <button type="button" className="button" onClick={onShowComplex}>
          Show 3D Y_Gamma model
        </button>
      </div>
      <svg
        className="ygamma-nerve-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`2D local-link schematic for ${atlas.systemName}`}
      >
        <circle
          className="ygamma-nerve-guide"
          cx={center.x}
          cy={center.y}
          r={radius}
        />
        {atlas.higherCells.map((cell) => {
          const points = cell.generators
            .map((generator) => positions.get(generator))
            .filter(
              (
                point,
              ): point is {
                x: number;
                y: number;
                label: string;
                color: string;
              } => Boolean(point),
            );
          return points.length >= 3 ? (
            <polygon
              key={cell.id}
              className="ygamma-nerve-simplex"
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            />
          ) : null;
        })}
        {atlas.rankTwoCells.map((cell) => {
          const [left, right] = cell.generators.map((generator) =>
            positions.get(generator),
          );
          if (!left || !right) {
            return null;
          }
          const key = relationCellPairKey(cell.generators);
          const active = key === activeGeneratorPairKey;
          return (
            <g
              key={cell.id}
              role="button"
              tabIndex={0}
              aria-label={`Focus ${cell.label} relation cell`}
              onClick={() => onFocusPair(key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocusPair(key);
                }
              }}
            >
              <line
                className="ygamma-nerve-chord-hit"
                x1={left.x}
                y1={left.y}
                x2={right.x}
                y2={right.y}
              />
              <line
                className={`ygamma-nerve-chord${active ? " is-active" : ""}`}
                x1={left.x}
                y1={left.y}
                x2={right.x}
                y2={right.y}
              />
              {active ? (
                <text
                  className="ygamma-nerve-relation-label"
                  x={(left.x + right.x) / 2}
                  y={(left.y + right.y) / 2 - 8}
                  textAnchor="middle"
                >
                  m={cell.m} {cell.polygonLabel}
                </text>
              ) : null}
            </g>
          );
        })}
        {atlas.generatorCells.map((cell, index) => {
          const point = positions.get(cell.generators[0] ?? index);
          if (!point) {
            return null;
          }
          return (
            <g key={cell.id}>
              <circle
                className="ygamma-nerve-node"
                cx={point.x}
                cy={point.y}
                r="18"
                style={{ fill: point.color }}
              />
              <text
                className="ygamma-nerve-node-label"
                x={point.x}
                y={point.y + 5}
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="ygamma-viewer-footer">
        <p>
          The filled regions here are nerve simplices: they describe which
          generator subsets are spherical. They are not Euclidean faces of an
          embedded polytope, and they are not the 3D Y_Gamma model.
        </p>
        {activeRelation ? (
          <p>
            Active relation: <strong>{activeRelation.label}</strong>, m=
            {activeRelation.m}, so the corresponding Davis 2-cell has{" "}
            {activeRelation.boundaryLength} alternating edges. Attaching word:{" "}
            <span className="matrix-key">
              {activeRelation.attachingWord.join(" ")}
            </span>
            .
          </p>
        ) : (
          <p>Click a chord to focus a rank-two relation cell.</p>
        )}
      </div>
    </section>
  );
}

function YGammaAtlasPanel({
  atlas,
  active,
  activeGeneratorPairKey,
  rankThreeFocus,
  rankThreeFocusEnabled,
  onShowComplex,
  onShowNerve,
  onShowGamma,
  onFocusPair,
  onFocusRankThree,
  onFocusRankThreePair,
}: {
  atlas: YGammaCellAtlas;
  active: boolean;
  activeGeneratorPairKey?: string;
  rankThreeFocus?: YGammaRankThreeFocus;
  rankThreeFocusEnabled: boolean;
  onShowComplex: () => void;
  onShowNerve: () => void;
  onShowGamma: () => void;
  onFocusPair: (key: string) => void;
  onFocusRankThree: () => void;
  onFocusRankThreePair: (key: string) => void;
}) {
  const activeRelation = atlas.rankTwoCells.find(
    (cell) => relationCellPairKey(cell.generators) === activeGeneratorPairKey,
  );
  const higherRankGroups = atlas.rankGroups.filter((group) => group.rank >= 3);
  const rankThreePairs = rankThreeFocusPairOptions(atlas, rankThreeFocus);

  return (
    <>
      <p className="math-note">
        This atlas records the fundamental-domain cell complex{" "}
        <span className="matrix-key">Y_Gamma</span>: the base vertex, oriented
        generator arrows, and relation cells/polytopes. The 2D nerve schematic
        is a derived local-topology diagnostic, not the complex itself.
      </p>
      <div className="badge-row">
        <span className="status-badge">
          {active ? "3D model open" : "data panel only"}
        </span>
        <span className="status-badge muted">one quotient vertex</span>
        <span className="status-badge muted">relation polytopes</span>
      </div>
      <ul className="subset-list">
        {atlas.rankGroups.map((group) => (
          <li key={group.rank}>
            <span className="subset-rank">{group.label}</span>
            <span>
              {group.cells.length} cell{group.cells.length === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
      <p className="math-note">
        2D nerve/local link: {atlas.nerveVertices.length} generator vertices and{" "}
        {atlas.nerveSimplexCount} spherical simplex
        {atlas.nerveSimplexCount === 1 ? "" : "es"}.
      </p>
      <div className="label-legend" aria-label="Y_Gamma label meanings">
        {atlas.labelLegend.map((entry) => (
          <div key={entry.token} className="label-legend-row">
            <span className="matrix-key">{entry.token}</span>
            <span>{entry.meaning}</span>
          </div>
        ))}
      </div>
      <div className="button-row">
        <button type="button" className="button" onClick={onShowComplex}>
          Show 3D Y_Gamma model
        </button>
        <button type="button" className="button" onClick={onShowNerve}>
          Show 2D nerve schematic
        </button>
        <button type="button" className="button" onClick={onShowGamma}>
          Show defining graph Gamma
        </button>
        <button
          type="button"
          className="button"
          disabled={!activeRelation}
          onClick={() => {
            if (activeRelation) {
              onFocusPair(relationCellPairKey(activeRelation.generators));
            }
          }}
        >
          Refocus active relation
        </button>
        <button
          type="button"
          className="button"
          disabled={!rankThreeFocus}
          aria-pressed={rankThreeFocusEnabled}
          title="Focus a rank-three cell containing the active relation, when one is available."
          onClick={onFocusRankThree}
        >
          Focus rank-three cell containing this relation
        </button>
      </div>
      {rankThreeFocus ? (
        <>
          <p className="math-note">
            Active rank-three focus:{" "}
            <span className="matrix-key">{rankThreeFocus.cellId}</span> with{" "}
            <span className="matrix-key">
              {rankThreeFocus.pairKeys.join(" + ")}
            </span>
            . Use the buttons below or the relation picker to choose which
            rank-two relation family anchors the view.
          </p>
          <div className="button-row">
            {rankThreePairs.map((pair) => (
              <button
                type="button"
                className="button"
                key={pair.key}
                data-active={activeGeneratorPairKey === pair.key}
                onClick={() => onFocusRankThreePair(pair.key)}
              >
                {pair.buttonLabel}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div
        className="ygamma-relation-grid"
        role="group"
        aria-label="Y_Gamma rank-two relation cells"
      >
        {atlas.rankTwoCells.map((cell) => {
          const key = relationCellPairKey(cell.generators);
          return (
            <button
              key={cell.id}
              type="button"
              className="pair-matrix-button"
              data-active={activeGeneratorPairKey === key}
              onClick={() => onFocusPair(key)}
            >
              <strong>{cell.label}</strong>
              <small>
                m={cell.m}; {cell.polygonLabel}; {cell.boundaryLength} boundary
                steps
              </small>
              <small>{cell.id}</small>
            </button>
          );
        })}
      </div>
      {activeRelation ? (
        <p className="math-note">
          Active attaching word:{" "}
          <span className="matrix-key">
            {activeRelation.attachingWord.join(" ")}
          </span>
          . Each step returns to the same quotient vertex{" "}
          <span className="matrix-key">*</span>.
        </p>
      ) : null}
      {higherRankGroups.length > 0 ? (
        <div className="ygamma-higher-summary">
          <p className="math-note">
            Higher spherical cells are exact incidence records. Their 3D drawing
            is a readability model, not a certified Euclidean embedding.
          </p>
          <ul className="subset-list">
            {higherRankGroups.map((group) => (
              <li key={group.rank}>
                <span className="subset-rank">rank {group.rank}</span>
                <span>
                  {group.cells.length} cell{group.cells.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function relationCellPairKey(generators: number[]): string {
  return pairKey([generators[0] ?? 0, generators[1] ?? 0]);
}

function generatorPalette(index: number): string {
  const colors = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#d97706",
    "#0891b2",
    "#be123c",
    "#4f46e5",
    "#0f766e",
    "#7c3aed",
  ];
  return colors[index % colors.length];
}

function QuotientImportProgress({
  client,
}: {
  client: QuotientValidationClient;
}) {
  const progress = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  );
  if (progress.stage === "idle") {
    return null;
  }

  const percent = Math.round(progress.progress * 100);
  const running =
    progress.stage === "reading" ||
    progress.stage === "parsing" ||
    progress.stage === "validating";
  return (
    <div
      className={`quotient-import-progress is-${progress.stage}`}
      data-testid="quotient-import-progress"
      role={progress.stage === "failed" ? "alert" : "status"}
    >
      <div className="quotient-import-progress-heading">
        <strong>{running ? "Checking quotient" : "Quotient import"}</strong>
        <span>{running ? `${percent}%` : progress.stage}</span>
      </div>
      <progress
        max={1}
        value={progress.progress}
        aria-label={progress.message}
      />
      <span>{progress.message}</span>
      {running ? (
        <button
          type="button"
          className="button subtle"
          onClick={() => client.cancel()}
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}

function ResearchStatusPanel({
  system,
  ball,
  davisIncidence,
  sceneCountStore,
  desktopStatus,
  desktopMessage,
  sessionDirty,
  recentSessions,
  desktopTools,
  desktopJobs,
}: {
  system: CoxeterSystemInput;
  ball?: GeneratedCayleyBall;
  davisIncidence?: import("../types").DavisIncidencePoset;
  sceneCountStore: ViewerInteractionStore;
  desktopStatus: DesktopBridgeStatus | null;
  desktopMessage: string | null;
  sessionDirty: boolean;
  recentSessions: readonly ProjectSessionRecentFile[];
  desktopTools: readonly ExternalToolStatus[];
  desktopJobs: readonly DesktopJobRecord[];
}) {
  const sceneCounts = useViewerInteractionSelector(
    sceneCountStore,
    "renderStats",
    selectSceneCounts,
    sameSceneCounts,
  );
  const status = system.dataStatus ?? "toy";
  const certification =
    ball?.metadata.certification?.status ??
    (system.certificate?.status === "passed" ? "certified" : "uncertified");
  const geometryCertificate =
    system.geometry?.certifiedModel?.certificate.status === "passed"
      ? "interval-certified"
      : "visualization";
  const geometryScopes =
    system.geometry?.certifiedModel?.certificate.scopes?.join(", ") ??
    "browser numerical placement";
  const externalChecks = system.checkerSummaries?.filter(
    (summary) => summary.status === "passed",
  ).length;

  const foundToolCount = desktopTools.filter((tool) => tool.found).length;
  const desktopRuntime = desktopStatus
    ? desktopStatus.nativeAvailable
      ? "desktop bridge"
      : desktopStatus.runtime
    : "checking";

  return (
    <div className="research-status-cards">
      <details className="research-status-card" open>
        <summary>
          <strong>Data</strong>
          <span>
            {status}, {certification}
          </span>
        </summary>
        <ul className="subset-list">
          <li>
            <span className="subset-rank">sources</span>
            <span>{system.sourceRefs?.length ?? 0}</span>
          </li>
          <li>
            <span className="subset-rank">external checks</span>
            <span>{externalChecks ?? 0}</span>
          </li>
          <li>
            <span className="subset-rank">Davis</span>
            <span>
              {davisIncidence
                ? `${davisIncidence.records.length} records (${davisIncidence.status})`
                : "not computed"}
            </span>
          </li>
          <li>
            <span className="subset-rank">scene</span>
            <span>
              {sceneCounts.nodes} nodes, {sceneCounts.edges} edges
            </span>
          </li>
        </ul>
      </details>

      <details className="research-status-card">
        <summary>
          <strong>Geometry</strong>
          <span>{geometryCertificate}</span>
        </summary>
        <ul className="subset-list">
          <li>
            <span className="subset-rank">scopes</span>
            <span>{geometryScopes}</span>
          </li>
        </ul>
      </details>

      <details className="research-status-card">
        <summary>
          <strong>Desktop</strong>
          <span>{desktopRuntime}</span>
        </summary>
        <ul className="subset-list">
          <li>
            <span className="subset-rank">workspace</span>
            <span>
              {desktopStatus?.workspace.label ?? "checking workspace"}
            </span>
          </li>
          <li>
            <span className="subset-rank">session</span>
            <span>{sessionDirty ? "unsaved changes" : "saved"}</span>
          </li>
          <li>
            <span className="subset-rank">recent</span>
            <span>{recentSessions.length} sessions</span>
          </li>
          {desktopMessage ? (
            <li>
              <span className="subset-rank">message</span>
              <span>{desktopMessage}</span>
            </li>
          ) : null}
        </ul>
      </details>

      <details className="research-status-card">
        <summary>
          <strong>External tools</strong>
          <span>
            {desktopTools.length > 0
              ? `${foundToolCount}/${desktopTools.length} found`
              : "not checked"}
          </span>
        </summary>
        <ul className="subset-list">
          <li>
            <span className="subset-rank">tools</span>
            <span>
              {desktopTools.length > 0
                ? `${foundToolCount}/${desktopTools.length} found`
                : "not checked"}
            </span>
          </li>
          <li>
            <span className="subset-rank">jobs</span>
            <span>
              {desktopJobs.length > 0
                ? `${desktopJobs[0].kind}: ${desktopJobs[0].status}`
                : "none"}
            </span>
          </li>
        </ul>
      </details>
    </div>
  );
}

function WarningGroupsView({
  groups,
  showAll,
  onToggleShowAll,
}: {
  groups: WarningGroup[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const allWarnings = groups.flatMap((group) =>
    group.warnings.map((warning) => ({ group, warning })),
  );
  const headlineWarning =
    allWarnings.find(
      ({ group }) => group.id === "important" || group.id === "approximation",
    ) ?? allWarnings[0];

  return (
    <>
      {!showAll && headlineWarning ? (
        <p className="caveat-headline">
          <span className="warning-group-label">
            {headlineWarning.group.label}
          </span>
          {headlineWarning.warning}
        </p>
      ) : null}
      <details
        className="caveats-drawer"
        open={showAll}
        onToggle={(event) => {
          if (event.currentTarget.open !== showAll) {
            onToggleShowAll();
          }
        }}
      >
        <summary>
          <span>
            {allWarnings.length} caveat{allWarnings.length === 1 ? "" : "s"}
          </span>
          <span className="warning-chip-row" aria-label="Caveat categories">
            {groups.map((group) => (
              <span className="warning-group-label" key={group.id}>
                {group.label}: {group.warnings.length}
              </span>
            ))}
          </span>
        </summary>
        <ul className="warning-list">
          {allWarnings.map(({ group, warning }) => (
            <li key={`${group.id}:${warning}`}>
              <span className="warning-group-label">{group.label}</span>
              {warning}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

function ExperimentComparisonSummary({
  bundles,
}: {
  bundles: ExperimentBundle[];
}) {
  const comparison = compareLatestNotebookRuns(bundles);
  if (!comparison) {
    return null;
  }
  const deltas = Object.entries(comparison.countDeltas);

  return (
    <div className="experiment-summary">
      <p className="math-note">
        Compared newest run with the previous saved run. Status{" "}
        {comparison.statusChanged ? "changed" : "unchanged"}.
      </p>
      {deltas.length > 0 ? (
        <ul className="plain-list">
          {deltas.map(([key, value]) => (
            <li key={key}>
              {key}: {value && value > 0 ? "+" : ""}
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="math-note">No count changes.</p>
      )}
    </div>
  );
}

function higherCellSubsetOptions(
  proxies: DavisCellProxy[],
  subsets: Array<{
    id: string;
    generatorLabels: string[];
    generators: number[];
  }>,
) {
  const counts = new Map<string, number>();
  for (const proxy of proxies) {
    counts.set(
      proxy.sphericalSubsetId,
      (counts.get(proxy.sphericalSubsetId) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([subsetId, count]) => {
      const subset = subsets.find((entry) => entry.id === subsetId);
      return {
        subsetId,
        count,
        label:
          subset?.generatorLabels.join("-") ??
          subset?.generators.join("-") ??
          subsetId,
      };
    })
    .sort((left, right) => left.subsetId.localeCompare(right.subsetId));
}

function hasUsableGeometry(system: CoxeterSystemInput) {
  return Boolean(
    (system.geometry?.normalCoordinates && system.geometry.basepoint) ||
    system.geometry?.normalGram,
  );
}

function dataStatusWarnings(system: CoxeterSystemInput): string[] {
  switch (system.dataStatus) {
    case "placeholder":
      return [
        "This dataset is a placeholder and must not be used as verified mathematical data.",
      ];
    case "verified-source":
      return [
        "This dataset is transcribed from cited sources but is not marked certified by an exact checker.",
      ];
    case "certified":
      return [];
    case "toy":
    case undefined:
      return [
        "This dataset is a toy or educational fixture unless noted otherwise.",
      ];
  }
}

function firstFinitePairKey(system: CoxeterSystemInput): string | undefined {
  for (let left = 0; left < system.rank; left += 1) {
    for (let right = left + 1; right < system.rank; right += 1) {
      if (typeof system.coxeterMatrix[left]?.[right] === "number") {
        return pairKey([left, right]);
      }
    }
  }
  return undefined;
}

function resolveSystem(dataset: ViewerDataset): CoxeterSystemInput {
  switch (dataset.kind) {
    case "coxeter-system":
      return dataset.system;
    case "generated-graph":
      return (
        dataset.sourceSystem ?? syntheticSystemForGeneratedBall(dataset.ball)
      );
    case "quotient-complex":
      return (
        dataset.sourceSystem ??
        dataset.quotient.sourceSystem ??
        syntheticSystemForQuotient(dataset.quotient)
      );
  }
}

function withShellLayout(ball: GeneratedCayleyBall): GeneratedCayleyBall {
  const needsLayout = ball.nodes.some((node) => node.position === undefined);
  return needsLayout
    ? { ...ball, nodes: assignShellLayout(ball.nodes, { shellSpacing: 1.25 }) }
    : ball;
}

function emptyLocalLink(nodeId: string) {
  return {
    nodeId,
    vertices: [],
    simplices: [],
    sphericalSubsets: [],
    warnings: [],
  };
}

function budgetVisibleCells(
  cells: DavisTwoCell[],
  selectedNodeId: string | undefined,
  maxCells: number,
  activePairKey: string | undefined,
  localNodeIds: Set<string>,
) {
  if (cells.length <= maxCells) {
    return { cells, omitted: 0 };
  }

  const sorted = [...cells].sort((left, right) => {
    const leftSelected =
      selectedNodeId !== undefined &&
      left.boundaryNodeIds.includes(selectedNodeId);
    const rightSelected =
      selectedNodeId !== undefined &&
      right.boundaryNodeIds.includes(selectedNodeId);
    if (leftSelected !== rightSelected) {
      return leftSelected ? -1 : 1;
    }
    const leftActive = activePairKey === pairKey(left.generatorPair);
    const rightActive = activePairKey === pairKey(right.generatorPair);
    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }
    const leftLocal = left.boundaryNodeIds.some((nodeId) =>
      localNodeIds.has(nodeId),
    );
    const rightLocal = right.boundaryNodeIds.some((nodeId) =>
      localNodeIds.has(nodeId),
    );
    if (leftLocal !== rightLocal) {
      return leftLocal ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });

  return {
    cells: sorted.slice(0, maxCells),
    omitted: sorted.length - maxCells,
  };
}

function cellMatchesFocus(
  cell: DavisTwoCell,
  focusMode: CellFocusMode,
  selectedNodeId: string | undefined,
  activePairKey: string | undefined,
  selectedCellId: string | undefined,
) {
  if (focusMode === "all-local") {
    return true;
  }
  if (focusMode === "selected-cell") {
    return selectedCellId ? cell.id === selectedCellId : false;
  }
  if (focusMode === "selected-pair") {
    return activePairKey
      ? pairKey(cell.generatorPair) === activePairKey
      : selectedNodeId
        ? cell.boundaryNodeIds.includes(selectedNodeId)
        : true;
  }
  return selectedNodeId ? cell.boundaryNodeIds.includes(selectedNodeId) : true;
}

function chooseFocusedRankTwoCell(input: {
  cells: DavisTwoCell[];
  selectedCell: DavisTwoCell | undefined;
  activePairKey: string | undefined;
  selectedNodeId: string | undefined;
}) {
  if (input.selectedCell) {
    return input.selectedCell;
  }

  const candidates = input.activePairKey
    ? input.cells.filter(
        (cell) => pairKey(cell.generatorPair) === input.activePairKey,
      )
    : input.cells;
  return [...candidates].sort((left, right) => {
    const leftIncident =
      input.selectedNodeId !== undefined &&
      left.boundaryNodeIds.includes(input.selectedNodeId);
    const rightIncident =
      input.selectedNodeId !== undefined &&
      right.boundaryNodeIds.includes(input.selectedNodeId);
    if (leftIncident !== rightIncident) {
      return leftIncident ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  })[0];
}

function mergeSets<T>(
  first: Set<T> | undefined,
  second: Set<T> | undefined,
): Set<T> | undefined {
  if (!first && !second) {
    return undefined;
  }
  return new Set([...(first ?? []), ...(second ?? [])]);
}

function centroid3(
  points: Array<[number, number, number]>,
): [number, number, number] | undefined {
  if (points.length === 0) {
    return undefined;
  }
  const sum = points.reduce<[number, number, number]>(
    (accumulator, point) => [
      accumulator[0] + point[0],
      accumulator[1] + point[1],
      accumulator[2] + point[2],
    ],
    [0, 0, 0],
  );
  return [
    sum[0] / points.length,
    sum[1] / points.length,
    sum[2] / points.length,
  ];
}

function yGammaCameraOffsetForFocus(
  bookmark: YGammaCameraBookmark,
  focusCells: SceneCell[],
  positionsByNodeId: Map<string, [number, number, number] | undefined>,
): [number, number, number] {
  if (bookmark === "front" && focusCells.length === 1) {
    const boundary = focusCells[0].boundaryNodeIds
      .map((nodeId) => positionsByNodeId.get(nodeId))
      .filter(
        (position): position is [number, number, number] =>
          position !== undefined,
      );
    const normal = newellNormal3(boundary);
    if (normal) {
      const tangent = normalize3(
        subtract3(boundary[1] ?? boundary[0], boundary[0]),
      );
      // A pure face-on view makes lifted relation sheets look flat. This
      // oblique offset keeps the selected 2m-gon readable without changing the
      // combinatorial boundary it represents.
      const oblique = normalize3([
        normal[0] * 0.82 + tangent[0] * 0.42,
        normal[1] * 0.82 + tangent[1] * 0.42,
        normal[2] * 0.82 + tangent[2] * 0.42 + 0.34,
      ]);
      return scale3(oblique, 17);
    }
  }

  return bookmark === "front"
    ? [0, -15, 4.5]
    : bookmark === "top"
      ? [0.2, -0.2, 17]
      : bookmark === "square-family"
        ? [6, 4, 13]
        : bookmark === "hexagon-family"
          ? [7, -12, 7]
          : [10, -12, 8];
}

function newellNormal3(
  points: Array<[number, number, number]>,
): [number, number, number] | undefined {
  if (points.length < 3) {
    return undefined;
  }
  let normal: [number, number, number] = [0, 0, 0];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    normal = [
      normal[0] + (current[1] - next[1]) * (current[2] + next[2]),
      normal[1] + (current[2] - next[2]) * (current[0] + next[0]),
      normal[2] + (current[0] - next[0]) * (current[1] + next[1]),
    ];
  }
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  return length > 1e-9 ? scale3(normal, 1 / length) : undefined;
}

function subtract3(
  left: [number, number, number],
  right: [number, number, number],
): [number, number, number] {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function normalize3(
  vector: [number, number, number],
): [number, number, number] {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 1e-9
    ? [vector[0] / length, vector[1] / length, vector[2] / length]
    : [1, 0, 0];
}

function scale3(
  vector: [number, number, number],
  scalar: number,
): [number, number, number] {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function maxBoundaryDistance(
  nodeIds: string[],
  localLayout:
    | {
        distances: Map<string, number>;
      }
    | undefined,
) {
  if (!localLayout) {
    return undefined;
  }
  let maxDistance = 0;
  for (const nodeId of nodeIds) {
    maxDistance = Math.max(
      maxDistance,
      localLayout.distances.get(nodeId) ?? maxDistance,
    );
  }
  return maxDistance;
}

function activeIntegerGameAssignment(game: QuotientGameData | undefined) {
  return (
    game?.assignments.find(
      (assignment) => assignment.id === game.activeAssignmentId,
    ) ?? game?.assignments[0]
  );
}

function editableGameAssignmentFromQuotient(
  quotient: import("../quotient").QuotientComplex,
): EditableGameAssignment {
  const rank =
    quotient.sourceSystem?.rank ??
    quotient.generatorRank ??
    Math.max(
      1,
      Math.max(-1, ...quotient.edges.map((edge) => edge.generator)) + 1,
    );
  const activeAssignment = activeIntegerGameAssignment(quotient.game);
  const activeCocycle =
    quotient.game?.cocycles?.find(
      (cocycle) => cocycle.id === quotient.game?.activeCocycleId,
    ) ??
    quotient.game?.cocycles?.find(
      (cocycle) => cocycle.assignmentId === activeAssignment?.id,
    );
  return createGeneratorGameAssignment(
    rank,
    activeAssignment?.kind === "integer-generator-labeling"
      ? activeAssignment.generatorStates
      : [],
    {
      id:
        activeAssignment?.kind === "integer-generator-labeling"
          ? activeAssignment.id
          : "working-generator-cochain",
      label:
        activeAssignment?.kind === "integer-generator-labeling"
          ? (activeAssignment.label ?? activeAssignment.id)
          : "Working generator cochain",
      cocycleId:
        activeCocycle?.id ??
        (activeAssignment?.kind === "integer-generator-labeling"
          ? `${activeAssignment.id}-cocycle`
          : "working-generator-cochain-cocycle"),
      cocycleLabel: activeCocycle?.label ?? "Working cocycle check",
    },
  );
}

function gameDataWithEditableAssignment(
  base: QuotientGameData | undefined,
  editable: EditableGameAssignment,
): QuotientGameData {
  const assignments = [
    editable.assignment,
    ...(base?.assignments ?? []).filter(
      (assignment) => assignment.id !== editable.assignment.id,
    ),
  ];
  const cocycles = [
    editable.cocycle,
    ...(base?.cocycles ?? []).filter(
      (cocycle) => cocycle.id !== editable.cocycle.id,
    ),
  ];

  return {
    ...base,
    activeAssignmentId: editable.assignment.id,
    activeCocycleId: editable.cocycle.id,
    assignments,
    cocycles,
  };
}

function updateEditableGameAssignmentValue(
  assignment: EditableGameAssignment,
  generator: number,
  value: number,
): EditableGameAssignment {
  return createGeneratorGameAssignment(
    assignment.generatorValues.length,
    assignment.generatorValues.map((state) => ({
      generator: state.generator,
      value: state.generator === generator ? value : state.value,
    })),
    gameAssignmentOptionsFromEditable(assignment),
  );
}

function gameAssignmentOptionsFromEditable(assignment: EditableGameAssignment) {
  return {
    id: assignment.assignment.id,
    label: assignment.assignment.label,
    cocycleId: assignment.cocycle.id,
    cocycleLabel: assignment.cocycle.label,
  };
}

function decorateSceneEdgesForGame(input: {
  edges: SceneEdge[];
  enabled: boolean;
  yGamma: boolean;
  flowByEdgeId: Map<string, { classification: string }>;
  generatorValueById: Map<number, number>;
}): SceneEdge[] {
  if (!input.enabled) {
    return input.edges;
  }

  return input.edges.map((edge) => {
    const semanticEdgeId = baseJnwSemanticEdgeId(edge.id);
    const flow = input.flowByEdgeId.get(semanticEdgeId);
    const value = input.generatorValueById.get(edge.generator);
    const classification = input.yGamma
      ? value === undefined
        ? undefined
        : value > 0
          ? "ascending"
          : value < 0
            ? "descending"
            : "level"
      : flow?.classification;

    if (!classification) {
      return edge;
    }

    return {
      ...edge,
      colorHint: gameFlowColor(classification),
      selectedHighlight: "outline",
    };
  });
}

function baseJnwSemanticEdgeId(edgeId: string): string {
  const fromIndex = edgeId.indexOf(":from:");
  if (fromIndex >= 0) {
    return edgeId.slice(0, fromIndex);
  }
  const glueIndex = edgeId.indexOf(":glue:");
  if (glueIndex >= 0) {
    return edgeId.slice(0, glueIndex);
  }
  return edgeId.endsWith(":continuation")
    ? edgeId.slice(0, -":continuation".length)
    : edgeId;
}

function gameFlowColor(classification: string) {
  if (classification === "ascending") {
    return "#16a34a";
  }
  if (classification === "descending") {
    return "#dc2626";
  }
  return "#64748b";
}

function groupSphericalSubsetsByRank<T extends { rank: number }>(
  subsets: T[],
): Array<[number, T[]]> {
  const groups = new Map<number, T[]>();
  for (const subset of subsets) {
    groups.set(subset.rank, [...(groups.get(subset.rank) ?? []), subset]);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right);
}

function GameWorkflowModelCards() {
  return (
    <div className="game-model-cards" aria-label="Game model choices">
      <article className="game-model-card">
        <strong>Generator-Uniform Cochain</strong>
        <span>
          One integer value per generator, propagated to every edge with that
          generator label.
        </span>
      </article>
      <article className="game-model-card">
        <strong>JNW Legal-System Game</strong>
        <span>
          State/move directions. Theorem-level JNW claims require faithful RACG
          checks.
        </span>
      </article>
    </div>
  );
}

function GameWorkflowSteps() {
  return (
    <ol className="workflow-mini-steps" aria-label="Orientation workflow">
      <li>
        <strong>Assign</strong>
        <span>Choose generator values or JNW state/move data.</span>
      </li>
      <li>
        <strong>Check</strong>
        <span>Read boundary sums or state-orbit diagnostics.</span>
      </li>
      <li>
        <strong>Inspect</strong>
        <span>Focus failed cells or ascending/descending links.</span>
      </li>
      <li>
        <strong>Export</strong>
        <span>Save the run with notes and hashes.</span>
      </li>
    </ol>
  );
}

function QuotientGamePanel({
  quotient,
  selectedVertexId,
  workflowKind,
  onWorkflowKindChange,
  editableAssignment,
  summary,
  usingEditableAssignment,
  jnwSourceSystem,
  jnwMoveSystem,
  jnwInitialState,
  jnwSummary,
  jnwSelectedStateId,
  jnwSelectedRelationId,
  jnwLayerBreadcrumb,
  jnwLayerCompareOpen,
  jnwReaderMode,
  jnwReaderLens,
  jnwRailGrouping,
  selectedJnwGenerator,
  jnwQuotientSheetMode,
  jnwQuotientConstructionStage,
  onGeneratorValueChange,
  onPreset,
  onJnwInitialStateChange,
  onJnwMoveToggle,
  onJnwPreset,
  onOpenJnwStateQuotient,
  onOpenJnwStateQuotientLens,
  onSelectJnwState,
  onShowJnwStateOnGamma,
  onFocusJnwDiagnostic,
  onSelectJnwGlueGenerator,
  onJnwLayerCompareOpenChange,
  onJnwReaderModeChange,
  onJnwReaderLensChange,
  onJnwRailGroupingChange,
  onJnwQuotientSheetModeChange,
  onJnwQuotientConstructionStageChange,
  onFocusCell,
}: {
  quotient: import("../quotient").QuotientComplex;
  selectedVertexId?: string;
  workflowKind: GameWorkflowKind;
  onWorkflowKindChange: (kind: GameWorkflowKind) => void;
  editableAssignment?: EditableGameAssignment;
  summary?: GameCocycleSummary;
  usingEditableAssignment: boolean;
  jnwSourceSystem: CoxeterSystemInput;
  jnwMoveSystem: JnwMoveSystem;
  jnwInitialState: JnwState;
  jnwSummary?: JnwLegalOrbitSummary;
  jnwSelectedStateId?: string;
  jnwSelectedRelationId?: string;
  jnwLayerBreadcrumb?: import("../game").JnwLayerBreadcrumb;
  jnwLayerCompareOpen: boolean;
  jnwReaderMode: JnwReaderMode;
  jnwReaderLens: JnwReaderLens;
  jnwRailGrouping: JnwRailGrouping;
  selectedJnwGenerator: number;
  jnwQuotientSheetMode: JnwQuotientSheetMode;
  jnwQuotientConstructionStage: JnwQuotientConstructionStage;
  onGeneratorValueChange: (generator: number, value: number) => void;
  onPreset: (preset: "zero" | "height" | "invert" | "clear") => void;
  onJnwInitialStateChange: (generator: number, enabled: boolean) => void;
  onJnwMoveToggle: (
    moveGenerator: number,
    toggledGenerator: number,
    enabled: boolean,
  ) => void;
  onJnwPreset: (
    preset: "singletons" | "bipartite" | "clear" | "invert-state",
  ) => void;
  onOpenJnwStateQuotient: (stateId?: string) => void;
  onOpenJnwStateQuotientLens: (lensId: TopologyLensId) => void;
  onSelectJnwState: (stateId: string) => void;
  onShowJnwStateOnGamma: (stateId: string) => void;
  onFocusJnwDiagnostic: (diagnosticId: string) => void;
  onSelectJnwGlueGenerator: (generator: number) => void;
  onJnwLayerCompareOpenChange: (open: boolean) => void;
  onJnwReaderModeChange: (mode: JnwReaderMode) => void;
  onJnwReaderLensChange: (lens: JnwReaderLens) => void;
  onJnwRailGroupingChange: (grouping: JnwRailGrouping) => void;
  onJnwQuotientSheetModeChange: (mode: JnwQuotientSheetMode) => void;
  onJnwQuotientConstructionStageChange: (
    stage: JnwQuotientConstructionStage,
  ) => void;
  onFocusCell: (cellId: string) => void;
}) {
  const status = quotientManifoldStatus(quotient);
  const tabs: Array<{ id: GameWorkflowKind; label: string }> = [
    { id: "generator-uniform-cochain", label: "Generator-Uniform Cochain" },
    { id: "jnw-legal-system", label: "JNW Legal-System Game" },
  ];

  return (
    <>
      <GameWorkflowModelCards />
      <GameWorkflowSteps />
      <p className="math-note">
        {status.label}: {status.reason}
      </p>
      <div className="segmented" aria-label="Game workflow">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            aria-pressed={workflowKind === tab.id}
            onClick={() => onWorkflowKindChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {workflowKind === "generator-uniform-cochain" ? (
        <GeneratorUniformCochainPanel
          quotient={quotient}
          selectedVertexId={selectedVertexId}
          editableAssignment={editableAssignment}
          summary={summary}
          usingEditableAssignment={usingEditableAssignment}
          onGeneratorValueChange={onGeneratorValueChange}
          onPreset={onPreset}
          onFocusCell={onFocusCell}
        />
      ) : jnwSummary ? (
        <JnwLegalSystemPanel
          system={jnwSourceSystem}
          moveSystem={jnwMoveSystem}
          initialState={jnwInitialState}
          summary={jnwSummary}
          selectedStateId={jnwSelectedStateId}
          selectedRelationId={jnwSelectedRelationId}
          layerBreadcrumb={jnwLayerBreadcrumb}
          layerCompareOpen={jnwLayerCompareOpen}
          readerMode={jnwReaderMode}
          readerLens={jnwReaderLens}
          railGrouping={jnwRailGrouping}
          selectedGenerator={selectedJnwGenerator}
          quotientSheetMode={jnwQuotientSheetMode}
          quotientConstructionStage={jnwQuotientConstructionStage}
          onInitialStateChange={onJnwInitialStateChange}
          onMoveToggle={onJnwMoveToggle}
          onPreset={onJnwPreset}
          onOpenStateQuotient={onOpenJnwStateQuotient}
          onOpenStateQuotientLens={onOpenJnwStateQuotientLens}
          onSelectState={onSelectJnwState}
          onShowStateOnGamma={onShowJnwStateOnGamma}
          onFocusDiagnostic={onFocusJnwDiagnostic}
          onSelectGlueGenerator={onSelectJnwGlueGenerator}
          onLayerCompareOpenChange={onJnwLayerCompareOpenChange}
          onReaderModeChange={onJnwReaderModeChange}
          onReaderLensChange={onJnwReaderLensChange}
          onRailGroupingChange={onJnwRailGroupingChange}
          onQuotientSheetModeChange={onJnwQuotientSheetModeChange}
          onQuotientConstructionStageChange={
            onJnwQuotientConstructionStageChange
          }
        />
      ) : (
        <p className="math-note">Preparing the selected JNW move system.</p>
      )}
    </>
  );
}

function GeneratorUniformCochainPanel({
  quotient,
  selectedVertexId,
  editableAssignment,
  summary,
  usingEditableAssignment,
  onGeneratorValueChange,
  onPreset,
  onFocusCell,
}: {
  quotient: import("../quotient").QuotientComplex;
  selectedVertexId?: string;
  editableAssignment?: EditableGameAssignment;
  summary?: GameCocycleSummary;
  usingEditableAssignment: boolean;
  onGeneratorValueChange: (generator: number, value: number) => void;
  onPreset: (preset: "zero" | "height" | "invert" | "clear") => void;
  onFocusCell: (cellId: string) => void;
}) {
  const generatorLabels =
    quotient.sourceSystem?.generators.map((generator) => generator.label) ??
    Array.from(
      {
        length:
          quotient.generatorRank ??
          editableAssignment?.generatorValues.length ??
          0,
      },
      (_unused, index) => `s${index}`,
    );
  const failedEquations =
    summary?.boundaryEquations.filter((equation) => !equation.ok) ?? [];
  const visibleEquations =
    failedEquations.length > 0
      ? failedEquations
      : (summary?.boundaryEquations.slice(0, 3) ?? []);
  const statusLabel =
    summary?.status === "passed"
      ? "Cocycle passed"
      : summary?.status === "failed"
        ? `${summary.failedCellIds.length} failed rank-two boundary${
            summary.failedCellIds.length === 1 ? "" : "ies"
          }`
        : "Incomplete: quotient cells missing";

  return (
    <>
      <p className="math-note">
        This editor assigns one integer value to each generator and propagates
        it to every edge with that label. It is a useful 1-cochain check, but it
        is not the full JNW state/move game.
      </p>
      <p className="math-note">
        <strong>{statusLabel}</strong>. {summary?.passedCellCount ?? 0}/
        {summary?.totalCellCount ?? 0} rank-two cells pass.
      </p>
      {editableAssignment ? (
        <div
          className="game-editor"
          aria-label="Generator-uniform cochain editor"
        >
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={() => onPreset("zero")}
            >
              Zero
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onPreset("height")}
            >
              Height from selected signs
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onPreset("invert")}
            >
              Invert signs
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onPreset("clear")}
            >
              Clear draft
            </button>
          </div>
          <table className="inspector-table">
            <tbody>
              {editableAssignment.generatorValues.map((state) => {
                const label =
                  generatorLabels[state.generator] ?? `s${state.generator}`;
                return (
                  <tr key={state.generator}>
                    <th>{label}</th>
                    <td>
                      <div className="game-value-controls">
                        {[-1, 0, 1].map((value) => (
                          <button
                            type="button"
                            className={
                              state.value === value ? "button active" : "button"
                            }
                            key={value}
                            onClick={() =>
                              onGeneratorValueChange(state.generator, value)
                            }
                          >
                            {value > 0 ? `+${value}` : value}
                          </button>
                        ))}
                        <input
                          aria-label={`Value for ${label}`}
                          type="number"
                          value={state.value}
                          onChange={(event) =>
                            onGeneratorValueChange(
                              state.generator,
                              Number.parseInt(event.target.value || "0", 10),
                            )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!usingEditableAssignment ? (
            <p className="math-note">
              The imported active assignment is edge-specific, not
              generator-uniform. Editing a generator value starts a local
              generator cochain draft.
            </p>
          ) : null}
        </div>
      ) : null}
      <ul className="subset-list">
        <li>
          <span className="subset-rank">
            {quotient.schreierCertificate?.status ?? "not supplied"}
          </span>
          <span>Schreier action certificate</span>
        </li>
        <li>
          <span className="subset-rank">
            {quotient.torsionFreeCertificate?.status ?? "not supplied"}
          </span>
          <span>Torsion-free certificate</span>
        </li>
        <li>
          <span className="subset-rank">
            {quotient.verifier?.status ?? "not supplied"}
          </span>
          <span>External verifier summary</span>
        </li>
      </ul>
      {[...(summary?.warnings ?? []), ...(summary?.errors ?? [])].length > 0 ? (
        <ul className="warning-list">
          {[...(summary?.warnings ?? []), ...(summary?.errors ?? [])]
            .slice(0, 8)
            .map((message) => (
              <li key={message}>{message}</li>
            ))}
        </ul>
      ) : null}
      <ul className="subset-list">
        {visibleEquations.map((equation) => (
          <li key={equation.cellId}>
            <span className="subset-rank">
              {equation.ok ? "closed" : "open"}
            </span>
            <span className="game-equation">
              {equation.cellId}: {equation.valueEquation}
              <br />
              <span className="muted">{equation.generatorWord}</span>
            </span>
            <button
              type="button"
              className="button"
              onClick={() => onFocusCell(equation.cellId)}
            >
              Focus cell
            </button>
          </li>
        ))}
      </ul>
      <ul className="subset-list">
        {(summary?.flows ?? []).slice(0, 8).map((flow) => (
          <li key={flow.edgeId}>
            <span className="subset-rank">{flow.classification}</span>
            <span>
              {flow.edgeId} to {flow.neighborId}: {flow.valueAwayFromVertex}
            </span>
          </li>
        ))}
      </ul>
      {selectedVertexId ? (
        <p className="math-note">
          Incident directions are computed away from {selectedVertexId}.
        </p>
      ) : null}
    </>
  );
}

function JnwLegalSystemPanel({
  system,
  moveSystem,
  initialState,
  summary,
  selectedStateId,
  selectedRelationId,
  layerBreadcrumb,
  layerCompareOpen,
  readerMode,
  readerLens,
  railGrouping,
  selectedGenerator,
  quotientSheetMode,
  quotientConstructionStage,
  onInitialStateChange,
  onMoveToggle,
  onPreset,
  onOpenStateQuotient,
  onOpenStateQuotientLens,
  onSelectState,
  onShowStateOnGamma,
  onFocusDiagnostic,
  onSelectGlueGenerator,
  onLayerCompareOpenChange,
  onReaderModeChange,
  onReaderLensChange,
  onRailGroupingChange,
  onQuotientSheetModeChange,
  onQuotientConstructionStageChange,
}: {
  system: CoxeterSystemInput;
  moveSystem: JnwMoveSystem;
  initialState: JnwState;
  summary: JnwLegalOrbitSummary;
  selectedStateId?: string;
  selectedRelationId?: string;
  layerBreadcrumb?: import("../game").JnwLayerBreadcrumb;
  layerCompareOpen: boolean;
  readerMode: JnwReaderMode;
  readerLens: JnwReaderLens;
  railGrouping: JnwRailGrouping;
  selectedGenerator: number;
  quotientSheetMode: JnwQuotientSheetMode;
  quotientConstructionStage: JnwQuotientConstructionStage;
  onInitialStateChange: (generator: number, enabled: boolean) => void;
  onMoveToggle: (
    moveGenerator: number,
    toggledGenerator: number,
    enabled: boolean,
  ) => void;
  onPreset: (
    preset: "singletons" | "bipartite" | "clear" | "invert-state",
  ) => void;
  onOpenStateQuotient: (stateId?: string) => void;
  onOpenStateQuotientLens: (lensId: TopologyLensId) => void;
  onSelectState: (stateId: string) => void;
  onShowStateOnGamma: (stateId: string) => void;
  onFocusDiagnostic: (diagnosticId: string) => void;
  onSelectGlueGenerator: (generator: number) => void;
  onLayerCompareOpenChange: (open: boolean) => void;
  onReaderModeChange: (mode: JnwReaderMode) => void;
  onReaderLensChange: (lens: JnwReaderLens) => void;
  onRailGroupingChange: (grouping: JnwRailGrouping) => void;
  onQuotientSheetModeChange: (mode: JnwQuotientSheetMode) => void;
  onQuotientConstructionStageChange: (
    stage: JnwQuotientConstructionStage,
  ) => void;
}) {
  const generatorLabels = system.generators.map(
    (generator, index) => generator.label ?? `s${index}`,
  );
  const claimLabel =
    summary.claimStatus === "jnw-faithful"
      ? "JNW faithful"
      : summary.claimStatus === "experimental-non-jnw"
        ? "Experimental non-JNW generalization"
        : summary.claimStatus === "incomplete-orbit-cap"
          ? "Incomplete: orbit cap reached"
          : "Failed checks";
  const failedMoves = summary.moveChecks.filter((check) => !check.ok);
  const failedDiagnostics = summary.rankTwoDiagnostics.filter(
    (diagnostic) => !diagnostic.ok,
  );
  const selectedState = new Set(initialState.generators);
  const selectedOrbitState =
    summary.states.find((state) => state.id === selectedStateId) ??
    summary.states.find((state) => state.id === initialState.id) ??
    summary.states[0];
  const selectedStateName = selectedOrbitState
    ? formatJnwStateName(summary, selectedOrbitState)
    : "none";
  const selectedStateSubsetLabel = selectedOrbitState
    ? formatJnwStateLabel(selectedOrbitState, system)
    : "none";
  const selectedStateColor = selectedOrbitState
    ? jnwStateChartColor(summary, selectedOrbitState.id)
    : "#14b8a6";
  const moveSystemIsJnw21Preset =
    system.name === "JNW cube graph RACG" &&
    moveSystem.id === "jnw-bipartite-color-moves";
  const selectedStateDiagram = useMemo(
    () => buildJnwGammaStateDiagram(system, selectedOrbitState),
    [selectedOrbitState, system],
  );
  const selectedRelationDiagnostic = selectedRelationId
    ? summary.rankTwoDiagnostics.find(
        (diagnostic) => diagnostic.id === selectedRelationId,
      )
    : undefined;
  const selectedRelationWalk =
    selectedRelationDiagnostic?.boundaryStateIds.map((stateId, step) => {
      const generator =
        step % 2 === 0
          ? selectedRelationDiagnostic.generatorPair[0]
          : selectedRelationDiagnostic.generatorPair[1];
      const stateName = formatJnwStateName(
        summary,
        summary.states.find((state) => state.id === stateId) ?? {
          id: stateId,
          generators: [],
        },
      );
      return {
        step,
        stateId,
        stateName,
        generatorLabel: generatorLabels[generator] ?? `s${generator}`,
      };
    }) ?? [];
  const selectedStateIndex = selectedOrbitState
    ? Math.max(
        0,
        summary.states.findIndex((state) => state.id === selectedOrbitState.id),
      )
    : 0;
  const previousState =
    summary.states.length > 0
      ? summary.states[
          (selectedStateIndex - 1 + summary.states.length) %
            summary.states.length
        ]
      : undefined;
  const nextState =
    summary.states.length > 0
      ? summary.states[(selectedStateIndex + 1) % summary.states.length]
      : undefined;
  const closedDiagnostics = summary.rankTwoDiagnostics.filter(
    (diagnostic) => diagnostic.ok,
  );
  const selectedDiagnosticIndex = selectedRelationDiagnostic
    ? closedDiagnostics.findIndex(
        (diagnostic) => diagnostic.id === selectedRelationDiagnostic.id,
      )
    : -1;
  const nextDiagnostic =
    closedDiagnostics[
      selectedDiagnosticIndex >= 0
        ? (selectedDiagnosticIndex + 1) % closedDiagnostics.length
        : 0
    ];
  const selectedGlueEdge = summary.edges.find(
    (edge) =>
      edge.generator === selectedGenerator &&
      selectedOrbitState &&
      (edge.undirectedSource === selectedOrbitState.id ||
        edge.undirectedTarget === selectedOrbitState.id),
  );
  const selectedGlueTarget =
    selectedGlueEdge && selectedOrbitState
      ? selectedGlueEdge.undirectedSource === selectedOrbitState.id
        ? selectedGlueEdge.undirectedTarget
        : selectedGlueEdge.undirectedSource
      : undefined;
  const selectedGlueTargetName = selectedGlueTarget
    ? formatJnwStateName(summary, selectedGlueTarget)
    : undefined;
  const linkLensActive =
    readerLens === "ascending-link" ||
    readerLens === "descending-link" ||
    readerLens === "level-link" ||
    readerLens === "full-link";
  const workflowSteps: Array<{
    id: string;
    label: string;
    status: "complete" | "active" | "ready" | "attention";
    detail: string;
  }> = [
    {
      id: "source",
      label: "Source",
      status: "complete",
      detail: system.name,
    },
    {
      id: "moves",
      label: "Moves",
      status: failedMoves.length > 0 ? "attention" : "complete",
      detail: moveSystem.label ?? moveSystem.id,
    },
    {
      id: "quotient",
      label: moveSystemIsJnw21Preset ? "Move-kernel cover" : "State orbit",
      status:
        readerLens === "state" || readerLens === "none" ? "active" : "complete",
      detail: `${summary.states.length} states, ${summary.edges.length} rails`,
    },
    {
      id: "relation",
      label: "Relation",
      status: readerLens === "relation" ? "active" : "ready",
      detail: selectedRelationDiagnostic
        ? formatJnwRelationOption(
            selectedRelationDiagnostic,
            Math.max(0, selectedDiagnosticIndex) + 1,
            generatorLabels,
            summary,
          )
        : `${closedDiagnostics.length} closed relations`,
    },
    {
      id: "link",
      label: "Link",
      status: linkLensActive ? "active" : "ready",
      detail: `at ${selectedStateName}`,
    },
    {
      id: "export",
      label: "Export",
      status: "ready",
      detail: "save from notebook",
    },
  ];

  return (
    <div className="game-editor" aria-label="JNW legal-system game editor">
      <ol className="jnw-workflow-rail" aria-label="JNW workflow path">
        {workflowSteps.map((step, index) => (
          <li key={step.id} data-status={step.status}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
      <div className="jnw-setup-card" aria-label="Current JNW setup">
        <strong>Current setup</strong>
        <dl>
          <div>
            <dt>Move system</dt>
            <dd>
              {moveSystem.label ?? moveSystem.id}
              {moveSystemIsJnw21Preset
                ? " (JNW cube bipartition/color-class preset)"
                : ""}
            </dd>
          </div>
          <div>
            <dt>Selected state</dt>
            <dd>
              {selectedStateName}
              {selectedStateSubsetLabel !== "none"
                ? ` = ${selectedStateSubsetLabel}`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Check status</dt>
            <dd>
              {claimLabel}; {summary.legalStateCount}/{summary.states.length}{" "}
              legal, {summary.stronglyLegalStateCount}/{summary.states.length}{" "}
              strongly legal.
            </dd>
          </div>
          {moveSystemIsJnw21Preset ? (
            <>
              <div>
                <dt>Cover map</dt>
                <dd>
                  Four lifts over Y_Gamma; {summary.edges.length} geometric
                  rails and {closedDiagnostics.length} square cells.
                </dd>
              </div>
              <div>
                <dt>JNW21 commutator cover</dt>
                <dd>256 vertices; not the compact cover shown here.</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>
      <p className="math-note reader-kicker">
        You are reading four lifts of the{" "}
        <span className="matrix-key">Y_Gamma</span> fundamental domain, glued
        along generator faces in the move-kernel cover. Choose a state, read a
        relation, then inspect its link.
      </p>
      <JnwStateGammaDiagramView
        diagram={selectedStateDiagram}
        stateName={selectedStateName}
        stateSubsetLabel={selectedStateSubsetLabel}
        stateColor={selectedStateColor}
      />
      <div className="jnw-reader-groups" aria-label="JNW reader controls">
        <section aria-label="Choose JNW state">
          <strong>Choose state</strong>
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={() => previousState && onSelectState(previousState.id)}
            >
              Previous state
            </button>
            <button
              type="button"
              className="button"
              onClick={() => nextState && onSelectState(nextState.id)}
            >
              Next state
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                selectedOrbitState
                  ? onShowStateOnGamma(selectedOrbitState.id)
                  : undefined
              }
            >
              Mirror selected state on Gamma
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => onOpenStateQuotient(selectedOrbitState?.id)}
            >
              {summary.rightAngled && summary.states.length === 4
                ? "Show four-state cover"
                : "Show state-orbit model"}
            </button>
          </div>
          <div className="chip-grid">
            {summary.states.map((state) => {
              const stateName = formatJnwStateName(summary, state);
              return (
                <button
                  type="button"
                  key={state.id}
                  className="chip-button"
                  aria-pressed={state.id === selectedOrbitState?.id}
                  onClick={() => onSelectState(state.id)}
                >
                  {stateName}
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <strong>Read one relation</strong>
          <div className="button-row">
            <button
              type="button"
              className="button"
              disabled={!nextDiagnostic}
              onClick={() =>
                nextDiagnostic
                  ? onFocusDiagnostic(nextDiagnostic.id)
                  : undefined
              }
            >
              Next relation
            </button>
            <button
              type="button"
              className="button primary"
              disabled={!selectedRelationDiagnostic}
              onClick={() =>
                selectedRelationDiagnostic
                  ? onFocusDiagnostic(selectedRelationDiagnostic.id)
                  : undefined
              }
            >
              Focus selected relation
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                onReaderLensChange("state");
                onOpenStateQuotient(selectedOrbitState?.id);
              }}
            >
              Return to selected state
            </button>
          </div>
          <label className="compact-field">
            Choose relation
            <select
              value={selectedRelationDiagnostic?.id ?? ""}
              disabled={closedDiagnostics.length === 0}
              onChange={(event) => {
                const diagnosticId = event.currentTarget.value;
                if (diagnosticId) {
                  onFocusDiagnostic(diagnosticId);
                }
              }}
            >
              <option value="">Select a relation</option>
              {closedDiagnostics.map((diagnostic, index) => (
                <option key={diagnostic.id} value={diagnostic.id}>
                  {formatJnwRelationOption(
                    diagnostic,
                    index + 1,
                    generatorLabels,
                    summary,
                  )}
                </option>
              ))}
            </select>
          </label>
          <div className="chip-grid" aria-label="Generator gluing controls">
            {generatorLabels.map((label, generator) => (
              <button
                type="button"
                key={generator}
                className="chip-button"
                aria-pressed={
                  readerLens === "glue" && selectedGenerator === generator
                }
                onClick={() => onSelectGlueGenerator(generator)}
              >
                Highlight {label}-edge gluing
              </button>
            ))}
          </div>
          {readerLens === "glue" ? (
            <p className="math-note">
              Glue lens: {selectedStateName} --
              {generatorLabels[selectedGenerator]}--{" "}
              {selectedGlueTargetName ?? "state"}. The highlighted rail is the
              exact move edge{" "}
              <span className="matrix-key">S -&gt; S xor m_g</span>.
            </p>
          ) : null}
        </section>
        <section>
          <strong>Inspect link</strong>
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={() => onOpenStateQuotientLens("ascending-link")}
            >
              Ascending link at selected state
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onOpenStateQuotientLens("descending-link")}
            >
              Descending link at selected state
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onOpenStateQuotientLens("level-link")}
            >
              Level link at selected state
            </button>
          </div>
        </section>
        <section aria-label="JNW quotient reader">
          <strong>Drawing options</strong>
          <div
            className="segmented segmented-three"
            aria-label="JNW reader mode"
          >
            <button
              type="button"
              aria-pressed={readerMode === "exact-skeleton"}
              onClick={() => onReaderModeChange("exact-skeleton")}
            >
              Exact cover 1-skeleton
            </button>
            <button
              type="button"
              aria-pressed={readerMode === "readable-chart"}
              onClick={() => onReaderModeChange("readable-chart")}
            >
              Four-chart cover drawing
            </button>
          </div>
          <div
            className="segmented segmented-three"
            aria-label="JNW rail grouping"
          >
            <button
              type="button"
              aria-pressed={railGrouping === "individual"}
              onClick={() => onRailGroupingChange("individual")}
            >
              Show every generator rail
            </button>
            <button
              type="button"
              aria-pressed={railGrouping === "move-class-overview"}
              onClick={() => onRailGroupingChange("move-class-overview")}
            >
              Bundle equal moves
            </button>
          </div>
          <details className="advanced-details compact-advanced">
            <summary>Drawing details</summary>
            <label className="range-control">
              Build quotient in stages {quotientConstructionStage}:{" "}
              {jnwConstructionStageLabel(quotientConstructionStage)}
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={quotientConstructionStage}
                onChange={(event) =>
                  onQuotientConstructionStageChange(
                    clampJnwConstructionStage(
                      Number(event.currentTarget.value),
                    ),
                  )
                }
              />
            </label>
            <div
              className="segmented segmented-three"
              aria-label="JNW quotient sheet display"
            >
              {jnwSheetModeOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  aria-pressed={quotientSheetMode === option.id}
                  onClick={() => onQuotientSheetModeChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>
          {railGrouping === "move-class-overview" ? (
            <p className="warning-inline">
              Bundled drawing: expand to individual rails to see every generator
              edge.
            </p>
          ) : null}
        </section>
      </div>
      {selectedRelationDiagnostic ? (
        <div className="topology-lens-readout">
          <strong>Selected relation boundary</strong>
          <p className="math-note">
            Pair{" "}
            <span className="matrix-key">
              {generatorLabels[selectedRelationDiagnostic.generatorPair[0]]}-
              {generatorLabels[selectedRelationDiagnostic.generatorPair[1]]}
            </span>{" "}
            has a {selectedRelationDiagnostic.boundaryStateIds.length}-step
            alternating boundary. The matching edges are bold in the quotient;
            other quotient edges are ghosted.
          </p>
          <ol className="relation-walk-list">
            {selectedRelationWalk.map((entry) => (
              <li key={`${entry.stateId}:${entry.step}`}>
                <span>
                  {entry.step}: {entry.stateName} --{entry.generatorLabel}--
                </span>
                <small>{entry.stateId}</small>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="button-row" aria-label="Compare JNW layers">
        <button
          type="button"
          className="button"
          aria-pressed={layerCompareOpen}
          onClick={() => onLayerCompareOpenChange(!layerCompareOpen)}
        >
          Compare source chart with state link
        </button>
      </div>
      {layerCompareOpen ? (
        <div
          className="jnw-layer-comparison"
          aria-label="Y_Gamma and JNW state-link comparison"
        >
          <article>
            <strong>Y_Gamma fundamental domain</strong>
            <span>
              One base vertex with generator arrows and relation cells from the
              source Coxeter system.
            </span>
          </article>
          <article>
            <strong>JNW move-kernel cover local link</strong>
            <span>
              Selected state {selectedStateName}
              {selectedStateSubsetLabel !== "none"
                ? ` = ${selectedStateSubsetLabel}`
                : ""}
              . Each quotient state carries the same local generator data, but
              the JNW move system classifies directions state-by-state.
            </span>
          </article>
        </div>
      ) : null}
      <details className="advanced-details">
        <summary>Advanced JNW diagnostics</summary>
        <div
          className="jnw-state-picker"
          aria-label="Advanced JNW state picker"
        >
          <strong>Choose state to inspect</strong>
          <div className="chip-grid">
            {summary.states.map((state) => {
              const stateName = formatJnwStateName(summary, state);
              const stateLabel = formatJnwStateLabel(state, system);
              return (
                <button
                  type="button"
                  key={state.id}
                  className="chip-button"
                  aria-pressed={state.id === selectedOrbitState?.id}
                  title={`${stateName} = ${stateLabel}`}
                  onClick={() => onSelectState(state.id)}
                >
                  {stateName}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="button"
            onClick={() =>
              selectedOrbitState
                ? onShowStateOnGamma(selectedOrbitState.id)
                : undefined
            }
          >
            Mirror selected state on Gamma
          </button>
        </div>
        <div className="jnw-layer-breadcrumb" aria-label="Where am I in JNW?">
          {(
            layerBreadcrumb?.items ?? [
              "Coxeter system Gamma",
              "Y_Gamma fundamental domain",
              "JNW move-kernel cover",
              `link at state ${selectedStateName}`,
            ]
          ).map((item, index, items) => (
            <span key={`${item}:${index}`}>
              {item}
              {index < items.length - 1 ? (
                <em aria-hidden="true">-&gt;</em>
              ) : null}
            </span>
          ))}
        </div>
        <p className="math-note">
          Ascending, descending, and level links below are links at the selected
          state vertex in the derived move-kernel cover. They are not drawn as
          ambient links in the universal Davis complex. In the 3D state cover,
          each <span className="matrix-key">S_i</span> is a state vertex, each
          generator-labeled rail is the move{" "}
          <span className="matrix-key">S_i {"->"} S_i + m_g</span>, and each
          relation face is the alternating state cycle for a commuting pair
          drawn on separated rails. Highlighted Gamma vertices record which
          defining-graph vertices lie in the selected state. This is the visual
          bridge: <span className="matrix-key">Y_Gamma</span> supplies the local
          generator/relation data, and the move-kernel cover records how the
          move system orients that data at each state.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button"
            onClick={() => onPreset("singletons")}
          >
            Singleton moves
          </button>
          <button
            type="button"
            className="button"
            onClick={() => onPreset("bipartite")}
          >
            Bipartite/color moves
          </button>
          <button
            type="button"
            className="button"
            onClick={() => onPreset("invert-state")}
          >
            Invert state
          </button>
          <button
            type="button"
            className="button"
            onClick={() => onPreset("clear")}
          >
            Clear state
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => onOpenStateQuotient(selectedOrbitState?.id)}
          >
            {summary.rightAngled && summary.states.length === 4
              ? "Show four-state cover"
              : "Show state-orbit model"}
          </button>
        </div>
        <div
          className="jnw-reader-controls"
          aria-label="Advanced reader details"
        >
          <strong>JNW Four-State Cover Reader</strong>
          <span className="reader-kicker">
            {summary.states.length} state vertices, {summary.edges.length}{" "}
            generator edges,{" "}
            {
              summary.rankTwoDiagnostics.filter((diagnostic) => diagnostic.ok)
                .length
            }{" "}
            relation cells.
          </span>
          <dl className="jnw-object-key" aria-label="JNW quotient object key">
            <div>
              <dt>S_i</dt>
              <dd>state vertex</dd>
            </div>
            <div>
              <dt>g edge</dt>
              <dd>labeled quotient rail</dd>
            </div>
            <div>
              <dt>small rail bead</dt>
              <dd>shared subdivision midpoint of one generator rail</dd>
            </div>
            <div>
              <dt>small center bead</dt>
              <dd>shared center of one commuting relation square</dd>
            </div>
            <div>
              <dt>colored sector</dt>
              <dd>one cell sector owned by the Y_Gamma lift at S_i</dd>
            </div>
          </dl>
          <p className="math-note">
            This is one cover, not four detached diagrams. The state vertices
            and generator-labeled rails are its exact 1-skeleton. Each rail is
            split at one shared midpoint, and each relation square at one shared
            center. The colored sectors meeting{" "}
            <span className="matrix-key">S_i</span> form the visible lift of the{" "}
            <span className="matrix-key">Y_Gamma</span> fundamental domain based
            at that state. Shared midpoint and center vertices show where the
            four lifts are glued.
          </p>
        </div>
        <h4>Initial state</h4>
        <div className="chip-grid" aria-label="JNW initial state">
          {generatorLabels.map((label, generator) => (
            <button
              type="button"
              key={generator}
              className="chip-button"
              aria-pressed={selectedState.has(generator)}
              onClick={() =>
                onInitialStateChange(generator, !selectedState.has(generator))
              }
            >
              {label}
            </button>
          ))}
        </div>
        <h4>Moves</h4>
        <table className="inspector-table">
          <tbody>
            {moveSystem.moves.map((move) => {
              const toggles = new Set(move.toggles);
              return (
                <tr key={move.generator}>
                  <th>m_{generatorLabels[move.generator]}</th>
                  <td>
                    <div className="chip-grid">
                      {generatorLabels.map((label, generator) => (
                        <button
                          type="button"
                          key={generator}
                          className="chip-button"
                          aria-pressed={toggles.has(generator)}
                          onClick={() =>
                            onMoveToggle(
                              move.generator,
                              generator,
                              !toggles.has(generator),
                            )
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {failedMoves.length > 0 ? (
          <ul className="warning-list">
            {failedMoves.map((check) => (
              <li key={check.generator}>
                m_{generatorLabels[check.generator]}{" "}
                {!check.includesSelf
                  ? "does not contain itself"
                  : "contains adjacent generators"}{" "}
                {check.adjacentGeneratorViolations
                  .map((generator) => generatorLabels[generator])
                  .join(", ")}
              </li>
            ))}
          </ul>
        ) : null}
        {[...summary.warnings, ...summary.errors].length > 0 ? (
          <ul className="warning-list">
            {[...summary.warnings, ...summary.errors]
              .slice(0, 8)
              .map((message) => (
                <li key={message}>{message}</li>
              ))}
          </ul>
        ) : null}
        <ul className="subset-list">
          {summary.rankTwoDiagnostics.slice(0, 8).map((diagnostic) => (
            <li key={diagnostic.id}>
              <span className="subset-rank">
                {diagnostic.ok ? "closed" : "failed"}
              </span>
              <span>
                {generatorLabels[diagnostic.generatorPair[0]]}-
                {generatorLabels[diagnostic.generatorPair[1]]}:{" "}
                {2 * diagnostic.m}
                -step diagnostic
              </span>
              <button
                type="button"
                className="button"
                onClick={() => onFocusDiagnostic(diagnostic.id)}
              >
                Focus relation
              </button>
            </li>
          ))}
        </ul>
        {failedDiagnostics.length > 8 ? (
          <p className="math-note">
            {failedDiagnostics.length - 8} more failed diagnostics are hidden in
            the compact list.
          </p>
        ) : null}
      </details>
    </div>
  );
}

function JnwStateGammaDiagramView({
  diagram,
  stateName,
  stateSubsetLabel,
  stateColor,
}: {
  diagram: ReturnType<typeof buildJnwGammaStateDiagram>;
  stateName: string;
  stateSubsetLabel: string;
  stateColor: string;
}) {
  const project = (x: number, y: number, z: number) => ({
    x: 80 + (x + 0.42 * z) * 36,
    y: 70 - (y - 0.28 * z) * 36,
  });

  return (
    <div
      className="jnw-state-gamma-map"
      aria-label={`Gamma vertices highlighted for ${stateName}`}
    >
      <div>
        <strong>{stateName} as vertices of Gamma</strong>
        <span>{stateSubsetLabel === "none" ? "{}" : stateSubsetLabel}</span>
      </div>
      <svg
        viewBox="0 0 160 140"
        role="img"
        aria-label="Selected JNW state in Gamma"
      >
        {diagram.edges.map((edge) => {
          const source = diagram.vertices[edge.source];
          const target = diagram.vertices[edge.target];
          if (!source || !target) {
            return null;
          }
          const sourcePoint = project(source.x, source.y, source.z);
          const targetPoint = project(target.x, target.y, target.z);
          return (
            <line
              key={edge.id}
              x1={sourcePoint.x}
              y1={sourcePoint.y}
              x2={targetPoint.x}
              y2={targetPoint.y}
            />
          );
        })}
        {diagram.vertices.map((vertex) => {
          const point = project(vertex.x, vertex.y, vertex.z);
          return (
            <g key={vertex.generator}>
              <circle
                cx={point.x}
                cy={point.y}
                r={vertex.active ? 7 : 5}
                className={vertex.active ? "is-active" : undefined}
                style={vertex.active ? { fill: stateColor } : undefined}
              />
              <text x={point.x} y={point.y - 10}>
                {vertex.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="math-note">
        Colored vertices are in the current state. Gray vertices are
        defining-graph vertices not in the state.
      </p>
    </div>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function readStoredViewPreset(): ViewPresetId | undefined {
  const value = window.localStorage?.getItem(viewPresetStorageKey);
  return viewPresetOptions.some((option) => option.id === value)
    ? (value as ViewPresetId)
    : undefined;
}

function readStoredColorScheme(): ColorScheme | undefined {
  const value = window.localStorage?.getItem(colorSchemeStorageKey);
  return value === "light" || value === "dark" ? value : undefined;
}

function isQuotientLinkLens(lensId: TopologyLensId): boolean {
  return (
    lensId === "ascending-link" ||
    lensId === "descending-link" ||
    lensId === "level-link" ||
    lensId === "full-local-link"
  );
}

function jnwReaderLensForTopologyLens(
  lensId: TopologyLensId,
  fallback: JnwReaderLens,
): JnwReaderLens {
  if (lensId === "ascending-link") {
    return "ascending-link";
  }
  if (lensId === "descending-link") {
    return "descending-link";
  }
  if (lensId === "level-link") {
    return "level-link";
  }
  if (lensId === "full-local-link") {
    return "full-link";
  }
  return fallback;
}

function isJnwStateQuotient(
  quotient: import("../quotient").QuotientComplex | undefined,
): boolean {
  if (!quotient) {
    return false;
  }
  return (
    quotient.name.toLowerCase().includes("jnw state quotient") ||
    quotient.name.toLowerCase().includes("jnw move-kernel cover") ||
    quotient.game?.assignments.some(
      (assignment) => assignment.id === "jnw-state-directions",
    ) === true
  );
}

function defaultJnwMoveSystemForSystem(
  system: CoxeterSystemInput,
): JnwMoveSystem {
  if (isBundledJnwCubeSystem(system)) {
    return (
      createBipartiteJnwMoveSystem(system) ?? createDefaultJnwMoveSystem(system)
    );
  }
  return createDefaultJnwMoveSystem(system);
}

function defaultJnwInitialStateForSystem(system: CoxeterSystemInput): JnwState {
  return isBundledJnwCubeSystem(system)
    ? createJnwState(jnwCubeLegalInitialState)
    : createDefaultJnwState(system);
}

function isBundledJnwCubeSystem(system: CoxeterSystemInput): boolean {
  return (
    system.rank === 8 &&
    (system.name === "JNW cube graph RACG" ||
      system.sourceRefs?.some((ref) =>
        ref.id.includes("jankiewicz-norin-wise"),
      ) === true)
  );
}

function spreadParallelStateQuotientEdges(edges: SceneEdge[]): SceneEdge[] {
  const quotientEdges = edges.filter((edge) => !isJnwAnnotationEdge(edge.id));
  const annotationEdges = edges.filter((edge) => isJnwAnnotationEdge(edge.id));
  const groups = new Map<string, SceneEdge[]>();
  for (const edge of quotientEdges) {
    const [left, right] = [edge.source, edge.target].sort();
    const key = `${left}|${right}`;
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }

  const offsetsById = new Map<
    string,
    { offset: number; priority: number; total: number }
  >();
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (left, right) =>
        left.generator - right.generator || left.id.localeCompare(right.id),
    );
    const center = (sorted.length - 1) / 2;
    sorted.forEach((edge, index) => {
      offsetsById.set(edge.id, {
        offset: (index - center) * 0.16,
        priority: 1_200 - index,
        total: sorted.length,
      });
    });
  }

  return [
    ...quotientEdges.map((edge) => {
      const offset = offsetsById.get(edge.id);
      if (!offset || offset.total <= 1) {
        return {
          ...edge,
          alwaysLabel: true,
          labelPriority: Math.max(edge.labelPriority ?? 0, 1_000),
        };
      }
      return {
        ...edge,
        alwaysLabel: true,
        labelLeader: true,
        labelPriority: Math.max(edge.labelPriority ?? 0, offset.priority),
        visualOffset: offset.offset,
      };
    }),
    ...annotationEdges,
  ];
}

function isJnwAnnotationEdge(edgeId: string): boolean {
  return (
    edgeId.startsWith("jnw:gamma-glyph-edge:") ||
    edgeId.startsWith("jnw:state-membership:")
  );
}

function formatJnwRelationOption(
  diagnostic: JnwRankTwoDiagnostic,
  index: number,
  generatorLabels: readonly string[],
  summary: JnwLegalOrbitSummary,
): string {
  const left =
    generatorLabels[diagnostic.generatorPair[0]] ??
    `s${diagnostic.generatorPair[0]}`;
  const right =
    generatorLabels[diagnostic.generatorPair[1]] ??
    `s${diagnostic.generatorPair[1]}`;
  const sides = 2 * diagnostic.m;
  const firstStateName = formatJnwStateName(
    summary,
    diagnostic.boundaryStateIds[0] ?? "",
  );
  return `${index}. ${left}-${right} ${jnwPolygonName(sides)} (${sides} steps) at ${firstStateName}`;
}

function jnwPolygonName(sides: number): string {
  switch (sides) {
    case 4:
      return "square";
    case 6:
      return "hexagon";
    case 8:
      return "octagon";
    case 10:
      return "decagon";
    default:
      return `${sides}-gon`;
  }
}

function topologyLensLabel(lensId: TopologyLensId): string {
  switch (lensId) {
    case "ascending-link":
      return "Ascending link at selected state";
    case "descending-link":
      return "Descending link at selected state";
    case "level-link":
      return "Level link at selected state";
    case "full-local-link":
      return "Full local link at selected state";
    case "state-quotient-orbit":
      return "JNW move-kernel cover";
    default:
      return "State-quotient link at selected state";
  }
}

const jnwSheetModeOptions: Array<{
  id: JnwQuotientSheetMode;
  label: string;
}> = [
  { id: "outlines", label: "Outlines only" },
  { id: "glass", label: "Glass faces" },
  { id: "filled", label: "Filled faces" },
];

function clampJnwConstructionStage(
  value: number,
): JnwQuotientConstructionStage {
  const rounded = Math.min(5, Math.max(1, Math.round(value)));
  return rounded as JnwQuotientConstructionStage;
}

function jnwConstructionStageLabel(
  stage: JnwQuotientConstructionStage,
): string {
  switch (stage) {
    case 1:
      return "4 state vertices";
    case 2:
      return "generator edges";
    case 3:
      return "relation-cycle boundaries";
    case 4:
      return "glassy relation faces";
    case 5:
      return "state-dependent directions";
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
