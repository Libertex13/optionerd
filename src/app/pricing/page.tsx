import type { Metadata } from "next";
import { PricingContent } from "@/components/pricing/PricingContent";

export const metadata: Metadata = {
  title: "Pricing — optioNerd",
  description:
    "Free options calculator with payoff diagrams, Greeks, and P&L analysis. Upgrade to Nerd for brokerage integration, AI portfolio analysis, and unlimited saves.",
};

export default function PricingPage() {
  return <PricingContent />;
}
