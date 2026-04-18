import type { Metadata } from "next";
import { StrategiesClient } from "./StrategiesClient";

export const metadata: Metadata = {
  title: "Options Strategy Picker — Find the Right Strategy | optionerd",
  description:
    "Pick a market view and find the right options strategy. Browse bullish, bearish, neutral, and volatility strategies with payoff diagrams, complexity ratings, and one-click calculator links.",
  openGraph: {
    title: "Options Strategy Picker — Find the Right Strategy | optionerd",
    description:
      "Pick a market view and find the right options strategy. Browse bullish, bearish, neutral, and volatility strategies with payoff diagrams.",
    type: "website",
  },
};

export default function StrategiesPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6">
      <StrategiesClient />
    </div>
  );
}
