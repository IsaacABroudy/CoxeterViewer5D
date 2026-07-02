import type { CertificateSummary } from "../types";

export interface IntegerGeneratorState {
  generator: number;
  value: number;
}

export interface IntegerEdgeState {
  edgeId: string;
  value: number;
}

export interface GameGraphEdge {
  id: string;
  source: string;
  target: string;
  generator: number;
}

export interface GameRankTwoBoundaryCell {
  id: string;
  generatorPair: [number, number];
  m: number;
  boundaryNodeIds?: string[];
  boundaryVertexIds?: string[];
  boundaryEdgeIds?: string[];
}

export type IntegerGameAssignmentKind =
  | "integer-generator-labeling"
  | "integer-edge-labeling";

interface IntegerGameAssignmentBase {
  id: string;
  label?: string;
  description?: string;
  notes?: string[];
}

export interface IntegerGeneratorGameAssignment extends IntegerGameAssignmentBase {
  kind: "integer-generator-labeling";
  generatorStates: IntegerGeneratorState[];
}

export interface IntegerEdgeGameAssignment extends IntegerGameAssignmentBase {
  kind: "integer-edge-labeling";
  edgeStates: IntegerEdgeState[];
}

export type IntegerGameAssignment =
  | IntegerGeneratorGameAssignment
  | IntegerEdgeGameAssignment;

export interface NamedIntegerCocycle {
  id: string;
  label?: string;
  assignmentId: string;
  coefficientRing: "Z";
  certificate?: CertificateSummary;
  notes?: string[];
}

export interface GameExperimentLog {
  id: string;
  label?: string;
  createdAt?: string;
  inputHash?: string;
  assignmentId?: string;
  cocycleId?: string;
  selectedVertexId?: string;
  certificate?: CertificateSummary;
  diagnostics?: Record<string, unknown>;
  notes?: string[];
}

export interface QuotientGameData {
  activeAssignmentId?: string;
  activeCocycleId?: string;
  assignments: IntegerGameAssignment[];
  cocycles?: NamedIntegerCocycle[];
  experimentLogs?: GameExperimentLog[];
  notes?: string[];
}

export interface ResolvedIntegerEdgeAssignment {
  assignmentId?: string;
  label: string;
  edgeStates: IntegerEdgeState[];
  source: "imported" | "zero-fallback";
  errors: string[];
  warnings: string[];
}

export interface BoundaryCocycleTerm {
  edgeId: string;
  from: string;
  to: string;
  storedValue: number;
  signedValue: number;
  traversal: "stored-orientation" | "opposite-orientation";
}

export interface RankTwoBoundaryCheck {
  cellId: string;
  boundarySum: number;
  ok: boolean;
  terms: BoundaryCocycleTerm[];
  expectedBoundaryLength: number;
  actualBoundaryLength: number;
  missingEdgeSteps: Array<{
    step: number;
    from: string;
    to: string;
    edgeId?: string;
  }>;
  missingStateEdgeIds: string[];
}

export interface RankTwoCocycleValidationResult {
  ok: boolean;
  checks: RankTwoBoundaryCheck[];
  errors: string[];
}

export interface GameGeneratorValue {
  generator: number;
  value: number;
}

export interface EditableGameAssignment {
  kind: "generator-cochain";
  assignment: IntegerGeneratorGameAssignment;
  cocycle: NamedIntegerCocycle;
  generatorValues: GameGeneratorValue[];
  uniform: true;
}

export interface BoundaryEquation {
  cellId: string;
  ok: boolean;
  boundarySum: number;
  generatorWord: string;
  valueEquation: string;
  signedValues: number[];
}

export interface GameCocycleSummary {
  assignmentId?: string;
  cocycleId?: string;
  assignmentKind: IntegerGameAssignmentKind | "generator-cochain" | "none";
  generatorValues: GameGeneratorValue[];
  generatorUniform: boolean;
  status: "passed" | "failed" | "incomplete";
  passedCellCount: number;
  totalCellCount: number;
  failedCellIds: string[];
  boundaryEquations: BoundaryEquation[];
  flows: IncidentEdgeFlow[];
  warnings: string[];
  errors: string[];
}

export interface GameWorkflowState {
  activeAssignment: EditableGameAssignment;
  summary: GameCocycleSummary;
  selectedVertexId?: string;
}

export type GameWorkflowKind = "generator-uniform-cochain" | "jnw-legal-system";

export type JnwClaimStatus =
  | "jnw-faithful"
  | "experimental-non-jnw"
  | "failed"
  | "incomplete-orbit-cap";

export interface JnwState {
  id: string;
  generators: number[];
}

export interface JnwMove {
  generator: number;
  toggles: number[];
}

export interface JnwMoveSystem {
  id: string;
  label?: string;
  moves: JnwMove[];
}

export interface JnwMovePropertyCheck {
  generator: number;
  includesSelf: boolean;
  adjacentGeneratorViolations: number[];
  ok: boolean;
}

export interface JnwLegalStateCheck {
  stateId: string;
  state: number[];
  nonempty: boolean;
  complementNonempty: boolean;
  stateConnected: boolean;
  complementConnected: boolean;
  stronglyLegal: boolean;
  legal: boolean;
}

export interface JnwOrbitEdge {
  id: string;
  source: string;
  target: string;
  generator: number;
  undirectedSource: string;
  undirectedTarget: string;
}

export interface JnwRankTwoDiagnostic {
  id: string;
  generatorPair: [number, number];
  m: number;
  startStateId: string;
  boundaryStateIds: string[];
  boundaryEdgeIds: string[];
  periodClosed: boolean;
  ok: boolean;
  warnings: string[];
}

export interface JnwLegalOrbitSummary {
  claimStatus: JnwClaimStatus;
  rightAngled: boolean;
  orbitComplete: boolean;
  orbitCap: number;
  states: Array<JnwState & { legal: JnwLegalStateCheck }>;
  edges: JnwOrbitEdge[];
  moveChecks: JnwMovePropertyCheck[];
  rankTwoDiagnostics: JnwRankTwoDiagnostic[];
  legalOrbit: boolean;
  stronglyLegalOrbit: boolean;
  legalStateCount: number;
  stronglyLegalStateCount: number;
  warnings: string[];
  errors: string[];
}

export interface JnwGameWorkflowState {
  workflowKind: "jnw-legal-system";
  sourceSystemName: string;
  moveSystem: JnwMoveSystem;
  initialState: JnwState;
  summary: JnwLegalOrbitSummary;
}

export interface MorseCocycleCertificate {
  status: "passed" | "failed" | "skipped";
  method: "in-repo-rank-two-boundary-sums";
  assignmentId?: string;
  cocycleId?: string;
  checkedAt?: string;
  cellCount: number;
  boundaryFailures: string[];
  warnings: string[];
}

export type IncidentEdgeClassification = "ascending" | "descending" | "level";

export interface IncidentEdgeFlow {
  edgeId: string;
  generator: number;
  neighborId: string;
  valueAwayFromVertex: number;
  orientation: "stored-orientation" | "opposite-orientation" | "loop";
  classification: IncidentEdgeClassification;
}
