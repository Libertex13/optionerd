# Pre-Ads Launch Checklist

This is the working checklist before spending on Google or Reddit ads for
optionerd. The goal is to make sure paid traffic lands on a product that can
earn trust, measure intent, and convert without feeling like a thin affiliate
funnel.

## Measurement

- [ ] Install and verify GA4 or equivalent analytics.
- [ ] Install and verify Reddit Pixel.
- [ ] Install and verify Google Ads conversion tracking.
- [ ] Add UTM conventions for every paid/ad test link.
- [ ] Track key events:
  - [ ] calculator interaction
  - [ ] strategy page decision-point interaction
  - [ ] share-link copied/opened
  - [ ] import dialog opened
  - [ ] broker connect started
  - [ ] broker connected
  - [ ] portfolio viewed after import
  - [ ] Nerd upgrade clicked
  - [ ] affiliate link clicked
- [ ] Define success metrics for the first test before launch:
  - [ ] engaged sessions
  - [ ] calculator/strategy interactions per session
  - [ ] share rate
  - [ ] broker import attempts
  - [ ] upgrade intent
  - [ ] returning/direct traffic lift

## Trust And Compliance

- [ ] Add clear "not financial advice" disclaimers across calculators, strategy
      pages, portfolio, repair flows, and brokerage import surfaces.
- [ ] Avoid "best trade" / "recommended trade" language. Prefer "strategy
      screener", "repair candidates", "modeled candidates", or "ideas based on
      user-defined constraints".
- [ ] Add an About page that explains who built optionerd and why.
- [ ] Add methodology pages for payoff math, Greeks, implied volatility
      assumptions, data sources, and quote delays.
- [ ] Add privacy/security copy for brokerage connections:
  - [ ] read-only access
  - [ ] no trade placement
  - [ ] token handling
  - [ ] disconnect flow
- [ ] Make quote source and delay labels visible wherever marks are shown.

## Product Polish

- [ ] Fix mobile UX across calculator, strategy pages, portfolio, import dialogs,
      and pricing.
- [ ] Add calendar strategy pages and make sure they have usable first-viewport
      examples.
- [ ] Fix Repair Lab until it feels useful and credible, not experimental.
- [ ] Polish portfolio UX:
  - [ ] loading states
  - [ ] empty states
  - [ ] import errors
  - [ ] stale data indicators
  - [ ] reconnect/disconnect states
  - [ ] row/action affordances on mobile
- [ ] Add "suggested trade" / repair candidate feature only with careful wording:
      it should rank modeled candidates, not present personalized advice.

## Brokerage Readiness

- [x] SnapTrade enabled `TRADESTATION` and `TRADESTATION-SIM` for the optionerd
      SnapTrade client.
- [ ] Test SnapTrade TradeStation connection end to end.
- [ ] Test at least a few other SnapTrade brokers as accounts become available.
- [ ] Add graceful handling for brokers that return incomplete options data.
- [ ] Confirm all brokerage routes are Nerd-gated server-side.
- [ ] Confirm all broker secrets/user secrets stay server-side.
- [ ] Confirm subscription cancellation removes/deactivates paid upstream broker
      usage where applicable.

## Educational Wing

- [ ] Build the educational content surface for optionerd.
- [ ] Publish curated articles with concrete examples instead of generic finance
      filler.
- [ ] Add natural affiliate placements only where they fit the learning context.
- [ ] Create original data/stat pages that can attract citations:
  - [ ] novel options strategy stats
  - [ ] historical strategy outcomes
  - [ ] event/earnings strategy behavior
  - [ ] covered-call underperformance/participation stats
  - [ ] repair candidate frequency or outcomes
- [ ] Make every stat page cite methodology and data source clearly.
- [ ] Repeat the "original stats worth citing" strategy for YieldMaxCalc where
      it fits dividend/distribution research.

## Landing Pages For Ads

- [ ] Choose the first paid landing pages:
  - [ ] options profit calculator
  - [ ] covered call calculator
  - [ ] portfolio repair / options portfolio tracker
- [ ] Make each landing page immediately usable above the fold.
- [ ] Keep paid landing pages educational/tool-first, not affiliate-first.
- [ ] Add fast mobile checks for every paid landing page.
- [ ] Make shareable strategy URLs prominent.

## First Campaign Shape

- [ ] Start small, not broad.
- [ ] Google Ads baseline:
  - [ ] exact/phrase match around `options profit calculator`
  - [ ] `options payoff calculator`
  - [ ] `covered call calculator`
  - [ ] `iron condor calculator`
  - [ ] negative keywords for irrelevant/navigational traffic
- [ ] Reddit awareness test:
  - [ ] historical strategy walkthrough creative
  - [ ] educational "model the trade" framing
  - [ ] no "trade now", no profit claims, no specific-trade recommendation tone
- [ ] Compare channels on engaged usage, not just clicks.
