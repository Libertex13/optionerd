import type { Metadata } from "next";
import { PortfolioDashboard } from "@/components/portfolio-v2/PortfolioDashboard";

export const metadata: Metadata = {
  title: "Portfolio — optioNerd",
  description:
    "Track your options portfolio with live P/L, Greeks exposure, and scenario stress tests.",
};

export default function PortfolioPage() {
  return <PortfolioDashboard />;
}
