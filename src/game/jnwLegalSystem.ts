import type { QuotientComplex } from "../quotient";
import type { CoxeterMatrixEntry, CoxeterSystemInput } from "../types";
import type {
  JnwLegalOrbitSummary,
  JnwLegalStateCheck,
  JnwMove,
  JnwMovePropertyCheck,
  JnwMoveSystem,
  JnwOrbitEdge,
  JnwRankTwoDiagnostic,
  JnwState,
} from "./types";

const defaultOrbitCap = 512;

/**
 * The JNW game is state dependent: an edge direction is read from the current
 * state, not from a globally fixed sign on its generator.
 */
export function applyJnwMove(state: JnwState, move: JnwMove): JnwState {
  return stateFromGenerators(
    symmetricDifference(state.generators, move.toggles),
  );
}

export function createJnwState(generators: readonly number[]): JnwState {
  return stateFromGenerators([...generators]);
}

export function createDefaultJnwMoveSystem(
  system: CoxeterSystemInput,
): JnwMoveSystem {
  return {
    id: "jnw-singleton-moves",
    label: "Singleton moves",
    moves: Array.from({ length: system.rank }, (_unused, generator) => ({
      generator,
      toggles: [generator],
    })),
  };
}

export function createDefaultJnwState(system: CoxeterSystemInput): JnwState {
  return stateFromGenerators(
    Array.from(
      { length: Math.ceil(system.rank / 2) },
      (_unused, index) => index,
    ),
  );
}

export function createBipartiteJnwMoveSystem(
  system: CoxeterSystemInput,
): JnwMoveSystem | undefined {
  const colors = bipartiteColors(system);
  if (!colors) {
    return undefined;
  }
  const colorClasses = [0, 1].map((color) =>
    colors
      .map((entry, generator) => (entry === color ? generator : -1))
      .filter((generator) => generator >= 0),
  );
  return {
    id: "jnw-bipartite-color-moves",
    label: "Bipartite color-class moves",
    moves: colors.map((color, generator) => ({
      generator,
      toggles: colorClasses[color] ?? [generator],
    })),
  };
}

export function checkJnwMoveProperty(
  system: CoxeterSystemInput,
  moveSystem: JnwMoveSystem,
): JnwMovePropertyCheck[] {
  return normalizedMoves(system, moveSystem).map((move) => {
    const adjacentGeneratorViolations = move.toggles.filter(
      (toggle) =>
        toggle !== move.generator &&
        areJnwAdjacent(system, move.generator, toggle),
    );
    const includesSelf = move.toggles.includes(move.generator);
    return {
      generator: move.generator,
      includesSelf,
      adjacentGeneratorViolations,
      ok: includesSelf && adjacentGeneratorViolations.length === 0,
    };
  });
}

export function checkJnwLegalState(
  system: CoxeterSystemInput,
  state: JnwState,
): JnwLegalStateCheck {
  const stateSet = new Set(
    normalizeGeneratorSet(system.rank, state.generators),
  );
  const complement = Array.from(
    { length: system.rank },
    (_unused, generator) => (stateSet.has(generator) ? -1 : generator),
  ).filter((generator) => generator >= 0);
  const stateGenerators = [...stateSet].sort((left, right) => left - right);
  const nonempty = stateGenerators.length > 0;
  const complementNonempty = complement.length > 0;
  const stateConnected = inducedSubgraphConnected(system, stateGenerators);
  const complementConnected = inducedSubgraphConnected(system, complement);
  const legal =
    nonempty && complementNonempty && stateConnected && complementConnected;
  const stronglyLegal =
    legal &&
    stateGenerators.every((generator) =>
      complement.some((other) => areJnwAdjacent(system, generator, other)),
    ) &&
    complement.every((generator) =>
      stateGenerators.some((other) => areJnwAdjacent(system, generator, other)),
    );

  return {
    stateId: state.id,
    state: stateGenerators,
    nonempty,
    complementNonempty,
    stateConnected,
    complementConnected,
    stronglyLegal,
    legal,
  };
}

export function enumerateJnwOrbit(
  system: CoxeterSystemInput,
  moveSystem: JnwMoveSystem,
  initialState: JnwState,
  options: { orbitCap?: number } = {},
): Pick<
  JnwLegalOrbitSummary,
  "states" | "edges" | "orbitComplete" | "orbitCap" | "warnings"
> {
  const orbitCap = options.orbitCap ?? defaultOrbitCap;
  const moves = normalizedMoves(system, moveSystem);
  const initial = stateFromGenerators(
    normalizeGeneratorSet(system.rank, initialState.generators),
  );
  const stateMap = new Map<string, JnwState>([[initial.id, initial]]);
  const queue = [initial];
  const edgeMap = new Map<string, JnwOrbitEdge>();
  const warnings: string[] = [];
  let orbitComplete = true;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const move of moves) {
      const next = applyJnwMove(current, move);
      if (!stateMap.has(next.id)) {
        if (stateMap.size >= orbitCap) {
          orbitComplete = false;
          warnings.push(
            `JNW state orbit reached the cap of ${orbitCap}; diagnostics are incomplete.`,
          );
          continue;
        }
        stateMap.set(next.id, next);
        queue.push(next);
      }
      const edge = orientedJnwEdge(current, next, move.generator);
      edgeMap.set(edge.id, edge);
    }
  }

  const states = [...stateMap.values()]
    .sort(compareStates)
    .map((state) => ({ ...state, legal: checkJnwLegalState(system, state) }));

  return {
    states,
    edges: [...edgeMap.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    orbitComplete,
    orbitCap,
    warnings: [...new Set(warnings)],
  };
}

export function summarizeJnwLegalSystem(
  system: CoxeterSystemInput,
  moveSystem: JnwMoveSystem,
  initialState: JnwState,
  options: { orbitCap?: number } = {},
): JnwLegalOrbitSummary {
  const orbit = enumerateJnwOrbit(system, moveSystem, initialState, options);
  const moveChecks = checkJnwMoveProperty(system, moveSystem);
  const rightAngled = isRightAngledSystem(system);
  const movePropertyOk = moveChecks.every((check) => check.ok);
  const legalStateCount = orbit.states.filter(
    (state) => state.legal.legal,
  ).length;
  const stronglyLegalStateCount = orbit.states.filter(
    (state) => state.legal.stronglyLegal,
  ).length;
  const legalOrbit = legalStateCount === orbit.states.length;
  const stronglyLegalOrbit = stronglyLegalStateCount === orbit.states.length;
  const rankTwoDiagnostics = buildRankTwoDiagnostics(
    system,
    normalizedMoves(system, moveSystem),
    orbit.states,
    orbit.edges,
  );
  const rankTwoOk = rankTwoDiagnostics.every((diagnostic) => diagnostic.ok);
  const errors: string[] = [];
  const warnings = [...orbit.warnings];

  if (!movePropertyOk) {
    errors.push("At least one move violates the JNW move property.");
  }
  if (!legalOrbit) {
    errors.push("The selected orbit contains a non-legal state.");
  }
  if (!rankTwoOk) {
    errors.push("At least one rank-two diagnostic boundary is incomplete.");
  }
  if (!rightAngled) {
    warnings.push(
      "This Coxeter system is not right-angled; the state/move workflow is an experimental diagnostic, not the JNW theorem.",
    );
  }

  const claimStatus = !orbit.orbitComplete
    ? "incomplete-orbit-cap"
    : rightAngled && movePropertyOk && legalOrbit && rankTwoOk
      ? "jnw-faithful"
      : !rightAngled && movePropertyOk && rankTwoOk
        ? "experimental-non-jnw"
        : "failed";

  return {
    claimStatus,
    rightAngled,
    orbitComplete: orbit.orbitComplete,
    orbitCap: orbit.orbitCap,
    states: orbit.states,
    edges: orbit.edges,
    moveChecks,
    rankTwoDiagnostics,
    legalOrbit,
    stronglyLegalOrbit,
    legalStateCount,
    stronglyLegalStateCount,
    warnings: [...new Set(warnings)],
    errors,
  };
}

export function jnwOrbitToQuotientComplex(
  system: CoxeterSystemInput,
  summary: JnwLegalOrbitSummary,
): QuotientComplex {
  const twoCells = summary.rankTwoDiagnostics
    .filter((diagnostic) => diagnostic.ok)
    .map((diagnostic) => ({
      id: diagnostic.id,
      generatorPair: diagnostic.generatorPair,
      m: diagnostic.m,
      boundaryVertexIds: diagnostic.boundaryStateIds,
      boundaryEdgeIds: diagnostic.boundaryEdgeIds,
    }));

  return {
    schemaVersion: 1,
    name: `JNW state quotient (${system.name})`,
    sourceSystem: system,
    generatorRank: system.rank,
    vertices: summary.states.map((state) => ({
      id: state.id,
      label: stateLabel(state.generators),
      representativeWord: [],
    })),
    edges: summary.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      generator: edge.generator,
      inverseEdgeId: edge.id,
      label: system.generators[edge.generator]?.label ?? `s${edge.generator}`,
    })),
    twoCells,
    game: {
      activeAssignmentId: "jnw-state-directions",
      activeCocycleId: "jnw-state-direction-check",
      assignments: [
        {
          id: "jnw-state-directions",
          label: "JNW state-dependent edge directions",
          kind: "integer-edge-labeling",
          edgeStates: summary.edges.map((edge) => ({
            edgeId: edge.id,
            value: 1,
          })),
          notes: [
            "Each edge value follows the state-dependent direction computed from the JNW state/move data.",
          ],
        },
      ],
      cocycles: [
        {
          id: "jnw-state-direction-check",
          label: "JNW rank-two direction check",
          assignmentId: "jnw-state-directions",
          coefficientRing: "Z",
          notes: [
            "For RACG square cells this checks the diagonal-map direction convention. Non-right-angled polygons are experimental diagnostics.",
          ],
        },
      ],
      notes: [
        `Claim status: ${summary.claimStatus}.`,
        ...summary.warnings,
        ...summary.errors,
      ],
    },
    warnings: [
      `JNW state quotient claim status: ${summary.claimStatus}.`,
      ...summary.warnings,
      ...summary.errors,
    ],
  };
}

function normalizedMoves(
  system: CoxeterSystemInput,
  moveSystem: JnwMoveSystem,
): JnwMove[] {
  const byGenerator = new Map(
    moveSystem.moves.map((move) => [move.generator, move]),
  );
  return Array.from({ length: system.rank }, (_unused, generator) => {
    const move = byGenerator.get(generator);
    return {
      generator,
      toggles: normalizeGeneratorSet(system.rank, move?.toggles ?? [generator]),
    };
  });
}

function buildRankTwoDiagnostics(
  system: CoxeterSystemInput,
  moves: JnwMove[],
  states: Array<JnwState & { legal: JnwLegalStateCheck }>,
  edges: JnwOrbitEdge[],
): JnwRankTwoDiagnostic[] {
  const stateMap = new Map(states.map((state) => [state.id, state]));
  const moveByGenerator = new Map(moves.map((move) => [move.generator, move]));
  const edgeMap = new Map(
    edges.map((edge) => [
      edgeKey(edge.generator, edge.undirectedSource, edge.undirectedTarget),
      edge,
    ]),
  );
  const diagnostics = new Map<string, JnwRankTwoDiagnostic>();

  for (let i = 0; i < system.rank; i += 1) {
    for (let j = i + 1; j < system.rank; j += 1) {
      const m = finiteM(system.coxeterMatrix[i]?.[j]);
      if (m === undefined) {
        continue;
      }
      for (const state of states) {
        let current: JnwState = state;
        const boundaryStateIds: string[] = [];
        const boundaryEdgeIds: string[] = [];
        const warnings: string[] = [];
        for (let step = 0; step < 2 * m; step += 1) {
          const generator = step % 2 === 0 ? i : j;
          const move = moveByGenerator.get(generator) ?? {
            generator,
            toggles: [generator],
          };
          const next = applyJnwMove(current, move);
          boundaryStateIds.push(current.id);
          const edge = edgeMap.get(edgeKey(generator, current.id, next.id));
          if (edge) {
            boundaryEdgeIds.push(edge.id);
          } else {
            warnings.push(
              `Missing orbit edge for ${current.id} --s${generator}-- ${next.id}.`,
            );
          }
          current = stateMap.get(next.id) ?? next;
        }
        const periodClosed = current.id === state.id;
        if (!periodClosed) {
          warnings.push(
            "Alternating rank-two word did not return to the start state.",
          );
        }
        const minStateId = [...boundaryStateIds].sort()[0] ?? state.id;
        const id = `jnw:cell:${i}-${j}:${minStateId}`;
        if (!diagnostics.has(id)) {
          diagnostics.set(id, {
            id,
            generatorPair: [i, j],
            m,
            startStateId: state.id,
            boundaryStateIds,
            boundaryEdgeIds,
            periodClosed,
            ok: periodClosed && boundaryEdgeIds.length === 2 * m,
            warnings,
          });
        }
      }
    }
  }

  return [...diagnostics.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function orientedJnwEdge(
  left: JnwState,
  right: JnwState,
  generator: number,
): JnwOrbitEdge {
  const leftContains = left.generators.includes(generator);
  const source = leftContains ? left.id : right.id;
  const target = leftContains ? right.id : left.id;
  const [undirectedSource, undirectedTarget] = [left.id, right.id].sort();
  return {
    id: edgeKey(generator, undirectedSource, undirectedTarget),
    source,
    target,
    generator,
    undirectedSource,
    undirectedTarget,
  };
}

function edgeKey(generator: number, left: string, right: string): string {
  const [source, target] = [left, right].sort();
  return `jnw:e:${generator}:${source}:${target}`;
}

function stateFromGenerators(generators: number[]): JnwState {
  const normalized = [...new Set(generators)].sort(
    (left, right) => left - right,
  );
  return { id: stateId(normalized), generators: normalized };
}

function stateId(generators: number[]): string {
  return generators.length === 0
    ? "jnw:state:empty"
    : `jnw:state:${generators.join(".")}`;
}

function stateLabel(generators: number[]): string {
  return generators.length === 0
    ? "empty"
    : `{${generators.map((generator) => `s${generator}`).join(", ")}}`;
}

function compareStates(left: JnwState, right: JnwState): number {
  return (
    left.generators.length - right.generators.length ||
    left.id.localeCompare(right.id)
  );
}

function normalizeGeneratorSet(
  rank: number,
  generators: readonly number[],
): number[] {
  return [
    ...new Set(
      generators.filter(
        (generator) =>
          Number.isInteger(generator) && generator >= 0 && generator < rank,
      ),
    ),
  ].sort((left, right) => left - right);
}

function symmetricDifference(
  left: readonly number[],
  right: readonly number[],
): number[] {
  const result = new Set(left);
  for (const value of right) {
    if (result.has(value)) {
      result.delete(value);
    } else {
      result.add(value);
    }
  }
  return [...result].sort((a, b) => a - b);
}

function areJnwAdjacent(
  system: CoxeterSystemInput,
  left: number,
  right: number,
): boolean {
  return system.coxeterMatrix[left]?.[right] === 2;
}

function inducedSubgraphConnected(
  system: CoxeterSystemInput,
  generators: number[],
): boolean {
  if (generators.length <= 1) {
    return true;
  }
  const allowed = new Set(generators);
  const seen = new Set<number>();
  const queue = [generators[0]];
  seen.add(generators[0]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const next of generators) {
      if (
        !seen.has(next) &&
        allowed.has(next) &&
        areJnwAdjacent(system, current, next)
      ) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === generators.length;
}

function isRightAngledSystem(system: CoxeterSystemInput): boolean {
  for (let i = 0; i < system.rank; i += 1) {
    for (let j = i + 1; j < system.rank; j += 1) {
      const entry = system.coxeterMatrix[i]?.[j];
      if (typeof entry === "number" && entry !== 2) {
        return false;
      }
    }
  }
  return true;
}

function finiteM(entry: CoxeterMatrixEntry | undefined): number | undefined {
  return typeof entry === "number" && entry >= 2 ? entry : undefined;
}

function bipartiteColors(system: CoxeterSystemInput): number[] | undefined {
  const colors = Array.from({ length: system.rank }, () => -1);
  for (let start = 0; start < system.rank; start += 1) {
    if (colors[start] >= 0) {
      continue;
    }
    colors[start] = 0;
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (let next = 0; next < system.rank; next += 1) {
        if (!areJnwAdjacent(system, current, next)) {
          continue;
        }
        if (colors[next] < 0) {
          colors[next] = 1 - colors[current];
          queue.push(next);
        } else if (colors[next] === colors[current]) {
          return undefined;
        }
      }
    }
  }
  return colors;
}
