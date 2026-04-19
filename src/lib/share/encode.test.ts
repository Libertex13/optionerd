import { describe, it, expect } from "vitest";
import { encodeStrategy, decodeStrategy, type SharedStrategy } from "./encode";

const sample: SharedStrategy = {
  ticker: "AAPL",
  underlyingPrice: 175.32,
  legs: [
    {
      option_type: "call",
      position_type: "long",
      strike_price: 175,
      premium: 3.2,
      quantity: 1,
      expiration_date: "2026-05-15",
      implied_volatility: 0.285,
    },
    {
      option_type: "call",
      position_type: "short",
      strike_price: 185,
      premium: 1.1,
      quantity: 1,
      expiration_date: "2026-05-15",
      implied_volatility: 0.271,
    },
  ],
  stockLeg: null,
};

describe("encodeStrategy / decodeStrategy", () => {
  it("roundtrips a multi-leg strategy", () => {
    const encoded = encodeStrategy(sample);
    const decoded = decodeStrategy(encoded);
    expect(decoded).toEqual(sample);
  });

  it("roundtrips a strategy with a stock leg", () => {
    const withStock: SharedStrategy = {
      ...sample,
      stockLeg: { position_type: "long", quantity: 100, entry_price: 175.32 },
    };
    const decoded = decodeStrategy(encodeStrategy(withStock));
    expect(decoded).toEqual(withStock);
  });

  it("produces URL-safe base64 (no +, /, =)", () => {
    const encoded = encodeStrategy(sample);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null for malformed input", () => {
    expect(decodeStrategy("not-base64!!")).toBeNull();
    expect(decodeStrategy("")).toBeNull();
  });

  it("returns null when schema version is unknown", () => {
    const fake = Buffer.from(JSON.stringify({ v: 99, t: "AAPL" })).toString(
      "base64url",
    );
    expect(decodeStrategy(fake)).toBeNull();
  });

  it("rejects payloads with invalid expiration format", () => {
    const bad = Buffer.from(
      JSON.stringify({
        v: 1,
        t: "AAPL",
        u: 175,
        l: [
          {
            c: "c",
            s: "l",
            k: 175,
            p: 3,
            q: 1,
            e: "05/15/2026",
            i: 0.3,
          },
        ],
        sl: null,
      }),
    ).toString("base64url");
    expect(decodeStrategy(bad)).toBeNull();
  });
});
