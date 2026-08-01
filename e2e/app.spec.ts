import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

async function firstPresent(candidates: Locator[]): Promise<Locator | null> {
  for (const candidate of candidates) {
    if ((await candidate.count()) > 0) {
      return candidate.first();
    }
  }

  return null;
}

async function firstVisible(candidates: Locator[]): Promise<Locator | null> {
  for (const candidate of candidates) {
    const count = await candidate.count();

    for (let index = 0; index < Math.min(count, 5); index += 1) {
      const option = candidate.nth(index);

      if (await option.isVisible().catch(() => false)) {
        return option;
      }
    }
  }

  return null;
}

async function textOf(locator: Locator): Promise<string> {
  return ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim();
}

async function setRadius(control: Locator, value: string): Promise<void> {
  const metadata = await control.evaluate((element) => {
    const input = element as HTMLInputElement;

    return {
      role: element.getAttribute("role") ?? "",
      type: input.type ?? "",
    };
  });

  if (metadata.role === "slider" || metadata.type === "range") {
    await control.focus();
    await control.press("ArrowRight");
    return;
  }

  await control.fill(value);
  await control.blur();
}

async function radiusControl(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole("spinbutton", { name: /radius/i }),
    page.getByRole("slider", { name: /radius/i }),
    page.getByLabel(/radius/i),
    page.getByTestId("radius-input"),
    page.getByTestId("radius-control"),
  ]);
}

async function switchToResearchMode(page: Page): Promise<void> {
  await page
    .getByRole("group", { name: /interface mode/i })
    .getByRole("button", { name: /research/i })
    .click();
}

async function switchModel(page: Page, model: RegExp): Promise<void> {
  await page
    .getByRole("group", { name: /choose mathematical view/i })
    .first()
    .getByRole("button", { name: model })
    .click();
}

async function visibleNodeCount(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByTestId("node-count"),
    page.getByRole("status", { name: /node count|nodes/i }),
    page.getByText(/nodes?\s*:\s*\d+/i),
  ]);
}

async function sceneStats(page: Page): Promise<{
  mode?: string;
  graphNodes?: number;
  renderedNodes?: number;
  renderedEdgeSegments?: number;
  renderedCells?: number;
  renderedNodeLabels?: number;
  renderedEdgeLabels?: number;
  renderedLabelLeaders?: number;
  labelRenderer?: "sprite" | "sdf-batch";
  labelRendererFallbackReason?: string;
  pickingStrategy?: "linear" | "sphere-prefilter" | "bvh" | "gpu";
  drawCalls?: number;
  frame?: number;
  renderCount?: number;
  stateNodeHighlights?: {
    inState: number;
    outOfState: number;
  };
  frameSamples?: Array<{ frame: number; deltaMs: number }>;
}> {
  return page.evaluate(() => {
    const stats = (
      window as Window & {
        __coxeterSceneStats?: {
          mode: string;
          graphNodes: number;
          renderedNodes: number;
          renderedEdgeSegments: number;
          renderedCells: number;
          renderedNodeLabels: number;
          renderedEdgeLabels: number;
          renderedLabelLeaders: number;
          labelRenderer: "sprite" | "sdf-batch";
          labelRendererFallbackReason?: string;
          picking: {
            strategy?: "linear" | "sphere-prefilter" | "bvh" | "gpu";
          };
          drawCalls: number;
          frame: number;
          renderCount: number;
          stateNodeHighlights: {
            inState: number;
            outOfState: number;
          };
          frameSamples: Array<{ frame: number; deltaMs: number }>;
        };
      }
    ).__coxeterSceneStats;

    return stats
      ? {
          mode: stats.mode,
          graphNodes: stats.graphNodes,
          renderedNodes: stats.renderedNodes,
          renderedEdgeSegments: stats.renderedEdgeSegments,
          renderedCells: stats.renderedCells,
          renderedNodeLabels: stats.renderedNodeLabels,
          renderedEdgeLabels: stats.renderedEdgeLabels,
          renderedLabelLeaders: stats.renderedLabelLeaders,
          labelRenderer: stats.labelRenderer,
          labelRendererFallbackReason: stats.labelRendererFallbackReason,
          pickingStrategy: stats.picking?.strategy,
          drawCalls: stats.drawCalls,
          frame: stats.frame,
          renderCount: stats.renderCount,
          stateNodeHighlights: stats.stateNodeHighlights,
          frameSamples: stats.frameSamples,
        }
      : {};
  });
}

function largeRankOneQuotient(vertexCount = 3_000) {
  const evenVertexCount = vertexCount - (vertexCount % 2);
  const vertices = Array.from(
    { length: evenVertexCount },
    (_unused, index) => ({
      id: `q${index}`,
      label: `Q_${index + 1}`,
    }),
  );
  const edges = [];
  for (let index = 0; index < evenVertexCount; index += 2) {
    const forwardId = `e${index}`;
    const reverseId = `e${index + 1}`;
    edges.push(
      {
        id: forwardId,
        source: `q${index}`,
        target: `q${index + 1}`,
        generator: 0,
        inverseEdgeId: reverseId,
        label: "s0",
      },
      {
        id: reverseId,
        source: `q${index + 1}`,
        target: `q${index}`,
        generator: 0,
        inverseEdgeId: forwardId,
        label: "s0",
      },
    );
  }
  return {
    schemaVersion: 1,
    name: "Large progressive quotient fixture",
    generatorRank: 1,
    vertices,
    edges,
    twoCells: [],
    warnings: ["Synthetic performance fixture."],
  };
}

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /coxeter viewer 5d/i }),
  ).toBeVisible();
});

test("teaching mode keeps model navigation and caveats readable", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /^start here$/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/current model/i)).toContainText(/Davis/i);
  const modelSwitch = page
    .getByRole("group", {
      name: /choose mathematical view/i,
    })
    .first();
  await expect(modelSwitch).toBeVisible();
  for (const label of [
    "Davis complex",
    "Y_Gamma",
    "Defining graph Gamma",
    "Projection drawing",
    "Quotient + Games",
  ]) {
    await expect(
      modelSwitch.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: /what is selected/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /why is it here/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /exact or drawing/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /caveats/i })).toBeVisible();
  for (const label of [
    "Explore a Coxeter example",
    "Find a relation cell",
    "Understand Y_Gamma",
    "Study a quotient/game",
    "Inspect exactness and data status",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(label, "i") }),
    ).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: /^help$/i })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /what am i seeing/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /current view/i }),
  ).toBeVisible();
  await expect(page.getByText(/Import Coxeter system/i)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /example gallery/i }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Understand Y_Gamma/i }).click();
  await expect(page.getByLabel(/current model/i)).toContainText(/Y_Gamma/i);

  await switchToResearchMode(page);
  await expect(
    page.getByRole("heading", { name: /choose \/ load/i }),
  ).toBeVisible();
  await expect(page.getByText(/Workflow/i).first()).toBeVisible();
  await expect(page.getByText(/Data\/files/i).first()).toBeVisible();
  await expect(page.getByText(/Notebook\/export/i).first()).toBeVisible();
  await expect(page.getByText(/Status\/tools/i).first()).toBeVisible();
  await page
    .locator("details")
    .filter({ hasText: /Files \+ Workspace/i })
    .locator("summary")
    .click();
  await expect(page.getByText(/Import Coxeter system/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /example gallery/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /research workflow/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /quotient \+ games/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Generator-Uniform Cochain/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/JNW Legal-System Game/i).first()).toBeVisible();
});

test("renders a nonblank scene on desktop and mobile viewports", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 760 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByTestId("scene-canvas").locator("canvas"),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const stats = await sceneStats(page);
        return Math.min(
          stats.renderedNodes ?? 0,
          stats.renderedEdgeSegments ?? 0,
          stats.drawCalls ?? 0,
          stats.renderCount ?? 0,
        );
      })
      .toBeGreaterThan(0);
  }
});

test("renderer exposes benchmark-friendly scene stats", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByTestId("scene-canvas").locator("canvas"),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return {
        nodes: stats.renderedNodes ?? 0,
        edges: stats.renderedEdgeSegments ?? 0,
        drawCalls: stats.drawCalls ?? 0,
      };
    })
    .toMatchObject({ nodes: expect.any(Number), edges: expect.any(Number) });

  await expect
    .poll(async () => (await sceneStats(page)).renderedNodes ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).renderedEdgeSegments ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).drawCalls ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).renderCount ?? 0)
    .toBeGreaterThan(0);

  const canvasShell = page.getByTestId("scene-canvas");
  await expect(canvasShell).toHaveAttribute("data-rendered-nodes", /\d+/);
  await expect(canvasShell).toHaveAttribute("data-rendered-edges", /\d+/);
});

test("opens the Tumarkin eight-facet catalogue without adding fake examples", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  await page.getByRole("button", { name: /16 eight-facet 5D cases/i }).click();
  await expect(
    page.getByLabel(/Tumarkin eight-facet catalogue/i),
  ).toBeVisible();
  await expect(page.getByText(/Showing 16\/16/i)).toBeVisible();
  await expect(
    page
      .getByText(/Certified bundled Coxeter-system JSON is available/i)
      .first(),
  ).toBeVisible();

  await page.getByLabel(/Search catalogue/i).fill("08");
  await expect(page.getByText(/Tumarkin G11411 #8/i)).toBeVisible();
  await expect(page.getByText(/Tumarkin G11411 #1/i)).toHaveCount(0);

  await page.getByLabel(/Search catalogue/i).fill("G12221");
  await expect(page.getByText(/Tumarkin G12221 \(unique\)/i)).toBeVisible();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByLabel("Example")).toHaveValue(
    "tumarkin-5d-8facet-g12221-01",
  );
});

test("changing radius updates the node count when controls are available", async ({
  page,
}) => {
  await page.goto("/");

  const control = await radiusControl(page);
  const nodeCount = await visibleNodeCount(page);

  if (!control || !nodeCount) {
    test.skip(
      true,
      "Radius control or node count is not implemented in the scaffold yet.",
    );
    return;
  }

  const before = await textOf(nodeCount);
  const currentValue = await control.inputValue().catch(() => "");
  const nextValue = currentValue === "3" ? "4" : "3";

  await setRadius(control, nextValue);

  await expect.poll(() => textOf(nodeCount)).not.toBe(before);
});

test("rank-two cell toggle updates the visible cell count when exposed", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByLabel(/example/i).selectOption("A2");
  await page.getByRole("button", { name: /look near a chamber/i }).click();
  await page.getByLabel(/local depth/i).selectOption("3");
  await page.getByLabel(/far shells/i).selectOption("fade-far");

  const toggle = await firstVisible([
    page.getByRole("checkbox", {
      name: /rank[-\s]?two.*cells|davis.*cells|cells/i,
    }),
    page.getByRole("switch", {
      name: /rank[-\s]?two.*cells|davis.*cells|cells/i,
    }),
    page.getByRole("button", {
      name: /rank[-\s]?two.*cells|davis.*cells|cells/i,
    }),
    page.getByTestId("rank-two-cells-toggle"),
  ]);
  const cellCount = await firstVisible([
    page.getByTestId("rank-two-cell-count"),
    page.getByRole("status", {
      name: /cell count|rank[-\s]?two cells|visible cells/i,
    }),
    page.getByText(/cells?\s*:\s*\d+/i),
  ]);

  if (!toggle || !cellCount) {
    test.skip(
      true,
      "Rank-two cell toggle or visible cell count is not implemented yet.",
    );
    return;
  }

  const before = await textOf(cellCount);

  await toggle.click();

  await expect.poll(() => textOf(cellCount)).not.toBe(before);
});

test("label toggles expose compact vertex and edge labels", async ({
  page,
}) => {
  await page.goto("/");

  const vertexLabels = page.getByRole("checkbox", {
    name: /group-element labels/i,
  });
  const edgeLabels = page.getByRole("checkbox", {
    name: /generator labels on edges/i,
  });

  await expect(vertexLabels).toBeVisible();
  await expect(vertexLabels).toBeChecked();
  await expect(edgeLabels).toBeVisible();
  await expect(edgeLabels).toBeChecked();

  await vertexLabels.click();
  await edgeLabels.click();

  await expect(vertexLabels).not.toBeChecked();
  await expect(edgeLabels).not.toBeChecked();
});

test("theme and viewer-only controls keep the canvas central", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /dark mode/i }).click();
  await expect(page.locator("main.app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );

  await page.getByRole("button", { name: /viewer only/i }).click();
  await expect(page.locator("main.app-shell")).toHaveClass(/viewer-only/);
  await expect(page.getByLabel(/viewer controls/i)).toBeHidden();
  await expect(page.getByRole("button", { name: /^show ui$/i })).toBeVisible();

  await page.getByRole("button", { name: /^show ui$/i }).click();
  await expect(page.locator("main.app-shell")).not.toHaveClass(/viewer-only/);
  await expect(page.getByLabel(/viewer controls/i)).toBeVisible();
});

test("keyboard viewer-only toggle restores rail scroll positions", async ({
  page,
}) => {
  await page.goto("/");

  const controlsRail = page.getByLabel(/viewer controls/i);
  const detailsRail = page.getByLabel(/graph details/i);
  const sceneCanvas = page.getByTestId("scene-canvas");
  const fullUiBox = await sceneCanvas.boundingBox();
  expect(fullUiBox?.width ?? 0).toBeGreaterThan(100);
  const before = await Promise.all([
    controlsRail.evaluate((element) => {
      element.scrollTop = Math.min(240, element.scrollHeight);
      return element.scrollTop;
    }),
    detailsRail.evaluate((element) => {
      element.scrollTop = Math.min(320, element.scrollHeight);
      return element.scrollTop;
    }),
  ]);

  await page.keyboard.press("u");
  await expect(page.locator("main.app-shell")).toHaveClass(/viewer-only/);
  await expect
    .poll(async () => (await sceneCanvas.boundingBox())?.width ?? 0)
    .toBeGreaterThan((fullUiBox?.width ?? 0) + 100);
  await page.keyboard.press("u");
  await expect(page.locator("main.app-shell")).not.toHaveClass(/viewer-only/);
  await expect
    .poll(async () =>
      Math.abs(
        ((await sceneCanvas.boundingBox())?.width ?? 0) -
          (fullUiBox?.width ?? 0),
      ),
    )
    .toBeLessThanOrEqual(2);

  await expect
    .poll(async () =>
      Promise.all([
        controlsRail.evaluate((element) => element.scrollTop),
        detailsRail.evaluate((element) => element.scrollTop),
      ]),
    )
    .toEqual(before);
});

test("keyboard shortcuts toggle labels without using form focus", async ({
  page,
}) => {
  await page.goto("/");

  const vertexLabels = page.getByRole("checkbox", {
    name: /group-element labels/i,
  });
  const edgeLabels = page
    .getByRole("checkbox", {
      name: /generator labels on edges/i,
    })
    .first();

  await expect(vertexLabels).toBeChecked();
  await page.keyboard.press("l");
  await expect(vertexLabels).not.toBeChecked();

  const edgeLabelsInitiallyChecked = await edgeLabels.isChecked();
  await page.keyboard.press("e");
  await expect(edgeLabels).toBeChecked({ checked: edgeLabelsInitiallyChecked });
  await page.keyboard.press("Shift+E");
  await expect(edgeLabels).toBeChecked({
    checked: !edgeLabelsInitiallyChecked,
  });
});

test("local link and focus controls are exposed", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("group", { name: /reader focus presets/i })
    .getByRole("button", { name: /local link/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /local link/i }),
  ).toBeVisible();
  await expect(page.getByText(/spherical simplices/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /focus selected node/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /root view at selected node/i }),
  ).toBeVisible();
});

test("on-graph view exposes a local neighborhood around the selected node", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const onGraph = page.getByTestId("view-on-graph");
  await expect(onGraph).toBeVisible();
  await onGraph.click();

  await expect(onGraph).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await sceneStats(page)).mode).toBe("on-graph");
  await expect(page.getByLabel(/local depth/i)).toBeVisible();
  await expect(page.locator(".current-model-badge")).toContainText(/Davis/i);
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute(
    "data-cell-render-mode",
    "in-graph",
  );
});

test("compact 5-cube defaults to a decluttered local chamber view", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel(/example/i).selectOption("compact_5_cube_gamma1");
  await expect.poll(async () => (await sceneStats(page)).mode).toBe("on-graph");
  await switchToResearchMode(page);
  await expect(
    page.getByRole("button", { name: /look near a chamber/i }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: /label scope/i })
      .getByRole("button", { name: /focused/i }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText(/look near a chamber neighborhood/i),
  ).toBeVisible();
  await expect(page.getByLabel(/far shells/i)).toHaveValue("hide-far");
  await expect(page.getByLabel(/cell drawing/i)).toHaveValue("in-graph");
});

test("generator stepping updates the selected word breadcrumb", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByRole("button", { name: /look near a chamber/i }).click();

  await page
    .getByLabel(/step by generator/i)
    .getByRole("button", { name: /^s0$/ })
    .click();
  await expect(page.getByLabel(/selected word breadcrumb/i)).toContainText(
    /e\s*\/\s*s0/i,
  );
  await expect(page.getByText(/selected chamber w:0/i)).toBeVisible();
});

test("local-link chord focuses a rank-two relation", async ({ page }) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByLabel(/example/i).selectOption("A2");
  await page.getByRole("button", { name: /look near a chamber/i }).click();
  await page.getByLabel(/local depth/i).selectOption("3");
  await page.getByLabel(/far shells/i).selectOption("fade-far");

  const pairFilters = page.getByRole("group", {
    name: /local link pair filters/i,
  });
  await pairFilters
    .getByRole("button", { name: /focus s0-s1 rank-two cells/i })
    .click();

  await expect(page.getByLabel(/cell focus/i)).toHaveValue("selected-cell");
  await expect(page.getByLabel("Neighborhood", { exact: true })).toHaveValue(
    "cell-boundary",
  );
  const relationPanel = page.getByLabel(/graph details/i);
  await expect(relationPanel.getByText(/pair s0-s1 has m=3/i)).toBeVisible();
  await expect(relationPanel.getByText(/hexagon/i).first()).toBeVisible();
});

test("rank-two cell focus uses graph-bounded cells and selected pair filtering", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByLabel(/example/i).selectOption("A2");
  await page
    .getByRole("group", { name: /view presets/i })
    .getByRole("button", { name: /rank-two cells/i })
    .click();

  await expect(page.getByLabel(/cell drawing/i)).toHaveValue("in-graph");
  await expect(page.getByLabel(/cell focus/i)).toHaveValue("selected-pair");
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute(
    "data-cell-render-mode",
    "in-graph",
  );

  await page
    .getByLabel(/coxeter pair matrix/i)
    .getByRole("button", { name: /s0-s1/i })
    .click();
  await expect(page.getByLabel(/cell focus/i)).toHaveValue("selected-cell");
  await expect(page.getByLabel("Neighborhood", { exact: true })).toHaveValue(
    "cell-boundary",
  );
  await expect(page.getByTestId("rank-two-cell-count")).toBeVisible();
});

test("opens the one-vertex Y_Gamma base complex for game access", async ({
  page,
}) => {
  await page.goto("/");
  await switchModel(page, /^Y_Gamma$/);

  await expect(page.getByText(/Y_Gamma/i).first()).toBeVisible();
  await expect(page.getByTestId("scene-canvas")).toBeVisible();
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute(
    "data-cell-render-mode",
    "in-graph",
  );
  await expect(
    page.getByText(/Y_Gamma fundamental-domain cell complex/i).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/oriented generator arrows/i).first(),
  ).toBeVisible();
  await expect
    .poll(async () => (await sceneStats(page)).renderedCells ?? 0)
    .toBeGreaterThan(0);
  await page
    .getByRole("group", { name: /interface mode/i })
    .getByRole("button", { name: /research/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /Y_Gamma Cell Inventory/i }),
  ).toBeVisible();
  await expect(page.getByText(/not distinct affine vertices/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Quotient \+ Games/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/quotient complex: no torsion-free/i),
  ).toBeVisible();
  await expect(page.getByText(/Boundary checks/i).first()).toBeVisible();
});

test("compact 5-cube Y_Gamma labels every visible semantic edge", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await page.getByLabel(/example/i).selectOption("compact_5_cube_gamma1");
  await switchModel(page, /^Y_Gamma$/);

  const yGammaReader = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /Y_Gamma Reader/i }),
  });
  const drawingGroup = yGammaReader.getByRole("group", {
    name: /Y_Gamma separate cells for reading/i,
  });
  await expect(drawingGroup).toBeVisible();
  await drawingGroup.getByRole("button", { name: /^Expanded$/ }).click();
  await expect(
    drawingGroup.getByRole("button", { name: /^Expanded$/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await drawingGroup.getByRole("button", { name: /^Coherent$/ }).click();
  await expect(
    drawingGroup.getByRole("button", { name: /^Coherent$/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await drawingGroup.getByRole("button", { name: /^Expanded$/ }).click();

  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return stats.renderedEdgeSegments && stats.renderedEdgeLabels
        ? stats.renderedEdgeLabels === stats.renderedEdgeSegments
        : false;
    })
    .toBe(true);
  await expect
    .poll(async () => (await sceneStats(page)).renderedLabelLeaders ?? 0)
    .toBeGreaterThan(0);
  const yGammaReaderControls = page.getByTestId("ygamma-reader");
  await yGammaReaderControls
    .getByTestId("ygamma-advanced-readability")
    .locator("summary")
    .click();
  await yGammaReaderControls
    .getByRole("button", { name: /extract relation star/i })
    .click();
  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return Math.min(
        stats.renderedCells ?? 0,
        stats.renderedEdgeLabels ?? 0,
        stats.renderedLabelLeaders ?? 0,
      );
    })
    .toBeGreaterThan(0);
  await expect(
    yGammaReaderControls.getByRole("button", {
      name: /extract relation star/i,
    }),
  ).toHaveAttribute("aria-pressed", "true");

  await yGammaReaderControls
    .getByRole("button", { name: /compare shared vs separated drawing/i })
    .click();
  const comparisonLeft = page.getByTestId("ygamma-comparison-left");
  const comparisonRight = page.getByTestId("ygamma-comparison-right");
  await expect(comparisonLeft).toBeVisible();
  await expect(comparisonRight).toBeVisible();
  const comparisonScene = page.getByTestId("ygamma-comparison-scene");
  await expect(comparisonScene.locator("canvas")).toHaveCount(1);
  await expect
    .poll(async () => {
      const box = await comparisonScene.locator(".scene-shell").boundingBox();
      return box?.height ?? 0;
    })
    .toBeGreaterThan(360);

  const readerControls = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /start here/i }),
  });

  await readerControls.getByRole("button", { name: "See all" }).click();
  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return stats.renderedEdgeSegments && stats.renderedEdgeLabels
        ? stats.renderedEdgeLabels === stats.renderedEdgeSegments
        : false;
    })
    .toBe(true);

  await readerControls
    .getByRole("group", { name: /reader focus presets/i })
    .getByRole("button", { name: /^Read one relation$/ })
    .click();
  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return stats.renderedEdgeSegments && stats.renderedEdgeLabels
        ? stats.renderedEdgeLabels === stats.renderedEdgeSegments
        : false;
    })
    .toBe(true);
});

test("Y_Gamma game workflows expose cochain and JNW state tools", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("group", { name: /choose mathematical view/i })
    .first()
    .getByRole("button", { name: /^Y_Gamma$/ })
    .click();
  await switchToResearchMode(page);

  const gamePanel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /quotient \+ games/i }),
  });
  await expect(
    gamePanel.getByLabel(/generator-uniform cochain editor/i),
  ).toBeVisible();

  await gamePanel.getByLabel(/value for s0/i).fill("1");
  await gamePanel.getByLabel(/value for s1/i).fill("-1");
  await expect(gamePanel.getByText(/cocycle passed/i)).toBeVisible();

  await gamePanel.getByLabel(/value for s1/i).fill("0");
  await expect(gamePanel.getByText(/failed rank-two boundary/i)).toBeVisible();
  await gamePanel
    .getByRole("button", { name: /focus cell/i })
    .first()
    .click();
  await expect
    .poll(async () => (await sceneStats(page)).renderedCells ?? 0)
    .toBeGreaterThan(0);

  await gamePanel
    .getByRole("button", { name: /JNW Legal-System Game/i })
    .click();
  await expect(
    gamePanel.getByLabel(/JNW legal-system game editor/i),
  ).toBeVisible();
  await expect(
    gamePanel.getByText(/Experimental non-JNW|Failed checks/i),
  ).toBeVisible();
  await gamePanel
    .getByRole("button", { name: /show state-orbit model/i })
    .click();
  await expect
    .poll(async () => (await sceneStats(page)).renderedNodes ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).renderedNodeLabels ?? 0)
    .toBeGreaterThan(0);
});

test("opens the Coxeter defining graph Gamma as a third source view", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel(/example/i).selectOption("A3");
  await page
    .getByRole("group", { name: /choose mathematical view/i })
    .first()
    .getByRole("button", { name: /^Defining graph Gamma$/ })
    .click();

  await expect(
    page.getByRole("group", { name: /choose mathematical view/i }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: /choose mathematical view/i })
      .first()
      .getByRole("button", { name: /^Defining graph Gamma$/, pressed: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /coxeter defining graph/i }),
  ).toBeVisible();
  const gammaPanel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /coxeter defining graph/i }),
  });
  await expect(
    gammaPanel.getByText(/finite relation edge/i).first(),
  ).toBeVisible();
  await expect(gammaPanel.getByText(/m=inf are omitted/i)).toBeVisible();
  await expect(gammaPanel.getByText(/m=2 commuting edges/i)).toBeVisible();
  await expect(gammaPanel.getByText(/k\(Gamma\)/i)).toBeVisible();
  await expect(gammaPanel.getByText(/0\.25 = 1 - 3\/2 \+ 3\/4/i)).toBeVisible();
  await expect(gammaPanel.getByText(/m=2 \(/i)).toBeVisible();
  const relationComponents = gammaPanel.getByLabel(
    /Relation-order connected components/i,
  );
  await expect(relationComponents).toBeVisible();
  await expect(
    relationComponents.getByLabel(/m=2 connected components/i),
  ).toContainText(/s0.*s2/i);
  await expect(
    relationComponents
      .locator("p.gamma-isolated-generators")
      .filter({ hasText: "Gamma_2" }),
  ).toContainText(/s1/i);
  await expect(
    gammaPanel.getByLabel(/Gamma relation color legend/i),
  ).toBeVisible();
  await expect(
    gammaPanel.getByRole("group", { name: /Gamma drawing mode/i }),
  ).toBeVisible();
  await gammaPanel.getByRole("button", { name: /2D planar/i }).click();
  await expect(
    gammaPanel.getByRole("button", { name: /2D planar/, pressed: true }),
  ).toBeVisible();
  await expect(gammaPanel.getByText(/planar mode places/i)).toBeVisible();
});

test("compact 5-cube Gamma labels every defining edge", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto("/");
  await page.getByLabel(/example/i).selectOption("compact_5_cube_gamma1");
  await page
    .getByRole("group", { name: /choose mathematical view/i })
    .first()
    .getByRole("button", { name: /^Defining graph Gamma$/ })
    .click();

  await expect(
    page.getByRole("heading", { name: /coxeter defining graph/i }),
  ).toBeVisible();
  const gammaPanel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /coxeter defining graph/i }),
  });
  await gammaPanel.getByLabel(/Inspect Gamma generator/i).selectOption("0");
  const g0Partition = gammaPanel.getByLabel(
    /Incident relation partition for g0/i,
  );
  await expect(g0Partition).toBeVisible();
  await expect(g0Partition.getByText(/finite degree 8/i)).toBeVisible();
  await expect(g0Partition.getByText(/m=2/i).first()).toBeVisible();
  await expect(g0Partition.getByText(/6 neighbors/i)).toBeVisible();
  await expect(g0Partition.getByText(/m=3/i).first()).toBeVisible();
  await expect(g0Partition.getByText(/2 neighbors/i)).toBeVisible();
  await expect(g0Partition.getByText(/m=inf/i).first()).toBeVisible();
  await expect(
    g0Partition.getByText(
      /all 9 other generators are accounted for exactly once/i,
    ),
  ).toBeVisible();
  const orderThreeComponents = gammaPanel.getByLabel(
    /m=3 connected components/i,
  );
  await expect(orderThreeComponents).toContainText(
    /2 edge-bearing components/i,
  );
  await expect(orderThreeComponents).toContainText(
    /g0.*g1.*g2.*g3.*g4.*g5.*g6.*g7/i,
  );
  await expect(orderThreeComponents).toContainText(/g8.*g9/i);
  await g0Partition.getByRole("button", { name: "g8" }).click();
  await expect(
    gammaPanel.getByLabel(/Incident relation partition for g8/i),
  ).toBeVisible();
  await gammaPanel.getByRole("button", { name: /2D planar/i }).click();
  await expect(gammaPanel.getByText(/K5 obstruction/i)).toBeVisible();
  await expect(gammaPanel.getByText(/not planar/i)).toBeVisible();
  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return [stats.renderedEdgeSegments ?? 0, stats.renderedEdgeLabels ?? 0];
    })
    .toEqual([40, 40]);
  await expect
    .poll(async () => (await sceneStats(page)).renderedLabelLeaders ?? 0)
    .toBeGreaterThan(35);
});

test("research workflow loads the I2(5) quotient/game demo", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const workflow = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /research workflow/i }),
  });
  await expect(
    page.getByRole("heading", { name: /research workflow/i }),
  ).toBeVisible();
  await workflow.getByRole("button", { name: /^3Quotient$/ }).click();
  await workflow.getByRole("button", { name: /load demo quotient/i }).click();

  await expect(
    page.getByText(/I2\(5\) quotient \(identity subgroup\)/),
  ).toBeVisible();
  await expect(page.getByText(/cocycle i2-5-height-cocycle/i)).toBeVisible();
  await expect(
    page.getByText(/1\/1 rank-two boundary checks passed/i),
  ).toBeVisible();

  await workflow.getByRole("button", { name: /ascending link/i }).click();
  await expect(page.getByText(/ascending/i).first()).toBeVisible();
  await expect
    .poll(async () => (await sceneStats(page)).renderedEdgeSegments ?? 0)
    .toBeGreaterThan(0);

  const download = page.waitForEvent("download");
  await workflow
    .getByRole("button", { name: /export reproducible bundle/i })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.coxeter-experiment\.json$/);
});

test("research workflow opens the JNW cube legal-system demo", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const workflow = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /research workflow/i }),
  });
  await workflow.getByRole("button", { name: /load jnw cube game/i }).click();

  await expect(page.getByText(/JNW cube graph RACG/i).first()).toBeVisible();
  await expect(
    page.getByText(/JNW faithful; 4\/4 legal/i).first(),
  ).toBeVisible();
  await expect(page.getByLabel(/current model/i)).toContainText(
    /JNW move-kernel cover \/ in-repo diagnostic/i,
  );
  await expect(page.getByLabel(/Where am I in JNW/i)).toContainText(
    /Coxeter system Gamma.*Y_Gamma fundamental domain.*JNW move-kernel cover/i,
  );
  const gamePanel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /quotient \+ games/i }),
  });
  await expect(
    gamePanel.getByRole("button", {
      name: /Ascending link at selected state/i,
    }),
  ).toBeVisible();
  await expect(page.getByLabel(/JNW workflow path/i)).toBeVisible();
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toBeVisible();
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toContainText(
    /S_\d = \{v/i,
  );
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toContainText(
    /\{v000, v010, v110, v111\}/,
  );
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toContainText(
    /Four lifts over Y_Gamma; 16 geometric rails and 12 square cells/i,
  );
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toContainText(
    /256 vertices; not the compact cover shown here/i,
  );
  await expect(
    gamePanel.getByText(/JNW cube bipartition\/color-class preset/i),
  ).toBeVisible();
  await expect(gamePanel.getByLabel(/JNW quotient reader/i)).toBeVisible();
  await gamePanel.getByText(/Drawing details/i).click();
  await expect(
    gamePanel.getByText(/Build quotient in stages 4/i),
  ).toBeVisible();
  await expect(
    gamePanel.getByRole("button", { name: /Glass faces/i }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    gamePanel.getByLabel(/Gamma vertices highlighted for S_/i),
  ).toBeVisible();
  await expect
    .poll(async () => (await sceneStats(page)).renderedCells ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).renderedNodeLabels ?? 0)
    .toBeGreaterThanOrEqual(4);
  const statePicker = gamePanel.getByLabel(/Choose JNW state/i);
  await expect(statePicker).toBeVisible();
  await statePicker.getByRole("button", { name: "S_2" }).click();
  await expect(gamePanel.getByLabel(/Current JNW setup/i)).toContainText(
    /S_2 = \{/,
  );
  await gamePanel
    .getByRole("button", { name: /Mirror selected state on Gamma/i })
    .click();
  await expect(page.getByLabel(/current model/i)).toContainText(/Gamma/i);
  await expect(
    page.getByText(/S_2 is highlighted on Gamma/i).first(),
  ).toBeVisible();
  const gammaPanel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /coxeter defining graph/i }),
  });
  await expect(
    gammaPanel.locator("tr").filter({ hasText: "State vertices" }),
  ).toContainText(/v[01]{3}/);
  await expect(
    gammaPanel.getByText(/colored generator vertices/i),
  ).toBeVisible();
  await expect
    .poll(
      async () => (await sceneStats(page)).stateNodeHighlights?.inState ?? 0,
    )
    .toBeGreaterThan(0);
  await expect
    .poll(
      async () => (await sceneStats(page)).stateNodeHighlights?.outOfState ?? 0,
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await sceneStats(page)).renderedNodeLabels ?? 0)
    .toBeGreaterThanOrEqual(4);
  await gamePanel
    .getByRole("button", { name: /Descending link at selected state/i })
    .click();
  await expect(page.getByLabel(/current model/i)).toContainText(
    /JNW move-kernel cover/i,
  );
  await expect(
    page.getByText(
      /This link is inspected at a selected state vertex.*move-kernel cover/i,
    ),
  ).toBeVisible();
  const relationSelect = gamePanel.getByLabel(/Choose relation/i);
  await expect(relationSelect).toBeVisible();
  await relationSelect.selectOption({ index: 1 });
  await expect(
    gamePanel.getByText(/Selected relation boundary/i),
  ).toBeVisible();
  await gamePanel
    .getByRole("button", { name: /Next relation/i })
    .first()
    .click();
  await expect(
    gamePanel.getByText(/Selected relation boundary/i),
  ).toBeVisible();
  await gamePanel
    .getByRole("button", { name: /Focus selected relation/i })
    .click();
  await expect(
    gamePanel.getByText(/Selected relation boundary/i),
  ).toBeVisible();
  await gamePanel
    .getByRole("button", { name: /Compare source chart with state link/i })
    .click();
  await expect(
    page.getByLabel(/Y_Gamma and JNW state-link comparison/i),
  ).toContainText(/Each quotient state carries the same local generator data/i);
  await expect
    .poll(async () => (await sceneStats(page)).renderedEdgeSegments ?? 0)
    .toBeGreaterThan(0);
});

test("research workflow rank-three lens opens the A3 Y_Gamma focus", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const workflow = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: /research workflow/i }),
  });
  await workflow.getByRole("button", { name: /rank-three cell/i }).click();

  await expect(page.getByText(/Y_Gamma\(A3\)/).first()).toBeVisible();
  await expect(page.getByText(/rank-three/i).first()).toBeVisible();
  await expect
    .poll(async () => (await sceneStats(page)).renderedCells ?? 0)
    .toBeGreaterThan(0);
});

test("experiment log saves and exports deterministic bundles", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByRole("button", { name: /look near a chamber/i }).click();
  await page.getByLabel(/note/i).fill("checking lifted local cell panels");
  await page.getByRole("button", { name: /save run/i }).click();
  await expect(page.getByText(/1 saved run in this browser/i)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /export experiment/i }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.coxeter-experiment\.json$/);
  const path = await file.path();
  expect(path).toBeTruthy();
  const payload = JSON.parse(readFileSync(path ?? "", "utf8"));
  expect(payload).toMatchObject({
    schemaVersion: 1,
    summary: { runCount: 1 },
  });
});

test("view presets update the storytelling panel", async ({ page }) => {
  await page.goto("/");
  await switchToResearchMode(page);

  await expect(
    page.getByRole("heading", { name: /what am i seeing/i }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: /view presets/i })
    .getByRole("button", { name: /see all/i })
    .click();
  await expect(page.getByText(/finite-radius cayley ball/i)).toBeVisible();
  await page
    .getByRole("group", { name: /view presets/i })
    .getByRole("button", { name: /rank-two cells/i })
    .click();
  await expect(page.getByText(/exact rank-two davis cells/i)).toBeVisible();
  await page.getByLabel(/example/i).selectOption("hyperbolic_toy_rank2");
  await page
    .getByRole("group", { name: /view presets/i })
    .getByRole("button", { name: /projection drawing/i })
    .click();
  await expect(page.getByText(/geometric mode/i)).toBeVisible();
});

test("exports local neighborhood and view sidecar metadata", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);
  await page.getByRole("button", { name: /look near a chamber/i }).click();

  const localDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /export local neighborhood/i })
    .click();
  const localFile = await localDownload;
  expect(localFile.suggestedFilename()).toMatch(/local\.json$/);
  const localPath = await localFile.path();
  expect(localPath).toBeTruthy();
  const localText = readFileSync(localPath ?? "", "utf8");
  expect(JSON.parse(localText)).toMatchObject({
    kind: "coxeter-local-neighborhood-view",
    view: { graphView: "on-graph" },
  });

  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page.getByRole("button", { name: /export view bundle/i }).click();
  await expect
    .poll(() => downloads.some((name) => name.endsWith(".view.json")))
    .toBe(true);
});

test("geometric mode reports a disabled warning when the selected example has no geometry", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const geometricMode = await firstPresent([
    page.getByRole("tab", { name: /geometric/i }),
    page.getByRole("radio", { name: /geometric/i }),
    page.getByRole("button", { name: /geometric/i }),
    page.getByTestId("mode-geometric"),
  ]);

  if (!geometricMode) {
    test.skip(true, "Geometric mode control is not implemented yet.");
    return;
  }

  if (await geometricMode.isEnabled()) {
    await geometricMode.click();
  }

  await expect
    .poll(async () =>
      Boolean(
        await firstVisible([
          page
            .getByRole("alert")
            .filter({ hasText: /no geometry|missing geometry|disabled/i }),
          page.getByTestId("geometry-warning"),
          page.getByText(
            /geometric mode.*(disabled|unavailable)|no geometry|missing geometry/i,
          ),
        ]),
      ),
    )
    .toBe(true);
});

test("toy hyperbolic example enables geometric projection mode", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  await page.getByLabel(/example/i).selectOption("hyperbolic_toy_rank2");
  const geometricMode = page.getByTestId("mode-geometric");

  await expect(geometricMode).toBeEnabled();
  await page.getByLabel(/projection/i).selectOption("poincare-pca");
  await geometricMode.click();
  await expect(geometricMode).toHaveAttribute("aria-pressed", "true");
  await page.locator("details.caveats-drawer summary").click();
  await expect(
    page
      .getByText(/This 3D view is a projection, not exact hyperbolic geometry/i)
      .first(),
  ).toBeVisible();
});

test("invalid JSON import shows a validation error when import UI is exposed", async ({
  page,
}) => {
  await page.goto("/");
  await switchToResearchMode(page);

  const importInput = await firstPresent([
    page.getByTestId("import-json-input"),
    page.getByLabel(/import.*json|load.*json|example json/i),
  ]);

  if (!importInput) {
    test.skip(true, "JSON import input is not implemented yet.");
    return;
  }

  await importInput.setInputFiles({
    name: "invalid-coxeter-system.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not valid json"),
  });

  await expect
    .poll(async () =>
      Boolean(
        await firstVisible([
          page
            .getByRole("alert")
            .filter({ hasText: /invalid json|parse|validation|schema/i }),
          page.getByTestId("import-error"),
          page.getByText(/invalid json|parse error|validation error|schema/i),
        ]),
      ),
    )
    .toBe(true);
});

test("large quotient import validates progressively and enables dense renderer paths", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await switchToResearchMode(page);

  const input = page.getByTestId("import-quotient-input");
  await input.setInputFiles({
    name: "large-progressive-quotient.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(largeRankOneQuotient())),
  });

  const progress = page.getByTestId("quotient-import-progress");
  await expect(progress).toContainText(/parsed and validated/i, {
    timeout: 60_000,
  });
  await expect(progress).toContainText(/3,000 vertices.*3,000 edges/i);
  await expect(
    page.getByText(/Large progressive quotient fixture/).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Whole ball$/ }).click();
  await page
    .getByRole("group", { name: /^Label scope$/ })
    .getByRole("button", { name: /^budgeted$/ })
    .click();
  await expect
    .poll(async () => (await sceneStats(page)).renderedNodes ?? 0, {
      timeout: 30_000,
    })
    .toBe(3_000);
  await expect
    .poll(async () => {
      const stats = await sceneStats(page);
      return {
        renderer: stats.labelRenderer,
        reason: stats.labelRendererFallbackReason,
      };
    })
    .toEqual({ renderer: "sdf-batch", reason: undefined });

  const scene = page.getByTestId("scene-canvas");
  const box = await scene.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await expect
    .poll(async () => (await sceneStats(page)).pickingStrategy)
    .toBe("gpu");
});
