import { describe, expect, it } from "vitest";
import { toParsedDraft } from "./extract";

describe("portfolio/extract", () => {
  it("leaves imported cost basis unset so portfolio risk is recomputed from legs", () => {
    const draft = toParsedDraft({
      ticker: "aapl",
      description: "AAPL call spread",
      cost_basis: 9999,
      legs: [
        {
          side: "long",
          option_type: "call",
          strike: 100,
          quantity: 1,
          entry_premium: 5,
          expiration_date: "2026-06-19",
        },
        {
          side: "short",
          option_type: "call",
          strike: 110,
          quantity: 1,
          entry_premium: 2,
          expiration_date: "2026-06-19",
        },
      ],
    });

    expect(draft.ticker).toBe("AAPL");
    expect(draft.strategy).toBe("call-spread");
    expect(draft.cost_basis).toBeNull();
  });
});
