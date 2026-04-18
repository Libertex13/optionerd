"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TickerSearch } from "./TickerSearch";
import { PayoffDiagram } from "./PayoffDiagram";
import { PnLHeatmap } from "./PnLHeatmap";
import { GreeksDisplay } from "./GreeksDisplay";
import { SaveTradeButton } from "./SaveTradeButton";
import { StrategyPicker } from "./StrategyPicker";
import { TemplateStrip } from "./TemplateStrip";
import { TimeSlider } from "./TimeSlider";
import type { OptionChain, OptionContract } from "@/types/market";
import type { OptionType, PositionType, OptionLeg } from "@/types/options";
import { priceOption } from "@/lib/pricing/black-scholes";
import { calculateGreeks } from "@/lib/pricing/greeks";
import {
  generatePayoffAtExpiry,
  findBreakEvenPoints,
  calculateMaxProfitLoss,
} from "@/lib/pricing/payoff";
import { calculateChanceOfProfit } from "@/lib/pricing/probability";
import {
  DEFAULT_RISK_FREE_RATE,
  CALENDAR_DAYS_PER_YEAR,
} from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/formatting";
import { strategyTemplates } from "@/lib/strategies/templates";

/** A selected leg with its source contract and position config */
interface SelectedLeg {
  id: string;
  contract: OptionContract;
  optionType: OptionType;
  positionType: PositionType;
  premium: number;
  quantity: number;
}

/** Stock/shares leg */
interface StockLegConfig {
  positionType: "long" | "short";
  quantity: number;
  entryPrice: number;
}

/** A saved trade to pre-fill the calculator with */
interface SavedTradeInput {
  ticker: string;
  underlyingPrice: number;
  legs: {
    option_type: "call" | "put";
    position_type: "long" | "short";
    strike_price: number;
    premium: number;
    quantity: number;
    expiration_date: string;
    implied_volatility: number;
  }[];
  stock_leg: {
    position_type: "long" | "short";
    quantity: number;
    entry_price: number;
  } | null;
}

interface OptionsCalculatorProps {
  defaultOptionType?: OptionType;
  defaultPositionType?: PositionType;
  includeStockLeg?: boolean;
  /** Slug of strategy template to auto-select when a chain loads */
  defaultTemplate?: string;
  /** Pre-fill from a saved trade — auto-loads chain and matches contracts */
  savedTrade?: SavedTradeInput;
}

export function OptionsCalculator({
  defaultOptionType = "call",
  defaultPositionType = "long",
  includeStockLeg = false,
  defaultTemplate,
  savedTrade,
}: OptionsCalculatorProps) {
  const [chain, setChain] = useState<OptionChain | null>(null);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [legs, setLegs] = useState<SelectedLeg[]>([]);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [priceTarget, setPriceTarget] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<string>("1");
  const [stockLeg, setStockLeg] = useState<StockLegConfig | null>(
    includeStockLeg ? { positionType: "long", quantity: 100, entryPrice: 0 } : null,
  );
  const [stockQtyInput, setStockQtyInput] = useState<string>(includeStockLeg ? "100" : "");
  const [stockPriceInput, setStockPriceInput] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const activeLeg = legs[activeLegIndex] ?? null;

  const switchToLeg = useCallback((index: number) => {
    setActiveLegIndex(index);
    const leg = legs[index];
    setQtyInput(leg ? String(leg.quantity) : "1");
  }, [legs]);

  const findAtmContract = useCallback(
    (data: OptionChain, expiry: string, type: OptionType) => {
      const expiryData = data.expirations.find(
        (e) => e.expirationDate === expiry,
      );
      if (!expiryData) return null;
      const contracts = type === "call" ? expiryData.calls : expiryData.puts;
      if (contracts.length === 0) return null;
      return contracts.reduce((closest, c) =>
        Math.abs(c.strikePrice - data.underlyingPrice) <
        Math.abs(closest.strikePrice - data.underlyingPrice)
          ? c
          : closest,
      );
    },
    [],
  );

  const getPremium = useCallback(
    (
      contract: OptionContract,
      chainData: OptionChain,
      expiry: string,
      oType: OptionType,
    ) => {
      if (contract.mid > 0) return contract.mid;
      if (contract.last > 0) return contract.last;
      const dte =
        chainData.expirations.find((e) => e.expirationDate === expiry)
          ?.daysToExpiry ?? 30;
      const pricing = priceOption({
        spotPrice: chainData.underlyingPrice,
        strikePrice: contract.strikePrice,
        timeToExpiry: Math.max(
          dte / CALENDAR_DAYS_PER_YEAR,
          1 / CALENDAR_DAYS_PER_YEAR,
        ),
        riskFreeRate: DEFAULT_RISK_FREE_RATE,
        volatility: contract.impliedVolatility || 0.3,
        optionType: oType,
      });
      return pricing.price;
    },
    [],
  );

  const makeLeg = useCallback(
    (
      contract: OptionContract,
      oType: OptionType,
      pType: PositionType,
      chainData: OptionChain,
      expiry: string,
      qty: number = 1,
    ): SelectedLeg => ({
      id: `${contract.contractSymbol}-${pType}-${Date.now()}`,
      contract,
      optionType: oType,
      positionType: pType,
      premium: getPremium(contract, chainData, expiry, oType),
      quantity: qty,
    }),
    [getPremium],
  );

  const getDefaultExpiry = (data: OptionChain) => {
    if (data.expirations.length === 0) return null;
    return data.expirations.length > 1 && data.expirations[0].daysToExpiry <= 1
      ? data.expirations[1]
      : data.expirations[0];
  };

  const handleTickerSelect = async (ticker: string) => {
    setIsLoadingChain(true);
    setChainError(null);
    setLegs([]);
    switchToLeg(0);

    try {
      const response = await fetch(`/api/options/chain?ticker=${ticker}`);
      if (!response.ok) throw new Error("Failed to fetch options chain");

      const data: OptionChain = await response.json();
      setChain(data);

      // Auto-populate stock leg for covered strategies
      if (includeStockLeg) {
        setStockLeg({ positionType: "long", quantity: 100, entryPrice: data.underlyingPrice });
        setStockQtyInput("100");
        setStockPriceInput(data.underlyingPrice.toFixed(2));
      } else {
        setStockLeg(null);
        setStockQtyInput("");
        setStockPriceInput("");
      }

      // If a default template is set (from strategy page), apply it after chain loads
      if (defaultTemplate && strategyTemplates[defaultTemplate]) {
        const tpl = strategyTemplates[defaultTemplate];
        const expiry = getDefaultExpiry(data);
        if (expiry) {
          const newLegs: SelectedLeg[] = [];
          for (const tplLeg of tpl.legs) {
            const targetStrike = data.underlyingPrice + tplLeg.strikeOffset;
            const expiryData = data.expirations.find(
              (e) => e.expirationDate === expiry.expirationDate,
            );
            if (!expiryData) continue;
            const contracts =
              tplLeg.type === "call" ? expiryData.calls : expiryData.puts;
            if (contracts.length === 0) continue;
            const contract = contracts.reduce((closest, c) =>
              Math.abs(c.strikePrice - targetStrike) <
              Math.abs(closest.strikePrice - targetStrike)
                ? c
                : closest,
            );
            newLegs.push(
              makeLeg(contract, tplLeg.type, tplLeg.side, data, expiry.expirationDate, tplLeg.quantity),
            );
          }
          if (newLegs.length > 0) {
            setLegs(newLegs);
            setActiveLegIndex(0);
            setQtyInput(String(newLegs[0].quantity));
          }
          if (tpl.includeStock) {
            setStockLeg({ positionType: "long", quantity: 100, entryPrice: data.underlyingPrice });
            setStockQtyInput("100");
            setStockPriceInput(data.underlyingPrice.toFixed(2));
          }
          setActiveTemplate(defaultTemplate);
        }
      } else {
        const expiry = getDefaultExpiry(data);
        if (expiry) {
          const atm = findAtmContract(
            data,
            expiry.expirationDate,
            defaultOptionType,
          );
          if (atm) {
            setLegs([
              makeLeg(
                atm,
                defaultOptionType,
                defaultPositionType,
                data,
                expiry.expirationDate,
                1,
              ),
            ]);
          }
        }
      }
    } catch {
      setChainError("Could not load options chain. Please try another ticker.");
    } finally {
      setIsLoadingChain(false);
    }
  };

  // Auto-load a saved trade on mount
  const [savedTradeLoaded, setSavedTradeLoaded] = useState(false);
  useEffect(() => {
    if (!savedTrade || savedTradeLoaded) return;
    setSavedTradeLoaded(true);

    (async () => {
      setIsLoadingChain(true);
      setChainError(null);

      try {
        const response = await fetch(`/api/options/chain?ticker=${savedTrade.ticker}`);
        if (!response.ok) throw new Error("Failed to fetch options chain");

        const data: OptionChain = await response.json();
        setChain(data);

        // Match saved legs to live chain contracts
        const newLegs: SelectedLeg[] = [];
        for (const savedLeg of savedTrade.legs) {
          const expiryData = data.expirations.find(
            (e) => e.expirationDate === savedLeg.expiration_date,
          );
          if (!expiryData) {
            // Expiry no longer available — find closest
            const closest = data.expirations.reduce((best, e) =>
              Math.abs(new Date(e.expirationDate).getTime() - new Date(savedLeg.expiration_date).getTime()) <
              Math.abs(new Date(best.expirationDate).getTime() - new Date(savedLeg.expiration_date).getTime())
                ? e : best,
            );
            if (!closest) continue;
            const contracts = savedLeg.option_type === "call" ? closest.calls : closest.puts;
            const contract = contracts.reduce((best, c) =>
              Math.abs(c.strikePrice - savedLeg.strike_price) < Math.abs(best.strikePrice - savedLeg.strike_price)
                ? c : best,
            );
            newLegs.push(makeLeg(contract, savedLeg.option_type, savedLeg.position_type, data, closest.expirationDate, savedLeg.quantity));
          } else {
            const contracts = savedLeg.option_type === "call" ? expiryData.calls : expiryData.puts;
            // Find exact strike or closest
            const contract = contracts.reduce((best, c) =>
              Math.abs(c.strikePrice - savedLeg.strike_price) < Math.abs(best.strikePrice - savedLeg.strike_price)
                ? c : best,
            );
            newLegs.push(makeLeg(contract, savedLeg.option_type, savedLeg.position_type, data, expiryData.expirationDate, savedLeg.quantity));
          }
        }

        if (newLegs.length > 0) {
          setLegs(newLegs);
          setActiveLegIndex(0);
          setQtyInput(String(newLegs[0].quantity));
        }

        // Restore stock leg
        if (savedTrade.stock_leg) {
          setStockLeg({
            positionType: savedTrade.stock_leg.position_type,
            quantity: savedTrade.stock_leg.quantity,
            entryPrice: savedTrade.stock_leg.entry_price,
          });
          setStockQtyInput(String(savedTrade.stock_leg.quantity));
          setStockPriceInput(savedTrade.stock_leg.entry_price.toFixed(2));
        }
      } catch {
        setChainError("Could not load options chain for saved trade.");
      } finally {
        setIsLoadingChain(false);
      }
    })();
  }, [savedTrade, savedTradeLoaded, makeLeg]);

  // All dropdown handlers update the ACTIVE leg
  const handleExpiryChange = (expiry: string) => {
    if (!chain || !activeLeg) return;
    const atm = findAtmContract(chain, expiry, activeLeg.optionType);
    if (atm) {
      const updated = makeLeg(
        atm,
        activeLeg.optionType,
        activeLeg.positionType,
        chain,
        expiry,
        activeLeg.quantity,
      );
      setLegs((prev) =>
        prev.map((l, i) => (i === activeLegIndex ? updated : l)),
      );
    }
  };

  const handleOptionTypeChange = (type: OptionType) => {
    if (!chain || !activeLeg) return;
    const expiry = activeLeg.contract.expirationDate;
    const atm = findAtmContract(chain, expiry, type);
    if (atm) {
      const updated = makeLeg(
        atm,
        type,
        activeLeg.positionType,
        chain,
        expiry,
        activeLeg.quantity,
      );
      setLegs((prev) =>
        prev.map((l, i) => (i === activeLegIndex ? updated : l)),
      );
    }
  };

  const handlePositionTypeChange = (pType: PositionType) => {
    if (!activeLeg) return;
    setLegs((prev) =>
      prev.map((l, i) =>
        i === activeLegIndex
          ? { ...l, positionType: pType, id: `${l.contract.contractSymbol}-${pType}-${Date.now()}` }
          : l,
      ),
    );
  };

  const handleStrikeChange = (strikeStr: string) => {
    if (!chain || !activeLeg) return;
    const strike = parseFloat(strikeStr);
    const expiry = activeLeg.contract.expirationDate;
    const expiryData = chain.expirations.find(
      (e) => e.expirationDate === expiry,
    );
    if (!expiryData) return;
    const contracts =
      activeLeg.optionType === "call" ? expiryData.calls : expiryData.puts;
    const contract = contracts.find((c) => c.strikePrice === strike);
    if (contract) {
      const updated = makeLeg(
        contract,
        activeLeg.optionType,
        activeLeg.positionType,
        chain,
        expiry,
        activeLeg.quantity,
      );
      setLegs((prev) =>
        prev.map((l, i) => (i === activeLegIndex ? updated : l)),
      );
    }
  };

  const handleQuantityChange = (qty: number) => {
    const clamped = Math.max(1, Math.min(9999, qty));
    setLegs((prev) =>
      prev.map((l, i) =>
        i === activeLegIndex ? { ...l, quantity: clamped } : l,
      ),
    );
  };

  const addLeg = () => {
    if (!chain) return;
    // New leg: ATM call, long, first decent expiry
    const expiry = getDefaultExpiry(chain);
    if (!expiry) return;
    const atm = findAtmContract(chain, expiry.expirationDate, "call");
    if (!atm) return;
    const newLeg = makeLeg(atm, "call", "long", chain, expiry.expirationDate, 1);
    setLegs((prev) => [...prev, newLeg]);
    switchToLeg(legs.length); // select the new leg
  };

  const applyTemplate = useCallback(
    (templateSlug: string) => {
      if (!chain) return;
      if (!templateSlug) {
        setActiveTemplate(null);
        return;
      }
      const tpl = strategyTemplates[templateSlug];
      if (!tpl) return;

      const expiry = getDefaultExpiry(chain);
      if (!expiry) return;

      // Build legs from template
      const newLegs: SelectedLeg[] = [];
      for (const tplLeg of tpl.legs) {
        const targetStrike = chain.underlyingPrice + tplLeg.strikeOffset;
        const expiryData = chain.expirations.find(
          (e) => e.expirationDate === expiry.expirationDate,
        );
        if (!expiryData) continue;

        const contracts =
          tplLeg.type === "call" ? expiryData.calls : expiryData.puts;
        if (contracts.length === 0) continue;

        // Find closest strike to target
        const contract = contracts.reduce((closest, c) =>
          Math.abs(c.strikePrice - targetStrike) <
          Math.abs(closest.strikePrice - targetStrike)
            ? c
            : closest,
        );

        newLegs.push(
          makeLeg(
            contract,
            tplLeg.type,
            tplLeg.side,
            chain,
            expiry.expirationDate,
            tplLeg.quantity,
          ),
        );
      }

      if (newLegs.length > 0) {
        setLegs(newLegs);
        setActiveLegIndex(0);
        setQtyInput(String(newLegs[0].quantity));
      }

      // Handle stock leg
      if (tpl.includeStock) {
        setStockLeg({
          positionType: "long",
          quantity: 100,
          entryPrice: chain.underlyingPrice,
        });
        setStockQtyInput("100");
        setStockPriceInput(chain.underlyingPrice.toFixed(2));
      } else {
        setStockLeg(null);
        setStockQtyInput("");
        setStockPriceInput("");
      }

      setActiveTemplate(templateSlug);
    },
    [chain, makeLeg],
  );

  const removeLeg = (index: number) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
    // Adjust active index
    if (activeLegIndex >= legs.length - 1) {
      switchToLeg(Math.max(0, legs.length - 2));
    } else if (index < activeLegIndex) {
      switchToLeg(activeLegIndex - 1);
    }
  };

  // Derived values for the active leg's dropdowns
  const activeExpiry = activeLeg?.contract.expirationDate ?? "";
  const activeOptionType = activeLeg?.optionType ?? defaultOptionType;
  const activePositionType = activeLeg?.positionType ?? defaultPositionType;

  const activeContracts = useMemo(() => {
    if (!chain || !activeExpiry) return [];
    const expiryData = chain.expirations.find(
      (e) => e.expirationDate === activeExpiry,
    );
    if (!expiryData) return [];
    return activeOptionType === "call" ? expiryData.calls : expiryData.puts;
  }, [chain, activeExpiry, activeOptionType]);

  // Compute payoff from ALL legs
  const { payoffData, breakEvenPoints, maxProfit, maxLoss, isUnlimitedProfit, isUnlimitedLoss, profitAtTarget, legSummaries, pricingResult, strategyLegs, maxDte, chanceOfProfit } =
    useMemo(() => {
      if (!chain || legs.length === 0) {
        return {
          payoffData: null,
          breakEvenPoints: [],
          maxProfit: 0,
          maxLoss: 0,
          profitAtTarget: null,
          legSummaries: [],
          pricingResult: null,
          strategyLegs: [],
          maxDte: 0,
          chanceOfProfit: null as number | null,
          isUnlimitedProfit: false,
          isUnlimitedLoss: false,
        };
      }

      const optionLegs: OptionLeg[] = legs.map((leg) => ({
        optionType: leg.optionType,
        positionType: leg.positionType,
        strikePrice: leg.contract.strikePrice,
        premium: leg.premium,
        quantity: leg.quantity,
        expirationDate: leg.contract.expirationDate,
        impliedVolatility: leg.contract.impliedVolatility || 0.3,
      }));

      const stockLegs = stockLeg
        ? [
            {
              positionType: stockLeg.positionType,
              quantity: stockLeg.quantity,
              entryPrice: stockLeg.entryPrice,
            },
          ]
        : [];

      const allLegs = [...optionLegs, ...stockLegs];
      const payoff = generatePayoffAtExpiry(allLegs, chain.underlyingPrice);
      const breakEvens = findBreakEvenPoints(payoff);
      const { maxProfit: mp, maxLoss: ml, isUnlimitedProfit: unlimitedProfit, isUnlimitedLoss: unlimitedLoss } = calculateMaxProfitLoss(payoff);

      // Greeks: sum across all legs
      const combinedGreeks = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
      let totalPremium = 0;

      for (const leg of legs) {
        const dte =
          chain.expirations.find(
            (e) => e.expirationDate === leg.contract.expirationDate,
          )?.daysToExpiry ?? 30;
        const greeks = calculateGreeks({
          spotPrice: chain.underlyingPrice,
          strikePrice: leg.contract.strikePrice,
          timeToExpiry: Math.max(
            dte / CALENDAR_DAYS_PER_YEAR,
            1 / CALENDAR_DAYS_PER_YEAR,
          ),
          riskFreeRate: DEFAULT_RISK_FREE_RATE,
          volatility: leg.contract.impliedVolatility || 0.3,
          optionType: leg.optionType,
        });

        const mult = (leg.positionType === "long" ? 1 : -1) * leg.quantity;
        combinedGreeks.delta += greeks.delta * mult;
        combinedGreeks.gamma += greeks.gamma * mult;
        combinedGreeks.theta += greeks.theta * mult;
        combinedGreeks.vega += greeks.vega * mult;
        combinedGreeks.rho += greeks.rho * mult;
        totalPremium += leg.premium * mult;
      }

      // Per-leg P&L at expiration: compute max P/L from payoff range
      const legPLAtExpiry = (leg: OptionLeg, price: number) => {
        const mult = leg.positionType === "long" ? 1 : -1;
        const intrinsic = leg.optionType === "call"
          ? Math.max(price - leg.strikePrice, 0)
          : Math.max(leg.strikePrice - price, 0);
        return (intrinsic * mult - leg.premium * mult) * leg.quantity * 100;
      };

      const legSums = optionLegs.map((leg, i) => {
        const label = `${leg.positionType === "long" ? "BUY" : "SELL"} ${leg.quantity}x ${leg.optionType.toUpperCase()} $${leg.strikePrice.toFixed(0)}`;

        // Scan payoff points for this leg's max/min
        let legMax = -Infinity;
        let legMin = Infinity;
        for (const point of payoff) {
          const pl = point.legProfitLoss[i];
          if (pl > legMax) legMax = pl;
          if (pl < legMin) legMin = pl;
        }

        // P&L and theoretical value at target
        const pt = parseFloat(priceTarget);
        const plAtTarget = (!isNaN(pt) && pt > 0) ? Math.round(legPLAtExpiry(leg, pt) * 100) / 100 : null;

        // Intrinsic value at target (value per share at expiration)
        let valueAtTarget: number | null = null;
        if (!isNaN(pt) && pt > 0) {
          const intrinsic = leg.optionType === "call"
            ? Math.max(pt - leg.strikePrice, 0)
            : Math.max(leg.strikePrice - pt, 0);
          valueAtTarget = Math.round(intrinsic * 100) / 100;
        }

        return {
          label,
          maxProfit: legMax,
          maxLoss: legMin,
          plAtTarget,
          // Leg metadata for target simulation display
          quantity: leg.quantity,
          positionType: leg.positionType,
          optionType: leg.optionType,
          strikePrice: leg.strikePrice,
          expirationDate: leg.expirationDate,
          premium: leg.premium,
          valueAtTarget,
        };
      });

      // Total P&L at price target
      const pt = parseFloat(priceTarget);
      let profitAtTarget: number | null = null;
      if (!isNaN(pt) && pt > 0) {
        profitAtTarget = 0;
        for (const leg of optionLegs) {
          profitAtTarget += legPLAtExpiry(leg, pt);
        }
        for (const leg of stockLegs) {
          const mult = leg.positionType === "long" ? 1 : -1;
          profitAtTarget += (pt - leg.entryPrice) * mult * leg.quantity;
        }
        profitAtTarget = Math.round(profitAtTarget * 100) / 100;
      }

      // Max DTE across all legs (for heatmap date range)
      let maxLegDte = 0;
      for (const leg of legs) {
        const dte = chain.expirations.find(
          (e) => e.expirationDate === leg.contract.expirationDate,
        )?.daysToExpiry ?? 30;
        if (dte > maxLegDte) maxLegDte = dte;
      }

      // Chance of profit: weighted-average IV across legs, max DTE
      let weightedIV = 0;
      let totalQty = 0;
      for (const leg of optionLegs) {
        weightedIV += leg.impliedVolatility * leg.quantity;
        totalQty += leg.quantity;
      }
      const avgIV = totalQty > 0 ? weightedIV / totalQty : 0.3;
      const cop = maxLegDte > 0
        ? calculateChanceOfProfit(
            payoff,
            breakEvens,
            chain.underlyingPrice,
            avgIV,
            maxLegDte / CALENDAR_DAYS_PER_YEAR,
            DEFAULT_RISK_FREE_RATE,
          )
        : null;

      return {
        payoffData: payoff,
        breakEvenPoints: breakEvens,
        maxProfit: mp,
        maxLoss: ml,
        profitAtTarget,
        legSummaries: legSums,
        pricingResult: {
          price: Math.abs(totalPremium),
          greeks: combinedGreeks,
        },
        strategyLegs: allLegs,
        maxDte: maxLegDte,
        chanceOfProfit: cop,
        isUnlimitedProfit: unlimitedProfit,
        isUnlimitedLoss: unlimitedLoss,
      };
    }, [chain, legs, stockLeg, priceTarget]);

  return (
    <div className="space-y-3">
      {/* Ticker Search */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Underlying</CardTitle>
        </CardHeader>
        <CardContent>
          <TickerSearch onSelect={handleTickerSelect} />
          {isLoadingChain && (
            <p className="mt-2 text-xs text-muted-foreground">
              Loading options chain...
            </p>
          )}
          {chainError && (
            <p className="mt-2 text-xs text-red-500">{chainError}</p>
          )}
          {chain && (
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{chain.ticker}</span>{" "}
              <span className="font-semibold text-foreground">
                ${chain.underlyingPrice.toFixed(2)}
              </span>{" "}
              | {chain.expirations.length} exp
            </p>
          )}
        </CardContent>
      </Card>

      {/* Template Strip — shown when chain is loaded */}
      {chain && (
        <TemplateStrip
          activeTemplate={activeTemplate}
          onSelectTemplate={applyTemplate}
        />
      )}

      {/* Position Builder */}
      {chain && (
        <Card>
          <CardHeader>
            <CardTitle>Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dropdowns — control the active leg */}
            {activeLeg && (
              <div className="flex flex-wrap items-baseline gap-2 rounded-md border-l-2 border-l-primary pl-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Direction
                  </Label>
                  <Select
                    value={activePositionType}
                    onValueChange={(v) =>
                      v && handlePositionTypeChange(v as PositionType)
                    }
                  >
                    <SelectTrigger className="w-full uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">LONG</SelectItem>
                      <SelectItem value="short">SHORT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Type
                  </Label>
                  <Select
                    value={activeOptionType}
                    onValueChange={(v) =>
                      v && handleOptionTypeChange(v as OptionType)
                    }
                  >
                    <SelectTrigger className="w-full uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">CALL</SelectItem>
                      <SelectItem value="put">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Expiration
                  </Label>
                  <Select
                    value={activeExpiry}
                    onValueChange={(v) => v && handleExpiryChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      {chain.expirations.map((exp) => (
                        <SelectItem
                          key={exp.expirationDate}
                          value={exp.expirationDate}
                        >
                          {exp.expirationDate} ({exp.daysToExpiry}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Strike
                  </Label>
                  <Select
                    value={activeLeg.contract.strikePrice.toString()}
                    onValueChange={(v) => v && handleStrikeChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select strike" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeContracts.map((c) => (
                        <SelectItem
                          key={c.strikePrice}
                          value={c.strikePrice.toString()}
                        >
                          ${c.strikePrice.toFixed(2)}{" "}
                          {c.inTheMoney ? "ITM" : "OTM"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Qty
                  </Label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qtyInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d{1,4}$/.test(v)) {
                        setQtyInput(v);
                        const parsed = parseInt(v);
                        if (!isNaN(parsed) && parsed >= 1) {
                          handleQuantityChange(parsed);
                        }
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseInt(qtyInput);
                      if (isNaN(parsed) || parsed < 1) {
                        setQtyInput("1");
                        handleQuantityChange(1);
                      } else {
                        setQtyInput(String(Math.min(parsed, 9999)));
                      }
                    }}
                    className="flex items-center h-8 w-16 rounded-sm border border-input bg-card px-2.5 font-mono text-sm font-medium text-center outline-none appearance-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 dark:bg-input/30"
                  />
                </div>
              </div>
            )}

            {/* Legs list */}
            {legs.length > 0 && (
              <div className="space-y-px rounded-md border border-border overflow-hidden">
                {legs.map((leg, index) => {
                  const isActive = index === activeLegIndex;
                  return (
                  <div
                    key={leg.id}
                    onClick={() => switchToLeg(index)}
                    className={`flex items-center justify-between py-2 pr-3 font-mono text-sm cursor-pointer transition-colors border-l-2 ${
                      isActive
                        ? "border-l-primary bg-primary/5 dark:bg-primary/10"
                        : "border-l-transparent bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 pl-3">
                      <span className="text-muted-foreground w-5 text-center font-medium">
                        {leg.quantity}
                      </span>
                      <span className="text-muted-foreground">x</span>
                      <span
                        className={`font-bold ${leg.positionType === "long" ? "text-green-600" : "text-red-600"}`}
                      >
                        {leg.positionType === "long" ? "BUY" : "SELL"}
                      </span>
                      <span className="font-semibold">
                        {leg.optionType === "call" ? "CALL" : "PUT"}
                      </span>
                      <span className="font-medium">${leg.contract.strikePrice.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        {leg.contract.expirationDate}
                      </span>
                      <span className="text-muted-foreground">@</span>
                      <span className="font-semibold">
                        ${leg.premium.toFixed(2)}
                      </span>
                    </div>
                    {legs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLeg(index);
                        }}
                        className="ml-2 text-muted-foreground hover:text-red-500 transition-colors text-sm"
                        aria-label="Remove leg"
                      >
                        x
                      </button>
                    )}
                  </div>
                  );
                })}

              </div>
            )}

            {/* Stock leg */}
            {stockLeg && (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center justify-between py-2 px-3 font-mono text-sm bg-blue-500/5 dark:bg-blue-500/10 border-l-2 border-l-blue-500">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-blue-600 dark:text-blue-400">SHARES</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={stockQtyInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d{1,5}$/.test(v)) {
                            setStockQtyInput(v);
                            const parsed = parseInt(v);
                            if (!isNaN(parsed) && parsed >= 1) {
                              setStockLeg((prev) => prev ? { ...prev, quantity: parsed } : prev);
                            }
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(stockQtyInput);
                          if (isNaN(parsed) || parsed < 1) {
                            setStockQtyInput("100");
                            setStockLeg((prev) => prev ? { ...prev, quantity: 100 } : prev);
                          }
                        }}
                        className="h-7 w-16 rounded-sm border border-input bg-transparent px-1.5 font-mono text-sm font-medium text-center outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                      />
                      <span className="text-muted-foreground text-xs">shares</span>
                    </div>
                    <span className="text-muted-foreground">@</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={stockPriceInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d*$/.test(v)) {
                            setStockPriceInput(v);
                            const parsed = parseFloat(v);
                            if (!isNaN(parsed) && parsed > 0) {
                              setStockLeg((prev) => prev ? { ...prev, entryPrice: parsed } : prev);
                            }
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(stockPriceInput);
                          if (isNaN(parsed) || parsed <= 0) {
                            const fallback = chain?.underlyingPrice ?? 0;
                            setStockPriceInput(fallback.toFixed(2));
                            setStockLeg((prev) => prev ? { ...prev, entryPrice: fallback } : prev);
                          } else {
                            setStockPriceInput(parsed.toFixed(2));
                          }
                        }}
                        className="h-7 w-20 rounded-sm border border-input bg-transparent px-1.5 font-mono text-sm font-medium text-right outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStockLeg(null);
                      setStockQtyInput("");
                      setStockPriceInput("");
                    }}
                    className="ml-2 text-muted-foreground hover:text-red-500 transition-colors text-sm"
                    aria-label="Remove shares"
                  >
                    x
                  </button>
                </div>
              </div>
            )}

            {/* Unlimited loss warning */}
            {isUnlimitedLoss && (
              <div className="flex items-start gap-2 rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <span className="font-bold text-sm leading-none mt-px">!</span>
                <span>
                  <span className="font-semibold">Unlimited risk.</span>{" "}
                  This position has uncovered short options — losses are theoretically unlimited.
                </span>
              </div>
            )}

            {/* Add Leg / Add Shares / Save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={addLeg}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Add leg
                </button>
                {!stockLeg && (
                  <button
                    onClick={() => {
                      const price = chain?.underlyingPrice ?? 0;
                      setStockLeg({ positionType: "long", quantity: 100, entryPrice: price });
                      setStockQtyInput("100");
                      setStockPriceInput(price.toFixed(2));
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add shares
                  </button>
                )}
              </div>
              {chain && legs.length > 0 && (
                <SaveTradeButton
                  ticker={chain.ticker}
                  underlyingPrice={chain.underlyingPrice}
                  legs={legs.map((l) => ({
                    option_type: l.optionType,
                    position_type: l.positionType,
                    strike_price: l.contract.strikePrice,
                    premium: l.premium,
                    quantity: l.quantity,
                    expiration_date: l.contract.expirationDate,
                    implied_volatility: l.contract.impliedVolatility || 0.3,
                  }))}
                  stockLeg={stockLeg ? {
                    position_type: stockLeg.positionType,
                    quantity: stockLeg.quantity,
                    entry_price: stockLeg.entryPrice,
                  } : null}
                />
              )}
            </div>

            {/* Price Target */}
            <div className="rounded-md border border-dashed border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest shrink-0">
                  Price Target
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground font-mono">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter price"
                    value={priceTarget}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setPriceTarget(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="h-8 w-28 rounded-sm border border-input bg-transparent px-2 font-mono text-sm font-medium text-right outline-none placeholder:text-muted-foreground/40 placeholder:font-normal focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                  />
                </div>
                {priceTarget && (
                  <button
                    onClick={() => setPriceTarget("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Target simulation: show each leg's value & P&L at target */}
              {profitAtTarget !== null && parseFloat(priceTarget) > 0 && (
                <div className="space-y-px rounded-md border border-border overflow-hidden">
                  {legSummaries.map((leg, index) => {
                    const pnl = leg.plAtTarget ?? 0;
                    const pnlColor = pnl > 0
                      ? "text-green-600 dark:text-green-400"
                      : pnl < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground";
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between py-2 px-3 font-mono text-sm ${
                          pnl > 0
                            ? "bg-green-500/5 dark:bg-green-500/10"
                            : pnl < 0
                              ? "bg-red-500/5 dark:bg-red-500/10"
                              : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-muted-foreground w-5 text-center font-medium">
                            {leg.quantity}
                          </span>
                          <span className="text-muted-foreground">x</span>
                          <span
                            className={`font-bold ${leg.positionType === "long" ? "text-green-600" : "text-red-600"}`}
                          >
                            {leg.positionType === "long" ? "BUY" : "SELL"}
                          </span>
                          <span className="font-semibold">
                            {leg.optionType.toUpperCase()}
                          </span>
                          <span className="font-medium">${leg.strikePrice.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            {leg.expirationDate}
                          </span>
                          <span className="text-muted-foreground">@</span>
                          <span className="font-semibold">
                            ${leg.valueAtTarget !== null ? leg.valueAtTarget.toFixed(2) : "—"}
                          </span>
                        </div>
                        <span className={`font-bold tabular-nums ${pnlColor}`}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                        </span>
                      </div>
                    );
                  })}
                  {/* Total */}
                  <div className={`flex items-center justify-between py-2 px-3 font-mono text-sm font-bold border-t border-border ${
                    profitAtTarget > 0
                      ? "bg-green-500/10 dark:bg-green-500/15"
                      : profitAtTarget < 0
                        ? "bg-red-500/10 dark:bg-red-500/15"
                        : "bg-muted/30"
                  }`}>
                    <span className="text-muted-foreground">
                      TOTAL at ${parseFloat(priceTarget).toFixed(2)}
                    </span>
                    <span className={
                      profitAtTarget > 0
                        ? "text-green-600 dark:text-green-400"
                        : profitAtTarget < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                    }>
                      {profitAtTarget >= 0 ? "+" : ""}{formatCurrency(profitAtTarget)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payoff Diagram */}
      {payoffData && chain && (
        <Card>
          <CardHeader>
            <CardTitle>
              Payoff at Expiration
              {legs.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({legs.length} legs)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PayoffDiagram
              data={payoffData}
              breakEvenPoints={breakEvenPoints}
              currentPrice={chain.underlyingPrice}
            />
          </CardContent>
        </Card>
      )}

      {/* Time Slider — payoff over time */}
      {strategyLegs.length > 0 && chain && maxDte > 0 && (
        <Card>
          <CardContent className="pt-6">
            <TimeSlider
              legs={strategyLegs}
              currentPrice={chain.underlyingPrice}
              daysToExpiry={maxDte}
            />
          </CardContent>
        </Card>
      )}

      {/* P&L Heatmap */}
      {strategyLegs.length > 0 && chain && maxDte > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              P&L by Price &amp; Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PnLHeatmap
              legs={strategyLegs}
              currentPrice={chain.underlyingPrice}
              daysToExpiry={maxDte}
            />
          </CardContent>
        </Card>
      )}

      {/* Greeks & Summary */}
      {pricingResult && (
        <GreeksDisplay
          greeks={pricingResult.greeks}
          contractPrice={pricingResult.price}
          breakEvenPoints={breakEvenPoints}
          underlyingPrice={chain!.underlyingPrice}
          maxProfit={maxProfit}
          maxLoss={maxLoss}
          profitAtTarget={profitAtTarget}
          priceTarget={parseFloat(priceTarget) || null}
          legSummaries={legSummaries}
          chanceOfProfit={chanceOfProfit}
          isUnlimitedProfit={isUnlimitedProfit}
          isUnlimitedLoss={isUnlimitedLoss}
        />
      )}
    </div>
  );
}
