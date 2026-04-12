# CLAUDE.md — optionerd.com

## Project Overview

**optionerd.com** is a free, high-quality options strategy calculator and visualization tool. The goal is to build the best free options calculator on the internet — better UX, better education, better multi-leg support than OPC (optionsprofitcalculator.com) and OptionStrat.

The product is built by an ITPM-trained options trader who actually uses these tools daily. That domain expertise is the moat — this isn't a generic calculator, it's built by someone who knows what a ratio calendar spread is and why the Greeks display on OPC is insufficient for multi-leg positions.

### Brand
- **Primary domain**: optionerd.com
- **Brand name**: Option Nerd / optionerd
- **Redirect domains**: optionspro.fit → optionerd.com, optionsprofitcalc.org → optionerd.com
- **Tone**: Smart, nerdy, approachable. Finance expertise without the corporate feel. Think "the friend who actually understands options and explains them clearly."

### Business Model
- Free tool — deep, genuinely useful, no crippled free tier
- Monetization will evolve over time (ads, freemium, premium features) — do NOT build any monetization scaffolding yet
- SEO is the primary growth channel — every page should be optimized for a specific keyword cluster
- Paid Google Ads will supplement organic traffic (near-zero competition on these keywords)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Data Provider | Massive.com Starter plan (formerly Polygon.io) — options chain data, Greeks, IV, delayed quotes |
| Pricing Engine | Client-side Black-Scholes/binomial model in TypeScript for simulations and payoff diagrams |
| Database | Supabase (Postgres) — for saved strategies, user data, email capture (future) |
| Auth | Supabase Auth (set up but not enforced for MVP — no login required to use the calculator) |
| Deployment | Vercel Pro |
| Package Manager | pnpm |
| Charting | Recharts or Lightweight Charts (TBD — pick whichever gives better payoff diagrams) |
| Repo | GitHub (use `gh` CLI to create and push) |

---

## Repository Setup

Create the GitHub repo using the CLI:
```bash
gh repo create optionerd --public --description "Options strategy calculator and visualization tool" --clone
```

Initialize with:
```bash
pnpm create next-app@latest optionerd --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Then add dependencies:
```bash
pnpm add @supabase/supabase-js recharts
pnpm dlx shadcn@latest init
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with metadata, fonts, analytics
│   ├── page.tsx                # Landing page / main calculator
│   ├── calculator/
│   │   ├── page.tsx            # Full calculator view
│   │   └── [strategy]/
│   │       └── page.tsx        # Strategy-specific pages (SEO landing pages)
│   ├── learn/
│   │   └── [slug]/
│   │       └── page.tsx        # Educational content pages (SEO)
│   └── api/
│       └── options/
│           └── route.ts        # Proxy for Massive API (server-side, protects API key)
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── calculator/
│   │   ├── StrategySelector.tsx
│   │   ├── OptionLegInput.tsx
│   │   ├── PayoffDiagram.tsx
│   │   ├── GreeksDisplay.tsx
│   │   ├── ProbabilityChart.tsx
│   │   └── TickerSearch.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── SEOHead.tsx
│   └── shared/
│       └── ... common components
├── lib/
│   ├── pricing/
│   │   ├── black-scholes.ts    # Black-Scholes pricing model
│   │   ├── greeks.ts           # Greeks calculation (delta, gamma, theta, vega, rho)
│   │   ├── implied-vol.ts      # IV solver (Newton-Raphson)
│   │   └── payoff.ts           # Payoff diagram data generation for multi-leg strategies
│   ├── massive/
│   │   ├── client.ts           # Massive API client wrapper
│   │   ├── options-chain.ts    # Fetch and normalize option chain data
│   │   └── types.ts            # Massive API response types
│   ├── strategies/
│   │   ├── definitions.ts      # Strategy definitions (legs, descriptions, use cases)
│   │   ├── templates.ts        # Pre-built strategy templates
│   │   └── types.ts            # Strategy types
│   ├── supabase/
│   │   ├── client.ts           # Supabase browser client
│   │   └── server.ts           # Supabase server client
│   └── utils/
│       ├── formatting.ts       # Number, currency, percentage formatting
│       └── constants.ts        # App-wide constants
├── hooks/
│   ├── useOptionChain.ts       # Fetch + cache option chain
│   ├── usePayoffCalculation.ts # Client-side payoff computation
│   └── useStrategy.ts          # Strategy state management
└── types/
    ├── options.ts              # Core option types (Call/Put, Leg, Strategy)
    └── market.ts               # Market data types
```

---

## MVP Scope — Phase 1

The goal is to get a **single functional page live on Vercel** as fast as possible so Google starts indexing. Ship ugly, ship fast, iterate.

### What ships in Phase 1:
1. **Landing page** at `/` — hero section explaining what Option Nerd is, with the calculator embedded or linked
2. **Single-leg calculator** — user enters ticker, selects a call or put from the chain, sees:
   - Current option price (from Massive API)
   - Payoff diagram at expiration
   - Greeks (delta, gamma, theta, vega)
   - Break-even price
   - P&L at various underlying prices
3. **Ticker search** — autocomplete search for US equity tickers
4. **Basic SEO pages** — at minimum, generate static pages for:
   - `/calculator/long-call` — "Long Call Calculator"
   - `/calculator/long-put` — "Long Put Calculator"
   - `/calculator/covered-call` — "Covered Call Calculator"
   - These are the highest-volume, lowest-KD keywords in the cluster

### What does NOT ship in Phase 1:
- Multi-leg strategy builder
- User accounts / authentication
- Saved strategies
- Premium features
- Email capture
- Ads

---

## Phase 2 (weeks 3-6)

- Multi-leg strategies: spreads (vertical, calendar, diagonal), iron condors, butterflies, straddles/strangles
- Interactive payoff diagram with time slider (P&L at different dates before expiry)
- Strategy template selector ("I'm bullish" → suggests long call, bull call spread, etc.)
- SEO pages for every strategy: `/calculator/iron-condor`, `/calculator/bull-call-spread`, etc.
- Each strategy page includes educational content explaining when/why to use it

---

## Phase 3 (months 2-4)

- Full strategy builder (add arbitrary legs)
- Probability of profit analysis
- Greeks over time visualization
- IV rank / IV percentile context
- Email list capture
- Explore monetization (AdSense, premium features)

---

## SEO Strategy

This is an SEO-first product. Every architectural decision should consider search visibility.

### Target Keywords (by priority):
1. **Head terms** (KD 40-50, long-term targets): "options profit calculator" (22K vol), "options calculator" (12K vol)
2. **Mid-tail** (KD 20-35, medium-term): "option value calculator" (1.3K), "long call option calculator" (1K), "option greeks calculator" (320), "covered call option calculator" (260), "option spread calculator" (140)
3. **Long-tail** (KD 0-15, immediate wins): "option credit spread calculator" (110), "straddle option calculator" (50), "iron condor calculator", "bull call spread calculator"

### SEO Implementation:
- Each strategy calculator page targets a specific keyword
- URL structure: `/calculator/[strategy-slug]`
- Each page has unique `<title>`, `<meta description>`, `<h1>` optimized for its target keyword
- Include educational content on each page (not just a tool) — explain the strategy, when to use it, max profit/loss, break-even formula
- Add JSON-LD structured data (WebApplication, FAQPage schemas)
- Internal linking between related strategies
- Sitemap.xml and robots.txt configured properly
- OG images for social sharing (auto-generated per strategy)

---

## Pricing Engine Specification

### Black-Scholes Model (client-side TypeScript)
Implement the standard Black-Scholes formula for European options:
- `d1 = (ln(S/K) + (r + σ²/2) * T) / (σ * √T)`
- `d2 = d1 - σ * √T`
- Call price: `S * N(d1) - K * e^(-rT) * N(d2)`
- Put price: `K * e^(-rT) * N(-d2) - S * N(-d1)`

Where: S = spot price, K = strike, r = risk-free rate, σ = volatility, T = time to expiry in years, N() = cumulative normal distribution.

### Greeks:
- **Delta**: ∂V/∂S — Call: N(d1), Put: N(d1) - 1
- **Gamma**: ∂²V/∂S² — N'(d1) / (S * σ * √T)
- **Theta**: ∂V/∂T — (see standard formula, express as daily decay)
- **Vega**: ∂V/∂σ — S * N'(d1) * √T (express per 1% IV change)
- **Rho**: ∂V/∂r — K * T * e^(-rT) * N(d2) for calls

### Implied Volatility Solver:
Use Newton-Raphson iteration to solve for IV given market price:
- Start with initial guess σ₀ = 0.3
- Iterate: σ_{n+1} = σ_n - (BS(σ_n) - market_price) / vega(σ_n)
- Converge when |BS(σ_n) - market_price| < 0.001
- Max 100 iterations, fallback to bisection if Newton-Raphson fails

### Payoff Diagram Generation:
For each strategy (collection of legs):
- Generate array of underlying prices from -50% to +100% of current price
- For each price point, calculate P&L for each leg at expiration
- Sum all legs for total strategy P&L
- Include break-even points, max profit, max loss
- For pre-expiry analysis: use Black-Scholes to estimate option value at future date/price

---

## Massive API Integration

The Massive API is the rebranded Polygon.io. Verify current base URL and endpoint structure from Massive docs before implementing.

### Endpoints needed for MVP:
- **Ticker search**: Search for US equity tickers by name/symbol
- **Option chain**: Snapshot of all option contracts for an underlying ticker
- **Option quote**: Individual contract details (price, Greeks, IV, volume, OI)
- **Stock quote**: Current underlying price for the ticker

### API Key Protection:
- NEVER expose the Massive API key on the client
- All API calls go through Next.js API routes (`/api/options/...`)
- Server-side route fetches from Massive, returns normalized data to client
- Cache responses with appropriate TTL (15-min delayed data, cache for 5 min)

### Environment Variables:
```
MASSIVE_API_KEY=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## Design Direction

### Visual Identity:
- **Aesthetic**: Dark mode primary (finance tool convention), with light mode support
- **Personality**: Nerdy, precise, clean. Not corporate. Think "developer tool meets finance."
- **Typography**: Monospace for numbers/data (JetBrains Mono or similar), clean sans-serif for UI text
- **Color palette**: TBD (pending logo/branding work) — avoid the typical finance blue/green. Stand out.
- **Charts**: Clean, interactive, responsive. Payoff diagrams should be the hero visual.

### UX Principles:
- Calculator should be usable without creating an account
- No popups, no gate, no friction — the tool just works
- Mobile-responsive (significant mobile traffic for finance tools)
- Fast — client-side calculations mean instant feedback as user adjusts parameters
- Educational — every strategy page teaches, not just calculates

---

## Code Style & Conventions

- TypeScript strict mode, no `any` types
- Functional components with hooks only
- Named exports (no default exports except pages)
- Use `@/` path alias for all imports
- Colocate component styles with components (Tailwind classes)
- Server components by default, `"use client"` only when needed
- Error boundaries around API-dependent components
- Descriptive variable names — `annualizedVolatility` not `vol`, `strikePrice` not `k`
- All financial calculations in `lib/pricing/` — keep components pure display logic
- Test pricing functions (Black-Scholes, Greeks) against known values

---

## Git Conventions

- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Branch from `main` for features: `feat/payoff-diagram`, `feat/ticker-search`
- No direct pushes to `main` — use PRs even when solo (builds good habits)
- Keep commits atomic and focused

---

## Key Files to Create First

In order of priority:
1. `src/lib/pricing/black-scholes.ts` — the core pricing engine
2. `src/lib/pricing/greeks.ts` — Greeks calculations
3. `src/lib/pricing/payoff.ts` — payoff diagram data generator
4. `src/app/api/options/chain/route.ts` — Massive API proxy
5. `src/components/calculator/PayoffDiagram.tsx` — the hero visualization
6. `src/components/calculator/OptionLegInput.tsx` — input form for a single leg
7. `src/app/page.tsx` — landing page with embedded calculator
8. `src/app/calculator/[strategy]/page.tsx` — strategy-specific SEO pages

---

## Important Context

- The developer (Nacho) is a Senior Software Engineer experienced with TypeScript, React, and Next.js
- He is also an ITPM-trained options trader — he understands the domain deeply
- The competitive landscape: OPC (optionsprofitcalculator.com, AS 35) is #1 but old and ugly. OptionStrat (AS 32) is better but freemium-gated. Neither has strong paid ad presence.
- SEO data shows 106K monthly search volume across the cluster, with near-zero Google Ads competition
- Sites with AS 2-6 and near-zero backlinks are already appearing in SERPs for these terms — Google rewards good tool pages in this niche
- Speed to market matters — get indexed, start building authority, iterate the product
