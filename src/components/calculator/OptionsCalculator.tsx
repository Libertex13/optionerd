"use client";

import { useState, useMemo, useCallback } from "react";
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
import { ExpiryTabs } from "./ExpiryTabs";
import { OptionChainTable } from "./OptionChainTable";
import { PayoffDiagram } from "./PayoffDiagram";
import { GreeksDisplay } from "./GreeksDisplay";
import type { OptionChain, OptionContract } from "@/types/market";
import type { OptionType, PositionType, OptionLeg } from "@/types/options";
import { priceOption } from "@/lib/pricing/black-scholes";
import { calculateGreeks } from "@/lib/pricing/greeks";
import {
  generatePayoffAtExpiry,
  findBreakEvenPoints,
  calculateMaxProfitLoss,
} from "@/lib/pricing/payoff";
import {
  DEFAULT_RISK_FREE_RATE,
  CALENDAR_DAYS_PER_YEAR,
} from "@/lib/utils/constants";

/** A selected leg with its source contract and position config */
interface SelectedLeg {
  id: string;
  contract: OptionContract;
  optionType: OptionType;
  positionType: PositionType;
  premium: number;
  quantity: number;
}

interface OptionsCalculatorProps {
  defaultOptionType?: OptionType;
  defaultPositionType?: PositionType;
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
  const [optionType, setOptionType] = useState<OptionType>(defaultOptionType);
  const [positionType, setPositionType] =
    useState<PositionType>(defaultPositionType);
  const [legs, setLegs] = useState<SelectedLeg[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showChainTable, setShowChainTable] = useState(false);
  // For chain table browsing — separate from the quick-select expiry
  const [chainExpiry, setChainExpiry] = useState("");

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
      id: `${contract.contractSymbol}-${pType}`,
      contract,
      optionType: oType,
      positionType: pType,
      premium: getPremium(contract, chainData, expiry, oType),
      quantity: qty,
    }),
    [getPremium],
  );

  const updateLegQuantity = (id: string, qty: number) => {
    const clamped = Math.max(1, Math.min(9999, qty));
    setLegs((prev) => prev.map((l) => l.id === id ? { ...l, quantity: clamped } : l));
  };

  const handleTickerSelect = async (ticker: string) => {
    setIsLoadingChain(true);
    setChainError(null);
    setLegs([]);

    try {
      const response = await fetch(`/api/options/chain?ticker=${ticker}`);
      if (!response.ok) throw new Error("Failed to fetch options chain");

      const data: OptionChain = await response.json();
      setChain(data);

      if (data.expirations.length > 0) {
        const expiry =
          data.expirations.length > 1 && data.expirations[0].daysToExpiry <= 1
            ? data.expirations[1]
            : data.expirations[0];
        setSelectedExpiry(expiry.expirationDate);
        setChainExpiry(expiry.expirationDate);

        // Pre-select ATM contract as first leg
        const atm = findAtmContract(data, expiry.expirationDate, optionType);
        if (atm) {
          setLegs([
            makeLeg(atm, optionType, positionType, data, expiry.expirationDate, quantity),
          ]);
        }
      }
    } catch {
      setChainError("Could not load options chain. Please try another ticker.");
    } finally {
      setIsLoadingChain(false);
    }
  };

  // Quick-select handlers update the first (primary) leg
  const handleExpiryChange = (expiry: string) => {
    setSelectedExpiry(expiry);
    if (chain) {
      const atm = findAtmContract(chain, expiry, optionType);
      if (atm) {
        const newLeg = makeLeg(atm, optionType, positionType, chain, expiry, quantity);
        setLegs((prev) =>
          prev.length > 0 ? [newLeg, ...prev.slice(1)] : [newLeg],
        );
      }
    }
  };

  const handleOptionTypeChange = (type: OptionType) => {
    setOptionType(type);
    if (chain && selectedExpiry) {
      const atm = findAtmContract(chain, selectedExpiry, type);
      if (atm) {
        const newLeg = makeLeg(atm, type, positionType, chain, selectedExpiry, quantity);
        setLegs((prev) =>
          prev.length > 0 ? [newLeg, ...prev.slice(1)] : [newLeg],
        );
      }
    }
  };

  const handlePositionTypeChange = (pType: PositionType) => {
    setPositionType(pType);
    setLegs((prev) =>
      prev.length > 0
        ? [
            {
              ...prev[0],
              positionType: pType,
              id: `${prev[0].contract.contractSymbol}-${pType}`,
            },
            ...prev.slice(1),
          ]
        : prev,
    );
  };

  const handleQuantityChange = (qty: number) => {
    const clamped = Math.max(1, Math.min(9999, qty));
    setQuantity(clamped);
    // Update primary leg quantity
    setLegs((prev) =>
      prev.length > 0 ? [{ ...prev[0], quantity: clamped }, ...prev.slice(1)] : prev,
    );
  };

  const handleStrikeChange = (strikeStr: string) => {
    if (!chain) return;
    const strike = parseFloat(strikeStr);
    const expiryData = chain.expirations.find(
      (e) => e.expirationDate === selectedExpiry,
    );
    if (!expiryData) return;
    const contracts =
      optionType === "call" ? expiryData.calls : expiryData.puts;
    const contract = contracts.find((c) => c.strikePrice === strike);
    if (contract) {
      const newLeg = makeLeg(
        contract,
        optionType,
        positionType,
        chain,
        selectedExpiry,
        quantity,
      );
      setLegs((prev) =>
        prev.length > 0 ? [newLeg, ...prev.slice(1)] : [newLeg],
      );
    }
  };

  // Chain table adds a NEW leg to the position
  const handleChainAddLeg = (contract: OptionContract) => {
    if (!chain) return;
    const newLeg = makeLeg(
      contract,
      contract.optionType,
      positionType,
      chain,
      chainExpiry,
      quantity,
    );
    // Check if already in legs
    const exists = legs.find(
      (l) =>
        l.contract.contractSymbol === contract.contractSymbol &&
        l.positionType === positionType,
    );
    if (exists) return;
    setLegs((prev) => [...prev, newLeg]);
  };

  const removeLeg = (id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const currentExpiry = chain?.expirations.find(
    (e) => e.expirationDate === selectedExpiry,
  );
  const chainExpiryData = chain?.expirations.find(
    (e) => e.expirationDate === chainExpiry,
  );

  const currentContracts = currentExpiry
    ? optionType === "call"
      ? currentExpiry.calls
      : currentExpiry.puts
    : [];

  // Primary leg (first) for Greeks display
  const primaryLeg = legs[0] ?? null;

  // Compute payoff from ALL legs
  const { payoffData, breakEvenPoints, maxProfit, maxLoss, pricingResult } =
    useMemo(() => {
      if (!chain || legs.length === 0) {
        return {
          payoffData: null,
          breakEvenPoints: [],
          maxProfit: 0,
          maxLoss: 0,
          pricingResult: null,
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

      const stockLegs = includeStockLeg
        ? [
            {
              positionType: "long" as const,
              quantity: 100,
              entryPrice: chain.underlyingPrice,
            },
          ]
        : [];

      const allLegs = [...optionLegs, ...stockLegs];
      const payoff = generatePayoffAtExpiry(allLegs, chain.underlyingPrice);
      const breakEvens = findBreakEvenPoints(payoff);
      const { maxProfit: mp, maxLoss: ml } = calculateMaxProfitLoss(payoff);

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

      return {
        payoffData: payoff,
        breakEvenPoints: breakEvens,
        maxProfit: mp,
        maxLoss: ml,
        pricingResult: {
          price: Math.abs(totalPremium),
          greeks: combinedGreeks,
        },
      };
    }, [chain, legs, includeStockLeg]);

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

      {/* Quick Select Controls */}
      {chain && (
        <Card>
          <CardHeader>
            <CardTitle>Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick select dropdowns */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                  Direction
                </Label>
                <Select
                  value={positionType}
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
                  value={optionType}
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
                  value={selectedExpiry}
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
                  value={primaryLeg?.contract.strikePrice.toString() ?? ""}
                  onValueChange={(v) => v && handleStrikeChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select strike" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentContracts.map((c) => (
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
                  type="number"
                  min={1}
                  max={9999}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="h-8 w-16 rounded-sm border border-input bg-card px-2 font-mono text-sm text-center outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </div>
            </div>

            {/* Legs list */}
            {legs.length > 0 && (
              <div className="space-y-px rounded-md border border-border overflow-hidden">
                {legs.map((leg) => (
                  <div
                    key={leg.id}
                    className="flex items-center justify-between bg-muted/30 px-2.5 py-1.5 font-mono text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={leg.quantity}
                        onChange={(e) => updateLegQuantity(leg.id, parseInt(e.target.value) || 1)}
                        className="h-5 w-10 rounded-sm border border-border bg-card px-1 text-center text-xs outline-none focus-visible:border-ring"
                      />
                      <span className="text-muted-foreground">x</span>
                      <span
                        className={`font-bold ${leg.positionType === "long" ? "text-green-600" : "text-red-600"}`}
                      >
                        {leg.positionType === "long" ? "BUY" : "SELL"}
                      </span>
                      <span className="font-semibold">
                        {leg.optionType === "call" ? "CALL" : "PUT"}
                      </span>
                      <span>${leg.contract.strikePrice.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        {leg.contract.expirationDate}
                      </span>
                      <span className="text-muted-foreground">@</span>
                      <span className="font-semibold">
                        ${leg.premium.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeLeg(leg.id)}
                      className="ml-2 text-muted-foreground hover:text-red-500 transition-colors text-xs"
                      aria-label="Remove leg"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Show option chain link */}
            <button
              onClick={() => {
                setShowChainTable(!showChainTable);
                if (!showChainTable) setChainExpiry(selectedExpiry);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showChainTable
                ? "- Hide option chain"
                : "+ Add leg / browse chain"}
            </button>

            {/* Option Chain Table (collapsible) */}
            {showChainTable && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Click to add leg
                  </p>
                  <div className="flex gap-px rounded-md border border-border overflow-hidden">
                    {(["long", "short"] as const).map((pt) => (
                      <button
                        key={pt}
                        onClick={() => setPositionType(pt)}
                        className={`px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
                          positionType === pt
                            ? "bg-foreground text-background"
                            : "bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {pt === "long" ? "BUY" : "SELL"}
                      </button>
                    ))}
                  </div>
                </div>

                <ExpiryTabs
                  expirations={chain.expirations}
                  selected={chainExpiry}
                  onSelect={setChainExpiry}
                />

                {chainExpiryData && (
                  <div className="max-h-[420px] overflow-y-auto">
                    <OptionChainTable
                      expiry={chainExpiryData}
                      underlyingPrice={chain.underlyingPrice}
                      selectedContract={null}
                      selectedContracts={legs.map(
                        (l) => l.contract.contractSymbol,
                      )}
                      onSelect={handleChainAddLeg}
                    />
                  </div>
                )}
              </div>
            )}
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

      {/* Greeks & Summary */}
      {pricingResult && (
        <GreeksDisplay
          greeks={pricingResult.greeks}
          contractPrice={pricingResult.price}
          breakEvenPoints={breakEvenPoints}
          maxProfit={maxProfit}
          maxLoss={maxLoss}
        />
      )}
    </div>
  );
}
