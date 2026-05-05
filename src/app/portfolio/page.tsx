import type { Metadata } from "next";
import { PortfolioDashboard } from "@/components/portfolio-v2/PortfolioDashboard";
import { DisclaimerNote } from "@/components/shared/DisclaimerNote";

export const metadata: Metadata = {
  title: "Portfolio — optioNerd",
  description:
    "Track your options portfolio with live P/L, Greeks exposure, and scenario stress tests.",
};

export default function PortfolioPage() {
  return (
    <>
      <PortfolioDashboard />
      <div className="mx-auto max-w-7xl px-3 pb-6">
        <DisclaimerNote variant="portfolio" />
      </div>
    </>
  );
}
