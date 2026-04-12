import { OptionsCalculator } from "@/components/calculator/OptionsCalculator";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Free Options Profit Calculator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Calculate options P&L, visualize payoff diagrams, and analyze Greeks — all for free.
          Built by an options trader, for options traders.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            href="/calculator/long-call"
            className="rounded-full border border-border px-4 py-2 hover:bg-accent transition-colors"
          >
            Long Call Calculator
          </Link>
          <Link
            href="/calculator/long-put"
            className="rounded-full border border-border px-4 py-2 hover:bg-accent transition-colors"
          >
            Long Put Calculator
          </Link>
          <Link
            href="/calculator/covered-call"
            className="rounded-full border border-border px-4 py-2 hover:bg-accent transition-colors"
          >
            Covered Call Calculator
          </Link>
        </div>
      </section>

      {/* Calculator */}
      <OptionsCalculator />

      {/* SEO Content Section */}
      <section className="mx-auto mt-16 max-w-3xl space-y-8 text-muted-foreground">
        <div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
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
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            How to Use This Calculator
          </h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              <strong>Search for a ticker</strong> — Enter any US stock symbol (e.g., AAPL, TSLA,
              SPY) to load the options chain.
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
          <h2 className="mb-3 text-2xl font-bold text-foreground">
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
