import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioContent } from "@/components/portfolio/PortfolioContent";

export const metadata: Metadata = {
  title: "Portfolio — optioNerd",
};

export default function PortfolioPage() {
  return (
    <Suspense fallback={null}>
      <PortfolioContent />
    </Suspense>
  );
}
