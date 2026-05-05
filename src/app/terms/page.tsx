import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for optionerd: acceptable use, accounts, subscriptions, brokerage connections, intellectual property, disclaimers, and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-8 md:py-12">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: May 5, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <p className="text-muted-foreground">
            These Terms govern your use of optionerd.com (&quot;optionerd&quot;,
            &quot;we&quot;, &quot;us&quot;). By accessing or using the service, you agree
            to these Terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">1. The service</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd is an options analytics and visualization platform. It provides
            calculators, payoff diagrams, Greeks, and portfolio analytics, and supports
            an optional read-only connection to a user&apos;s brokerage account through
            third-party aggregators (e.g., SnapTrade). optionerd does not place orders,
            modify positions, transfer funds, or execute trades.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Not investment advice</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd is a software tool. Nothing on the service is investment advice, a
            recommendation, an offer, or a solicitation to buy or sell any security. We
            are not a registered investment adviser, broker-dealer, or fiduciary. You are
            solely responsible for your investment decisions. See our full{" "}
            <Link
              href="/disclaimer"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              Disclaimer
            </Link>{" "}
            for details on options risk, theoretical pricing models, and delayed market
            data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Eligibility and accounts</h2>
          <p className="mt-2 text-muted-foreground">
            You must be at least 18 years old and capable of forming a binding contract
            to use optionerd. You are responsible for the accuracy of the information you
            provide and for safeguarding your credentials. You are responsible for all
            activity under your account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Acceptable use</h2>
          <p className="mt-2 text-muted-foreground">You agree not to:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-5">
            <li>Use the service in violation of any law or regulation</li>
            <li>
              Reverse engineer, scrape, or otherwise attempt to extract data from the
              service except through documented interfaces
            </li>
            <li>Interfere with, disrupt, or attempt to bypass our security measures</li>
            <li>
              Resell, sublicense, or redistribute the service or its data without our
              written consent
            </li>
            <li>Impersonate another person or misrepresent your affiliation</li>
            <li>
              Use the service in a way that imposes an unreasonable load on our
              infrastructure
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Brokerage connections</h2>
          <p className="mt-2 text-muted-foreground">
            If you choose to connect a brokerage account, you authorize the relevant
            third-party aggregator (e.g., SnapTrade) to share read-only data with
            optionerd. The connection is governed by the aggregator&apos;s terms and your
            broker&apos;s terms in addition to these Terms. You can disconnect at any
            time. We use this data only to provide the analytics features described in
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Subscriptions and billing</h2>
          <p className="mt-2 text-muted-foreground">
            Some features are offered under a paid subscription. Subscriptions renew
            automatically until cancelled. You can cancel at any time from your account;
            cancellation takes effect at the end of the current billing period. Fees are
            non-refundable except where required by law. Payment processing is handled by
            Stripe. We may change pricing with prior notice; changes apply to the next
            billing cycle after notice.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Market data</h2>
          <p className="mt-2 text-muted-foreground">
            Market data displayed on optionerd is sourced from third-party providers and
            is delayed (typically 15+ minutes) or end-of-day. Data may be inaccurate,
            incomplete, or unavailable. You may not use the service to redistribute,
            republish, or commercially exploit market data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Intellectual property</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd, the software, the visual design, and the original content on the
            site are owned by us or our licensors and protected by intellectual property
            laws. We grant you a limited, non-exclusive, non-transferable license to use
            the service for personal, non-commercial purposes. Any content you submit
            (e.g., saved strategies, scenarios) remains yours; you grant us the licenses
            necessary to operate the service on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">9. Disclaimers</h2>
          <p className="mt-2 text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE
            DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT
            DATA WILL BE ACCURATE OR CURRENT.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">10. Limitation of liability</h2>
          <p className="mt-2 text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPTIONERD AND ITS OPERATORS SHALL NOT
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, OR TRADING LOSSES, ARISING
            FROM YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY FOR ANY CLAIM RELATED
            TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE FEES YOU PAID TO US IN
            THE 12 MONTHS BEFORE THE CLAIM AROSE OR (B) USD 100. NOTHING IN THESE TERMS
            EXCLUDES LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">11. Indemnification</h2>
          <p className="mt-2 text-muted-foreground">
            You agree to indemnify and hold optionerd harmless from any claim arising out
            of your breach of these Terms, your misuse of the service, or your violation
            of any law or third-party right.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">12. Termination</h2>
          <p className="mt-2 text-muted-foreground">
            You may stop using the service and delete your account at any time. We may
            suspend or terminate your access if you breach these Terms or use the service
            in a way that creates risk for us or other users. Sections that by their
            nature should survive termination (e.g., disclaimers, limitations of
            liability, intellectual property) will survive.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">13. Changes to the Terms</h2>
          <p className="mt-2 text-muted-foreground">
            We may update these Terms from time to time. If changes are material, we will
            notify you (e.g., by email or in the product). Continued use after the
            effective date constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">14. Governing law</h2>
          <p className="mt-2 text-muted-foreground">
            These Terms are governed by the laws of Spain, without regard to conflict-of-law
            principles. Disputes shall be resolved in the competent courts located in
            Spain, except where mandatory consumer-protection law in your country of
            residence requires otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">15. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about these Terms:{" "}
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
