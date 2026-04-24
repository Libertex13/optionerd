import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MixedExpiryScenarioPanel } from "./MixedExpiryScenarioPanel";
import type { OptionLeg } from "@/types/options";

describe("calculator/MixedExpiryScenarioPanel", () => {
  it("renders one scenario card per expiry with the scenario path header", () => {
    const optionLegs: OptionLeg[] = [
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

    const markup = renderToStaticMarkup(
      <MixedExpiryScenarioPanel
        optionLegs={optionLegs}
        stockLeg={null}
        expiryInfo={[
          { expirationDate: "2026-05-15", daysToExpiry: 21 },
          { expirationDate: "2026-06-19", daysToExpiry: 56 },
        ]}
        currentPrice={102}
      />,
    );

    expect(markup).toContain("Scenario Path");
    expect(markup).toContain("Decision point");
    expect(markup).toContain("Final expiry");
    expect(markup.match(/data-testid="mixed-expiry-step"/g)).toHaveLength(2);
  });
});
