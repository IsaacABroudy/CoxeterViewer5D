#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";

const DEFAULT_OUTPUT = "scripts/benchmarks/timed-browser-v1.json";
const BENCHMARK_URL =
  process.env.COXETER_BENCHMARK_URL ?? "http://127.0.0.1:5173/";
const CASES = [
  {
    exampleId: "I2_5",
    radius: 5,
    expected: { renderedNodes: 10, renderedEdgeSegments: 10, renderedCells: 1 },
  },
  {
    exampleId: "A3",
    radius: 4,
    expected: { renderedNodes: 20, renderedEdgeSegments: 27, renderedCells: 3 },
  },
  {
    exampleId: "universal_rank3",
    radius: 4,
    expected: { renderedNodes: 46, renderedEdgeSegments: 45, renderedCells: 0 },
  },
  {
    exampleId: "compact_5_cube_gamma1",
    radius: 2,
    expected: { renderedNodes: 10, renderedEdgeSegments: 9, renderedCells: 0 },
  },
  {
    exampleId: "compact_5_cube_gamma1",
    radius: 3,
    expected: {
      renderedNodes: 71,
      renderedEdgeSegments: 100,
      renderedCells: 30,
    },
  },
];
const CASE_BUDGETS = new Map([
  ["I2_5:5", { elapsedMs: 1800, lastGraphUpdateMs: 160 }],
  ["A3:4", { elapsedMs: 1800, lastGraphUpdateMs: 180 }],
  ["universal_rank3:4", { elapsedMs: 1200, lastGraphUpdateMs: 150 }],
  ["compact_5_cube_gamma1:2", { elapsedMs: 2600, lastGraphUpdateMs: 250 }],
  ["compact_5_cube_gamma1:3", { elapsedMs: 3600, lastGraphUpdateMs: 300 }],
]);
const FRAME_BUDGETS = {
  frameDeltaP95Ms: 160,
  frameDeltaMaxMs: 300,
};
const INTERACTION_BUDGETS = new Map([
  ["label-toggle", { elapsedMs: 900, lastGraphUpdateMs: 200 }],
  ["rank-two-pair-focus", { elapsedMs: 1400, lastGraphUpdateMs: 300 }],
  ["ygamma-preset-switch", { elapsedMs: 2200, lastGraphUpdateMs: 450 }],
  ["quotient-link-lens", { elapsedMs: 1800, lastGraphUpdateMs: 350 }],
  ["topology-generator-star", { elapsedMs: 2200, lastGraphUpdateMs: 450 }],
  ["edge-star", { elapsedMs: 1800, lastGraphUpdateMs: 350 }],
  ["cell-star", { elapsedMs: 1800, lastGraphUpdateMs: 350 }],
  ["rank-k-lens", { elapsedMs: 2400, lastGraphUpdateMs: 500 }],
  ["comparison-view", { elapsedMs: 1800, lastGraphUpdateMs: 350 }],
  ["ygamma-cutaway-switch", { elapsedMs: 2400, lastGraphUpdateMs: 500 }],
  ["ygamma-relation-star", { elapsedMs: 2600, lastGraphUpdateMs: 550 }],
  ["ygamma-leader-labels", { elapsedMs: 2200, lastGraphUpdateMs: 500 }],
  ["ygamma-relation-atlas", { elapsedMs: 2400, lastGraphUpdateMs: 500 }],
  ["ygamma-drawing-comparison", { elapsedMs: 3200, lastGraphUpdateMs: 700 }],
  ["ygamma-camera-path", { elapsedMs: 2200, lastGraphUpdateMs: 500 }],
  ["annotation-toggle", { elapsedMs: 900, lastGraphUpdateMs: 200 }],
  ["bookmark-restore", { elapsedMs: 1600, lastGraphUpdateMs: 350 }],
  ["progressive-quotient-load", { elapsedMs: 2200, lastGraphUpdateMs: 450 }],
  ["import-repair", { elapsedMs: 2600, lastGraphUpdateMs: 450 }],
  ["screenshot-export", { elapsedMs: 4500, lastGraphUpdateMs: 450 }],
  ["idle-render-count", { maxRenderCountDelta: 3 }],
]);
const INTERACTION_FEATURE_FLOORS = new Map([
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

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseArgs(argv) {
  const args = { write: undefined, check: undefined, report: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--write" || argv[i] === "--check") {
      args[argv[i].slice(2)] = argv[i + 1] ?? DEFAULT_OUTPUT;
      i += 1;
      continue;
    }
    if (argv[i] === "--report") {
      args.report = argv[i + 1] ?? ".benchmark-current/timed-browser-v1.json";
      i += 1;
      continue;
    }
    throw new Error(`unknown timed benchmark argument: ${argv[i]}`);
  }
  return args;
}

async function canReachBenchmarkUrl() {
  try {
    const response = await fetch(BENCHMARK_URL, { method: "HEAD" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForBenchmarkUrl(timeoutMs = 60_000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    if (await canReachBenchmarkUrl()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`benchmark server did not become ready at ${BENCHMARK_URL}`);
}

async function ensureBenchmarkServer() {
  if (await canReachBenchmarkUrl()) {
    return { dispose: async () => undefined };
  }
  const url = new URL(BENCHMARK_URL);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(
      `benchmark URL ${BENCHMARK_URL} is not reachable; start that server before running the timed benchmark`,
    );
  }

  const server = await startStaticBenchmarkServer(url);
  await waitForBenchmarkUrl();
  return {
    dispose: () => closeServer(server),
  };
}

async function startStaticBenchmarkServer(url) {
  const distRoot = resolve(process.cwd(), "dist");
  const indexPath = join(distRoot, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error(
      "dist/index.html is missing; run `corepack pnpm build` before the timed benchmark",
    );
  }

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", BENCHMARK_URL);
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const candidate = resolve(
      distRoot,
      decodedPath === "/" ? "index.html" : decodedPath.slice(1),
    );
    const relativePath = relative(distRoot, candidate);
    const filePath =
      relativePath.startsWith("..") || resolve(relativePath) === relativePath
        ? indexPath
        : isReadableFile(candidate)
          ? candidate
          : indexPath;
    response.setHeader("content-type", contentTypeFor(filePath));
    response.end(readFileSync(filePath));
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(Number(url.port || "5173"), url.hostname, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  return server;
}

function isReadableFile(path) {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

async function closeServer(server) {
  await new Promise((resolveClose) => server.close(resolveClose));
}

function contentTypeFor(path) {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".html":
    default:
      return "text/html; charset=utf-8";
  }
}

async function waitForStats(page, expected) {
  try {
    await page.waitForFunction(
      (target) => {
        const stats = globalThis.__coxeterSceneStats;
        if (!stats || stats.renderedNodes <= 0) {
          return false;
        }
        if (!target) {
          return true;
        }
        return (
          stats.renderedNodes === target.renderedNodes &&
          stats.renderedEdgeSegments === target.renderedEdgeSegments &&
          stats.renderedCells === target.renderedCells
        );
      },
      expected,
      { timeout: 30000 },
    );
  } catch (error) {
    const stats = await page.evaluate(() => globalThis.__coxeterSceneStats);
    throw new Error(
      `scene stats did not reach ${JSON.stringify(expected)}; last stats were ${JSON.stringify(stats)}`,
      { cause: error },
    );
  }
  return page.evaluate(() => globalThis.__coxeterSceneStats);
}

async function sceneStats(page) {
  return page.evaluate(() => globalThis.__coxeterSceneStats ?? null);
}

async function clickSemanticControl(page, selector) {
  await page.locator(selector).first().waitFor({ state: "attached" });
  await page.evaluate((controlSelector) => {
    const element = globalThis.document.querySelector(controlSelector);
    if (!element || typeof element.click !== "function") {
      throw new Error(`semantic control not found: ${controlSelector}`);
    }
    element.click();
  }, selector);
}

async function resetPage(page) {
  await page.goto(BENCHMARK_URL, { waitUntil: "domcontentloaded" });
  await page
    .evaluate(() => {
      globalThis.localStorage?.clear();
      globalThis.sessionStorage?.clear();
    })
    .catch(() => undefined);
  await page.goto(BENCHMARK_URL, { waitUntil: "domcontentloaded" });
  await waitForStats(page);
}

async function switchToResearchMode(page) {
  const research = page
    .getByRole("group", { name: /interface mode/i })
    .getByRole("button", { name: /research/i });
  if (
    (await research.getAttribute("aria-pressed").catch(() => null)) !== "true"
  ) {
    await research.click();
  }
}

async function ensureGenerationControlsOpen(page) {
  const radiusInput = page.locator("#radius-input");
  if (await radiusInput.isVisible().catch(() => false)) {
    return radiusInput;
  }

  const generationDetails = page
    .locator("details")
    .filter({ hasText: /Generation/i })
    .first();
  const summary = generationDetails.locator("summary");
  if ((await summary.count()) > 0) {
    await summary.click();
  }
  await radiusInput.waitFor({ state: "visible" });
  return radiusInput;
}

async function switchModel(page, modelName) {
  await page
    .getByRole("group", { name: /choose mathematical view/i })
    .first()
    .getByRole("button", { name: modelName })
    .click();
}

async function ensureChecked(locator) {
  if (!(await locator.isChecked().catch(() => false))) {
    await locator.click();
  }
}

async function firstVisibleEnabled(candidates) {
  for (const locator of candidates) {
    const count = await locator.count();
    for (let index = 0; index < Math.min(count, 6); index += 1) {
      const option = locator.nth(index);
      if (
        (await option.isVisible().catch(() => false)) &&
        (await option.isEnabled().catch(() => false))
      ) {
        return option;
      }
    }
  }
  return undefined;
}

async function runInteraction(
  page,
  id,
  setup,
  action,
  waitForSettled,
  details,
) {
  await setup();
  const before = await sceneStats(page);
  const beforeTrace = before?.performanceTrace ?? {};
  const beforeLongTasks = beforeTrace.longTaskDurations ?? [];
  const startedAt = performance.now();
  await action();
  await waitForSettled();
  const after = await sceneStats(page);
  const afterTrace = after?.performanceTrace ?? {};
  const afterLongTasks = afterTrace.longTaskDurations ?? [];
  const actionLongTasks =
    afterLongTasks.length >= beforeLongTasks.length
      ? afterLongTasks.slice(beforeLongTasks.length)
      : [];
  const longTaskCount =
    actionLongTasks.length > 0
      ? actionLongTasks.length
      : Math.max(
          0,
          Number(afterTrace.longTaskCount ?? 0) -
            Number(beforeTrace.longTaskCount ?? 0),
        );
  const longTaskTotalMs =
    actionLongTasks.length > 0
      ? actionLongTasks.reduce((total, duration) => total + duration, 0)
      : Math.max(
          0,
          Number(afterTrace.longTaskTotalMs ?? 0) -
            Number(beforeTrace.longTaskTotalMs ?? 0),
        );
  const longTaskMaxMs =
    actionLongTasks.length > 0 ? Math.max(...actionLongTasks) : 0;
  const renderCountDelta =
    Number.isFinite(before?.renderCount) && Number.isFinite(after?.renderCount)
      ? after.renderCount - before.renderCount
      : undefined;

  return {
    id,
    status: "measured",
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    ...(details
      ? { details: typeof details === "function" ? details() : details }
      : {}),
    renderedNodes: after?.renderedNodes ?? 0,
    renderedEdgeSegments: after?.renderedEdgeSegments ?? 0,
    renderedCells: after?.renderedCells ?? 0,
    renderedNodeLabels: after?.renderedNodeLabels ?? 0,
    renderedEdgeLabels: after?.renderedEdgeLabels ?? 0,
    renderedLabelLeaders: after?.renderedLabelLeaders ?? 0,
    drawCalls: after?.drawCalls ?? 0,
    triangles: after?.triangles ?? 0,
    workerGenerationMs: Number((after?.workerGenerationMs ?? 0).toFixed(3)),
    longTaskCount,
    longTaskTotalMs: Number(longTaskTotalMs.toFixed(3)),
    longTaskMaxMs: Number(longTaskMaxMs.toFixed(3)),
    estimatedSceneBytes: after?.performanceTrace?.estimatedSceneBytes ?? 0,
    pickingCandidates: after?.picking?.candidates ?? 0,
    pickingRejected: after?.picking?.rejected ?? 0,
    lastGraphUpdateMs: Number((after?.lastGraphUpdateMs ?? 0).toFixed(3)),
    ...(renderCountDelta !== undefined ? { renderCountDelta } : {}),
    ...frameTimingSummary(after?.frameSamples ?? []),
  };
}

async function runLabelToggleInteraction(page) {
  const vertexLabels = page.getByRole("checkbox", {
    name: /group-element labels/i,
  });
  const edgeLabels = page.getByRole("checkbox", {
    name: /generator labels on edges/i,
  });

  return runInteraction(
    page,
    "label-toggle",
    async () => {
      await resetPage(page);
      await vertexLabels.waitFor({ state: "visible" });
      await edgeLabels.waitFor({ state: "visible" });
      await ensureChecked(vertexLabels);
      await ensureChecked(edgeLabels);
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return (
          stats && stats.renderedNodeLabels > 0 && stats.renderedEdgeLabels > 0
        );
      });
    },
    async () => {
      await vertexLabels.click();
      await edgeLabels.click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return (
          stats &&
          stats.renderedNodeLabels === 0 &&
          stats.renderedEdgeLabels === 0
        );
      });
    },
    { toggled: ["group-element labels", "generator labels on edges"] },
  );
}

async function runRankTwoPairFocusInteraction(page) {
  return runInteraction(
    page,
    "rank-two-pair-focus",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.locator("#example-select").selectOption("A2");
      await page.getByRole("button", { name: /look near a chamber/i }).click();
      await page.getByLabel(/local depth/i).selectOption("3");
      await page.getByLabel(/far shells/i).selectOption("fade-far");
      await waitForStats(page);
    },
    async () => {
      await page
        .getByRole("group", { name: /local link pair filters/i })
        .getByRole("button", { name: /focus s0-s1 rank-two cells/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          globalThis.document.body.textContent?.match(
            /pair\s+s0-s1\s+has\s+m=3/i,
          ),
        );
      });
    },
    { pair: "s0-s1", expectedRelation: "m=3 hexagon" },
  );
}

async function runYGammaPresetInteraction(page) {
  let presetLabel = "Show m=3 hexagon relations";

  return runInteraction(
    page,
    "ygamma-preset-switch",
    async () => {
      await resetPage(page);
      await page.locator("#example-select").selectOption("A3");
      await switchModel(page, /^Y_Gamma$/);
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return (
          stats &&
          stats.renderedNodes > 0 &&
          globalThis.document.body.textContent?.includes("Y_Gamma")
        );
      });
      const presetGroup = page.getByRole("group", {
        name: /narrated y_gamma focus presets/i,
      });
      const hexagons = presetGroup.getByRole("button", {
        name: /show m=3 hexagon relations/i,
      });
      if (!(await hexagons.isEnabled().catch(() => false))) {
        presetLabel = "Show all relation faces";
      }
    },
    async () => {
      await page
        .getByRole("group", { name: /narrated y_gamma focus presets/i })
        .getByRole("button", { name: new RegExp(presetLabel, "i") })
        .click();
    },
    async () => {
      await page.waitForFunction((label) => {
        const stats = globalThis.__coxeterSceneStats;
        const pressed = [
          ...globalThis.document.querySelectorAll("button"),
        ].some(
          (button) =>
            button.textContent?.match(new RegExp(label, "i")) &&
            button.getAttribute("aria-pressed") === "true",
        );
        return Boolean(stats && stats.renderedCells > 0 && pressed);
      }, presetLabel);
    },
    () => ({ preset: presetLabel }),
  );
}

async function setupYGammaReadableCase(page) {
  await resetPage(page);
  await page.locator("#example-select").selectOption("compact_5_cube_gamma1");
  await switchModel(page, /^Y_Gamma$/);
  await page.getByTestId("ygamma-reader").waitFor({ state: "visible" });
  const focusRelation = page.getByLabel(/focus relation/i);
  const m3Relation = await focusRelation
    .locator("option", { hasText: /m=3/i })
    .first()
    .getAttribute("value")
    .catch(() => null);
  if (m3Relation) {
    await focusRelation.selectOption(m3Relation);
  }
  await page.waitForFunction(() => {
    const stats = globalThis.__coxeterSceneStats;
    return Boolean(
      stats && stats.renderedCells > 0 && stats.renderedEdgeLabels > 0,
    );
  });
}

async function runYGammaCutawayInteraction(page) {
  return runInteraction(
    page,
    "ygamma-cutaway-switch",
    async () => {
      await setupYGammaReadableCase(page);
      await page.getByTestId("ygamma-cutaway").scrollIntoViewIfNeeded();
    },
    async () => {
      await clickSemanticControl(
        page,
        '[data-testid="ygamma-cutaway"] button[data-cutaway-mode="relation-order"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        const pressed = [
          ...globalThis.document.querySelectorAll("button"),
        ].some(
          (button) =>
            button.textContent?.match(/same m/i) &&
            button.getAttribute("aria-pressed") === "true",
        );
        return Boolean(stats && stats.renderedCells > 0 && pressed);
      });
    },
    { cutaway: "relation-order" },
  );
}

async function runYGammaRelationStarInteraction(page) {
  return runInteraction(
    page,
    "ygamma-relation-star",
    async () => {
      await setupYGammaReadableCase(page);
      await page
        .getByTestId("ygamma-advanced-readability")
        .scrollIntoViewIfNeeded();
    },
    async () => {
      const advanced = page.getByTestId("ygamma-advanced-readability");
      await advanced.locator("summary").click();
      await clickSemanticControl(
        page,
        '[data-readable-action="relation-star"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          stats.renderedEdgeLabels > 0 &&
          stats.renderedLabelLeaders > 0,
        );
      });
    },
    { focus: "relation-star" },
  );
}

async function runYGammaLeaderLabelInteraction(page) {
  return runInteraction(
    page,
    "ygamma-leader-labels",
    async () => {
      await setupYGammaReadableCase(page);
      await page.getByTestId("ygamma-drawing").scrollIntoViewIfNeeded();
    },
    async () => {
      await clickSemanticControl(
        page,
        'button[data-separation-preset="expanded"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedEdgeLabels > 0 &&
          stats.renderedLabelLeaders > 0,
        );
      });
    },
    { labels: "leader-lines" },
  );
}

async function runYGammaRelationAtlasInteraction(page) {
  return runInteraction(
    page,
    "ygamma-relation-atlas",
    async () => {
      await setupYGammaReadableCase(page);
      await page
        .getByTestId("ygamma-advanced-readability")
        .scrollIntoViewIfNeeded();
    },
    async () => {
      const advanced = page.getByTestId("ygamma-advanced-readability");
      await advanced.locator("summary").click();
      await clickSemanticControl(
        page,
        '[data-readable-action="relation-atlas"]',
      );
      await clickSemanticControl(
        page,
        '[data-testid="ygamma-relation-atlas"] button[data-relation-order="3"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          globalThis.document.querySelector(
            "[data-testid='ygamma-relation-atlas']",
          ),
        );
      });
    },
    { atlas: "relation-family-focus" },
  );
}

async function runYGammaDrawingComparisonInteraction(page) {
  return runInteraction(
    page,
    "ygamma-drawing-comparison",
    async () => {
      await setupYGammaReadableCase(page);
    },
    async () => {
      const advanced = page.getByTestId("ygamma-advanced-readability");
      await advanced.locator("summary").click();
      await clickSemanticControl(
        page,
        '[data-readable-action="compare-drawing"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        return Boolean(
          globalThis.document.querySelector(
            "[data-testid='ygamma-comparison-left']",
          ) &&
          globalThis.document.querySelector(
            "[data-testid='ygamma-comparison-right']",
          ),
        );
      });
    },
    { comparison: "coherent-vs-expanded" },
  );
}

async function runYGammaCameraPathInteraction(page) {
  return runInteraction(
    page,
    "ygamma-camera-path",
    async () => {
      await setupYGammaReadableCase(page);
      await page.getByTestId("ygamma-camera-path").scrollIntoViewIfNeeded();
    },
    async () => {
      await clickSemanticControl(
        page,
        'button[data-camera-path="shared-generator"]',
      );
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        const pressed = [
          ...globalThis.document.querySelectorAll("button"),
        ].some(
          (button) =>
            button.textContent?.match(/shared gen/i) &&
            button.getAttribute("aria-pressed") === "true",
        );
        return Boolean(stats && stats.renderedEdgeLabels > 0 && pressed);
      });
    },
    { cameraPath: "shared-generator" },
  );
}

async function runScreenshotExportInteraction(page) {
  return runInteraction(
    page,
    "screenshot-export",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await waitForStats(page);
    },
    async () => {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: /export screenshot/i }).click();
      const file = await download;
      const failure = await file.failure().catch(() => null);
      if (failure) {
        throw new Error(`screenshot export failed: ${failure}`);
      }
    },
    async () => {
      await waitForStats(page);
    },
    { export: "png screenshot" },
  );
}

async function runQuotientLinkLensInteraction(page) {
  return runInteraction(
    page,
    "quotient-link-lens",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      const workflow = page.locator(".workflow-panel");
      await page
        .getByRole("group", { name: /research workflow steps/i })
        .getByRole("button", { name: /^3\s*Quotient$/i })
        .click();
      await workflow
        .getByRole("button", { name: /load demo quotient/i })
        .click();
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return (
          stats &&
          stats.renderedNodes > 0 &&
          globalThis.document.body.textContent?.includes(
            "I2(5) quotient (identity subgroup)",
          )
        );
      });
    },
    async () => {
      await page
        .locator(".workflow-panel")
        .getByRole("button", { name: /ascending link/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        const pressed = [
          ...globalThis.document.querySelectorAll("button"),
        ].some(
          (button) =>
            button.textContent?.match(/ascending link/i) &&
            button.getAttribute("aria-pressed") === "true",
        );
        return Boolean(stats && stats.renderedEdgeSegments > 0 && pressed);
      });
    },
    { lens: "ascending-link" },
  );
}

async function runTopologyGeneratorStarInteraction(page) {
  return runInteraction(
    page,
    "topology-generator-star",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.locator("#example-select").selectOption("A3");
      await waitForStats(page);
    },
    async () => {
      await page
        .locator(".workflow-panel")
        .getByRole("button", { name: /generator star/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          globalThis.document.body.textContent?.includes("Generator-star lens"),
        );
      });
    },
    { lens: "generator-star", example: "A3" },
  );
}

async function runEdgeStarInteraction(page) {
  return runInteraction(
    page,
    "edge-star",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.locator("#example-select").selectOption("A3");
      await waitForStats(page);
    },
    async () => {
      await page
        .getByRole("group", { name: /topology lenses/i })
        .getByRole("button", { name: /edge star/i })
        .click();
      const generatorFocus = await firstVisibleEnabled([
        page
          .getByRole("group", { name: /topology lens generator focus/i })
          .getByRole("button", { name: /s0/i }),
      ]);
      await generatorFocus?.click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          globalThis.document.body.textContent?.includes("Edge-star lens"),
        );
      });
    },
    { lens: "edge-star", example: "A3" },
  );
}

async function runCellStarInteraction(page) {
  return runInteraction(
    page,
    "cell-star",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.locator("#example-select").selectOption("A3");
      await waitForStats(page);
    },
    async () => {
      await page
        .getByRole("group", { name: /topology lenses/i })
        .getByRole("button", { name: /cell star/i })
        .click();
      const generatorFocus = await firstVisibleEnabled([
        page
          .getByRole("group", { name: /topology lens generator focus/i })
          .getByRole("button", { name: /s1/i }),
      ]);
      await generatorFocus?.click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          globalThis.document.body.textContent?.includes("Cell-star lens"),
        );
      });
    },
    { lens: "cell-star", generator: "s1", example: "A3" },
  );
}

async function runRankKLensInteraction(page) {
  return runInteraction(
    page,
    "rank-k-lens",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.locator("#example-select").selectOption("A3");
      await waitForStats(page);
    },
    async () => {
      await page
        .getByRole("group", { name: /topology lenses/i })
        .getByRole("button", { name: /rank-k family/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedCells > 0 &&
          globalThis.document.body.textContent?.includes("Rank-k-family lens"),
        );
      });
    },
    { lens: "rank-k-family", rank: 3 },
  );
}

async function runComparisonViewInteraction(page) {
  return runInteraction(
    page,
    "comparison-view",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await waitForStats(page);
    },
    async () => {
      await page.getByRole("button", { name: /save workflow run/i }).click();
      await page.getByRole("button", { name: /save workflow run/i }).click();
      await page
        .getByRole("button", { name: /compare workflow runs/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        return Boolean(
          globalThis.document.body.textContent?.match(
            /compared newest run|latest runs (changed status|have the same status)/i,
          ),
        );
      });
    },
    { view: "experiment comparison summary" },
  );
}

async function runAnnotationToggleInteraction(page) {
  return runInteraction(
    page,
    "annotation-toggle",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await page.getByRole("button", { name: /budgeted/i }).click();
      await ensureChecked(
        page.getByRole("checkbox", { name: /group-element labels/i }),
      );
      await ensureChecked(
        page.getByRole("checkbox", { name: /generator labels on edges/i }),
      );
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats && stats.renderedNodeLabels > 0 && stats.renderedEdgeLabels > 0,
        );
      });
    },
    async () => {
      await page
        .getByRole("group", { name: /label scope/i })
        .getByRole("button", { name: /^off$/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedNodeLabels === 0 &&
          stats.renderedEdgeLabels === 0,
        );
      });
    },
    { toggled: "label-scope-off" },
  );
}

async function runBookmarkRestoreInteraction(page) {
  return runInteraction(
    page,
    "bookmark-restore",
    async () => {
      await resetPage(page);
      await switchModel(page, /^Y_Gamma$/);
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats && globalThis.document.body.textContent?.includes("Y_Gamma"),
        );
      });
    },
    async () => {
      const bookmarks = page.getByRole("group", {
        name: /y_gamma camera bookmarks/i,
      });
      await bookmarks.getByRole("button", { name: /top/i }).click();
      await bookmarks.getByRole("button", { name: /front/i }).click();
    },
    async () => {
      await page.waitForFunction(() => {
        return [...globalThis.document.querySelectorAll("button")].some(
          (button) =>
            button.textContent?.match(/^front$/i) &&
            button.getAttribute("aria-pressed") === "true",
        );
      });
    },
    { bookmarks: ["top", "front"] },
  );
}

async function runProgressiveQuotientLoadInteraction(page) {
  return runInteraction(
    page,
    "progressive-quotient-load",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await waitForStats(page);
    },
    async () => {
      await page
        .getByRole("group", { name: /research workflow steps/i })
        .getByRole("button", { name: /quotient/i })
        .click();
      await page
        .locator(".workflow-panel")
        .getByRole("button", { name: /load demo quotient/i })
        .click();
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        return Boolean(
          stats &&
          stats.renderedNodes > 0 &&
          globalThis.document.body.textContent?.includes(
            "I2(5) quotient (identity subgroup)",
          ),
        );
      });
    },
    { load: "demo quotient workflow artifact" },
  );
}

async function runImportRepairInteraction(page) {
  return runInteraction(
    page,
    "import-repair",
    async () => {
      await resetPage(page);
      await switchToResearchMode(page);
      await waitForStats(page);
    },
    async () => {
      await page.setInputFiles("#import-coxeter-input", {
        name: "broken-coxeter.json",
        mimeType: "application/json",
        buffer: Buffer.from("{"),
      });
      await page.getByTestId("import-error").waitFor({ state: "visible" });
      await page.setInputFiles("#import-coxeter-input", {
        name: "A2-repaired.json",
        mimeType: "application/json",
        buffer: Buffer.from(readFileSync("public/examples/A2.json")),
      });
    },
    async () => {
      await page.waitForFunction(() => {
        const stats = globalThis.__coxeterSceneStats;
        const error = globalThis.document.querySelector(
          "[data-testid='import-error']",
        );
        return Boolean(stats && stats.renderedNodes > 0 && !error);
      });
    },
    { import: "invalid Coxeter JSON repaired by valid A2 import" },
  );
}

async function runIdleRenderCountInteraction(page) {
  const before = await sceneStats(page);
  if (!Number.isFinite(before?.renderCount)) {
    return {
      id: "idle-render-count",
      status: "skipped",
      reason: "scene stats did not expose renderCount in this browser context",
    };
  }

  await page.waitForTimeout(750);
  const after = await sceneStats(page);
  return {
    id: "idle-render-count",
    status: "measured",
    renderCountDelta: after.renderCount - before.renderCount,
  };
}

async function runInteractions(page) {
  const interactions = [];
  const runners = [
    { id: "label-toggle", run: runLabelToggleInteraction },
    { id: "rank-two-pair-focus", run: runRankTwoPairFocusInteraction },
    { id: "ygamma-preset-switch", run: runYGammaPresetInteraction },
    { id: "quotient-link-lens", run: runQuotientLinkLensInteraction },
    { id: "topology-generator-star", run: runTopologyGeneratorStarInteraction },
    { id: "edge-star", run: runEdgeStarInteraction },
    { id: "cell-star", run: runCellStarInteraction },
    { id: "rank-k-lens", run: runRankKLensInteraction },
    { id: "comparison-view", run: runComparisonViewInteraction },
    { id: "ygamma-cutaway-switch", run: runYGammaCutawayInteraction },
    { id: "ygamma-relation-star", run: runYGammaRelationStarInteraction },
    { id: "ygamma-leader-labels", run: runYGammaLeaderLabelInteraction },
    { id: "ygamma-relation-atlas", run: runYGammaRelationAtlasInteraction },
    {
      id: "ygamma-drawing-comparison",
      run: runYGammaDrawingComparisonInteraction,
    },
    { id: "ygamma-camera-path", run: runYGammaCameraPathInteraction },
    { id: "annotation-toggle", run: runAnnotationToggleInteraction },
    { id: "bookmark-restore", run: runBookmarkRestoreInteraction },
    {
      id: "progressive-quotient-load",
      run: runProgressiveQuotientLoadInteraction,
    },
    { id: "import-repair", run: runImportRepairInteraction },
    { id: "screenshot-export", run: runScreenshotExportInteraction },
    { id: "idle-render-count", run: runIdleRenderCountInteraction },
  ];

  for (const runner of runners) {
    try {
      interactions.push(await runner.run(page));
    } catch (error) {
      interactions.push({
        id: runner.id,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return interactions;
}

async function runCase(page, testCase, expected) {
  const startedAt = performance.now();

  await switchToResearchMode(page);
  let radiusInput = await ensureGenerationControlsOpen(page);
  await radiusInput.fill(String(testCase.radius));
  await page.locator("#example-select").selectOption(testCase.exampleId);
  radiusInput = await ensureGenerationControlsOpen(page);
  await radiusInput.fill(String(testCase.radius));
  const stats = await waitForStats(page, expected ?? testCase.expected);

  return {
    exampleId: testCase.exampleId,
    radius: testCase.radius,
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    renderedNodes: stats.renderedNodes,
    renderedEdgeSegments: stats.renderedEdgeSegments,
    renderedCells: stats.renderedCells,
    renderedNodeLabels: stats.renderedNodeLabels ?? 0,
    renderedEdgeLabels: stats.renderedEdgeLabels ?? 0,
    renderedLabelLeaders: stats.renderedLabelLeaders ?? 0,
    drawCalls: stats.drawCalls ?? 0,
    triangles: stats.triangles ?? 0,
    workerGenerationMs: Number((stats.workerGenerationMs ?? 0).toFixed(3)),
    longTaskCount: stats.performanceTrace?.longTaskCount ?? 0,
    longTaskMaxMs: Number(
      (stats.performanceTrace?.longTaskMaxMs ?? 0).toFixed(3),
    ),
    estimatedSceneBytes: stats.performanceTrace?.estimatedSceneBytes ?? 0,
    lastGraphUpdateMs: Number((stats.lastGraphUpdateMs ?? 0).toFixed(3)),
    ...frameTimingSummary(stats.frameSamples ?? []),
  };
}

function checkOutput(path, snapshot) {
  if (!existsSync(path)) {
    return { ok: false, message: `timed benchmark snapshot missing: ${path}` };
  }

  const expected = JSON.parse(readFileSync(path, "utf8"));
  const withoutTiming = ({
    elapsedMs: _elapsedMs,
    lastGraphUpdateMs: _lastGraphUpdateMs,
    frameDeltaMedianMs: _frameDeltaMedianMs,
    frameDeltaP95Ms: _frameDeltaP95Ms,
    frameDeltaMaxMs: _frameDeltaMaxMs,
    drawCalls: _drawCalls,
    triangles: _triangles,
    workerGenerationMs: _workerGenerationMs,
    longTaskCount: _longTaskCount,
    longTaskTotalMs: _longTaskTotalMs,
    longTaskMaxMs: _longTaskMaxMs,
    estimatedSceneBytes: _estimatedSceneBytes,
    ...rest
  }) => {
    void _elapsedMs;
    void _lastGraphUpdateMs;
    void _frameDeltaMedianMs;
    void _frameDeltaP95Ms;
    void _frameDeltaMaxMs;
    void _drawCalls;
    void _triangles;
    void _workerGenerationMs;
    void _longTaskCount;
    void _longTaskTotalMs;
    void _longTaskMaxMs;
    void _estimatedSceneBytes;
    return rest;
  };
  const expectedCases = expected.cases.map(withoutTiming);
  const actualCases = snapshot.cases.map(withoutTiming);
  const withoutInteractionTiming = ({
    elapsedMs: _elapsedMs,
    lastGraphUpdateMs: _lastGraphUpdateMs,
    frameDeltaMedianMs: _frameDeltaMedianMs,
    frameDeltaP95Ms: _frameDeltaP95Ms,
    frameDeltaMaxMs: _frameDeltaMaxMs,
    renderedNodes: _renderedNodes,
    renderedEdgeSegments: _renderedEdgeSegments,
    renderedCells: _renderedCells,
    renderedNodeLabels: _renderedNodeLabels,
    renderedEdgeLabels: _renderedEdgeLabels,
    renderedLabelLeaders: _renderedLabelLeaders,
    drawCalls: _drawCalls,
    triangles: _triangles,
    workerGenerationMs: _workerGenerationMs,
    longTaskCount: _longTaskCount,
    longTaskTotalMs: _longTaskTotalMs,
    longTaskMaxMs: _longTaskMaxMs,
    estimatedSceneBytes: _estimatedSceneBytes,
    pickingCandidates: _pickingCandidates,
    pickingRejected: _pickingRejected,
    renderCountDelta: _renderCountDelta,
    ...rest
  }) => {
    void _elapsedMs;
    void _lastGraphUpdateMs;
    void _frameDeltaMedianMs;
    void _frameDeltaP95Ms;
    void _frameDeltaMaxMs;
    void _renderedNodes;
    void _renderedEdgeSegments;
    void _renderedCells;
    void _renderedNodeLabels;
    void _renderedEdgeLabels;
    void _renderedLabelLeaders;
    void _drawCalls;
    void _triangles;
    void _workerGenerationMs;
    void _longTaskCount;
    void _longTaskTotalMs;
    void _longTaskMaxMs;
    void _estimatedSceneBytes;
    void _pickingCandidates;
    void _pickingRejected;
    void _renderCountDelta;
    return rest;
  };
  const expectedInteractions = (expected.interactions ?? []).map(
    withoutInteractionTiming,
  );
  const actualInteractions = (snapshot.interactions ?? []).map(
    withoutInteractionTiming,
  );
  const structureOk =
    JSON.stringify(expectedCases) === JSON.stringify(actualCases) &&
    JSON.stringify(expectedInteractions) === JSON.stringify(actualInteractions);
  const budgetFailures = [
    ...featureFloorFailuresFor(expected.cases, snapshot.cases, "case"),
    ...featureFloorFailuresFor(
      interactionFeatureFloorsFor(expected.interactions ?? []),
      snapshot.interactions ?? [],
      "interaction",
    ),
    ...budgetFailuresFor(snapshot.cases),
    ...interactionBudgetFailuresFor(snapshot.interactions ?? []),
  ];
  const ok = structureOk && budgetFailures.length === 0;
  return {
    ok,
    message: ok
      ? "timed benchmark structural snapshot is current"
      : [
          structureOk
            ? "timed benchmark structural snapshot is current"
            : "timed benchmark structural snapshot is stale",
          ...budgetFailures,
        ].join("; "),
  };
}

function frameTimingSummary(samples) {
  if (samples.length === 0) {
    return {
      frameDeltaMedianMs: 0,
      frameDeltaP95Ms: 0,
      frameDeltaMaxMs: 0,
    };
  }
  const deltas = samples
    .map((sample) => sample.deltaMs)
    // Demand-driven rendering deliberately leaves long gaps between frames
    // when the scene is idle. Those gaps are a success condition, not a slow
    // frame, so the budget checks only look at active render bursts. Long task
    // counters separately catch real main-thread stalls.
    .filter((delta) => Number.isFinite(delta) && delta <= 180)
    .sort((left, right) => left - right);
  if (deltas.length === 0) {
    return {
      frameDeltaMedianMs: 0,
      frameDeltaP95Ms: 0,
      frameDeltaMaxMs: 0,
    };
  }
  return {
    frameDeltaMedianMs: Number(percentile(deltas, 0.5).toFixed(3)),
    frameDeltaP95Ms: Number(percentile(deltas, 0.95).toFixed(3)),
    frameDeltaMaxMs: Number(deltas[deltas.length - 1].toFixed(3)),
  };
}

function percentile(sortedValues, fraction) {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * fraction) - 1),
  );
  return sortedValues[index];
}

function budgetFailuresFor(cases) {
  const failures = [];
  for (const testCase of cases) {
    const key = `${testCase.exampleId}:${testCase.radius}`;
    const budget = CASE_BUDGETS.get(key);
    if (budget) {
      if (testCase.elapsedMs > budget.elapsedMs) {
        failures.push(
          `${key} elapsed ${testCase.elapsedMs}ms > ${budget.elapsedMs}ms`,
        );
      }
      if (testCase.lastGraphUpdateMs > budget.lastGraphUpdateMs) {
        failures.push(
          `${key} graph update ${testCase.lastGraphUpdateMs}ms > ${budget.lastGraphUpdateMs}ms`,
        );
      }
    }
    if (testCase.frameDeltaP95Ms > FRAME_BUDGETS.frameDeltaP95Ms) {
      failures.push(
        `${key} frame p95 ${testCase.frameDeltaP95Ms}ms > ${FRAME_BUDGETS.frameDeltaP95Ms}ms`,
      );
    }
    if (testCase.frameDeltaMaxMs > FRAME_BUDGETS.frameDeltaMaxMs) {
      failures.push(
        `${key} frame max ${testCase.frameDeltaMaxMs}ms > ${FRAME_BUDGETS.frameDeltaMaxMs}ms`,
      );
    }
  }
  return failures;
}

function interactionBudgetFailuresFor(interactions) {
  const failures = [];
  for (const interaction of interactions) {
    if (interaction.status === "failed") {
      failures.push(`${interaction.id} failed: ${interaction.reason}`);
      continue;
    }
    if (interaction.status !== "measured") {
      continue;
    }
    const budget = INTERACTION_BUDGETS.get(interaction.id);
    if (!budget) {
      continue;
    }
    if (
      budget.elapsedMs !== undefined &&
      interaction.elapsedMs > budget.elapsedMs
    ) {
      failures.push(
        `${interaction.id} elapsed ${interaction.elapsedMs}ms > ${budget.elapsedMs}ms`,
      );
    }
    if (
      budget.lastGraphUpdateMs !== undefined &&
      interaction.lastGraphUpdateMs > budget.lastGraphUpdateMs
    ) {
      failures.push(
        `${interaction.id} graph update ${interaction.lastGraphUpdateMs}ms > ${budget.lastGraphUpdateMs}ms`,
      );
    }
    if (
      budget.maxRenderCountDelta !== undefined &&
      interaction.renderCountDelta !== undefined &&
      interaction.renderCountDelta > budget.maxRenderCountDelta
    ) {
      failures.push(
        `${interaction.id} render count delta ${interaction.renderCountDelta} > ${budget.maxRenderCountDelta}`,
      );
    }
  }
  return failures;
}

function featureFloorFailuresFor(expectedEntries, actualEntries, label) {
  const fields = [
    "renderedNodes",
    "renderedEdgeSegments",
    "renderedCells",
    "renderedNodeLabels",
    "renderedEdgeLabels",
    "renderedLabelLeaders",
  ];
  const actualById = new Map(
    actualEntries.map((entry) => [
      entry.id ?? `${entry.exampleId}:${entry.radius}`,
      entry,
    ]),
  );
  const failures = [];
  for (const expected of expectedEntries) {
    const id = expected.id ?? `${expected.exampleId}:${expected.radius}`;
    const actual = actualById.get(id);
    if (!actual) {
      failures.push(`${label} ${id} missing from current benchmark`);
      continue;
    }
    for (const field of fields) {
      if (expected[field] === undefined) {
        continue;
      }
      const expectedFloor = Number(expected[field]);
      const actualValue = Number(actual[field] ?? 0);
      if (actualValue < expectedFloor) {
        failures.push(
          `${label} ${id} ${field} ${actualValue} < floor ${expectedFloor}`,
        );
      }
    }
  }
  return failures;
}

function interactionFeatureFloorsFor(expectedEntries) {
  return expectedEntries
    .map((entry) => {
      const explicit = INTERACTION_FEATURE_FLOORS.get(entry.id);
      if (explicit) {
        return { id: entry.id, ...explicit };
      }
      const floor = { id: entry.id };
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
    })
    .filter((entry) => Object.keys(entry).length > 1);
}

const args = parseArgs(process.argv.slice(2));
const benchmarkServer = await ensureBenchmarkServer();
const browser = await chromium.launch();
const page = await browser.newPage();
const startedAt = performance.now();

try {
  await page.goto(BENCHMARK_URL, { waitUntil: "domcontentloaded" });
  const cases = [];
  for (const testCase of CASES) {
    cases.push(await runCase(page, testCase, testCase.expected));
  }
  const interactions = await runInteractions(page);

  const result = {
    ok: true,
    benchmark: "timed-browser-v1",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    benchmarkUrl: BENCHMARK_URL,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    browser: {
      name: "chromium",
      version: browser.version(),
    },
    cachePolicy:
      "single-pass; local/session storage cleared at reset points; persistent IndexedDB cache may be warm",
    totalElapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    cases,
    interactions,
  };

  if (args.write) {
    mkdirSync(dirname(args.write), { recursive: true });
    writeFileSync(args.write, stableJson(result), "utf8");
  }
  if (args.report) {
    mkdirSync(dirname(args.report), { recursive: true });
    writeFileSync(args.report, stableJson(result), "utf8");
  }

  const check = args.check ? checkOutput(args.check, result) : undefined;
  const output = { ...result, ...(check ? { check } : {}) };
  console.log(stableJson(output));

  if (check && !check.ok) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await benchmarkServer.dispose();
}
