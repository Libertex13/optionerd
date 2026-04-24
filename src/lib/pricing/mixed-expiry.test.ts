import { describe, expect, it } from "vitest";
import {
  buildMixedExpiryScenarioSteps,
  defaultMixedExpiryTargets,
} from "./mixed-expiry";
import type { OptionLeg } from "@/types/options";

describe("pricing/mixed-expiry", () => {
  const calendar: OptionLeg[] = [
    {
      optionType: "call",
      positionType: "short",
      strikePrice: 100,
      premium: 4,
      quantity: 1,
      expirationDate: "2026-05-15",
      impliedVolatility: 0.22,
    },
    {
      optionType: "call",
      positionType: "long",
      strikePrice: 100,
      premium: 6,
      quantity: 1,
      expirationDate: "2026-06-19",
      impliedVolatility: 0.24,
    },
  ];

  it("defaults the first mixed-expiry target to the short strike", () => {
    const targets = defaultMixedExpiryTargets(calendar, [
      { expirationDate: "2026-05-15", daysToExpiry: 21 },
      { expirationDate: "2026-06-19", daysToExpiry: 56 },
    ], 102);

    expect(targets["2026-05-15"]).toBe(100);
    expect(targets["2026-06-19"]).toBe(100);
  });

  it("shows front-expiry decay capture and remaining long value for a calendar", () => {
    const steps = buildMixedExpiryScenarioSteps(
      calendar,
      null,
      [
        { expirationDate: "2026-05-15", daysToExpiry: 21 },
        { expirationDate: "2026-06-19", daysToExpiry: 56 },
      ],
      {
        "2026-05-15": 100,
        "2026-06-19": 110,
      },
      new Date("2026-04-24T00:00:00Z"),
      0.04,
    );

    expect(steps[0].expiringLegs[0].status).toBe("Expired worthless, kept premium");
    expect(steps[0].expiringPnl).toBe(400);
    expect(steps[0].remainingMark).toBeGreaterThan(0);
    expect(steps[0].totalIfClosed).toBeGreaterThan(0);

    expect(steps[1].isFinal).toBe(true);
    expect(steps[1].remainingLabel).toBe("No remaining legs");
    expect(steps[1].totalIfClosed).toBeGreaterThan(steps[0].expiringPnl);
  });
});
