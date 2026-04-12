"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TickerSearch } from "./TickerSearch";
import { OptionLegInput } from "./OptionLegInput";
import { PayoffDiagram } from "./PayoffDiagram";
import { GreeksDisplay } from "./GreeksDisplay";
import type { OptionChain, OptionContract } from "@/types/market";
import type { OptionType, PositionType, OptionLeg } from "@/types/options";
import { priceOption } from "@/lib/pricing/black-scholes";
import {
  generatePayoffAtExpiry,
  findBreakEvenPoints,
  calculateMaxProfitLoss,
} from "@/lib/pricing/payoff";
import { DEFAULT_RISK_FREE_RATE, CALENDAR_DAYS_PER_YEAR } from "@/lib/utils/constants";

interface OptionsCalculatorProps {
  /** Pre-configure the option type for strategy pages */
  defaultOptionType?: OptionType;
  /** Pre-configure the position type for strategy pages */
  defaultPositionType?: PositionType;
  /** Include a stock leg (e.g., for covered call) */
  includeStockLeg?: boolean;
}

export function OptionsCalculator({
  defaultOptionType = "call",
  defaultPositionType = "long",
  includeStockLeg = false,
}: OptionsCalculatorProps) {
  const [chain, setChain] = useState<OptionChain | null>(null);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [optionType, setOptionType] = useState<OptionType>(defaultOptionType);
  const [positionType, setPositionType] = useState<PositionType>(defaultPositionType);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);

  const handleTickerSelect = async (ticker: string) => {
    setIsLoadingChain(true);
    setChainError(null);
    setSelectedContract(null);

    try {
      const response = await fetch(`/api/options/chain?ticker=${ticker}`);
      if (!response.ok) throw new Error("Failed to fetch options chain");

      const data: OptionChain = await response.json();
      setChain(data);

      // Auto-select first expiry
      if (data.expirations.length > 0) {
        const firstExpiry = data.expirations[0];
        setSelectedExpiry(firstExpiry.expirationDate);

        // Auto-select nearest ATM strike
        const contracts = optionType === "call" ? firstExpiry.calls : firstExpiry.puts;
        if (contracts.length > 0) {
          const atm = contracts.reduce((closest, c) =>
            Math.abs(c.strikePrice - data.underlyingPrice) <
            Math.abs(closest.strikePrice - data.underlyingPrice)
              ? c
              : closest
          );
          setSelectedStrike(atm.strikePrice);
          setSelectedContract(atm);
        }
      }
    } catch {
      setChainError("Could not load options chain. Please try another ticker.");
    } finally {
      setIsLoadingChain(false);
    }
  };

  // Build the strategy legs and compute payoff
  const { payoffData, breakEvenPoints, maxProfit, maxLoss, pricingResult } = useMemo(() => {
    if (!chain || !selectedContract) {
      return { payoffData: null, breakEvenPoints: [], maxProfit: 0, maxLoss: 0, pricingResult: null };
    }

    const daysToExpiry = chain.expirations.find(
      (e) => e.expirationDate === selectedExpiry
    )?.daysToExpiry ?? 30;

    const timeToExpiry = daysToExpiry / CALENDAR_DAYS_PER_YEAR;

    const optionLeg: OptionLeg = {
      optionType,
      positionType,
      strikePrice: selectedContract.strikePrice,
      premium: selectedContract.mid,
      quantity: 1,
      expirationDate: selectedExpiry,
      impliedVolatility: selectedContract.impliedVolatility,
    };

    const legs: OptionLeg[] = [optionLeg];

    // For covered call: add long stock leg
    const stockLegs = includeStockLeg
      ? [{ positionType: "long" as const, quantity: 100, entryPrice: chain.underlyingPrice }]
      : [];

    const allLegs = [...legs, ...stockLegs];
    const payoff = generatePayoffAtExpiry(allLegs, chain.underlyingPrice);
    const breakEvens = findBreakEvenPoints(payoff);
    const { maxProfit: mp, maxLoss: ml } = calculateMaxProfitLoss(payoff);

    const pricing = priceOption({
      spotPrice: chain.underlyingPrice,
      strikePrice: selectedContract.strikePrice,
      timeToExpiry,
      riskFreeRate: DEFAULT_RISK_FREE_RATE,
      volatility: selectedContract.impliedVolatility || 0.3,
      optionType,
    });

    return {
      payoffData: payoff,
      breakEvenPoints: breakEvens,
      maxProfit: mp,
      maxLoss: ml,
      pricingResult: pricing,
    };
  }, [chain, selectedContract, selectedExpiry, optionType, positionType, includeStockLeg]);

  return (
    <div className="space-y-6">
      {/* Ticker Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Underlying</CardTitle>
        </CardHeader>
        <CardContent>
          <TickerSearch onSelect={handleTickerSelect} />
          {isLoadingChain && (
            <p className="mt-2 text-sm text-muted-foreground">Loading options chain...</p>
          )}
          {chainError && (
            <p className="mt-2 text-sm text-red-500">{chainError}</p>
          )}
          {chain && (
            <p className="mt-2 text-sm text-muted-foreground">
              {chain.ticker} — ${chain.underlyingPrice.toFixed(2)} |{" "}
              {chain.expirations.length} expirations available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Option Selection */}
      {chain && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configure Position</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionLegInput
              chain={chain}
              selectedExpiry={selectedExpiry}
              selectedStrike={selectedStrike}
              optionType={optionType}
              positionType={positionType}
              onExpiryChange={setSelectedExpiry}
              onStrikeChange={setSelectedStrike}
              onOptionTypeChange={setOptionType}
              onPositionTypeChange={setPositionType}
              onContractSelect={setSelectedContract}
            />
          </CardContent>
        </Card>
      )}

      {/* Payoff Diagram */}
      {payoffData && chain && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payoff at Expiration</CardTitle>
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

      {/* Greeks & Summary */}
      {pricingResult && selectedContract && (
        <GreeksDisplay
          greeks={pricingResult.greeks}
          contractPrice={selectedContract.mid}
          breakEvenPoints={breakEvenPoints}
          maxProfit={maxProfit}
          maxLoss={maxLoss}
        />
      )}
    </div>
  );
}
