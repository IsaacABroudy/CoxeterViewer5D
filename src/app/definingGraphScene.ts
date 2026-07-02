import type { SceneEdge, SceneNode } from "../render/SceneView";
import type { CoxeterMatrixEntry, CoxeterSystemInput } from "../types";

type Vec3 = [number, number, number];

export interface DefiningGraphEdgeRecord {
  id: string;
  sourceGenerator: number;
  targetGenerator: number;
  entry: CoxeterMatrixEntry;
  label: string;
  color: string;
}

export interface DefiningGraphLegendEntry {
  label: string;
  color: string;
  count: number;
}

export interface DefiningGraphScene {
  nodes: SceneNode[];
  edges: SceneEdge[];
  records: DefiningGraphEdgeRecord[];
  legend: DefiningGraphLegendEntry[];
  selectedNodeId: string | undefined;
  warnings: string[];
  omittedRightAnglePairs: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DIAGRAM_RADIUS = 5.4;

/**
 * Builds the Coxeter defining graph Gamma as a renderer scene.
 *
 * Gamma has one vertex for each generator. By Coxeter-diagram convention we do
 * not draw `m=2` commuting pairs; finite `m>2` and `m=inf` pairs are drawn as
 * relation edges with explicit labels so the diagram is readable for teaching.
 */
export function buildDefiningGraphScene(
  system: CoxeterSystemInput,
): DefiningGraphScene {
  const nodes = system.generators.map((generator, index) => ({
    id: definingGraphNodeId(index),
    label: generator.label,
    compactLabel: generator.label,
    length: 0,
    localDistance: 0,
    position: generatorDirection(index, system.rank),
  }));
  const records: DefiningGraphEdgeRecord[] = [];
  let omittedRightAnglePairs = 0;

  for (let left = 0; left < system.rank; left += 1) {
    for (let right = left + 1; right < system.rank; right += 1) {
      const entry = system.coxeterMatrix[left]?.[right];
      if (entry === 2) {
        omittedRightAnglePairs += 1;
        continue;
      }
      if (entry === 1 || entry === undefined) {
        continue;
      }
      records.push({
        id: definingGraphEdgeId(left, right),
        sourceGenerator: left,
        targetGenerator: right,
        entry,
        label: relationLabel(entry),
        color: relationColor(entry),
      });
    }
  }

  return {
    nodes,
    edges: records.map((record) => ({
      id: record.id,
      source: definingGraphNodeId(record.sourceGenerator),
      target: definingGraphNodeId(record.targetGenerator),
      // SceneView colors edges by a single generator bucket. For Gamma edges,
      // the label carries the relation; the color is only a stable cue.
      generator: record.sourceGenerator,
      compactLabel: record.label,
      colorHint: record.color,
      isRelationBoundary: true,
      emphasis: "readable-boundary",
      selectedHighlight: "outline",
    })),
    records,
    legend: relationLegend(records),
    selectedNodeId: nodes[0]?.id,
    warnings: [
      "Gamma is the Coxeter defining graph: vertices are generators and edges record non-right Coxeter relations.",
      `${omittedRightAnglePairs} m=2 commuting pair${
        omittedRightAnglePairs === 1 ? " is" : "s are"
      } omitted by Coxeter-diagram convention.`,
      "The 3D placement of Gamma is a drawing convention; it is not the Davis complex or Y_Gamma.",
    ],
    omittedRightAnglePairs,
  };
}

export function definingGraphNodeId(generator: number): string {
  return `Gamma:v:${generator}`;
}

function definingGraphEdgeId(left: number, right: number): string {
  return `Gamma:e:${left}-${right}`;
}

function relationLabel(entry: CoxeterMatrixEntry): string {
  return entry === "inf" ? "m=inf" : `m=${entry}`;
}

function relationColor(entry: CoxeterMatrixEntry): string {
  if (entry === "inf") {
    return "#ec4899";
  }
  if (entry === 3) {
    return "#2563eb";
  }
  if (entry === 4) {
    return "#16a34a";
  }
  if (entry === 5) {
    return "#f59e0b";
  }
  return "#8b5cf6";
}

function relationLegend(
  records: DefiningGraphEdgeRecord[],
): DefiningGraphLegendEntry[] {
  const counts = new Map<string, DefiningGraphLegendEntry>();
  for (const record of records) {
    const existing = counts.get(record.label);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(record.label, {
        label: record.label,
        color: record.color,
        count: 1,
      });
    }
  }

  return [...counts.values()].sort((left, right) => {
    const leftRank = relationLegendRank(left.label);
    const rightRank = relationLegendRank(right.label);
    return leftRank - rightRank || left.label.localeCompare(right.label);
  });
}

function relationLegendRank(label: string): number {
  if (label === "m=inf") {
    return Number.POSITIVE_INFINITY;
  }
  const match = /^m=(\d+)$/.exec(label);
  return match ? Number(match[1]) : 10_000;
}

function generatorDirection(index: number, count: number): Vec3 {
  if (count <= 1) {
    return [0, 0, 0];
  }
  const y = 1 - (2 * (index + 0.5)) / count;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = index * GOLDEN_ANGLE - Math.PI / 2;
  return [
    Math.cos(angle) * radius * DIAGRAM_RADIUS,
    Math.sin(angle) * radius * DIAGRAM_RADIUS,
    y * DIAGRAM_RADIUS,
  ];
}
