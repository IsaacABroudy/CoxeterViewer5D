#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

const DEFAULT_TIMED_BASELINE = "scripts/benchmarks/timed-browser-v1.json";
const DEFAULT_OUTPUT = "scripts/benchmarks/machine-baselines-v1.json";
const checkedAt = "1970-01-01T00:00:00.000Z";
const minElapsedBudgetMs = 1000;
const minGraphUpdateBudgetMs = 8;

const machineClasses = {
  "ci-linux-standard": {
    hardGate: true,
    description: "GitHub-hosted Linux runner or equivalent shared CI machine.",
    elapsedScale: 1.75,
    graphUpdateScale: 2,
  },
  "local-dev-laptop": {
    hardGate: false,
    description:
      "A normal developer laptop; recorded locally and not used as a release blocker.",
    elapsedScale: 1,
    graphUpdateScale: 1,
  },
  "research-workstation": {
    hardGate: false,
    description:
      "A faster local machine used for large-radius experiments and artifact generation.",
    elapsedScale: 0.7,
    graphUpdateScale: 0.8,
  },
};
const interactionFeatureFloorOverrides = new Map([
  [
    "gamma-incidence-selection",
    {
      renderedNodes: 10,
      renderedEdgeSegments: 40,
      renderedEdgeLabels: 40,
    },
  ],
  ["rank-two-pair-focus", { renderedCells: 1, renderedEdgeLabels: 1 }],
  ["ygamma-preset-switch", { renderedCells: 1, renderedEdgeLabels: 1 }],
  [
    "quotient-link-lens",
    { renderedNodes: 1, renderedEdgeSegments: 1, renderedEdgeLabels: 1 },
  ],
  ["topology-generator-star", { renderedCells: 1 }],
  [
    "edge-star",
    { renderedEdgeSegments: 1, renderedCells: 1, renderedEdgeLabels: 1 },
  ],
  ["cell-star", { renderedCells: 1, renderedEdgeLabels: 1 }],
  ["rank-k-lens", { renderedCells: 1 }],
  ["comparison-view", { renderedNodes: 1, renderedEdgeLabels: 1 }],
  ["ygamma-cutaway-switch", { renderedCells: 1, renderedEdgeLabels: 1 }],
  [
    "ygamma-relation-star",
    { renderedCells: 1, renderedEdgeLabels: 1, renderedLabelLeaders: 1 },
  ],
  ["ygamma-leader-labels", { renderedEdgeLabels: 1, renderedLabelLeaders: 1 }],
  [
    "ygamma-relation-atlas",
    { renderedCells: 1, renderedEdgeLabels: 1, renderedLabelLeaders: 1 },
  ],
  [
    "ygamma-drawing-comparison",
    { renderedCells: 1, renderedEdgeLabels: 1, renderedLabelLeaders: 1 },
  ],
  ["ygamma-camera-path", { renderedCells: 1, renderedEdgeLabels: 1 }],
  [
    "progressive-quotient-load",
    { renderedNodes: 1, renderedEdgeSegments: 1, renderedEdgeLabels: 1 },
  ],
  ["import-repair", { renderedNodes: 1, renderedEdgeLabels: 1 }],
  ["screenshot-export", { renderedNodes: 1, renderedEdgeLabels: 1 }],
]);

function parseArgs(argv) {
  const args = {
    baseline: DEFAULT_TIMED_BASELINE,
    write: undefined,
    check: undefined,
    current: undefined,
    hardGates: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--baseline") {
      args.baseline = argv[index + 1] ?? args.baseline;
      index += 1;
      continue;
    }
    if (arg === "--write" || arg === "--check") {
      args[arg.slice(2)] = argv[index + 1] ?? DEFAULT_OUTPUT;
      index += 1;
      continue;
    }
    if (arg === "--current") {
      args.current = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--hard-gates") {
      args.hardGates = true;
      continue;
    }
    throw new Error(`unknown machine benchmark argument: ${arg}`);
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertCloseEnough(actual, expected, path) {
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(
      `${path} is stale. Run pnpm bench:timed:machine -- --write ${path}`,
    );
  }
}

function summarizeTimedBaseline(report) {
  const cases = Array.isArray(report.cases) ? report.cases : [];
  const interactions = Array.isArray(report.interactions)
    ? report.interactions
    : [];
  return {
    sourceReport: report.reportKind ?? "timed-browser-benchmark",
    sourceCreatedAt: report.createdAt ?? checkedAt,
    cases: cases.map((entry) => ({
      id: entry.id ?? `${entry.exampleId}:${entry.radius}`,
      elapsedMs: Number(entry.elapsedMs ?? 0),
      lastGraphUpdateMs: Number(entry.lastGraphUpdateMs ?? 0),
      renderedNodes: Number(entry.renderedNodes ?? 0),
      renderedEdgeSegments: Number(entry.renderedEdgeSegments ?? 0),
      renderedCells: Number(entry.renderedCells ?? 0),
      renderedNodeLabels: Number(entry.renderedNodeLabels ?? 0),
      renderedEdgeLabels: Number(entry.renderedEdgeLabels ?? 0),
      renderedLabelLeaders: Number(entry.renderedLabelLeaders ?? 0),
      drawCalls: Number(entry.drawCalls ?? 0),
    })),
    interactions: interactions.map((entry) => ({
      id: entry.id,
      elapsedMs: Number(entry.elapsedMs ?? 0),
      lastGraphUpdateMs: Number(entry.lastGraphUpdateMs ?? 0),
      renderCountDelta: Number(entry.renderCountDelta ?? 0),
      renderedNodes: Number(entry.renderedNodes ?? 0),
      renderedEdgeSegments: Number(entry.renderedEdgeSegments ?? 0),
      renderedCells: Number(entry.renderedCells ?? 0),
      renderedNodeLabels: Number(entry.renderedNodeLabels ?? 0),
      renderedEdgeLabels: Number(entry.renderedEdgeLabels ?? 0),
      renderedLabelLeaders: Number(entry.renderedLabelLeaders ?? 0),
      drawCalls: Number(entry.drawCalls ?? 0),
    })),
  };
}

function scaledBudgets(summary, scale) {
  const round = (value) => Math.max(1, Math.round(value));
  const elapsedBudget = (value) =>
    Math.max(minElapsedBudgetMs, round(value * scale.elapsedScale));
  const graphBudget = (value) =>
    Math.max(
      minGraphUpdateBudgetMs,
      round(Math.max(value, 1) * scale.graphUpdateScale),
    );
  return {
    cases: summary.cases.map((entry) => ({
      id: entry.id,
      maxElapsedMs: elapsedBudget(entry.elapsedMs),
      maxGraphUpdateMs: graphBudget(entry.lastGraphUpdateMs),
      featureFloors: featureFloors(entry),
    })),
    interactions: summary.interactions.map((entry) => ({
      id: entry.id,
      maxElapsedMs: elapsedBudget(entry.elapsedMs),
      maxGraphUpdateMs: graphBudget(entry.lastGraphUpdateMs),
      featureFloors: interactionFeatureFloors(entry),
    })),
  };
}

function featureFloors(entry) {
  return {
    renderedNodes: entry.renderedNodes,
    renderedEdgeSegments: entry.renderedEdgeSegments,
    renderedCells: entry.renderedCells,
    renderedNodeLabels: entry.renderedNodeLabels,
    renderedEdgeLabels: entry.renderedEdgeLabels,
    renderedLabelLeaders: entry.renderedLabelLeaders,
  };
}

function interactionFeatureFloors(entry) {
  const explicit = interactionFeatureFloorOverrides.get(entry.id);
  if (explicit) {
    return explicit;
  }
  const floor = {};
  for (const field of [
    "renderedNodes",
    "renderedEdgeSegments",
    "renderedCells",
    "renderedNodeLabels",
    "renderedEdgeLabels",
    "renderedLabelLeaders",
  ]) {
    if (Number(entry[field] ?? 0) > 0) {
      floor[field] = 1;
    }
  }
  return floor;
}

function buildMachineBaseline(timedReport) {
  const summary = summarizeTimedBaseline(timedReport);
  return {
    schemaVersion: 1,
    reportKind: "coxeter-machine-performance-baselines",
    checkedAt,
    timedBaselinePath: DEFAULT_TIMED_BASELINE,
    summary,
    machineClasses: Object.fromEntries(
      Object.entries(machineClasses).map(([id, machine]) => [
        id,
        {
          hardGate: machine.hardGate,
          description: machine.description,
          budgets: scaledBudgets(summary, machine),
        },
      ]),
    ),
    notes: [
      "ci-linux-standard is the only hard gate.",
      "Local classes are stored so larger topology and quotient experiments can be compared without changing CI thresholds.",
    ],
  };
}

const args = parseArgs(process.argv.slice(2));

if (!existsSync(args.baseline)) {
  throw new Error(
    `${args.baseline} is missing. Run pnpm bench:timed:write before computing machine baselines.`,
  );
}

const report = buildMachineBaseline(readJson(args.baseline));

if (args.write) {
  mkdirSync(dirname(args.write), { recursive: true });
  writeFileSync(args.write, stableJson(report));
  process.stdout.write(
    stableJson({ ok: true, status: "written", path: args.write }),
  );
  process.exit(0);
}

if (args.check) {
  if (!existsSync(args.check)) {
    throw new Error(`${args.check} is missing.`);
  }
  assertCloseEnough(readJson(args.check), report, args.check);
  if (args.current && args.hardGates) {
    const current = summarizeTimedBaseline(readJson(args.current));
    const failures = hardGateFailures(readJson(args.check), current);
    if (failures.length > 0) {
      throw new Error(`machine hard gates failed: ${failures.join("; ")}`);
    }
  }
  process.stdout.write(
    stableJson({ ok: true, status: "passed", path: args.check }),
  );
  process.exit(0);
}

process.stdout.write(stableJson(report));

function hardGateFailures(baseline, currentSummary) {
  const currentCases = new Map(
    currentSummary.cases.map((entry) => [entry.id, entry]),
  );
  const currentInteractions = new Map(
    currentSummary.interactions.map((entry) => [entry.id, entry]),
  );
  const failures = [];
  for (const [machineId, machine] of Object.entries(
    baseline.machineClasses ?? {},
  )) {
    if (!machine.hardGate) {
      continue;
    }
    for (const budget of machine.budgets?.cases ?? []) {
      compareEntry(
        failures,
        `${machineId} case ${budget.id}`,
        currentCases.get(budget.id),
        budget,
      );
    }
    for (const budget of machine.budgets?.interactions ?? []) {
      compareEntry(
        failures,
        `${machineId} interaction ${budget.id}`,
        currentInteractions.get(budget.id),
        budget,
      );
    }
  }
  return failures;
}

function compareEntry(failures, label, current, budget) {
  if (!current) {
    failures.push(`${label} missing`);
    return;
  }
  if (current.elapsedMs > budget.maxElapsedMs) {
    failures.push(
      `${label} elapsed ${current.elapsedMs}ms > ${budget.maxElapsedMs}ms`,
    );
  }
  if (current.lastGraphUpdateMs > budget.maxGraphUpdateMs) {
    failures.push(
      `${label} graph update ${current.lastGraphUpdateMs}ms > ${budget.maxGraphUpdateMs}ms`,
    );
  }
  for (const [field, floor] of Object.entries(budget.featureFloors ?? {})) {
    if (Number(current[field] ?? 0) < Number(floor ?? 0)) {
      failures.push(`${label} ${field} ${current[field] ?? 0} < ${floor}`);
    }
  }
}
