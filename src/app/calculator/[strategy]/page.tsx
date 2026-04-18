import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OptionsCalculator } from "@/components/calculator/OptionsCalculator";
import {
  getStrategyBySlug,
  getAllStrategySlugs,
} from "@/lib/strategies/definitions";
import { strategyTemplates } from "@/lib/strategies/templates";
import { Badge } from "@/components/ui/badge";
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
    openGraph: {
      title: def.title,
      description: def.metaDescription,
      type: "website",
    },
  };
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { strategy } = await params;
  const def = getStrategyBySlug(strategy);

  if (!def) {
    notFound();
  }

  const sentimentColors = {
    bullish: "bg-green-500/10 text-green-500",
    bearish: "bg-red-500/10 text-red-500",
    neutral: "bg-yellow-500/10 text-yellow-500",
  };

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
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {def.h1}
            </h1>
            <Badge className={sentimentColors[def.sentiment]}>
              {def.sentiment}
            </Badge>
          </div>
          <p className="max-w-3xl text-lg text-muted-foreground">
            {def.description}
          </p>
        </section>

        {/* Quick Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Max Profit
            </div>
            <div className="mt-1 font-mono text-sm text-green-500">{def.maxProfit}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Max Loss
            </div>
            <div className="mt-1 font-mono text-sm text-red-500">{def.maxLoss}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Break Even
            </div>
            <div className="mt-1 font-mono text-sm">{def.breakEvenFormula}</div>
          </div>
        </section>

        {/* Calculator */}
        <OptionsCalculator
          defaultOptionType={def.defaultOptionType}
          defaultPositionType={def.defaultPositionType}
          includeStockLeg={def.includeStockLeg}
          defaultTemplate={strategyTemplates[def.slug] ? def.slug : undefined}
        />

        <Separator className="my-12" />

        {/* Educational Content */}
        <section className="mx-auto max-w-3xl space-y-8">
          <div>
            <h2 className="mb-4 text-2xl font-bold">
              When to Use a {def.name}
            </h2>
            <ul className="space-y-2">
              {def.whenToUse.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">Risks</h2>
            <ul className="space-y-2">
              {def.risks.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          {/* Rendered educational content */}
          <div className="prose prose-invert max-w-none">
            <div
              className="space-y-4 text-muted-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(def.educationalContent) }}
            />
          </div>
        </section>

        {/* Internal Links */}
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
