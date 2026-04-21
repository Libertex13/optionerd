import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OptionsCalculator } from "@/components/calculator/OptionsCalculator";
import {
  getStrategyBySlug,
  getAllStrategySlugs,
} from "@/lib/strategies/definitions";
import { strategyTemplates } from "@/lib/strategies/templates";
import { getScenariosForStrategy } from "@/lib/scenarios/registry";
import { ScenarioPlayer } from "@/components/scenarios/ScenarioPlayer";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface StrategyPageProps {
  params: Promise<{ strategy: string }>;
}

export async function generateStaticParams() {
  return getAllStrategySlugs().map((slug) => ({ strategy: slug }));
}

export async function generateMetadata({
  params,
}: StrategyPageProps): Promise<Metadata> {
  const { strategy } = await params;
  const def = getStrategyBySlug(strategy);
  if (!def) return {};

  return {
    title: def.title,
    description: def.metaDescription,
    alternates: {
      canonical: `/calculator/${def.slug}`,
    },
    openGraph: {
      title: def.title,
      description: def.metaDescription,
      type: "website",
    },
  };
}

const sentimentPill = {
  bullish: "text-green-500 border-green-500/40",
  bearish: "text-red-500 border-red-500/40",
  neutral: "text-amber-500 border-amber-500/40",
};

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { strategy } = await params;
  const def = getStrategyBySlug(strategy);

  if (!def) {
    notFound();
  }

  const scenarios = getScenariosForStrategy(def.slug);
  const hasScenarios = scenarios.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: def.name + " Calculator",
    description: def.metaDescription,
    url: `https://optionerd.com/calculator/${def.slug}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        {/* Breadcrumbs */}
        <div className="font-mono text-[11px] text-muted-foreground mb-3.5">
          <Link href="/" className="hover:text-foreground">
            home
          </Link>
          {" / "}
          <Link href="/strategies" className="hover:text-foreground">
            strategies
          </Link>
          {" / "}
          <span>{def.slug}</span>
        </div>

        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-end mb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              {def.name} Calculator
            </h1>
            <p className="mt-3 max-w-[62ch] text-base text-muted-foreground">
              {def.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`font-mono text-[10.5px] uppercase tracking-wider px-2 py-1 rounded border ${sentimentPill[def.sentiment]}`}
            >
              {def.sentiment}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground">
              Defined risk
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground">
              {def.includeStockLeg ? "Stock + option" : "Options only"}
            </span>
          </div>
        </section>

        {/* At a glance */}
        <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-0 rounded-lg border border-border bg-card">
          <GlanceCell label="Outlook" value={def.sentiment} />
          <GlanceCell label="Max profit" value={def.maxProfit} tone="pos" />
          <GlanceCell label="Max loss" value={def.maxLoss} tone="neg" />
          <GlanceCell label="Break-even" value={def.breakEvenFormula} />
        </section>

        {/* 01 · Calculator */}
        <SectionHead
          number="01"
          title="Price it"
          sub="Enter strikes & premiums · live on the page"
        />
        <OptionsCalculator
          defaultOptionType={def.defaultOptionType}
          defaultPositionType={def.defaultPositionType}
          includeStockLeg={def.includeStockLeg}
          defaultTemplate={strategyTemplates[def.slug] ? def.slug : undefined}
        />

        {/* 02 · Scenario */}
        {hasScenarios ? (
          <>
            <SectionHead
              number="02"
              title="Practical example"
              sub="Real historical prices · this example is based on real data"
            />
            <ScenarioPlayer
              strategySlug={def.slug}
              scenarioId={scenarios[0]!.id}
            />
          </>
        ) : null}

        {/* 03 · What it is */}
        <SectionHead number="03" title="When to use it" />
        <div className="max-w-3xl">
          <ul className="space-y-2 mb-8">
            {def.whenToUse.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {reason}
              </li>
            ))}
          </ul>
          <h3 className="mb-3 text-lg font-semibold">Risks</h3>
          <ul className="space-y-2">
            {def.risks.map((risk) => (
              <li
                key={risk}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* 04 · Educational content */}
        <SectionHead number="04" title="The deeper breakdown" />
        <div className="prose prose-invert max-w-none">
          <div
            className="max-w-3xl space-y-4 text-muted-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(def.educationalContent),
            }}
          />
        </div>

        <Separator className="my-12" />
        <section className="text-center">
          <h2 className="mb-4 text-xl font-bold">Explore More Strategies</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {getAllStrategySlugs()
              .filter((s) => s !== def.slug)
              .map((slug) => {
                const s = getStrategyBySlug(slug)!;
                return (
                  <Link
                    key={slug}
                    href={`/calculator/${slug}`}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    {s.name} Calculator
                  </Link>
                );
              })}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHead({
  number,
  title,
  sub,
}: {
  number: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mt-12 mb-5 flex items-baseline gap-3.5 border-b border-border pb-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {number}
      </span>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      {sub ? (
        <span className="ml-auto font-mono text-[12px] text-muted-foreground">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function GlanceCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="p-4 border-r last:border-r-0 border-b md:border-b-0 border-border [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1.5 font-mono text-sm font-semibold ${tone === "pos" ? "text-green-500" : tone === "neg" ? "text-red-500" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/** Simple markdown-to-HTML for educational content (headings, bold, lists, paragraphs) */
function markdownToHtml(md: string): string {
  return md
    .trim()
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("- **")) {
        return `<li>${trimmed.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`;
      }
      if (trimmed === "") return "<br/>";
      return `<p>${trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");
}
