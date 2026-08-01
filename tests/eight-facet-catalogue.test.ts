import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  countCertificationBlockedEntries,
  filterTumarkinEightFacetCatalogue,
  representativeTumarkinEightFacetEntries,
  tumarkinEightFacetCatalogue,
  tumarkinEightFacetSourceRef,
} from "../src/catalogue/eightFacet5d";
import { validateCoxeterSystemInput } from "../src/coxeter";

describe("Tumarkin 5D eight-facet catalogue", () => {
  it("records all 16 certified Table 4.10 entries", () => {
    expect(tumarkinEightFacetCatalogue).toHaveLength(16);
    expect(
      new Set(tumarkinEightFacetCatalogue.map((entry) => entry.id)).size,
    ).toBe(16);
    expect(tumarkinEightFacetSourceRef.locator).toContain("Table 4.10");

    for (const [index, entry] of tumarkinEightFacetCatalogue.entries()) {
      expect(entry.dimension).toBe(5);
      expect(entry.facets).toBe(8);
      expect(entry.tableIndex).toBe(index + 1);
      expect(["G11411", "G12221"]).toContain(entry.galeDiagram);
      expect(entry.dataStatus).toBe("certified");
      expect(entry.renderable).toBe(true);
      expect(entry.renderStatus).toBe("renderable-example");
      expect(entry.certificationStatus).toBe("certified");
      expect(entry.exampleFile).toMatch(
        /^tumarkin_5d_8facet_(?:g11411_\d\d|g12221_01)\.json$/,
      );
      expect(entry.requiredForCertification).toHaveLength(0);
    }
    expect(
      tumarkinEightFacetCatalogue.filter(
        (entry) => entry.galeDiagram === "G11411",
      ),
    ).toHaveLength(15);
    expect(
      tumarkinEightFacetCatalogue
        .filter((entry) => entry.galeDiagram === "G12221")
        .map((entry) => entry.tableIndex),
    ).toEqual([16]);
  });

  it("keeps only a small representative set in the main gallery", () => {
    expect(
      representativeTumarkinEightFacetEntries().map(
        (entry) => entry.tableIndex,
      ),
    ).toEqual([1, 8, 15]);
    expect(countCertificationBlockedEntries()).toBe(0);
  });

  it("filters by table index, representative status, and uncertified status", () => {
    expect(
      filterTumarkinEightFacetCatalogue({ query: "08", filter: "all" }).map(
        (entry) => entry.tableIndex,
      ),
    ).toEqual([8]);
    expect(
      filterTumarkinEightFacetCatalogue({
        query: "G12221",
        filter: "all",
      }).map((entry) => entry.tableIndex),
    ).toEqual([16]);
    expect(
      filterTumarkinEightFacetCatalogue({
        query: "",
        filter: "representative",
      }),
    ).toHaveLength(3);
    expect(
      filterTumarkinEightFacetCatalogue({
        query: "certified",
        filter: "blocked",
      }),
    ).toHaveLength(0);
  });

  it("points every catalogue entry at a valid certified Coxeter-system example", () => {
    for (const entry of tumarkinEightFacetCatalogue) {
      expect(entry.exampleFile).toBeDefined();
      const example = JSON.parse(
        readFileSync(
          resolve("public/examples", entry.exampleFile ?? ""),
          "utf-8",
        ),
      );
      expect(validateCoxeterSystemInput(example).ok).toBe(true);
      expect(example.rank).toBe(8);
      expect(example.dataStatus).toBe("certified");
      expect(example.certificate?.status).toBe("passed");
      expect(example.certificate?.scopes).toContain("source-transcription");
      expect(example.certificate?.scopes).toContain("gram-signature");
      if (entry.galeDiagram === "G12221") {
        const dotted = example.certificate?.diagnostics?.dottedWeights;
        expect(dotted).toHaveLength(1);
        expect(dotted[0].minimalPolynomial).toEqual([4, 0, -6, 0, 1]);
        expect(example.certificate?.diagnostics?.signature).toEqual({
          positive: 5,
          negative: 1,
          zero: 2,
        });
      }
    }
  });
});
