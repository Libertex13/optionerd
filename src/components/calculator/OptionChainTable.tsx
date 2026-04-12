"use client";

import { useMemo } from "react";
import type { OptionChainExpiry, OptionContract } from "@/types/market";

interface OptionChainTableProps {
  expiry: OptionChainExpiry;
  underlyingPrice: number;
  selectedContract: OptionContract | null;
  selectedContracts?: string[];
  onSelect: (contract: OptionContract) => void;
}

export function OptionChainTable({
  expiry,
  underlyingPrice,
  selectedContract,
  selectedContracts = [],
  onSelect,
}: OptionChainTableProps) {
  const strikeRows = useMemo(() => {
    const strikeMap = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    for (const call of expiry.calls) {
      strikeMap.set(call.strikePrice, { ...strikeMap.get(call.strikePrice), call });
    }
    for (const put of expiry.puts) {
      strikeMap.set(put.strikePrice, { ...strikeMap.get(put.strikePrice), put });
    }
    return Array.from(strikeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([strike, contracts]) => ({
        strike,
        call: contracts.call,
        put: contracts.put,
        callITM: strike < underlyingPrice,
        putITM: strike > underlyingPrice,
        atm: Math.abs(strike - underlyingPrice) / underlyingPrice < 0.005,
      }));
  }, [expiry, underlyingPrice]);

  const atmIndex = strikeRows.findIndex((r) => r.atm) || strikeRows.findIndex((r) => !r.callITM);

  const f = (v: number | undefined) => (!v || v === 0) ? "\u2014" : v.toFixed(2);
  const fDelta = (v: number | undefined) => (v === undefined || v === 0) ? "\u2014" : v.toFixed(2);
  const fIV = (v: number | undefined) => (!v || v === 0) ? "\u2014" : (v * 100).toFixed(1);
  const fOI = (v: number | undefined) => !v ? "\u2014" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toString();

  const cellBase = "px-2 py-1 text-right font-mono text-xs cursor-pointer transition-colors";
  const itmCall = "bg-green-500/[0.04]";
  const itmPut = "bg-red-500/[0.04]";
  const selectedCell = "!bg-foreground/[0.08]";

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-muted/50">
            <th colSpan={5} className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
              Calls
            </th>
            <th className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest">
              Strike
            </th>
            <th colSpan={5} className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              Puts
            </th>
          </tr>
          <tr className="border-b border-border bg-muted/30 text-[10px] text-muted-foreground">
            <th className="px-2 py-1 text-right font-medium">IV</th>
            <th className="px-2 py-1 text-right font-medium">Delta</th>
            <th className="px-2 py-1 text-right font-medium">OI</th>
            <th className="px-2 py-1 text-right font-medium">Bid</th>
            <th className="px-2 py-1 text-right font-medium">Ask</th>
            <th className="px-2 py-1 text-center font-bold"></th>
            <th className="px-2 py-1 text-right font-medium">Bid</th>
            <th className="px-2 py-1 text-right font-medium">Ask</th>
            <th className="px-2 py-1 text-right font-medium">OI</th>
            <th className="px-2 py-1 text-right font-medium">Delta</th>
            <th className="px-2 py-1 text-right font-medium">IV</th>
          </tr>
        </thead>
        <tbody>
          {strikeRows.map((row, i) => {
            const callSel = selectedContract?.contractSymbol === row.call?.contractSymbol ||
              (row.call && selectedContracts.includes(row.call.contractSymbol));
            const putSel = selectedContract?.contractSymbol === row.put?.contractSymbol ||
              (row.put && selectedContracts.includes(row.put.contractSymbol));

            const callBg = callSel ? selectedCell : row.callITM ? itmCall : "";
            const putBg = putSel ? selectedCell : row.putITM ? itmPut : "";

            return (
              <tr
                key={row.strike}
                ref={i === atmIndex ? (el) => el?.scrollIntoView({ block: "center", behavior: "instant" }) : undefined}
                className={`border-b border-border/40 ${row.atm ? "bg-foreground/[0.03]" : ""}`}
              >
                {/* Call side */}
                <td onClick={() => row.call && onSelect(row.call)} className={`${cellBase} ${callBg} hover:bg-accent text-muted-foreground`}>{fIV(row.call?.impliedVolatility)}</td>
                <td onClick={() => row.call && onSelect(row.call)} className={`${cellBase} ${callBg} hover:bg-accent`}>{fDelta(row.call?.delta)}</td>
                <td onClick={() => row.call && onSelect(row.call)} className={`${cellBase} ${callBg} hover:bg-accent text-muted-foreground`}>{fOI(row.call?.openInterest)}</td>
                <td onClick={() => row.call && onSelect(row.call)} className={`${cellBase} ${callBg} hover:bg-accent text-blue-600 dark:text-blue-400`}>{f(row.call?.bid)}</td>
                <td onClick={() => row.call && onSelect(row.call)} className={`${cellBase} ${callBg} hover:bg-accent text-red-600 dark:text-red-400`}>{f(row.call?.ask)}</td>

                {/* Strike center */}
                <td className={`px-2 py-1 text-center font-mono text-xs font-bold ${row.atm ? "text-foreground" : "text-muted-foreground"}`}>
                  {row.strike.toFixed(2)}
                </td>

                {/* Put side */}
                <td onClick={() => row.put && onSelect(row.put)} className={`${cellBase} ${putBg} hover:bg-accent text-blue-600 dark:text-blue-400`}>{f(row.put?.bid)}</td>
                <td onClick={() => row.put && onSelect(row.put)} className={`${cellBase} ${putBg} hover:bg-accent text-red-600 dark:text-red-400`}>{f(row.put?.ask)}</td>
                <td onClick={() => row.put && onSelect(row.put)} className={`${cellBase} ${putBg} hover:bg-accent text-muted-foreground`}>{fOI(row.put?.openInterest)}</td>
                <td onClick={() => row.put && onSelect(row.put)} className={`${cellBase} ${putBg} hover:bg-accent`}>{fDelta(row.put?.delta)}</td>
                <td onClick={() => row.put && onSelect(row.put)} className={`${cellBase} ${putBg} hover:bg-accent text-muted-foreground`}>{fIV(row.put?.impliedVolatility)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
