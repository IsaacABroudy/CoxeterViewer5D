import type {
  BoundaryEquation,
  BoundaryCocycleTerm,
  EditableGameAssignment,
  GameCocycleSummary,
  GameGeneratorValue,
  GameGraphEdge,
  GameRankTwoBoundaryCell,
  IncidentEdgeFlow,
  IntegerEdgeState,
  IntegerGameAssignment,
  IntegerGeneratorState,
  MorseCocycleCertificate,
  NamedIntegerCocycle,
  QuotientGameData,
  RankTwoBoundaryCheck,
  RankTwoCocycleValidationResult,
  ResolvedIntegerEdgeAssignment,
} from "./types";

type GraphEdge = GameGraphEdge;
type RankTwoBoundaryCell = GameRankTwoBoundaryCell;

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function validateCertificateSummary(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push(`${path} must be an object when provided.`);
    return;
  }

  if (
    value.status !== "not-certified" &&
    value.status !== "passed" &&
    value.status !== "failed" &&
    value.status !== "skipped"
  ) {
    errors.push(`${path}.status must be a supported certificate status.`);
  }

  if (typeof value.backend !== "string" || value.backend.trim().length === 0) {
    errors.push(`${path}.backend must be a non-empty string.`);
  }
}

function edgeStateMap(edgeStates: IntegerEdgeState[]): Map<string, number> {
  return new Map(edgeStates.map((state) => [state.edgeId, state.value]));
}

function boundaryVertices(cell: RankTwoBoundaryCell): string[] {
  return cell.boundaryVertexIds ?? cell.boundaryNodeIds ?? [];
}

function findBoundaryEdge(
  cell: RankTwoBoundaryCell,
  step: number,
  source: string,
  target: string,
  edges: GraphEdge[],
  edgeById: Map<string, GraphEdge>,
): GraphEdge | undefined {
  const explicitEdgeId = cell.boundaryEdgeIds?.[step];
  if (explicitEdgeId !== undefined) {
    return edgeById.get(explicitEdgeId);
  }

  return edges.find((edge) => {
    if (
      edge.generator !== cell.generatorPair[0] &&
      edge.generator !== cell.generatorPair[1]
    ) {
      return false;
    }

    return (
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source)
    );
  });
}

function signedTerm(
  edge: GraphEdge,
  source: string,
  target: string,
  value: number,
): BoundaryCocycleTerm {
  const followsStoredOrientation =
    edge.source === source && edge.target === target;

  return {
    edgeId: edge.id,
    from: source,
    to: target,
    storedValue: value,
    signedValue: followsStoredOrientation ? value : -value,
    traversal: followsStoredOrientation
      ? "stored-orientation"
      : "opposite-orientation",
  };
}

export function validateIntegerGeneratorStates(
  states: IntegerGeneratorState[],
  rank?: number,
): string[] {
  const errors: string[] = [];
  const seen = new Set<number>();

  states.forEach((state, i) => {
    if (!isInteger(state.generator) || state.generator < 0) {
      errors.push(`generatorStates[${i}].generator must be non-negative.`);
    } else if (rank !== undefined && state.generator >= rank) {
      errors.push(`generatorStates[${i}].generator is outside the rank.`);
    }

    if (!isInteger(state.value)) {
      errors.push(`generatorStates[${i}].value must be an integer.`);
    }

    if (seen.has(state.generator)) {
      errors.push(
        `generatorStates contains duplicate generator ${state.generator}.`,
      );
    }
    seen.add(state.generator);
  });

  return errors;
}

export function validateIntegerEdgeStates(
  states: IntegerEdgeState[],
  edges?: GraphEdge[],
): string[] {
  const errors: string[] = [];
  const edgeIds =
    edges === undefined ? undefined : new Set(edges.map((edge) => edge.id));
  const seen = new Set<string>();

  states.forEach((state, i) => {
    if (typeof state.edgeId !== "string" || state.edgeId.length === 0) {
      errors.push(`edgeStates[${i}].edgeId must be a non-empty string.`);
    } else if (edgeIds !== undefined && !edgeIds.has(state.edgeId)) {
      errors.push(`edgeStates[${i}].edgeId refers to an unknown edge.`);
    }

    if (!isInteger(state.value)) {
      errors.push(`edgeStates[${i}].value must be an integer.`);
    }

    if (seen.has(state.edgeId)) {
      errors.push(`edgeStates contains duplicate edge ${state.edgeId}.`);
    }
    seen.add(state.edgeId);
  });

  return errors;
}

export function generatorStatesToEdgeStates(
  edges: GraphEdge[],
  generatorStates: IntegerGeneratorState[],
): IntegerEdgeState[] {
  const generatorValues = new Map(
    generatorStates.map((state) => [state.generator, state.value]),
  );

  return edges.map((edge) => ({
    edgeId: edge.id,
    value: generatorValues.get(edge.generator) ?? 0,
  }));
}

export function createGeneratorGameAssignment(
  systemOrRank: { rank: number } | number,
  values: readonly Partial<GameGeneratorValue>[] = [],
  options: {
    id?: string;
    label?: string;
    cocycleId?: string;
    cocycleLabel?: string;
  } = {},
): EditableGameAssignment {
  const rank =
    typeof systemOrRank === "number" ? systemOrRank : systemOrRank.rank;
  const suppliedValues = new Map(
    values
      .filter(
        (value): value is GameGeneratorValue =>
          isInteger(value.generator) && isInteger(value.value),
      )
      .map((value) => [value.generator, value.value]),
  );
  const generatorValues = Array.from(
    { length: rank },
    (_unused, generator) => ({
      generator,
      value: suppliedValues.get(generator) ?? 0,
    }),
  );
  const assignmentId = options.id ?? "working-generator-cochain";
  const cocycleId = options.cocycleId ?? `${assignmentId}-cocycle`;

  return {
    kind: "generator-cochain",
    assignment: {
      id: assignmentId,
      label: options.label ?? "Working generator-uniform cochain",
      kind: "integer-generator-labeling",
      generatorStates: generatorValues,
      notes: [
        "Exploratory generator-level integer 1-cochain; export or certify it before using it as a research claim.",
      ],
    },
    cocycle: {
      id: cocycleId,
      label: options.cocycleLabel ?? "Working cocycle check",
      assignmentId,
      coefficientRing: "Z",
    },
    generatorValues,
    uniform: true,
  };
}

export function propagateGeneratorAssignment(
  edges: GraphEdge[],
  generatorStates: IntegerGeneratorState[],
): IntegerEdgeState[] {
  return generatorStatesToEdgeStates(edges, generatorStates);
}

export function invertGeneratorAssignment(
  assignment: EditableGameAssignment,
): EditableGameAssignment {
  const generatorValues = assignment.generatorValues.map((state) => ({
    generator: state.generator,
    value: -state.value,
  }));

  return {
    ...assignment,
    assignment: {
      ...assignment.assignment,
      generatorStates: generatorValues,
    },
    generatorValues,
  };
}

export function summarizeCocycle(
  cells: RankTwoBoundaryCell[],
  edges: GraphEdge[],
  assignment: EditableGameAssignment | IntegerGameAssignment | undefined,
  selectedVertexId?: string,
  options: {
    rank?: number;
    generators?: Array<{ label?: string }>;
    cocycleId?: string;
  } = {},
): GameCocycleSummary {
  const resolved = resolveEditableAssignment(assignment, edges, options.rank);
  const validation = validateRankTwoCocycle(cells, edges, resolved.edgeStates);
  const boundaryEquations = validation.checks.map((check) =>
    formatBoundaryEquation(check, options.generators ?? [], edges),
  );
  const failedCellIds = validation.checks
    .filter((check) => !check.ok)
    .map((check) => check.cellId);
  const flows =
    selectedVertexId === undefined
      ? []
      : classifyIncidentEdges(selectedVertexId, edges, resolved.edgeStates);
  const status =
    cells.length === 0 || hasIncompleteBoundary(validation.checks)
      ? "incomplete"
      : validation.ok
        ? "passed"
        : "failed";

  return {
    assignmentId: resolved.assignmentId,
    cocycleId:
      assignment?.kind === "generator-cochain"
        ? assignment.cocycle.id
        : options.cocycleId,
    assignmentKind: resolved.assignmentKind,
    generatorValues: resolved.generatorValues,
    generatorUniform: resolved.generatorUniform,
    status,
    passedCellCount: validation.checks.filter((check) => check.ok).length,
    totalCellCount: validation.checks.length,
    failedCellIds,
    boundaryEquations,
    flows,
    warnings: resolved.warnings,
    errors: [...resolved.errors, ...validation.errors],
  };
}

export function formatBoundaryEquation(
  check: RankTwoBoundaryCheck,
  generators: Array<{ label?: string }>,
  edges: GraphEdge[] = [],
): BoundaryEquation {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const generatorWord = check.terms
    .map((term) => {
      const generator = edgeById.get(term.edgeId)?.generator;
      return generator === undefined
        ? term.edgeId
        : (generators[generator]?.label ?? `s${generator}`);
    })
    .join(" ");
  const signedValues = check.terms.map((term) => term.signedValue);
  const valueEquation = `${formatSignedIntegerSequence(signedValues)} = ${check.boundarySum}`;

  return {
    cellId: check.cellId,
    ok: check.ok,
    boundarySum: check.boundarySum,
    generatorWord,
    valueEquation,
    signedValues,
  };
}

function resolveEditableAssignment(
  assignment: EditableGameAssignment | IntegerGameAssignment | undefined,
  edges: GraphEdge[],
  rank?: number,
): {
  assignmentId?: string;
  assignmentKind: GameCocycleSummary["assignmentKind"];
  edgeStates: IntegerEdgeState[];
  generatorValues: GameGeneratorValue[];
  generatorUniform: boolean;
  errors: string[];
  warnings: string[];
} {
  const zeroStates = edges.map((edge) => ({ edgeId: edge.id, value: 0 }));

  if (assignment === undefined) {
    return {
      assignmentKind: "none",
      edgeStates: zeroStates,
      generatorValues: [],
      generatorUniform: true,
      errors: [],
      warnings: ["No assignment is active; zero labels were checked."],
    };
  }

  const concreteAssignment =
    assignment.kind === "generator-cochain"
      ? assignment.assignment
      : assignment;
  const validation = validateIntegerGameAssignment(
    concreteAssignment,
    edges,
    rank,
    `game.assignment["${concreteAssignment.id}"]`,
  );

  if (validation.errors.length > 0) {
    return {
      assignmentId: concreteAssignment.id,
      assignmentKind:
        assignment.kind === "generator-cochain"
          ? "generator-cochain"
          : concreteAssignment.kind,
      edgeStates: zeroStates,
      generatorValues:
        concreteAssignment.kind === "integer-generator-labeling"
          ? concreteAssignment.generatorStates
          : [],
      generatorUniform:
        assignment.kind === "generator-cochain" ||
        concreteAssignment.kind === "integer-generator-labeling",
      errors: validation.errors,
      warnings: [
        "Active game assignment is invalid; zero labels were checked.",
      ],
    };
  }

  if (concreteAssignment.kind === "integer-generator-labeling") {
    const generatorValues = concreteAssignment.generatorStates.map((state) => ({
      generator: state.generator,
      value: state.value,
    }));
    return {
      assignmentId: concreteAssignment.id,
      assignmentKind:
        assignment.kind === "generator-cochain"
          ? "generator-cochain"
          : concreteAssignment.kind,
      edgeStates: propagateGeneratorAssignment(edges, generatorValues),
      generatorValues,
      generatorUniform: true,
      errors: [],
      warnings: [],
    };
  }

  return {
    assignmentId: concreteAssignment.id,
    assignmentKind: concreteAssignment.kind,
    edgeStates: concreteAssignment.edgeStates,
    generatorValues: [],
    generatorUniform: false,
    errors: [],
    warnings: ["Active assignment is edge-specific, not generator-uniform."],
  };
}

function hasIncompleteBoundary(checks: RankTwoBoundaryCheck[]): boolean {
  return checks.some(
    (check) =>
      check.actualBoundaryLength !== check.expectedBoundaryLength ||
      check.missingEdgeSteps.length > 0 ||
      check.missingStateEdgeIds.length > 0,
  );
}

function formatSignedIntegerSequence(values: number[]): string {
  if (values.length === 0) {
    return "0";
  }

  return values
    .map((value, index) => {
      const magnitude = Math.abs(value);
      if (index === 0) {
        return value < 0 ? `-${magnitude}` : `${magnitude}`;
      }
      return `${value < 0 ? "-" : "+"} ${magnitude}`;
    })
    .join(" ");
}

export function validateIntegerGameAssignment(
  value: unknown,
  edges: GraphEdge[],
  rank: number | undefined,
  path: string,
): { assignment?: IntegerGameAssignment; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: [`${path} must be an object.`] };
  }

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    errors.push(`${path}.id must be a non-empty string.`);
  }

  if (value.label !== undefined && typeof value.label !== "string") {
    errors.push(`${path}.label must be a string when provided.`);
  }

  if (
    value.description !== undefined &&
    typeof value.description !== "string"
  ) {
    errors.push(`${path}.description must be a string when provided.`);
  }

  if (value.notes !== undefined && !isStringArray(value.notes)) {
    errors.push(`${path}.notes must be an array of strings.`);
  }

  if (value.kind === "integer-generator-labeling") {
    if (!Array.isArray(value.generatorStates)) {
      errors.push(`${path}.generatorStates must be an array.`);
    } else {
      errors.push(
        ...validateIntegerGeneratorStates(value.generatorStates, rank),
      );
    }
  } else if (value.kind === "integer-edge-labeling") {
    if (!Array.isArray(value.edgeStates)) {
      errors.push(`${path}.edgeStates must be an array.`);
    } else {
      errors.push(...validateIntegerEdgeStates(value.edgeStates, edges));
    }
  } else {
    errors.push(
      `${path}.kind must be "integer-generator-labeling" or "integer-edge-labeling".`,
    );
  }

  return {
    assignment:
      errors.length === 0
        ? (value as unknown as IntegerGameAssignment)
        : undefined,
    errors,
  };
}

function validateNamedCocycle(
  value: unknown,
  assignmentIds: Set<string>,
  path: string,
): { cocycle?: NamedIntegerCocycle; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: [`${path} must be an object.`] };
  }

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    errors.push(`${path}.id must be a non-empty string.`);
  }

  if (value.label !== undefined && typeof value.label !== "string") {
    errors.push(`${path}.label must be a string when provided.`);
  }

  if (
    typeof value.assignmentId !== "string" ||
    !assignmentIds.has(value.assignmentId)
  ) {
    errors.push(`${path}.assignmentId must refer to a game assignment.`);
  }

  if (value.coefficientRing !== "Z") {
    errors.push(`${path}.coefficientRing must be "Z".`);
  }

  if (value.notes !== undefined && !isStringArray(value.notes)) {
    errors.push(`${path}.notes must be an array of strings.`);
  }

  validateCertificateSummary(value.certificate, `${path}.certificate`, errors);

  return {
    cocycle:
      errors.length === 0
        ? (value as unknown as NamedIntegerCocycle)
        : undefined,
    errors,
  };
}

function validateExperimentLog(
  value: unknown,
  assignmentIds: Set<string>,
  cocycleIds: Set<string>,
  path: string,
): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return [`${path} must be an object.`];
  }

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    errors.push(`${path}.id must be a non-empty string.`);
  }

  if (value.label !== undefined && typeof value.label !== "string") {
    errors.push(`${path}.label must be a string when provided.`);
  }

  if (
    value.assignmentId !== undefined &&
    (typeof value.assignmentId !== "string" ||
      !assignmentIds.has(value.assignmentId))
  ) {
    errors.push(`${path}.assignmentId must refer to a game assignment.`);
  }

  if (
    value.cocycleId !== undefined &&
    (typeof value.cocycleId !== "string" || !cocycleIds.has(value.cocycleId))
  ) {
    errors.push(`${path}.cocycleId must refer to a named cocycle.`);
  }

  if (
    value.selectedVertexId !== undefined &&
    typeof value.selectedVertexId !== "string"
  ) {
    errors.push(`${path}.selectedVertexId must be a string when provided.`);
  }

  if (value.notes !== undefined && !isStringArray(value.notes)) {
    errors.push(`${path}.notes must be an array of strings.`);
  }

  validateCertificateSummary(value.certificate, `${path}.certificate`, errors);

  return errors;
}

export function validateQuotientGameData(
  value: unknown,
  edges: GraphEdge[],
  rank?: number,
): { game?: QuotientGameData; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (value === undefined) {
    return { errors, warnings };
  }

  if (!isRecord(value)) {
    return { errors: ["game must be an object when provided."], warnings };
  }

  if (
    value.activeAssignmentId !== undefined &&
    typeof value.activeAssignmentId !== "string"
  ) {
    errors.push("game.activeAssignmentId must be a string when provided.");
  }

  if (
    value.activeCocycleId !== undefined &&
    typeof value.activeCocycleId !== "string"
  ) {
    errors.push("game.activeCocycleId must be a string when provided.");
  }

  if (value.notes !== undefined && !isStringArray(value.notes)) {
    errors.push("game.notes must be an array of strings.");
  }

  const assignments: IntegerGameAssignment[] = [];
  const assignmentIds = new Set<string>();
  if (!Array.isArray(value.assignments)) {
    errors.push("game.assignments must be an array.");
  } else {
    const seen = new Set<string>();
    value.assignments.forEach((assignment, index) => {
      const result = validateIntegerGameAssignment(
        assignment,
        edges,
        rank,
        `game.assignments[${index}]`,
      );
      errors.push(...result.errors);
      if (result.assignment !== undefined) {
        if (seen.has(result.assignment.id)) {
          errors.push(
            `game.assignments contains duplicate id "${result.assignment.id}".`,
          );
        }
        seen.add(result.assignment.id);
        assignmentIds.add(result.assignment.id);
        assignments.push(result.assignment);
      }
    });

    if (
      typeof value.activeAssignmentId === "string" &&
      !seen.has(value.activeAssignmentId)
    ) {
      errors.push("game.activeAssignmentId must refer to an assignment id.");
    }
  }

  const cocycles: NamedIntegerCocycle[] = [];
  const cocycleIds = new Set<string>();
  if (value.cocycles !== undefined) {
    if (!Array.isArray(value.cocycles)) {
      errors.push("game.cocycles must be an array when provided.");
    } else {
      value.cocycles.forEach((cocycle, index) => {
        const result = validateNamedCocycle(
          cocycle,
          assignmentIds,
          `game.cocycles[${index}]`,
        );
        errors.push(...result.errors);
        if (result.cocycle !== undefined) {
          if (cocycleIds.has(result.cocycle.id)) {
            errors.push(
              `game.cocycles contains duplicate id "${result.cocycle.id}".`,
            );
          }
          cocycleIds.add(result.cocycle.id);
          cocycles.push(result.cocycle);
        }
      });
    }
  }

  if (
    typeof value.activeCocycleId === "string" &&
    !cocycleIds.has(value.activeCocycleId)
  ) {
    errors.push("game.activeCocycleId must refer to a named cocycle.");
  }

  if (value.experimentLogs !== undefined) {
    if (!Array.isArray(value.experimentLogs)) {
      errors.push("game.experimentLogs must be an array when provided.");
    } else {
      const seen = new Set<string>();
      value.experimentLogs.forEach((log, index) => {
        if (isRecord(log) && typeof log.id === "string") {
          if (seen.has(log.id)) {
            errors.push(
              `game.experimentLogs contains duplicate id "${log.id}".`,
            );
          }
          seen.add(log.id);
        }
        errors.push(
          ...validateExperimentLog(
            log,
            assignmentIds,
            cocycleIds,
            `game.experimentLogs[${index}]`,
          ),
        );
      });
    }
  }

  if (assignments.length === 0 && errors.length === 0) {
    warnings.push(
      "Game data has no assignments; quotient/game diagnostics will use zero labels.",
    );
  }

  return {
    game:
      errors.length === 0
        ? {
            activeAssignmentId: value.activeAssignmentId as string | undefined,
            activeCocycleId: value.activeCocycleId as string | undefined,
            assignments,
            cocycles: value.cocycles === undefined ? undefined : cocycles,
            experimentLogs: value.experimentLogs as
              | QuotientGameData["experimentLogs"]
              | undefined,
            notes: value.notes as string[] | undefined,
          }
        : undefined,
    errors,
    warnings,
  };
}

export function resolveIntegerEdgeAssignment(
  game: QuotientGameData | undefined,
  edges: GraphEdge[],
  rank?: number,
): ResolvedIntegerEdgeAssignment {
  const zeroStates = edges.map((edge) => ({ edgeId: edge.id, value: 0 }));

  if (game === undefined || game.assignments.length === 0) {
    return {
      label: "zero labels",
      edgeStates: zeroStates,
      source: "zero-fallback",
      errors: [],
      warnings: [
        "No imported integer game assignment is active; boundary diagnostics use zero labels.",
      ],
    };
  }

  const assignment =
    game.assignments.find((entry) => entry.id === game.activeAssignmentId) ??
    game.assignments[0];
  const validation = validateIntegerGameAssignment(
    assignment,
    edges,
    rank,
    `game.assignments["${assignment.id}"]`,
  );

  if (validation.errors.length > 0) {
    return {
      assignmentId: assignment.id,
      label: assignment.label ?? assignment.id,
      edgeStates: zeroStates,
      source: "zero-fallback",
      errors: validation.errors,
      warnings: [
        "Imported integer game assignment is invalid; diagnostics use zero labels.",
      ],
    };
  }

  return {
    assignmentId: assignment.id,
    label: assignment.label ?? assignment.id,
    edgeStates:
      assignment.kind === "integer-generator-labeling"
        ? generatorStatesToEdgeStates(edges, assignment.generatorStates)
        : assignment.edgeStates,
    source: "imported",
    errors: [],
    warnings: [],
  };
}

/**
 * Checks whether an integer edge labeling has zero sum around rank-two
 * 2m-gons. The value on an edge is interpreted in its stored source->target
 * orientation, so traversing the edge backwards contributes the negative.
 */
export function validateRankTwoCocycle(
  cells: RankTwoBoundaryCell[],
  edges: GraphEdge[],
  edgeStates: IntegerEdgeState[],
): RankTwoCocycleValidationResult {
  const errors = validateIntegerEdgeStates(edgeStates, edges);
  const values = edgeStateMap(edgeStates);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const checks: RankTwoBoundaryCheck[] = [];

  for (const cell of cells) {
    const vertices = boundaryVertices(cell);
    const expectedLength = 2 * cell.m;
    const terms: BoundaryCocycleTerm[] = [];
    const missingEdgeSteps: RankTwoBoundaryCheck["missingEdgeSteps"] = [];
    const missingStateEdgeIds: string[] = [];

    if (vertices.length !== expectedLength) {
      errors.push(`cell "${cell.id}" boundary length must be 2*m.`);
    }

    for (
      let step = 0;
      step < vertices.length && vertices.length === expectedLength;
      step += 1
    ) {
      const source = vertices[step];
      const target = vertices[(step + 1) % vertices.length];
      const edge = findBoundaryEdge(
        cell,
        step,
        source,
        target,
        edges,
        edgeById,
      );

      if (edge === undefined) {
        errors.push(`cell "${cell.id}" has no edge for boundary step ${step}.`);
        missingEdgeSteps.push({
          step,
          from: source,
          to: target,
          edgeId: cell.boundaryEdgeIds?.[step],
        });
        continue;
      }

      const value = values.get(edge.id);
      if (value === undefined) {
        errors.push(`edge "${edge.id}" has no integer state.`);
        missingStateEdgeIds.push(edge.id);
        continue;
      }

      terms.push(signedTerm(edge, source, target, value));
    }

    const boundarySum = terms.reduce((sum, term) => sum + term.signedValue, 0);
    const ok =
      vertices.length === expectedLength &&
      terms.length === expectedLength &&
      missingEdgeSteps.length === 0 &&
      missingStateEdgeIds.length === 0 &&
      boundarySum === 0;

    checks.push({
      cellId: cell.id,
      boundarySum,
      ok,
      terms,
      expectedBoundaryLength: expectedLength,
      actualBoundaryLength: vertices.length,
      missingEdgeSteps,
      missingStateEdgeIds,
    });

    if (
      vertices.length === expectedLength &&
      terms.length === expectedLength &&
      boundarySum !== 0
    ) {
      errors.push(`cell "${cell.id}" has boundary sum ${boundarySum}, not 0.`);
    }
  }

  return {
    ok: errors.length === 0,
    checks,
    errors,
  };
}

export function classifyIncidentEdges(
  vertexId: string,
  edges: GraphEdge[],
  edgeStates: IntegerEdgeState[],
): IncidentEdgeFlow[] {
  const values = edgeStateMap(edgeStates);

  return edges
    .filter((edge) => edge.source === vertexId || edge.target === vertexId)
    .map((edge): IncidentEdgeFlow => {
      const storedValue = values.get(edge.id) ?? 0;

      if (edge.source === vertexId && edge.target === vertexId) {
        return {
          edgeId: edge.id,
          generator: edge.generator,
          neighborId: vertexId,
          valueAwayFromVertex: 0,
          orientation: "loop",
          classification: "level",
        };
      }

      const followsStoredOrientation = edge.source === vertexId;
      const valueAwayFromVertex = followsStoredOrientation
        ? storedValue
        : -storedValue;

      return {
        edgeId: edge.id,
        generator: edge.generator,
        neighborId: followsStoredOrientation ? edge.target : edge.source,
        valueAwayFromVertex,
        orientation: followsStoredOrientation
          ? "stored-orientation"
          : "opposite-orientation",
        classification:
          valueAwayFromVertex > 0
            ? "ascending"
            : valueAwayFromVertex < 0
              ? "descending"
              : "level",
      };
    })
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
}

export function certifyMorseCocycle(
  game: QuotientGameData | undefined,
  cells: RankTwoBoundaryCell[],
  edges: GraphEdge[],
  rank?: number,
  options: { checkedAt?: string } = {},
): MorseCocycleCertificate {
  const resolved = resolveIntegerEdgeAssignment(game, edges, rank);
  const cocycle =
    game?.cocycles?.find((entry) => entry.id === game.activeCocycleId) ??
    game?.cocycles?.[0];
  const validation = validateRankTwoCocycle(cells, edges, resolved.edgeStates);
  const warnings = [...resolved.warnings];

  if (resolved.source === "zero-fallback") {
    warnings.push(
      "No valid imported integer cocycle was active; zero labels were checked.",
    );
  }

  return {
    status: validation.ok && resolved.errors.length === 0 ? "passed" : "failed",
    method: "in-repo-rank-two-boundary-sums",
    assignmentId: resolved.assignmentId,
    cocycleId: cocycle?.id,
    checkedAt: options.checkedAt,
    cellCount: cells.length,
    boundaryFailures: validation.errors,
    warnings,
  };
}
