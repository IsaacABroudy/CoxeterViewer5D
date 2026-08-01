import { describe, expect, it } from "vitest";

import quotientFixture from "../src/examples/I2_5_identity_quotient.json";
import {
  createQuotientValidationClient,
  type QuotientImportProgressSnapshot,
} from "../src/app/quotientValidationClient";
import { QuotientValidationCancelledError } from "../src/quotient";

describe("quotient validation client", () => {
  it("validates transferred file data progressively without React state", async () => {
    const client = createQuotientValidationClient({
      canUseWorker: false,
      chunkSize: 1,
    });
    const snapshots: QuotientImportProgressSnapshot[] = [];
    const unsubscribe = client.subscribe(() => {
      snapshots.push(client.getSnapshot());
    });

    const result = await client.validateFile(
      new File([JSON.stringify(quotientFixture)], "i2-5-quotient.json", {
        type: "application/json",
      }),
    );

    expect(result.quotient.name).toBe(quotientFixture.name);
    expect(snapshots.some((snapshot) => snapshot.stage === "parsing")).toBe(
      true,
    );
    expect(snapshots.some((snapshot) => snapshot.stage === "validating")).toBe(
      true,
    );
    expect(client.getSnapshot()).toMatchObject({
      stage: "complete",
      progress: 1,
    });
    unsubscribe();
    client.dispose();
  });

  it("cancels stale file reads when a newer import starts", async () => {
    const client = createQuotientValidationClient({ canUseWorker: false });
    const first = client.validateFile(
      new File([JSON.stringify(quotientFixture)], "first.json"),
    );
    const second = client.validateFile(
      new File([JSON.stringify(quotientFixture)], "second.json"),
    );

    await expect(first).rejects.toBeInstanceOf(
      QuotientValidationCancelledError,
    );
    await expect(second).resolves.toMatchObject({
      quotient: { name: quotientFixture.name },
    });
    client.dispose();
  });
});
