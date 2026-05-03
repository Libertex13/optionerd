import type { Metadata } from "next";
import { OptionsCalculator } from "@/components/calculator/OptionsCalculator";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6">
      {/* Hero */}
      <section className="mb-4 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Options Profit Calculator
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Payoff diagrams, Greeks, and P&L analysis. Free, fast, no signup.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[
            { href: "/calculator/long-call", label: "Long Call", mobile: true },
            { href: "/calculator/long-put", label: "Long Put", mobile: true },
            { href: "/calculator/covered-call", label: "Covered Call", mobile: true },
            { href: "/calculator/bull-call-spread", label: "Bull Call Spread", mobile: false },
            { href: "/calculator/iron-condor", label: "Iron Condor", mobile: false },
            { href: "/calculator/long-straddle", label: "Straddle", mobile: false },
            { href: "/calculator/iron-butterfly", label: "Iron Butterfly", mobile: false },
          ].map(({ href, label, mobile }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-sm border border-border px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${
                mobile ? "" : "hidden md:inline-flex"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/strategies"
            className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="md:hidden">More &rarr;</span>
            <span className="hidden md:inline">All strategies &rarr;</span>
          </Link>
        </div>
      </section>

      {/* Calculator */}
      <OptionsCalculator />

      {/* SEO Content */}
      <section className="mx-auto mt-12 max-w-3xl space-y-6 text-sm text-muted-foreground">
        <div>
          <h2 className="mb-2 text-base font-bold text-foreground">
            What is an Options Profit Calculator?
          </h2>
          <p>
            An options profit calculator helps traders visualize the potential profit and loss of
            an options position before entering a trade. By inputting the underlying stock price,
            strike price, premium, and expiration date, you can see a payoff diagram showing your
            P&L at every possible price at expiration.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-base font-bold text-foreground">
            How to Use This Calculator
          </h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <strong>Search for a ticker</strong> — Enter any US stock symbol (e.g., AAPL, TSLA,
              NVDA) to load the options chain.
            </li>
            <li>
              <strong>Select your position</strong> — Choose buy/sell, call/put, expiration date,
              and strike price.
            </li>
            <li>
              <strong>Analyze the results</strong> — View your payoff diagram, Greeks, break-even
              price, and max profit/loss instantly.
            </li>
          </ol>
        </div>
        <div>
          <h2 className="mb-2 text-base font-bold text-foreground">
            Understanding the Greeks
          </h2>
          <p>
            The Greeks measure different dimensions of risk in an options position. Delta tells you
            how much the option price moves per $1 change in the underlying. Gamma measures the
            rate of change of delta. Theta represents time decay — how much value the option loses
            each day. Vega shows sensitivity to changes in implied volatility.
          </p>
        </div>
      </section>
    </div>
  );
}
