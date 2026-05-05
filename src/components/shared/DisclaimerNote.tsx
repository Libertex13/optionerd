import Link from "next/link";

type Variant = "calculator" | "portfolio" | "scenario";

const COPY: Record<Variant, string> = {
  calculator:
    "Calculations are theoretical projections from standard pricing models (Black-Scholes), not predictions. Real fills, slippage, dividends, and volatility shifts will cause outcomes to differ. Not investment advice.",
  portfolio:
    "Portfolio data is sourced via a read-only brokerage connection and is based on delayed market quotes. optionerd does not place orders or modify positions. Analytics are informational, not investment advice.",
  scenario:
    "Scenarios are illustrative model output, not forecasts or recommendations. Past performance does not guarantee future results.",
};

export function DisclaimerNote({
  variant = "calculator",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[10px] leading-relaxed text-muted-foreground ${className}`}
    >
      {COPY[variant]}{" "}
      <Link
        href="/disclaimer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Full disclaimer.
      </Link>
    </p>
  );
}
