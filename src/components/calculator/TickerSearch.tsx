"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { TickerSearchResult } from "@/types/market";

interface TickerSearchProps {
  onSelect: (ticker: string, name?: string) => void;
  selectedTicker?: string;
}

export function TickerSearch({ onSelect, selectedTicker }: TickerSearchProps) {
  const [query, setQuery] = useState(selectedTicker ?? "");
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/options/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data: TickerSearchResult[] = await response.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value.toUpperCase());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (ticker: string) => {
    const name = results.find((r) => r.ticker === ticker)?.name ?? undefined;
    setQuery(ticker);
    setIsOpen(false);
    onSelect(ticker, name);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        placeholder="Search ticker (AAPL, TSLA, NVDA)..."
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) {
            e.preventDefault();
            handleSelect(results[0].ticker);
          }
        }}
        onFocus={() => results.length > 0 && setIsOpen(true)}
      />
      {isLoading && (
        <div className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
          ...
        </div>
      )}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          {results.map((result) => (
            <button
              key={result.ticker}
              onClick={() => handleSelect(result.ticker)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
            >
              <span className="font-mono text-sm font-bold shrink-0 w-16">
                {result.ticker}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {result.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
