import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How optionerd collects, uses, stores, and protects your data, including brokerage connection data, account information, and analytics.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-8 md:py-12">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: May 5, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <p className="text-muted-foreground">
            optionerd (&quot;we&quot;, &quot;us&quot;) operates{" "}
            <a
              href="https://optionerd.com"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              optionerd.com
            </a>
            . This policy explains what data we collect, why, and how we handle it. We
            keep data collection to what is necessary to operate the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Data we collect</h2>
          <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-5">
            <li>
              <strong className="text-foreground">Account data:</strong> email address
              and authentication identifiers when you sign up. Authentication is handled
              by Supabase Auth.
            </li>
            <li>
              <strong className="text-foreground">Brokerage data:</strong> if you connect
              a brokerage, we receive read-only data through SnapTrade — account
              identifiers, balances, positions, and order/transaction history. We never
              receive your brokerage login credentials; SnapTrade handles authentication.
              We do not have permission to place orders or move funds.
            </li>
            <li>
              <strong className="text-foreground">Saved strategies and inputs:</strong>{" "}
              calculator inputs, scenarios, and strategies you save are stored against
              your account.
            </li>
            <li>
              <strong className="text-foreground">Billing data:</strong> if you subscribe,
              payment is processed by Stripe. We receive subscription status and the last
              four digits of the card; we never see full card numbers.
            </li>
            <li>
              <strong className="text-foreground">Analytics:</strong> we use Plausible
              Analytics, a privacy-focused product that does not use cookies and does not
              track users across sites. We see aggregate page views, referrers, and
              device categories — no personal profiles.
            </li>
            <li>
              <strong className="text-foreground">Logs:</strong> standard server logs (IP
              address, user agent, request paths, timestamps) are retained for security
              and debugging, typically for 30 days.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">How we use your data</h2>
          <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-5">
            <li>To operate the calculator and analytics features</li>
            <li>
              To display your portfolio, positions, and analytics derived from your
              brokerage connection
            </li>
            <li>To authenticate you and protect your account</li>
            <li>To process subscription billing</li>
            <li>To respond to support requests you send us</li>
            <li>To improve the product through aggregate, non-identifying analytics</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            We do not sell your personal data. We do not share your brokerage data,
            positions, or balances with third parties for marketing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Subprocessors</h2>
          <p className="mt-2 text-muted-foreground">
            We rely on the following third-party services to operate optionerd. Each is
            bound by its own privacy policy and security commitments.
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-5">
            <li>
              <strong className="text-foreground">Supabase</strong> — database and
              authentication
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — application hosting
            </li>
            <li>
              <strong className="text-foreground">SnapTrade</strong> — read-only
              brokerage aggregation
            </li>
            <li>
              <strong className="text-foreground">Stripe</strong> — payment processing
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> — transactional email
              (e.g., contact form delivery)
            </li>
            <li>
              <strong className="text-foreground">Plausible Analytics</strong> —
              privacy-focused, cookie-free analytics
            </li>
            <li>
              <strong className="text-foreground">Upstash</strong> — caching and rate
              limiting
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">Data retention</h2>
          <p className="mt-2 text-muted-foreground">
            Account data is retained for as long as your account exists. If you delete
            your account, we delete or anonymize your personal data within 30 days,
            except where retention is required for legal, tax, or fraud-prevention
            reasons (typically up to 7 years for billing records). Server logs are
            retained for approximately 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Your rights</h2>
          <p className="mt-2 text-muted-foreground">
            Because optionerd is operated from Spain, users in the EU/EEA and UK have
            rights under the GDPR / UK GDPR, including the right to access, correct,
            export, restrict processing of, or delete your personal data, and the right
            to withdraw consent or lodge a complaint with your supervisory authority.
            Users in California have analogous rights under the CCPA / CPRA. To exercise
            any of these rights, contact us at{" "}
            <a
              href="mailto:contact@optionerd.com"
              className="font-mono text-foreground underline underline-offset-2 hover:no-underline"
            >
              contact@optionerd.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            We use only the cookies strictly necessary to operate the site, primarily for
            authentication and session management. Plausible Analytics does not set
            cookies. We do not use advertising cookies or cross-site trackers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">International transfers</h2>
          <p className="mt-2 text-muted-foreground">
            Some of our subprocessors are located in the United States. Where personal
            data is transferred outside the EEA/UK, we rely on the safeguards each
            provider implements (such as Standard Contractual Clauses and the EU-U.S.
            Data Privacy Framework where applicable).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Security</h2>
          <p className="mt-2 text-muted-foreground">
            We use TLS for all data in transit, encrypted storage at rest through our
            providers, and least-privilege access controls. No system is perfectly
            secure; if you discover a vulnerability, please report it to{" "}
            <a
              href="mailto:contact@optionerd.com"
              className="font-mono text-foreground underline underline-offset-2 hover:no-underline"
            >
              contact@optionerd.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Children</h2>
          <p className="mt-2 text-muted-foreground">
            optionerd is not intended for use by anyone under 18. We do not knowingly
            collect personal data from children.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Changes to this policy</h2>
          <p className="mt-2 text-muted-foreground">
            We may update this policy from time to time. Material changes will be
            highlighted on this page and, where appropriate, notified by email.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy or your data:{" "}
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
