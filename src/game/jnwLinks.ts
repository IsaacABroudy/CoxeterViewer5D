import type { CoxeterSystemInput } from "../types";
import type { JnwState } from "./types";

export type JnwLinkKind = "full" | "ascending" | "descending" | "level";

export interface JnwLinkVertex {
  generator: number;
  sourceGeneratorId: string;
  displayLabel: string;
}

export interface JnwLinkSimplex {
  id: string;
  generators: number[];
  sourceGeneratorIds: string[];
  dimension: number;
}

/**
 * A finite simplicial link in the right-angled Davis complex.
 *
 * Vertices are generator directions. A nonempty set of directions spans a
 * simplex exactly when its generators form a clique in the defining graph,
 * equivalently when they generate a finite elementary abelian 2-subgroup.
 */
export interface JnwFiniteSimplicialLink {
  kind: JnwLinkKind;
  displayLabel: string;
  selectedStateId: string;
  vertices: JnwLinkVertex[];
  simplices: JnwLinkSimplex[];
  exactIncidence: true;
}

export interface JnwStateLinks {
  selectedStateId: string;
  stateGeneratorIds: string[];
  complementGeneratorIds: string[];
  full: JnwFiniteSimplicialLink;
  ascending: JnwFiniteSimplicialLink;
  descending: JnwFiniteSimplicialLink;
  level: JnwFiniteSimplicialLink;
}

/**
 * Derive the full and Morse-theoretic links at a JNW state.
 *
 * We use the JNW convention that directions named by generators in the state
 * are ascending. The complementary directions are descending. The faithful
 * JNW diagonal map assigns every incident edge slope +1 or -1, so it has no
 * level directions.
 */
export function deriveJnwStateLinks(
  system: CoxeterSystemInput,
  selectedState: Pick<JnwState, "id" | "generators">,
): JnwStateLinks {
  assertRightAngledSystem(system);

  const stateGenerators = normalizeStateGenerators(
    selectedState.generators,
    system.rank,
  );
  const stateGeneratorSet = new Set(stateGenerators);
  const complementGenerators = Array.from(
    { length: system.rank },
    (_unused, generator) => generator,
  ).filter((generator) => !stateGeneratorSet.has(generator));
  const vertices = buildVertices(system);
  const simplices = enumerateCliqueSimplices(system);
  const full = makeLink(
    "full",
    "Full local link at selected state",
    selectedState.id,
    vertices,
    simplices,
  );

  return {
    selectedStateId: selectedState.id,
    stateGeneratorIds: sourceGeneratorIds(system, stateGenerators),
    complementGeneratorIds: sourceGeneratorIds(system, complementGenerators),
    full,
    ascending: inducedLink(
      full,
      stateGenerators,
      "ascending",
      "Ascending link at selected state",
    ),
    descending: inducedLink(
      full,
      complementGenerators,
      "descending",
      "Descending link at selected state",
    ),
    level: makeLink(
      "level",
      "Level link at selected state (empty in faithful JNW)",
      selectedState.id,
      [],
      [],
    ),
  };
}

function buildVertices(system: CoxeterSystemInput): JnwLinkVertex[] {
  return system.generators.map((generator, index) => ({
    generator: index,
    sourceGeneratorId: generator.id,
    displayLabel: generator.label,
  }));
}

function enumerateCliqueSimplices(
  system: CoxeterSystemInput,
): JnwLinkSimplex[] {
  const simplices: JnwLinkSimplex[] = [];
  const allGenerators = Array.from(
    { length: system.rank },
    (_unused, generator) => generator,
  );

  const extendClique = (prefix: number[], candidates: number[]): void => {
    for (
      let candidateIndex = 0;
      candidateIndex < candidates.length;
      candidateIndex += 1
    ) {
      const generator = candidates[candidateIndex];
      const clique = [...prefix, generator];
      simplices.push(simplexForGenerators(system, clique));

      const remaining = candidates
        .slice(candidateIndex + 1)
        .filter((other) => commute(system, generator, other));
      extendClique(clique, remaining);
    }
  };

  extendClique([], allGenerators);
  return simplices;
}

function simplexForGenerators(
  system: CoxeterSystemInput,
  generators: number[],
): JnwLinkSimplex {
  return {
    id: `jnw-link-simplex:${generators.join(",")}`,
    generators,
    sourceGeneratorIds: sourceGeneratorIds(system, generators),
    dimension: generators.length - 1,
  };
}

function inducedLink(
  full: JnwFiniteSimplicialLink,
  generators: number[],
  kind: Exclude<JnwLinkKind, "full" | "level">,
  displayLabel: string,
): JnwFiniteSimplicialLink {
  const included = new Set(generators);
  return makeLink(
    kind,
    displayLabel,
    full.selectedStateId,
    full.vertices.filter((vertex) => included.has(vertex.generator)),
    full.simplices.filter((simplex) =>
      simplex.generators.every((generator) => included.has(generator)),
    ),
  );
}

function makeLink(
  kind: JnwLinkKind,
  displayLabel: string,
  selectedStateId: string,
  vertices: JnwLinkVertex[],
  simplices: JnwLinkSimplex[],
): JnwFiniteSimplicialLink {
  return {
    kind,
    displayLabel,
    selectedStateId,
    vertices,
    simplices,
    exactIncidence: true,
  };
}

function sourceGeneratorIds(
  system: CoxeterSystemInput,
  generators: number[],
): string[] {
  return generators.map((generator) => system.generators[generator].id);
}

function normalizeStateGenerators(
  generators: readonly number[],
  rank: number,
): number[] {
  const normalized = [...new Set(generators)].sort(
    (left, right) => left - right,
  );

  for (const generator of normalized) {
    if (!Number.isInteger(generator) || generator < 0 || generator >= rank) {
      throw new Error(
        `JNW state generator ${generator} is outside the range 0..${rank - 1}.`,
      );
    }
  }

  return normalized;
}

function commute(
  system: CoxeterSystemInput,
  left: number,
  right: number,
): boolean {
  return system.coxeterMatrix[left][right] === 2;
}

function assertRightAngledSystem(system: CoxeterSystemInput): void {
  if (
    system.generators.length !== system.rank ||
    system.coxeterMatrix.length !== system.rank
  ) {
    throw new Error(
      "JNW link derivation requires one generator and one Coxeter-matrix row per rank.",
    );
  }

  for (let row = 0; row < system.rank; row += 1) {
    if (system.coxeterMatrix[row]?.length !== system.rank) {
      throw new Error("JNW link derivation requires a square Coxeter matrix.");
    }

    for (let column = 0; column < system.rank; column += 1) {
      const entry = system.coxeterMatrix[row][column];
      if (row === column) {
        if (entry !== 1) {
          throw new Error(
            "JNW link derivation requires diagonal Coxeter entries m_ii = 1.",
          );
        }
        continue;
      }

      if (entry !== 2 && entry !== "inf") {
        throw new Error(
          `JNW link derivation is faithful only for right-angled systems; found m_${row}${column} = ${entry}.`,
        );
      }
      if (entry !== system.coxeterMatrix[column][row]) {
        throw new Error(
          "JNW link derivation requires a symmetric Coxeter matrix.",
        );
      }
    }
  }
}
