import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important information about optionerd: not investment advice, options risk, theoretical pricing models, delayed market data, and read-only brokerage access.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-8 md:py-12">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Disclaimer</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: May 5, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">Not investment advice</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd is a software tool for calculating, analyzing, and visualizing options
            strategies. Nothing on this site is investment advice, a solicitation to buy or
            sell any security, or a recommendation of any specific strategy, position, or
            broker. We are not a registered investment adviser, broker-dealer, financial
            planner, or fiduciary, and we do not provide personalized recommendations. You
            are solely responsible for your own investment decisions and should consult a
            licensed professional before trading options.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Options carry significant risk</h2>
          <p className="mt-2 text-muted-foreground">
            Trading options is highly speculative and not suitable for all investors. You
            can lose the entire amount invested, and certain strategies (including writing
            uncovered options and complex multi-leg positions) can result in losses that
            substantially exceed your initial investment. Before trading options, read{" "}
            <a
              href="https://www.theocc.com/Company-Information/Documents-and-Archives/Options-Disclosure-Document"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              Characteristics and Risks of Standardized Options
            </a>{" "}
            (the OCC&apos;s Options Disclosure Document).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Calculations are theoretical</h2>
          <p className="mt-2 text-muted-foreground">
            Payoff diagrams, Greeks, probabilities, and P&amp;L estimates are produced
            using standard pricing models (Black-Scholes and related methods) and the
            inputs you provide. They are theoretical projections, not predictions. Real
            markets diverge from model assumptions because of bid-ask spreads, slippage,
            early exercise, dividends, interest-rate changes, volatility regime shifts,
            corporate actions, and liquidity. Actual fills and outcomes will differ from
            anything shown here.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Market data is delayed</h2>
          <p className="mt-2 text-muted-foreground">
            Quotes, option chains, Greeks, and implied volatility shown on optionerd are
            based on delayed market data (typically 15+ minutes) or end-of-day data. Do
            not rely on optionerd for real-time pricing or execution decisions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Brokerage connections are read-only</h2>
          <p className="mt-2 text-muted-foreground">
            Where optionerd integrates with a brokerage (via SnapTrade or another
            aggregator), the connection is strictly read-only. optionerd does not place
            orders, modify positions, transfer funds, or initiate any transaction in your
            account. All trading activity must be performed by you in your broker.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Past performance and forward-looking statements</h2>
          <p className="mt-2 text-muted-foreground">
            Past performance — whether of a strategy, a ticker, or a portfolio — does not
            guarantee future results. Any forward-looking analysis is hypothetical and
            should not be interpreted as a forecast.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">No warranty</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd is provided &quot;as is&quot; without warranty of any kind. We make
            no representation that data is accurate, complete, or current, and we are not
            liable for any loss or damage arising from use of the site, the calculations,
            or any third-party data we display.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Questions</h2>
          <p className="mt-2 text-muted-foreground">
            Reach us at{" "}
            <Link
              href="/contact"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              /contact
            </Link>{" "}
            or{" "}
            <a
              href="mailto:contact@optionerd.com"
              className="font-mono text-foreground underline underline-offset-2 hover:no-underline"
            >
              contact@optionerd.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
