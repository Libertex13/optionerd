"use client";

import { useEffect, useState } from "react";

type Kind = "hero" | "why-this-one" | "insight";

interface UseAiNarrationArgs {
  kind: Kind;
  // A stable cache key derived from the facts. When this changes, we re-fetch.
  signature: string;
  facts: Record<string, unknown>;
  fallback: string;
}

interface UseAiNarrationResult {
  text: string;
  source: "ai" | "fallback";
  loading: boolean;
}

// Small in-memory cache so we don't refetch identical signatures across re-renders.
const memo = new Map<string, { text: string; source: "ai" | "fallback" }>();

export function useAiNarration({
  kind,
  signature,
  facts,
  fallback,
}: UseAiNarrationArgs): UseAiNarrationResult {
  const cacheKey = `${kind}:${signature}`;
  const cached = memo.get(cacheKey);

  const [state, setState] = useState<{ text: string; source: "ai" | "fallback" }>(
    cached ?? { text: fallback, source: "fallback" },
  );
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (memo.has(cacheKey)) {
      setState(memo.get(cacheKey)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setState({ text: fallback, source: "fallback" });

    fetch("/api/ai/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, facts, fallback }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json() as Promise<{ text: string; source: "ai" | "fallback" }>;
      })
      .then((data) => {
        if (cancelled) return;
        const next = { text: data.text || fallback, source: data.source };
        memo.set(cacheKey, next);
        setState(next);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { text: state.text, source: state.source, loading };
}
