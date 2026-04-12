"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OptionChain, OptionContract } from "@/types/market";
import type { OptionType, PositionType } from "@/types/options";

interface OptionLegInputProps {
  chain: OptionChain;
  selectedExpiry: string;
  selectedStrike: number | null;
  optionType: OptionType;
  positionType: PositionType;
  onExpiryChange: (expiry: string) => void;
  onStrikeChange: (strike: number) => void;
  onOptionTypeChange: (type: OptionType) => void;
  onPositionTypeChange: (type: PositionType) => void;
  onContractSelect: (contract: OptionContract) => void;
}

export function OptionLegInput({
  chain,
  selectedExpiry,
  selectedStrike,
  optionType,
  positionType,
  onExpiryChange,
  onStrikeChange,
  onOptionTypeChange,
  onPositionTypeChange,
  onContractSelect,
}: OptionLegInputProps) {
  const expiryData = chain.expirations.find(
    (exp) => exp.expirationDate === selectedExpiry
  );

  const contracts = expiryData
    ? optionType === "call"
      ? expiryData.calls
      : expiryData.puts
    : [];

  const handleStrikeSelect = (strikeStr: string) => {
    const strike = parseFloat(strikeStr);
    onStrikeChange(strike);
    const contract = contracts.find((c) => c.strikePrice === strike);
    if (contract) onContractSelect(contract);
  };

  const handleExpirySelect = (expiry: string) => {
    onExpiryChange(expiry);
    // Auto-select nearest ATM strike
    const newExpiryData = chain.expirations.find((e) => e.expirationDate === expiry);
    if (newExpiryData) {
      const chainContracts = optionType === "call" ? newExpiryData.calls : newExpiryData.puts;
      const atm = chainContracts.reduce((closest, c) =>
        Math.abs(c.strikePrice - chain.underlyingPrice) <
        Math.abs(closest.strikePrice - chain.underlyingPrice)
          ? c
          : closest
      );
      if (atm) {
        onStrikeChange(atm.strikePrice);
        onContractSelect(atm);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
      <div className="space-y-2.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Direction
        </Label>
        <Select value={positionType} onValueChange={(v) => v && onPositionTypeChange(v as PositionType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long">Buy (Long)</SelectItem>
            <SelectItem value="short">Sell (Short)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Type
        </Label>
        <Select value={optionType} onValueChange={(v) => v && onOptionTypeChange(v as OptionType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="put">Put</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Expiration
        </Label>
        <Select value={selectedExpiry} onValueChange={(v) => v && handleExpirySelect(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select expiry" />
          </SelectTrigger>
          <SelectContent>
            {chain.expirations.map((exp) => (
              <SelectItem key={exp.expirationDate} value={exp.expirationDate}>
                {exp.expirationDate} ({exp.daysToExpiry}d)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Strike
        </Label>
        <Select
          value={selectedStrike?.toString() ?? ""}
          onValueChange={(v) => v && handleStrikeSelect(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select strike" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.strikePrice} value={c.strikePrice.toString()}>
                ${c.strikePrice.toFixed(2)}
                {c.inTheMoney ? " ITM" : " OTM"}
                {" — "}${c.mid.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
