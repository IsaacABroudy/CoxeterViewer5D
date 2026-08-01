import type {
  CoxeterSystemInput,
  DavisHigherCell,
  DavisTwoCell,
} from "../types";
import type { DavisCellProxy } from "../davis";
import {
  formatJnwStateLabel,
  formatJnwStateName,
  type JnwLegalOrbitSummary,
} from "../game";
import type { QuotientComplex, QuotientTwoCell } from "../quotient";
import type { TopologyLensId } from "./researchWorkflow";
import type { YGammaCellRecord } from "./yGammaAtlas";
import type { DefiningGraphVertexIncidence } from "./definingGraphScene";

export type TopologyInspectorLayer =
  | "Davis"
  | "Y_Gamma"
  | "Gamma"
  | "quotient"
  | "JNW move-kernel cover"
  | "geometric projection";

export type TopologyInspectorStatus =
  | "certified"
  | "exact incidence"
  | "visual proxy"
  | "projection"
  | "browser diagnostic"
  | "uncertified";

export type TopologyInspectorSubject =
  | { kind: "node"; id: string; word: number[]; length: number }
  | { kind: "rank-two-cell"; cell: DavisTwoCell }
  | { kind: "higher-cell"; cell: DavisHigherCell }
  | { kind: "higher-proxy"; proxy: DavisCellProxy }
  | { kind: "ygamma-cell"; cell: YGammaCellRecord }
  | { kind: "gamma-vertex"; incidence: DefiningGraphVertexIncidence }
  | { kind: "quotient-cell"; quotient: QuotientComplex; cell: QuotientTwoCell }
  | { kind: "local-link"; nodeId: string; sphericalSubsetCount: number }
  | {
      kind: "game-assignment";
      quotient: QuotientComplex;
      selectedVertexId?: string;
    }
  | {
      kind: "jnw-state-link";
      quotient: QuotientComplex;
      summary: JnwLegalOrbitSummary;
      selectedStateId?: string;
      lensId: TopologyLensId;
    };

export interface TopologyExplanation {
  title: string;
  layer: TopologyInspectorLayer;
  status: TopologyInspectorStatus;
  summary: string;
  actionHint?: string;
  rows: Array<{ label: string; value: string }>;
  boundaryWord?: string[];
  badges: string[];
}

export function buildJnwStateLinkSubject(
  quotient: QuotientComplex,
  summary: JnwLegalOrbitSummary,
  selectedStateId: string | undefined,
  lensId: TopologyLensId,
): Extract<TopologyInspectorSubject, { kind: "jnw-state-link" }> {
  return {
    kind: "jnw-state-link",
    quotient,
    summary,
    selectedStateId,
    lensId,
  };
}

/**
 * Produces the short explanation shown for the selected topological object.
 *
 * The status field is intentionally conservative: projected views remain
 * "projection", higher-cell hulls remain "visual proxy", and quotient cells
 * become "certified" only when their imported certificate says so.
 */
export function buildTopologyExplanation(input: {
  system: CoxeterSystemInput;
  subject: TopologyInspectorSubject | undefined;
  geometricProjectionActive?: boolean;
  geometryIntervalCertified?: boolean;
}): TopologyExplanation {
  const { system, subject } = input;
  if (!subject) {
    return {
      title: "No selection",
      layer: input.geometricProjectionActive ? "geometric projection" : "Davis",
      status: input.geometricProjectionActive
        ? "projection"
        : statusForSystem(system),
      summary:
        "Select a chamber, relation cell, or quotient object to inspect its topology.",
      actionHint: "Click a chamber or filled relation cell in the viewer.",
      rows: [],
      badges: statusBadges(system, input),
    };
  }

  if (subject.kind === "rank-two-cell") {
    const { cell } = subject;
    const labels = generatorLabels(system, cell.generatorPair);
    const boundaryWord = alternatingWord(labels, cell.boundaryNodeIds.length);
    return {
      title: `Rank-two relation ${labels.join("-")}`,
      layer: input.geometricProjectionActive ? "geometric projection" : "Davis",
      status: input.geometricProjectionActive
        ? "projection"
        : "exact incidence",
      summary: `Since m=${cell.m}, this Davis relation cell is a ${cell.boundaryNodeIds.length}-gon with alternating ${labels.join("/")} edges.`,
      actionHint: "Use the pair matrix or relation walk to compare its edges.",
      rows: [
        { label: "Cell id", value: cell.id },
        { label: "Finite subset", value: `{${labels.join(", ")}}` },
        { label: "Relation", value: `(${labels[0]} ${labels[1]})^${cell.m}=1` },
        {
          label: "Boundary length",
          value: String(cell.boundaryNodeIds.length),
        },
        { label: "Boundary nodes", value: cell.boundaryNodeIds.join(" -> ") },
      ],
      boundaryWord,
      badges: ["rank-two exact", ...statusBadges(system, input)],
    };
  }

  if (subject.kind === "ygamma-cell") {
    const cell = subject.cell;
    return {
      title: cell.label,
      layer: "Y_Gamma",
      status: "exact incidence",
      summary: cell.description,
      actionHint: "Orbit the 3D model; labels name the generator arrows.",
      rows: [
        { label: "Cell id", value: cell.id },
        { label: "Rank", value: String(cell.rank) },
        { label: "Dimension", value: String(cell.dimension) },
        {
          label: "Generators",
          value: cell.generatorLabels.join(", ") || "base vertex",
        },
        {
          label: "Boundary length",
          value: String(cell.boundaryLength ?? cell.attachingWord.length),
        },
      ],
      boundaryWord: cell.attachingWord,
      badges: ["Y_Gamma", "fundamental-domain cell"],
    };
  }

  if (subject.kind === "gamma-vertex") {
    const { incidence } = subject;
    const classRows = incidence.classes.map((relationClass) => ({
      label: `${relationClass.label} neighbors`,
      value:
        relationClass.neighbors.length > 0
          ? relationClass.neighbors.map((neighbor) => neighbor.label).join(", ")
          : "none",
    }));
    return {
      title: `Generator ${incidence.label}`,
      layer: "Gamma",
      status: statusForSystem(system),
      summary: `This vertex represents the Coxeter generator ${incidence.label}. Its ${incidence.totalOtherGenerators} other generators split into disjoint classes according to the exponent m_${incidence.generator},j.`,
      actionHint:
        "Click a neighboring generator in the partition list or select another vertex in Gamma.",
      rows: [
        { label: "Generator index", value: String(incidence.generator) },
        { label: "Finite degree", value: String(incidence.finiteDegree) },
        ...classRows,
        {
          label: "Partition check",
          value: incidence.isCompletePartition
            ? `all ${incidence.totalOtherGenerators} other generators accounted for once`
            : `${incidence.accountedNeighborCount} of ${incidence.totalOtherGenerators} accounted for`,
        },
      ],
      badges: ["defining graph", "relation-order partition"],
    };
  }

  if (subject.kind === "quotient-cell") {
    const { cell, quotient } = subject;
    const labels = generatorLabels(
      quotient.sourceSystem ?? system,
      cell.generatorPair,
    );
    return {
      title: `Quotient cell ${cell.id}`,
      layer: "quotient",
      status:
        quotient.schreierCertificate?.status === "passed"
          ? "certified"
          : "uncertified",
      summary: `A quotient rank-two cell for ${labels.join("-")} with m=${cell.m}.`,
      actionHint: "Focus the cell to check its boundary word and edge labels.",
      rows: [
        { label: "Pair", value: labels.join(", ") },
        {
          label: "Boundary vertices",
          value: cell.boundaryVertexIds.join(" -> "),
        },
        {
          label: "Boundary edges",
          value: cell.boundaryEdgeIds?.join(" -> ") ?? "not recorded",
        },
        {
          label: "Schreier certificate",
          value: quotient.schreierCertificate?.status ?? "not supplied",
        },
      ],
      boundaryWord: alternatingWord(labels, cell.boundaryVertexIds.length),
      badges: [
        "quotient",
        quotient.schreierCertificate?.status ?? "uncertified",
      ],
    };
  }

  if (subject.kind === "higher-cell") {
    const labels = subject.cell.generators.map(
      (generator) => system.generators[generator]?.label ?? `s${generator}`,
    );
    return {
      title: subject.cell.id,
      layer: "Davis",
      status:
        subject.cell.rendering?.proxy === true
          ? "visual proxy"
          : "exact incidence",
      summary: `A rank-${subject.cell.rank} spherical Davis cell record for {${labels.join(", ")}}.`,
      actionHint:
        "Treat the drawn hull as a proxy unless the status says exact incidence.",
      rows: [
        { label: "Subset", value: subject.cell.sphericalSubsetId },
        { label: "Generators", value: labels.join(", ") },
        {
          label: "Expected subgroup order",
          value: String(
            subject.cell.coset?.expectedSubgroupOrder ?? "not recorded",
          ),
        },
        {
          label: "Visible coset size",
          value: String(
            subject.cell.coset?.nodeCount ?? subject.cell.nodeIds.length,
          ),
        },
      ],
      badges: [
        subject.cell.rendering?.proxy === true
          ? "visual proxy"
          : "exact incidence",
      ],
    };
  }

  if (subject.kind === "higher-proxy") {
    const labels = subject.proxy.generators.map(
      (generator) => system.generators[generator]?.label ?? `s${generator}`,
    );
    return {
      title: subject.proxy.id,
      layer: "Davis",
      status: "visual proxy",
      summary: `A visual proxy hull for the spherical subset {${labels.join(", ")}}; incidence may be exact, but the drawn hull is not geometry.`,
      actionHint:
        "Use the inspector rows for incidence; do not read metric geometry from the hull.",
      rows: [
        { label: "Subset", value: subject.proxy.sphericalSubsetId },
        { label: "Generators", value: labels.join(", ") },
        {
          label: "Boundary nodes",
          value: String(subject.proxy.nodeIds.length),
        },
      ],
      badges: ["visual proxy"],
    };
  }

  if (subject.kind === "local-link") {
    return {
      title: `Local link at ${subject.nodeId}`,
      layer: "Davis",
      status: "exact incidence",
      summary:
        "The local link records the spherical subsets visible at the selected chamber.",
      actionHint:
        "Use link lenses to isolate ascending, descending, or level pieces.",
      rows: [
        { label: "Selected chamber", value: subject.nodeId },
        {
          label: "Spherical subsets",
          value: String(subject.sphericalSubsetCount),
        },
        { label: "Generator vertices", value: String(system.rank) },
      ],
      badges: ["local link", "spherical subsets"],
    };
  }

  if (subject.kind === "game-assignment") {
    const schreierStatus =
      subject.quotient.schreierCertificate?.status ?? "not supplied";
    return {
      title: "Quotient/game diagnostics",
      layer: "quotient",
      status: schreierStatus === "passed" ? "exact incidence" : "uncertified",
      summary:
        "Integer edge labels and JNW state/move directions are browser diagnostics on top of the quotient action.",
      actionHint:
        "Choose the cochain or JNW workflow, then inspect links at the selected vertex.",
      rows: [
        { label: "Selected vertex", value: subject.selectedVertexId ?? "none" },
        {
          label: "Assignments",
          value: String(subject.quotient.game?.assignments.length ?? 0),
        },
        {
          label: "Cocycles",
          value: String(subject.quotient.game?.cocycles?.length ?? 0),
        },
        {
          label: "Quotient action",
          value: schreierStatus,
        },
        {
          label: "Torsion-free",
          value:
            subject.quotient.torsionFreeCertificate?.status ?? "not supplied",
        },
      ],
      badges: ["quotient", "game diagnostic"],
    };
  }

  if (subject.kind === "jnw-state-link") {
    const sourceSystem = subject.quotient.sourceSystem ?? system;
    const selectedState =
      subject.summary.states.find(
        (state) => state.id === subject.selectedStateId,
      ) ?? subject.summary.states[0];
    const stateName = selectedState
      ? formatJnwStateName(subject.summary, selectedState)
      : "none";
    const stateSubsetLabel = selectedState
      ? formatJnwStateLabel(selectedState, sourceSystem)
      : "none";
    const lensLabel = jnwLinkLensLabel(subject.lensId);
    const orbitView = subject.lensId === "state-quotient-orbit";
    return {
      title: `${lensLabel} at ${stateName}`,
      layer: "JNW move-kernel cover",
      status: "exact incidence",
      summary: orbitView
        ? "This is the finite move-kernel cover assembled from lifts of the Y_Gamma fundamental domain. The selected state controls the Gamma subset and link diagnostics."
        : "This link is inspected at a selected state vertex in the derived move-kernel cover, not inside the ambient Davis view.",
      actionHint:
        "Use the JNW panel to choose a state, show it on Gamma, or switch to ascending, descending, level, and full state-link views.",
      rows: [
        {
          label: "Selected state",
          value:
            stateName === "none"
              ? "none"
              : `${stateName} = ${stateSubsetLabel}`,
        },
        { label: "Active link", value: lensLabel },
        { label: "Claim status", value: subject.summary.claimStatus },
      ],
      badges: [orbitView ? "four-state cover" : "selected state link"],
    };
  }

  return {
    title: subject.id,
    layer: input.geometricProjectionActive ? "geometric projection" : "Davis",
    status: input.geometricProjectionActive
      ? "projection"
      : statusForSystem(system),
    summary: `Chamber word length ${subject.length}.`,
    actionHint:
      "Step by generator buttons or press F to recenter this chamber.",
    rows: [
      { label: "Node id", value: subject.id },
      {
        label: "Word",
        value: subject.word.length === 0 ? "identity" : subject.word.join(" "),
      },
      { label: "Length", value: String(subject.length) },
    ],
    badges: statusBadges(system, input),
  };
}

function jnwLinkLensLabel(lensId: TopologyLensId): string {
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
      return "Cover link at selected state";
  }
}

function statusForSystem(system: CoxeterSystemInput): TopologyInspectorStatus {
  return system.dataStatus === "certified" ? "certified" : "uncertified";
}

function statusBadges(
  system: CoxeterSystemInput,
  input: {
    geometricProjectionActive?: boolean;
    geometryIntervalCertified?: boolean;
  },
): string[] {
  const badges = [system.dataStatus ?? "uncertified"];
  if (input.geometryIntervalCertified) {
    badges.push("interval geometry");
  }
  if (input.geometricProjectionActive) {
    badges.push("projection");
  }
  return badges;
}

function generatorLabels(
  system: CoxeterSystemInput,
  pair: [number, number],
): [string, string] {
  return [
    system.generators[pair[0]]?.label ?? `s${pair[0]}`,
    system.generators[pair[1]]?.label ?? `s${pair[1]}`,
  ];
}

function alternatingWord(labels: [string, string], length: number): string[] {
  return Array.from({ length }, (_, index) => labels[index % 2]);
}
