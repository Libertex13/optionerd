"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { TickerSearchResult } from "@/types/market";

interface TickerSearchProps {
  onSelect: (ticker: string) => void;
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
    setQuery(ticker);
    setIsOpen(false);
    onSelect(ticker);
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
        placeholder="Search ticker (e.g. AAPL, TSLA, SPY)..."
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        className="font-mono text-lg h-12"
      />
      {isLoading && (
        <div className="absolute right-3 top-3.5 text-sm text-muted-foreground">
          Loading...
        </div>
      )}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {results.map((result) => (
            <button
              key={result.ticker}
              onClick={() => handleSelect(result.ticker)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <span className="font-mono font-bold">{result.ticker}</span>
              <span className="ml-4 truncate text-sm text-muted-foreground">
                {result.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
