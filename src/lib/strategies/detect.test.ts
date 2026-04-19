import { describe, it, expect } from "vitest";
import { detectStrategySlug } from "./detect";
import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";

const EXP = "2026-05-15";
const EXP2 = "2026-06-19";

function leg(
  overrides: Partial<SavedTradeLeg> & {
    type: "call" | "put";
    side: "long" | "short";
    strike: number;
  },
): SavedTradeLeg {
  return {
    option_type: overrides.type,
    position_type: overrides.side,
    strike_price: overrides.strike,
    premium: overrides.premium ?? 1,
    quantity: overrides.quantity ?? 1,
    expiration_date: overrides.expiration_date ?? EXP,
    implied_volatility: overrides.implied_volatility ?? 0.3,
  };
}

describe("detectStrategySlug — single-leg", () => {
  it("detects long call", () => {
    expect(
      detectStrategySlug([leg({ type: "call", side: "long", strike: 150 })], null),
    ).toBe("long-call");
  });

  it("detects long put", () => {
    expect(
      detectStrategySlug([leg({ type: "put", side: "long", strike: 150 })], null),
    ).toBe("long-put");
  });

  it("returns null for naked short call without stock", () => {
    expect(
      detectStrategySlug([leg({ type: "call", side: "short", strike: 150 })], null),
    ).toBeNull();
  });

  it("returns null for naked short put", () => {
    expect(
      detectStrategySlug([leg({ type: "put", side: "short", strike: 150 })], null),
    ).toBeNull();
  });

  it("returns null for empty legs", () => {
    expect(detectStrategySlug([], null)).toBeNull();
  });
});

describe("detectStrategySlug — covered call", () => {
  const longStock: SavedStockLeg = {
    position_type: "long",
    quantity: 100,
    entry_price: 150,
  };

  it("detects covered call", () => {
    expect(
      detectStrategySlug(
        [leg({ type: "call", side: "short", strike: 155 })],
        longStock,
      ),
    ).toBe("covered-call");
  });

  it("does not call covered call when the short option is a put", () => {
    expect(
      detectStrategySlug(
        [leg({ type: "put", side: "short", strike: 145 })],
        longStock,
      ),
    ).toBeNull();
  });

  it("does not call covered call when stock is short", () => {
    const shortStock: SavedStockLeg = {
      position_type: "short",
      quantity: 100,
      entry_price: 150,
    };
    expect(
      detectStrategySlug(
        [leg({ type: "call", side: "short", strike: 155 })],
        shortStock,
      ),
    ).toBeNull();
  });

  it("does not map multi-leg option positions with stock to any template", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150 }),
          leg({ type: "call", side: "short", strike: 160 }),
        ],
        longStock,
      ),
    ).toBeNull();
  });
});

describe("detectStrategySlug — straddles and strangles", () => {
  it("detects long straddle (same strike, same expiry, long+long)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150 }),
          leg({ type: "put", side: "long", strike: 150 }),
        ],
        null,
      ),
    ).toBe("long-straddle");
  });

  it("detects long strangle (different strikes, long+long)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 155 }),
          leg({ type: "put", side: "long", strike: 145 }),
        ],
        null,
      ),
    ).toBe("long-strangle");
  });

  it("detects short strangle (different strikes, short+short)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "short", strike: 160 }),
          leg({ type: "put", side: "short", strike: 140 }),
        ],
        null,
      ),
    ).toBe("short-strangle");
  });

  it("returns null for short straddle (not in template set)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "short", strike: 150 }),
          leg({ type: "put", side: "short", strike: 150 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null when straddle legs have mismatched quantity", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150, quantity: 1 }),
          leg({ type: "put", side: "long", strike: 150, quantity: 2 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null when 2-leg call+put cross expiries", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150, expiration_date: EXP }),
          leg({ type: "put", side: "long", strike: 150, expiration_date: EXP2 }),
        ],
        null,
      ),
    ).toBeNull();
  });
});

describe("detectStrategySlug — vertical spreads", () => {
  it("detects bull call spread (long low, short high)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150 }),
          leg({ type: "call", side: "short", strike: 160 }),
        ],
        null,
      ),
    ).toBe("bull-call-spread");
  });

  it("detects bear call spread (short low, long high)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "short", strike: 150 }),
          leg({ type: "call", side: "long", strike: 160 }),
        ],
        null,
      ),
    ).toBe("bear-call-spread");
  });

  it("detects bull put spread (short high, long low)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "short", strike: 150 }),
          leg({ type: "put", side: "long", strike: 140 }),
        ],
        null,
      ),
    ).toBe("bull-put-spread");
  });

  it("detects bear put spread (long high, short low)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "long", strike: 155 }),
          leg({ type: "put", side: "short", strike: 145 }),
        ],
        null,
      ),
    ).toBe("bear-put-spread");
  });

  it("returns null for same-side pair (not a vertical)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150 }),
          leg({ type: "call", side: "long", strike: 160 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null when vertical legs have mismatched quantity", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150, quantity: 1 }),
          leg({ type: "call", side: "short", strike: 160, quantity: 2 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null for cross-expiry spread (calendar, not in template set)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 150, expiration_date: EXP }),
          leg({ type: "call", side: "short", strike: 150, expiration_date: EXP2 }),
        ],
        null,
      ),
    ).toBeNull();
  });
});

describe("detectStrategySlug — call butterfly", () => {
  it("detects a balanced long call butterfly", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 145, quantity: 1 }),
          leg({ type: "call", side: "short", strike: 150, quantity: 2 }),
          leg({ type: "call", side: "long", strike: 155, quantity: 1 }),
        ],
        null,
      ),
    ).toBe("call-butterfly");
  });

  it("returns null when wings are asymmetric", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 145, quantity: 1 }),
          leg({ type: "call", side: "short", strike: 150, quantity: 2 }),
          leg({ type: "call", side: "long", strike: 160, quantity: 1 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null when body quantity is not 2x wings", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 145, quantity: 1 }),
          leg({ type: "call", side: "short", strike: 150, quantity: 1 }),
          leg({ type: "call", side: "long", strike: 155, quantity: 1 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null for mixed call/put 3-leg positions", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 145 }),
          leg({ type: "put", side: "short", strike: 150, quantity: 2 }),
          leg({ type: "call", side: "long", strike: 155 }),
        ],
        null,
      ),
    ).toBeNull();
  });
});

describe("detectStrategySlug — iron condor / butterfly", () => {
  it("detects iron condor (gap between short put and short call)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "long", strike: 140 }),
          leg({ type: "put", side: "short", strike: 145 }),
          leg({ type: "call", side: "short", strike: 155 }),
          leg({ type: "call", side: "long", strike: 160 }),
        ],
        null,
      ),
    ).toBe("iron-condor");
  });

  it("detects iron butterfly (short strikes equal)", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "long", strike: 145 }),
          leg({ type: "put", side: "short", strike: 150 }),
          leg({ type: "call", side: "short", strike: 150 }),
          leg({ type: "call", side: "long", strike: 155 }),
        ],
        null,
      ),
    ).toBe("iron-butterfly");
  });

  it("is order-independent", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "call", side: "long", strike: 160 }),
          leg({ type: "put", side: "long", strike: 140 }),
          leg({ type: "call", side: "short", strike: 155 }),
          leg({ type: "put", side: "short", strike: 145 }),
        ],
        null,
      ),
    ).toBe("iron-condor");
  });

  it("returns null when sides don't match iron structure", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "short", strike: 140 }),
          leg({ type: "put", side: "long", strike: 145 }),
          leg({ type: "call", side: "long", strike: 155 }),
          leg({ type: "call", side: "short", strike: 160 }),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("returns null when quantities are unequal", () => {
    expect(
      detectStrategySlug(
        [
          leg({ type: "put", side: "long", strike: 140, quantity: 1 }),
          leg({ type: "put", side: "short", strike: 145, quantity: 2 }),
          leg({ type: "call", side: "short", strike: 155, quantity: 2 }),
          leg({ type: "call", side: "long", strike: 160, quantity: 1 }),
        ],
        null,
      ),
    ).toBeNull();
  });
});
